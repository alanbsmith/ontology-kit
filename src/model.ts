/** Loading, saving and navigating an ontology folder (okb.json + nodes.json + edges.json). */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import * as naming from "./naming.ts";
import type { Conventions, Facets, GraphEdge, GraphNode, Manifest } from "./types.ts";

export const FORMAT = "okb-lpg/2";
export const MANIFEST = "okb.json";
export const VALUE_TYPES = ["String", "Integer", "Float", "Number", "Boolean", "Enumerated", "Instance"];
export const DISPOSITIONS = ["undecided", "class", "slot", "instance", "value", "synonym", "out-of-scope"];
const ID_PREFIX: Record<string, string> = {
  Class: "c", Slot: "s", Instance: "i", Term: "t", ReusedOntology: "r", Source: "src", SourceLocation: "loc", Rule: "rule",
};

/** A user-facing problem (bad name, missing node...). The CLI prints it without a stack trace. */
export class OkbError extends Error {}

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
  nodes: GraphNode[];
  edges: GraphEdge[];
  byId = new Map<string, GraphNode>();
  private outIdx = new Map<string, GraphEdge[]>();
  private incIdx = new Map<string, GraphEdge[]>();

  constructor(root: string, manifest: Manifest, nodes: GraphNode[], edges: GraphEdge[]) {
    this.root = root;
    this.manifest = manifest;
    this.nodes = nodes;
    this.edges = edges;
    this.reindex();
  }

  // ------------------------------------------------------------------ io
  static create(root: string, name: string): Ontology {
    mkdirSync(root, { recursive: true });
    if (existsSync(join(root, MANIFEST))) throw new OkbError(`${root} already contains an ontology (${MANIFEST}).`);
    const manifest: Manifest = { format: FORMAT, name, currentStep: 1, created: new Date().toISOString().slice(0, 10) };
    const nodes: GraphNode[] = [{
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
    const ont = new Ontology(
      root,
      readJson<Manifest>(join(root, MANIFEST), { format: FORMAT, currentStep: 1 }),
      readJson<GraphNode[]>(join(root, "nodes.json"), []),
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
    this.edges = this.edges.filter((e) => e.type !== "HAS_VALUE");
    this.reindex();
    for (const e of old) if (e.slot) this.addLink(e.from, e.slot, e.to);
    this.manifest.format = FORMAT;
  }

  static fromData(nodes: GraphNode[], edges: GraphEdge[], manifest?: Partial<Manifest>): Ontology {
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

  get meta(): GraphNode {
    return this.byId.get("ontology") ?? { id: "ontology", type: "Ontology" };
  }

  get conventions(): Conventions | undefined {
    return this.meta.conventions;
  }

  get step(): number {
    return Number(this.manifest.currentStep ?? 1);
  }

  get(id: string): GraphNode | undefined {
    return this.byId.get(id);
  }

  ofType(type: string): GraphNode[] {
    return this.nodes.filter((n) => n.type === type);
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
    return n ? (n.name ?? n.text ?? n.title ?? id) : id;
  }

  // ------------------------------------------------------------------ lookup
  /** Find a node by id, or by name/text (case- and delimiter-insensitive) among `types`. */
  find(ref: string, types?: string | string[]): GraphNode;
  find(ref: string, types: string | string[] | undefined, required: false): GraphNode | undefined;
  find(ref: string, types?: string | string[], required = true): GraphNode | undefined {
    let ts = typeof types === "string" ? [types] : types;
    const prefixed = ref.match(/^(class|slot|instance|term|cq|question|decision):(.+)$/i);
    if (prefixed) {
      const map: Record<string, string> = { class: "Class", slot: "Slot", instance: "Instance", term: "Term", cq: "CompetencyQuestion", question: "CompetencyQuestion", decision: "DesignDecision" };
      ts = [map[prefixed[1].toLowerCase()]];
      ref = prefixed[2].trim();
    }
    const ok = (n: GraphNode) => !ts || ts.includes(n.type);
    const direct = this.byId.get(ref);
    if (direct && ok(direct)) return direct;
    const k = naming.key(ref);
    let hits = this.nodes.filter(
      (n) => ok(n) && k && (naming.key(n.name ?? "") === k || naming.key(n.text ?? "") === k || naming.key(n.title ?? "") === k),
    );
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
      const hint = hits.map((h) => `${h.type.toLowerCase()}:${h.name ?? h.text ?? h.id}`).join("  or  ");
      throw new OkbError(`'${ref}' matches more than one thing (${hits.map((h) => `${h.type} ${h.name ?? h.text}`).join(", ")}). Say which one: ${hint}`);
    }
    if (!required) return undefined;
    const what = ts ? ts.join(" or ") : "node";
    if (ts) {
      const other = this.nodes.find((n) => !ts!.includes(n.type) && k && (naming.key(n.name ?? "") === k || naming.key(n.text ?? "") === k));
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

  suggest(ref: string, types?: string[], limit = 3): string[] {
    const k = naming.key(ref);
    const scored = this.nodes
      .filter((n) => n.name && (!types || types.includes(n.type)))
      .map((n) => ({ name: n.name as string, d: editDistance(k, naming.key(n.name)) }))
      .filter((x) => x.d <= Math.max(2, Math.floor(k.length / 3)))
      .sort((a, b) => a.d - b.d);
    return scored.slice(0, limit).map((x) => x.name);
  }

  // ------------------------------------------------------------------ mutation
  newId(type: string, name?: string): string {
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

  addNode(node: GraphNode): GraphNode {
    if (this.byId.has(node.id)) throw new OkbError(`A node with id ${node.id} already exists.`);
    this.nodes.push(node);
    this.byId.set(node.id, node);
    return node;
  }

  addEdge(from: string, type: string, to: string, props: Record<string, unknown> = {}): GraphEdge {
    const existing = this.outEdges(from, type).find(
      (e) => e.to === to && Object.entries(props).every(([k, v]) => e[k] === v),
    );
    if (existing) return existing;
    const e: GraphEdge = { from, type, to, ...props };
    this.edges.push(e);
    this.indexEdge(e);
    return e;
  }

  removeEdges(pred: (e: GraphEdge) => boolean): number {
    const before = this.edges.length;
    this.edges = this.edges.filter((e) => !pred(e));
    this.reindex();
    return before - this.edges.length;
  }

  removeNode(id: string): void {
    const n = this.byId.get(id);
    // A removed relationship slot takes its stored edges with it (ops.remove promotes an inverse first).
    const relType = n?.type === "Slot" && this.primarySlot(id) === id ? n.relType : undefined;
    this.nodes = this.nodes.filter((x) => x.id !== id);
    this.edges = this.edges.filter((e) => e.from !== id && e.to !== id && (!relType || e.type !== relType));
    for (const n of this.nodes) {
      for (const field of ["values", "fixedValues", "defaults", "facetOverrides"]) {
        if (n[field] && typeof n[field] === "object" && id in n[field]) delete n[field][id];
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
    while (stack.length) {
      const c = stack.pop()!;
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
    const s = this.byId.get(slotId)!;
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
      const ov = this.byId.get(c)?.facetOverrides?.[slotId];
      if (!ov) continue;
      f.overriddenBy.push(c);
      if (Array.isArray(ov.allowedValues)) {
        const base = f.allowedValues ?? ov.allowedValues;
        f.allowedValues = base.filter((v: string) => ov.allowedValues.includes(v));
      }
      if (typeof ov.minCardinality === "number") f.min = Math.max(f.min, ov.minCardinality);
      if (typeof ov.maxCardinality === "number") f.max = f.max === null ? ov.maxCardinality : Math.min(f.max, ov.maxCardinality);
      if (Array.isArray(ov.range) && ov.range.length) f.range = [...ov.range];
    }
    return f;
  }

  // ------------------------------------------------------------------ relationships
  //
  // A value of an Instance-type slot is stored as an edge whose type is the slot's
  // relationship type: (wine)-[:MAKER]->(winery). Inverse slots share one edge: the
  // slot on the `from` side of INVERSE_OF is the stored direction; its inverse reads
  // the same edges backwards, so `produces` = incoming MAKER edges.

  /** The stored slot for a relationship: the slot itself, or the one it is the inverse of. */
  primarySlot(slotId: string): string {
    return this.sources(slotId, "INVERSE_OF")[0] ?? slotId;
  }

  /** How a slot's values are stored: edge type and whether this slot reads it backwards. */
  linkSpec(slotId: string): { type: string; reverse: boolean } | null {
    const s = this.byId.get(slotId);
    if (!s || s.valueType !== "Instance") return null;
    const primary = this.primarySlot(slotId);
    const p = this.byId.get(primary);
    if (!p?.relType) return null;
    return { type: p.relType, reverse: primary !== slotId };
  }

  /** Edge types used by relationships, mapped to the slot that stores them. */
  relationshipTypes(): Map<string, string> {
    const m = new Map<string, string>();
    for (const s of this.ofType("Slot")) if (s.relType && s.valueType === "Instance" && this.primarySlot(s.id) === s.id) m.set(s.relType, s.id);
    return m;
  }

  /** Nodes a node is linked to through a relationship slot (either direction). */
  linked(id: string, slotId: string): string[] {
    const spec = this.linkSpec(slotId);
    if (!spec) return [];
    return spec.reverse ? this.sources(id, spec.type) : this.targets(id, spec.type);
  }

  /**
   * Link `id` to `target` through a relationship slot. There is at most one edge per
   * (from, relationship, to); `props` (edge properties such as a condition, or `rule`)
   * are merged into it. Returns whether a new edge was created.
   */
  addLink(id: string, slotId: string, target: string, props: Record<string, unknown> = {}): boolean {
    const existing = this.linkEdge(id, slotId, target);
    if (existing) {
      Object.assign(existing, props);
      return false;
    }
    const spec = this.linkSpec(slotId);
    if (!spec) throw new OkbError(`${this.label(slotId)} isn't a relationship.`);
    const [from, to] = spec.reverse ? [target, id] : [id, target];
    this.addEdge(from, spec.type, to, props);
    return true;
  }

  /** The stored edge behind one relationship value, whichever end it's read from. */
  linkEdge(id: string, slotId: string, target: string): GraphEdge | undefined {
    const spec = this.linkSpec(slotId);
    if (!spec) return undefined;
    const [from, to] = spec.reverse ? [target, id] : [id, target];
    return this.outEdges(from, spec.type).find((e) => e.to === to);
  }

  removeLink(id: string, slotId: string, target: string): void {
    const spec = this.linkSpec(slotId);
    if (!spec) return;
    const [from, to] = spec.reverse ? [target, id] : [id, target];
    this.removeEdges((e) => e.type === spec.type && e.from === from && e.to === to);
  }

  /** Relationship slots a node has any values for (either direction). */
  linkedSlots(id: string): string[] {
    return this.ofType("Slot").filter((s) => this.linked(id, s.id).length > 0).map((s) => s.id);
  }

  /** Values a node states for a slot: literals (values / fixedValues) plus relationship targets. */
  statedValues(id: string, slotId: string): unknown[] {
    const n = this.byId.get(id);
    if (!n) return [];
    const field = n.type === "Instance" ? "values" : "fixedValues";
    const out: unknown[] = [];
    const lit = n[field]?.[slotId];
    if (lit !== undefined) out.push(...(Array.isArray(lit) ? lit : [lit]));
    out.push(...this.linked(id, slotId));
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

/** An edge's own properties (everything except from/type/to). */
export function edgeProps(e: GraphEdge): Record<string, unknown> {
  const { from: _f, type: _t, to: _to, ...rest } = e;
  return rest;
}

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
