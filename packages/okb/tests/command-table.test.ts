// The command table (#8): records are the one description of a command, and the dispatcher, help and docs all read them.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { OkbError } from "@ontology-kit/reader";
import { leadingGlobals, parseForm, resolve, type Form } from "../src/command-table.ts";
import { cheatSheet, COMMANDS, documented } from "../src/commands.ts";
import { renderHelp, summary } from "../src/help.ts";

const GLOBAL_FLAGS = new Set(["-C", "--json"]);
const forms = COMMANDS.flatMap((cmd) => cmd.forms.map((form) => ({ cmd, form })));
const runnable = forms.filter(({ form }) => form.run);

describe("command records", () => {
  it("have unique names and, within a command, unique forms", () => {
    const names = COMMANDS.flatMap((c) => [c.name, ...(c.aliases ?? [])]);
    assert.deepEqual(names.filter((n, i) => names.indexOf(n) !== i), []);
    for (const c of COMMANDS) {
      const subs = c.forms.map((f) => f.sub ?? "");
      assert.deepEqual(subs.filter((s, i) => subs.indexOf(s) !== i), [], `okb ${c.name}`);
    }
  });

  it("run, unless they only describe a variant of another form or rewrite to another command", () => {
    for (const { cmd, form } of forms) {
      if (cmd.rewrite || form.run) continue;
      assert.ok(form.sub?.startsWith("--"), `okb ${cmd.name} ${form.sub ?? ""} has no run`);
    }
  });

  it("give a usage message wherever the arguments are checked", () => {
    for (const { cmd, form } of runnable) {
      if (form.min === undefined && form.max === undefined && !form.require) continue;
      assert.ok(form.usage, `okb ${cmd.name} ${form.sub ?? ""}`);
    }
  });

  it("document only options the form parses", () => {
    for (const { cmd, form } of runnable) {
      const known = new Set(Object.keys(form.options ?? {}).map((k) => `--${k}`));
      for (const [name] of form.args) {
        if (!name.startsWith("--") || GLOBAL_FLAGS.has(name)) continue;
        assert.ok(known.has(name), `okb ${cmd.name} ${form.sub ?? ""}: ${name} is documented but not parsed`);
      }
    }
  });

  it("have examples that reach their own form", () => {
    for (const { cmd, form } of forms) {
      if (cmd.rewrite || !form.run) continue;
      for (const example of form.examples) {
        const words = example.split(" ").slice(1);
        const hit = resolve(COMMANDS, words);
        assert.equal(hit.form, form, `${example} runs a different form`);
      }
    }
  });

  it("put every cheat-sheet card on a form that exists", () => {
    const cards = cheatSheet();
    assert.ok(cards.length > 20);
    for (const card of cards) assert.ok(card.example.startsWith(`okb ${card.command.name}`), card.example);
  });
});

describe("resolving a command line", () => {
  it("picks the form by its subcommand word, and the bare form otherwise", () => {
    assert.equal(resolve(COMMANDS, ["cq", "add", "Why?"]).form.sub, "add");
    assert.equal(resolve(COMMANDS, ["cq"]).form.sub, "list");
    assert.equal(resolve(COMMANDS, ["status"]).form.sub, undefined);
    assert.deepEqual(resolve(COMMANDS, ["class", "add", "Wine"]).rest, ["Wine"]);
    assert.equal(resolve(COMMANDS, ["release", "verify"]).form.sub, "verify");
    assert.equal(resolve(COMMANDS, ["release", "1.0.0"]).form.sub, undefined);
  });

  it("lists the subcommands when a command that needs one gets none or a wrong one", () => {
    for (const argv of [["class"], ["class", "bogus"]]) {
      assert.throws(() => resolve(COMMANDS, argv), (e) => e instanceof OkbError && /^Usage: okb class add\|set\|disjoint\|fix\|default\|restrict/.test(e.message));
    }
    assert.throws(() => resolve(COMMANDS, ["nope"]), /Unknown command 'nope'/);
  });

  it("rewrites property and relationship to slot, with --from and --to as --on and --range", () => {
    assert.equal(resolve(COMMANDS, ["property", "add", "body"]).form.sub, "add");
    const rel = resolve(COMMANDS, ["relationship", "add", "maker", "--from", "Wine", "--to", "Winery"]);
    assert.equal(rel.cmd.name, "slot");
    assert.deepEqual(rel.rest, ["maker", "--on", "Wine", "--range", "Winery", "--type", "Instance"]);
    assert.equal(resolve(COMMANDS, ["relationship", "property", "r", "p"]).cmd.name, "edgeprop");
  });

  it("answers --version as the version command", () => {
    assert.equal(resolve(COMMANDS, ["--version"]).cmd.name, "version");
  });
});

describe("parsing a form", () => {
  const form: Form = { description: "", examples: [], args: [], options: { n: { type: "string" }, tag: { type: "string", multiple: true } }, min: 1, usage: "Usage: x <a>" };
  it("reads options and positionals, and repeats", () => {
    const { opts, args } = parseForm(form, ["a", "--n", "1", "--tag", "x", "--tag", "y", "-C", "dir"]);
    assert.deepEqual({ args, n: opts.n, tag: opts.tag, C: opts.C }, { args: ["a"], n: "1", tag: ["x", "y"], C: "dir" });
  });
  it("throws the usage message when the arguments are wrong, and the parser's error for an unknown option", () => {
    assert.throws(() => parseForm(form, []), /Usage: x <a>/);
    assert.throws(() => parseForm(form, ["a", "--bogus"]), (e) => String((e as { code?: string }).code).startsWith("ERR_PARSE_ARGS"));
  });
  it("takes global options before the command", () => {
    assert.deepEqual(leadingGlobals(["-C", "wine", "--json", "status"]), { globals: { C: "wine", json: true }, rest: ["status"] });
    assert.deepEqual(leadingGlobals(["status", "-C", "wine"]), { globals: {}, rest: ["status", "-C", "wine"] });
  });
});

describe("help", () => {
  const help = renderHelp(COMMANDS);
  it("lists every documented command, once, under its group", () => {
    for (const cmd of documented()) assert.ok(help.includes(`okb ${cmd.name}`), cmd.name);
    assert.ok(!help.includes("edgeprop"));
    for (const group of new Set(documented().map((c) => c.group))) assert.ok(help.includes(`\n${group}\n`), group);
  });
  it("gives every documented command a short summary that fits a line", () => {
    for (const c of documented()) assert.ok(c.summary && c.summary.length <= 50, c.name);
  });
  it("shortens a description to its first sentence", () => {
    assert.equal(summary("Does a thing. Then another."), "Does a thing");
  });
});
