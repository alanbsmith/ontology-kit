---
summary: Relationship values are stored as edges named after the slot, and an inverse pair is stored once.
status: accepted
date: 2026-09-23
updated: 2026-11-22
links: [docs/CHANGELOG.md (meta-KB v2.1), docs/FORMAT.md]
---

# 0004: Store relationships as typed edges, and inverses once

**Decision:** a relationship slot's values are edges whose type is the slot name in upper snake case (`maker` → `:MAKER`), not generic `HAS_VALUE` edges. Inverse slots share one edge, read from both ends. The format became `okb-lpg/2`, and `okb-lpg/1` files migrate on load.

**Why:** typed edges make the files read like a labeled property graph and export directly to one. Ontology 101 calls storing both directions of an inverse redundant, and in a graph it's pure duplication that can disagree with itself.

**Consequences:** the storage is subtle enough that it lives in one module ([0005](0005-one-module-for-relationship-storage.md)).
