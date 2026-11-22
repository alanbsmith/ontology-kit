// okb check (issue #16): one command that says a KB is safe to merge, and the workflow template that runs it.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";
import { parse } from "yaml";
import { CHECK_STEPS, compareVersions } from "../src/check.ts";
import { PACKAGE_VERSION } from "../src/version.ts";

const PKG = dirname(dirname(fileURLToPath(import.meta.url)));
const CLI = join(PKG, "src", "cli.ts");
const WINE = join(PKG, "examples", "wine");
const SOURCE_TEXT = "# Guide\n\nServing\n\nServe red wine at room temperature.\n\nChill white wine before serving.\n";

const readLines = (f: string): any[] => readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const writeLines = (f: string, rows: any[]) => writeFileSync(f, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");

/** A KB repository: the wine example plus a cited rule and its source file, committed to git. */
function makeKb(parent: string, name: string): string {
  const dir = join(parent, name);
  mkdirSync(dir, { recursive: true });
  for (const f of ["okb.json", "nodes.jsonl", "edges.jsonl"]) copyFileSync(join(WINE, f), join(dir, f));
  writeFileSync(join(dir, "guide.md"), SOURCE_TEXT);
  const nodes = readLines(join(dir, "nodes.jsonl"));
  const edges = readLines(join(dir, "edges.jsonl"));
  nodes.push(
    { id: "src.guide", type: "Source", title: "Wine guide", localPath: "guide.md", format: "markdown" },
    { id: "loc.guide.ab12cd", type: "SourceLocation", quote: "Serve red wine at room temperature.", lines: "5", startLine: 5, endLine: 5 },
    { id: "rule.serve-red", type: "Rule", name: "serve-red", modality: "SHOULD", statement: "Serve red wine at room temperature.", verification: { status: "SUPPORTED" } },
  );
  edges.push(
    { from: "loc.guide.ab12cd", type: "PART_OF", to: "src.guide" },
    { from: "rule.serve-red", type: "CITES", to: "loc.guide.ab12cd" },
    { from: "rule.serve-red", type: "GOVERNS", to: "c.red-wine" },
  );
  writeLines(join(dir, "nodes.jsonl"), nodes);
  writeLines(join(dir, "edges.jsonl"), edges);
  for (const args of [["init", "-q", "-b", "main"], ["add", "."], ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "-m", "kb"]]) {
    spawnSync("git", args, { cwd: dir, encoding: "utf8" });
  }
  return dir;
}

function edit(dir: string, fn: (g: { nodes: any[]; edges: any[] }) => void): void {
  const g = { nodes: readLines(join(dir, "nodes.jsonl")), edges: readLines(join(dir, "edges.jsonl")) };
  fn(g);
  writeLines(join(dir, "nodes.jsonl"), g.nodes);
  writeLines(join(dir, "edges.jsonl"), g.edges);
}

function okb(cwd: string, ...args: string[]) {
  const r = spawnSync("node", [CLI, ...args], { cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });
  return { code: r.status, out: r.stdout, err: r.stderr };
}
const check = (dir: string) => JSON.parse(okb(dir, "check", "--json").out);
const failing = (r: any) => r.steps.filter((s: any) => s.status === "fail").map((s: any) => s.id);

