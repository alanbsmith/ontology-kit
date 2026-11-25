---
summary: Ship the file-format reader as a subpath export of okb. Superseded by 0007 before anything was published.
status: superseded
date: 2026-11-20
superseded-by: 0007
updated: 2026-11-22
links: [commit f9c98ac]
---

# 0006: Ship the format reader as `@ontology-kit/okb/format`

**Decision:** expose the reader as a subpath of the okb package, not a package of its own.

**Why:** the reader shared the meta-KB registry, naming and clock with the CLI, so one package was simpler.

Superseded a day later by [0007](0007-format-reader-as-its-own-package.md).
