---
summary: Where Ontology Kit stands and why the current focus is the focus.
updated: 2026-11-24
---

# Now

**Version:** 0.2.0, released 2026-11-24 (#148), with meta-KB 2.6.3 and the `okb-lpg/3` file format. The 0.2.0 package is also the first to ship `@ontology-kit/reader`, the renamed file-format package (#146).

## Focus

The [Create a Project Brain](milestones/create-a-project-brain.md) milestone ([on GitHub](https://github.com/alanbsmith/ontology-kit/milestone/10), tracker #152) is the active work. It adds this `brain/` folder (#149), records the reasons behind decisions that have none yet (#150), and adds a drift check so the brain's paths don't go stale (#151). Work lands on the `project-brain` integration branch and the owner merges the milestone to `main`.

Before it, [Maintaining a KB](milestones/maintaining-a-kb.md) merged as #140 and shipped in 0.2.0: `okb diff`, `okb check`, `okb pin`, `okb release`, `okb docs`, `okb source refresh` and the maintainer and sign-off skills. Three follow-up fixes and spikes from that milestone are still open (#142, #143, #145).

## Next

Not decided. The next milestone in #105's order is Serving a KB. How versions map to milestones is an [open question](open-questions.md#what-versions-do-the-milestones-map-to-on-the-way-to-10).

## Why this order

Discussion #105 puts Packaging first, then making a KB safe to change, then serving it, then team guardrails. A KB has to be installable before anyone keeps one, safe to change before a team shares one, and stable before tools depend on it. The brain comes first in the current stretch because planning sessions for the road to 1.0 need the why without a re-brief.

## Blocked or waiting

Nothing recorded. Check the board.