describe("okb check", () => {
  let work: string;
  before(() => void (work = mkdtempSync(join(tmpdir(), "okb-check-"))));
  after(() => rmSync(work, { recursive: true, force: true }));

  it("passes a clean KB with exit 0, and says so", () => {
    const dir = makeKb(work, "clean");
    const r = okb(dir, "check");
    assert.equal(r.code, 0, r.out + r.err);
    assert.match(r.out, /Safe to merge/);
    assert.deepEqual(failing(check(dir)), []);
  });

  it("fails on a planted unverified rule, naming the rule", () => {
    const dir = makeKb(work, "unverified");
    edit(dir, (g) => delete g.nodes.find((n) => n.id === "rule.serve-red").verification);
    const r = okb(dir, "check");
    assert.equal(r.code, 1);
    assert.match(r.out, /Not safe to merge/);
    assert.match(r.out, /rule\.serve-red|serve-red/);
    assert.match(r.out, /hasn't been verified/);
    assert.deepEqual(failing(check(dir)), ["verification"]);
  });

  it("fails on a rule whose check ended in OVERREACH or UNSUPPORTED", () => {
    const dir = makeKb(work, "disputed");
    edit(dir, (g) => (g.nodes.find((n) => n.id === "rule.serve-red").verification = { status: "UNSUPPORTED" }));
    assert.deepEqual(failing(check(dir)), ["verification"]);
  });

  it("fails when a quote is no longer in its source", () => {
    const dir = makeKb(work, "stale");
    writeFileSync(join(dir, "guide.md"), "# Guide\n\nServe red wine slightly cool.\n");
    const r = okb(dir, "check");
    assert.equal(r.code, 1);
    assert.deepEqual(failing(check(dir)), ["quotes"]);
    assert.match(r.out, /Serve red wine at room temperature/);
  });

  it("fails when a source file is missing, because then nothing proves the quote", () => {
    const dir = makeKb(work, "missing");
    rmSync(join(dir, "guide.md"));
    assert.deepEqual(failing(check(dir)), ["quotes"]);
  });

  it("fails on a validation error, and shows each problem once", () => {
    const dir = makeKb(work, "invalid");
    edit(dir, (g) => g.edges.push({ from: "c.red-wine", type: "IS_A", to: "c.nowhere" }));
    const r = okb(dir, "check");
    assert.equal(r.code, 1);
    assert.deepEqual(failing(check(dir)), ["validate"]);
    const clean = check(makeKb(work, "clean2"));
    assert.ok(clean.steps.every((s: any) => s.problems.length === 0));
  });

  it("does not change the folder or leave a lock", () => {
    const dir = makeKb(work, "readonly");
    const before = readdirSync(dir).filter((f) => f !== ".git").sort().map((f) => [f, readFileSync(join(dir, f), "utf8")].join("\0"));
    okb(dir, "check");
    okb(dir, "check", "--json");
    assert.deepEqual(readdirSync(dir).filter((f) => f !== ".git").sort().map((f) => [f, readFileSync(join(dir, f), "utf8")].join("\0")), before);
    assert.ok(!existsSync(join(dir, ".okb.lock")));
  });

  it("never takes the write lock: a lock another command holds only delays the read", () => {
    const dir = makeKb(work, "locked");
    writeFileSync(join(dir, ".okb.lock"), JSON.stringify({ pid: process.pid, at: new Date().toISOString() }));
    assert.equal(okb(dir, "check").code, 0);
  });

  it("warns, without failing, when the installed okb is older than the pinned one", () => {
    const dir = makeKb(work, "pinned-new");
    const m = JSON.parse(readFileSync(join(dir, "okb.json"), "utf8"));
    writeFileSync(join(dir, "okb.json"), JSON.stringify({ ...m, okbVersion: "99.0.0" }, null, 2) + "\n");
    const r = okb(dir, "check");
    assert.equal(r.code, 0, r.out + r.err);
    assert.match(r.out, /older than the 99\.0\.0 this KB pins/);
    assert.equal(check(dir).steps.find((s: any) => s.id === "okb-version").status, "warn");
  });

  it("okb pin records the installed version, and check then passes quietly", () => {
    const dir = makeKb(work, "pin");
    assert.equal(okb(dir, "pin").code, 0);
    assert.equal(JSON.parse(readFileSync(join(dir, "okb.json"), "utf8")).okbVersion, PACKAGE_VERSION);
    const r = check(dir);
    assert.equal(r.pinned, PACKAGE_VERSION);
    assert.equal(r.steps.find((s: any) => s.id === "okb-version").status, "pass");
  });

  it("reports a folder that isn't a KB as a usage error (exit 2)", () => {
    assert.equal(okb(work, "check").code, 2);
  });

  it("is a list of steps, so a new check is one entry", () => {
    assert.deepEqual(CHECK_STEPS.map((s) => s.id), ["validate", "quotes", "verification", "okb-version"]);
  });
});

describe("compareVersions", () => {
  it("orders versions, prereleases before releases", () => {
    assert.ok(compareVersions("0.1.0", "0.2.0")! < 0);
    assert.ok(compareVersions("1.0.0", "0.9.9")! > 0);
    assert.equal(compareVersions("1.2.3", "1.2.3"), 0);
    assert.ok(compareVersions("1.0.0-rc.1", "1.0.0")! < 0);
    assert.equal(compareVersions("latest", "1.0.0"), null);
  });
});

describe("the workflow template", () => {
  const file = join(PKG, "templates", "okb-check.yml");
  const text = readFileSync(file, "utf8");
  const wf = parse(text);

  it("runs on pull requests with least-privilege permissions and no secrets", () => {
    assert.ok("pull_request" in wf.on);
    assert.deepEqual(wf.permissions, { contents: "read", "pull-requests": "write" });
    assert.doesNotMatch(text, /\$\{\{\s*secrets\./);
  });

  it("pins every action to a full commit SHA", () => {
    const uses = [...text.matchAll(/uses:\s*(\S+)/g)].map((m) => m[1]);
    assert.ok(uses.length >= 2);
    for (const u of uses) assert.match(u, /@[0-9a-f]{40}$/, `${u} is pinned`);
  });

  it("fetches the history for okb diff, installs the pinned version, checks, diffs and comments", () => {
    assert.match(text, /fetch-depth: 0/);
    assert.match(text, /okbVersion/);
    for (const cmd of ["okb check", "okb diff", "okb-check -->"]) assert.ok(text.includes(cmd), cmd);
  });

  it("never puts a pull request's text in a script: only env vars, not ${{ }}, reach run blocks", () => {
    for (const step of wf.jobs.check.steps) {
      if (step.run) assert.doesNotMatch(step.run, /\$\{\{/, `step '${step.name}' interpolates in its script`);
    }
  });

  it("runs every script under bash with pipefail, so a failing command before a pipe fails the step", () => {
    for (const step of wf.jobs.check.steps) if (step.run) assert.equal(step.shell, "bash", `step '${step.name}' needs shell: bash`);
  });

  it("fails the 'Run okb check' step, run the way GitHub runs it, on a planted unverified rule", () => {
    const work = mkdtempSync(join(tmpdir(), "okb-wf-"));
    try {
      const dir = makeKb(work, "kb");
      edit(dir, (g) => delete g.nodes.find((n) => n.id === "rule.serve-red").verification);
      const bin = join(work, "bin");
      mkdirSync(bin);
      writeFileSync(join(bin, "okb"), `#!/bin/sh\nexec node "${CLI}" "$@"\n`, { mode: 0o755 });
      const step = wf.jobs.check.steps.find((s: any) => s.id === "check");
      // GitHub runs `shell: bash` as `bash --noprofile --norc -eo pipefail {0}`, and the default shell as `bash -e {0}`.
      const flags = step.shell === "bash" ? ["--noprofile", "--norc", "-eo", "pipefail"] : ["-e"];
      const script = join(work, "step.sh");
      writeFileSync(script, step.run);
      const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, RUNNER_TEMP: work, KB_DIR: dir, NO_COLOR: "1" };
      const r = spawnSync("bash", [...flags, script], { env, encoding: "utf8" });
      assert.notEqual(r.status, 0, "the step must fail");
      assert.match(r.stdout, /Not safe to merge/);
      // The same step passes on a clean KB.
      const clean = makeKb(work, "clean");
      assert.equal(spawnSync("bash", [...flags, script], { env: { ...env, KB_DIR: clean }, encoding: "utf8" }).status, 0);
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  });
});
