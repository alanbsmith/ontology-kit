/**
 * `okb check`: the one answer to "is this KB safe to merge?". It reads the folder and never writes it
 * or takes the lock. Each check is one entry in CHECK_STEPS; to add a check (the ledger check, `okb cq check`),
 * add an entry and, if it handles a rule that `validate` also reports, list the rule in its `rules`.
 */
import type { Ontology } from "@ontology-kit/format";
import { loadSourcePages, runChecks, type CheckContext } from "./checks.ts";
import type { Finding } from "./types.ts";

export type StepStatus = "pass" | "warn" | "fail";

export interface StepResult {
  id: string;
  title: string;
  status: StepStatus;
  /** One line saying what was found, for the summary. */
  summary: string;
  /** What a reviewer should look at, one entry per problem. */
  problems: string[];
}

export interface CheckInput {
  ont: Ontology;
  /** The report of `validate --all` (nothing hidden). */
  findings: Finding[];
  /** The okb version running this check. */
  installed: string;
}

export interface CheckStep {
  id: string;
  title: string;
  /** Rules this step reports. `validation` leaves them out so a problem shows once. */
  rules?: string[];
  run(input: CheckInput): Omit<StepResult, "id" | "title">;
}

const open = (fs: Finding[]) => fs.filter((f) => !f.explainedBy);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Compare `a.b.c[-pre]` versions: negative when `a` is older than `b`. Returns null for text that isn't a version. */
export function compareVersions(a: string, b: string): number | null {
  const parse = (v: string) => /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+.*)?$/.exec(v.trim());
  const pa = parse(a), pb = parse(b);
  if (!pa || !pb) return null;
  for (let i = 1; i <= 3; i++) if (Number(pa[i]) !== Number(pb[i])) return Number(pa[i]) - Number(pb[i]);
  if (pa[4] === pb[4]) return 0;
  if (!pa[4]) return 1; // a release is newer than its prerelease
  if (!pb[4]) return -1;
  return pa[4] < pb[4] ? -1 : 1;
}

const QUOTE_RULES = ["prov-quote-current"];
const VERIFY_RULES = ["prov-verified", "prov-cites-quote"];

/** The checks, in the order they're reported. */
export const CHECK_STEPS: CheckStep[] = [
  {
    id: "validate",
    title: "Validation (okb validate --all)",
    run({ findings }) {
      const claimed = new Set(CHECK_STEPS.flatMap((s) => s.rules ?? []));
      const mine = open(findings).filter((f) => !claimed.has(f.rule));
      const errors = mine.filter((f) => f.severity === "error");
      const warnings = mine.filter((f) => f.severity === "warning").length;
      const tail = warnings ? ` (${plural(warnings, "warning")} don't block a merge; okb validate --all lists them)` : "";
      return errors.length
        ? { status: "fail", summary: `${plural(errors.length, "error")}${tail}`, problems: errors.map((f) => `${f.rule}: ${f.message}`) }
        : { status: "pass", summary: `no errors${tail}`, problems: [] };
    },
  },
  {
    id: "quotes",
    title: "Quotes are still in their sources",
    rules: QUOTE_RULES,
    run({ ont, findings }) {
      // A quote that can't be checked fails too: in CI a missing source file means the check proved nothing.
      const bad = open(findings).filter((f) => QUOTE_RULES.includes(f.rule));
      const unchecked = ont.ofType("Source").filter((s) => !s.localPath && ont.sources(s.id, "PART_OF").some((i) => ont.get(i)?.type === "SourceLocation")).length;
      const note = unchecked ? ` (${plural(unchecked, "source")} with quotes has no localPath, so its quotes weren't checked)` : "";
      return bad.length
        ? { status: "fail", summary: `${plural(bad.length, "quote")} can't be matched${note}`, problems: bad.map((f) => f.message) }
        : { status: unchecked ? "warn" : "pass", summary: `every checked quote is still in its source${note}`, problems: [] };
    },
  },
  {
    id: "verification",
    title: "Rules and extracted facts are verified",
    rules: VERIFY_RULES,
    run({ findings }) {
      const bad = open(findings).filter((f) => VERIFY_RULES.includes(f.rule));
      return bad.length
        ? { status: "fail", summary: `${plural(bad.length, "problem")}: something unverified, not supported by its quote, or without a quote`, problems: bad.map((f) => f.message) }
        : { status: "pass", summary: "nothing is unverified, unsupported or waiting for approval", problems: [] };
    },
  },
  {
    id: "okb-version",
    title: "okb version",
    run({ ont, installed }) {
      const pinned = ont.manifest.okbVersion;
      if (!pinned) return { status: "pass", summary: `installed ${installed}; the KB pins no version (okbVersion in okb.json)`, problems: [] };
      const cmp = compareVersions(installed, pinned);
      if (cmp === null) return { status: "warn", summary: `okbVersion '${pinned}' in okb.json isn't a version like 1.2.3`, problems: [] };
      return cmp < 0
        ? { status: "warn", summary: `installed ${installed} is older than the ${pinned} this KB pins; install ${pinned} or newer (npm i -g @ontology-kit/okb@${pinned})`, problems: [] }
        : { status: "pass", summary: `installed ${installed}, pinned ${pinned}`, problems: [] };
    },
  },
];

export interface CheckReport {
  ok: boolean;
  installed: string;
  pinned: string | null;
  steps: StepResult[];
}

/** Run every check. Reads the folder and its source files; writes nothing. */
export async function runCheck(ont: Ontology, installed: string): Promise<CheckReport> {
  const ctx: CheckContext = { pages: await loadSourcePages(ont) };
  const { findings } = runChecks(ont, { all: true }, ctx);
  const steps = CHECK_STEPS.map((s) => ({ id: s.id, title: s.title, ...s.run({ ont, findings, installed }) }));
  return { ok: steps.every((s) => s.status !== "fail"), installed, pinned: ont.manifest.okbVersion ?? null, steps };
}
