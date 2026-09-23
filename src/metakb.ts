/** Read access to the compiled meta-KB (meta-kb/data/*.json). */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as naming from "./naming.ts";
import type { GraphEdge, Modality, Severity } from "./types.ts";

export const META_DIR = join(dirname(dirname(fileURLToPath(import.meta.url))), "meta-kb", "data");

// ------------------------------------------------------------------ node types (see meta-kb/README.md "Schema")
export interface MetaInfo {
  type: "MetaKB";
  id: string;
  version: string;
  formatVersion: string;
  description?: string;
}

export interface MetaSource {
  type: "Source";
  id: string;
  title: string;
  shortName: string;
  authors: string;
  year: number;
  url?: string;
  venue?: string;
}

export interface MetaLocation {
  type: "SourceLocation";
  id: string;
  section: string;
  /** A PDF page, or a range like "14-15". */
  page: number | string;
  quote: string;
  deepLink?: string;
}

export interface MetaPrinciple {
  type: "Principle";
  id: string;
  name: string;
  statement: string;
  plainLanguage: string;
}

export interface MetaConcept {
  type: "Concept";
  id: string;
  name: string;
  aliases?: string[];
  definition: string;
  plainLanguage: string;
  example?: string;
  inThisToolkit?: string;
  origin: "source" | "operational";
}

export interface MetaRule {
  type: "Rule";
  id: string;
  key: string;
  modality: Modality;
  basis: "direct" | "interpretive" | "operational";
  check: "mechanical" | "heuristic" | "judgment";
  severity: Severity;
  severityReason?: string;
  fromStep: number;
  statement: string;
  plainLanguage: string;
  /** The question the ontology-review skill asks (judgment rules). */
  review?: string;
  fix: string;
}

export interface MetaRationale {
  type: "Rationale";
  id: string;
  explanation: string;
}

/** One yes/no question in a decision guide. "continue" means go to the next question. */
export interface DecisionTest {
  ask: string;
  ifYes: string;
  ifNo: string;
}

export interface MetaDecision {
  type: "Decision";
  id: string;
  name: string;
  whenYouFaceIt: string;
  tests: DecisionTest[];
  note?: string;
  wine: string;
}

/** A step's "done when" item. `check` names a function in STEP_CHECKS (src/status.ts); without one it's a judgment call. */
export interface DoneWhen {
  text: string;
  check?: string;
}

export interface MetaStep {
  type: "Step";
  id: string;
  order: number;
  name: string;
  goal: string;
  whyItMatters: string;
  guidingQuestions: string[];
  outputs: string[];
  doneWhen: DoneWhen[];
  tips: string[];
  wine: string;
  commands: string[];
}

export interface MetaNodeType {
  type: "NodeType";
  id: string;
  name: string;
  origin: "ontology101" | "operational";
  required: string[];
  description: string;
}

export interface MetaEdgeType {
  type: "EdgeType";
  id: string;
  name: string;
  origin: "ontology101" | "operational";
  fromTypes: string[];
  toTypes: string[];
  props: string[];
  description: string;
}

export type MetaNode =
  | MetaInfo | MetaSource | MetaLocation | MetaPrinciple | MetaConcept | MetaRule
  | MetaRationale | MetaDecision | MetaStep | MetaNodeType | MetaEdgeType;
export type MetaType = MetaNode["type"];
export type MetaOf<T extends MetaType> = Extract<MetaNode, { type: T }>;

/** What `okb explain` can show. */
export type Explainable = MetaConcept | MetaPrinciple | MetaDecision | MetaStep | MetaRule;
const EXPLAINABLE = new Set<MetaType>(["Concept", "Principle", "Decision", "Step", "Rule"]);
const isExplainable = (n: MetaNode | undefined): n is Explainable => n !== undefined && EXPLAINABLE.has(n.type);

/** How `okb explain` lists a node: a rule by its key, anything else by its name. */
export function explainName(n: Explainable): string {
  return n.type === "Rule" ? n.key : n.name;
}

/** The words a node can be looked up by in `okb explain`. */
function explainNames(n: Explainable): string[] {
  const names = [n.id.split(".").slice(1).join(".")];
  if (n.type !== "Rule") names.push(n.name);
  if (n.type === "Rule") names.push(n.key);
  if (n.type === "Concept") names.push(...(n.aliases ?? []));
  return names.filter(Boolean);
}

