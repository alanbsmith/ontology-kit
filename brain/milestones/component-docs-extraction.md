---
summary: Component docs extraction, planned as 0.5.0. Building KBs from sources works at real scale, for more than one kind of KB.
updated: 2026-11-25
links: ["https://github.com/alanbsmith/ontology-kit/milestone/1", "Discussion #105"]
---

# Component docs extraction (0.5.0)

## Why

Goal 1 of [0021](../decisions/0021-one-point-zero-is-six-user-goals.md): a KB backed by its source documents. Discussion #105: an extraction ledger, coverage, verification calibration and modeling guidance from the first real KB, built from Canvas Kit's component docs. The tokens and icons spikes (#23, #24) join it to test different kinds of KB with different constraints ([0027](../decisions/0027-cross-kb-references-before-one-point-zero.md)), and a spike (#161) adds open sources to the meta-KB beside Ontology 101 ([0028](../decisions/0028-sources-beyond-ontology-101.md)).

## Why now

It follows the first two milestones in the owner's order. The owner chose Serving first over starting here ([0023](../decisions/0023-version-map-to-one-point-zero.md)).

## Done when

The milestone's issues are merged and released as 0.5.0, except #8 (CLI command-table refactor), which moves to Serving. This milestone adds commands and meta-KB rules but no file-format changes ([0026](../decisions/0026-road-to-one-point-zero-guardrails.md)). If the tokens KB needs JSON or YAML citations (#26), that is a format change and has to come earlier ([open question](../open-questions.md)).

## Log

- 2026-11-24: file written from the road-to-1-0 plan.
- 2026-11-25: tokens and icons spikes and the sources spike added.
- 2026-11-25: milestone retitled with its version; #23 and #24 moved in, #161 created, #8 moved to Serving.
