---
summary: An ontology saves nodes.jsonl and edges.jsonl, one sorted line per node or edge, so git merges cleanly.
status: accepted
date: 2026-11-21
updated: 2026-11-24
links: ["#140", "commit c3663c9", "docs/FORMAT.md"]
---

# 0012: One node or edge per line (`okb-lpg/3`)

**Decision:** a folder saves `nodes.jsonl` and `edges.jsonl`, sorted by id with a fixed key order. Every command that changes a folder holds a lock file across load, change and save. Older `nodes.json` and `edges.json` folders still load and are rewritten on the next save.

**Why:** unrelated edits touch unrelated lines, so `git merge` has nothing to conflict on. Two commands at once never lose a write. This is the merge-friendly layout that [0001](0001-plain-files-in-git.md) needs for a team.

Shipped in #140, merged 2026-11-24.
