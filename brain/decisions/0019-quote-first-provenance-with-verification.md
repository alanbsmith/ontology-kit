---
summary: Every fact in an ontology carries a verbatim quote from its source, and a separate pass checks it.
status: accepted
date: 2026-11-24
updated: 2026-11-24
links: ["docs/EXTRACTION-PIPELINE.md"]
---

# 0019: Quote-first provenance, checked in a separate pass

**Decision:** a fact in an ontology comes with a quote from the original source, and a separate verification pass checks each quote against that source.

**Why:** any fact in the ontology should be verifiable against the original material. The separate pass exists because agents were seen misreading or misrepresenting facts from source documents, so an extra check was needed.

See [the extraction pipeline](../../docs/EXTRACTION-PIPELINE.md) for how it works.
