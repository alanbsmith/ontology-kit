---
summary: The file-format reader is its own package, @ontology-kit/format, with no dependency on okb.
status: superseded
date: 2026-11-21
supersedes: 0006
superseded-by: 0014
updated: 2026-11-22
links: [commit 05325de, "docs/FORMAT.md#why-a-package-of-its-own"]
---

# 0007: Ship the format reader as `@ontology-kit/format`

**Decision:** the node and edge types, `Ontology`, the relationship module and the type registry ship as `@ontology-kit/format`. okb depends on it. Write methods stay on `Ontology`, marked `@internal`.

**Why:** a tool that reads okb files shouldn't have to install the CLI, the meta-KB and the skills, and the format's contract needs a name and a version of its own. Splitting `Ontology` into a reader and a writer would have meant exposing or duplicating its indexes, so the write methods are hidden from the published types instead. Nothing had been published under the subpath, so no shim was needed.

**Consequences:** the three packages release together at one version. A change to the format exports is a version decision. An outside tool using the package is one of the 1.0 conditions.
