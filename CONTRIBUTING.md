# Contributing

This page is for changing Ontology Kit itself. To use it, start with the [Introduction](docs/getting-started/introduction.md). [CLAUDE.md](CLAUDE.md) holds the deeper architecture notes that Claude Code reads.

## Setup

You need Node.js 26 (`.nvmrc` has the version; okb itself runs on Node 24 or newer, which is all a reader of the [Installation](docs/getting-started/installation.md) page needs). Install [pnpm](https://pnpm.io/installation) (`npm i -g pnpm`; Node 26 doesn't bundle Corepack, and `package.json` pins the version in `packageManager`), clone the repo, and run `pnpm install` in its root. The repo is a pnpm workspace, so that one install covers `packages/reader`, `packages/okb`, `packages/ontology-kit` and the docs site (`site/`) too. To run okb from your clone, use `node packages/okb/src/cli.ts <command>`, or put `okb` on your PATH with `pnpm add --global link:./packages/okb`. The link points at your clone, so `okb` runs your changes right away, and `okb skills install` links the skills from it. Unlink with `pnpm remove --global @ontology-kit/okb` before you install the published package.

```bash
git clone https://github.com/alanbsmith/ontology-kit
cd ontology-kit
pnpm install
pnpm test
```

## Repository layout

```text
packages/reader/        @ontology-kit/reader: the file-format reader (types, loading, relationship values; no CLI, no meta-KB)
  src/                  index.ts is the public allowlist; model.ts, relationships.ts, types.ts, naming.ts, errors.ts
  registry.ts (in src)  node and edge type names, generated from meta-kb/src/format.yaml by the meta-KB build
  tests/                node:test suites and a small fixture ontology
packages/okb/           @ontology-kit/okb: the CLI (a pnpm workspace package; depends on @ontology-kit/reader)
  bin/okb.js            launcher (pnpm add --global link:./packages/okb target): runs src/ in a checkout, dist/ when installed
  tsconfig.build.json   compiles src/ to dist/ (gitignored; pnpm build)
  README.md LICENSE     the package's npm page
  src/                  okb source (TypeScript, Node type stripping)
    cli.ts ops.ts ops/  commands and the operations behind them (ops/ split by reason to change)
    checks.ts status.ts validator (one check per rule) and step progress
    types.ts            findings and small guards (the file format's types are in packages/reader)
    naming.ts           naming style rules (PascalCase, plurals); the identity helpers come from packages/reader
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
brain/                  the project's why for planning sessions: decisions, open questions, milestone reasons, current state (start at brain/README.md)
docs/                   METHOD/GLOSSARY/RULES/DECISIONS are generated (pnpm run docs)
sources/                the source PDFs (gitignored; see sources/README.md)
scripts/                repo-wide tooling (vale.sh, release.ts, rewrite-dts.ts)
.claude/skills/         development skills (docs drift check, tutorial and Learn page writing)
```

The root `package.json` is a private workspace root that holds the repo-wide tooling (Prettier, `markdownlint-cli2`, Vale) and scripts that run across the packages. The `docs/` folder and `sources/` stay at the root because they describe the whole kit, not one package. New packages go under `packages/`.

The graph model, the typed file format and the relationship storage (`Ontology`, `Relationships`, the node types) live in `packages/reader`, and `packages/okb` imports them from `@ontology-kit/reader`. The class keeps its write methods, tagged `@internal`, so a change to how something is stored is still one change in one place; [the format reference](docs/FORMAT.md#why-a-package-of-its-own) explains where the line falls. A change to what `packages/reader/src/index.ts` exports is a version decision, and the allowlist test (`packages/reader/tests/reader-api.test.ts`) fails until you update it on purpose.

## Build and pack

Development runs the TypeScript sources, so `pnpm test` needs no build. The published package ships compiled JavaScript, because Node won't strip types from files under `node_modules`. `pnpm build` compiles `packages/reader/src/` and `packages/okb/src/` to each package's `dist/` (`tsconfig.build.json`; `dist/` is gitignored). The format build also writes `types-internal/` (gitignored, never published): declarations that keep the write methods, which okb's build compiles against because the published declarations leave them out. `bin/okb.js` runs `src/cli.ts` when `src/` exists (a clone) and `dist/cli.js` otherwise (an installed package). The `development` condition in okb's `exports` map points at the sources and the default condition at `dist/`, so tools that run with `--conditions=development` stay on the sources. The reader package does it the other way round, because okb imports it by name and must run on its sources without a flag or a build: its `exports` point at the TypeScript entry, and `publishConfig.exports` (which `pnpm pack` applies) points at `dist/`.

The `files` allowlist in `packages/okb/package.json` holds `bin`, `dist`, `meta-kb/data`, `schema` (the generated JSON Schema files), `skills`, the README and LICENSE; it leaves out the YAML sources, docs, site, tests, examples and PDFs. Code that reads the package's own files resolves them from the package root, so it works in a clone and in an installed package (`META_DIR` in `metakb.ts`). The reader package ships `dist`, the README and LICENSE and nothing else. `packages/okb/tests/package.test.ts` runs `pnpm pack` on all three packages, installs the tarballs into a temp folder and runs the installed `okb`, and `packages/okb/tests/reader-package.test.ts` installs the format tarball alone and type-checks a consumer against its declarations (a few seconds each; set `OKB_SKIP_PACKAGE_TEST=1` to skip them). The three packages keep the same version; a test fails if they differ. Publishing is done by the release workflow, described under [Releases](#releases).

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

| Check           | What it runs                                                                                          | Run it locally                                                               |
| --------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Typecheck       | `pnpm tsc`                                                                                            | `pnpm tsc`                                                                   |
| Build and test  | `pnpm build`, then `pnpm test`                                                                        | `pnpm build && pnpm test`                                                    |
| Generated files | Regenerates everything, then fails if `git status` shows a change                                     | `pnpm build:meta && pnpm run docs && pnpm example`, then `git status`        |
| Docs            | The docs drift check, then `pnpm lint:docs` (Vale errors fail; warnings and suggestions don't)        | `node .claude/skills/okb-docs-drift/scripts/check-docs.ts && pnpm lint:docs` |
| Site            | `pnpm site`                                                                                           | `pnpm site`                                                                  |
| Node 24 runtime | Packs the three packages, installs them on Node 24, runs `okb version`, `okb init` and `okb validate` | `pnpm test` runs the same on your Node; use `nvm use 24` to try the floor    |

A second workflow, `.github/workflows/pr.yml`, checks the pull request itself: **Commit messages**, **PR title** and **PR description**. It also reruns when you edit the description. [Commits and pull requests](#commits-and-pull-requests) says what it expects.

The Generated files check catches a rule, command or tutorial change that you didn't regenerate. The release workflow reuses the whole workflow (it has a `workflow_call` trigger), so a release only publishes after these checks pass. Local runs don't need Vale installed for the other checks, but `pnpm lint:docs` does (`brew install vale`).

## Issues

Open an issue from one of the templates in `.github/ISSUE_TEMPLATE/`: **Feature**, **Bug report**, **Chore**, **Spike** or **Epic Tracker**. A feature, bug or chore title is a Conventional Commit, like a PR title, so `feat(okb): Add a command to list orphan classes` becomes the PR's title later. A feature, chore or spike issue has the same sections, **Purpose**, **Context**, **Scope** and **Criteria** (a spike adds **Questions**), so a person or an agent can pick it up without asking questions. A bug report has its own layout, with **To reproduce**, **Expected behavior**, **Actual behavior** and **Environment**, and still ends with **Criteria**. A spike is research, so it never ships code or becomes a commit. Its title starts with `Spike:` instead, and it ends in a written answer, a doc, follow-up issues, or a decision not to proceed.

An epic tracks one milestone. Its title is `Epic:` followed by the milestone's title, it carries the `epic` label, and it has **Purpose**, **Scope** (in, out and deferred), **Decisions**, a **Checklist** of the milestone's issues in the order they merge, and **Branching**. Like a spike, it never ships code. Each issue in the milestone says `Part of <milestone>, tracked in #<epic>`. To list the epics, filter issues by the `epic` label.

A feature also has **The problem it solves**. Say who hits the problem and when, what they do today, how the feature fixes it, and how you know the problem is real. We add features for problems someone has, not for ones someone might have, so an issue that can't fill this section in waits until the problem shows up. Work with no user-facing effect, like CI or refactors, usually fits the Chore template. A feature that is not user-facing can stay on the Feature template: write "Not user-facing" in that section and say who it helps instead, such as maintainers.

## Commits and pull requests

Every commit message and every PR title is a [Conventional Commit](https://www.conventionalcommits.org): `type(scope): Subject`. The subject starts with a capital letter and has no final period. The scope is optional.

```text
feat(reader): Add better formatting
fix(okb)!: Drop the --legacy flag
docs: Explain inverse slots
```

[commitlint](https://commitlint.js.org) checks this (`commitlint.config.js`). A [husky](https://typicode.github.io/husky) `commit-msg` hook (`.husky/commit-msg`) runs it on every commit, and `pnpm install` sets the hook up (the `prepare` script), so a bad message is rejected before the PR. `git commit --no-verify` skips the hook once; the PR check still runs. To check a message without committing:

```bash
echo "feat(reader): Add better formatting" | pnpm exec commitlint
```

**Types** are the Conventional Commits set: `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`, `ci`, `chore`, `style` and `revert`. A `!` after the type or scope (`feat(okb)!:`) marks a [breaking change](#what-the-versions-mean).

**Scopes** say which package or part of the repo a change belongs to, so the history shows what goes into each package release. They live in `scripts/conventions.ts`:

| Scope          | Covers                                                         |
| -------------- | -------------------------------------------------------------- |
| `reader`       | `@ontology-kit/reader`, the file-format reader                 |
| `okb`          | `@ontology-kit/okb`, the CLI                                   |
| `ontology-kit` | the unscoped wrapper package                                   |
| `meta-kb`      | the method, rules, glossary and decision guides                |
| `skills`       | the skills that ship with okb                                  |
| `examples`     | the tutorials and example ontologies                           |
| `site`         | the docs site                                                  |
| `release`      | the release workflow and scripts                               |
| `deps`         | dependency updates (Dependabot uses `chore(deps)`, `ci(deps)`) |

A change that touches several packages can leave the scope out or name the main one.

### The PR description

The PR template (`.github/pull_request_template.md`) has these sections. The **PR description** check enforces the second to fourth:

- **Summary**: what changed and why, and `Fixes #123` for the issue it closes.
- **Release Category**: one of the categories below. The changelog groups PRs under it.
- **Release Notes**: what a person using okb or the reader package should know, in the words you'd want to read in the release notes: what's new or fixed, and how to use it. It's required for `feat`, `fix` and `perf` PRs and for breaking changes. For anything else, write `None`.
- **Breaking Changes**: what breaks and how to upgrade. Required when the title has a `!`, and only then.
- **Checklist**: the checks from [Before you commit](#before-you-commit).

| Release Category | Use it for                                              |
| ---------------- | ------------------------------------------------------- |
| `CLI`            | `okb` commands, flags, output and behavior              |
| `Format`         | the `okb-lpg` file format and `@ontology-kit/reader`    |
| `Method`         | the meta-KB: steps, rules, glossary and decision guides |
| `Skills`         | the skills that ship with okb                           |
| `Documentation`  | the docs, tutorials and docs site                       |
| `Infrastructure` | CI, the release workflow, build and repo tooling, tests |
| `Dependencies`   | dependency updates                                      |

The category comes from what a user would notice, not from the folder. A `fix(okb)` that corrects a rule's wording is `Method`. The type says what kind of change it is (`feat`, `docs`), and the category says which part of the product it's in. The lists are in `scripts/conventions.ts`; change them there, in the PR template and in this section together (`packages/okb/tests/changelog.test.ts` checks that the template and the code agree).

Dependabot PRs have no template and aren't checked; the changelog files them under Dependencies. Any merge method works: the changelog reads the PR's title and description, not the merge commit.

## Releases

### What the versions mean

Two version numbers exist, and `okb version` prints both: `okb 0.1.0 · meta-KB 2.6.3`.

- **The package version** is semver over everything a user or another tool depends on: the CLI (command and flag names, exit codes and the `--json` output), the file format (`okb-lpg/3`, and reading older formats), and the `@ontology-kit/reader` exports (so the reader package's semver is the format API's contract). `@ontology-kit/reader`, `@ontology-kit/okb` and the unscoped `ontology-kit` wrapper always release together at the same version. `okb version` reads it from `package.json`.
- **The meta-KB version** covers the method and the rules (`VERSION` in `packages/okb/meta-kb/build.ts`). Each ontology's `okb.json` records the one it started with. [Changing rules](#changing-rules) says when to bump it.

The two move separately, with one link. The meta-KB ships inside the package, so any change to it reaches users only in a package release. A meta-KB bump (a rule changes meaning, or a skill's instructions change) therefore needs a package release that carries it, at least a minor one while the version is 0.x. A package change that leaves the rules alone, such as a CLI fix, doesn't bump the meta-KB.

**What counts as breaking** (a major version from 1.0 on):

- A command, flag or `--json` field removed or renamed, or an exit code changed.
- A file the previous version read and validated structurally (`struct-well-formed`) that the new version rejects, or a format change with no automatic conversion of the older one.
- A breaking change to the `@ontology-kit/reader` exports, as [the format reference](docs/FORMAT.md#versions-and-semver) lists.
- Raising the Node floor.

New or tightened rules are not breaking by themselves, even when a rule's severity is error: the method is what the meta-KB exists to sharpen, and its version tells a user which rules their ontology was started with. New commands, flags, exports and rules are minor; fixes are patches.

### What 0.x means

Versions before 1.0 promise nothing: any release may change the CLI, the file format or the format API, and the changelog says what did. The first release is 0.1.0 so that nobody reads it as stable. 1.0 means the CLI, the file format and the format API are stable under the rules above. Before 1.0:

- The command and flag names, exit codes and `--json` shapes have been used for a while without renames, and the docs and skills describe all of them.
- The file format has a documented upgrade path, and the `okb-lpg/3` files in the wild load without changes.
- `@ontology-kit/reader` has been used by a real outside tool (the okb-mcp server is the candidate) without needing breaking changes.
- Releases have gone out through the workflow below, with trusted publishing and provenance, a few times without manual fixes.

### The changelog

[`docs/CHANGELOG.md`](docs/CHANGELOG.md) holds both histories: package releases first, newest first, then the meta-KB versions. Each release has a `### X.Y.Z (YYYY-MM-DD)` entry, and the workflow publishes that entry as the GitHub release notes, so someone who wants to know what went out in a version can read it on that release's page. For the page it promotes the `####` sections to `###`, turns relative links into links to the files at that tag, and ends with a link comparing the release to the previous one (`node scripts/release.ts notes vX.Y.Z` prints the result).

A script writes the package entries from the pull requests (`scripts/changelog.ts`). It lists every PR merged since the previous release tag, grouped under a `####` heading for its Release Category (CLI, Format, Method and so on, with **Breaking changes** first). Each PR gets one line with its title, number and author, and its Release Notes underneath. A PR's title and its Release Notes section are therefore its changelog line: write them for the reader.

The entry is ordinary Markdown in the release PR, so edit it before you merge: fix a title that reads badly, merge two lines, add a sentence of context at the top. The script never touches an entry that already has a date. The first release (0.1.0) has no earlier tag and was written by hand, and the meta-KB history stays hand-written.

### Cutting a release

1. On a branch from `main`, set the same `version` in `packages/reader/package.json`, `packages/okb/package.json` and `packages/ontology-kit/package.json`.
2. Write the changelog entry: run `node scripts/changelog.ts --write` (needs the GitHub CLI, signed in). It adds `### X.Y.Z (today's date)` to `docs/CHANGELOG.md` from the PRs merged since the last tag, or fills in an `(unreleased)` heading. Without `--write` it prints the entry instead. Read it and edit it as above. A change to the meta-KB also gets its entry under `## Changes to the meta-KB`.
3. Run `node scripts/release.ts check`. It fails if the versions differ or the entry is missing, empty or undated. Then run the [usual checks](#before-you-commit), and merge the change to `main`.
4. Tag the merged commit and push the tag:

```bash
git switch main && git pull
git tag -a v0.1.0 -m "v0.1.0"
git push origin v0.1.0
```

The tag must be `v` plus the version. The release workflow (`.github/workflows/release.yml`) then checks that the tag, all three versions and the changelog entry agree and that the tag is on `main`; runs the whole CI workflow; builds and packs the three packages in a job with no publish rights; publishes `@ontology-kit/reader`, then `@ontology-kit/okb`, then `ontology-kit` to npm from those tarballs, in that order because each depends on the one before, in the only job that holds the identity token and checks out no code; and creates the GitHub release with the changelog entry as its notes, in a last job that is the only one with write access to the repository. A run that is repeated skips a version already on npm, so it can finish a release that stopped halfway. To try everything except the publish, run the workflow by hand from the Actions tab with `dry-run` on (the default). A dry run ends with `npm publish --dry-run` on the tarballs, needs no `release` environment, and doesn't exercise the token exchange.

### Alpha releases

Feature and milestone work lands on a long-lived `prerelease/alpha` branch, and every push to it publishes an alpha build, so people can try changes before a stable release. `main` stays what the last stable release shipped.

- **Publishing.** A push to `prerelease/alpha` runs the same release workflow as a tag, with three differences: it needs no changelog entry and no tag on `main`; it publishes `X.Y.0-alpha.N` under the `alpha` dist-tag, never `latest`, with provenance; and it creates a GitHub prerelease (and its tag) with generated notes. The `@ontology-kit/okb@alpha` dist-tag points at the newest one. Before publishing, the pack job runs the packaging tests (`packages/okb/tests/package.test.ts`) at the alpha version, which pack all three packages, install them and run `okb`. The three packages share the alpha version, as they do a stable one.
- **The version is never committed.** `node scripts/release.ts alpha-version` computes it: the next minor after the newest stable tag reachable from the branch (`0.2.0` leads to `0.3.0`; before 1.0 a minor is where breaking changes go), then `-alpha.N`, where N is the number of commits since that tag. The pack job writes it into the three `package.json` files in its own working copy only. `package.json` on the branch keeps the last stable version, so a forward merge of a stable release commit never conflicts there. Run the command to see the next alpha's number. An alpha sorts below the stable release it leads to, so `0.3.0-alpha.12` is older than `0.3.0`.
- **Forward merges.** Every push to `main` runs `.github/workflows/forward-merge.yml`, which merges `main` into `prerelease/alpha` with a merge commit. If the merge conflicts, it pushes a `forward-merge/main-<sha>` branch and opens a pull request into `prerelease/alpha` for you to resolve (merge `prerelease/alpha` into that branch, fix the conflicts, then merge the pull request). Use **merge commits only**, never squash or rebase, for `main` into alpha and alpha into `main`: a squash makes the branches diverge, and the same changes conflict again at the next sync.
- **A stable release from alpha.** Open a pull request from `prerelease/alpha` into `main` and merge it with a merge commit, then [cut the release](#cutting-a-release) as usual. `scripts/changelog.ts` walks every commit in the range since the previous stable tag and lists each PR once by number, so the entry covers everything that landed on alpha (alpha tags are ignored when it looks for the previous release). Stable releases are all-or-nothing: a single feature can't ship without everything on alpha. A fix for a released bug goes to `main` first, and the forward merge brings it to alpha.

The first alpha needs setup on GitHub first: see steps 4 and 6 of [One-time npm setup](#one-time-npm-setup).

### One-time npm setup

The workflow holds no npm token. It publishes with [trusted publishing](https://docs.npmjs.com/trusted-publishers): npm accepts a short-lived identity token that GitHub issues for the exact repository, workflow file and environment you configured, and records provenance for each version. This needs npm 11.5.1 or newer, which the workflow checks. It runs `npm publish` on the packed tarballs: `pnpm pack` rewrites the `workspace:*` dependencies (the wrapper's on okb, okb's on the reader package) to the real version, and applies the reader package's `publishConfig.exports`, and `npm publish` is the client npm documents for the token exchange. Publish only the tarballs: a package folder's `package.json` still has the `workspace:*` ranges and, in the reader package, source `exports`, so each package's `prepublishOnly` script refuses a folder publish.

npm can configure a trusted publisher only for a package that already exists, so the first version of each of the three packages is published by hand once. The owner does this, with 2FA, from a clone on Node 26:

1. Own the `@ontology-kit` organization on npm (done) and be signed in: `npm login`.
2. Publish a pre-release of the three packages under a side tag, so the real first release is still 0.1.0 and has provenance. In all three `package.json` files set `version` to `0.1.0-bootstrap.0` (don't commit this), then:

   ```bash
   pnpm install --frozen-lockfile
   mkdir /tmp/okb-bootstrap
   pnpm --filter @ontology-kit/reader pack --pack-destination /tmp/okb-bootstrap
   pnpm --filter @ontology-kit/okb pack --pack-destination /tmp/okb-bootstrap
   pnpm --filter ontology-kit pack --pack-destination /tmp/okb-bootstrap
   npm publish /tmp/okb-bootstrap/ontology-kit-reader-0.1.0-bootstrap.0.tgz --access public --tag bootstrap
   npm publish /tmp/okb-bootstrap/ontology-kit-okb-0.1.0-bootstrap.0.tgz --access public --tag bootstrap
   npm publish /tmp/okb-bootstrap/ontology-kit-0.1.0-bootstrap.0.tgz --access public --tag bootstrap
   git checkout -- packages/reader/package.json packages/okb/package.json packages/ontology-kit/package.json
   ```

3. For each package (`@ontology-kit/reader`, `@ontology-kit/okb`, then `ontology-kit`), on npmjs.com open **Settings → Trusted Publisher → GitHub Actions** and enter repository owner `alanbsmith`, repository `ontology-kit`, workflow filename `release.yml` and environment `release`, and tick **Allow `npm publish`** under Allowed actions. Leave **Allow `npm dist-tag`** off: the workflow sets its tag as part of the publish. Without the first box, npm only accepts `npm stage publish` from the workflow, and the publish step is rejected. The `npm trust github <package> --file release.yml --repo alanbsmith/ontology-kit --env release --allow-publish` command does the same. The fields are case-sensitive and npm doesn't check them when you save, so a typo shows up as a failed publish. npm expires a trusted publisher that has not completed a successful publish within 2 days of being created, and it can't be edited then. Do this step last: merge the release change, run the workflow by hand with `dry-run` on, then add the trusted publishers, then push the tag the same day.
4. On GitHub, protect the release path before the first tag. This is required, not optional: npm's trusted publisher names the repository, the workflow file and the environment, and does not check the branch or tag. Without protection, anyone who can push a branch could edit `release.yml` there, run it by hand, and publish with valid provenance. Under **Settings → Environments**, create `release` before the first tag (a real run would otherwise create it with no protection), set **Deployment branches and tags** to the tag pattern `v*` (and, for [alpha releases](#alpha-releases), the branch `prerelease/alpha`), and add yourself as a required reviewer if you want to approve each publish. Then, under **Settings → Rules**, add a tag rule on `v*` that restricts who can create such tags, and turn on the branch rule for `main`. With the GitHub CLI, the environment part is:

   ```bash
   gh api -X PUT repos/alanbsmith/ontology-kit/environments/release --input - <<< '{"deployment_branch_policy":{"protected_branches":false,"custom_branch_policies":true}}'
   gh api -X POST repos/alanbsmith/ontology-kit/environments/release/deployment-branch-policies -f name='v*' -f type=tag
   gh api -X POST repos/alanbsmith/ontology-kit/environments/release/deployment-branch-policies -f name='prerelease/alpha' -f type=branch
   ```

   The `release` environment's allowed refs are the real guard for alphas too, since the trusted publisher doesn't check the branch. The `prerelease/alpha` branch needs its own branch rule under **Settings → Rules** (required pull requests and status checks, no force pushes, no deletion), or anyone who can push to it can publish. The forward-merge workflow pushes to that branch, so it needs a repository secret `FORWARD_MERGE_TOKEN`: a GitHub App token or fine-grained PAT with contents and pull-requests write access, on that rule's bypass list. The default `GITHUB_TOKEN` can't do this, because its pushes start no other workflow, so the merge would get no CI and no alpha release.

5. After the first release has published, on each package's **Settings → Publishing access**, choose "Require two-factor authentication and disallow tokens". Trusted publishing keeps working.

If npm lets you configure the trusted publisher before the package exists, skip step 2 and go straight to tagging.

After the first release, mark the bootstrap versions as superseded, since they were published from a laptop and have no provenance: `npm deprecate "@ontology-kit/reader@0.1.0-bootstrap.0" "Superseded by 0.1.0"`, and the same for `@ontology-kit/okb` and `ontology-kit`. Before step 2, check that the unscoped name is free and passes npm's similar-name rule: `npm view ontology-kit` should say it is not found.

### Publishing a new package

The one-time setup above covers the first three packages. A package added later, such as `@ontology-kit/mcp`, follows the same path in the order below. The bootstrap comes before the release, because the release workflow can only publish a name that already exists on npm. A rename counts as a new package: follow these steps for the new name.

1. **Add the package to the repo.** Create `packages/<folder>` with a publishable `package.json`: no `private`, the `engines` floor, `files`, the `publishConfig` pattern the other packages use, a `prepublishOnly` script that runs `node ../../scripts/publish-guard.ts` (so nobody publishes the folder by mistake), and the same `version` as the others. Then list the package everywhere the release path names the packages:
   - `PACKAGES` in `scripts/release.ts`, which checks that every version matches.
   - The pack step and the publish loop in `.github/workflows/release.yml`. The loop publishes in order, so put the package after the ones it depends on.
   - The pack step and the install check in `.github/workflows/ci.yml`, and the packaging tests in `packages/okb/tests/`.
   - A commit scope in `scripts/conventions.ts`, and a row in the scope table above.

   Merge this change before the next step.

2. **Check the name is free.** `npm view <name>` should say it is not found. A scoped name needs nothing more. For an unscoped name, also check npm's similar-name rule.
3. **Choose the bootstrap version.** The packages release together at one version, so the new package's first version is the next release, for example 0.3.0. The bootstrap is that version with `-bootstrap.0`, here `0.3.0-bootstrap.0`. It sorts below the real release, and the `bootstrap` tag keeps it away from `latest`.
4. **Publish the bootstrap by hand, once.** The owner does this, with 2FA, from a clone on Node 26. Set `version` to the bootstrap version in the new package's `package.json` only (don't commit it), then:

   ```bash
   pnpm install --frozen-lockfile
   mkdir /tmp/okb-bootstrap
   pnpm --filter <name> pack --pack-destination /tmp/okb-bootstrap
   npm publish /tmp/okb-bootstrap/<tarball>.tgz --access public --tag bootstrap
   git checkout -- packages/<folder>/package.json
   ```

   `<tarball>` is the file the pack step wrote: the package name without the `@`, with `/` as `-`, then the version, for example `ontology-kit-mcp-0.3.0-bootstrap.0.tgz`. Nothing installs the bootstrap, so it doesn't matter that the packages it depends on aren't published at that version yet.

5. **Prepare the release.** Follow steps 1 to 3 of [Cutting a release](#cutting-a-release), with every package at the same version, and merge the change to `main`. Then run the release workflow by hand with `dry-run` on.
6. **Configure the trusted publisher, then tag the same day.** npm expires a trusted publisher that has not completed a successful publish within 2 days of being created, so this step goes last. On npmjs.com, open the new package's **Settings → Trusted Publisher → GitHub Actions** and enter repository owner `alanbsmith`, repository `ontology-kit`, workflow filename `release.yml` and environment `release`. Tick **Allow `npm publish`** and leave **Allow `npm dist-tag`** off, as in the one-time setup. The `release` environment and its tag protection already exist, so there is nothing to do on GitHub. Then push the tag, which is step 4 of Cutting a release.
7. **Clean up, after the release has published.** Pushing the tag only starts the workflow, so wait until it has finished and the new version is on npm (`npm view <name>@<version>`). If it failed, fix that first: a deprecation message that points at a version users can't install is worse than none. Then deprecate the bootstrap, since it was published from a laptop and has no provenance: `npm deprecate "<name>@<version>-bootstrap.0" "Superseded by <version>"`. Then, on the package's **Settings → Publishing access**, choose "Require two-factor authentication and disallow tokens". If the new package replaces an old name, also deprecate the whole old package: `npm deprecate "<old name>" "Renamed to <name>"`. With no version, the message covers every version. The old package can't be unpublished while another published package depends on it.

If npm lets you configure the trusted publisher before the package exists, skip steps 3 and 4.

## Before you commit

Run these after every change. All of them must pass:

```bash
pnpm tsc                                                  # typecheck
pnpm test                                                 # all suites; also rebuilds the wine example
pnpm lint:docs                                           # Prettier, markdownlint and Vale on the docs
node .claude/skills/okb-docs-drift/scripts/check-docs.ts # docs and skills still match the CLI
```

`pnpm test` regenerates tracked files (`packages/okb/meta-kb/data/*.json` and everything in `packages/okb/examples/wine/` except `tutorial-src/`). A diff in `packages/okb/examples/wine/` after a refactor means CLI output changed, so check it. Make one commit per change, and keep refactors apart from behavior changes.
