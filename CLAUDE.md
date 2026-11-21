# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Starting a session

Before reading, editing or generating anything, make sure the work sits on an up-to-date branch. A worktree session can start from a stale base, and work built on one has to be redone.

1. Run `git fetch origin`, then `git branch --show-current` and `git status --short`.
2. Decide the base branch. It's `main`, unless the task names another branch: a milestone's integration branch, an issue's parent branch, or a PR's base. If the task names a branch to work on, check that you are on it.
3. Check how far behind the base you are: `git log --oneline HEAD..origin/<base>`. Any output means the branch is stale.
4. If it is stale, bring it up to date before doing any work. Stash uncommitted changes first. Rebase onto `origin/<base>`; if the branch is already pushed or has an open PR, merge `origin/<base>` instead. Reapply the stash, and resolve conflicts in generated files (`docs/*.md`, `packages/okb/meta-kb/data/*.json`) by regenerating them, not by merging by hand.
5. Say in one line which branch you are on and which base you checked it against.

Check again, and bring the branch up to date, before you commit or open a PR, and whenever the user says the base has moved. A long session drifts too.

## Commands

Requires **Node 26** for development (see `.nvmrc`); okb itself runs on Node 24 or newer. No build step: Node runs the `.ts` sources directly via type stripping, so only erasable TypeScript syntax is allowed (no `enum`, `namespace`, or constructor parameter properties; `packages/okb/tsconfig.json` sets `erasableSyntaxOnly`). Relative imports use the `.ts` extension. Install dependencies with `pnpm install` (pnpm is pinned in the root `package.json`; install it with `npm i -g pnpm`, since Node 26 doesn't bundle Corepack). One install covers the whole workspace: the root, `packages/okb` and `site/`.

The repo is a pnpm workspace (`pnpm-workspace.yaml`): `packages/format` is `@ontology-kit/format` (the file-format reader: the node and edge types, `Ontology`, relationship reading; no CLI or meta-KB), `packages/okb` is `@ontology-kit/okb` (the CLI, which depends on the format package, with its `src/`, `bin/`, `meta-kb/`, `skills/`, `examples/` and `tests/`), `packages/ontology-kit` is the unscoped `ontology-kit` wrapper (a bin that forwards to okb), `site/` is the private docs site, and the root holds repo-wide tooling and the docs (`docs/`, `sources/`, `README.md`, `CONTRIBUTING.md`, `.claude/`, Prettier, `markdownlint-cli2`, Vale, `netlify.toml`). The root scripts below run the package's scripts through `pnpm --filter` or `pnpm -r`, so they work from the root; run a package's own scripts from its folder (`packages/okb`, `packages/format`). All paths in this file are relative to the repo root.

```bash
pnpm test                                  # all suites in packages/format and packages/okb (node:test)
node --test packages/okb/tests/checks.test.ts           # one file
node --test --test-name-pattern="hier-no-cycles" packages/okb/tests/checks.test.ts   # one test
pnpm tsc                                   # typecheck (noEmit)
pnpm build                                 # compile packages/format/src and packages/okb/src to each dist (published packages only; tests don't need it)
node packages/okb/src/cli.ts <command>                  # run okb without pnpm link
pnpm build:meta                            # compile packages/okb/meta-kb/src/*.yaml -> packages/okb/meta-kb/data/*.json
pnpm run docs                              # regenerate docs/METHOD|GLOSSARY|RULES|DECISIONS|CLI|CLI-CHEAT-SHEET.md (pnpm has its own docs command, so keep `run`)
pnpm site                                  # docs + build the docs site into site/dist
pnpm site:dev                              # docs + the site's dev server
pnpm example                               # rebuild packages/okb/examples/wine/ from its tutorial-src/ (also run by pnpm test and pnpm site)
pnpm format:docs                           # Prettier on the hand-written docs
pnpm lint:docs                             # Prettier check + markdownlint + Vale (brew install vale; it runs `vale sync` itself in a fresh checkout or worktree)
```

Run `pnpm tsc` and `pnpm test` after every change. There's no code linter. `pnpm lint:docs` fails on Vale errors (spelling, `e.g.`, wrong-case terms) and shows its warnings (passive voice, wordiness) as suggestions to weigh, not rules. Add project terms to `.vale/styles/config/vocabularies/Okb/accept.txt`; it's case-sensitive.

**Tests regenerate tracked files.** `packages/okb/tests/misc.test.ts` runs `packages/okb/meta-kb/build.ts` and `packages/okb/examples/build-wine.ts`, which rewrite `packages/okb/meta-kb/data/*.json` and everything in `packages/okb/examples/wine/` (except `tutorial-src/`, which is hand-written). A diff in `packages/okb/examples/wine/` after a refactor means CLI output changed, so treat it as a behavior change and check it. The example pins its dates with `SOURCE_DATE_EPOCH` (see `packages/okb/src/clock.ts`), so it rebuilds identically on any day.

## Publishing layout

`packages/okb` and `packages/format` are publishable: `pnpm build` compiles each `src/` to a gitignored `dist/` with `tsconfig.build.json` (`rewriteRelativeImportExtensions`). In development nothing needs `dist/`: tests import `src/*.ts`, and `bin/okb.js` runs `src/cli.ts` when `src/` exists and `dist/cli.js` otherwise (the package ships no `src/`). okb's `exports` map has a `development` condition for the sources. The `files` allowlist keeps YAML sources, docs, tests, examples and PDFs out. Any code that reads a file from the package (like `META_DIR`) must resolve it from the package root so it works in `src/`, `dist/` and an installed copy. `packages/okb/tests/package.test.ts` packs all three packages, installs the tarballs in a temp folder and runs `okb` there. Keep `packages/format`, `packages/okb` and `packages/ontology-kit` at the same version. The one supported library is `@ontology-kit/format` (`packages/format/src/index.ts`, an explicit allowlist pinned by `packages/format/tests/format-api.test.ts`, documented in `docs/FORMAT.md` and under semver). It has no dependency on okb. okb imports it by name, so its `exports` point at the TypeScript entry (no flag or build needed to run okb from a clone) and `publishConfig.exports` points at `dist/` (`pnpm pack` applies it). `Ontology` keeps its write members, marked `@internal`: `stripInternal` drops them from the published `.d.ts`, and the format build also writes a full set of declarations to the gitignored `packages/format/types-internal/` for okb's build (`packages/okb/tsconfig.build.json` maps `@ontology-kit/format` to it), so build the format package first (okb's `build` script does). `pnpm build` rewrites `.ts` import paths in the `.d.ts` files (`scripts/rewrite-dts.ts`). A change to what the format package exports needs a version decision. Releases are cut by tag through `.github/workflows/release.yml`; the versioning policy and the steps are in CONTRIBUTING.md ("Releases"), and `scripts/release.ts` checks the tag, versions and changelog.

## Architecture

okb is a CLI that guides a beginner through the 8-step Ontology 101 method. It has two graphs, and both use the same labeled property graph (LPG) shape (`nodes.json` + `edges.json`):

1. **The meta-KB** (`packages/okb/meta-kb/`) holds the method, glossary, principles, decision guides, rules, and the file-format registry. It is authored as YAML in `packages/okb/meta-kb/src/`, compiled by `packages/okb/meta-kb/build.ts` into committed JSON in `packages/okb/meta-kb/data/`, and read at runtime by `packages/okb/src/metakb.ts` (`MetaKB.get()` singleton).
2. **A user's ontology**: a folder with `okb.json`, `nodes.json`, and `edges.json`, loaded by `Ontology` in `packages/format/src/model.ts` (the `@ontology-kit/format` package; okb imports it by name). In this file the schema is data: classes, slots, and instances are all nodes.

### The meta-KB is the source of truth; the build enforces it

- Every mechanical or heuristic rule in `packages/okb/meta-kb/src/rules.yaml` must have exactly one check with the same key in `CHECKS` in `packages/okb/src/checks.ts`, and the reverse. `packages/okb/meta-kb/build.ts` fails if they drift apart. The `packages/okb/tests/checks.test.ts` suite fails if any key in `CHECKS` has no fixture that triggers it (via `fires()`).
- Each step's `doneWhen[].check` key in `steps.yaml` must exist in `STEP_CHECKS` in `packages/okb/src/status.ts`.
- A rule's severity comes from its modality (MUST → error, SHOULD → warning, MAY → info). An override needs a written `severityReason`. `fromStep` hides non-error findings until the user reaches that step.
- Adding or changing a rule: edit the YAML, add or adjust the check and its fixture, then run `pnpm build:meta && pnpm run docs && pnpm test`. Bump `VERSION` in `packages/okb/meta-kb/build.ts` when a rule's meaning changes or a shipped skill's instructions change, and set the `**Version X.Y.Z.**` line at the top of each `packages/okb/skills/*/SKILL.md` to match. That line is how an agent (and the user) can tell which skill version is loaded, and the docs drift check fails if it lags.
- `docs/METHOD.md`, `GLOSSARY.md`, `RULES.md`, `DECISIONS.md`, `CLI.md` and `CLI-CHEAT-SHEET.md` are generated by `packages/okb/src/gendocs.ts` (`CLI.md` and `CLI-CHEAT-SHEET.md` carry no "generated" banner; they come from the command reference in `packages/okb/src/commands.ts`, rendered by `packages/okb/src/clidocs.ts`; when you change a command or its flags, update that file and the `HELP` text in `packages/okb/src/help.ts`), so never edit them by hand. `docs/FORMAT.md`, `docs/EXTRACTION-PIPELINE.md`, `docs/CHANGELOG.md` (package releases and meta-KB changes) and `docs/getting-started/*.md` are hand-written, as are `README.md` (the GitHub front page, which is not a site page) and `CONTRIBUTING.md` (the contributor guide, at `/contributing/`).
- `gendocs.ts` writes an `<a id>` before every step, term, rule and decision, from the meta-KB id with `.` replaced by `-` (`concept-class`, `rule-hier-no-cycles`, `step-2-reuse`, `decision-is-a`), and every link it generates uses those. Link to them from hand-written docs instead of heading slugs. Each decision guide also gets a Mermaid flowchart.
- `packages/okb/meta-kb/src/format.yaml` is the registry of node and edge types that `struct-well-formed` validates against, and the one source for the reader's lists: the meta-KB build also writes `packages/format/src/registry.ts` (generated and committed; never edit it, and expect `pnpm build:meta` to change it after a YAML edit). `packages/okb/tests/format-registry.test.ts` checks that the two agree.

### Layers in `packages/okb/src/` (and the reader in `packages/format/src/`)

- `help.ts` holds the `HELP` text. `cli.ts` parses arguments and dispatches commands. `property` and `relationship` are rewritten to `slot` (and `--from`/`--to` to `--on`/`--range`) before dispatch. Most mutating commands go through `mutate()`: load → call an op → save → print notes.
- `ops/*.ts` (re-exported by `ops.ts`, split by reason to change: naming, scope, classes, slots, values, links, instances, admin) and `provenance.ts` hold every mutation. Each op takes an `Ontology`, changes it in place, and returns `Notes` (strings shown to the user, including teaching tips). Throw `OkbError` (from `@ontology-kit/format`) for user-facing problems; the CLI prints it without a stack trace and exits with code 2.
- `packages/format/src/model.ts` (`Ontology`) handles load and save (atomic `.tmp` + rename), the indexes, lookup (`find()` accepts ids, names, `class:Foo` prefixes, and bare numbers for questions and decisions), and hierarchy, slot, and facet queries. `nodes` and `edges` are read-only from outside: add through `addNode`/`addEdge` (which update the indexes in place) and remove through `removeEdges`/`removeNode` (which reindex).
- `packages/format/src/types.ts` types the file format as a discriminated union, `OkbNode`, keyed on `type`. `ofType("Slot")` returns `SlotNode[]`, and `find(ref, "Class")` returns a `ClassNode`. For ids that must exist (edge ends, stored slot ids), use `ont.require(id, type)` rather than `get(id)!`: on a hand-edited file it throws a readable `OkbError`. Checks that validate hand-edited data narrow with `n.type === ...` instead of casting. `GraphNode` (untyped) remains only for tests of malformed input. okb's own `types.ts` holds `Finding`, `Severity` and `isOneOf`, and `naming.ts` keeps the style rules while the identity helpers (`key`, `slug`, `relType`) come from the format package. Creating a folder (`createOntology`) is an op in `ops/admin.ts`, because it needs the clock. The meta-KB has its own typed nodes (`MetaRule`, `MetaStep`, ...) in `metakb.ts`.
- `checks.ts` holds the validator. `runChecks()` returns `{ findings, hiddenLater }`: it attaches severity, hides (and counts) non-error findings from later steps, and marks warnings as `explainedBy` a `DesignDecision` that waives the rule. A decision about a class also covers its subclasses.
- `status.ts` tracks step progress. Its "no errors in this part" checks count the rules the meta-KB links to those steps (`meta.stepRules`), so which rules gate a step is data in `steps.yaml`, not code. `review.ts` turns judgment-only rules into questions (`okb review`, used by the ontology-review skill). `render.ts` holds terminal output. `export.ts` writes JSON and openCypher export.
- `markdown.ts` splits documentation markdown into quotable blocks with heading paths and line ranges. `quotes.ts` does normalized verbatim-quote matching for PDF and text.

### Relationship storage (the subtle part)

A slot with `valueType: "Instance"` is a **relationship**. Its values are stored as edges whose type is the slot's `relType` (the slot name in UPPER_SNAKE case: `maker` → `:MAKER`). They are not stored on the node. Inverse slots share one edge: the `from` side of `INVERSE_OF` is the stored direction, and the other slot reads the same edges backwards (`ont.rel.spec(slot).reverse`). An edge from a Class is a fixed class-level value inherited by its members.

`packages/format/src/relationships.ts` is the one module that knows this, and it's reached as `ont.rel`. Read and write relationship values through `ont.rel.values`, `link`, `unlink` and `edge` (or `ont.statedValues`, which combines literal and relationship values), never by building edges directly. Schema changes go through its intents: `becomeRelationship`, `becomeProperty`, `declareInverse`, `rename` and `drop` (call `drop` before `removeNode` on a slot). Property values are stored on nodes instead (`Instance.values[slotId]`, `Class.fixedValues[slotId]`). `okb-lpg/1` files (`HAS_VALUE` edges) are migrated on load.

## Refactoring in progress

`docs/CODE-REVIEW.md` is a worklist of quality issues with a suggested order and a status for each item. When working through it, make each item its own commit, don't mix a refactor with a behavior change, and run `pnpm tsc` and `pnpm test` after every step.

## Docs site

`site/` is a plain Astro site and a private workspace member with its own `package.json` (never add Astro to the root package; the one `pnpm-lock.yaml` at the root covers it). It reads the repo's markdown in place through a content collection; a page's title is its first level-1 heading. The landing page (`/`) is the custom `site/src/pages/index.astro`; every other page is markdown.

- `site/src/nav.ts` (plain TypeScript, checked by `packages/okb/tests/site.test.ts`) maps routes to source files, holds each page's one-sentence `summary`, builds the collapsible sidebar and the `sequence()` behind previous/next links, and builds the sidebar's Learn group from `LEARN_CHAPTERS` (chapter opener plus its pages) and `packages/okb/meta-kb/data/nodes.json`. Add a page by adding its route there.
- A remark plugin rewrites relative links: to a route for a page, to GitHub for anything else, and it fails the build on a link to a `.md` file with no route.
- `site/src/lib/reading-time.ts` estimates reading time (and hands-on time for tutorial steps) for the page header. `site/src/lib/breadcrumbs.ts` builds breadcrumbs for tutorial steps and Learn chapters.
- `site/src/graph/` holds the explore-only graph: `model.ts` (pure, tested in `packages/okb/tests/graph-model.test.ts`), `data.ts` and `pages/data/[name].json.ts` (the `/data/<name>.json` endpoints), and the lazily loaded `<okb-graph>` element, which a page embeds as raw HTML with a text fallback inside (`packages/okb/tests/site.test.ts` checks both).
- For agents, `/llms.txt`, `/llms-full.txt` and a `.md` version of every page (`<route>.md`) are generated from `nav.ts` (`site/src/lib/llms.ts`, `pages/llms*.txt.ts`, `pages/[...slug].md.ts`).
- The layout, styles and reader features are copied from the owner's Astro blog.

## Hand-written and generated docs

Hand-written (the drift check covers all but the generated tutorial pages): `README.md`, `CONTRIBUTING.md`, `docs/getting-started/`, `docs/learn/` (the Learn course), `docs/build/`, `docs/reference/`, `docs/FORMAT.md`, `docs/EXTRACTION-PIPELINE.md`, `docs/CHANGELOG.md`, `docs/CODE-REVIEW.md`, `packages/okb/meta-kb/README.md`, `packages/format/README.md`, `sources/README.md` and the tutorial sources `packages/okb/examples/*/tutorial-src/*.md`. Generated (never edit): `docs/METHOD.md`, `GLOSSARY.md`, `RULES.md`, `DECISIONS.md`, `CLI.md`, `CLI-CHEAT-SHEET.md`, and everything in `packages/okb/examples/<name>/` except `tutorial-src/`. Pages under `docs/getting-started/`, `docs/learn/`, `docs/build/`, `docs/reference/skills.md` and `tutorial-src/` are beginner pages that get the extra `Beginner` Vale rules (`.vale.ini`). The matching development skills are `.claude/skills/write-learn-page` (`docs/learn/*.md`) and `.claude/skills/write-tutorial`.

## Tutorials

`packages/okb/examples/lib/tutorial.ts` is the tutorial engine and `packages/okb/examples/build-wine.ts` is its first user. A tutorial's sources are `packages/okb/examples/<name>/tutorial-src/N-slug.md`: prose plus code blocks tagged `okb` that hold only commands (add `fails` after the tag on a block whose commands must fail). The engine runs them in order with the real CLI (dates pinned with `SOURCE_DATE_EPOCH`), then writes `packages/okb/examples/<name>/tutorial/*.md` (commands with real output), `tutorial/graph/step-N.json` (the ontology after each step) and `TRANSCRIPT.md`. The ontology files are whatever the commands make, so change a command in a source and `packages/okb/examples/wine/*.json` change with it: they must stay byte-identical unless the change is meant. `packages/okb/examples/build-espresso.ts` builds the small espresso ontology (the engine's `pages: false` option skips the pages; the espresso build doesn't use it), leaves one `scope-cq-coverage` warning on purpose for the landing page, and keeps its house-guide source in `tutorial-src/sources/`. Never edit the generated files. Tutorial sources are beginner pages (see CONTRIBUTING.md, "Writing style"), and `site/src/nav.ts` routes the generated pages. `.claude/skills/write-learn-page` is the matching development skill for `docs/learn/*.md`. `.claude/skills/write-tutorial` is a development skill with the page layout and conventions; follow it for any tutorial.

## Skills in this repo

`packages/okb/skills/` contains SKILL.md files that ship with the toolkit: `ontology-coach`, `ontology-review`, and `build-domain-kb-from-docs`. They drive the `okb` CLI, so a change to command names, flags, or output that they rely on must be reflected there too.

`.claude/skills/okb-docs-drift` is a development skill (not shipped) that checks the hand-written docs and these skills against the CLI and meta-KB. After changing commands, flags, file layout or rules, run `node .claude/skills/okb-docs-drift/scripts/check-docs.ts`.
