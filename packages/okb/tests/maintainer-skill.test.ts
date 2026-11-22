// The ontology-maintainer skill (issue #21) must not drift from the CLI.
// 1. Every fenced `okb` command in the skill names a real command, subcommand and flags (from commands.ts).
// 2. The skill never runs `--approve` itself.
// 3. Flows 1 and 2 run end to end on a fixture KB in a temp git repo, with the real CLI.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";
import { COMMANDS } from "../src/commands.ts";

const PKG = dirname(dirname(fileURLToPath(import.meta.url)));
const CLI = join(PKG, "src", "cli.ts");
const SKILL = readFileSync(join(PKG, "skills", "ontology-maintainer", "SKILL.md"), "utf8");

/** Split a command line into words, keeping "quoted text" and <placeholder words> together. */
function words(line: string): string[] {
  return line.match(/"[^"]*"|<[^>]*>|\S+/g) ?? [];
}

/** The `okb ...` lines inside fenced code blocks of the skill. */
function skillCommands(): string[][] {
  const out: string[][] = [];
  for (const block of SKILL.matchAll(/^ *```[a-z]*\n([\s\S]*?)^ *```/gm)) {
    for (const line of block[1]!.split("\n").map((l) => l.trim())) if (line.startsWith("okb ")) out.push(words(line).slice(1));
  }
  return out;
}

describe("ontology-maintainer skill: commands exist", () => {
  const cmds = skillCommands();

  it("has fenced commands for every flow", () => {
    assert.ok(cmds.length >= 20, `only ${cmds.length} commands found`);
    for (const flow of [1, 2, 3, 4, 5, 6]) assert.match(SKILL, new RegExp(`^## Flow ${flow}:`, "m"));
  });

  it("every command, subcommand and flag exists in the command reference", () => {
    for (const words of cmds) {
      const cmd = COMMANDS.find((c) => c.name === words[0]);
      assert.ok(cmd, `okb ${words[0]} is not a command`);
      const sub = cmd.forms.some((f) => f.sub) && !words[1]?.startsWith("-") ? words[1] : undefined;
      if (sub !== undefined && cmd.forms.some((f) => f.sub)) {
        // A subcommand word, unless the command also takes a bare argument (such as `okb release <version>`).
        const bare = cmd.forms.find((f) => !f.sub);
        assert.ok(cmd.forms.some((f) => f.sub === sub) || bare, `okb ${words[0]} ${sub} is not a subcommand`);
      }
      const known = new Set(["--json", ...cmd.forms.flatMap((f) => f.args.map((a) => a[0])).filter((a) => a.startsWith("--"))]); // --json is accepted by every command
      for (const w of words.filter((w) => w.startsWith("--"))) assert.ok(known.has(w), `okb ${words.join(" ")}: ${w} is not a flag of okb ${words[0]}`);
    }
  });

  it("never runs --approve in a command; it only tells a person to", () => {
    assert.ok(!cmds.some((w) => w.includes("--approve")), "a fenced command approves");
    assert.match(SKILL, /Never run `okb verify <id> --approve`/);
    assert.match(SKILL, /\*\*Stop for a person\*\*/);
  });

  it("states the same version as the other shipped skills", () => {
    const v = (name: string) => readFileSync(join(PKG, "skills", name, "SKILL.md"), "utf8").match(/^\*\*Version (\S+?)\.\*\*/m)?.[1];
    assert.ok(v("ontology-maintainer"));
    assert.equal(v("ontology-maintainer"), v("ontology-review"));
  });
});

