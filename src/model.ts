/** Loading, saving and navigating an ontology folder (okb.json + nodes.json + edges.json). */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { OkbError } from "./errors.ts";
import * as naming from "./naming.ts";
import { Relationships, edgeProps, isRelationship } from "./relationships.ts";
import {
  DISPOSITIONS, VALUE_TYPES,
  type ClassNode, type Conventions, type Facets, type GraphEdge, type InstanceNode, type Manifest, type NodeOf, type NodeType,
  type OkbNode, type OntologyNode, type SlotNode, type StoredValue,
} from "./types.ts";

export { DISPOSITIONS, VALUE_TYPES };
export const FORMAT = "okb-lpg/2";
export const MANIFEST = "okb.json";
const ID_PREFIX: Partial<Record<NodeType, string>> = {
  Class: "c", Slot: "s", Instance: "i", Term: "t", ReusedOntology: "r", Source: "src", SourceLocation: "loc", Rule: "rule",
};
/** `okb show class:Genre` etc.: prefixes that say which kind of node a name refers to. */
const REF_PREFIX: Record<string, NodeType> = {
  class: "Class", slot: "Slot", instance: "Instance", term: "Term", cq: "CompetencyQuestion", question: "CompetencyQuestion", decision: "DesignDecision",
};

export { OkbError };

/** What a node is called: its name, or a question's/term's text, or a decision's title. */
export function nodeLabel(n: OkbNode): string {
  if ("name" in n) return n.name;
  if ("text" in n) return n.text;
  if ("title" in n) return n.title;
  return n.id;
}

/** Every name-like field a node can be looked up by. */
function lookupNames(n: OkbNode): string[] {
  return [("name" in n && n.name) || "", ("text" in n && n.text) || "", ("title" in n && n.title) || ""];
}

export { isRelationship };

export function findRoot(start: string): string | null {
  let d = resolve(start);
  for (;;) {
    if (existsSync(join(d, MANIFEST))) return d;
    const parent = dirname(d);
    if (parent === d) return null;
    d = parent;
  }
}

function readJson<T>(path: string, fallback: T): T {
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as T) : fallback;
}

export class Ontology {
  root: string;
  manifest: Manifest;
  // Changed only through addNode/addEdge/remove*, which keep the indexes current.
  private _nodes: OkbNode[];
  private _edges: GraphEdge[];
  private byId = new Map<string, OkbNode>();
  /** Relationship values and the edges that store them (see relationships.ts). */
  readonly rel = new Relationships(this);
  private outIdx = new Map<string, GraphEdge[]>();
  private incIdx = new Map<string, GraphEdge[]>();

  constructor(root: string, manifest: Manifest, nodes: readonly OkbNode[], edges: readonly GraphEdge[]) {
    this.root = root;
    this.manifest = manifest;
    this._nodes = [...nodes];
    this._edges = [...edges];
    this.reindex();
  }

  get nodes(): readonly OkbNode[] {
    return this._nodes;
  }

  get edges(): readonly GraphEdge[] {
    return this._edges;
  }

  // ------------------------------------------------------------------ io
  static create(root: string, name: string): Ontology {
    mkdirSync(root, { recursive: true });
    if (existsSync(join(root, MANIFEST))) throw new OkbError(`${root} already contains an ontology (${MANIFEST}).`);
    const manifest: Manifest = { format: FORMAT, name, currentStep: 1, created: new Date().toISOString().slice(0, 10) };
    const nodes: OkbNode[] = [{
      type: "Ontology", id: "ontology", name, domain: "", purpose: "", users: [], maintainers: [],
      outOfScope: [], kind: "application", reuseReviewed: false,
    }];
    const ont = new Ontology(resolve(root), manifest, nodes, []);
    ont.save();
    return ont;
  }

  static load(start: string): Ontology {
    const root = findRoot(start);
    if (!root) {
      throw new OkbError(
        `No ontology found in ${resolve(start)} or its parents. Create one with: okb init <folder> --name "My Ontology"`,
      );
    }
    // Trusted as typed; struct-well-formed reports what a hand edit got wrong.
    const ont = new Ontology(
      root,
      readJson<Manifest>(join(root, MANIFEST), { format: FORMAT, currentStep: 1 }),
      readJson<OkbNode[]>(join(root, "nodes.json"), []),
      readJson<GraphEdge[]>(join(root, "edges.json"), []),
    );
    if (ont.manifest.format === "okb-lpg/1") ont.migrateFromV1();
    return ont;
  }

