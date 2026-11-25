---
summary: Team guardrails, planned as 0.4.0. A team writes its own rules, tunes severities, and links KBs.
updated: 2026-11-25
links: ["https://github.com/alanbsmith/ontology-kit/milestone/8", "Discussion #105"]
---

# Team guardrails (0.4.0)

## Why

Goal 2 of [0021](../decisions/0021-one-point-zero-is-six-user-goals.md). Teams need rules beyond the meta-KB's ([0024](../decisions/0024-team-rule-packs-before-one-point-zero.md)), severity profiles with written reasons, a health report for a finished KB and deprecation in stages. Cross-KB references (#31) ride along, because the Canvas KB points at the tokens and icons KBs ([0027](../decisions/0027-cross-kb-references-before-one-point-zero.md)).

## Why now

Discussion #105 puts it after Serving: competency questions with expected answers feed the health report, and real consumers show which guardrails teams need. Rule packs and cross-KB references both add to the file format, which freezes after this release ([0026](../decisions/0026-road-to-one-point-zero-guardrails.md)).

## Done when

Spike #100 is answered first and decides declarative or code ([open question](../open-questions.md)). Then rule packs (#101), severity profiles (#102), the health report (#103), deprecation (#104) and cross-KB references (#31) are merged and released as 0.4.0.

## Log

- 2026-11-24: file written from the road-to-1-0 plan.
- 2026-11-25: cross-KB references (#31) added.
- 2026-11-25: milestone retitled with its version; #31 moved in.
