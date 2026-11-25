---
summary: A team can add its own rules, and that ships before 1.0.
status: accepted
date: 2026-11-24
updated: 2026-11-24
links: ["#100", "#101", "#102", "milestones/team-guardrails.md"]
---

# 0024: Rule packs and severity profiles ship before 1.0

**Decision:** teams can write their own rules for their ontologies, beyond the meta-KB's rules (the team rule packs of #100 and #101). Severity profiles (#102) come with them. Both land in 0.4.0, before 1.0.

**Why:** the owner's reason: teams need to create their own rules for their ontologies and extend the rules beyond the meta-KB's. A rules file in a KB folder also adds to the file format, which is easier to settle before the 1.0 promise than after.

**Consequences:** whether a pack is declarative or code is still [open](../open-questions.md), and spike #100 answers it first in the milestone.
