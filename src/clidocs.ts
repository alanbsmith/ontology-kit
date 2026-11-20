/**
 * Renders docs/CLI.md from the command reference in src/commands.ts. The help text
 * (src/help.ts) stays the terminal summary; `undocumentedFlags` keeps the two from drifting.
 */
import { CHEAT_SHEET, COMMANDS, type Arg, type Command, type Form } from "./commands.ts";

/** A stable anchor for a command or subcommand section: `cmd-class`, `cmd-class-add`. */
export const cmdAnchor = (cmd: string, sub?: string) => `cmd-${cmd}${sub ? `-${sub}` : ""}`;

const cell = (s: string) => s.replace(/\|/g, "\\|");
const GLOBAL_ARGS: Arg[] = [
  ["-C", "path", "The ontology folder. Defaults to the current folder."],
  ["--json", "flag", "Print machine-readable output, for commands that support it."],
];

function table(args: readonly Arg[]): string[] {
  return ["| Argument | Type | Description |", "| --- | --- | --- |", ...args.map(([n, t, d]) => `| \`${cell(n)}\` | ${cell(t)} | ${cell(d)} |`), ""];
}

function form(cmd: Command, f: Form, lines: string[]) {
  const level = f.sub ? "####" : "###";
  if (f.sub) lines.push(`<a id="${cmdAnchor(cmd.name, f.sub)}"></a>`, `#### okb ${cmd.name} ${f.sub}`, "", f.description, "");
  lines.push("```bash", ...f.examples.map((e) => `$ ${e}`), "```", "");
  if (f.args.length) lines.push(`${level}# Arguments`, "", ...table(f.args));
}

/** Commands in `COMMANDS` order, grouped by their `group`, each group once. */
function groups(): [string, Command[]][] {
  const out = new Map<string, Command[]>();
  for (const c of COMMANDS) out.set(c.group, [...(out.get(c.group) ?? []), c]);
  return [...out];
}

export function renderCliDocs(): string {
  const lines = [
    "# CLI reference",
    "",
    "## Overview",
    "",
    "This page lists every `okb` command, grouped by what you are trying to do. Each entry shows what the command does, an example, and a table of its arguments. For the commands you will use most, see the [cheat sheet](CLI-CHEAT-SHEET.md). In your terminal, `okb help` prints a short summary.",
    "",
    "Angle brackets like `<name>` mark a required argument, and square brackets like `[name]` mark an optional one. Two options work with most commands:",
    "",
    ...table(GLOBAL_ARGS),
    "> **Tip:** When a class and a slot share a name, say which one you mean with `class:Genre` or `slot:genre`.",
    "",
  ];
  for (const [group, cmds] of groups()) {
    lines.push(`## ${group}`, "");
    for (const cmd of cmds) {
      lines.push(`<a id="${cmdAnchor(cmd.name)}"></a>`, `### okb ${cmd.name}`, "", cmd.description, "");
      for (const f of cmd.forms) form(cmd, f, lines);
    }
  }
  return lines.join("\n");
}

export function renderCheatSheet(): string {
  const lines = [
    "# CLI cheat sheet",
    "",
    "The `okb` commands you will use most, in the order you usually need them. For every command and argument, see the [full reference](CLI.md).",
    "",
  ];
  const rows = CHEAT_SHEET.map((c) => ({ ...c, group: COMMANDS.find((k) => k.name === c.example.split(" ")[1])?.group ?? "" }));
  for (const [group] of groups()) {
    const mine = rows.filter((r) => r.group === group);
    if (!mine.length) continue;
    lines.push(`## ${group}`, "");
    for (const r of mine) lines.push('<div class="cheat-card">', "", `${r.description}:`, "", "```bash", r.example, "```", "", "</div>", "");
  }
  return lines.join("\n");
}

/** Flags the help text shows for a command that its reference entry doesn't document. */
export function undocumentedFlags(help: string): string[] {
  const missing: string[] = [];
  const known = new Map(COMMANDS.map((c) => [c.name, new Set(c.forms.flatMap((f) => f.args.map((a) => a[0])))]));
  for (const line of help.split("\n")) {
    for (const piece of line.split(/\s+·\s+|\s{3,}(?=okb [a-z])/)) {
      const m = piece.trim().match(/^okb ([a-z]+)/);
      if (!m) continue;
      const doc = known.get(m[1]);
      for (const [, flag] of piece.matchAll(/(?<![\w-])(--[a-z][a-z-]*)/g)) {
        if (!doc?.has(flag) && !["--json", "--help"].includes(flag)) missing.push(`okb ${m[1]} ${flag}`);
      }
    }
  }
  return missing;
}
