---
summary: The method and rules live in the meta-KB (YAML, compiled to JSON), and the build fails if code and rules drift apart.
status: accepted
date: 2026-09-23
updated: 2026-11-22
links: [CLAUDE.md, packages/okb/meta-kb/README.md]
---

# 0002: The meta-KB is the source of truth for the method and rules

**Decision:** the method, glossary, rules and decision guides are a knowledge base of their own, written as YAML in `packages/okb/meta-kb/src/` and compiled to committed JSON. Every rule has exactly one check with the same key, and the build fails if either side is missing. The rules docs are generated from it.

**Why:** the rules, the code that checks them and the docs that explain them can't disagree, because only one of them is written by hand. The kit also follows its own method: the meta-KB is built and checked the way a user's KB is.

**Consequences:** changing a rule means editing YAML, adding a check and a fixture, and regenerating docs. The meta-KB has its own version number, separate from the package's.
