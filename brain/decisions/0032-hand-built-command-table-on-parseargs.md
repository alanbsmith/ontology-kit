---
summary: The okb CLI moves to a hand-built command table on node:util parseArgs, one record per form; no CLI framework, and no command history or undo stack.
status: proposed
decided-by: owner, on a recommendation
date: 2026-11-26
updated: 2026-11-26
links: ["#8", "#175", "#176", "0001-plain-files-in-git.md"]
---

# 0032: A hand-built command table on parseArgs

**Decision:** #8 replaces the `switch` in `packages/okb/src/cli.ts` with a command table we write ourselves, on `node:util` `parseArgs`. Each form of a command (`cq add`, `cq set`, or a bare `okb status`) is its own record, under a light parent that holds the group, the description and the form a bare command runs. A record is the spec and the router: its name, options, arguments and examples, plus a thin `run(ctx)` that names which op, runner and printer to use. Side effects live outside it: ops change the ontology, the runner loads and saves with the lock held, and `render.ts` prints. The help text and `docs/CLI.md` are both rendered from the records, so `commands.ts` stops being a second description. For 1.0, `property` and `relationship` become real commands instead of argv rewrites, the help wording may change, and ops return structured notes (a tip is marked as one) instead of `cli.ts` spotting tips with a regex. okb keeps no command history and no undo stack.

**Why:** the complexity in the CLI is each command being described twice (`commands.ts` and the `switch`) and every case repeating load, op, save, print. CLI libraries solve parsing, routing and help, which is the cheap part: `parse()` is three lines over `parseArgs` today. Spike #175 tried four on stub commands. citty kept only the last value of a repeated flag, accepted unknown flags and lost `-C` before the command. stricli has no global option and sets its own exit codes. clipanion worked, but its 4.0 release candidate hasn't moved since September 2024. commander passed every check, but it models none of the groups, forms, examples or argument descriptions `docs/CLI.md` needs, so we'd keep our own records and feed it from them. A history with undo would be a second history beside git ([0001](0001-plain-files-in-git.md)) that disagrees with it after a branch switch, merge or hand edit, and exact inverses for ops like `slot drop` or `rename` are hard to get right.

**Weighed:** commander behind our own records, which buys standard help and error messages for one dependency and an adapter. Not chosen: it adds nothing the records don't already need, and the parser can still be swapped later because records only see a typed `ctx`. oclif, which does model examples and generate docs, was set aside for its weight and build step. A full command-history pattern was ruled out; a one-step `okb undo` that restores the previous files is a follow-up (#176), waiting for evidence that beginners need it.

**Consequences:** a new command or form is one record, with no other file to edit. Most of #8's work is moving terminal output that is built inline in `cli.ts` into `render.ts`, so a record's `run` stays a few lines; a `console.log`, a file path or a non-argument `if` in a `run` belongs elsewhere. The `wine` example and the `--json` output must not change, but the help text may. The explicit `property` and `relationship` commands change behavior, so they land in their own PR after the table, with the shipped skills and docs updated. Every write goes through one runner, which is where #176 would hook in.
