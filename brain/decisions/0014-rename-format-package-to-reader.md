---
summary: "@ontology-kit/format shipped in 0.1.0, then was renamed @ontology-kit/reader in 0.2.0, a breaking change."
status: accepted
date: 2026-11-24
supersedes: 0007
updated: 2026-11-24
links: ["#146", "docs/CHANGELOG.md"]
---

# 0014: Rename `@ontology-kit/format` to `@ontology-kit/reader`

**Decision:** the package from [0007](0007-format-reader-as-its-own-package.md) is now `@ontology-kit/reader` (folder `packages/reader`). The exports are unchanged. Writes to an ontology go through `okb`; the write methods on `Ontology` stay internal.

**Why:** "format" names the file format the package implements, and it reads like a formatter. "Reader" names the promise the package makes to other tools. A public write API would be a new design with its own decision.

**Consequences:** 0.1.0 had already shipped under the old name, so the rename was a breaking change in 0.2.0. Users change the dependency and every import. `@ontology-kit/format` 0.1.0 can't be unpublished, because okb 0.1.0 depends on it. It stays installable and is deprecated with a pointer to the new name.

Shipped in #146, merged 2026-11-24.
