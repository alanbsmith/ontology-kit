---
summary: A rule's severity comes from its modality (MUST, SHOULD, MAY), and waiving a rule needs a written reason.
status: accepted
date: 2026-09-23
updated: 2026-11-22
links: [CLAUDE.md, docs/RULES.md, "Discussion #105"]
---

# 0003: Guardrails, not gates

**Decision:** MUST rules are errors, SHOULD rules are warnings, MAY rules are info. An override needs a written `severityReason`, and a warning can be waived by a `DesignDecision` that says why.

**Why:** #105's second goal is guardrails, not gates. Most of the method is judgment, so blocking on it would push people to work around the tool. Writing the reason down keeps a waiver honest and reviewable.

**Consequences:** new or tightened rules aren't breaking changes by themselves (see CONTRIBUTING.md, "What the versions mean").
