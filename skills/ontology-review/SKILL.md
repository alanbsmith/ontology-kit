---
name: ontology-review
description: Review an ontology built with ontology-kit (okb) against the Ontology 101 rules, especially the judgment rules a script can't check, and give plain-language, source-cited findings with exact okb fix commands.
---

# Ontology review

Give an okb ontology a second opinion. `okb validate` already covers the mechanical rules. The value of this review is in the rules **only a person can judge** (is this really a kind-of? are these siblings equally general? should this class be a slot value?) and in **double-checking heuristic findings**, which can be false positives. The reader may be a beginner, so every finding must be understandable without prior ontology knowledge.

## 1. Gather

1. Find okb: `okb version`, or `node <ontology-kit>/src/cli.ts`. Node 24+.
2. In the ontology folder, collect:
   - `okb status --json`: the step they're on and what's complete
   - `okb validate --all --json`: mechanical and heuristic findings
   - `okb review --all --json`: the judgment rules with their review questions, plus the class hierarchy, scope and design decisions
   - `okb cq list --json`, `okb tree`, and `okb show <Class>` for any class you need to look at closely
3. Read the design decisions first. Anything already explained there is a closed question, unless the explanation itself looks wrong.

If this review is high-stakes (going into a shared repo or production), do steps 2–3 in a **separate subagent** that hasn't seen how the ontology was built, so the review isn't grading its own work. Pass it the JSON above and this skill's instructions.

## 2. Review

Work through each judgment rule from `okb review` against the actual ontology. Use the rule's `question`, and for anything non-obvious read the full rule and its source quote with `okb explain <rule-id>`. For each rule, either name specific nodes that violate it, with your reasoning, or say plainly that nothing does.

| Rule | What to look at |
|---|---|
| `hier-is-a-means-kind-of` | Every IS_A edge: "Every <child> is, by definition, a <parent>." Watch for part-of, made-by, role, "usually". |
| `hier-siblings-same-generality` | Each parent with 2+ children: is one child a kind of another? Would an expert put them on the same level? Is the parent mixing classification axes (region vs. grape variety)? |
| `hier-no-subclass-per-restriction` | Classes that only fix one slot value. Could they just be that value? |
| `hier-class-or-value` | Walk `okb explain decision.class-or-value` on suspicious classes *and* on enumerated values that might deserve to be classes. |
| `hier-stable-membership` | Classes that instances would move in and out of (status, state, location). |
| `inst-natural-hierarchy-as-classes` | Instances that contain other instances in the domain. |
| `inst-granularity` | Are instances at the level of the things the competency questions ask about? |
| `slot-domain-fits-all` | For each slot, every class that inherits it: does each really have this property? |
| `reuse-considered` | Did they actually look for an existing vocabulary, standard or internal glossary? |
| `doc-record-decisions` | Multiple inheritance, terminological classes, --force'd names, deliberate omissions: is each recorded? |

Then double-check every **heuristic** finding from `okb validate`. Say whether it's a real problem or a false positive (e.g. "Sauternes" isn't a plural). A false positive should be recorded with `okb decision add ... --waives <rule-id>`.

Also check scope: does each competency question have what it needs (`scope-cq-coverage`)? Is there content no question needs (`scope-no-unneeded`)?

## 3. Report

Lead with a one-paragraph verdict: is it sound enough to use for its stated purpose, and what's the single most important fix?

Then group findings:

1. **Must fix**: violations of MUST rules (validator errors and judgment MUST rules).
2. **Should fix or explain**: SHOULD rules. For each, either a fix or a design decision to record.
3. **Worth considering**: hints and softer observations.
4. **Looks good**: what's well done, briefly and specifically.

Each finding has:
- **What** is wrong, naming the classes/slots involved, in plain words;
- **Why** it matters, in one sentence, with the rule id and source (e.g. `hier-siblings-same-generality`, Ontology 101 §4.2, p.14);
- **Fix**: the exact okb command(s), or the `okb decision add ...` that records why it's fine as is.

Keep the number of findings proportionate: consolidate repeats ("these 6 classes add nothing to their parents") rather than listing each. Where the right answer depends on the user's intent, say so and ask; don't pick for them (`principle.no-single-correct-model`).

## 4. Apply (only with consent)

Don't change the ontology unless the user asks you to. When they do, run the fix commands one group at a time, re-run `okb validate --all` after each group, and record any decision they make with `okb decision add`.
