---
name: okb-docs-drift
description: Check ontology-kit's hand-written docs (README.md, CLAUDE.md, docs/FORMAT.md, docs/EXTRACTION-PIPELINE.md, the meta-KB README and the SKILL.md files under skills/) against the real okb CLI, source layout and meta-KB, and fix what has drifted. Use it whenever okb commands, flags, output, file layout, the file format or meta-KB rules change; before a commit or PR that touches src/cli.ts, src/ops/, the meta-KB YAML or the docs; and whenever someone asks whether the docs, README or skills are up to date or accurate, even if they don't say "drift".
---

# okb docs drift check

ontology-kit already keeps some docs honest by generating them (`npm run docs` writes METHOD, GLOSSARY, RULES and DECISIONS from the meta-KB). The rest are hand-written, and they drift silently. Beginners follow them literally: a README that shows a flag that no longer exists teaches the wrong thing, and a skill that tells Claude to run a renamed command fails on someone's first ontology. This skill finds that drift and fixes it.

It has two layers: a script for what can be checked mechanically, and a read-through for what only a person (or you) can judge.

## 1. Run the mechanical check

```bash
node .claude/skills/okb-docs-drift/scripts/check-docs.ts          # all hand-written docs
node .claude/skills/okb-docs-drift/scripts/check-docs.ts --json   # machine-readable
node .claude/skills/okb-docs-drift/scripts/check-docs.ts README.md skills/ontology-coach/SKILL.md
```

It reports, with file and line:

- **command / flag**: an `okb ...` in code (inline backticks or a fenced block) naming a command, subcommand or `--flag` that `src/cli.ts` doesn't accept. It knows the `property` / `relationship` aliases and their `--from` / `--to` flags.
- **npm-script**: `npm run x` with no `x` in package.json.
- **path**: a repo path (`src/...`, `docs/...`, `meta-kb/...`) that doesn't exist. Paths given as arguments to okb commands are skipped, because they're the user's own files.
- **rule**: a backticked rule id that isn't in the meta-KB.
- **format-type**: a node or edge type in docs/FORMAT.md's tables that isn't in `meta-kb/src/format.yaml`, or a registered type the doc leaves out.
- **count**: a meta-KB count ("55 rules") that no longer matches `meta-kb/data/manifest.json`.

Treat each report as real until you've looked. If one is a false positive (for example prose the parser mistook for a command), improve the script rather than ignoring it, so the next run is quiet.

## 2. Read for what the script can't check

The script knows that names exist, not that the docs say true things about them. Read each doc with the relevant code open, and check:

- **Behavior claims.** When a doc says what a command does ("`okb link` merges properties when linking again", "inverses are stored once"), confirm it in `src/ops/` or `src/relationships.ts`. Where the example output is quoted, compare it with what the command prints now. `examples/wine/TRANSCRIPT.md` is regenerated from real runs, so it's a good reference.
- **Architecture descriptions.** The layout in README.md and the architecture in CLAUDE.md should match `src/` (for example `ops/` split by reason to change, `relationships.ts` owning edge storage, `types.ts` typing the file format). A module that was split, renamed or merged is the most common drift.
- **The skills.** `skills/*/SKILL.md` drive the CLI step by step. Walk each workflow against `okb help` and the command's usage message: do the commands run in that order, and do the JSON fields the skill reads (`okb review --json`, `okb validate --json`) still exist with those names?
- **The file format.** docs/FORMAT.md's property lists should match the interfaces in `src/types.ts` (`ClassNode`, `SlotNode`, ...), because those are what okb actually reads and writes.
- **Versions.** `meta-kb/README.md`'s changelog should cover `VERSION` in `meta-kb/build.ts`.

Leave generated docs alone (METHOD, GLOSSARY, RULES, DECISIONS say "Generated from the meta-KB" at the top). If one of them is wrong, the fix is in `meta-kb/src/*.yaml` followed by `npm run build:meta && npm run docs`.

## 3. Report, then fix

List what drifted, grouped by doc, each with the evidence (the code or output that shows the truth). Then fix the docs in place, matching each doc's existing voice: the README and the skills are written for beginners in plain language. Fix the doc to match the code, unless the code looks like the mistake (a flag removed by accident, a message that contradicts the paper). In that case, say so and ask rather than documenting a bug.

Finish by re-running the script. It should print "No drift found".
