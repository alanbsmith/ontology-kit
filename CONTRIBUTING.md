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

## Writing style

The beginner pages are `docs/getting-started/*.md`, `docs/learn/*.md`, `docs/build/*.md` and `examples/*/tutorial-src/*.md`. They're written for a developer who is new to ontologies and has a problem to solve, not a vocabulary to learn. `npm run lint:docs` applies extra Vale rules to these paths (the `Beginner` style in `.vale/styles/Beginner`). The reference docs (METHOD, RULES, FORMAT and so on) keep the normal rules.

### Explain, don't just describe

A description says what something is. An explanation says why you'd care and how it plays out. Write the way you'd answer a colleague's question. After every definition, cover three things:

1. **The problem it solves.** What goes wrong without it?
2. **What it looks like in practice.** Show a small, concrete example.
3. **What to do next.** Link the step or command that uses it.

Reviewers use these pairs as the bar. If a paragraph reads like the left column, rewrite it.

#### A concept

- Describe: "A facet constrains the values of a slot."
- Explain: "You want every wine's body to be light, medium or full, never 'pretty strong'. A facet is how you say that. Without one, `okb validate` can't catch a typo like `medum`."

#### A rule

- Describe: "`hier-no-cycles`: the class hierarchy must be acyclic."
- Explain: "If Wine is a kind of Beverage and Beverage is a kind of Wine, every question about 'all beverages' loops forever. okb stops this with `hier-no-cycles`. When it fires, it names the two kinds in the loop. Delete one of the `is-a` links."

#### A step

- Describe: "Step 3 enumerates the important terms in the domain."
- Explain: "Before you design anything, write down the nouns people use when they talk about wine: grape, winery, vintage, body. Don't sort them yet. A messy list now saves you from missing a kind of thing later. Run `okb term add` for each one."

### Voice and structure

- **Write for one reader:** a developer who has never built an ontology. Say "you".
- **Examples before abstractions.** Show the wine, then name the idea.
- **One idea per paragraph.** If a paragraph needs "also" or "separately", split it.
- **Keep sentences short**, under about 25 words. Aim for a reading grade of 9 or lower.
- **Define a term on first use and link it** to its entry in the [glossary](docs/GLOSSARY.md). Link the first mention on each page, not every mention.
- **Lead with the task.** Put the command or action first and the theory after it.
- **Keep headings short**, three words at most.

### Plain words first

Beginner pages say "kind" before "class" and "property" before "slot", and introduce the formal word once, deliberately: "A _kind_ (the method calls it a class) ...". The `Beginner.Jargon` rule flags the formal words with a suggested swap. It's a warning to weigh, not an error. If the formal term is the point of the page, keep it and define it. Two rules are suggestions, not errors: `Beginner.Weasel` flags phrases that describe without explaining, and `Beginner.Readability` flags a page above grade 9.

Add new project terms to `.vale/styles/config/vocabularies/Okb/accept.txt` (it's case-sensitive).

## Before you commit

Run these after every change. All of them must pass:

```bash
npx tsc                                                  # typecheck
npm test                                                 # all suites; also rebuilds the wine example
npm run lint:docs                                        # Prettier, markdownlint and Vale on the docs
node .claude/skills/okb-docs-drift/scripts/check-docs.ts # docs and skills still match the CLI
```

`npm test` regenerates tracked files (`meta-kb/data/*.json` and everything in `examples/wine/`). A diff in `examples/wine/` after a refactor means CLI output changed, so check it. Make one commit per change, and keep refactors apart from behavior changes.
