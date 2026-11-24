// The maintainer guide (docs/build/maintaining.md) shows command sequences on a copy of the wine example.
// This runs them with the real CLI so the guide can't drift, and checks the shipped PR checklist matches the guide.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";

const PKG = dirname(dirname(fileURLToPath(import.meta.url)));
const GUIDE = readFileSync(join(PKG, "..", "..", "docs", "build", "maintaining.md"), "utf8");
const TEMPLATE = readFileSync(join(PKG, "templates", "pull_request_template.md"), "utf8");

describe("maintainer guide", () => {
  let dir: string;
  const okb = (...args: string[]) => {
    const r = spawnSync("node", [join(PKG, "src", "cli.ts"), ...args], { cwd: dir, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });
    return { code: r.status, out: r.stdout + r.stderr };
  };
  const ok = (...args: string[]) => {
    const r = okb(...args);
    assert.equal(r.code, 0, `okb ${args.join(" ")}\n${r.out}`);
    return r.out;
  };
  const git = (...args: string[]) => spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd: dir, encoding: "utf8" });
  const quoteIds = () => readFileSync(join(dir, "nodes.jsonl"), "utf8").match(/loc\.serving-wine-[a-z0-9]+/g) ?? [];

  before(() => {
    dir = mkdtempSync(join(tmpdir(), "okb-maintaining-"));
    for (const f of ["okb.json", "nodes.jsonl", "edges.jsonl"]) cpSync(join(PKG, "examples", "wine", f), join(dir, f));
    git("init", "-q", "-b", "main");
    git("add", ".");
    git("commit", "-q", "-m", "kb");
  });
  after(() => rmSync(dir, { recursive: true, force: true }));

  it("documents every command it runs", () => {
    for (const c of ["okb pin", "okb diff main", "okb check", "okb rename Winery Producer", "okb source refresh src.serving-wine", "okb release 1.0.0", "okb release verify"]) {
      assert.ok(GUIDE.includes(c), `the guide shows ${c}`);
    }
  });

  it("a class change and a rename show up in okb diff and pass okb check", () => {
    ok("pin");
    git("commit", "-qam", "pin");
    ok("class", "add", "SparklingWine", "--parent", "Wine", "--desc", "A wine with bubbles.");
    assert.match(ok("diff", "main"), /Added\*\* `SparklingWine`/);
    assert.match(ok("check"), /Safe to merge/);
    git("commit", "-qam", "sparkling");
    ok("rename", "Winery", "Producer");
    assert.match(ok("diff", "main"), /Renamed\*\* `Winery` → `Producer`/);
    assert.match(ok("check"), /Safe to merge/);
    git("commit", "-qam", "rename");
  });

  it("a source, a quote, a rule, a correction and its approval", () => {
    mkdirSync(join(dir, "sources"));
    writeFileSync(join(dir, "sources", "serving.md"), "# Serving wine\n\n## Temperature\n\nServe red wine at cellar temperature. Chill white wine before serving.\n");
    ok("source", "add", "sources/serving.md");
    ok("quote", "add", "src.serving-wine", "Chill white wine before serving.", "--cites", "WhiteWine");
    const q = quoteIds()[0]!;
    ok("rule", "add", "--statement", "White wine SHOULD be chilled before serving.", "--modality", "SHOULD", "--governs", "WhiteWine", "--cites", q);
    const rule = "rule.white-wine-should-be-chilled-before";
    assert.equal(okb("check").code, 1, "an unverified rule blocks the merge");
    ok("verify", "c.white-wine", "--status", "SUPPORTED");
    ok("verify", rule, "--status", "OVERREACH", "--corrected", "White wine SHOULD be chilled before serving, but the source doesn't say to what temperature.");
    assert.match(okb("check").out, /A person must check it/);
    ok("verify", rule, "--approve");
    assert.match(ok("check"), /Safe to merge/);
    git("add", "-A");
    git("commit", "-qm", "source");
  });

  it("a changed source breaks the quote until it is replaced", () => {
    const old = quoteIds()[0]!;
    writeFileSync(join(dir, "sources", "serving.md"), "# Serving wine\n\n## Temperature\n\nServe red wine at cellar temperature. Chill white wine well before serving.\n");
    assert.match(okb("source", "refresh", "src.serving-wine").out, /1 missing/);
    assert.equal(okb("check").code, 1);
    ok("quote", "add", "src.serving-wine", "Chill white wine well before serving.", "--cites", "c.white-wine");
    const fresh = quoteIds().find((id) => id !== old)!;
    ok("cite", "rule.white-wine-should-be-chilled-before", fresh);
    ok("remove", old);
    assert.match(ok("check"), /Safe to merge/);
    git("add", "-A");
    git("commit", "-qm", "quote");
  });

  it("a release writes a manifest and verifies", () => {
    ok("release", "1.0.0");
    assert.ok(readdirSync(dir).includes("manifest.json"));
    assert.match(ok("release", "verify"), /matches its manifest/);
  });

  it("the PR checklist the guide shows is the one the package ships", () => {
    const shown = GUIDE.match(/```markdown\n([\s\S]*?)\n```/)?.[1];
    assert.ok(shown, "the guide shows the checklist");
    assert.equal(shown.trim(), TEMPLATE.replace(/^<!-- Copy this file[^\n]*-->\n\n/, "").trim());
  });
});
