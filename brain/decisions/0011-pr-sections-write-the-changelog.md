---
summary: Commits and PR titles are Conventional Commits, and a release's changelog is generated from PR sections.
status: accepted
date: 2026-11-21
updated: 2026-11-22
links: ["#128", "CONTRIBUTING.md#commits-and-pull-requests"]
---

# 0011: PR titles and Release Notes write the changelog

**Decision:** titles follow Conventional Commits with a scope from `scripts/conventions.ts`. Each PR has a Release Category and Release Notes. `scripts/changelog.ts` writes the release entry from them, for the maintainer to edit.

**Why:** the changelog is written once, when the change is fresh, by whoever made it, instead of reconstructed at release time. Issue titles use the same form, so an issue's title becomes its PR's title.
