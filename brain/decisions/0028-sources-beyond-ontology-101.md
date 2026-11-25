---
summary: The meta-KB grows beyond Ontology 101, from open sources first; proprietary books inspire authored rules but are never quoted.
status: proposed
decided-by: owner, on a recommendation
date: 2026-11-25
updated: 2026-11-25
links: ["0018-ontology-101-as-the-method.md", "sources/README.md"]
---

# 0028: Sources beyond Ontology 101

**Decision:** before 1.0, a spike picks open sources to add to the meta-KB beside Ontology 101. Candidates: OntoClean (Guarino and Welty), Grüninger and Fox on competency questions, the NeOn methodology, SKOS and ontology design patterns. They join `sources/` and are cited with verbatim quotes like Ontology 101. A proprietary book, such as Jessica Talisman's _Ontology Pipeline_, can inspire the meta-KB but is never quoted and never added to the repo. An idea from it becomes an authored rule: still grounded in text, but stated as a general concept in the project's own words.

**Why:** [0018](0018-ontology-101-as-the-method.md) always meant Ontology 101 as the foundation, not the only source. The owner asked whether the kit leans on it too heavily, and wants to explore open sources. Several 1.0 goals need what Ontology 101 doesn't cover: maintaining and reusing ontologies, checking is-a hierarchies, using competency questions to evaluate, and KBs that are vocabularies or taxonomies rather than full ontologies (such as tokens and icons). Quotes ship in a public repo and the npm package, so they can only come from sources that allow it.

**Consequences:** the spike sits in 0.5.0 (Component docs extraction). New meta-KB rules from it can change rule meanings, which bumps the meta-KB version.