  /** okb-lpg/1 stored relationship values as HAS_VALUE edges with a `slot` property. */
  migrateFromV1(): void {
    for (const s of this.ofType("Slot")) {
      if (s.valueType === "Instance" && !s.relType) s.relType = naming.relType(s.name);
    }
    this.reindex();
    const old = this.edges.filter((e) => e.type === "HAS_VALUE");
    this._edges = this._edges.filter((e) => e.type !== "HAS_VALUE");
    this.reindex();
    for (const e of old) if (typeof e.slot === "string") this.rel.link(e.from, e.slot, e.to);
    this.manifest.format = FORMAT;
  }

  static fromData(nodes: readonly OkbNode[], edges: readonly GraphEdge[], manifest?: Partial<Manifest>): Ontology {
    return new Ontology(".", { format: FORMAT, currentStep: 8, ...manifest }, nodes, edges);
  }

  save(): void {
    const files: [string, unknown][] = [[MANIFEST, this.manifest], ["nodes.json", this.nodes], ["edges.json", this.edges]];
    for (const [fname, data] of files) {
      const tmp = join(this.root, fname + ".tmp");
      writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
      renameSync(tmp, join(this.root, fname));
    }
  }

  // ------------------------------------------------------------------ indexes
  // addNode/addEdge update the indexes in place; everything else that changes
  // nodes or edges (load, removal, retyping edges) calls reindex().

  /** Rebuild every index from scratch. The first node with a given id wins. */
  reindex(): void {
    this.byId = new Map();
    for (const n of this.nodes) if (!this.byId.has(n.id)) this.byId.set(n.id, n);
    this.outIdx = new Map();
    this.incIdx = new Map();
    for (const e of this.edges) this.indexEdge(e);
  }

  private indexEdge(e: GraphEdge): void {
    const ko = `${e.from}\u0000${e.type}`;
    const ki = `${e.to}\u0000${e.type}`;
    let out = this.outIdx.get(ko);
    if (!out) this.outIdx.set(ko, (out = []));
    out.push(e);
    let inc = this.incIdx.get(ki);
    if (!inc) this.incIdx.set(ki, (inc = []));
    inc.push(e);
  }

  /** The Ontology node (scope, conventions). A stand-in if the file lacks one; struct-well-formed reports that. */
  get meta(): OntologyNode {
    const n = this.byId.get("ontology");
    return n?.type === "Ontology"
      ? n
      : { type: "Ontology", id: "ontology", name: "", domain: "", purpose: "", users: [], maintainers: [], outOfScope: [], kind: "application", reuseReviewed: false };
  }

  get conventions(): Conventions | undefined {
    return this.meta.conventions;
  }

  get step(): number {
    return Number(this.manifest.currentStep ?? 1);
  }

  get(id: string): OkbNode | undefined {
    return this.byId.get(id);
  }

  /**
   * The node with this id, which the caller knows exists (an edge end, a stored
   * slot id). Throws a readable OkbError rather than crashing on a hand-edited
   * file where it doesn't.
   */
  require(id: string): OkbNode;
  require<T extends NodeType>(id: string, type: T): NodeOf<T>;
  require(id: string, type?: NodeType): OkbNode {
    const n = this.byId.get(id);
    if (!n) throw new OkbError(`'${id}' is referenced but doesn't exist. Was a file edited by hand? okb validate shows what's broken.`);
    if (type && n.type !== type) throw new OkbError(`'${id}' is ${n.type === "Instance" ? "an" : "a"} ${n.type}, not a ${type}.`);
    return n;
  }

  ofType<T extends NodeType>(type: T): NodeOf<T>[] {
    return this.nodes.filter((n): n is NodeOf<T> => n.type === type);
  }

  outEdges(id: string, type: string): GraphEdge[] {
    return this.outIdx.get(`${id}\u0000${type}`) ?? [];
  }

  inEdges(id: string, type: string): GraphEdge[] {
    return this.incIdx.get(`${id}\u0000${type}`) ?? [];
  }

  targets(id: string, type: string): string[] {
    return this.outEdges(id, type).map((e) => e.to);
  }

