---
summary: An unscoped ontology-kit package forwards to okb so people can run it with npx instead of installing it.
status: accepted
date: 2026-11-20
updated: 2026-11-24
links: [commit 8d6ab1c, "CONTRIBUTING.md"]
---

# 0020: Publish an unscoped `ontology-kit` wrapper

**Decision:** `packages/ontology-kit` is the unscoped `ontology-kit` package. Its bin forwards to `@ontology-kit/okb`.

**Why:** the wrapper lets people run okb with `npx`, so nobody has to install it globally or locally first.
