/**
 * `okb review`: turns each judgment-only rule into concrete questions about THIS
 * ontology (its actual is-a links, sibling groups, slots...) and flags likely
 * problems with simple name-based hints. A person, or the ontology-review skill,
 * answers the questions; nothing here is enforced.
 */
import { MetaKB } from "./metakb.ts";
import type { Ontology } from "./model.ts";
import * as naming from "./naming.ts";

export interface ReviewItem {
  rule: string;
  modality: string;
  question: string;
  source?: string;
  prompts: string[]; // specific questions about this ontology
  flags: string[]; // likely problems spotted by name heuristics
}

const PART_WORDS = new Set(["part", "section", "chapter", "page", "component", "piece", "member", "step", "segment", "module", "element", "unit", "room", "wheel", "door"]);
const STATE_WORDS = new Set(["available", "unavailable", "active", "inactive", "current", "pending", "new", "old", "chilled", "open", "closed", "archived", "draft", "published", "deprecated", "temporary", "selected", "checked", "overdue", "borrowed", "sold", "expired", "popular", "featured"]);

export function buildReview(ont: Ontology, all = false): ReviewItem[] {
  const meta = MetaKB.get();
  const L = (id: string) => ont.label(id);
  const classes = ont.ofType("Class");
  const items: ReviewItem[] = [];
  for (const r of meta.ofType("Rule")) {
    if (r.check !== "judgment") continue;
    const prompts: string[] = [];
    const flags: string[] = [];
    switch (r.key) {
      case "hier-is-a-means-kind-of":
        for (const e of ont.edgesOf("IS_A")) {
          prompts.push(`Every ${L(e.from)} is, by definition, ${naming.convert(L(e.to), "lower case").match(/^[aeiou]/) ? "an" : "a"} ${L(e.to)}?`);
          if (naming.tokens(L(e.from)).some((t) => PART_WORDS.has(t))) flags.push(`${L(e.from)} sounds like a PART of ${L(e.to)}, not a kind of it. Consider a slot (e.g. partOf) instead of is-a.`);
        }
        break;
      case "hier-siblings-same-generality":
        for (const p of classes) {
          const kids = ont.children(p.id);
          if (kids.length < 2) continue;
          prompts.push(`${L(p.id)} → ${kids.map(L).join(", ")}: equally general? Is any one a kind of another?`);
          for (const a of kids) for (const b of kids) {
            if (a !== b && naming.key(L(a)).length < naming.key(L(b)).length && naming.key(L(b)).includes(naming.key(L(a)))) {
              flags.push(`${L(b)} contains the name of its sibling ${L(a)}. Should it be under ${L(a)}?`);
            }
          }
        }
        break;
      case "hier-no-subclass-per-restriction":
      case "hier-class-or-value": {
        if (r.key === "hier-class-or-value") {
          const enumVals = new Map<string, string>();
          for (const s of ont.ofType("Slot")) for (const v of s.allowedValues ?? []) enumVals.set(naming.key(v), s.name);
          for (const c of classes) {
            const slotName = enumVals.get(naming.key(c.name));
            if (slotName) flags.push(`'${c.name}' is both a class and an allowed value of the slot ${slotName}. Model it one way, not both (okb explain decision.class-or-value).`);
          }
        }
        for (const c of classes) {
          if (!ont.parents(c.id).length) continue;
          const own = ont.ownSlots(c.id).length + Object.keys(c.facetOverrides ?? {}).length + ont.linkedSlots(c.id).length;
          const fixed = Object.entries(c.fixedValues ?? {});
          if (own === 0 && fixed.length === 1 && r.key === "hier-no-subclass-per-restriction") {
            const [[slot, value]] = fixed;
            prompts.push(`${c.name} differs from its parent only by ${L(slot)} = ${JSON.stringify(value)}. Is it a real kind of thing experts distinguish, or just that value?`);
          }
        }
        if (r.key === "hier-class-or-value" && !flags.length) prompts.push("Walk decision.class-or-value on any class that feels like 'just a value', and on any enumerated value that feels like 'a different kind of thing'.");
        break;
      }
      case "hier-stable-membership":
        for (const c of classes) {
          const hit = naming.tokens(c.name).find((t) => STATE_WORDS.has(t));
          if (hit) flags.push(`${c.name} looks like a state ('${hit}') that instances move in and out of. Consider a Boolean or Enumerated slot instead.`);
        }
        prompts.push("For each class: could one particular instance leave it and come back later?");
        break;
      case "inst-natural-hierarchy-as-classes":
        for (const s of ont.ofType("Slot").filter((s) => s.valueType === "Instance")) {
          const dom = ont.domain(s.id);
          if (ont.range(s.id).some((r) => dom.some((d) => ont.isSub(r, d) || ont.isSub(d, r)))) {
            prompts.push(`Slot ${s.name} links ${ont.range(s.id).map(L).join("/")} instances to each other. If it expresses 'inside of' / 'kind of', those things may be a hierarchy and should be classes.`);
          }
        }
        prompts.push("Are any instances 'inside' other instances in the domain (regions, org units, categories)?");
        break;
      case "inst-granularity": {
        const withInst = classes.filter((c) => ont.sources(c.id, "INSTANCE_OF").length);
        prompts.push(`Instances currently live under: ${withInst.map((c) => c.name).join(", ") || "(none yet)"}. Are these the things your competency questions ask about?`);
        break;
      }
      case "slot-domain-fits-all":
        for (const s of ont.ofType("Slot")) {
          const covered = new Set<string>();
          for (const d of ont.domain(s.id)) {
            covered.add(d);
            for (const x of ont.descendants(d)) covered.add(x);
          }
          if (covered.size > 1) prompts.push(`${s.name} applies to ${[...covered].map(L).join(", ")}. Does every one of these really have it?`);
        }
        break;
      case "doc-record-decisions": {
        const decided = new Set(ont.edgesOf("ABOUT").map((e) => e.to));
        const multi = classes.filter((c) => ont.parents(c.id).length > 1 && !decided.has(c.id));
        const term = classes.filter((c) => c.terminological && !decided.has(c.id) && !ont.ancestors(c.id).size);
        const outTerms = ont.ofType("Term").filter((t) => t.disposition === "out-of-scope" && !t.note && !decided.has(t.id));
        if (multi.length) flags.push(`Multiple inheritance without a recorded reason: ${multi.map((c) => c.name).join(", ")}.`);
        if (term.length) flags.push(`Terminological classes without a recorded reason: ${term.map((c) => c.name).join(", ")}.`);
        if (outTerms.length) flags.push(`Terms left out of scope with no note: ${outTerms.map((t) => t.text).join(", ")}.`);
        prompts.push("What would surprise someone reusing this ontology for a different purpose? Is each of those choices recorded?");
        break;
      }
      default:
        break;
    }
    // Rules for later steps are shown early only when there's something concrete to look at.
    if (!all && r.fromStep > ont.step && !flags.length && !prompts.some((p) => !p.startsWith("For each") && !p.startsWith("Are any") && !p.startsWith("What would") && !p.startsWith("Walk ") && !p.startsWith("Instances currently"))) continue;
    items.push({
      rule: r.key, modality: r.modality, question: r.review,
      source: meta.citations(r.id).map((l) => meta.citeLine(l))[0], prompts, flags,
    });
  }
  return items;
}
