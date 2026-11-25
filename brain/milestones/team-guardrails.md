---
summary: Team guardrails, planned as 0.4.0. A team writes its own rules and tunes severities.
updated: 2026-11-24
links: ["https://github.com/alanbsmith/ontology-kit/milestone/8", "Discussion #105"]
---

# Team guardrails (0.4.0)

## Why

Goal 2 of [0021](../decisions/0021-one-point-zero-is-six-user-goals.md). Teams need rules beyond the meta-KB's ([0024](../decisions/0024-team-rule-packs-before-one-point-zero.md)), severity profiles with written reasons, a health report for a finished KB and okb deprecate.

## Why now

Discussion #105 puts it after Serving: competency questions with expected answers feed the health report, and real consumers show which guardrails teams need. Rule packs add to the file format, so they have to land before the format freeze.

## Done when

Spike #100 is answered first and decides declarative or code ([open question](../open-questions.md)). Then rule packs (#101), severity profiles (#102), the health report (#103) and `deprecate` (#104) are merged and released as 0.4.0.

## Log

- 2026-11-24: file written from the road-to-1-0 plan.
