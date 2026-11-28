/**
 * The command table: what a command record is, and how a command line finds its record.
 *
 * Each form of a command (`cq add`, `cq set`, or a bare `okb status`) is one record. A record is
 * both the spec (description, examples, arguments, options) and the router (`run`), so the help
 * text and docs/CLI.md are rendered from it and nothing else describes a command. A record only
 * sees a typed `Ctx`, never the parser, so `parseArgs` could be swapped for another parser.
 *
 * Adding a command or a form is one record in a file under `src/commands/`.
 */
import { parseArgs } from "node:util";
import { OkbError, type Ontology } from "@ontology-kit/reader";
import type { Notes } from "./ops.ts";

/** [name, value type, description] */
export type Arg = readonly [name: string, type: string, description: string];

/** What a form accepts for one `--option`, in the shape `node:util` `parseArgs` takes. */
export type OptionSpec = { readonly type: "string" | "boolean"; readonly multiple?: boolean };
export type OptionSpecs = Readonly<Record<string, OptionSpec>>;

const str = { type: "string" } as const;
const strs = { type: "string", multiple: true } as const;
const bool = { type: "boolean" } as const;
/** The `<name>` argument's description in most `add` forms. */
export const NAME_DESC = "The name, in the case your naming convention asks for.";

/** Shorthands for writing option tables: a text value, a repeatable text value, a flag. */
export const opt = { str, strs, bool };

/** What a record's `run` sees: parsed values and the runners. It never sees the command line itself. */
export interface Ctx {
  /** Parsed `--options`, by name without the dashes (`--add-parent` is `"add-parent"`). */
  readonly opts: Record<string, any>;
  /** Positional arguments after the command and form words. */
  readonly args: string[];
  /** `--json` was given. */
  readonly json: boolean;
  /** Every command, for the help text. */
  readonly commands: readonly Command[];
  /** A whole number option (`--min 2`), or undefined when absent. */
  int(name: string): number | undefined;
  /** Read the ontology folder (`-C`, default `.`). */
  load(): Ontology;
  /** Load the folder, change it, save it and print the notes, all with the folder's lock held. */
  mutate(fn: (ont: Ontology) => Notes): void;
  mutateAsync(fn: (ont: Ontology) => Promise<Notes>): Promise<void>;
  /** Hold the folder's lock while `fn` runs; `fn` saves what it changed. */
  edit<T>(fn: (ont: Ontology) => T): T;
  editAsync<T>(fn: (ont: Ontology) => Promise<T>): Promise<T>;
  /** The ontology folder as given by `-C` (default `.`). */
  readonly dir: string;
  /** Print `data` as JSON under --json, otherwise the lines the printer builds. Nothing prints for no lines. */
  emit(data: () => unknown, lines: () => string | string[]): void;
  /** Print notes (tips dimmed). */
  say(notes: Notes): void;
  /** Like `emit`, but prints the text exactly as given (no trailing newline added). */
  emitRaw(data: () => unknown, text: () => string): void;
  /** Print text or lines. */
  print(lines: string | string[]): void;
  /** Print without a trailing newline (for piping a whole file). */
  printRaw(text: string): void;
  /** Write a file (relative to the working folder). */
  write(path: string, text: string): void;
  /** Set the process exit code. */
  exit(code: number): void;
}

export interface Form {
  /** The subcommand word, if any: `add` for `okb cq add`. A form without one is the bare command. */
  sub?: string;
  description: string;
  examples: string[];
  /** The documented arguments and options, in the order the reference shows them. */
  args: Arg[];
  /** The options this form parses (global `-C` and `--json` are always accepted). */
  options?: OptionSpecs;
  /** The message when the arguments are wrong. Required wherever `min`, `max` or `require` is set. */
  usage?: string;
  /** Fewest and most positional arguments. */
  min?: number;
  max?: number;
  /** Options that must be given. */
  require?: string[];
  /** Left out of the help text and docs/CLI.md (an internal or deprecated form). */
  hidden?: boolean;
  /** One card on docs/CLI-CHEAT-SHEET.md. */
  cheat?: { example: string; description: string };
  /** A form without `run` is documentation for a variant of another form (`docs --changed`). */
  run?: (ctx: Ctx) => void | Promise<void>;
}

