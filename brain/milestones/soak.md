---
summary: The soak, planned as 0.7.0 and 0.8.0. No new features; the CLI proves it is stable.
updated: 2026-11-24
links: ["CONTRIBUTING.md#what-0x-means"]
---

# Soak (0.7.0 and 0.8.0)

## Why

"Stable CLI" is a 1.0 condition and needs time without renames ([0022](../decisions/0022-one-point-zero-conditions-and-the-soak.md)). The owner's rule: two minor releases with no breaking change, and the ability to ship a release candidate whenever wanted. There is no GitHub milestone for this yet.

## Why now

It follows the last feature milestone (0.6.0). Starting it earlier would let features reset the clock.

## Done when

0.7.0 and 0.8.0 are released through the workflow with no breaking CLI change, the docs and skills describe every command, flag and `--json` shape, the format upgrade path is documented, and `@ontology-kit/mcp` has needed no breaking reader change. Candidates for the work: the usability test of the docs (#46) and the CLI and docs audit.

## Log

- 2026-11-24: file written from the road-to-1-0 plan.
