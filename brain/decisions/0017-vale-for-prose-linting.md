---
summary: Docs prose is linted automatically with Vale, with extra rules for beginner pages.
status: accepted
date: 2026-09-23
updated: 2026-11-24
links: [commit ee6640d, ".vale.ini", "CONTRIBUTING.md"]
---

# 0017: Lint docs prose with Vale

**Decision:** `pnpm lint:docs` runs Vale on the hand-written docs. Pages for beginners get extra rules in `.vale.ini`.

**Why:** docs need automated linting for prose, and Vale is good at that. The reason for the plain-language style on beginner pages isn't written down.