export interface Command {
  name: string;
  /** The heading it appears under, by what you are trying to do. Commands appear in the order listed, so keep a group together. */
  group: string;
  /** A few words for the help text's command list. */
  summary?: string;
  description: string;
  forms: Form[];
  /** Other words that run this command (`--version`). */
  aliases?: string[];
  /** Which subcommand a bare `okb <command>` runs when the command has no bare form of its own. */
  bare?: string;
  /** Overrides the "Usage: okb x add|set ..." message for an unknown subcommand. */
  usage?: string;
  /** Rewrites the command line to another command's (everyday names for slot kinds). */
  rewrite?: (rest: string[]) => string[];
  /** Left out of the help text and docs/CLI.md. */
  hidden?: boolean;
}

/** Parsed global options plus where they came from. */
export interface Globals {
  C?: string;
  json: boolean;
}

/** The first thing on the command line: global options may come before the command. */
export function leadingGlobals(argv: readonly string[]): { globals: Partial<Globals>; rest: string[] } {
  const globals: Partial<Globals> = {};
  const rest = [...argv];
  for (;;) {
    if (rest[0] === "-C" && rest.length > 2) {
      // Same rule as the trailing form (parseArgs): an operand starting with a dash is a mistake, not a folder. `-C ./--json` is fine.
      if (rest[1].length > 1 && rest[1].startsWith("-")) {
        throw new OkbError(`Option '-C' argument is ambiguous.\nDid you forget to specify the option argument for '-C'?\nTo specify an option argument starting with a dash use '--C=-XYZ' or '-C-XYZ'.`);
      }
      globals.C = rest[1];
      rest.splice(0, 2);
    } else if (rest[0] === "--json" && rest.length > 1) {
      globals.json = true;
      rest.splice(0, 1);
    } else break;
  }
  return { globals, rest };
}

export interface Resolved {
  cmd: Command;
  form: Form;
  /** The words after the command and form words. */
  rest: string[];
}

const runnable = (cmd: Command) => cmd.forms.filter((f) => f.run);
const subWords = (cmd: Command) => runnable(cmd).filter((f) => f.sub && !f.hidden).map((f) => f.sub!);

/** Find the command and form for the words after global options; throws a usage error if there is none. */
export function resolve(commands: readonly Command[], argv: readonly string[]): Resolved {
  let words = [...argv];
  for (let hops = 0; hops < 3; hops++) {
    const [name, ...rest] = words;
    const cmd = commands.find((c) => c.name === name || c.aliases?.includes(name));
    if (!cmd) throw new OkbError(`Unknown command '${name}'. Run okb help.`);
    if (cmd.rewrite) {
      words = cmd.rewrite(rest);
      continue;
    }
    const forms = runnable(cmd);
    const named = rest[0] === undefined ? undefined : forms.find((f) => f.sub === rest[0]);
    if (named) return { cmd, form: named, rest: rest.slice(1) };
    const bare = forms.find((f) => !f.sub) ?? forms.find((f) => f.sub === cmd.bare);
    if (!bare) throw new OkbError(cmd.usage ?? `Usage: okb ${cmd.name} ${subWords(cmd).join("|")} ...  (okb help)`);
    return { cmd, form: bare, rest };
  }
  throw new OkbError("Command rewrite loop.");
}

const GLOBAL_OPTIONS: Record<string, { type: "string" | "boolean"; short?: string }> = { C: { type: "string", short: "C" }, json: bool };

/** Parse a form's words with its options; wrong arguments throw the form's usage message. */
export function parseForm(form: Form, rest: readonly string[]): { opts: Record<string, any>; args: string[] } {
  const { values, positionals } = parseArgs({ args: [...rest], options: { ...GLOBAL_OPTIONS, ...form.options }, allowPositionals: true, strict: true });
  const opts = values as Record<string, any>;
  const bad =
    (form.min !== undefined && positionals.length < form.min) ||
    (form.max !== undefined && positionals.length > form.max) ||
    (form.require ?? []).some((k) => !opts[k]);
  if (bad) throw new OkbError(form.usage!);
  return { opts, args: positionals };
}

/** True for a parse error from `parseArgs` (an unknown option, a missing value). */
export const isParseError = (e: unknown) => String((e as { code?: unknown })?.code ?? "").startsWith("ERR_PARSE_ARGS");

/** "true", "yes" or "1" (any case) is true; anything else is false; absent stays undefined. */
export const tri = (x: string | undefined) => (x === undefined ? undefined : ["true", "yes", "1"].includes(x.toLowerCase()));
