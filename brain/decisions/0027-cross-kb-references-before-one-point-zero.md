---
summary: Cross-KB references ship before 1.0, because the Canvas KB points at the tokens and icons KBs.
status: accepted
decided-by: owner
date: 2026-11-25
updated: 2026-11-25
links: ["#31", "#23", "#24", "0023-version-map-to-one-point-zero.md"]
---

# 0027: Cross-KB references before 1.0

**Decision:** cross-KB references (#31) ship in 0.4.0, before the format freeze. Impact checks (#32) and combined export (#33) follow 1.0 as additions. The Canvas KB, a tokens KB and an icons KB are the test bed for 1.0. Each is a separate project, and the tokens and icons spikes (#23, #24) move to 0.5.0.

**Why:** the owner needs to build all three KBs, and wants them to test whether the kit can build different kinds of KB with different constraints. The Canvas KB references the other two (a component uses a token or an icon). References add to `okb.json` and the relationship model, so they have to land before the format is promised stable.

**Consequences:** this changes the first draft of [0023](0023-version-map-to-one-point-zero.md), which put all of Linked knowledge bases after 1.0. 0023 was amended before it merged.