  sources(id: string, type: string): string[] {
    return this.inEdges(id, type).map((e) => e.from);
  }

  edgesOf(type: string): GraphEdge[] {
    return this.edges.filter((e) => e.type === type);
  }

  label(id: string): string {
    const n = this.byId.get(id);
    return n ? nodeLabel(n) : id;
  }

  // ------------------------------------------------------------------ lookup
  /** Find a node by id, or by name/text (case- and delimiter-insensitive) among `types`. */
  find<T extends NodeType>(ref: string, types: T | readonly T[]): NodeOf<T>;
  find(ref: string, types?: NodeType | readonly NodeType[]): OkbNode;
  find<T extends NodeType>(ref: string, types: T | readonly T[] | undefined, required: false): NodeOf<T> | undefined;
  find(ref: string, types?: NodeType | readonly NodeType[], required = true): OkbNode | undefined {
    let ts: readonly NodeType[] | undefined = typeof types === "string" ? [types] : types;
    const prefixed = ref.match(/^(class|slot|instance|term|cq|question|decision):(.+)$/i);
    if (prefixed) {
      ts = [REF_PREFIX[prefixed[1].toLowerCase()]];
      ref = prefixed[2].trim();
    }
    const ok = (n: OkbNode) => !ts || ts.includes(n.type);
    const direct = this.byId.get(ref);
    if (direct && ok(direct)) return direct;
    const k = naming.key(ref);
    let hits = this.nodes.filter((n) => ok(n) && k && lookupNames(n).some((x) => naming.key(x) === k));
    if (hits.length === 0 && /^\d+$/.test(ref) && ts) {
      if (ts.includes("CompetencyQuestion")) hits = this.nodes.filter((n) => n.id === `cq.${ref}`);
      if (ts.includes("DesignDecision")) hits = hits.concat(this.nodes.filter((n) => n.id === `d.${ref}`));
    }
    if (hits.length > 1 && !ts) {
      // Untyped lookups prefer the modeling elements over brainstorm terms, questions, etc.
      for (const pref of ["Class", "Slot", "Instance"]) {
        const h = hits.filter((n) => n.type === pref);
        if (h.length === 1) return h[0];
        if (h.length > 1) break;
      }
    }
    if (hits.length === 1) return hits[0];
    if (hits.length > 1) {
      const hint = hits.map((h) => `${h.type.toLowerCase()}:${nameOrText(h) ?? h.id}`).join("  or  ");
      throw new OkbError(`'${ref}' matches more than one thing (${hits.map((h) => `${h.type} ${nameOrText(h)}`).join(", ")}). Say which one: ${hint}`);
    }
    if (!required) return undefined;
    const what = ts ? ts.join(" or ") : "node";
    if (ts) {
      const wanted = ts;
      const other = this.nodes.find((n) => !wanted.includes(n.type) && k && lookupNames(n).slice(0, 2).some((x) => naming.key(x) === k));
      if (other) {
        const extra = other.type === "Instance" && ts.includes("Class")
          ? " Instances can't have subclasses or be used as a class (rule inst-are-leaves); if you need that, make it a class."
          : "";
        const an = (w: string) => (/^[aeiou]/i.test(w) ? "an " : "a ") + w;
        throw new OkbError(`'${ref}' is ${an(other.type)}, not ${an(what)}.${extra}`);
      }
    }
    const sugg = this.suggest(ref, ts);
    throw new OkbError(`No ${what} named '${ref}'.${sugg.length ? ` Did you mean: ${sugg.join(", ")}?` : ""}`);
  }

  suggest(ref: string, types?: readonly NodeType[], limit = 3): string[] {
    const k = naming.key(ref);
    const scored = this.nodes
      .flatMap((n) => ("name" in n && n.name && (!types || types.includes(n.type)) ? [n.name] : []))
      .map((name) => ({ name, d: editDistance(k, naming.key(name)) }))
      .filter((x) => x.d <= Math.max(2, Math.floor(k.length / 3)))
      .sort((a, b) => a.d - b.d);
    return scored.slice(0, limit).map((x) => x.name);
  }

