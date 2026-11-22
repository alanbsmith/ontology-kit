/**
 * `okb diff`: what changed in the knowledge between two versions of an ontology, not in the JSON.
 * `diffOntologies` is a pure function over two loaded `Ontology` objects (no git, no files);
 * `diffMarkdown` writes it for a PR comment. Nodes are matched by id, so a rename keeps its
 * identity and shows as a rename. `createdAt`/`updatedAt` are ignored: a node whose only change is
 * a stamp isn't a change in the knowledge (it's counted in `summary.stampOnly`).
 */
import { NODE_TYPES, edgeProps, type GraphEdge, type OkbNode, type Ontology } from "@ontology-kit/format";

/** One changed field. `path` is the raw key path; `field` is how it reads (slot ids become slot names). */
export interface FieldChange {
  path: string[];
  field: string;
  before?: unknown;
  after?: unknown;
}

export interface NodeRef {
  id: string;
  type: string;
  name: string;
}

export interface NodeChange extends NodeRef {
  /** The old name, when it differs from `name`. */
  renamedFrom?: string;
  fields: FieldChange[];
  /** For a quote: how it changed in words ("moved", "text changed"). */
  note?: string;
}

export interface TypeDiff {
  added: NodeRef[];
  removed: NodeRef[];
  changed: NodeChange[];
}

export interface EdgeRef {
  from: string;
  type: string;
  to: string;
  /** The link in words: `Merlot is a Red`, `Wine has slot body`, `Wine —maker→ Winery`. */
  text: string;
  props?: Record<string, unknown>;
}

export interface EdgeChange extends EdgeRef {
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}

export interface TypeRename {
  slot: string;
  from: string;
  to: string;
  /** How many edges carry the type. */
  edges: number;
}

export interface OntologyDiff {
  old: string;
  new: string;
  summary: {
    nodesAdded: number;
    nodesRemoved: number;
    nodesChanged: number;
    edgesAdded: number;
    edgesRemoved: number;
    edgesChanged: number;
    /** Nodes whose only difference is createdAt/updatedAt. */
    stampOnly: number;
  };
  /** Only types with changes, in the format's order. */
  types: Record<string, TypeDiff>;
  /** Relationship slots whose edge type changed (a slot rename); their edges are not listed as changes. */
  relationshipTypeRenames: TypeRename[];
  edges: { added: EdgeRef[]; removed: EdgeRef[]; changed: EdgeChange[] };
}

const STAMPS = new Set(["createdAt", "updatedAt"]);
const isPlain = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);

/** What a node is called, for a reader. */
export function label(n: OkbNode, ont: Ontology): string {
  const x = n as Record<string, any>;
  if (n.type === "SourceLocation") {
    const q = String(x.quote ?? "");
    const text = q.length > 60 ? q.slice(0, 57) + "..." : q;
    const src = ont.targets(n.id, "PART_OF").map((id) => ont.get(id)).find((s) => s?.type === "Source");
    return `"${text}"` + (src && src.type === "Source" ? ` (${src.title})` : "");
  }
  return x.name ?? x.text ?? x.title ?? n.id;
}

/** Every leaf of a node as [path, value], skipping id, type and stamps. Plain objects are walked; arrays are leaves. */
type Leaves = Map<string, { path: string[]; value: unknown }>;
function leaves(node: object): Leaves {
  const out: Leaves = new Map();
  const walk = (value: unknown, path: string[]): void => {
    if (isPlain(value)) {
      for (const [k, v] of Object.entries(value)) if (v !== undefined) walk(v, [...path, k]);
    } else out.set(JSON.stringify(path), { path, value });
  };
  for (const [k, v] of Object.entries(node)) if (v !== undefined && !STAMPS.has(k) && k !== "id" && k !== "type") walk(v, [k]);
  return out;
}

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

function fieldChanges(a: OkbNode, b: OkbNode, name: (id: string) => string): FieldChange[] {
  const la = leaves(a);
  const lb = leaves(b);
  const out: FieldChange[] = [];
  const keys = new Set([...la.keys(), ...lb.keys()]);
  for (const k of keys) {
    const x = la.get(k);
    const y = lb.get(k);
    if (x && y && same(x.value, y.value)) continue;
    const path = (x ?? y)!.path;
    const field = path.map((seg, i) => (i === 0 ? seg : name(seg))).join(".");
    const change: FieldChange = { path, field };
    if (x) change.before = x.value;
    if (y) change.after = y.value;
    out.push(change);
  }
  return out.sort((p, q) => (p.field < q.field ? -1 : p.field > q.field ? 1 : 0));
}

