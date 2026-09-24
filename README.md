# Ontology Kit

## Overview

A toolkit that walks a beginner through building their first ontology, following the method in **Ontology Development 101** (Noy & McGuinness, 2001). It has three parts:

| Part                     | What it is                                                                                                                                                                                                                                                                                   |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **meta-KB** (`meta-kb/`) | A knowledge base _about building knowledge bases_: the 8-step method, 35 glossary concepts, 7 principles, 10 decision guides and 56 rules. Every rule cites a verbatim, page-checked quote from the paper (or Gruber 1993), or says plainly that it's a toolkit convention.                  |
| **okb** (`src/`)         | A command-line tool that creates the ontology one step at a time, refuses common mistakes as you make them, checks everything against the meta-KB rules, and explains every finding in plain language.                                                                                       |
| **Skills** (`skills/`)   | Instructions for Claude: **ontology-coach** (hand-holding from a blank page), **ontology-review** (a second opinion on the judgment rules a script can't check) and **build-domain-kb-from-docs** (extracting an ontology from existing documentation with a quote-first verification gate). |

## Getting started

1. Read the 2-minute version: an ontology is a precise, shared vocabulary for one subject. It says what _kinds_ of things exist (classes), how they're organized ("a Red Wine is a kind of Wine"), what you can say about them (slots like `body` or `maker`), and the rules for filling those in (facets). Add real examples (instances) and you have a knowledge base.
2. Skim the worked example: **[examples/wine/TRANSCRIPT.md](examples/wine/TRANSCRIPT.md)** builds the paper's wine ontology command by command, with real output.
3. Start your own.

   Either ask Claude to `coach me through building an ontology` (uses the ontology-coach skill). To add the skill, [install okb](#installation), then link the skill from this folder:

   ```bash
   mkdir -p ~/.claude/skills
   ln -s "$PWD/skills/ontology-coach" ~/.claude/skills/ontology-coach
   ```

   Claude Code and Cursor both load skills from `~/.claude/skills/`, and the link keeps the skill current when you update this repo. Start it by asking, or with `/ontology-coach`. The other skills in `skills/` install the same way.

   Or run it yourself:

   ```bash
   okb init my-ontology --name "My Ontology"
   cd my-ontology
   okb status          # where you are and what's next, at any time
   okb step            # the guide for the current step
   okb explain range   # plain-language explanation of any term, rule or step
   okb validate        # check your work (only rules relevant to your current step)
   ```

## Installation

Needs **Node.js 24+** (okb runs its TypeScript source directly; there's no build step).

```bash
cd ontology-kit
npm install          # one runtime dependency (yaml, for markdown frontmatter); the rest are dev tools
npm link             # puts `okb` on your PATH (or use: node src/cli.ts ...)
npm test             # the test suite, including building the wine example end to end
```

`pdftotext` (`brew install poppler`) is optional: okb uses it to check quotes against PDFs, and falls back to the optional `pdfjs-dist` package without it.

## The method

| Step         | You'll produce                                                                            | Key commands                                                                                         |
| ------------ | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1. Scope     | domain, purpose, users, out-of-scope, 3+ competency questions                             | `okb scope`, `okb cq add`                                                                            |
| 2. Reuse     | what existing vocabularies you considered                                                 | `okb reuse add`, `okb reuse none`                                                                    |
| 3. Terms     | an unsorted brainstorm list                                                               | `okb term add`                                                                                       |
| 4. Classes   | naming convention, class hierarchy, disjointness                                          | `okb convention`, `okb class add`, `okb class disjoint`, `okb tree`                                  |
| 5. Slots     | properties (values) and relationships (links), attached at the right level                | `okb property add`, `okb relationship add`, `okb show`                                               |
| 6. Facets    | value types, allowed values, ranges, cardinality, fixed values, inverses, edge properties | `okb slot set`, `okb class fix`, `okb relationship inverse`, `okb relationship property`, `okb link` |
| 7. Instances | real examples, which test the steps before                                                | `okb instance add`                                                                                   |
| 8. Review    | questions linked to what answers them, decisions recorded                                 | `okb cq link`, `okb validate --all`, `okb decision add`                                              |

When it's built, `okb export --format cypher --out my.cypher` writes the data for a graph database: instances as nodes labeled with their class chain, properties on the nodes, relationships as typed edges.

Building from existing documentation? `okb source add docs/button.md` reads markdown (frontmatter, headings, lists, callouts, prop tables) and `okb quote add` finds your quote in it by heading and line. The full quote-first pipeline is in [docs/EXTRACTION-PIPELINE.md](docs/EXTRACTION-PIPELINE.md).

Full guide: [docs/METHOD.md](docs/METHOD.md) · Terms: [docs/GLOSSARY.md](docs/GLOSSARY.md) · Every rule and its source: [docs/RULES.md](docs/RULES.md) · Modeling choices: [docs/DECISIONS.md](docs/DECISIONS.md) · File format: [docs/FORMAT.md](docs/FORMAT.md)

## Findings

- **Errors** (MUST rules): fix them.
- **Warnings** (SHOULD rules): fix them, _or_ record a design decision that explains why not. For example, `okb decision add --title "..." --decision "..." --why "..." --about Sauternes --waives naming-singular-plural-consistent`. Explained warnings stop counting against you but stay visible.
- **Hints** (MAY rules): prompts to think about; nothing to fix.
- Warnings and hints appear once you reach the step they belong to. Errors always appear. `okb validate --all` shows everything.
- The **ontology-review** skill covers what a script can't judge, such as whether siblings are equally general or whether something should be a class or a value. It works through the `judgment` rules with you.

## Repository layout

```text
bin/okb.js              launcher (npm link target)
src/                    okb source (TypeScript, Node 24 type stripping)
  cli.ts ops.ts ops/    commands and the operations behind them (ops/ split by reason to change)
  checks.ts status.ts   validator (one check per rule) and step progress
  model.ts types.ts     graph model and the typed okb file format
  relationships.ts      how relationship values are stored as edges (inverses, renames, removal)
  naming.ts errors.ts   naming conventions; OkbError
  metakb.ts render.ts   meta-KB access, terminal output
  export.ts review.ts   graph-database export, judgment-rule review
  markdown.ts provenance.ts   markdown reader; sources, quotes, extracted rules, verification
  quotes.ts gendocs.ts  verbatim-quote matching, doc generator
meta-kb/src/*.yaml      the meta-KB source (edit these)
meta-kb/data/*.json     the compiled meta-KB (npm run build:meta)
meta-kb/build.ts        compiler + integrity checks + quote verification
docs/                   METHOD/GLOSSARY/RULES/DECISIONS are generated (npm run docs)
examples/               build-wine.ts → examples/wine/ (npm run example)
skills/                 SKILL.md files for Claude
sources/                the source PDFs (gitignored; see sources/README.md)
tests/                  node:test suites
```

## Changing rules

Edit `meta-kb/src/*.yaml`, then:

```bash
npm run verify:quotes   # rebuild + check every quote word-for-word against the PDFs
npm run docs            # regenerate docs/
npm test
```

The build fails if a rule cites a quote that doesn't exist, if a mechanical rule has no check in `src/checks.ts` (or a check has no rule), or if a step's checklist refers to a status check that isn't implemented. See [`meta-kb/README.md`](meta-kb/README.md).
