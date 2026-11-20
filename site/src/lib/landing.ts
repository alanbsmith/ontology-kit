/**
 * What the landing page (`pages/index.astro`) reads at build time, as plain TypeScript on node:fs so
 * `tests/site.test.ts` can check it: the rule counts from the meta-KB and the internal links the
 * page offers. Nothing here is typed by hand except the links.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Every internal link on the landing page. A test checks that each one is a real route. */
export const LANDING_LINKS = {
  start: "/getting-started/quickstart/",
  learn: "/learn/knowledge-graphs/",
  tutorial: "/getting-started/tutorial/wine-ontology/",
  espresso: "/getting-started/tutorial/espresso-ontology/",
  contributing: "/contributing/",
} as const;

export interface RuleCounts {
  total: number;
  /** Grounded in the paper: the source states the rule (`direct`) or it follows from a definition (`interpretive`). */
  grounded: number;
  /** A toolkit convention with no source (`operational`). */
  conventions: number;
  errors: number;
  warnings: number;
  hints: number;
}

interface RuleNode {
  type: string;
  basis?: string;
  severity?: string;
}

/** Counts from the compiled meta-KB, so a new rule changes the page with no edit here. */
export function ruleCounts(root: string): RuleCounts {
  const nodes: RuleNode[] = JSON.parse(readFileSync(join(root, "meta-kb/data/nodes.json"), "utf8"));
  const rules = nodes.filter((n) => n.type === "Rule");
  const n = (f: (r: RuleNode) => boolean) => rules.filter(f).length;
  return {
    total: rules.length,
    grounded: n((r) => r.basis === "direct" || r.basis === "interpretive"),
    conventions: n((r) => r.basis === "operational"),
    errors: n((r) => r.severity === "error"),
    warnings: n((r) => r.severity === "warning"),
    hints: n((r) => r.severity === "info"),
  };
}
