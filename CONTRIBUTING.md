# Contributing

This page is for changing Ontology Kit itself. To use it, start with the [Introduction](docs/getting-started/introduction.md). [CLAUDE.md](CLAUDE.md) holds the deeper architecture notes that Claude Code reads.

## Setup

You need Node.js 24+ (see [Installation](docs/getting-started/installation.md)). Then `npm install` in the repo root.

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
site/                   the docs site (Astro; its own npm package, reads the markdown in place)
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

The build fails if a rule cites a quote that doesn't exist, if a mechanical rule has no check in `src/checks.ts` (or a check has no rule), or if a step's checklist refers to a status check that isn't implemented. See the [meta-KB internals](meta-kb/README.md) for the schema and the full editing steps, including when to bump the version.

## The docs site

The docs in this repo are also published as a website at [ontology-kit.dev](https://ontology-kit.dev), with search, a side-panel menu, light and dark themes and reading settings. It's an [Astro](https://astro.build) site in `site/` that reads these markdown files in place, so there's nothing to copy or keep in sync. To build it, or to work on it with live reload:

```bash
npm ci --prefix site   # once
npm run site           # regenerate docs/, then build the site into site/dist (with the search index)
npm run site:dev       # the same, served at http://localhost:4321 while you edit
```

Pages and the menu are listed in `site/src/nav.ts`; a test fails if a file in `docs/` isn't in it. Search only works on the built site (`npm --prefix site run preview`). Netlify builds and hosts it from `netlify.toml`.

## Before you commit

Run these after every change. All of them must pass:

```bash
npx tsc                                                  # typecheck
npm test                                                 # all suites; also rebuilds the wine example
npm run lint:docs                                        # Prettier, markdownlint and Vale on the docs
node .claude/skills/okb-docs-drift/scripts/check-docs.ts # docs and skills still match the CLI
```

`npm test` regenerates tracked files (`meta-kb/data/*.json` and everything in `examples/wine/`). A diff in `examples/wine/` after a refactor means CLI output changed, so check it. Make one commit per change, and keep refactors apart from behavior changes.
