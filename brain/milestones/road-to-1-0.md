---
summary: The plan from 0.2.0 to 1.0. Goals, version map, what blocks 1.0, what moves after, and the risks.
updated: 2026-11-24
links: ["Discussion #105", "CONTRIBUTING.md#what-0x-means"]
---

# The road to 1.0

Planned 2026-11-24 with the owner. Decisions: [0021](../decisions/0021-one-point-zero-is-six-user-goals.md) (goals), [0022](../decisions/0022-one-point-zero-conditions-and-the-soak.md) (conditions and soak), [0023](../decisions/0023-version-map-to-one-point-zero.md) (versions), [0024](../decisions/0024-team-rule-packs-before-one-point-zero.md) (rule packs), [0025](../decisions/0025-bundler-after-one-point-zero.md) (bundler). Issue statuses live on the board, not here.

## What 1.0 means

Six user goals ([0021](../decisions/0021-one-point-zero-is-six-user-goals.md)), plus the promise that the CLI, the file format and the `@ontology-kit/reader` exports stay stable. The blocking conditions are in [0022](../decisions/0022-one-point-zero-conditions-and-the-soak.md).

## Version map

| Version      | Milestone                 | Goals              | File                                                         |
| ------------ | ------------------------- | ------------------ | ------------------------------------------------------------ |
| 0.3.0        | Serving a KB              | 4, 5, 6            | [serving-a-kb.md](serving-a-kb.md)                           |
| 0.4.0        | Team guardrails           | 2                  | [team-guardrails.md](team-guardrails.md)                     |
| 0.5.0        | Component docs extraction | 1                  | [component-docs-extraction.md](component-docs-extraction.md) |
| 0.6.0        | Subject-matter experts    | 3                  | [subject-matter-experts.md](subject-matter-experts.md)       |
| 0.7.0, 0.8.0 | Soak                      | the stable-CLI bar | [soak.md](soak.md)                                           |
| 1.0.0        |                           |                    |                                                              |

Goal 2 is mostly met by 0.2.0 (`diff`, `check`, `release`, `source refresh`); 0.4.0 adds the team's own rules, a health report and `deprecate`.

## After 1.0

Linked knowledge bases, Structured and generated sources, and the second release of Approachable docs, apart from pieces a goal needs. None of the six goals names them. Their format changes must be purely additive. The owner hasn't yet confirmed this for linked KBs.

## Proposed guardrails (not yet confirmed by the owner)

These came from the planning session's risk list. The owner hasn't ruled on them.

- **Freeze the format after 0.4.0.** The first issue of 0.3.0 and 0.4.0 settles that milestone's format changes (expected CQ answers, the eval export, rule packs). 0.5.0 and 0.6.0 add commands but no format.
- **Test the reader as an outsider would.** CI builds `@ontology-kit/mcp` against the packed reader tarball, so the 1.0 condition can't pass through workspace imports of internals.
- **Settle every package name before its first publish.** The `format` to `reader` rename ([0014](../decisions/0014-rename-format-package-to-reader.md)) was a breaking change because the name shipped first.
- **Pin `--json` shapes with snapshot tests before the soak starts**, and land the CLI command-table refactor (#8) at the start of 0.3.0, since it is the likeliest source of renames.
- **A written feature freeze** after 0.6.0, so late features can't keep resetting the soak.
- **A second real KB** before 1.0 would test the extraction guidance, which rests on the Canvas Kit KB alone. Nice to have, not a blocker.

## Log

- 2026-11-24: plan written from the planning session with the owner. Nothing changed on GitHub.
