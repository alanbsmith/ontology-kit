---
summary: How milestone files work. One file per active milestone; the board holds its issues.
updated: 2026-11-25
---

# Milestones

One file per milestone that's active or next. Each holds what the board can't: why the milestone exists, why it comes now, decisions made inside it, and lessons from its sessions. Its issues stay on the board and its GitHub milestone, and its epic issue (labeled `epic`) holds the merge order.

[road-to-1-0.md](road-to-1-0.md) is the overview of the road to 1.0 and has its own layout. Every other file has four sections: **Why**, **Why now**, **Done when**, and **Log**. The log is dated one-line entries, newest last, added at the end of each session. When a milestone closes, add a last log line and move anything still undecided to [open-questions.md](../open-questions.md).

## How a milestone runs

A milestone has an epic (its tracker issue, labeled `epic`, from the Epic Tracker template) and child issues that each say `Part of <milestone>, tracked in #<epic>` and end with a **Working rules** footer. Each child issue is one commit on a topic branch cut from the milestone's integration branch, made by its own session. A parent session reviews each one, merges it into the integration branch and ticks the epic's checklist. One PR takes the integration branch to `main`, and the owner merges it. Spikes make no commit. The soak has no integration branch. The owner's `run-milestone` skill drives this, and [CONTRIBUTING.md, "Issues"](../../CONTRIBUTING.md#issues) has the issue layout.
