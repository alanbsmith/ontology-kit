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

- **Ontology 101**: Noy, N.F. & McGuinness, D.L. (2001). *Ontology Development 101: A Guide to Creating Your First Ontology.* Stanford. The method, rules and wine examples.
- **Gruber 1993**: Gruber, T.R. *A Translation Approach to Portable Ontology Specifications.* Knowledge Acquisition 5(2). The definition of an ontology, the "knowledge level" principle, and documentation strings. Page numbers are PDF pages (the PDF has a cover page, so they're one more than the printed numbers).

Each rule states its **basis**:
- `direct`: the cited passage states the rule.
- `interpretive`: it follows from a cited definition; `rationale` explains the step.
- `operational`: a toolkit convention with no source. Says so plainly and cites nothing.

…and its **modality**, taken from the passage's own wording ("must"/"should always"/"wrong" → MUST; "should" or an imperative guideline → SHOULD; "consider"/"may"/"can" → MAY). Where the toolkit treats a rule more strictly or leniently than its modality suggests, `severity` is overridden **with a written `severityReason`** (e.g. `hier-no-cycles` is SHOULD NOT in the paper but an error here, because okb has no way to declare intended equivalence).

## Schema

| Node | Key properties | Edges |
|---|---|---|
| `MetaKB` | version, formatVersion | |
| `Source` | title, authors, year, url | |
| `SourceLocation` | section, page, quote, deepLink | `PART_OF` → Source |
| `Principle` | name, statement, plainLanguage | `CITES` → SourceLocation |
| `Concept` | name, aliases, definition, plainLanguage, example, inThisToolkit, origin | `DEFINED_IN` → SourceLocation |
| `Rule` | key, modality, basis, check, severity, severityReason, fromStep, statement, plainLanguage, review, fix | `JUSTIFIED_BY` → Rationale, `GOVERNS` → Concept |
| `Rationale` | explanation | `CITES` → SourceLocation |
| `Step` | order, name, goal, whyItMatters, guidingQuestions, outputs, doneWhen, tips, wine, commands | `PRECEDES` → Step, `APPLIES` → Rule, `INTRODUCES` → Concept, `USES` → Decision, `CITES` → SourceLocation |
| `Decision` | name, whenYouFaceIt, tests[{ask, ifYes, ifNo}], note, wine | `CITES` → SourceLocation |
| `NodeType`, `EdgeType` | the okb file-format registry; origin `ontology101` \| `operational` | `MODELS` → Concept |

## Editing

1. Edit `src/*.yaml`. Quotes must be copied exactly; use `...` for a deliberate gap.
2. `npm run verify:quotes`: compiles `data/`, re-checks every quote against `sources/*.pdf`, and fails on any inconsistency (see the header of `build.ts` for the full list).
3. If you added a mechanical/heuristic rule, add a check with the same id to `src/checks.ts` and a fixture to `tests/checks.test.ts`. The build and the test suite both fail until you do.
4. `npm run docs && npm test`.
5. Bump `VERSION` in `build.ts` when rules change meaning. Ontologies record the meta-KB version they were created with (`okb.json`).

## Changes from the first draft (v1)

The v1 meta-KB (`build_meta_kb.py`) was rebuilt from scratch in v2. Main differences:

- **Every rule now cites a quote that actually supports it.** In v1 several rules cited the nearest section's headline quote rather than the sentence that states the rule (e.g. the no-cycles, synonym and one-child/twelve-children rules all cited unrelated sentences). The v1 inverse-slot rule also overstated the paper, which calls storing both directions redundant (just convenient for data entry) rather than something you should do.
- **Modalities were re-derived from the wording.** For example, "Do not add strings such as 'class'…" sits in a list of things "to consider", so it's SHOULD NOT (warning), not MUST NOT.
- **Quotes are checked mechanically** against the PDFs, with page numbers.
- **Domain-neutral.** Examples come from the paper's wine ontology rather than Canvas Kit, and the `DomainKB` registry was dropped: which KBs follow the rules is recorded in each KB (`okb.json` → `metaKbVersion`), not in the meta-KB.
- **Added:** the method as Step nodes, decision guides, principles (including Gruber's knowledge-level principle), plain-language explanations, a `basis` for every rule, and the okb file-format registry. The v1 `EdgeType` registry's design-system edges (`COMPOSES`, `PREFERRED_OVER`, `CONFLICTS_WITH`, `IS_VARIANT_OF`) are modeled in v2 as Instance-type slots with class-level fixed values. That keeps them inside the Ontology 101 primitives, so they get range and fixed-value checks for free.

## v2.1

- **Relationships are stored LPG-style.** A relationship slot's values are edges named after it (`maker` → `:MAKER`) instead of generic `HAS_VALUE` edges. The file format is now `okb-lpg/2`; `okb-lpg/1` files are migrated automatically when loaded.
- **Inverse slots are stored once.** One edge per fact, read from both ends. The paper calls storing both directions redundant, and in a graph it's pure duplication. `slot-inverse-consistent` now checks only that domains and ranges mirror each other; values can't disagree.
- **Everyday vocabulary.** The glossary maps slot → property / relationship, and to OWL datatype/object properties and LPG node properties/relationship types. The CLI adds `okb property` and `okb relationship` alongside `okb slot`.
- `okb export` writes instance data for graph databases (JSON or openCypher).

## v2.2

- **Edge properties.** Relationships can declare properties for their edges (`condition`, `strength`...), with facets checked by the new `slot-edge-properties` rule, plus a reserved `rule` reference to the Rule that justifies the link. New glossary entry `concept.edge-property` and decision guide `decision.edge-or-class` (edge property vs. making the relationship its own class). Both are marked as toolkit concepts: Ontology 101's frame model has no relationship properties.