export class MetaKB {
  private static instance: MetaKB | undefined;
  nodes: MetaNode[];
  edges: GraphEdge[];
  byId: Map<string, MetaNode>;
  rules: Map<string, MetaRule>;
  steps: MetaStep[];
  version: string;

  constructor(dataDir = META_DIR) {
    this.nodes = JSON.parse(readFileSync(join(dataDir, "nodes.json"), "utf8"));
    this.edges = JSON.parse(readFileSync(join(dataDir, "edges.json"), "utf8"));
    this.byId = new Map(this.nodes.map((n) => [n.id, n]));
    this.rules = new Map(this.ofType("Rule").map((n) => [n.key, n]));
    this.steps = this.ofType("Step").sort((a, b) => a.order - b.order);
    this.version = this.node("metakb", "MetaKB").version;
  }

  static get(): MetaKB {
    MetaKB.instance ??= new MetaKB();
    return MetaKB.instance;
  }

  targets(id: string, type: string): string[] {
    return this.edges.filter((e) => e.from === id && e.type === type).map((e) => e.to);
  }

  sources(id: string, type: string): string[] {
    return this.edges.filter((e) => e.to === id && e.type === type).map((e) => e.from);
  }

  ofType<T extends MetaType>(type: T): MetaOf<T>[] {
    return this.nodes.filter((n): n is MetaOf<T> => n.type === type);
  }

  /** A node the build guarantees exists (meta-kb/build.ts checks referential integrity). */
  node<T extends MetaType>(id: string, type: T): MetaOf<T> {
    const n = this.byId.get(id);
    if (n?.type !== type) throw new Error(`meta-KB: expected ${type} '${id}'. Rebuild it with npm run build:meta.`);
    return n as MetaOf<T>;
  }

  rule(key: string): MetaRule {
    const r = this.rules.get(key);
    if (!r) throw new Error(`Unknown meta-KB rule: ${key}`);
    return r;
  }

  /** SourceLocations a node is grounded in (following Rule -> Rationale -> CITES). */
  citations(id: string): MetaLocation[] {
    let ids = [...this.targets(id, "CITES"), ...this.targets(id, "DEFINED_IN")];
    for (const rat of this.targets(id, "JUSTIFIED_BY")) ids = ids.concat(this.targets(rat, "CITES"));
    return ids.map((i) => this.byId.get(i)).filter((n) => n?.type === "SourceLocation");
  }

  citeLine(loc: MetaLocation): string {
    const src = this.byId.get(this.targets(loc.id, "PART_OF")[0]);
    const name = src?.type === "Source" ? (src.shortName ?? src.title) : "?";
    return `${name} ${loc.section}, p.${loc.page}`;
  }

  rationale(rule: MetaRule): string {
    const rat = this.targets(rule.id, "JUSTIFIED_BY")[0];
    return rat ? this.node(rat, "Rationale").explanation : "";
  }

  step(order: number): MetaStep | undefined {
    return this.steps.find((s) => s.order === order);
  }

  stepRules(order: number): MetaRule[] {
    const s = this.step(order);
    return s ? this.targets(s.id, "APPLIES").map((r) => this.node(r, "Rule")) : [];
  }

  formatRegistry(): { nodeTypes: Map<string, MetaNodeType>; edgeTypes: Map<string, MetaEdgeType> } {
    return {
      nodeTypes: new Map(this.ofType("NodeType").map((n) => [n.name, n])),
      edgeTypes: new Map(this.ofType("EdgeType").map((n) => [n.name, n])),
    };
  }

  /** What `okb explain <query>` refers to (best matches first). */
  resolve(query: string): Explainable[] {
    const q = query.trim();
    const rule = this.rules.get(q);
    if (rule) return [rule];
    const byId = this.byId.get(q);
    if (isExplainable(byId)) return [byId];
    const step = /^\d+$/.test(q) ? this.step(Number(q)) : undefined;
    if (step) return [step];
    const k = naming.key(q);
    if (!k) return [];
    const exact: Explainable[] = [];
    const partial: Explainable[] = [];
    for (const n of this.nodes) {
      if (!isExplainable(n)) continue;
      const keys = explainNames(n).flatMap((x) => [naming.key(x), ...x.split("/").map(naming.key)]);
      if (keys.includes(k)) exact.push(n);
      else if (keys.some((x) => x.includes(k))) partial.push(n);
    }
    return exact.length ? exact : partial;
  }

  search(text: string): Explainable[] {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const k = norm(text);
    return this.nodes.filter((n): n is Explainable => isExplainable(n) && norm(JSON.stringify(n)).includes(k));
  }
}
