# The meta-KB

A knowledge base about building knowledge bases. It's the single source of truth for:

- the **method** (8 steps, with guiding questions and "done when" checklists)
- the **vocabulary** a beginner needs (glossary concepts, in plain language)
- **principles** and **decision guides** for judgment calls
- the **rules** `okb validate` enforces and the ontology-review skill asks about
- the **file format** okb ontologies use (node/edge type registry)

It is itself an LPG (`data/nodes.json`, `data/edges.json`), so you can load it into the same graph database as your domain KBs.

## Grounding

Every non-toolkit claim is tied to a `SourceLocation`: a **verbatim** quote with section and PDF page number, checked word-for-word against the PDF by `npm run verify:quotes`.

- **Ontology 101**: Noy, N.F. & McGuinness, D.L. (2001). _Ontology Development 101: A Guide to Creating Your First Ontology._ Stanford. The method, rules and wine examples.
- **Gruber 1993**: Gruber, T.R. _A Translation Approach to Portable Ontology Specifications._ Knowledge Acquisition 5(2). The definition of an ontology, the "knowledge level" principle, and documentation strings. Page numbers are PDF pages (the PDF has a cover page, so they're one more than the printed numbers).

Each rule states its **basis**:

- `direct`: the cited passage states the rule.
- `interpretive`: it follows from a cited definition; `rationale` explains the step.
- `operational`: a toolkit convention with no source. Says so plainly and cites nothing.

…and its **modality**, taken from the passage's own wording ("must"/"should always"/"wrong" → MUST; "should" or an imperative guideline → SHOULD; "consider"/"may"/"can" → MAY). Where the toolkit treats a rule more strictly or leniently than its modality suggests, `severity` is overridden **with a written `severityReason`** (for example `hier-no-cycles` is SHOULD NOT in the paper but an error here, because okb has no way to declare intended equivalence).

## Schema

| Node                   | Key properties                                                                                                               | Edges                                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `MetaKB`               | `version`, `formatVersion`                                                                                                   |                                                                                                          |
| `Source`               | `title`, `authors`, `year`, `url`                                                                                            |                                                                                                          |
| `SourceLocation`       | `section`, `page`, `quote`, `deepLink`                                                                                       | `PART_OF` → Source                                                                                       |
| `Principle`            | `name`, `statement`, `plainLanguage`                                                                                         | `CITES` → SourceLocation                                                                                 |
| `Concept`              | `name`, `aliases`, `definition`, `plainLanguage`, `example`, `inThisToolkit`, `origin`                                       | `DEFINED_IN` → SourceLocation                                                                            |
| `Rule`                 | `key`, `modality`, `basis`, `check`, `severity`, `severityReason`, `fromStep`, `statement`, `plainLanguage`, `review`, `fix` | `JUSTIFIED_BY` → Rationale, `GOVERNS` → Concept                                                          |
| `Rationale`            | `explanation`                                                                                                                | `CITES` → SourceLocation                                                                                 |
| `Step`                 | `order`, `name`, `goal`, `whyItMatters`, `guidingQuestions`, `outputs`, `doneWhen`, `tips`, `wine`, `commands`               | `PRECEDES` → Step, `APPLIES` → Rule, `INTRODUCES` → Concept, `USES` → Decision, `CITES` → SourceLocation |
| `Decision`             | `name`, `whenYouFaceIt`, `tests[{ask, ifYes, ifNo}]`, `note`, `wine`                                                         | `CITES` → SourceLocation                                                                                 |
| `NodeType`, `EdgeType` | the okb file-format registry; `origin` is `ontology101` or `operational`                                                     | `MODELS` → Concept                                                                                       |

## Editing

1. Edit `src/*.yaml`. Quotes must be copied exactly; use `...` for a deliberate gap.
2. `npm run verify:quotes`: compiles `data/`, re-checks every quote against `sources/*.pdf`, and fails on any inconsistency (see the header of `build.ts` for the full list).
3. If you added a mechanical/heuristic rule, add a check with the same id to `src/checks.ts` and a fixture to `tests/checks.test.ts`. The build and the test suite both fail until you do.
4. `npm run docs && npm test`.
5. Bump `VERSION` in `build.ts` when rules change meaning or a shipped skill's instructions change (a patch version for skill-only changes), and update the `**Version X.Y.Z.**` line at the top of each `skills/*/SKILL.md` to match. Add an entry to the [changelog](../docs/CHANGELOG.md). Ontologies record the meta-KB version they were created with (`okb.json`).

## Changelog

What changed in each version, from the first draft to now, is in the [changelog](../docs/CHANGELOG.md).
