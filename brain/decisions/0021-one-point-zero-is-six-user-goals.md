---
summary: 1.0 is defined by six things anyone can do, not by a list of milestones.
status: accepted
decided-by: owner
date: 2026-11-24
updated: 2026-11-25
links: ["Discussion #105", "milestones/road-to-1-0.md"]
---

# 0021: 1.0 is six user goals

**Decision:** the road to 1.0 is centered on what anyone can do with the kit, in the owner's words:

1. Build an ontology backed by their source documents that answers their competency questions.
2. Maintain a KB with confidence: the tools make updating it approachable and reliable, and a team can write its own rules beyond the meta-KB's.
3. Document a KB so anyone who uses it, often subject-matter experts who know the domain but not graphs, can understand it and integrate with it.
4. Export a KB in a form a graph database can bulk import. okb doesn't run the load. The docs show how to write a loader.
5. Give humans and agents what they need to query a KB in production.
6. Have a KB ready to plug into an agent eval harness.

Milestones are ordered by these goals. A milestone that serves none of them moves after 1.0.

**Why:** the owner wanted the goal centered on users, not on the milestone list. The owner's first draft had seven goals. Two of them, "tools for ETL into a graph database" and "export to your graph database", turned out to be one: a bulk-import-ready export. That matches the non-goals in #105: loading is the team's job.

**Weighed:** a reading of "ETL" as importing source data into the KB (bulk import from structured data) was offered and not chosen. That work stays in the Structured and generated sources milestone, after 1.0.

**Consequences:** goal 6 (eval harness) isn't on the board yet. How humans query in production (goal 5) is [open](../open-questions.md).
