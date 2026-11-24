/**
 * The graph explorer's model: okb nodes and edges (the `nodes.jsonl` and `edges.jsonl` lines, or the two arrays of a snapshot) in, a small view graph out. Plain,
 * erasable TypeScript with no DOM and no Astro imports, so `tests/graph-model.test.ts` can import it.
 *
 * It decides what the reader sees (which node types, which neighborhood), how a node reads (a label,
 * a ring or a dot, a color slot, the facts in the inspector) and what changed between two tutorial
 * snapshots. The element (`okb-graph.ts`) only draws what this returns.
 */

export interface RawNode {
  id: string;
  type: string;
  [field: string]: unknown;
}

export interface RawEdge {
  from: string;
  type: string;
  to: string;
}

export interface RawGraph {
  nodes: RawNode[];
  edges: RawEdge[];
}

/** A class is a ring, an instance a dot: the same two shapes as the art on every page's band. */
export type Shape = "ring" | "dot";

export interface ViewNode {
  id: string;
  type: string;
  label: string;
  shape: Shape;
  /** The 1-based `--color-art-N` slot. The same type always gets the same color. */
  art: number;
  /** The prose a reader needs first: a description, a definition, a rule's statement, a quote. */
  about?: string;
  /** Other facts, as label and value pairs, for the inspector. */
  facts: [string, string][];
}

export interface ViewEdge {
  from: string;
  to: string;
  type: string;
  /** The edge type in words: `INSTANCE_OF` → `instance of`. */
  label: string;
}

export interface ViewGraph {
  nodes: ViewNode[];
  edges: ViewEdge[];
}

/** Node types drawn as rings: the kinds of things. Everything else is a dot. */
const RINGS = new Set(["Class", "Concept", "Step", "Principle", "Decision", "Ontology", "NodeType", "EdgeType", "DesignDecision"]);

/** One color per node type, so the legend and the graph agree. */
const ART: Record<string, number> = {
  Class: 1,
  Concept: 1,
  Instance: 2,
  Step: 2,
  Slot: 3,
  Rule: 3,
  Term: 4,
  Principle: 4,
  CompetencyQuestion: 5,
  Decision: 5,
  DesignDecision: 5,
  SourceLocation: 6,
  Source: 6,
};

/** The edge types that mean "is a kind of" or "is an example of": the way up the hierarchy. */
const UP = new Set(["IS_A", "INSTANCE_OF"]);

/** The fields that hold a node's own words, best first. */
const ABOUT_FIELDS = ["description", "plainLanguage", "definition", "statement", "decision", "quote", "text", "purpose", "domain"];

/** Facts worth showing, with a label each. */
const FACT_FIELDS: [string, string][] = [
  ["valueType", "Value type"],
  ["cardinality", "Cardinality"],
  ["modality", "Modality"],
  ["status", "Status"],
  ["disposition", "Disposition"],
  ["example", "Example"],
  ["rationale", "Why"],
];

const clip = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);

const TYPE_NAMES: Record<string, string> = {
  SourceLocation: "Quote",
  CompetencyQuestion: "Competency question",
  DesignDecision: "Design decision",
  NodeType: "Node type",
  EdgeType: "Edge type",
};

/** A node type as a reader says it: `SourceLocation` → `Quote`. */
export const typeLabel = (type: string) => TYPE_NAMES[type] ?? type;

/** What a node is called on screen. */
export function labelOf(n: RawNode): string {
  const named = (n.name ?? n.title ?? n.text) as string | undefined;
  if (typeof named === "string" && named) return clip(named, 40);
  if (typeof n.quote === "string") return clip(n.quote, 40);
  if (typeof n.statement === "string") return clip(n.statement, 40);
  return n.id;
}

/** `INSTANCE_OF` → `instance of`. */
export const edgeLabel = (type: string) => type.toLowerCase().replace(/_/g, " ");

const str = (v: unknown): string | undefined => (typeof v === "string" && v ? v : typeof v === "number" || typeof v === "boolean" ? String(v) : undefined);

function viewNode(n: RawNode, byId: ReadonlyMap<string, RawNode>): ViewNode {
  const about = ABOUT_FIELDS.map((f) => str(n[f])).find(Boolean);
  const facts: [string, string][] = [];
  for (const [field, label] of FACT_FIELDS) {
    const v = str(n[field]);
    if (v && v !== about) facts.push([label, v]);
  }
  if (n.abstract === true) facts.push(["Abstract", "yes: no instance is made directly"]);
  // An instance keeps its literal values by slot id; show them by slot name.
  const values = n.values;
  if (values && typeof values === "object") {
    for (const [slot, v] of Object.entries(values as Record<string, unknown>)) {
      const name = byId.get(slot)?.name;
      facts.push([typeof name === "string" ? name : slot, Array.isArray(v) ? v.join(", ") : String(v)]);
    }
  }
  return { id: n.id, type: n.type, label: labelOf(n), shape: RINGS.has(n.type) ? "ring" : "dot", art: ART[n.type] ?? 6, about, facts };
}