  // ------------------------------------------------------------------ mutation
  newId(type: NodeType, name?: string): string {
    if (type === "CompetencyQuestion" || type === "DesignDecision") {
      const p = type === "CompetencyQuestion" ? "cq" : "d";
      let i = 1;
      while (this.byId.has(`${p}.${i}`)) i++;
      return `${p}.${i}`;
    }
    const base = `${ID_PREFIX[type] ?? type.toLowerCase()}.${naming.slug(name ?? type)}`;
    let id = base;
    for (let i = 2; this.byId.has(id); i++) id = `${base}-${i}`;
    return id;
  }

  addNode<T extends OkbNode>(node: T): T {
    if (this.byId.has(node.id)) throw new OkbError(`A node with id ${node.id} already exists.`);
    this._nodes.push(node);
    this.byId.set(node.id, node);
    return node;
  }

  addEdge(from: string, type: string, to: string, props: Record<string, unknown> = {}): GraphEdge {
    const existing = this.outEdges(from, type).find(
      (e) => e.to === to && Object.entries(props).every(([k, v]) => e[k] === v),
    );
    if (existing) return existing;
    const e: GraphEdge = { from, type, to, ...props };
    this._edges.push(e);
    this.indexEdge(e);
    return e;
  }

  removeEdges(pred: (e: GraphEdge) => boolean): number {
    const before = this.edges.length;
    this._edges = this._edges.filter((e) => !pred(e));
    this.reindex();
    return before - this.edges.length;
  }

  /** Change every edge of one type to another (a relationship's edge type was renamed). */
  retypeEdges(from: string, to: string): void {
    for (const e of this._edges) if (e.type === from) e.type = to;
    this.reindex();
  }

  /** Remove a node, every edge touching it, and every value stored under its id. For a relationship slot, call rel.drop() first. */
  removeNode(id: string): void {
    this._nodes = this._nodes.filter((x) => x.id !== id);
    this._edges = this._edges.filter((e) => e.from !== id && e.to !== id);
    for (const x of this.nodes) {
      if (x.type === "Instance") delete x.values?.[id];
      else if (x.type === "Class") {
        delete x.fixedValues?.[id];
        delete x.defaults?.[id];
        delete x.facetOverrides?.[id];
      }
    }
    this.reindex();
  }

  // ------------------------------------------------------------------ hierarchy
  parents(id: string): string[] {
    return this.targets(id, "IS_A");
  }

  children(id: string): string[] {
    return this.sources(id, "IS_A");
  }

  /** All classes above id (not including id). Cycle-safe. */
  ancestors(id: string): Set<string> {
    return this.walk(id, (x) => this.parents(x));
  }

  descendants(id: string): Set<string> {
    return this.walk(id, (x) => this.children(x));
  }

  private walk(id: string, next: (x: string) => string[]): Set<string> {
    const seen = new Set<string>();
    const stack = [...next(id)];
    for (let c = stack.pop(); c !== undefined; c = stack.pop()) {
      if (seen.has(c) || c === id) continue;
      seen.add(c);
      stack.push(...next(c));
    }
    return seen;
  }

  /** id plus all its ancestors. */
  up(id: string): Set<string> {
    return new Set([id, ...this.ancestors(id)]);
  }

  /** a is b, or a (transitively) IS_A b. */
  isSub(a: string, b: string): boolean {
    return a === b || this.ancestors(a).has(b);
  }

  /** a and b can never share members: a declared DISJOINT_WITH pair covers them (directly or via ancestors). */
  disjointImplied(a: string, b: string): boolean {
    const ua = this.up(a);
    const ub = this.up(b);
    return this.edgesOf("DISJOINT_WITH").some((e) => (ua.has(e.from) && ub.has(e.to)) || (ua.has(e.to) && ub.has(e.from)));
  }

  roots(): string[] {
    return this.ofType("Class").filter((c) => this.parents(c.id).length === 0).map((c) => c.id);
  }

  /** Every class an instance belongs to, including inherited ones. */
  instanceClasses(id: string): Set<string> {
    const out = new Set<string>();
    for (const c of this.targets(id, "INSTANCE_OF")) for (const x of this.up(c)) out.add(x);
    return out;
  }

  /** Classes a node belongs to for slot purposes: an instance's classes, or a class and its ancestors. */
  classContext(id: string): string[] {
    const n = this.byId.get(id);
    return [...(n?.type === "Instance" ? this.instanceClasses(id) : this.up(id))];
  }

