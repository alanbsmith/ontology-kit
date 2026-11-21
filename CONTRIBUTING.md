# Contributing

This page is for changing Ontology Kit itself. To use it, start with the [Introduction](docs/getting-started/introduction.md). [CLAUDE.md](CLAUDE.md) holds the deeper architecture notes that Claude Code reads.

## Setup

You need Node.js 26 (see [Installation](docs/getting-started/installation.md)). Install [pnpm](https://pnpm.io/installation) (`npm i -g pnpm`; Node 26 doesn't bundle Corepack, and `package.json` pins the version in `packageManager`), then run `pnpm install` in the repo root. The repo is a pnpm workspace, so that one install covers `packages/okb` and the docs site (`site/`) too. To put `okb` on your PATH, run `pnpm add --global link:./packages/okb`.

## Repository layout

```text
packages/okb/           @ontology-kit/okb: the CLI and library (a pnpm workspace package)
  bin/okb.js            launcher (pnpm add --global link:./packages/okb target)
  src/                  okb source (TypeScript, Node type stripping)
    cli.ts ops.ts ops/  commands and the operations behind them (ops/ split by reason to change)
    checks.ts status.ts validator (one check per rule) and step progress
    model.ts types.ts   graph model and the typed okb file format
    relationships.ts    how relationship values are stored as edges (inverses, renames, removal)
    naming.ts errors.ts naming conventions; OkbError
    metakb.ts render.ts meta-KB access, terminal output
    export.ts review.ts graph-database export, judgment-rule review
    markdown.ts provenance.ts   markdown reader; sources, quotes, extracted rules, verification
    quotes.ts gendocs.ts        verbatim-quote matching, doc generator
  meta-kb/src/*.yaml    the meta-KB source (edit these)
  meta-kb/data/*.json   the compiled meta-KB (pnpm build:meta)
  meta-kb/build.ts      compiler + integrity checks + quote verification
  examples/             build-wine.ts, lib/tutorial.ts → examples/wine/ (pnpm example)
  skills/               SKILL.md files for Claude
  tests/                node:test suites (also the docs site's tests)
site/                   the docs site (Astro; a private workspace package, reads the markdown in place)
docs/                   METHOD/GLOSSARY/RULES/DECISIONS are generated (pnpm run docs)
sources/                the source PDFs (gitignored; see sources/README.md)
scripts/                repo-wide tooling (vale.sh)
.claude/skills/         development skills (docs drift check, tutorial and Learn page writing)
```

The root `package.json` is a private workspace root that holds the repo-wide tooling (Prettier, `markdownlint-cli2`, Vale) and scripts that run across the packages. The `docs/` folder and `sources/` stay at the root because they describe the whole kit, not one package. New packages go under `packages/`.

## Changing rules

Edit `packages/okb/meta-kb/src/*.yaml`, then:

```bash
pnpm verify:quotes   # rebuild + check every quote word-for-word against the PDFs
pnpm run docs        # regenerate docs/
pnpm test
```

The build fails if a rule cites a quote that doesn't exist, if a mechanical rule has no check in `packages/okb/src/checks.ts` (or a check has no rule), or if a step's checklist refers to a status check that isn't implemented. See the [meta-KB internals](packages/okb/meta-kb/README.md) for the schema and the full editing steps, including when to bump the version.

## The docs site

The docs in this repo are also published as a website at [ontology-kit.dev](https://ontology-kit.dev), with search, a side-panel menu, light and dark themes and reading settings. It's an [Astro](https://astro.build) site in `site/` that reads these markdown files in place, so there's nothing to copy or keep in sync. To build it, or to work on it with live reload:

```bash
pnpm site           # regenerate docs/, then build the site into site/dist (with the search index)
pnpm site:dev       # the same, served at http://localhost:4321 while you edit
```

Pages and the menu are listed in `site/src/nav.ts`; a test fails if a file in `docs/` isn't in it. Search only works on the built site (`pnpm --filter ontology-kit-docs preview`). Netlify builds and hosts it from `netlify.toml`.

## Writing style

The beginner pages are `docs/getting-started/*.md`, `docs/learn/*.md`, `docs/build/*.md` and `packages/okb/examples/*/tutorial-src/*.md`. They're written for a developer who is new to ontologies and has a problem to solve, not a vocabulary to learn. `pnpm lint:docs` applies extra Vale rules to these paths (the `Beginner` style in `.vale/styles/Beginner`). The reference docs (METHOD, RULES, FORMAT and so on) keep the normal rules.

### Page format

Every page on the docs site starts with its `# Title` heading, before any paragraph, callout or other content. The site takes the page title from that heading, and a consistent opening makes the pages read the same.

Generated pages (METHOD, GLOSSARY, RULES, DECISIONS) keep their "Generated from … Don't edit by hand" warning as an HTML comment right after the heading. Never show it as a visible callout: readers of the site don't need it, and an invisible comment still warns anyone who opens the source. `packages/okb/tests/site.test.ts` enforces both rules for every page.

### Tutorials

The wine tutorial is written in `packages/okb/examples/wine/tutorial-src/*.md`, one file per page (`0-intro.md`, `1-scope.md` and so on). A source is plain prose plus code blocks tagged `okb` that hold only commands, one per line, each starting with `okb`:

````markdown
```okb
okb class add Wine --desc "A specific wine."
```
````

A block tagged `include` holds a file name and shows that file's contents, such as the diagram an earlier command wrote. Add the word `fails` after the `okb` tag for a command that must fail, such as a mistake you want to show. `pnpm example` runs every command in file order with the real CLI, then writes the finished pages to `packages/okb/examples/wine/tutorial/` (with each command and its output), a graph snapshot after each step to `packages/okb/examples/wine/tutorial/graph/`, and `TRANSCRIPT.md`. A command that fails stops the build and names the file and command. Never edit the generated files. To add a tutorial, copy the layout in `packages/okb/examples/lib/tutorial.ts` and add its pages to `site/src/nav.ts`. The `write-tutorial` skill (`.claude/skills/write-tutorial/SKILL.md`) has the page layout, voice, link and command-block conventions that keep tutorials alike. Read it before you write or review one.

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
pnpm tsc                                                  # typecheck
pnpm test                                                 # all suites; also rebuilds the wine example
pnpm lint:docs                                           # Prettier, markdownlint and Vale on the docs
node .claude/skills/okb-docs-drift/scripts/check-docs.ts # docs and skills still match the CLI
```

`pnpm test` regenerates tracked files (`packages/okb/meta-kb/data/*.json` and everything in `packages/okb/examples/wine/` except `tutorial-src/`). A diff in `packages/okb/examples/wine/` after a refactor means CLI output changed, so check it. Make one commit per change, and keep refactors apart from behavior changes.
