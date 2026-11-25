---
summary: Six guardrails protect the road to 1.0, from a format freeze after 0.4.0 to a second real KB.
status: accepted
decided-by: owner, on a recommendation
date: 2026-11-25
updated: 2026-11-25
links: ["milestones/road-to-1-0.md", "0014-rename-format-package-to-reader.md"]
---

# 0026: Guardrails on the road to 1.0

**Decision:** the plan follows six guardrails:

1. The file format freezes after 0.4.0. Each of 0.3.0 and 0.4.0 settles its format changes in its first issue. 0.5.0 and 0.6.0 add commands but no format.
2. CI builds `@ontology-kit/mcp` against the packed reader tarball, so the outside-tool condition can't pass through workspace imports of internals.
3. Every package name is settled before its first publish.
4. Snapshot tests pin the `--json` shapes before the soak, and the CLI command-table refactor (#8) lands at the start of 0.3.0.
5. A written feature freeze follows 0.6.0.
6. A second real KB is built before 1.0 (nice to have, not a blocker). The tokens and icons KBs are the candidates ([0027](0027-cross-kb-references-before-one-point-zero.md)).

**Why:** the planning session raised them as risks to the order, and the owner agreed with all six. Each answers one risk: late format additions, a reader consumer that lives in the repo, a second package rename like [0014](0014-rename-format-package-to-reader.md), output changes that reset the soak, features that keep resetting it, and extraction guidance resting on one KB.
