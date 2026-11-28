import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { COMMANDS } from "../src/commands.ts";
import { renderHelp } from "../src/help.ts";
import { leadingGlobals } from "../src/command-table.ts";

const CLI = join(import.meta.dirname, "../src/cli.ts");
const run = (cwd: string, ...args: string[]) => spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: "utf8" });

describe("a leading -C operand", () => {
  const tmp = mkdtempSync(join(tmpdir(), "okb-globals-"));
  cpSync(join(import.meta.dirname, "../examples/espresso"), join(tmp, "e"), { recursive: true });
  const dir = join(tmp, "e");

  it("that starts with a dash is a usage error and runs nothing", () => {
    const before = run(dir, "tree", "--json").stdout;
    const r = run(dir, "-C", "--json", "remove", "Espresso");
    assert.equal(r.status, 2);
    assert.match(r.stderr, /Option '-C' argument is ambiguous/);
    assert.equal(r.stdout, "");
    assert.equal(run(dir, "tree", "--json").stdout, before);
  });

  it("matches the trailing form's exit code", () => {
    assert.equal(run(dir, "remove", "Espresso", "-C", "--json").status, 2);
  });

  it("accepts an explicit path that contains a dash", () => {
    assert.deepEqual(leadingGlobals(["-C", "./--json", "status"]), { globals: { C: "./--json" }, rest: ["status"] });
    assert.deepEqual(leadingGlobals(["-C", "-", "status"]), { globals: { C: "-" }, rest: ["status"] });
    const odd = join(tmp, "--json");
    mkdirSync(odd);
    writeFileSync(join(odd, "note"), "");
    const r = run(tmp, "-C", "./--json", "status");
    assert.ok(!/ambiguous/.test(r.stderr));
    assert.ok(existsSync(odd));
  });
});

describe("usage in the help text", () => {
  const lines = renderHelp(COMMANDS).split("\n");
  const usage = (name: string) => lines.find((l) => l.startsWith(`  okb ${name} `)) ?? "";

  it("shows the version as an alternative to `verify` for release", () => {
    assert.match(usage("release"), /^ {2}okb release <version>\|verify /);
  });

  it("shows a required option with its operand and no brackets", () => {
    assert.match(usage("docs"), /^ {2}okb docs --out <folder> /);
    assert.doesNotMatch(usage("docs"), /\[--out\]/);
  });

  it("keeps brackets on an optional option", () => {
    assert.match(usage("diagram"), /^ {2}okb diagram \[--out\] /);
  });
});
