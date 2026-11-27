/**
 * The runners a command record uses through its `Ctx`: load the folder, change it under the
 * lock, print. Records never touch the filesystem, the lock or `console` themselves.
 */
import { writeFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import { OkbError, Ontology } from "@ontology-kit/reader";
import type { Notes } from "./ops.ts";
import { formatNotes } from "./render.ts";
import { resolve, parseForm, type Command, type Ctx, type Globals } from "./command-table.ts";

function lines(text: string | string[]): string[] {
  return Array.isArray(text) ? text : [text];
}

function makeCtx(commands: readonly Command[], opts: Record<string, any>, args: string[], globals: Partial<Globals>): Ctx {
  const dir: string = globals.C ?? opts.C ?? ".";
  const print = (text: string | string[]) => {
    for (const l of lines(text)) console.log(l);
  };
  const say = (notes: Notes) => print(formatNotes(notes));
  const edit = <T>(fn: (ont: Ontology) => T): T => Ontology.edit(dir, fn);
  return {
    opts,
    args,
    json: globals.json ?? !!opts.json,
    commands,
    dir,
    int(name) {
      const x: string | undefined = opts[name];
      if (x === undefined) return undefined;
      if (!/^\d+$/.test(x)) throw new OkbError(`--${name} needs a whole number (0 or more).`);
      return Number(x);
    },
    load: () => Ontology.load(dir),
    edit,
    editAsync: (fn) => Ontology.edit(dir, fn),
    mutate(fn) {
      edit((ont) => {
        const notes = ont.tick(() => fn(ont));
        ont.save();
        say(notes);
      });
    },
    async mutateAsync(fn) {
      await Ontology.edit(dir, async (ont) => {
        const notes = await fn(ont);
        ont.save();
        say(notes);
      });
    },
    emit(data, build) {
      if (globals.json ?? opts.json) console.log(JSON.stringify(data(), null, 2));
      else {
        const out = lines(build());
        if (out.length) print(out);
      }
    },
    emitRaw(data, text) {
      if (globals.json ?? opts.json) console.log(JSON.stringify(data(), null, 2));
      else process.stdout.write(text());
    },
    say,
    print,
    printRaw: (text) => void process.stdout.write(text),
    write: (path, text) => writeFileSync(resolvePath(path), text),
    exit: (code) => void (process.exitCode = code),
  };
}

/** Run one command line (without the program name) against the table. */
export async function runCommand(commands: readonly Command[], argv: readonly string[], globals: Partial<Globals>): Promise<void> {
  const { form, rest } = resolve(commands, argv);
  const { opts, args } = parseForm(form, rest);
  await form.run!(makeCtx(commands, opts, args, globals));
}