/** Each node type in the data and how many nodes it has, most first. */
export function typesIn(raw: RawGraph): [string, number][] {
  const counts = new Map<string, number>();
  for (const n of raw.nodes) counts.set(n.type, (counts.get(n.type) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

/**
 * The node types a graph opens with. A user's ontology opens on its classes and instances. The meta-KB
 * opens on its concepts and the steps that introduce them, never on all 334 nodes.
 */
export function defaultTypes(raw: RawGraph): string[] {
  const present = new Set(raw.nodes.map((n) => n.type));
  if (present.has("Concept")) return ["Concept", "Step"];
  return ["Class", "Instance"].filter((t) => present.has(t));
}

/** The graph made of only the given node types. An edge stays only when both its ends do. */
export function buildGraph(raw: RawGraph, types: Iterable<string>): ViewGraph {
  const want = new Set(types);
  const byId = new Map(raw.nodes.map((n) => [n.id, n]));
  const nodes = raw.nodes.filter((n) => want.has(n.type)).map((n) => viewNode(n, byId));
  const ids = new Set(nodes.map((n) => n.id));
  const seen = new Set<string>();
  const edges: ViewEdge[] = [];
  for (const e of raw.edges) {
    const key = `${e.from}|${e.type}|${e.to}`;
    if (!ids.has(e.from) || !ids.has(e.to) || seen.has(key)) continue;
    seen.add(key);
    edges.push({ from: e.from, to: e.to, type: e.type, label: edgeLabel(e.type) });
  }
  return { nodes, edges };
}

/** A node by id or by name, ignoring case. */
export function findNode(g: ViewGraph, ref: string): ViewNode | undefined {
  const lower = ref.trim().toLowerCase();
  return g.nodes.find((n) => n.id === ref) ?? g.nodes.find((n) => n.label.toLowerCase() === lower);
}

/** Node ids within `depth` steps of the seeds, following edges in either direction. The seeds are included. */
export function neighborhood(g: ViewGraph, seeds: Iterable<string>, depth = 1): Set<string> {
  const ids = new Set(g.nodes.map((n) => n.id));
  const reached = new Set([...seeds].filter((s) => ids.has(s)));
  let frontier = [...reached];
  for (let d = 0; d < depth && frontier.length; d++) {
    const next: string[] = [];
    for (const e of g.edges) {
      for (const [a, b] of [[e.from, e.to], [e.to, e.from]] as const) {
        if (frontier.includes(a) && !reached.has(b)) {
          reached.add(b);
          next.push(b);
        }
      }
    }
    frontier = next;
  }
  return reached;
}

/** Walk `is a` and `instance of` edges from a node, up (ancestors) or down (descendants). Never includes the node. */
function walk(g: ViewGraph, id: string, up: boolean): Set<string> {
  const found = new Set<string>();
  let frontier = [id];
  while (frontier.length) {
    const next: string[] = [];
    for (const e of g.edges) {
      if (!UP.has(e.type)) continue;
      const [from, to] = up ? [e.from, e.to] : [e.to, e.from];
      if (frontier.includes(from) && to !== id && !found.has(to)) {
        found.add(to);
        next.push(to);
      }
    }
    frontier = next;
  }
  return found;
}

/** Every kind a node is, nearest first by discovery: Espresso drink, then Drink. */
export const ancestors = (g: ViewGraph, id: string): Set<string> => walk(g, id, true);

/** Every kind and instance below a node. */
export const descendants = (g: ViewGraph, id: string): Set<string> => walk(g, id, false);

/** The part of a graph with only the given node ids. */
export function subgraph(g: ViewGraph, ids: ReadonlySet<string>): ViewGraph {
  return { nodes: g.nodes.filter((n) => ids.has(n.id)), edges: g.edges.filter((e) => ids.has(e.from) && ids.has(e.to)) };
}

/**
 * The view for a `focus` list: each focus node, what it connects to within `depth`, and the kinds
 * above it, so a focused subclass still shows where it sits. Names that match nothing are returned
 * in `missing`, so the element can say so and tests can catch a typo.
 */
export function focusGraph(g: ViewGraph, focus: readonly string[], depth = 1): { graph: ViewGraph; missing: string[] } {
  const found = focus.map((f) => ({ ref: f, node: findNode(g, f) }));
  const missing = found.filter((f) => !f.node).map((f) => f.ref);
  const seeds = found.flatMap((f) => (f.node ? [f.node.id] : []));
  if (!seeds.length) return { graph: g, missing };
  const ids = neighborhood(g, seeds, depth);
  for (const s of seeds) for (const a of ancestors(g, s)) ids.add(a);
  return { graph: subgraph(g, ids), missing };
}

/** One link in a node's inspector. `out` is true when the node is the edge's `from` end. */
export interface Link {
  id: string;
  label: string;
  /** Reads naturally after the node's name: `is a`, `instance of`, `← contains`. */
  relation: string;
  out: boolean;
}

/** Every edge touching a node, as links to the node at the other end. */
export function linksOf(g: ViewGraph, id: string): Link[] {
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  const links: Link[] = [];
  for (const e of g.edges) {
    if (e.from !== id && e.to !== id) continue;
    const out = e.from === id;
    const other = byId.get(out ? e.to : e.from);
    if (other) links.push({ id: other.id, label: other.label, relation: out ? e.label : `← ${e.label}`, out });
  }
  return links.sort((a, b) => Number(b.out) - Number(a.out) || a.relation.localeCompare(b.relation) || a.label.localeCompare(b.label));
}

export interface StepDiff {
  added: string[];
  removed: string[];
  changed: string[];
}

/** What a tutorial step did: node ids added, removed, or kept with different contents. */
export function diffSteps(before: RawGraph, after: RawGraph): StepDiff {
  const prev = new Map(before.nodes.map((n) => [n.id, JSON.stringify(n)]));
  const next = new Map(after.nodes.map((n) => [n.id, JSON.stringify(n)]));
  return {
    added: [...next.keys()].filter((id) => !prev.has(id)),
    removed: [...prev.keys()].filter((id) => !next.has(id)),
    changed: [...next].filter(([id, json]) => prev.has(id) && prev.get(id) !== json).map(([id]) => id),
  };
}