const LOCATION_FIELDS = new Set(["locator", "headingPath", "startLine", "endLine", "lines", "blockKind", "sourceLink", "pageLink", "page"]);

const PHRASE: Record<string, (a: string, b: string) => string> = {
  IS_A: (a, b) => `${a} is a ${b}`,
  INSTANCE_OF: (a, b) => `${a} is an instance of ${b}`,
  HAS_SLOT: (a, b) => `${a} has slot ${b}`,
  RANGE: (a, b) => `${a} has range ${b}`,
  INVERSE_OF: (a, b) => `${a} is the inverse of ${b}`,
  DISJOINT_WITH: (a, b) => `${a} is disjoint with ${b}`,
  NEEDS: (a, b) => `${a} needs ${b}`,
  BECAME: (a, b) => `${a} became ${b}`,
  ABOUT: (a, b) => `${a} is about ${b}`,
  CITES: (a, b) => `${a} cites ${b}`,
  PART_OF: (a, b) => `${a} is part of ${b}`,
  GOVERNS: (a, b) => `${a} governs ${b}`,
  REFINES: (a, b) => `${a} refines ${b}`,
  FULFILLS: (a, b) => `${a} fulfills ${b}`,
};

const edgeKey = (from: string, type: string, to: string): string => `${from}\u0000${type}\u0000${to}`;

