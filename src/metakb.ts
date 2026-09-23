/** Read access to the compiled meta-KB (meta-kb/data/*.json). */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as naming from "./naming.ts";
import type { GraphEdge, GraphNode } from "./types.ts";

export const META_DIR = join(dirname(dirname(fileURLToPath(import.meta.url))), "meta-kb", "data");

const EXPLAINABLE = new Set(["Concept", "Principle", "Decision", "Step", "Rule"]);

export class MetaKB {
  private static instance: MetaKB | undefined;
  nodes: GraphNode[];
  edges: GraphEdge[];
  byId: Map<string, GraphNode>;
  rules: Map<string, GraphNode>;
  steps: GraphNode[];
  version: string;

  constructor(dataDir = META_DIR) {
    this.nodes = JSON.parse(readFileSync(join(dataDir, "nodes.json"), "utf8"));
    this.edges = JSON.parse(readFileSync(join(dataDir, "edges.json"), "utf8"));
    this.byId = new Map(this.nodes.map((n) => [n.id, n]));
    this.rules = new Map(this.nodes.filter((n) => n.type === "Rule").map((n) => [n.key, n]));
    this.steps = this.nodes.filter((n) => n.type === "Step").sort((a, b) => a.order - b.order);
    this.version = this.byId.get("metakb")!.version;
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

  ofType(type: string): GraphNode[] {
    return this.nodes.filter((n) => n.type === type);
  }

  rule(key: string): GraphNode {
    const r = this.rules.get(key);
    if (!r) throw new Error(`Unknown meta-KB rule: ${key}`);
    return r;
  }

  /** SourceLocations a node is grounded in (following Rule -> Rationale -> CITES). */
  citations(id: string): GraphNode[] {
    let ids = [...this.targets(id, "CITES"), ...this.targets(id, "DEFINED_IN")];
    for (const rat of this.targets(id, "JUSTIFIED_BY")) ids = ids.concat(this.targets(rat, "CITES"));
    return ids.map((i) => this.byId.get(i)!).filter(Boolean);
  }

  citeLine(loc: GraphNode): string {
    const src = this.byId.get(this.targets(loc.id, "PART_OF")[0]);
    return `${src?.shortName ?? src?.title ?? "?"} ${loc.section}, p.${loc.page}`;
  }

  rationale(rule: GraphNode): string {
    const rat = this.targets(rule.id, "JUSTIFIED_BY")[0];
    return rat ? this.byId.get(rat)!.explanation : "";
  }

  step(order: number): GraphNode | undefined {
    return this.steps.find((s) => s.order === order);
  }

  stepRules(order: number): GraphNode[] {
    const s = this.step(order);
    return s ? this.targets(s.id, "APPLIES").map((r) => this.byId.get(r)!) : [];
  }

  formatRegistry(): { nodeTypes: Map<string, GraphNode>; edgeTypes: Map<string, GraphNode> } {
    return {
      nodeTypes: new Map(this.ofType("NodeType").map((n) => [n.name, n])),
      edgeTypes: new Map(this.ofType("EdgeType").map((n) => [n.name, n])),
    };
  }

  /** What `okb explain <query>` refers to (best matches first). */
  resolve(query: string): GraphNode[] {
    const q = query.trim();
    if (this.rules.has(q)) return [this.rules.get(q)!];
    if (this.byId.has(q) && EXPLAINABLE.has(this.byId.get(q)!.type)) return [this.byId.get(q)!];
    if (/^\d+$/.test(q) && this.step(Number(q))) return [this.step(Number(q))!];
    const k = naming.key(q);
    if (!k) return [];
    const exact: GraphNode[] = [];
    const partial: GraphNode[] = [];
    for (const n of this.nodes) {
      if (!EXPLAINABLE.has(n.type)) continue;
      const names: string[] = [n.name, n.key, n.id.split(".").slice(1).join("."), ...(n.aliases ?? [])].filter(Boolean);
      const keys = names.flatMap((x) => [naming.key(x), ...x.split("/").map(naming.key)]);
      if (keys.includes(k)) exact.push(n);
      else if (keys.some((x) => x.includes(k))) partial.push(n);
    }
    return exact.length ? exact : partial;
  }

  search(text: string): GraphNode[] {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const k = norm(text);
    return this.nodes.filter((n) => EXPLAINABLE.has(n.type) && norm(JSON.stringify(n)).includes(k));
  }
}
