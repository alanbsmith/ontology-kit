/**
 * Progress through the method. Each Step in the meta-KB lists `doneWhen` items;
 * the ones with a `check` key are evaluated here (meta-kb/build.ts verifies every
 * key exists). Items without a check are judgment calls, shown as "ask yourself".
 */
import { MIN_COMPETENCY_QUESTIONS, runChecks } from "./checks.ts";
import { MetaKB } from "./metakb.ts";
import type { Ontology } from "./model.ts";
import type { Finding } from "./types.ts";

type StepCheck = (ont: Ontology, all: Finding[]) => boolean;

/** Step 3's brainstorm should reach this many terms before sorting them into classes and slots. */
const MIN_TERMS = 10;
const noErrors = (all: Finding[]) => !all.some((f) => f.severity === "error");

/**
 * "No errors in this part yet": no errors from the rules the meta-KB applies at
 * these steps, or from the file's structure (struct-well-formed breaks every step).
 */
function noErrorsFrom(steps: number[]): StepCheck {
  return (_o, all) => {
    const meta = MetaKB.get();
    const rules = new Set(["struct-well-formed", ...steps.flatMap((s) => meta.stepRules(s).map((r) => r.key))]);
    return noErrors(all.filter((f) => rules.has(f.rule)));
  };
}

export const STEP_CHECKS: Record<string, StepCheck> = {
  scope_domain_purpose: (o) => Boolean(o.meta.domain && o.meta.purpose),
  scope_users: (o) => (o.meta.users ?? []).length > 0,
  cq_min3: (o) => o.ofType("CompetencyQuestion").length >= MIN_COMPETENCY_QUESTIONS,
  scope_out: (o) => (o.meta.outOfScope ?? []).length > 0,
  reuse_reviewed: (o) => Boolean(o.meta.reuseReviewed) || o.ofType("ReusedOntology").length > 0,
  terms_min10: (o) => o.ofType("Term").length >= MIN_TERMS,
  convention_set: (o) => Boolean(o.conventions),
  classes_min2_with_isa: (o) => o.ofType("Class").length >= 2 && o.edgesOf("IS_A").length >= 1,
  no_errors_hierarchy: noErrorsFrom([4]),
  slots_min1: (o) => o.ofType("Slot").length >= 1,
  slots_attached: (o) => o.ofType("Slot").every((s) => o.domain(s.id).length > 0),
  slots_faceted: (o) => o.ofType("Slot").length > 0 && o.ofType("Slot").every((s) => s.valueType && s.cardinality),
  no_errors_slots: noErrorsFrom([5, 6]),
  instances_min3: (o) => o.ofType("Instance").length >= 3,
  no_errors_instances: noErrorsFrom([7]),
  cq_all_linked: (o) => {
    const qs = o.ofType("CompetencyQuestion");
    return qs.length > 0 && qs.every((q) => o.targets(q.id, "NEEDS").length > 0);
  },
  no_errors: (_o, all) => noErrors(all),
  warnings_explained: (_o, all) => !all.some((f) => f.severity === "warning" && !f.explainedBy),
};

export interface StepStatus {
  order: number;
  name: string;
  items: { text: string; done: boolean | null }[]; // null = judgment item, not checkable
  complete: boolean;
}

export function computeStatus(ont: Ontology, all?: Finding[]): { steps: StepStatus[]; suggested: number } {
  const meta = MetaKB.get();
  const findings = all ?? runChecks(ont, { all: true }).findings;
  const steps = meta.steps.map((s) => {
    const items = (s.doneWhen as { text: string; check?: string }[]).map((d) => ({
      text: d.text,
      done: d.check ? STEP_CHECKS[d.check](ont, findings) : null,
    }));
    return { order: s.order, name: s.name, items, complete: items.every((i) => i.done !== false) };
  });
  const firstOpen = steps.find((s) => !s.complete);
  return { steps, suggested: firstOpen ? firstOpen.order : steps.length };
}