/** Compare two ontologies. `oldName`/`newName` only label the result. */
export function diffOntologies(a: Ontology, b: Ontology, oldName = "old", newName = "new"): OntologyDiff {
  const byIdA = new Map<string, OkbNode>();
  for (const n of a.nodes) if (!byIdA.has(n.id)) byIdA.set(n.id, n);
  const byIdB = new Map<string, OkbNode>();
  for (const n of b.nodes) if (!byIdB.has(n.id)) byIdB.set(n.id, n);

  // How a stored id reads: its name in the new version, else the old one, else the id itself.
  const nameOf = (id: string): string => {
    const n = byIdB.get(id) ?? byIdA.get(id);
    return n ? label(n, byIdB.has(id) ? b : a) : id;
  };
  const types: Record<string, TypeDiff> = {};
  const bucket = (t: string): TypeDiff => (types[t] ??= { added: [], removed: [], changed: [] });
  const ref = (n: OkbNode, o: Ontology): NodeRef => ({ id: n.id, type: n.type, name: label(n, o) });
  let stampOnly = 0;

  for (const [id, nb] of byIdB) {
    const na = byIdA.get(id);
    if (!na) {
      bucket(nb.type).added.push(ref(nb, b));
      continue;
    }
    if (na.type !== nb.type) {
      bucket(na.type).removed.push(ref(na, a));
      bucket(nb.type).added.push(ref(nb, b));
      continue;
    }
    const fields = fieldChanges(na, nb, nameOf);
    if (!fields.length) {
      if (!same(na, nb)) stampOnly++;
      continue;
    }
    const change: NodeChange = { ...ref(nb, b), fields };
    const was = label(na, a);
    if (was !== change.name) change.renamedFrom = was;
    if (nb.type === "SourceLocation") {
      const parts: string[] = [];
      if (fields.some((f) => LOCATION_FIELDS.has(f.path[0]))) parts.push("moved");
      if (fields.some((f) => f.path[0] === "quote")) parts.push("text changed");
      if (parts.length) change.note = parts.join(", ");
    }
    bucket(nb.type).changed.push(change);
  }
  for (const [id, na] of byIdA) if (!byIdB.has(id)) bucket(na.type).removed.push(ref(na, a));

  const byName = (x: NodeRef, y: NodeRef) => (x.name < y.name ? -1 : x.name > y.name ? 1 : x.id < y.id ? -1 : x.id > y.id ? 1 : 0);
  const ordered: Record<string, TypeDiff> = {};
  const order = [...NODE_TYPES, ...Object.keys(types).filter((t) => !NODE_TYPES.includes(t))];
  for (const t of order) {
    const d = types[t];
    if (!d) continue;
    d.added.sort(byName);
    d.removed.sort(byName);
    d.changed.sort(byName);
    ordered[t] = d;
  }

  // A slot rename changes its edge type, and with it every edge of that type; say so once instead of listing them.
  const renames: TypeRename[] = [];
  const retype = new Map<string, string>();
  const slotTypesA = a.rel.edgeTypes();
  const slotTypesB = b.rel.edgeTypes();
  const countA = new Map<string, number>();
  for (const e of a.edges) countA.set(e.type, (countA.get(e.type) ?? 0) + 1);
  for (const [oldType, slotId] of slotTypesA) {
    const nb = byIdB.get(slotId);
    if (nb?.type !== "Slot" || !nb.relType || nb.relType === oldType) continue;
    // Skip if the old type is still some slot's type in the new version (types swapped or reused).
    if (slotTypesB.has(oldType)) continue;
    retype.set(oldType, nb.relType);
    renames.push({ slot: label(nb, b), from: oldType, to: nb.relType, edges: countA.get(oldType) ?? 0 });
  }
  renames.sort((x, y) => (x.from < y.from ? -1 : 1));

  const edgesA = new Map<string, GraphEdge>();
  for (const e of a.edges) edgesA.set(edgeKey(e.from, retype.get(e.type) ?? e.type, e.to), e);
  const edgesB = new Map<string, GraphEdge>();
  for (const e of b.edges) edgesB.set(edgeKey(e.from, e.type, e.to), e);

  const slotOfType = (t: string): string | undefined => {
    const id = slotTypesB.get(t) ?? slotTypesA.get(t);
    const s = id ? (byIdB.get(id) ?? byIdA.get(id)) : undefined;
    return s ? label(s, byIdB.has(s.id) ? b : a) : undefined;
  };
  const describe = (e: GraphEdge): EdgeRef => {
    const from = nameOf(e.from);
    const to = nameOf(e.to);
    const phrase: ((a: string, b: string) => string) | undefined = Object.hasOwn(PHRASE, e.type) ? PHRASE[e.type] : undefined;
    const slot = phrase ? undefined : slotOfType(e.type);
    const text = phrase ? phrase(from, to) : `${from} —${slot ?? e.type}→ ${to}`;
    const props = edgeProps(e);
    const r: EdgeRef = { from: e.from, type: e.type, to: e.to, text };
    if (Object.keys(props).length) r.props = props;
    return r;
  };

  const added: EdgeRef[] = [];
  const removed: EdgeRef[] = [];
  const changed: EdgeChange[] = [];
  for (const [k, eb] of edgesB) {
    const ea = edgesA.get(k);
    if (!ea) added.push(describe(eb));
    else if (!same(sortKeys(edgeProps(ea)), sortKeys(edgeProps(eb)))) {
      changed.push({ ...describe(eb), before: edgeProps(ea), after: edgeProps(eb) });
    }
  }
  for (const [k, ea] of edgesA) if (!edgesB.has(k)) removed.push(describe({ ...ea, type: retype.get(ea.type) ?? ea.type }));
  const byText = (x: EdgeRef, y: EdgeRef) => (x.text < y.text ? -1 : x.text > y.text ? 1 : 0);
  added.sort(byText);
  removed.sort(byText);
  changed.sort(byText);

  let nodesAdded = 0, nodesRemoved = 0, nodesChanged = 0;
  for (const d of Object.values(ordered)) {
    nodesAdded += d.added.length;
    nodesRemoved += d.removed.length;
    nodesChanged += d.changed.length;
  }
  return {
    old: oldName,
    new: newName,
    summary: { nodesAdded, nodesRemoved, nodesChanged, edgesAdded: added.length, edgesRemoved: removed.length, edgesChanged: changed.length, stampOnly },
    types: ordered,
    relationshipTypeRenames: renames,
    edges: { added, removed, changed },
  };
}

function sortKeys(o: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
}

export function isEmpty(d: OntologyDiff): boolean {
  const s = d.summary;
  return s.nodesAdded + s.nodesRemoved + s.nodesChanged + s.edgesAdded + s.edgesRemoved + s.edgesChanged + d.relationshipTypeRenames.length === 0;
}

const TYPE_TITLES: Record<string, string> = {
  Ontology: "Ontology", CompetencyQuestion: "Competency questions", Term: "Terms", ReusedOntology: "Reused ontologies", Class: "Classes",
  Slot: "Slots", Instance: "Instances", DesignDecision: "Design decisions", Source: "Sources", SourceLocation: "Quotes", Rule: "Rules",
};

