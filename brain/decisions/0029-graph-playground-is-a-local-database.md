---
summary: The graph playground loads a KB into a local graph database; nothing is hosted.
status: proposed
decided-by: owner
date: 2026-11-25
updated: 2026-11-25
links: ["#111", "#112", "milestones/serving-a-kb.md"]
---

# 0029: The graph playground is a local graph database

**Decision:** the playground lets a team load its KB into a graph database on their own machine, to see the structure and analyze it. Nothing is hosted. It builds on the bulk-loader exports (#111, #112) and sits in 0.3.0 with the loading guide.

**Why:** the owner's idea: teams should be able to put their ontology data into a local graph instance easily, to see and analyze the structure, and it doesn't need to be hosted. Hosting would break the "no hosted service" non-goal in #105.

**Consequences:** how much okb does (a documented recipe, or a helper that starts a local database) is decided in the milestone. okb doesn't load or sync a team's production database.
