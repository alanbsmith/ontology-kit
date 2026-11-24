// The ontology-signoff skill (issue #135) must not drift from the CLI.
// 1. Every fenced `okb` command in the skill names a real command, subcommand and flags (from commands.ts).
// 2. The only write the skill makes is `okb verify <id> --approve`, and its hard rules say when.
// 3. Story 1 and Story 2 run on a fixture KB in a temp git repo, with the real CLI, following the skill's commands.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";
import { COMMANDS } from "../src/commands.ts";

const PKG = dirname(dirname(fileURLToPath(import.meta.url)));
const CLI = join(PKG, "src", "cli.ts");
const SKILL = readFileSync(join(PKG, "skills", "ontology-signoff", "SKILL.md"), "utf8");

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

describe("ontology-signoff skill: commands exist", () => {
  const cmds = skillCommands();

  it("has the three stories, the decision prompt and the close-out", () => {
    for (const h of ["Story 1:", "Story 2:", "Story 3:", "The decision prompt", "End of every session", "What this skill doesn't do"]) assert.match(SKILL, new RegExp(`^## ${h}`, "m"), h);
    assert.ok(cmds.length >= 8, `only ${cmds.length} commands found`);
  });

  it("every command, subcommand and flag exists in the command reference", () => {
    for (const words of cmds) {
      const cmd = COMMANDS.find((c) => c.name === words[0]);
      assert.ok(cmd, `okb ${words[0]} is not a command`);
      const sub = cmd.forms.some((f) => f.sub) && !words[1]?.startsWith("-") ? words[1] : undefined;
      if (sub !== undefined) {
        const bare = cmd.forms.find((f) => !f.sub);
        assert.ok(cmd.forms.some((f) => f.sub === sub) || bare, `okb ${words[0]} ${sub} is not a subcommand`);
      }
      const known = new Set(["--json", ...cmd.forms.flatMap((f) => f.args.map((a) => a[0])).filter((a) => a.startsWith("--"))]); // --json is accepted by every command
      for (const w of words.filter((w) => w.startsWith("--"))) assert.ok(known.has(w), `okb ${words.join(" ")}: ${w} is not a flag of okb ${words[0]}`);
    }
  });

  it("names the command and flags the stories rely on", () => {
    const all = cmds.map((w) => w.join(" "));
    for (const c of ["check", "status", "diff <base>", "docs --out <scratch folder> --context", "docs --out <scratch folder> --changed <base>", "docs --out <scratch folder>", "verify <rule id> --approve"]) assert.ok(all.includes(c), `missing: okb ${c}`);
  });

  it("writes only `okb verify <id> --approve`, once, and says when", () => {
    const writes = cmds.filter((w) => ["verify", "remove", "quote", "cite", "rule", "class", "slot", "rename", "decision", "source"].includes(w[0]!));
    assert.deepEqual(writes.map((w) => w.join(" ")), ["verify <rule id> --approve"]);
    assert.match(SKILL, /Approve only on the person's explicit yes for that named item/);
    assert.match(SKILL, /Never approve a batch the person hasn't read/);
    assert.match(SKILL, /Never edit the graph to fix a comment/);
    assert.match(SKILL, /Show the source before asking/);
    assert.match(SKILL, /Say what was not reviewed/);
    assert.match(SKILL, /\*\*ontology-maintainer\*\*, Flow 1/);
    assert.doesNotMatch(SKILL, /--ref|suggested note/);
  });

  it("states the same version as the other shipped skills", () => {
    const v = (name: string) => readFileSync(join(PKG, "skills", name, "SKILL.md"), "utf8").match(/^\*\*Version (\S+?)\.\*\*/m)?.[1];
    assert.ok(v("ontology-signoff"));
    assert.equal(v("ontology-signoff"), v("ontology-review"));
    assert.equal(v("ontology-signoff"), v("ontology-maintainer"));
  });
});

describe("ontology-signoff skill: stories 1 and 2 on a fixture", () => {
  let dir = "";
  let scratch = "";
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
  const read = (name: string) => readFileSync(join(scratch, name), "utf8");
  const DOC = "# Serving wine\n\n## Temperature\n\nServe red wine at room temperature.\n\nChill white wine before serving.\n\n## Storage\n\nStore bottles on their sides.\n\nKeep opened bottles in the fridge.\n\n## Glasses\n\nUse a tall glass for sparkling wine.\n";
  const addRule = (name: string, statement: string, modality: string, governs: string, quote: string) => {
    ok("quote", "add", "src.serving", quote, "--cites", governs);
    ok("rule", "add", "--statement", statement, "--modality", modality, "--governs", governs, "--cites", quoteFor(quote), "--name", name);
  };

  before(() => {
    dir = mkdtempSync(join(tmpdir(), "okb-signoff-"));
    scratch = mkdtempSync(join(tmpdir(), "okb-signoff-review-")); // outside the KB folder, as the skill says
    writeFileSync(join(dir, "serving.md"), DOC);
    ok("init", ".", "--name", "Wine");
    ok("convention", "--class-case", "PascalCase", "--slot-case", "camelCase", "--number", "singular");
    for (const c of ["RedWine", "WhiteWine", "Bottle", "Glass"]) ok("class", "add", c, "--desc", `About ${c}.`);
    ok("source", "add", "serving.md", "--id", "src.serving");
    addRule("serve-red-warm", "Red wine SHOULD be served at room temperature.", "SHOULD", "RedWine", "Serve red wine at room temperature.");
    addRule("chill-white", "White wine MUST be chilled before serving.", "MUST", "WhiteWine", "Chill white wine before serving.");
    addRule("store-sideways", "Bottles SHOULD be stored on their sides.", "SHOULD", "Bottle", "Store bottles on their sides.");
    addRule("fridge-opened", "Opened bottles MUST be kept in the fridge for a week.", "MUST", "Bottle", "Keep opened bottles in the fridge.");
    addRule("tall-glass", "Sparkling wine SHOULD be served in a tall glass.", "SHOULD", "Glass", "Use a tall glass for sparkling wine.");
    ok("verify", "rule.serve-red-warm", "--status", "SUPPORTED");
    ok("verify", "rule.chill-white", "--status", "OVERREACH", "--corrected", "White wine SHOULD be chilled before serving.", "--note", "The quote says to chill; it doesn't say MUST.");
    ok("verify", "rule.store-sideways", "--status", "SUPPORTED");
    ok("verify", "rule.fridge-opened", "--status", "UNSUPPORTED", "--note", "The quote gives no length of time.");
    for (const c of ["RedWine", "WhiteWine", "Bottle", "Glass"]) ok("verify", `c.${c.toLowerCase().replace("wine", "-wine")}`, "--status", "SUPPORTED");
    // rule.tall-glass is left unchecked.
    git("init", "-q", "-b", "main");
    git("add", "-A");
    git("commit", "-qm", "kb");
  });
  after(() => {
    rmSync(dir, { recursive: true, force: true });
    rmSync(scratch, { recursive: true, force: true });
  });

  it("Story 1: the page puts problem cases first, an approval clears one item, and check lists what is left", () => {
    // Step 1: count what is open.
    ok("status");
    const before = run("check");
    assert.equal(before.code, 1);
    assert.match(before.out, /chill-white/);
    assert.match(before.out, /fridge-opened/);

    // Step 2: the rules-in-context page, written outside the KB folder.
    ok("docs", "--out", scratch, "--context");
    const page = read("rules-in-context.md");
    const at = (name: string) => page.indexOf(`rule.${name}`);
    assert.ok(at("fridge-opened") >= 0 && at("chill-white") >= 0 && at("tall-glass") >= 0 && at("store-sideways") >= 0);
    // UNSUPPORTED, then OVERREACH not yet approved, then unchecked, then the rest.
    assert.ok(at("fridge-opened") < at("chill-white"), "UNSUPPORTED before OVERREACH");
    assert.ok(at("chill-white") < at("tall-glass"), "OVERREACH before unchecked");
    assert.ok(at("tall-glass") < at("store-sideways"), "unchecked before SUPPORTED");
    // The context the person needs for a decision is on the page: both wordings, the quote, the note and the lines around it.
    assert.match(page, /White wine MUST be chilled before serving\./);
    assert.match(page, /White wine SHOULD be chilled before serving\./);
    assert.match(page, /The quote says to chill; it doesn't say MUST\./);
    assert.match(page, /Chill white wine before serving\./);
    assert.match(page, /Serve red wine at room temperature\./, "the lines around the quote");
    assert.ok(existsSync(join(dir, "nodes.jsonl")) && !existsSync(join(dir, "rules-in-context.md")), "nothing is written into the KB folder");

    // Step 4: the person said "yes, approve the white wine rule" by name; the skill runs the one command.
    assert.match(ok("verify", "rule.chill-white", "--approve"), /./);
    // Rejecting or rewording the other items is a follow-up: the graph has not changed, so check still blocks on them.
    const left = run("check");
    assert.equal(left.code, 1);
    assert.doesNotMatch(left.out, /okb verify rule\.chill-white --approve/);
    assert.match(left.out, /fridge-opened/);
    assert.match(left.out, /tall-glass/);

    // Step 6: the read-through pages.
    ok("docs", "--out", scratch);
    assert.ok(existsSync(join(scratch, "index.md")) && existsSync(join(scratch, "rules.md")));
    assert.match(read("rules.md"), /chill-white/);
  });

  it("Story 2: diff, changed-only pages and the context page name the changed rule, and an approval is one named command", () => {
    git("add", "-A");
    git("commit", "-qm", "story 1 done");
    git("switch", "-qc", "change");
    // The change under review: a rule reworded by a corrected check, and a new rule on a class that others inherit from.
    ok("class", "add", "Sparkling", "--parent", "WhiteWine", "--desc", "A sparkling wine.");
    ok("verify", "rule.serve-red-warm", "--status", "OVERREACH", "--corrected", "Red wine SHOULD be served slightly below room temperature.", "--note", "Nothing in the quote says below.");

    // Step 2: what changed, in words.
    const diff = ok("diff", "main");
    assert.match(diff, /Sparkling/);
    assert.match(diff, /serve-red-warm|Red wine SHOULD/);

    // Step 3: changed-only pages, with changes.md.
    const out = ok("docs", "--out", join(scratch, "changed"), "--changed", "main");
    assert.match(out, /./);
    const changes = readFileSync(join(scratch, "changed", "changes.md"), "utf8");
    assert.match(changes, /Sparkling|RedWine|red-wine/);
    assert.ok(existsSync(join(scratch, "changed", "classes")), "changed class pages are written");
    assert.ok(!existsSync(join(scratch, "changed", "classes", "c.bottle.md")), "an unchanged class page is left out");
    // No source change, so there is no stale-quote worklist to hand to the maintainer.
    assert.doesNotMatch(changes, /\bgone\b.*\bquote/i);

    // Step 5: the context page has the rule the change touched, problem case first.
    ok("docs", "--out", scratch, "--context");
    const page = read("rules-in-context.md");
    assert.ok(page.indexOf("rule.serve-red-warm") < page.indexOf("rule.store-sideways"), "the corrected rule comes before a supported one");
    assert.match(page, /Nothing in the quote says below\./);
    assert.match(page, /Red wine SHOULD be served at room temperature\./, "the original wording of the corrected rule");

    // Step 6: the reviewer says "approve the red wine rule"; the skill runs that one command, then checks.
    ok("verify", "rule.serve-red-warm", "--approve");
    const after = run("check");
    assert.doesNotMatch(after.out, /okb verify rule\.serve-red-warm --approve/);
    assert.match(after.out, /fridge-opened/, "what is left is still listed for a person");
  });

  it("Story 2 hand-off: a source edited without a re-sync shows up in changes.md", () => {
    writeFileSync(join(dir, "serving.md"), DOC.replace("Store bottles on their sides.", "Store bottles lying down."));
    ok("docs", "--out", join(scratch, "stale"), "--changed", "main");
    const changes = readFileSync(join(scratch, "stale", "changes.md"), "utf8");
    assert.match(changes, /Store bottles on their sides\.|Store bottles lying down\./, "the gone quote and the changed block are listed");
    assert.equal(run("check").code, 1, "check fails on the gone quote until the maintainer re-syncs");
  });
});
