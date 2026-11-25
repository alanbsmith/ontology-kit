---
summary: Where Ontology Kit stands and why the current focus is the focus.
updated: 2026-11-25
---

# Now

**Version:** 0.2.0, released 2026-11-24 (#148), with meta-KB 2.6.3 and the `okb-lpg/3` file format. The 0.2.0 package is also the first to ship `@ontology-kit/reader`, the renamed file-format package (#146).

## Focus

Planning the road to 1.0. The plan is in [milestones/road-to-1-0.md](milestones/road-to-1-0.md): six user goals (decisions 0021 to 0030 in [decisions/](decisions/)), then 0.3.0 Serving a KB, 0.4.0 Team guardrails with cross-KB references, 0.5.0 Component docs extraction with the tokens and icons KBs, 0.6.0 Subject-matter experts, a soak of 0.7.0 and 0.8.0, and 1.0.0. The owner is reviewing it. Nothing on GitHub has changed yet: the milestone and issue moves are only drafted.

Before it, the [Maintaining a KB](milestones/maintaining-a-kb.md) work shipped in 0.2.0. The Create a Project Brain milestone is done and merged.

## Next

Once the owner approves the plan: create or move the GitHub milestones and issues it names, then start 0.3.0 with the CLI command-table refactor (#8), the prerelease infrastructure (#129), spike #143 and benchmark #29. Open questions that gate 0.3.0 are in [open-questions.md](open-questions.md).

## Why this order

Discussion #105 puts Packaging first, then making a KB safe to change, then serving it, then team guardrails. A KB has to be installable before anyone keeps one, safe to change before a team shares one, and stable before tools depend on it. The brain comes first in the current stretch because planning sessions for the road to 1.0 need the why without a re-brief.

## Blocked or waiting

Nothing recorded. Check the board.
