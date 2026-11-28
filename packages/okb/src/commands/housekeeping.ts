/** Housekeeping: rename, remove, check, diff, release, and the help and version commands. */
import { type Command, opt } from "../command-table.ts";
import * as ops from "../ops.ts";
import { diffMarkdown } from "../diff.ts";
import { renderHelp } from "../help.ts";
import { formatCheck, formatNotes, renderDrift, renderPin, renderReleaseVerify } from "../render.ts";
import { check, diff, drift, pin, release, releaseVerify, versionLine } from "../workflows.ts";

const { str, bool } = opt;

export const housekeeping: Command[] = [
  {
    name: "rename",
    group: "Housekeeping",
    summary: "rename something everywhere",
    description: "Renames a class, slot or instance and updates everything that points to it.",
    forms: [
      {
        description: "Renames one thing.",
        examples: ["okb rename Vino Wine"],
        args: [
          ["<old name>", "name", "The current name."],
          ["<new name>", "text", "The new name."],
          ["--force", "flag", "Rename it even if the name breaks your convention."],
        ],
        options: { force: bool },
        usage: "Usage: okb rename <old name> <new name>",
        min: 2,
        max: 2,
        cheat: { example: "okb rename Vino Wine", description: "Rename something everywhere" },
        run: (ctx) => ctx.mutate((ont) => ops.rename(ont, ctx.args[0], ctx.args[1], ctx.opts.force)),
      },
    ],
  },
  {
    name: "remove",
    group: "Housekeeping",
    summary: "delete something",
    description: "Deletes a class, slot, instance, term or other node, with the edges that touch it.",
    forms: [
      {
        description: "Deletes one thing.",
        examples: ["okb remove Vino", "okb remove genre --type Slot"],
        args: [
          ["<name>", "name", "What to delete."],
          ["--type", "text", "Which kind, when a name is ambiguous: Class, Slot, Instance, Term and so on."],
        ],
        options: { type: str },
        usage: "Usage: okb remove <name> [--type Class|Slot|Instance|Term|...]",
        min: 1,
        cheat: { example: "okb remove Vino", description: "Delete something" },
        run: (ctx) => ctx.mutate((ont) => ops.remove(ont, ctx.args[0], ctx.opts.type ? [ctx.opts.type] : undefined)),
      },
    ],
  },
  {
    name: "drift",
    group: "Housekeeping",
    summary: "find near-duplicate quotes",
    description: "Finds near-duplicate quotes across the ontologies in the folders you name, which usually means one source was quoted twice or two ontologies drifted apart. It compares quotes with each other, not with their source documents; for that, run `okb source refresh --all`.",
    forms: [
      {
        description: "Checks one or more ontology folders. With none it checks the current folder.",
        examples: ["okb drift .", "okb drift ../wine ../food"],
        args: [
          ["[folder]...", "paths", "The ontology folders to check."],
        ],
        run: (ctx) => {
          const hits = drift(ctx.args);
          ctx.emit(() => hits, () => renderDrift(hits));
        },
      },
    ],
  },
  {
    name: "check",
    group: "Housekeeping",
    summary: "is this KB safe to merge?",
    description: "Says whether a knowledge base is safe to merge: no validation errors, every quote still in its source, and nothing unverified, unsupported or waiting for approval. Exits non-zero when a check fails, so a CI job can gate on it.",
    forms: [
      {
        description: "Checks the current folder. It reads the folder and its source files and never changes them or takes the write lock. Warnings from `okb validate` don't block a merge. It also warns when the installed okb is older than the `okbVersion` the KB pins in okb.json.",
        examples: ["okb check", "okb check --json", "okb check -C ../wine"],
        args: [
          ["--json", "flag", "Print the result as JSON: `ok`, the installed and pinned versions, and each check with its status, summary and problems."],
        ],
        usage: "Usage: okb check [--json]   (checks the current folder; use -C <folder> for another)",
        max: 0,
        run: async (ctx) => {
          const ont = ctx.load();
          const report = await check(ont);
          ctx.emit(() => report, () => formatCheck(report, ont.meta.name));
          ctx.exit(report.ok ? 0 : 1);
        },
      },
    ],
  },
  {
    name: "pin",
    group: "Housekeeping",
    summary: "record this okb version in okb.json",
    description: "Records the installed okb version in okb.json as `okbVersion`, so `okb check` warns anyone with an older okb and the CI workflow installs that version. Run it again after you upgrade okb.",
    forms: [
      {
        description: "Pins the installed version.",
        examples: ["okb pin"],
        args: [],
        usage: "Usage: okb pin   (records the installed okb version in okb.json)",
        max: 0,
        run: (ctx) => ctx.print(renderPin(pin(ctx.dir))),
      },
    ],
  },
  {
    name: "diff",
    group: "Housekeeping",
    summary: "what changed between two versions",
    description: "Shows what changed in the knowledge between two versions of an ontology: added, removed, renamed and changed things, rules side by side, moved quotes and changed links, in words rather than JSON lines.",
    forms: [
      {
        description: "Each side is an ontology folder or a git ref. With one argument, the other side is the current folder, so `okb diff main` shows what this branch changes. It never modifies the folder or checks anything out. The output is Markdown, ready for a PR comment; createdAt and updatedAt changes are not reported.",
        examples: ["okb diff main", "okb diff v1.0 v1.1", "okb diff ../wine-old .", "okb diff main --json"],
        args: [
          ["<old>", "folder or git ref", "The earlier version. An existing folder is read as it is; anything else is a branch, tag or commit in the repository around the current folder. A name that is both is an error that shows both spellings (`./name` for the folder, `refs/heads/name` for the branch)."],
          ["[new]", "folder or git ref", "The later version. Defaults to the current folder."],
          ["--json", "flag", "Print the changes as JSON for other tools."],
        ],
        usage: "Usage: okb diff <old> [<new>]   (each a folder or a git ref; with one, <new> is the current folder)",
        min: 1,
        max: 2,
        run: (ctx) => {
          const d = diff(ctx.dir, ctx.args[0], ctx.args[1]);
          ctx.emitRaw(() => d, () => diffMarkdown(d));
        },
      },
    ],
  },
  {
    name: "release",
    group: "Housekeeping",
    summary: "cut a pinned release, or verify one",
    description: "Cuts a numbered release of the knowledge base that other tools can pin: a manifest with the SHA-256 of every file and source, and a change log of what changed since the last release.",
    forms: [
      {
        description: "Writes `manifest.json` (the pin), `RELEASES.md` (every release's change log, newest first) and `releases/<version>/` (the files as released, plus `CHANGES.md` and `changes.json`), and records the version in `okb.json`. The change log is `okb diff` against the previous release's snapshot, so it lists renames with old and new names and renamed edge types. It stops, and writes nothing, if `okb validate` reports an error, if the version isn't newer than the last release, if a registered source file is missing or if nothing changed. Commit the files it writes.",
        examples: ["okb release 1.0.0", "okb release 1.1.0 --json"],
        args: [
          ["<version>", "semver", "The new version: `1.0.0`, `1.2.3` or `2.0.0-rc.1`. It must be higher than the version in `manifest.json`."],
          ["--json", "flag", "Print the version and the manifest as JSON."],
        ],
        usage: "Usage: okb release <version>  ·  okb release verify   (version is semver, like 1.0.0)",
        min: 1,
        max: 1,
        run: async (ctx) => {
          const r = await release(ctx.dir, ctx.args[0]);
          ctx.emit(() => ({ version: r.version, previous: r.previous ?? null, manifest: r.manifest }), () => formatNotes(r.notes));
        },
      },
      {
        sub: "verify",
        description: "Checks the files against `manifest.json`: every pinned file must exist and match its SHA-256, and `okb.json` must carry the manifest's version. It changes nothing. It exits 1 when something differs, so it can run in CI or before a server starts.",
        examples: ["okb release verify", "okb release verify -C ../wine --json"],
        args: [
          ["--json", "flag", "Print the result as JSON."],
        ],
        usage: "Usage: okb release verify   (checks the folder against its manifest.json; read-only)",
        max: 0,
        run: (ctx) => {
          const r = releaseVerify(ctx.dir);
          ctx.emit(() => r, () => renderReleaseVerify(r));
          ctx.exit(r.ok ? 0 : 1);
        },
      },
    ],
  },
  {
    name: "help",
    group: "Housekeeping",
    summary: "print this summary",
    description: "Prints a one-screen summary of the commands. `okb --help` and `okb -h` do the same.",
    forms: [
      {
        description: "Prints the summary.",
        examples: ["okb help"],
        args: [],
        run: (ctx) => ctx.print(renderHelp(ctx.commands)),
      },
    ],
  },
  {
    name: "version",
    group: "Housekeeping",
    summary: "print the okb version",
    description: "Prints the okb version and the version of the rules it carries. `okb --version` does the same.",
    aliases: ["--version"],
    forms: [
      {
        description: "Prints both versions.",
        examples: ["okb version"],
        args: [],
        run: (ctx) => ctx.print(versionLine()),
      },
    ],
  },
];
