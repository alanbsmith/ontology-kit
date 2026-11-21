---
name: okb-docs-drift
description: Check ontology-kit's hand-written docs (README.md, CONTRIBUTING.md, CLAUDE.md, docs/getting-started/, docs/learn/, docs/build/ and docs/reference/ (every .md in them), the tutorial sources in packages/okb/examples/*/tutorial-src/, docs/CHANGELOG.md, docs/FORMAT.md, docs/EXTRACTION-PIPELINE.md, docs/CODE-REVIEW.md, the meta-KB and sources READMEs and the SKILL.md files under skills/) against the real okb CLI, source layout and meta-KB, and fix what has drifted. Use it whenever okb commands, flags, output, file layout, the file format or meta-KB rules change; before a commit or PR that touches packages/okb/src/cli.ts, packages/okb/src/ops/, the meta-KB YAML or the docs; and whenever someone asks whether the docs, README or skills are up to date or accurate, even if they don't say "drift".
---

# okb docs drift check

ontology-kit already keeps some docs honest by generating them (`pnpm run docs` writes METHOD, GLOSSARY, RULES and DECISIONS from the meta-KB, and CLI and CLI-CHEAT-SHEET from `packages/okb/src/commands.ts`). The rest are hand-written, and they drift silently. Beginners follow them literally: a README that shows a flag that no longer exists teaches the wrong thing, and a skill that tells Claude to run a renamed command fails on someone's first ontology. This skill finds that drift and fixes it.

It has two layers: a script for what can be checked mechanically, and a read-through for what only a person (or you) can judge.

## 1. Run the mechanical check

```bash
node .claude/skills/okb-docs-drift/scripts/check-docs.ts          # all hand-written docs
node .claude/skills/okb-docs-drift/scripts/check-docs.ts --json   # machine-readable
node .claude/skills/okb-docs-drift/scripts/check-docs.ts README.md packages/okb/skills/ontology-coach/SKILL.md
```

It checks `README.md`, `CONTRIBUTING.md`, `CLAUDE.md`, every `.md` file in `docs/getting-started/`, `docs/learn/`, `docs/build/` and `docs/reference/` (new files are picked up automatically), the tutorial sources `packages/okb/examples/*/tutorial-src/*.md`, the hand-written reference pages, the meta-KB and sources READMEs and the shipped skills. The generated pages (including the tutorial pages under `packages/okb/examples/*/tutorial/`) are left out. It reports, with file and line:

- **command / flag**: an `okb ...` in code (inline backticks or a fenced block) naming a command, subcommand or `--flag` that `packages/okb/src/cli.ts` doesn't accept. It knows the `property` / `relationship` aliases and their `--from` / `--to` flags.
- **pnpm-script**: `pnpm x` with no `x` in package.json, and **npm-command**: a contributor command that uses npm where pnpm belongs (running a script, installing or linking the repo, or `npx`). An end-user `npm i -g` is fine.
- **path**: a repo path (`packages/okb/src/...`, `docs/...`, `packages/okb/meta-kb/...`) that doesn't exist. Paths given as arguments to okb commands are skipped, because they're the user's own files.
- **rule**: a backticked rule id that isn't in the meta-KB.
- **format-type**: a node or edge type in docs/FORMAT.md's tables that isn't in `packages/okb/meta-kb/src/format.yaml`, or a registered type the doc leaves out.
- **count / version**: a meta-KB count ("55 rules") or version ("meta-KB 2.2.0") that no longer matches `packages/okb/meta-kb/data/manifest.json`, or a shipped skill whose `**Version X.Y.Z.**` line is missing or doesn't match it.

Treat each report as real until you've looked. If one is a false positive (for example prose the parser mistook for a command), improve the script rather than ignoring it, so the next run is quiet.

## 2. Read for what the script can't check

The script knows that names exist, not that the docs say true things about them. Read each doc with the relevant code open, and check:

- **Behavior claims.** When a doc says what a command does ("`okb link` merges properties when linking again", "inverses are stored once"), confirm it in `packages/okb/src/ops/` or `packages/okb/src/relationships.ts`. Where the example output is quoted, compare it with what the command prints now. `packages/okb/examples/wine/TRANSCRIPT.md` is regenerated from real runs, so it's a good reference.
- **Architecture descriptions.** The layout in README.md and the architecture in CLAUDE.md should match `src/` (for example `ops/` split by reason to change, `relationships.ts` owning edge storage, `types.ts` typing the file format). A module that was split, renamed or merged is the most common drift.
- **The skills.** `packages/okb/skills/*/SKILL.md` drive the CLI step by step. Walk each workflow against `okb help` and the command's usage message: do the commands run in that order, and do the JSON fields the skill reads (`okb review --json`, `okb validate --json`) still exist with those names?
- **The file format.** docs/FORMAT.md's property lists should match the interfaces in `packages/okb/src/types.ts` (`ClassNode`, `SlotNode`, ...), because those are what okb actually reads and writes.
- **Versions.** `docs/CHANGELOG.md` should cover `VERSION` in `packages/okb/meta-kb/build.ts`.

Leave generated docs alone (METHOD, GLOSSARY, RULES, and DECISIONS say "Generated from" at the top; CLI and CLI-CHEAT-SHEET come from `packages/okb/src/commands.ts`). If one of them is wrong, the fix is in `packages/okb/meta-kb/src/*.yaml` followed by `pnpm build:meta && pnpm run docs`.

## 3. Report, then fix

List what drifted, grouped by doc, each with the evidence (the code or output that shows the truth). Then fix the docs in place, matching each doc's existing voice: the README and the skills are written for beginners in plain language. Fix the doc to match the code, unless the code looks like the mistake (a flag removed by accident, a message that contradicts the paper). In that case, say so and ask rather than documenting a bug.

Finish by re-running the script. It should print "No drift found".
