# Contributing

This page is for changing Ontology Kit itself. To use it, start with the [Introduction](docs/getting-started/introduction.md). [CLAUDE.md](CLAUDE.md) holds the deeper architecture notes that Claude Code reads.

## Setup

You need Node.js 26 (`.nvmrc` has the version; okb itself runs on Node 24 or newer, which is all a reader of the [Installation](docs/getting-started/installation.md) page needs). Install [pnpm](https://pnpm.io/installation) (`npm i -g pnpm`; Node 26 doesn't bundle Corepack, and `package.json` pins the version in `packageManager`), clone the repo, and run `pnpm install` in its root. The repo is a pnpm workspace, so that one install covers `packages/okb` and the docs site (`site/`) too. To run okb from your clone, use `node packages/okb/src/cli.ts <command>`, or put `okb` on your PATH with `pnpm add --global link:./packages/okb`. The link points at your clone, so `okb` runs your changes right away, and `okb skills install` links the skills from it. Unlink with `pnpm remove --global @ontology-kit/okb` before you install the published package.

```bash
git clone https://github.com/alanbsmith/ontology-kit
cd ontology-kit
pnpm install
pnpm test
```

## Repository layout

```text
packages/okb/           @ontology-kit/okb: the CLI and library (a pnpm workspace package)
  bin/okb.js            launcher (pnpm add --global link:./packages/okb target): runs src/ in a checkout, dist/ when installed
  tsconfig.build.json   compiles src/ to dist/ (gitignored; pnpm build)
  README.md LICENSE     the package's npm page
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
packages/ontology-kit/  ontology-kit: the unscoped wrapper, just a bin that forwards to @ontology-kit/okb
site/                   the docs site (Astro; a private workspace package, reads the markdown in place)
docs/                   METHOD/GLOSSARY/RULES/DECISIONS are generated (pnpm run docs)
sources/                the source PDFs (gitignored; see sources/README.md)
scripts/                repo-wide tooling (vale.sh)
.claude/skills/         development skills (docs drift check, tutorial and Learn page writing)
```

The root `package.json` is a private workspace root that holds the repo-wide tooling (Prettier, `markdownlint-cli2`, Vale) and scripts that run across the packages. The `docs/` folder and `sources/` stay at the root because they describe the whole kit, not one package. New packages go under `packages/`.

## Build and pack

Development runs the TypeScript sources, so `pnpm test` needs no build. The published package ships compiled JavaScript, because Node won't strip types from files under `node_modules`. `pnpm build` compiles `packages/okb/src/` to `packages/okb/dist/` (`tsconfig.build.json`; `dist/` is gitignored). `bin/okb.js` runs `src/cli.ts` when `src/` exists (a clone) and `dist/cli.js` otherwise (an installed package). The `development` condition in the `exports` map points at the sources and the default condition at `dist/`, so tools that run with `--conditions=development` stay on the sources.

The `files` allowlist in `packages/okb/package.json` holds `bin`, `dist`, `meta-kb/data`, `skills`, the README and LICENSE; it leaves out the YAML sources, docs, site, tests, examples and PDFs. Code that reads the package's own files resolves them from the package root, so it works in a clone and in an installed package (`META_DIR` in `metakb.ts`). `packages/okb/tests/package.test.ts` runs `pnpm pack` on both packages, installs the tarballs into a temp folder and runs the installed `okb` (a few seconds; set `OKB_SKIP_PACKAGE_TEST=1` to skip it). Both packages keep the same version; a test fails if they differ. Publishing is done by the release workflow, described under [Releases](#releases).

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

## Checks that run on every PR

GitHub Actions (`.github/workflows/ci.yml`) runs on every pull request and every push to `main`. Each job is a separate status check:

| Check           | What it runs                                                                                     | Run it locally                                                               |
| --------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Typecheck       | `pnpm tsc`                                                                                       | `pnpm tsc`                                                                   |
| Build and test  | `pnpm build`, then `pnpm test`                                                                   | `pnpm build && pnpm test`                                                    |
| Generated files | Regenerates everything, then fails if `git status` shows a change                                | `pnpm build:meta && pnpm run docs && pnpm example`, then `git status`        |
| Docs            | The docs drift check, then `pnpm lint:docs` (Vale errors fail; warnings and suggestions don't)   | `node .claude/skills/okb-docs-drift/scripts/check-docs.ts && pnpm lint:docs` |
| Site            | `pnpm site`                                                                                      | `pnpm site`                                                                  |
| Node 24 runtime | Packs both packages, installs them on Node 24, runs `okb version`, `okb init` and `okb validate` | `pnpm test` runs the same on your Node; use `nvm use 24` to try the floor    |

The Generated files check catches a rule, command or tutorial change that you didn't regenerate. The release workflow reuses the whole workflow (it has a `workflow_call` trigger), so a release only publishes after these checks pass. Local runs don't need Vale installed for the other checks, but `pnpm lint:docs` does (`brew install vale`).

## Releases

### What the versions mean

Two version numbers exist, and `okb version` prints both: `okb 0.1.0 · meta-KB 2.4.1`.

- **The package version** is semver over everything a user or another tool depends on: the CLI (command and flag names, exit codes and the `--json` output), the file format (`okb-lpg/2`, and reading older formats), and the `@ontology-kit/okb/format` exports. `@ontology-kit/okb` and the unscoped `ontology-kit` wrapper always release together at the same version. `okb version` reads it from `package.json`.
- **The meta-KB version** covers the method and the rules (`VERSION` in `packages/okb/meta-kb/build.ts`). Each ontology's `okb.json` records the one it started with. [Changing rules](#changing-rules) says when to bump it.

The two move separately, with one link. The meta-KB ships inside the package, so any change to it reaches users only in a package release. A meta-KB bump (a rule changes meaning, or a skill's instructions change) therefore needs a package release that carries it, at least a minor one while the version is 0.x. A package change that leaves the rules alone, such as a CLI fix, doesn't bump the meta-KB.

**What counts as breaking** (a major version from 1.0 on):

- A command, flag or `--json` field removed or renamed, or an exit code changed.
- A file the previous version read and validated structurally (`struct-well-formed`) that the new version rejects, or a format change with no automatic conversion of the older one.
- A breaking change to the `@ontology-kit/okb/format` exports, as [the format reference](docs/FORMAT.md#versions-and-semver) lists.
- Raising the Node floor.

New or tightened rules are not breaking by themselves, even when a rule's severity is error: the method is what the meta-KB exists to sharpen, and its version tells a user which rules their ontology was started with. New commands, flags, exports and rules are minor; fixes are patches.

### What 0.x means

Versions before 1.0 promise nothing: any release may change the CLI, the file format or the format API, and the changelog says what did. The first release is 0.1.0 so that nobody reads it as stable. 1.0 means the CLI, the file format and the format API are stable under the rules above. Before 1.0:

- The command and flag names, exit codes and `--json` shapes have been used for a while without renames, and the docs and skills describe all of them.
- The file format has a documented upgrade path, and the `okb-lpg/2` files in the wild load without changes.
- `@ontology-kit/okb/format` has been used by a real outside tool (the okb-mcp server is the candidate) without needing breaking changes.
- Releases have gone out through the workflow below, with trusted publishing and provenance, a few times without manual fixes.

### The changelog

[`docs/CHANGELOG.md`](docs/CHANGELOG.md) holds both histories: package releases first, newest first, then the meta-KB versions. Each release has a `### X.Y.Z (YYYY-MM-DD)` entry, and the workflow publishes that entry as the GitHub release notes.

### Cutting a release

1. On a branch from `main`, set the same `version` in `packages/okb/package.json` and `packages/ontology-kit/package.json`.
2. In `docs/CHANGELOG.md`, add the entry under `## Package releases` (or change `(unreleased)` in the existing heading to the date) and write what changed.
3. Run `node scripts/release.ts check`. It fails if the versions differ or the entry is missing, empty or undated. Then run the [usual checks](#before-you-commit), and merge the change to `main`.
4. Tag the merged commit and push the tag:

```bash
git switch main && git pull
git tag -a v0.1.0 -m "v0.1.0"
git push origin v0.1.0
```

The tag must be `v` plus the version. The release workflow (`.github/workflows/release.yml`) then checks that the tag, both versions and the changelog entry agree and that the tag is on `main`; runs the whole CI workflow; builds and packs both packages; publishes `@ontology-kit/okb` and then `ontology-kit` to npm; and creates the GitHub release with the changelog entry as its notes. A run that is repeated skips a version already on npm, so it can finish a release that stopped halfway. To try everything except the publish, run the workflow by hand from the Actions tab with `dry-run` on (the default).

### One-time npm setup

The workflow holds no npm token. It publishes with [trusted publishing](https://docs.npmjs.com/trusted-publishers): npm accepts a short-lived identity token that GitHub issues for the exact repository, workflow file and environment you configured, and records provenance for each version. This needs npm 11.5.1 or newer, which the workflow checks. It runs `npm publish` on the packed tarballs: `pnpm pack` rewrites the wrapper's `workspace:*` dependency to the real version, and `npm publish` is the client npm documents for the token exchange.

npm can configure a trusted publisher only for a package that already exists, so the first version of each package is published by hand once. The owner does this, with 2FA, from a clone on Node 26:

1. Own the `@ontology-kit` organization on npm (done) and be signed in: `npm login`.
2. Publish a pre-release of both packages under a side tag, so the real first release is still 0.1.0 and has provenance. In both `package.json` files set `version` to `0.1.0-bootstrap.0` (don't commit this), then:

   ```bash
   pnpm install --frozen-lockfile
   mkdir /tmp/okb-bootstrap
   pnpm --filter @ontology-kit/okb pack --pack-destination /tmp/okb-bootstrap
   pnpm --filter ontology-kit pack --pack-destination /tmp/okb-bootstrap
   npm publish /tmp/okb-bootstrap/ontology-kit-okb-0.1.0-bootstrap.0.tgz --access public --tag bootstrap
   npm publish /tmp/okb-bootstrap/ontology-kit-0.1.0-bootstrap.0.tgz --access public --tag bootstrap
   git checkout -- packages/okb/package.json packages/ontology-kit/package.json
   ```

3. For each package (`@ontology-kit/okb`, then `ontology-kit`), on npmjs.com open **Settings → Trusted Publisher → GitHub Actions** and enter repository owner `alanbsmith`, repository `ontology-kit`, workflow filename `release.yml` and environment `release`. The `npm trust github <package> --file release.yml --repo alanbsmith/ontology-kit --env release --allow-publish` command does the same. The fields are case-sensitive and npm doesn't check them when you save, so a typo shows up as a failed publish. Cut the first release soon after: npm drops a trusted-publisher setup that sees no publish for a while.
4. On GitHub, under **Settings → Environments**, the `release` environment is created by the first run. Add required reviewers there if you want to approve each publish, and limit it to `v*` tags. This is optional.
5. Optionally, on each package's **Settings → Publishing access**, choose "Require two-factor authentication and disallow tokens". Trusted publishing keeps working.

If npm lets you configure the trusted publisher before the package exists, skip step 2 and go straight to tagging.

## Before you commit

Run these after every change. All of them must pass:

```bash
pnpm tsc                                                  # typecheck
pnpm test                                                 # all suites; also rebuilds the wine example
pnpm lint:docs                                           # Prettier, markdownlint and Vale on the docs
node .claude/skills/okb-docs-drift/scripts/check-docs.ts # docs and skills still match the CLI
```

`pnpm test` regenerates tracked files (`packages/okb/meta-kb/data/*.json` and everything in `packages/okb/examples/wine/` except `tutorial-src/`). A diff in `packages/okb/examples/wine/` after a refactor means CLI output changed, so check it. Make one commit per change, and keep refactors apart from behavior changes.
