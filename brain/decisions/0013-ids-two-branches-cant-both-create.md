---
summary: New questions, decisions, instances and quotes get a short random tag in their id, so two branches can't collide.
status: accepted
date: 2026-11-21
updated: 2026-11-24
links: ["#140", "commit de544f4"]
---

# 0013: Ids that two branches can't both create

**Decision:** competency questions, design decisions, instances and quotes get an id with a six-character tag (`cq.k7x2mq`). Classes, slots and other named nodes keep plain slug ids, and a clash gets a tag instead of a counter. The short numbers people type become list positions. Old ids keep working and are never renamed.

**Why:** with counters, two branches that each add a question both create `cq.4`, and the merge silently joins two different things. A tag makes that collision practically impossible, and slugs stay readable where names are already unique.

Shipped in #140, merged 2026-11-24.
