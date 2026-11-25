# Changelog

What changed in each release. `okb version` prints two versions, the package's and the meta-KB's. The package version covers the CLI, the file format and the `@ontology-kit/reader` exports. The meta-KB version covers the method and rules, and each ontology's `okb.json` records the one it started with (`metaKbVersion`). [Releases](../CONTRIBUTING.md#releases) says how the two relate and what the numbers promise. How to edit the meta-KB, and when to bump its version, is in the [meta-KB internals](../packages/okb/meta-kb/README.md).

Package releases come first, newest first, in the [Keep a Changelog](https://keepachangelog.com) style. The release workflow publishes a version's entry as its GitHub release notes, so each entry sits under a `### <version>` heading with a date.

## Package releases

### 0.2.0 (2026-11-24)

#### Breaking changes

- refactor(reader)!: Rename @ontology-kit/format to @ontology-kit/reader ([#146](https://github.com/alanbsmith/ontology-kit/pull/146))
  The package name changed. To upgrade, change the dependency and every import from `@ontology-kit/format` to `@ontology-kit/reader`. The exports are the same. `@ontology-kit/format` 0.1.0 stays installable and will be deprecated with a pointer to the new name once the next release is out.

#### CLI

- feat(okb): Add the tools, format changes and skills for maintaining a KB ([#140](https://github.com/alanbsmith/ontology-kit/pull/140), [@alanbsmith](https://github.com/alanbsmith))
  okb now supports keeping a knowledge base in git over time. New commands: `okb diff`, `okb check`, `okb pin`, `okb release`, `okb source refresh --all`, `okb docs` (with `--changed` and `--context` review views), and `okb verify --ref` with suggested notes. The file format moves to `okb-lpg/3` (one node or edge per line, ids that two branches can't both create, created and updated stamps); older folders are migrated when okb next saves them. Two new skills, `ontology-maintainer` and `ontology-signoff`, drive these flows. See the new maintainer workflow and sign-off pages in the Build section of the docs.

#### Format

- refactor(reader)!: Rename @ontology-kit/format to @ontology-kit/reader ([#146](https://github.com/alanbsmith/ontology-kit/pull/146), [@alanbsmith](https://github.com/alanbsmith))
  `@ontology-kit/format` is now `@ontology-kit/reader`. It is the library other tools use to read an okb folder, with the same exports as before. Writes to an ontology go through the `okb` command; the write methods on `Ontology` are internal and may change in any release. See "Reading ontologies from code" in the file format reference.

#### Documentation

- docs: Add steps for publishing a new package ([#147](https://github.com/alanbsmith/ontology-kit/pull/147), [@alanbsmith](https://github.com/alanbsmith))

#### Infrastructure

- ci: Standardize commits, PR descriptions and the changelog ([#128](https://github.com/alanbsmith/ontology-kit/pull/128), [@alanbsmith](https://github.com/alanbsmith))
- chore: Add codeowners ([#131](https://github.com/alanbsmith/ontology-kit/pull/131), [@alanbsmith](https://github.com/alanbsmith))
- chore: Add GitHub issue templates ([#134](https://github.com/alanbsmith/ontology-kit/pull/134), [@alanbsmith](https://github.com/alanbsmith))
- chore: Make the spike template free-form ([#136](https://github.com/alanbsmith/ontology-kit/pull/136), [@alanbsmith](https://github.com/alanbsmith))
- chore: Count a written answer as a spike outcome ([#137](https://github.com/alanbsmith/ontology-kit/pull/137), [@alanbsmith](https://github.com/alanbsmith))

#### Other

- Add Dependabot for GitHub Actions ([#122](https://github.com/alanbsmith/ontology-kit/pull/122), [@alanbsmith](https://github.com/alanbsmith))
- Add Dependabot for npm dependencies ([#123](https://github.com/alanbsmith/ontology-kit/pull/123), [@alanbsmith](https://github.com/alanbsmith))

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

### v2.5.0

- **A skill for maintainers.** The new `ontology-maintainer` skill looks after an existing KB that is kept in git with `okb check` in CI. It starts from `okb status`, `okb check` and `okb source refresh --all --json`, then runs one of six flows: the source documents changed, a requested fix, a new rule or source, a rename, a pull request for a reviewer, and a release. It hands extraction and verification to `build-domain-kb-from-docs` and modeling questions to `ontology-review`, and it never runs `okb verify --approve`. No rule changed.

### v2.6.0

- **Verification notes are cheap to write.** The four skills now say when a note helps (OVERREACH, UNSUPPORTED, an approval that rests on a conversation) and what a good one looks like, and `docs/EXTRACTION-PIPELINE.md` and the maintaining guide match. No rule changed.
- **A skill for sign-off.** The new `ontology-signoff` skill walks a subject-matter expert or a pull request reviewer through confirming that a KB's rules are right. It reads `okb check`, `okb diff`, `okb docs --changed` and `okb docs --context`, shows each rule beside its quote and the source text around it (riskiest first), asks for one decision at a time and ends with a summary to paste as a review comment. It runs `okb verify --approve` only when the person says yes to that named rule, and it never changes the KB for anything else. It sends the maintainer to `ontology-maintainer` when a source changed without a re-sync. No rule changed.

### v2.6.1

- **Skill corrections.** `build-domain-kb-from-docs` now removes the old quote once every node that cited it has a new one, so a refresh doesn't report it gone again. `ontology-coach` says when to use UNSUPPORTED instead of OVERREACH and warns that `--corrected` leaves a rule's modality unchanged, so a correction from MUST to SHOULD needs the rule added again before sign-off. `ontology-maintainer` reads the rest of a changed block after a gone quote is handled and asks for a fresh verification pass after any re-cited fix. `ontology-signoff` flags a reworded rule whose strength changed instead of approving it. No rule changed.

### v2.6.2

- **A corrected rule keeps its strength in step.** When `okb verify --status OVERREACH --corrected` gives a rule a statement with a different MUST, SHOULD or MAY, okb now changes the rule's `modality` to match and says so. `ontology-coach` and `ontology-signoff` tell the person who approves it that the strength changed, and replace the earlier advice to remove and re-add the rule, which would have lost its links. No rule changed.

### v2.6.3

- **The skills say when okb changes a rule's strength.** `ontology-coach` and `ontology-signoff` said okb always changes a rule's `modality` to match a corrected statement. It does so only when the statement names exactly one of MUST, MUST NOT, SHOULD, SHOULD NOT or MAY and it differs; with none, or two different ones, it leaves the strength as it was. The skills now say that, and tell the approver to check the stored strength by hand in that case. `okb verify` also reads `MUST NOT` and `SHOULD NOT` split across a line break as one keyword. No rule changed.
