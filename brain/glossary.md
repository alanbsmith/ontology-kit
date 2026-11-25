---
summary: Project jargon used in plans, issues and the brain. Ontology terms are in the meta-KB's glossary instead.
updated: 2026-11-25
---

# Project glossary

Words the project uses for its own work. Terms for building an ontology (class, slot, facet and so on) are in the meta-KB and [docs/GLOSSARY.md](../docs/GLOSSARY.md), not here. Keep each entry to a line or two and link where it's decided. This list is a start; #171 fills it in.

- **Domain rule:** a rule that's knowledge in a KB, extracted from a source with a quote, such as "buttons meet a 24px minimum touch target". Added with `okb rule add`. Not a check.
- **Meta-KB rule:** a check okb runs on every KB, such as "no cycles in the class hierarchy". Lives in the meta-KB, with exactly one check each.
- **Team rule pack:** a KB's own checks, beside the meta-KB's rules, checked the same way ([decision 0024](decisions/0024-team-rule-packs-before-one-point-zero.md), #100, #101).
- **Epic:** the tracker issue for a milestone, labeled `epic`, with its scope, decisions and merge order.
- **Integration branch:** the branch a milestone's issues merge into (such as `serving`) before one PR takes the whole milestone to `main`.
- **Format freeze:** after 0.4.0, no more changes to the file format before 1.0 ([decision 0026](decisions/0026-road-to-one-point-zero-guardrails.md)).
- **Soak:** the 0.7.0 and 0.8.0 releases, with no new features and no breaking CLI change, that prove the CLI is stable ([decision 0022](decisions/0022-one-point-zero-conditions-and-the-soak.md)).
