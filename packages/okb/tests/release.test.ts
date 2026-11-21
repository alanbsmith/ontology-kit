import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { changelogEntry, check, packageVersions, releaseVersion } from "../../../scripts/release.ts";
import { PACKAGE_VERSION } from "../src/version.ts";

const PKG = dirname(dirname(fileURLToPath(import.meta.url)));
const REPO = dirname(dirname(PKG));

/** A throwaway repo layout: two package.json files and a changelog. */
function fixture(versions: [string, string], changelog: string): string {
  const root = mkdtempSync(join(tmpdir(), "okb-release-test-"));
  const names = ["@ontology-kit/okb", "ontology-kit"];
  ["packages/okb", "packages/ontology-kit"].forEach((d, i) => {
    mkdirSync(join(root, d), { recursive: true });
    writeFileSync(join(root, d, "package.json"), JSON.stringify({ name: names[i], version: versions[i] }));
  });
  mkdirSync(join(root, "docs"));
  writeFileSync(join(root, "docs", "CHANGELOG.md"), changelog);
  return root;
}

const LOG = "# Changelog\n\n## Package releases\n\n### 0.2.0 (2030-01-02)\n\nNew things.\n\n#### Added\n\n- A thing.\n\n### 0.1.0 (2030-01-01)\n\nFirst.\n\n## Meta-KB changes\n\n### v2.1\n\nOld.\n";

describe("release checks", () => {
  it("keeps both packages at one version, and okb version reports it", () => {
    const versions = packageVersions(REPO);
    assert.equal(new Set(Object.values(versions)).size, 1, `the packages must share a version: ${JSON.stringify(versions)}`);
    assert.equal(PACKAGE_VERSION, releaseVersion(REPO));
    const out = execFileSync(process.execPath, [join(PKG, "src", "cli.ts"), "version"], { encoding: "utf8" });
    assert.match(out, new RegExp(`^okb ${PACKAGE_VERSION.replace(/\./g, "\\.")} · meta-KB \\d+\\.\\d+\\.\\d+`));
  });

  it("has a changelog entry for the version in package.json", () => {
    const { notes } = changelogEntry(releaseVersion(REPO), REPO);
    assert.ok(notes.length > 0);
  });

  it("extracts exactly one entry, with its subsections", () => {
    const root = fixture(["0.2.0", "0.2.0"], LOG);
    try {
      const { notes } = changelogEntry("0.2.0", root);
      assert.match(notes, /^New things\./);
      assert.match(notes, /#### Added/);
      assert.doesNotMatch(notes, /First\./);
      assert.equal(changelogEntry("0.1.0", root).notes, "First.");
      assert.equal(check("v0.2.0", root), "0.2.0");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails on differing versions, a wrong tag, a missing entry or an unreleased one", () => {
    const bad: [string, [string, string], string, string | undefined][] = [
      ["versions differ", ["0.2.0", "0.1.0"], LOG, "v0.2.0"],
      ["tag mismatch", ["0.2.0", "0.2.0"], LOG, "v0.1.0"],
      ["no entry", ["0.3.0", "0.3.0"], LOG, "v0.3.0"],
      ["unreleased", ["0.2.0", "0.2.0"], LOG.replace("(2030-01-02)", "(unreleased)"), "v0.2.0"],
      ["empty entry", ["0.2.0", "0.2.0"], LOG.replace("New things.\n\n#### Added\n\n- A thing.\n\n", ""), "v0.2.0"],
    ];
    for (const [label, versions, log, tag] of bad) {
      const root = fixture(versions, log);
      try {
        assert.throws(() => check(tag, root), /./, label);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it("exits non-zero from the command line when the tag is wrong", () => {
    assert.throws(() => execFileSync(process.execPath, [join(REPO, "scripts", "release.ts"), "notes", "v9.9.9"], { stdio: "pipe" }));
  });
});