describe("ontology-maintainer skill: flows 1 and 2 on a fixture", () => {
  let dir = "";
  const run = (...args: string[]) => {
    const r = spawnSync("node", [CLI, ...args], { cwd: dir, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });
    return { code: r.status, out: r.stdout + r.stderr, stdout: r.stdout };
  };
  const ok = (...args: string[]) => {
    const r = run(...args);
    assert.equal(r.code, 0, `okb ${args.join(" ")}\n${r.out}`);
    return r.out;
  };
  const git = (...args: string[]) => {
    const r = spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd: dir, encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr);
  };
  const nodes = () => readFileSync(join(dir, "nodes.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const quoteFor = (text: string) => nodes().find((n) => n.type === "SourceLocation" && n.quote.includes(text)).id as string;
  const DOC = "# Serving wine\n\n## Temperature\n\nServe red wine at room temperature.\n\nChill white wine before serving.\n\n## Storage\n\nStore bottles on their sides.\n";

  before(() => {
    dir = mkdtempSync(join(tmpdir(), "okb-maintainer-"));
    writeFileSync(join(dir, "serving.md"), DOC);
    ok("init", ".", "--name", "Wine");
    ok("convention", "--class-case", "PascalCase", "--slot-case", "camelCase", "--number", "singular");
    ok("class", "add", "WhiteWine", "--desc", "A wine made from white grapes.");
    ok("source", "add", "serving.md", "--id", "src.serving");
    ok("quote", "add", "src.serving", "Chill white wine before serving.", "--cites", "WhiteWine");
    ok("rule", "add", "--statement", "White wine SHOULD be chilled before serving.", "--modality", "SHOULD", "--governs", "WhiteWine", "--cites", quoteFor("Chill white"), "--name", "chill-white");
    ok("verify", "c.white-wine", "--status", "SUPPORTED");
    ok("verify", "rule.chill-white", "--status", "SUPPORTED");
    git("init", "-q", "-b", "main");
    git("add", "-A");
    git("commit", "-qm", "kb");
    git("switch", "-qc", "docs-changed");
  });
  after(() => rmSync(dir, { recursive: true, force: true }));

  it("starts clean: okb status and okb check pass before any change", () => {
    ok("status");
    assert.match(ok("check"), /Safe to merge/);
  });

  it("Flow 1: a reworded quote is found, replaced, re-verified and ends in a mergeable diff", () => {
    writeFileSync(join(dir, "serving.md"), DOC.replace("Chill white wine before serving.", "Chill white wine for two hours before serving.").replace("Store bottles on their sides.", "Store bottles on their sides.\n\nNever freeze opened bottles."));

    // Step 1: --dry-run writes nothing and reports the gone quote with its citations.
    const dry = run("source", "refresh", "--all", "--json", "--dry-run");
    assert.equal(dry.code, 1, "a gone quote exits with 1");
    const report = JSON.parse(dry.stdout);
    assert.equal(report.gone.length, 1);
    assert.ok(report.gone[0].citedBy.length >= 1);
    assert.deepEqual(report.worklist.map((w: { change: string }) => w.change).sort(), ["changed", "new"]);
    const old = report.gone[0].quote;
    assert.equal(run("check").code, 1, "check fails on the gone quote until it is fixed");

    // Step 2: replace the quote, move the citation, remove the old one.
    ok("quote", "add", "src.serving", "Chill white wine for two hours before serving.", "--cites", "WhiteWine");
    const fresh = quoteFor("for two hours");
    ok("cite", "rule.chill-white", fresh);
    ok("remove", old);

    // Step 3-4: the changed rule text is re-verified; a corrected one waits for a person.
    ok("verify", "rule.chill-white", "--status", "OVERREACH", "--corrected", "White wine SHOULD be chilled for two hours before serving.");
    assert.match(run("check").out, /A person must check it: okb verify rule\.chill-white --approve/);
    ok("verify", "c.white-wine", "--status", "SUPPORTED");

    // Step 5: the baseline is recorded only now; the person approves (the skill never does).
    ok("verify", "rule.chill-white", "--approve");
    const rec = run("source", "refresh", "--all", "--json", "--record");
    assert.equal(rec.code, 0, rec.out);
    assert.deepEqual(JSON.parse(rec.stdout).gone, []);

    // Step 6: validate, check, diff.
    ok("validate", "--all");
    assert.match(ok("check"), /Safe to merge/);
    const diff = ok("diff", "main");
    assert.match(diff, /chill-white|White wine SHOULD be chilled/);
    assert.doesNotMatch(diff, /Removed\*\* `WhiteWine`/);

    // The next refresh is quiet: only what changes after this one will be listed.
    const again = JSON.parse(run("source", "refresh", "--all", "--json").stdout);
    assert.deepEqual([again.gone, again.worklist], [[], []]);
    git("add", "-A");
    git("commit", "-qm", "docs changed");
  });

  it("Flow 2: a reviewer says a rule overreaches; one fix, then check and diff", () => {
    ok("verify", "rule.chill-white", "--status", "OVERREACH", "--corrected", "White wine SHOULD be chilled before serving; the source gives two hours.");
    const failing = run("check");
    assert.equal(failing.code, 1);
    assert.match(failing.out, /okb verify rule\.chill-white --approve/);
    assert.match(ok("explain", "prov-verified"), /./);
    ok("verify", "rule.chill-white", "--approve"); // a person's step
    assert.match(ok("check"), /Safe to merge/);
    assert.match(ok("diff", "main"), /chill-white|White wine/);
  });
});
