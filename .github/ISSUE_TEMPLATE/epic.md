---
name: Epic Tracker
about: The tracker for a milestone, with its purpose, scope, decisions and the order its issues merge
title: 'Epic: '
labels: epic
---

<!--
The title is `Epic:` followed by the GitHub milestone's title, like `Epic: Serving a KB (0.3.0)`. One epic per milestone, in that milestone. An epic never ships code or becomes a commit, like a spike: it closes when the milestone's PR to `main` merges.

Keep it short. The child issues hold the detail, and brain/milestones/ holds why the milestone exists. Delete these comments as you fill the sections in.
-->

## Purpose

<!-- Two or three sentences: what this milestone lets someone do, and why it comes now. Link the brain's milestone file, like brain/milestones/serving-a-kb.md. -->

## Scope

<!-- What the milestone covers. Name issues where they exist. -->

**In:**

-

**Out:**

<!-- What someone might expect here but won't get, and why. -->

-

**Deferred:**

<!-- Ideas for later, with an issue or milestone if there is one. -->

-

## Decisions

<!-- Choices made for this milestone, one line each, with the reason. Link brain/decisions/ for any that outlive the milestone. -->

-

## Checklist (merge in this order)

<!-- One line per child issue: its number and title, then what it waits on ("after #94", "independent"). Tick each as it merges into the integration branch. Each child issue says "Part of <milestone>, tracked in #<this epic>". Keep the last line: decisions from the milestone's spikes stay `proposed` until the owner accepts them here. -->

- [ ] #
- [ ] Accept or reject the milestone's `proposed` decisions in one commit on the integration branch (the owner decides; child sessions never change a `status`), before the PR to `main` is marked ready

## Branching

<!-- Fill in the branch name. -->

All work happens on the integration branch `<branch>`, cut from `main`, never on `main` itself. Each issue is one commit on a topic branch cut from `<branch>`. The parent session reviews, merges into `<branch>` and pushes, and opens one PR from `<branch>` to `main`. The owner merges it.