/** A value on one line, for a table cell or a sentence. */
function show(v: unknown): string {
  if (v === undefined) return "(none)";
  if (typeof v === "string") return JSON.stringify(v);
  if (Array.isArray(v)) return v.length ? v.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(", ") : "(empty)";
  return JSON.stringify(v);
}
const cell = (s: string): string => s.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
const code = (s: string): string => "`" + s.replace(/`/g, "'") + "`";

/** A changed rule: statement, modality and verification status side by side, then any other field that changed. */
function ruleTable(c: NodeChange): string[] {
  const find = (p: string) => c.fields.find((f) => f.field === p);
  const row = (name: string, f: FieldChange | undefined, unchanged: string): string =>
    f ? `  | ${name} | ${cell(show(f.before))} | ${cell(show(f.after))} |` : `  | ${name} | ${unchanged} | (same) |`;
  const main = ["statement", "modality", "verification.status"];
  return [
    "  | | Before | After |",
    "  |---|---|---|",
    row("statement", find("statement"), "unchanged"),
    row("modality", find("modality"), "unchanged"),
    row("verification", find("verification.status"), "unchanged"),
    ...c.fields.filter((f) => ![...main, "name"].includes(f.field)).map((f) => `  | ${cell(f.field)} | ${cell(show(f.before))} | ${cell(show(f.after))} |`),
  ];
}

/** The diff as Markdown, written for a PR comment. */
export function diffMarkdown(d: OntologyDiff): string {
  const out: string[] = [`# Ontology changes: ${d.old} → ${d.new}`, ""];
  if (isEmpty(d)) {
    out.push("No changes to the knowledge." + (d.summary.stampOnly ? ` (${d.summary.stampOnly} node(s) differ only in createdAt/updatedAt.)` : ""));
    return out.join("\n") + "\n";
  }
  const s = d.summary;
  out.push(`${s.nodesAdded} added, ${s.nodesRemoved} removed and ${s.nodesChanged} changed node(s); ${s.edgesAdded} link(s) added, ${s.edgesRemoved} removed, ${s.edgesChanged} changed.`, "");
  for (const [type, t] of Object.entries(d.types)) {
    out.push(`## ${TYPE_TITLES[type] ?? type + "s"}`, "");
    for (const n of t.added) out.push(`- **Added** ${code(n.name)}`);
    for (const n of t.removed) out.push(`- **Removed** ${code(n.name)}${type === "SourceLocation" ? " (the quote disappeared)" : ""}`);
    for (const c of t.changed) {
      const head = c.renamedFrom !== undefined ? `**Renamed** ${code(c.renamedFrom)} → ${code(c.name)}` : `**Changed** ${code(c.name)}`;
      out.push(`- ${head}${c.note ? ` (${c.note})` : ""}`);
      if (type === "Rule") {
        out.push("", ...ruleTable(c), "");
        continue;
      }
      for (const f of c.fields) {
        if (f.field === "name" && c.renamedFrom !== undefined) continue;
        out.push(`  - ${f.field}: ${show(f.before)} → ${show(f.after)}`);
      }
    }
    out.push("");
  }
  if (d.relationshipTypeRenames.length) {
    out.push("## Relationship edge types renamed", "");
    for (const r of d.relationshipTypeRenames) out.push(`- ${code(":" + r.from)} → ${code(":" + r.to)} (slot ${code(r.slot)}, ${r.edges} edge(s) keep their meaning)`);
    out.push("");
  }
  const links = (title: string, list: EdgeRef[], mark: string) => {
    if (!list.length) return;
    out.push(`## ${title}`, "");
    for (const e of list) out.push(`- ${mark} ${e.text}${e.props ? ` (${Object.entries(e.props).map(([k, v]) => `${k}=${show(v)}`).join(", ")})` : ""}`);
    out.push("");
  };
  links("Links added", d.edges.added, "+");
  links("Links removed", d.edges.removed, "−");
  if (d.edges.changed.length) {
    out.push("## Link properties changed", "");
    for (const e of d.edges.changed) {
      const keys = new Set([...Object.keys(e.before), ...Object.keys(e.after)]);
      out.push(`- ${e.text}: ${[...keys].sort().filter((k) => !same(e.before[k], e.after[k])).map((k) => `${k} ${show(e.before[k])} → ${show(e.after[k])}`).join("; ")}`);
    }
    out.push("");
  }
  if (s.stampOnly) out.push(`${s.stampOnly} other node(s) differ only in createdAt/updatedAt and are not listed.`, "");
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}
