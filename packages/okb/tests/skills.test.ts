import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, beforeEach, describe, it } from "node:test";
import { MetaKB } from "../src/metakb.ts";
import { PACKAGED_SKILLS_DIR, defaultSkillsDir, installSkills, packagedSkills, skillsStatus } from "../src/skills.ts";

const CLI = join(dirname(dirname(fileURLToPath(import.meta.url))), "src", "cli.ts");
const META = MetaKB.get().version;
const NAMES = ["build-domain-kb-from-docs", "ontology-coach", "ontology-maintainer", "ontology-review", "ontology-signoff"];

const roots: string[] = [];
let dir = "";
beforeEach(() => {
  const root = mkdtempSync(join(tmpdir(), "okb-skills-test-"));
  roots.push(root);
  dir = join(root, "skills");
});
after(() => roots.forEach((r) => rmSync(r, { recursive: true, force: true })));

const states = () => Object.fromEntries(skillsStatus({ dir, metaVersion: META }).skills.map((s) => [s.name, s.state]));
const all = (state: string) => Object.fromEntries(NAMES.map((n) => [n, state]));

describe("okb skills", () => {
  it("finds the packaged skills, each stating the meta-KB version", () => {
    assert.deepEqual(packagedSkills(), NAMES);
    for (const n of NAMES) assert.match(readFileSync(join(PACKAGED_SKILLS_DIR, n, "SKILL.md"), "utf8"), new RegExp(`^\\*\\*Version ${META.replace(/\./g, "\\.")}\\.\\*\\*`, "m"));
  });

  it("takes the folder from OKB_SKILLS_DIR, else ~/.claude/skills", () => {
    assert.equal(defaultSkillsDir({ OKB_SKILLS_DIR: "/x/y" }), "/x/y");
    assert.match(defaultSkillsDir({}), /\.claude[\\/]skills$/);
  });

  it("reports missing skills, then links them and is idempotent", () => {
    assert.deepEqual(states(), all("missing"));
    installSkills({ dir, metaVersion: META });
    assert.deepEqual(states(), all("current"));
    assert.ok(lstatSync(join(dir, "ontology-coach")).isSymbolicLink());
    assert.equal(readlinkSync(join(dir, "ontology-coach")), join(PACKAGED_SKILLS_DIR, "ontology-coach"));
    assert.match(installSkills({ dir, metaVersion: META }).lines.join("\n"), /already linked/);
  });

  it("copies with --copy, and switches between copies and links", () => {
    installSkills({ dir, copy: true, metaVersion: META });
    assert.ok(!lstatSync(join(dir, "ontology-review")).isSymbolicLink());
    assert.deepEqual(states(), all("current"));
    assert.equal(skillsStatus({ dir, metaVersion: META }).skills[0].how, "copy");
    installSkills({ dir, metaVersion: META });
    assert.ok(lstatSync(join(dir, "ontology-review")).isSymbolicLink());
    // Linking never deletes the packaged folder.
    assert.ok(existsSync(join(PACKAGED_SKILLS_DIR, "ontology-review", "SKILL.md")));
  });

  it("replaces an older copy, a broken link and a link into a different okb", () => {
    installSkills({ dir, copy: true, metaVersion: META });
    const coach = join(dir, "ontology-coach");
    writeFileSync(join(coach, "SKILL.md"), readFileSync(join(coach, "SKILL.md"), "utf8").replace(`Version ${META}`, "Version 0.1.0"));
    rmSync(join(dir, "ontology-review"), { recursive: true });
    symlinkSync(join(dir, "gone"), join(dir, "ontology-review"));
    const other = join(dir, "..", "other-okb", "build-domain-kb-from-docs");
    mkdirSync(other, { recursive: true });
    writeFileSync(join(other, "SKILL.md"), "---\nname: build-domain-kb-from-docs\ndescription: x\n---\n**Version 0.1.0.** old\n");
    rmSync(join(dir, "build-domain-kb-from-docs"), { recursive: true });
    symlinkSync(other, join(dir, "build-domain-kb-from-docs"));
    assert.deepEqual(states(), { "build-domain-kb-from-docs": "other-install", "ontology-coach": "stale", "ontology-maintainer": "current", "ontology-review": "broken-link", "ontology-signoff": "current" });
    const out = installSkills({ dir, metaVersion: META }).lines.join("\n");
    assert.match(out, /replaced a copy at version 0\.1\.0/);
    assert.match(out, /broken link/);
    assert.match(out, /different okb/);
    assert.deepEqual(states(), all("current"));
    assert.ok(existsSync(join(other, "SKILL.md")), "the other okb's folder is left alone");
  });

  it("refuses a folder that is not an okb skill, changes nothing, and replaces it only with --force", () => {
    const mine = join(dir, "ontology-review");
    mkdirSync(mine, { recursive: true });
    writeFileSync(join(mine, "notes.txt"), "mine");
    assert.throws(() => installSkills({ dir, metaVersion: META }), /Nothing was changed.*--force/s);
    assert.deepEqual(states(), { ...all("missing"), "ontology-review": "foreign" });
    assert.ok(!existsSync(join(dir, "ontology-coach")), "the other skills were not installed either");
    assert.equal(readFileSync(join(mine, "notes.txt"), "utf8"), "mine");
    assert.match(installSkills({ dir, force: true, metaVersion: META }).lines.join("\n"), /because of --force/);
    assert.deepEqual(states(), all("current"));
    assert.ok(lstatSync(mine).isSymbolicLink());
  });

  it("treats an edited copy at the current version as modified and a plain file as foreign", () => {
    installSkills({ dir, copy: true, metaVersion: META });
    writeFileSync(join(dir, "ontology-coach", "extra.md"), "my notes");
    rmSync(join(dir, "ontology-review"), { recursive: true });
    writeFileSync(join(dir, "ontology-review"), "a file");
    assert.deepEqual(states(), { ...all("current"), "ontology-coach": "modified", "ontology-review": "foreign" });
    assert.throws(() => installSkills({ dir, metaVersion: META }), /ontology-coach.*ontology-review/s);
  });

  it("a version that does not match this okb is stale, even when linked", () => {
    installSkills({ dir, metaVersion: META });
    assert.deepEqual(Object.values(skillsStatus({ dir, metaVersion: "9.9.9" }).skills.map((s) => s.state)), ["stale", "stale", "stale", "stale", "stale"]);
  });

  it("works through the command line: install, status, exit codes and --json", () => {
    const run = (...args: string[]) => spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8", env: { ...process.env, OKB_SKILLS_DIR: "" } });
    const before = run("skills", "status", "--dir", dir);
    assert.equal(before.status, 1);
    assert.match(before.stdout, /not installed/);
    const done = run("skills", "install", "--dir", dir);
    assert.equal(done.status, 0);
    assert.match(done.stdout, /ontology-coach: linked/);
    const status = run("skills", "status", "--dir", dir, "--json");
    assert.equal(status.status, 0);
    assert.deepEqual(JSON.parse(status.stdout).skills.map((s: { state: string }) => s.state), ["current", "current", "current", "current", "current"]);
    assert.match(run("skills", "status", "--dir", dir).stdout, /linked to this okb, version \d/);
    const bad = run("skills", "nope");
    assert.equal(bad.status, 2);
    assert.match(bad.stderr, /Usage: okb skills install/);
    // OKB_SKILLS_DIR picks the folder when --dir is absent.
    const viaEnv = execFileSync(process.execPath, [CLI, "skills", "status"], { encoding: "utf8", env: { ...process.env, OKB_SKILLS_DIR: dir } });
    assert.match(viaEnv, new RegExp(dir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  });
});
