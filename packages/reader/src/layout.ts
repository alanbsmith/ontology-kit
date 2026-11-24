/**
 * The on-disk layout of an ontology folder (okb-lpg/3): `okb.json` plus `nodes.jsonl` and `edges.jsonl`,
 * one node or edge per line, sorted, with a fixed key order, so two branches that edit different nodes
 * touch different lines and `git merge` has nothing to conflict on. Older folders (`nodes.json` and
 * `edges.json`, each one JSON array) still load. Part of @ontology-kit/reader.
 */
import { existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { OkbError } from "./errors.ts";
import type { GraphEdge, OkbNode } from "./types.ts";

export const NODES_FILE = "nodes.jsonl";
export const EDGES_FILE = "edges.jsonl";
const LEGACY_NODES = "nodes.json";
const LEGACY_EDGES = "edges.json";

/** Compare ids so `cq.2` sorts before `cq.10` and the order is the same on every machine. */
export function compareNatural(a: string, b: string): number {
  const pa = a.split(/(\d+)/);
  const pb = b.split(/(\d+)/);
  for (let i = 0; i < Math.min(pa.length, pb.length); i++) {
    if (pa[i] === pb[i]) continue;
    if (i % 2 === 1) {
      const d = Number(pa[i]) - Number(pb[i]);
      if (d !== 0) return d;
    }
    return pa[i] < pb[i] ? -1 : 1;
  }
  return pa.length - pb.length;
}

/** JSON with every object's keys in a fixed order: `first` (those present), then the rest alphabetically. Arrays keep their order. */
function canonical(value: unknown, first: readonly string[] = []): unknown {
  if (Array.isArray(value)) return value.map((v) => canonical(v));
  if (value === null || typeof value !== "object") return value;
  const rec = value as Record<string, unknown>;
  const keys = Object.keys(rec).filter((k) => rec[k] !== undefined);
  const head = first.filter((k) => keys.includes(k));
  const tail = keys.filter((k) => !head.includes(k)).sort();
  return Object.fromEntries([...head, ...tail].map((k) => [k, canonical(rec[k])]));
}

export function nodeLine(n: OkbNode): string {
  return JSON.stringify(canonical(n, ["id", "type"]));
}

export function edgeLine(e: GraphEdge): string {
  return JSON.stringify(canonical(e, ["from", "type", "to"]));
}

/** The lines of nodes.jsonl: by id (a duplicated id keeps both, so validate can report it). */
export function nodeLines(nodes: readonly OkbNode[]): string[] {
  return nodes.map((n) => [n.id ?? "", nodeLine(n)] as const)
    .sort((a, b) => compareNatural(a[0], b[0]) || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0)).map((x) => x[1]);
}

/** The lines of edges.jsonl: by from, type, to, then the rest of the line. */
export function edgeLines(edges: readonly GraphEdge[]): string[] {
  return edges.map((e) => [e, edgeLine(e)] as const).sort((a, b) =>
    compareNatural(a[0].from, b[0].from) || compareNatural(a[0].type, b[0].type) || compareNatural(a[0].to, b[0].to) ||
    (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0)).map((x) => x[1]);
}

function parseLines<T>(text: string, file: string): T[] {
  const out: T[] = [];
  text.split("\n").forEach((line, i) => {
    if (!line.trim()) return;
    if (/^(<{7}|={7}|>{7})( |$)/.test(line)) {
      throw new OkbError(`${file} line ${i + 1} is a git merge conflict marker. Resolve the conflict (keep the lines you want from both sides, delete the markers), then run okb validate.`);
    }
    try {
      out.push(JSON.parse(line) as T);
    } catch {
      throw new OkbError(`${file} line ${i + 1} isn't valid JSON (each line holds one ${file.startsWith("nodes") ? "node" : "edge"}). If a merge left it like this, fix the line by hand.`);
    }
  });
  return out;
}

function readArray<T>(path: string, name: string): T[] {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T[];
  } catch (e) {
    if (e instanceof SyntaxError) throw new OkbError(`${name} isn't valid JSON: ${e.message}`);
    throw e;
  }
}

/** Read nodes and edges from either layout. Throws if a folder has both (a half-finished merge or migration). */
export function readGraph(root: string): { nodes: OkbNode[]; edges: GraphEdge[] } {
  const side = <T>(jsonl: string, legacy: string): T[] => {
    const a = join(root, jsonl);
    const b = join(root, legacy);
    if (existsSync(a) && existsSync(b)) {
      throw new OkbError(`Both ${jsonl} and ${legacy} exist. ${jsonl} is the current layout; if ${legacy} is left over from a merge, check it has nothing you need, then delete it.`);
    }
    if (existsSync(a)) return parseLines<T>(readFileSync(a, "utf8"), jsonl);
    if (existsSync(b)) return readArray<T>(b, legacy);
    return [];
  };
  return { nodes: side<OkbNode>(NODES_FILE, LEGACY_NODES), edges: side<GraphEdge>(EDGES_FILE, LEGACY_EDGES) };
}

/** Write the three files (each atomically, all temp files first) and remove the old-layout files. */
export function writeGraph(root: string, manifest: unknown, nodes: readonly OkbNode[], edges: readonly GraphEdge[]): void {
  const lines = (ls: string[]) => (ls.length ? ls.join("\n") + "\n" : "");
  const files: [string, string][] = [
    ["okb.json", JSON.stringify(manifest, null, 2) + "\n"],
    [NODES_FILE, lines(nodeLines(nodes))],
    [EDGES_FILE, lines(edgeLines(edges))],
  ];
  for (const [name, text] of files) writeFileSync(join(root, name + ".tmp"), text, "utf8");
  for (const [name] of files) renameSync(join(root, name + ".tmp"), join(root, name));
  for (const old of [LEGACY_NODES, LEGACY_EDGES]) if (existsSync(join(root, old))) unlinkSync(join(root, old));
}
