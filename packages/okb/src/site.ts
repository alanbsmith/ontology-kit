/** Where the docs site lives, and the stable links into it. Defined once so the CLI never hard-codes a URL. */
export const SITE_URL = "https://ontology-kit.dev";

/** The anchor `src/gendocs.ts` writes for a meta-KB id: `rule.hier-no-cycles` → `rule-hier-no-cycles`. */
export const anchorId = (id: string): string => id.replace(/\./g, "-");

/** The Rules page entry that explains one rule, from its meta-KB id (`rule.<key>`). */
export const ruleUrl = (ruleId: string): string => `${SITE_URL}/reference/rules/#${anchorId(ruleId)}`;
