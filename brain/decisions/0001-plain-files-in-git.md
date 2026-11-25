---
summary: Knowledge lives in plain JSON files in git, not in a database or a hosted service.
status: accepted
date: 2026-09-23
updated: 2026-11-22
links: [README.md, "Discussion #105"]
---

# 0001: Keep a KB in plain files in git

**Decision:** an ontology is a folder of plain files (`okb.json`, `nodes.json`, `edges.json`) that the user owns and keeps in git. okb checks the files; it doesn't host or store them.

**Why:** the user keeps control of their knowledge, and git gives a team review, history and merges for free. #105 lists a database, a hosted service and running a graph database as non-goals. A graph database is a place to load a KB (`okb export`), not where it lives.

**Weighed against:** a graph database as the store. That would need hosting and a query language, and changes couldn't be reviewed as PRs.

**Consequences:** merge-friendly layout, stable ids and a semantic diff matter (the Maintaining a KB milestone). How far files scale is an [open question](../open-questions.md#how-far-do-plain-files-scale).
