# Changelog

What changed in each release. `okb version` prints two versions, the package's and the meta-KB's. The package version covers the CLI, the file format and the `@ontology-kit/format` exports. The meta-KB version covers the method and rules, and each ontology's `okb.json` records the one it started with (`metaKbVersion`). [Releases](../CONTRIBUTING.md#releases) says how the two relate and what the numbers promise. How to edit the meta-KB, and when to bump its version, is in the [meta-KB internals](../packages/okb/meta-kb/README.md).

Package releases come first, newest first, in the [Keep a Changelog](https://keepachangelog.com) style. The release workflow publishes a version's entry as its GitHub release notes, so each entry sits under a `### <version>` heading with a date.

## Package releases

### 0.1.0 (2026-11-21)

The first release. Version 0.x means anything may change between releases; see [Releases](../CONTRIBUTING.md#releases) for what 1.0 will promise.

#### Added

- The `okb` command, with the guided Ontology 101 method, checks, review questions, provenance down to verbatim quotes, and export.
- Three npm packages, released together at the same version: `@ontology-kit/okb`, the unscoped `ontology-kit`, which installs the same `okb` command, and `@ontology-kit/format`, the supported library for reading the `okb-lpg/2` file format from other tools without the CLI. Its semver rules are in [the format reference](FORMAT.md). It's a package of its own, not a subpath of okb, so nothing needs to change when a tool adopts it.
- `okb skills install` and `okb skills status`, which link the shipped skills into `~/.claude/skills/`.
- The packages require Node 24 or newer.

## Changes to the meta-KB

Each version of the method and rules, oldest first. The newest is the one `okb version` prints.

### Changes from the first draft (v1)

The v1 meta-KB (`build_meta_kb.py`) was rebuilt from scratch in v2. Main differences:

- **Every rule now cites a quote that actually supports it.** In v1 several rules cited the nearest section's headline quote rather than the sentence that states the rule (for example the no-cycles, synonym and one-child/twelve-children rules all cited unrelated sentences). The v1 inverse-slot rule also overstated the paper, which calls storing both directions redundant (just convenient for data entry) rather than something you should do.
- **Modalities were re-derived from the wording.** For example, "Do not add strings such as 'class'…" sits in a list of things "to consider", so it's SHOULD NOT (warning), not MUST NOT.
- **Quotes are checked mechanically** against the PDFs, with page numbers.
- **Domain-neutral.** Examples come from the paper's wine ontology rather than Canvas Kit, and the `DomainKB` registry was dropped: which KBs follow the rules is recorded in each KB (`okb.json` → `metaKbVersion`), not in the meta-KB.
- **Added:** the method as Step nodes, decision guides, principles (including Gruber's knowledge-level principle), plain-language explanations, a `basis` for every rule, and the okb file-format registry. The v1 `EdgeType` registry's design-system edges (`COMPOSES`, `PREFERRED_OVER`, `CONFLICTS_WITH`, `IS_VARIANT_OF`) are modeled in v2 as Instance-type slots with class-level fixed values. That keeps them inside the Ontology 101 primitives, so they get range and fixed-value checks for free.

### v2.1

- **Relationships are stored LPG-style.** A relationship slot's values are edges named after it (`maker` → `:MAKER`) instead of generic `HAS_VALUE` edges. The file format is now `okb-lpg/2`; `okb-lpg/1` files are migrated automatically when loaded.
- **Inverse slots are stored once.** One edge per fact, read from both ends. The paper calls storing both directions redundant, and in a graph it's pure duplication. `slot-inverse-consistent` now checks only that domains and ranges mirror each other; values can't disagree.
- **Everyday vocabulary.** The glossary maps slot → property / relationship, and to OWL datatype/object properties and LPG node properties/relationship types. The CLI adds `okb property` and `okb relationship` alongside `okb slot`.
- `okb export` writes instance data for graph databases (JSON or openCypher).

### v2.2

- **Edge properties.** Relationships can declare properties for their edges (`condition`, `strength`...), with facets checked by the new `slot-edge-properties` rule, plus a reserved `rule` reference to the Rule that justifies the link. New glossary entry `concept.edge-property` and decision guide `decision.edge-or-class` (edge property vs. making the relationship its own class). Both are marked as toolkit concepts: Ontology 101's frame model has no relationship properties.

### v2.3

- **Question families.** A competency question stands for a type of question (the paper: "just a sketch" and "do not need to be exhaustive"). The new judgment rule `scope-cq-families` asks, once a question is answered, whether the ontology should also answer its family: the same question about similar things, and related questions about the same thing. Anything not wanted is recorded as out of scope. `okb cq link` and `okb cq set --status answerable` suggest the family from what's already built, and `okb review` lists every family. Step 1 now says not to list every question up front, and Step 8 asks about families.
- `scope-no-unneeded` now suggests adding the question an element serves before removing the element.

### v2.3.1

- **Skills state their version.** Each shipped skill starts with `**Version X.Y.Z.**`, matching the meta-KB, and checks it against `okb version` when it starts; if they differ, it says which is out of date. Changing a skill's instructions now bumps the version (a patch for skill-only changes), and the docs drift check fails if a skill's version lags.

### v2.4.0

- **Authored rules.** `authored` is a documented Rule field (`okb rule add --authored`, with `extracted: false`). It is shown in `okb rule list` and `okb show` and exported on `OkbRule`. Authored rules keep `prov-cites-quote` and `prov-verified`.
- **Qualifier values on Rules.** A Rule can carry `values{slotId: value}` for slots declared with `okb slot add ... --on-rules` (`appliesToRules`), checked like instance values (`okb rule add --value condition=open`). Rules have no inheritance: nothing is inherited through `REFINES`, and no class named `Rule` is involved.
- **`REFINES` (Rule → Rule, optional `adds`) and `FULFILLS` (Instance → Rule)** edges, set with `okb rule refines` and `okb fulfills`, and exported. The format registry gains `optionalProps` for edge types.
- **`okb cite <node> <quote id>`** attaches an existing quote to a node.
- New glossary entries: `concept.prescriptive-vs-descriptive`, `concept.rule-qualifier`, `concept.rule-refines`, `concept.rule-fulfills`, `concept.authored-rule`.

### v2.4.1

- **Skills point at the docs site.** The three shipped skills now send readers to the Installation page for updating, and to `https://ontology-kit.dev/llms.txt` (an index of every docs page, each also served as markdown) instead of the README. No rule changed.

### v2.4.2

- **Skills install with `okb skills install`.** The setup step in the three shipped skills now asks the user to install okb from npm, and offers `okb skills status` and `okb skills install` when the skill and okb versions differ. No rule changed.

### v2.4.3

- **A "docs changed" path in the extraction skill.** `build-domain-kb-from-docs` now starts a re-sync from `okb source refresh --all --json`: gone quotes first (with the rules and facts that cite them), then the worklist of new, changed and removed blocks. A Source node gets an optional `blocks` list (a hash per quotable block) to compare against.
