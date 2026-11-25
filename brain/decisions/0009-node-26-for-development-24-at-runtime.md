---
summary: Contributors use Node 26; okb runs on Node 24 or newer, with no build step in development.
status: accepted
date: 2026-11-20
updated: 2026-11-22
links: [commit 3667123, CLAUDE.md]
---

# 0009: Develop on Node 26, support Node 24 at runtime

**Decision:** `.nvmrc` and the docs site use Node 26. okb keeps `engines: node >=24`. Development runs the TypeScript sources directly with Node's type stripping, so only erasable syntax is allowed.

**Why:** type stripping, `node:test` and the PDF fallback all work on 24 as well as 26, so there was no reason to raise the floor for users. Raising it later is a breaking change.

<!-- Alan: why no build step in development (type stripping over a bundler or tsc --watch) isn't written down anywhere I could find. -->
