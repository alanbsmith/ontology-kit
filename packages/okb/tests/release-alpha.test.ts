import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { alphaVersion, nextMinor, releaseVersion, setVersion } from "../../../scripts/release.ts";

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", "-c", "tag.gpgSign=false", "-c", "commit.gpgSign=false", ...args], { cwd, encoding: "utf8" }).trim();
}

function repo(): string {
  const root = mkdtempSync(join(tmpdir(), "okb-alpha-test-"));
  git(root, "init", "-q", "-b", "main");
  return root;
}

const commit = (root: string, msg: string) => git(root, "commit", "-q", "--allow-empty", "-m", msg);

describe("alpha versions", () => {
  it("bumps the minor of a stable version", () => {
    assert.equal(nextMinor("0.2.0"), "0.3.0");
    assert.equal(nextMinor("1.9.4"), "1.10.0");
    assert.throws(() => nextMinor("0.3.0-alpha.1"), /not a stable/);
  });

  it("numbers an alpha by the total commit count, ignoring alpha tags", () => {
    const root = repo();
    commit(root, "one");
    git(root, "tag", "-a", "v0.1.0", "-m", "v0.1.0");
    commit(root, "two");
    git(root, "tag", "-a", "v0.2.0", "-m", "v0.2.0");
    assert.equal(alphaVersion(root), "0.3.0-alpha.2");
    commit(root, "three");
    commit(root, "four");
    git(root, "tag", "-a", "v0.3.0-alpha.2", "-m", "alpha");
    commit(root, "five");
    assert.equal(alphaVersion(root), "0.3.0-alpha.5");
  });

  it("keeps growing when a forward merge makes a newer stable patch tag reachable", () => {
    const root = repo();
    commit(root, "base");
    git(root, "tag", "-a", "v0.3.0", "-m", "v0.3.0");
    git(root, "switch", "-q", "-c", "prerelease/alpha");
    for (const m of ["a1", "a2", "a3", "a4"]) commit(root, m);
    const before = alphaVersion(root);
    assert.match(before, /^0\.4\.0-alpha\.5$/);
    git(root, "switch", "-q", "main");
    commit(root, "fix");
    git(root, "tag", "-a", "v0.3.1", "-m", "v0.3.1");
    git(root, "switch", "-q", "prerelease/alpha");
    git(root, "merge", "-q", "--no-ff", "-m", "merge main", "main");
    const after = alphaVersion(root);
    assert.ok(Number(after.split(".").pop()) > Number(before.split(".").pop()), `${before} then ${after}`);
    assert.match(after, /^0\.4\.0-alpha\./);
  });

  it("never gives two commits on the branch the same version", () => {
    const root = repo();
    commit(root, "base");
    git(root, "tag", "-a", "v0.3.0", "-m", "v0.3.0");
    git(root, "switch", "-q", "-c", "prerelease/alpha");
    const seen = new Set<string>();
    const take = () => {
      const v = alphaVersion(root);
      assert.ok(!seen.has(v), `${v} repeated`);
      seen.add(v);
    };
    take();
    commit(root, "a");
    take();
    git(root, "switch", "-q", "main");
    commit(root, "fix");
    git(root, "tag", "-a", "v0.3.1", "-m", "v0.3.1");
    git(root, "switch", "-q", "prerelease/alpha");
    git(root, "merge", "-q", "--no-ff", "-m", "merge main", "main");
    take();
    commit(root, "b");
    take();
    assert.equal(seen.size, 4);
  });

  it("counts commits merged in from main, and rises with each one", () => {
    const root = repo();
    commit(root, "base");
    git(root, "tag", "-a", "v0.2.0", "-m", "v0.2.0");
    git(root, "switch", "-q", "-c", "prerelease/alpha");
    commit(root, "feature");
    const before = alphaVersion(root);
    git(root, "switch", "-q", "main");
    commit(root, "hotfix");
    git(root, "switch", "-q", "prerelease/alpha");
    git(root, "merge", "-q", "--no-ff", "-m", "merge main", "main");
    const [a, b] = [before, alphaVersion(root)].map((v) => Number(v.split(".").pop()));
    assert.ok(b > a, `${before} then ${alphaVersion(root)}`);
  });

  it("fails clearly when no stable tag is reachable", () => {
    const root = repo();
    commit(root, "one");
    assert.throws(() => alphaVersion(root), /No stable v\* tag/);
  });

  it("writes one version into all three package.json files and keeps the rest", () => {
    const root = mkdtempSync(join(tmpdir(), "okb-alpha-test-"));
    const names = ["@ontology-kit/reader", "@ontology-kit/okb", "ontology-kit"];
    ["packages/reader", "packages/okb", "packages/ontology-kit"].forEach((d, i) => {
      mkdirSync(join(root, d), { recursive: true });
      writeFileSync(join(root, d, "package.json"), `{\n  "name": "${names[i]}",\n  "version": "0.2.0",\n  "dependencies": { "x": "0.2.0" }\n}\n`);
    });
    setVersion("0.3.0-alpha.7", root);
    assert.equal(releaseVersion(root), "0.3.0-alpha.7");
    assert.match(readFileSync(join(root, "packages/okb/package.json"), "utf8"), /"x": "0\.2\.0"/);
    assert.throws(() => setVersion("nope", root), /not a semver/);
  });
});
