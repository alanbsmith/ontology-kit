---
summary: 0.3.0 Serving, 0.4.0 Team guardrails and cross-KB references, 0.5.0 Extraction, 0.6.0 Subject-matter experts, 0.7 and 0.8 soak, then 1.0.
status: proposed
decided-by: owner, on a recommendation
date: 2026-11-24
updated: 2026-11-25
links: ["milestones/road-to-1-0.md", "Discussion #105"]
---

# 0023: The versions on the road to 1.0

**Decision:** each milestone ships as one minor release, in this order: 0.3.0 Serving a KB, 0.4.0 Team guardrails with cross-KB references ([0027](0027-cross-kb-references-before-one-point-zero.md)), 0.5.0 Component docs extraction, 0.6.0 Subject-matter experts. Then 0.7.0 and 0.8.0 are the soak: no new features, only fixes, docs and an audit. Then 1.0.0. The rest of Linked knowledge bases (impact checks, combined export), Structured and generated sources and the second release of Approachable docs follow 1.0, except where a user goal needs a piece of them.

**Why:** Serving first, as #105 orders it, and also because it produces the reader's first consumer. Serving comes before Team guardrails for the reason #105 gives: competency questions with expected answers feed the health report. The owner chose "Serving first" over starting with extraction.

**Weighed:** starting with extraction (goal 1 is the core promise) and splitting competency-question work from the rest of extraction were offered. The owner chose the plan as written.

**Consequences:** the issue and milestone moves are drafted for the owner's review in [road-to-1-0.md](../milestones/road-to-1-0.md). Nothing on GitHub has changed.
