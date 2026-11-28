/**
 * The text of `okb help`, rendered from the command records so it can't drift from what the
 * commands do. Its own module so the docs generator can read it without running the CLI.
 */
import type { Arg, Command } from "./command-table.ts";

/** The first sentence of a description. */
export function summary(text: string): string {
  return text.split(/(?<=\.)\s+(?=[A-Z`])/)[0].replace(/`/g, "").replace(/\.$/, "");
}

const MAX_FLAGS = 4;
/** A usage wider than this puts its summary on the next line. */
const MAX_USAGE = 48;

/** `okb init <folder> [--name]`: a single-form command shows its arguments, from the record; several forms show their subcommands. */
function usageOf(cmd: Command): string {
  const forms = cmd.forms.filter((f) => !f.sub?.startsWith("--") && !f.hidden);
  const subs = forms.filter((f) => f.sub).map((f) => f.sub);
  const bare = forms.find((f) => !f.sub);
  const rows = (bare?.args ?? []).filter((a) => a[0] !== "--json");
  const words = rows.filter((a) => !a[0].startsWith("--")).map((a) => a[0]);
  if (subs.length) {
    // A bare form that needs an argument (`okb release <version>`) is not optional: show it as one of the alternatives.
    if (bare && (bare.min ?? 0) > 0) return `${cmd.name} ${[words.join(" "), ...subs].join("|")}`;
    return `${cmd.name} ${bare ? `[${subs.join("|")}]` : subs.join("|")}`;
  }
  const flags = rows.filter((a) => a[0].startsWith("--"));
  const shown = flags.length > MAX_FLAGS ? ["[options]"] : flags.map((a) => optionUsage(a, bare?.require));
  return [cmd.name, ...words, ...shown].join(" ");
}

/** A required option shows its operand without brackets (`--out <folder>`); an optional one stays in brackets. */
export function optionUsage([name, type]: Arg, required: readonly string[] = []): string {
  if (!required.includes(name.replace(/^--/, ""))) return `[${name}]`;
  return `${name} <${/^[\w-]+$/.test(type) ? type : "value"}>`;
}

/** One line per command, grouped by what you are trying to do: its name, its subcommands, and what it does. */
export function renderHelp(commands: readonly Command[]): string {
  const rows: { group: string; usage: string; what: string }[] = [];
  for (const cmd of commands) {
    if (cmd.hidden) continue;
    rows.push({ group: cmd.group, usage: `okb ${usageOf(cmd)}`, what: cmd.summary ?? summary(cmd.description) });
  }
  const width = Math.max(...rows.filter((r) => r.usage.length <= MAX_USAGE).map((r) => r.usage.length)) + 3;
  const lines = ["okb: build an ontology step by step (Ontology 101 method)"];
  let group = "";
  for (const r of rows) {
    if (r.group !== group) {
      lines.push("", r.group);
      group = r.group;
    }
    lines.push(r.usage.length > MAX_USAGE ? `  ${r.usage}\n  ${"".padEnd(width)}${r.what}` : `  ${r.usage.padEnd(width)}${r.what}`);
  }
  lines.push(
    "",
    "Start with: okb init <folder> --name \"My Ontology\", then okb status and okb step.",
    "Learn a concept or rule: okb explain <topic>.",
    "Every command, with examples and options: docs/CLI.md, or https://ontology-kit.dev/reference/cli-reference/",
    "",
    "Names: when a class and a slot share a name, say which: class:Genre / slot:genre",
    "Global options: -C <folder> (default: current folder) · --json (machine-readable output where supported)",
  );
  return lines.join("\n");
}
