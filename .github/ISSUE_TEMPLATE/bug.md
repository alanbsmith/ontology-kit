---
name: Bug report
about: Something isn't working the way the docs or the CLI say it should
title: 'fix: '
labels: bug
---

<!--
The title is a Conventional Commit, like `fix(okb): Stop status crashing on an empty ontology`. CONTRIBUTING.md ("Commits and pull requests") lists the types and scopes.
-->

## What happened

<!-- A clear, short description of the bug. -->

## To reproduce

<!-- The exact commands, or a minimal `nodes.json` and `edges.json`, that show it. -->

```bash

```

## Expected behavior

<!-- What you expected to happen. -->

## Actual behavior

<!-- What happened instead. Paste the full output or error. -->

```text

```

## Environment

- okb version (`okb --version`):
- Node version (`node --version`):
- Operating system:

## Context

<!-- Anything else: when it started working or stopped, a suspected cause, related issues. -->

## Criteria

<!-- How we'll know it's fixed. A test that fails today and passes after is the best one. -->

- [ ] A test covers the bug
- [ ] `pnpm tsc` and `pnpm test` pass
