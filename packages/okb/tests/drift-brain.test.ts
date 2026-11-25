import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, beforeEach, describe, it } from "node:test";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SCRIPT = join(REPO, ".claude", "skills", "okb-docs-drift", "scripts", "check-docs.ts");

const roots: string[] = [];
let root = "";
const put = (rel: string, text: string) => {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), text);
};
/** Run the drift check against the temporary tree (DRIFT_ROOT), not the real repo. */
const drift = () => {
  const r = spawnSync("node", [SCRIPT], { env: { ...process.env, DRIFT_ROOT: root }, encoding: "utf8" });
  return { code: r.status, out: r.stdout + r.stderr };
};

// A minimal tree: the files the check reads to know what exists, plus a real brain/ layout.
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "okb-drift-test-"));
  roots.push(root);
  for (const p of ["package.json", "packages/okb/package.json", "packages/reader/package.json", "packages/okb/src/cli.ts", "packages/okb/meta-kb/data", "packages/okb/meta-kb/src/format.yaml"]) {
    mkdirSync(dirname(join(root, p)), { recursive: true });
    cpSync(join(REPO, p), join(root, p), { recursive: true });
  }
  put("docs/METHOD.md", "# Method\n");
  put("brain/README.md", "# Brain\n");
  put("brain/now.md", "Working on `docs/METHOD.md`.\n");
  put("brain/open-questions.md", "# Questions\n");
  put("brain/milestones/m.md", "Touches `docs/METHOD.md`.\n");
  put("brain/decisions/0001-x.md", "We chose `docs/METHOD.md`.\n");
});
after(() => roots.forEach((r) => rmSync(r, { recursive: true, force: true })));

describe("docs drift check on brain/", () => {
  it("passes when every named path exists", () => {
    const r = drift();
    assert.equal(r.code, 0, r.out);
  });

  it("fails when a file named in brain/now.md has moved", () => {
    put("brain/now.md", "Working on `docs/MOVED.md`.\n");
    const r = drift();
    assert.equal(r.code, 1);
    assert.match(r.out, /brain\/now\.md:1 {2}\[path\] 'docs\/MOVED\.md' doesn't exist/);
  });

  it("fails when a file named in a milestone log has moved", () => {
    put("brain/milestones/m.md", "Touches `docs/MOVED.md`.\n");
    assert.equal(drift().code, 1);
  });

  it("fails when brain/now.md names a brain/ file that has moved", () => {
    put("brain/now.md", "See `brain/milestones/MOVED.md`.\n");
    const r = drift();
    assert.equal(r.code, 1);
    assert.match(r.out, /brain\/now\.md:1 {2}\[path\] 'brain\/milestones\/MOVED\.md' doesn't exist/);
  });

  it("passes when brain/now.md names a brain/ file that exists", () => {
    put("brain/now.md", "See `brain/milestones/m.md` and `brain/decisions/0001-x.md`.\n");
    const r = drift();
    assert.equal(r.code, 0, r.out);
  });

  it("reports a moved brain/ file named in a decision as a warning", () => {
    put("brain/decisions/0001-x.md", "See `brain/decisions/9999-gone.md`.\n");
    const r = drift();
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /warning \[path\] 'brain\/decisions\/9999-gone\.md' doesn't exist/);
  });

  it("reports a moved file named in a decision as a warning without failing", () => {
    put("brain/decisions/0001-x.md", "We chose `docs/MOVED.md`.\n");
    const r = drift();
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /brain\/decisions\/0001-x\.md:1 {2}warning \[path\] 'docs\/MOVED\.md' doesn't exist/);
  });

  it("checks only paths in decisions, not commands", () => {
    put("brain/decisions/0001-x.md", "We ran `okb nonesuch`.\n");
    const r = drift();
    assert.equal(r.code, 0, r.out);
    assert.doesNotMatch(r.out, /nonesuch/);
  });
});
