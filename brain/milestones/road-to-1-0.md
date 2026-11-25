---
summary: The plan from 0.2.0 to 1.0. Goals, version map, what blocks 1.0, what moves after, and the guardrails.
updated: 2026-11-25
links: ["Discussion #105", "CONTRIBUTING.md#what-0x-means"]
---

# The road to 1.0

Planned 2026-11-24 and 2026-11-25 with the owner. Issue statuses live on the board, not here.

| Decision                                                               | Settles                                                                      |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [0021](../decisions/0021-one-point-zero-is-six-user-goals.md)          | The six user goals that define 1.0                                           |
| [0022](../decisions/0022-one-point-zero-conditions-and-the-soak.md)    | Which 1.0 conditions block, and the soak                                     |
| [0023](../decisions/0023-version-map-to-one-point-zero.md)             | The version map                                                              |
| [0024](../decisions/0024-team-rule-packs-before-one-point-zero.md)     | Team rule packs before 1.0                                                   |
| [0025](../decisions/0025-bundler-after-one-point-zero.md)              | The bundler question waits                                                   |
| [0026](../decisions/0026-road-to-one-point-zero-guardrails.md)         | Guardrails on the road                                                       |
| [0027](../decisions/0027-cross-kb-references-before-one-point-zero.md) | Cross-KB references before 1.0; Canvas, tokens and icons KBs as the test bed |
| [0028](../decisions/0028-sources-beyond-ontology-101.md)               | Sources beyond Ontology 101                                                  |
| [0029](../decisions/0029-graph-playground-is-a-local-database.md)      | The playground is a local graph database                                     |
| [0030](../decisions/0030-an-evaluation-runner-for-goal-6.md)           | An evaluation runner for goal 6                                              |

## What 1.0 means

Six user goals ([0021](../decisions/0021-one-point-zero-is-six-user-goals.md)), plus the promise that the CLI, the file format and the `@ontology-kit/reader` exports stay stable. The blocking conditions are in [0022](../decisions/0022-one-point-zero-conditions-and-the-soak.md).

## Version map

| Version      | Milestone                                                                | Goals              | File                                                         |
| ------------ | ------------------------------------------------------------------------ | ------------------ | ------------------------------------------------------------ |
| 0.3.0        | Serving a KB                                                             | 4, 5, 6            | [serving-a-kb.md](serving-a-kb.md)                           |
| 0.4.0        | Team guardrails, with cross-KB references                                | 2                  | [team-guardrails.md](team-guardrails.md)                     |
| 0.5.0        | Component docs extraction, with the tokens and icons KBs and new sources | 1                  | [component-docs-extraction.md](component-docs-extraction.md) |
| 0.6.0        | Subject-matter experts                                                   | 3                  | [subject-matter-experts.md](subject-matter-experts.md)       |
| 0.7.0, 0.8.0 | Soak                                                                     | the stable-CLI bar | [soak.md](soak.md)                                           |
| 1.0.0        |                                                                          |                    |                                                              |

The format freezes after 0.4.0 ([0026](../decisions/0026-road-to-one-point-zero-guardrails.md)). Goal 2 is mostly met by 0.2.0 (`diff`, `check`, `release`, `source refresh`), and 0.4.0 adds the team's own rules, a health report and deprecation.

The owner left the placement of spike #143 (interrupted saves, one file per KB) and benchmark #29 (scale) to the planning session. Both go early in 0.3.0, because either could change the format before the freeze.

## After 1.0

Impact checks across linked KBs (#32) and combined export (#33), the rest of Structured and generated sources, the graphics spike (#25), and the second release of Approachable docs, apart from pieces a goal needs. Each must be a purely additive change to the format.

## Log

- 2026-11-24: plan written with the owner. Nothing changed on GitHub.
- 2026-11-25: guardrails accepted, cross-KB references and the three test KBs pulled before 1.0, sources beyond Ontology 101, the playground and the evaluation runner decided.
- 2026-11-25: GitHub updated: milestones retitled with versions, Soak milestone created, Maintaining a KB closed, issues moved, #157 to #164 created. The evaluation-runner issue (#165) followed once the owner chose a generic name.
