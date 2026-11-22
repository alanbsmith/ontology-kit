/**
 * The graphs the docs can embed, by name. `src="/data/espresso.json"` in an `<okb-graph>` is served by
 * `pages/data/[name].json.ts`, which calls `loadGraph`. Plain TypeScript on node:fs, so
 * `tests/site.test.ts` can check every page's `src` against `graphNames`.
 *
 * Names: `espresso`, `wine`, `meta-kb`, and `wine-step-N`, the wine ontology after tutorial step N.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { RawGraph } from "./model.ts";

// The okb package (the example ontologies and the meta-KB data), relative to the repo root.
const PKG = "packages/okb";
const WINE_SNAPSHOTS = `${PKG}/examples/wine/tutorial/graph`;

const readJson = <T>(root: string, path: string): T => JSON.parse(readFileSync(join(root, path), "utf8")) as T;

/** Every name `/data/<name>.json` serves, given the repo root. */
export function graphNames(root: string): string[] {
  const dir = join(root, WINE_SNAPSHOTS);
  const steps = existsSync(dir)
    ? readdirSync(dir)
        .map((f) => /^step-(\d+)\.json$/.exec(f)?.[1])
        .filter((n): n is string => !!n)
        .sort((a, b) => Number(a) - Number(b))
        .map((n) => `wine-step-${n}`)
    : [];
  return ["espresso", "wine", ...steps, "meta-kb"];
}

/** The nodes and edges behind a name. Throws on a name `graphNames` doesn't list. */
export function loadGraph(root: string, name: string): RawGraph {
  const step = /^wine-step-(\d+)$/.exec(name)?.[1];
  if (step) {
    const snap = readJson<{ nodes: RawGraph["nodes"]; edges: RawGraph["edges"] }>(root, `${WINE_SNAPSHOTS}/step-${step}.json`);
    return { nodes: snap.nodes, edges: snap.edges };
  }
  const dir = name === "meta-kb" ? `${PKG}/meta-kb/data` : name === "espresso" || name === "wine" ? `${PKG}/examples/${name}` : undefined;
  if (!dir) throw new Error(`No graph named ${name}`);
  if (name === "meta-kb") return { nodes: readJson(root, `${dir}/nodes.json`), edges: readJson(root, `${dir}/edges.json`) };
  // The example ontologies are okb folders: one node or edge per line.
  const lines = (file: string) => readFileSync(join(root, dir, file), "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
  return { nodes: lines("nodes.jsonl"), edges: lines("edges.jsonl") };
}
