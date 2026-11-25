---
summary: The bundler question doesn't block 1.0; the build stays tsc into dist.
status: accepted
decided-by: owner, on a recommendation
date: 2026-11-24
updated: 2026-11-25
links: ["0009-node-26-for-development-24-at-runtime.md", "milestones/road-to-1-0.md"]
---

# 0025: Defer the bundler question past 1.0

**Decision:** adopting a bundler or other build step is not a 1.0 blocker. The packages keep compiling with `tsc` into `dist/` ([0009](0009-node-26-for-development-24-at-runtime.md)). The question stays in [open-questions.md](../open-questions.md).

**Why:** the owner chose to defer it. The recommendation they accepted: consumers see only the `exports` map and the `bin`, so a build change doesn't touch the 1.0 promise as long as those stay the same.

**Consequences:** a later build change must keep everything a consumer relies on identical: the `exports` map, the `bin` behavior, and the public `@ontology-kit/reader` API, meaning its exported names, types and behavior and any file it reads at run time.