  // ------------------------------------------------------------------ slots
  ownSlots(id: string): string[] {
    return this.targets(id, "HAS_SLOT");
  }

  slotsOfClasses(classes: Iterable<string>): string[] {
    const out: string[] = [];
    for (const c of classes) for (const s of this.ownSlots(c)) if (!out.includes(s)) out.push(s);
    return out;
  }

  /** Own + inherited slots of a class, or all slots of an instance. */
  applicableSlots(id: string): string[] {
    const n = this.byId.get(id);
    if (n?.type === "Instance") return this.slotsOfClasses(this.instanceClasses(id));
    return this.slotsOfClasses([id, ...this.ancestors(id)]);
  }

  domain(slotId: string): string[] {
    return this.sources(slotId, "HAS_SLOT");
  }

  range(slotId: string): string[] {
    return this.targets(slotId, "RANGE");
  }

  inverses(slotId: string): string[] {
    return [...this.targets(slotId, "INVERSE_OF"), ...this.sources(slotId, "INVERSE_OF")];
  }

  /** Slot facets with overrides from any of `classes` applied (most restrictive wins). */
  effectiveFacets(slotId: string, classes: Iterable<string>): Facets {
    // A HAS_SLOT edge to something that isn't a slot (a hand edit) gets no facets; struct-well-formed reports it.
    const n = this.byId.get(slotId);
    const s: Partial<SlotNode> = n?.type === "Slot" ? n : {};
    const single = s.cardinality === "single";
    let max: number | null = s.maxCardinality ?? (single ? 1 : null);
    if (single && max !== null) max = Math.min(max, 1);
    const f: Facets = {
      valueType: s.valueType,
      allowedValues: Array.isArray(s.allowedValues) ? [...s.allowedValues] : null,
      min: s.minCardinality ?? 0,
      max,
      range: this.range(slotId),
      overriddenBy: [],
    };
    for (const c of classes) {
      const cn = this.byId.get(c);
      const ov = cn?.type === "Class" ? cn.facetOverrides?.[slotId] : undefined;
      if (!ov) continue;
      f.overriddenBy.push(c);
      const allowed = ov.allowedValues;
      if (Array.isArray(allowed)) {
        const base = f.allowedValues ?? allowed;
        f.allowedValues = base.filter((v) => allowed.includes(v));
      }
      if (typeof ov.minCardinality === "number") f.min = Math.max(f.min, ov.minCardinality);
      if (typeof ov.maxCardinality === "number") f.max = f.max === null ? ov.maxCardinality : Math.min(f.max, ov.maxCardinality);
      if (Array.isArray(ov.range) && ov.range.length) f.range = [...ov.range];
    }
    return f;
  }

  /** Values a node states for a slot: literals (values / fixedValues) plus relationship targets. */
  statedValues(id: string, slotId: string): unknown[] {
    const n = this.byId.get(id);
    if (!n) return [];
    const out: unknown[] = [];
    const lit = literalValue(n, slotId);
    if (lit !== undefined) out.push(...(Array.isArray(lit) ? lit : [lit]));
    out.push(...this.rel.values(id, slotId));
    return out;
  }

  /** The fixed (class-level) values for a slot inherited from any of `classes`, with the class that set them. */
  inheritedFixed(slotId: string, classes: Iterable<string>, exclude?: string): { cls: string; values: unknown[] } | null {
    for (const c of classes) {
      if (c === exclude) continue;
      const vals = this.statedValues(c, slotId);
      if (vals.length) return { cls: c, values: vals };
    }
    return null;
  }
}

/** A node's own literal value for a slot: an instance's value, or a class's fixed value. */
export function literalValue(n: OkbNode, slotId: string): StoredValue | undefined {
  if (n.type === "Instance") return n.values?.[slotId];
  if (n.type === "Class") return n.fixedValues?.[slotId];
  return undefined;
}

/** Where a node keeps its own literal values: instances in `values`, classes in `fixedValues`. */
export function literalValues(n: InstanceNode | ClassNode): Record<string, StoredValue> {
  return n.type === "Instance" ? (n.values ??= {}) : (n.fixedValues ??= {});
}

/** A node's name, or a question's/term's text (undefined for anything else). */
export function nameOrText(n: OkbNode): string | undefined {
  return "name" in n ? n.name : "text" in n ? n.text : undefined;
}

export { edgeProps };

export function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}
