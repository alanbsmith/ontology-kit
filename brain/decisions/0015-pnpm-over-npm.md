---
summary: Contributors use pnpm instead of npm, mainly for stricter dependency isolation.
status: accepted
date: 2026-11-20
updated: 2026-11-24
links: [commit 45bcbe3, "CONTRIBUTING.md"]
---

# 0015: Use pnpm instead of npm

**Decision:** contributors install with pnpm, pinned in the root `package.json`. The repo is a pnpm workspace (`pnpm-workspace.yaml`). The project used npm before commit 45bcbe3.

**Why:** stricter dependency isolation was the main reason. The maintainer had other good reasons too, which aren't written down.
