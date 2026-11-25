---
summary: Only packages/format/src/relationships.ts (ont.rel) knows how relationship values are stored.
status: accepted
date: 2026-09-23
updated: 2026-11-22
links: [commit c1b4e25, CLAUDE.md]
---

# 0005: One module owns relationship storage

**Decision:** reading and writing relationship values, and schema changes that affect them, go through `ont.rel` and its intents (`becomeRelationship`, `declareInverse`, `rename`, `drop` and so on). Nothing else builds edges for a relationship.

**Why:** before, the storage rules were spread across the model, the ops and their callers, so one storage change touched about eight functions in four files. Now a change is one change in one place.
