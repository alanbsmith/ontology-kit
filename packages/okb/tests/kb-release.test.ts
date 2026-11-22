// okb release and okb release verify (issue #22): pinned versions, a change log, former names.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";
import { compareVersions } from "../src/release.ts";

const PKG = dirname(dirname(fileURLToPath(import.meta.url)));
const CLI = join(PKG, "src", "cli.ts");
const WINE = join(PKG, "examples", "wine");
const ENV = { ...process.env, SOURCE_DATE_EPOCH: "1790000000", NO_COLOR: "1" };

let tmp: string;
let kb: string;
before(() => {
  tmp = mkdtempSync(join(tmpdir(), "okb-release-"));
  kb = join(tmp, "wine");
  mkdirSync(kb);
  for (const f of ["okb.json", "nodes.jsonl", "edges.jsonl"]) cpSync(join(WINE, f), join(kb, f));
});
after(() => rmSync(tmp, { recursive: true, force: true }));
import { mkdirSync } from "node:fs";

function okb(...args: string[]): { status: number | null; out: string } {
  const r = spawnSync(process.execPath, [CLI, "-C", kb, ...args], { encoding: "utf8", env: ENV });
  return { status: r.status, out: r.stdout + r.stderr };
}
const read = (f: string) => readFileSync(join(kb, f), "utf8");

describe("versions", () => {
  it("orders semver", () => {
    assert.ok(compareVersions("1.1.0", "1.0.9") > 0);
    assert.ok(compareVersions("1.10.0", "1.2.0") > 0);
    assert.ok(compareVersions("1.0.0-rc.1", "1.0.0") < 0);
    assert.ok(compareVersions("1.0.0-rc.2", "1.0.0-rc.10") < 0);
    assert.equal(compareVersions("2.0.0", "2.0.0"), 0);
  });
});

describe("two releases of the wine example", () => {
  it("refuses a version that isn't semver and writes nothing", () => {
    const r = okb("release", "one");
    assert.equal(r.status, 2);
    assert.match(r.out, /isn't a version/);
    assert.equal(existsSync(join(kb, "manifest.json")), false);
  });

  it("cuts 1.0.0: manifest with hashes, version in okb.json, a snapshot", () => {
    const r = okb("release", "1.0.0");
    assert.equal(r.status, 0, r.out);
    const m = JSON.parse(read("manifest.json"));
    assert.equal(m.version, "1.0.0");
    assert.equal(m.id, "wine-and-food");
    assert.deepEqual(Object.keys(m.datasets.ontology.files), ["edges.jsonl", "nodes.jsonl", "okb.json"]);
    for (const h of Object.values<string>(m.datasets.ontology.files)) assert.match(h, /^[0-9a-f]{64}$/);
    assert.equal(JSON.parse(read("okb.json")).version, "1.0.0");
    assert.ok(existsSync(join(kb, "releases", "1.0.0", "nodes.jsonl")));
    assert.match(read("releases/1.0.0/CHANGES.md"), /^## 1\.0\.0 \(2026-09-2\d\)\n\nThe first release: \d+ classes/);
    assert.equal(okb("release", "verify").status, 0);
  });

  it("refuses the same or an older version, and a release with no changes", () => {
    assert.match(okb("release", "1.0.0").out, /isn't newer|already exists/);
    assert.match(okb("release", "0.9.0").out, /isn't newer/);
    const r = okb("release", "1.0.1");
    assert.equal(r.status, 2);
    assert.match(r.out, /Nothing has changed since 1\.0\.0/);
    assert.equal(existsSync(join(kb, "releases", "1.0.1")), false);
  });

  it("records former names when a class and a relationship slot are renamed", () => {
    for (const args of [
      ["rename", "DessertWine", "SweetWine"],
      ["rename", "maker", "producer"],
      ["rename", "SweetWine", "AfterDinnerWine"],
    ]) {
      const r = okb(...args);
      assert.equal(r.status, 0, r.out);
    }
    const nodes = read("nodes.jsonl").split("\n").filter(Boolean).map((l) => JSON.parse(l));
    const cls = nodes.find((n) => n.id === "c.dessert-wine");
    assert.equal(cls.name, "AfterDinnerWine");
    assert.deepEqual(cls.formerNames, ["DessertWine", "SweetWine"]);
    const slot = nodes.find((n) => n.id === "s.maker");
    assert.equal(slot.relType, "PRODUCER");
    assert.deepEqual(slot.formerNames, ["maker"]);
    assert.deepEqual(slot.formerRelTypes, ["MAKER"]);
  });

  it("changed files fail verify until a new release; 1.1.0's change log lists the changes with old and new names", () => {
    const stale = okb("release", "verify");
    assert.equal(stale.status, 1);
    assert.match(stale.out, /nodes\.jsonl differs/);

    assert.equal(okb("class", "add", "OrangeWine", "--parent", "Wine").status, 0);
    const r = okb("release", "1.1.0");
    assert.equal(r.status, 0, r.out);
    const log = read("releases/1.1.0/CHANGES.md");
    assert.match(log, /^## 1\.1\.0 \(2026-09-2\d\)\n\nChanges since 1\.0\.0\./);
    assert.match(log, /\*\*Renamed\*\* `DessertWine` → `AfterDinnerWine` \(also named `SweetWine`\)/);
    assert.match(log, /\*\*Added\*\* `OrangeWine`/);
    assert.match(log, /\*\*Renamed\*\* `maker` → `producer`/);
    assert.match(log, /`:MAKER` → `:PRODUCER` \(slot `producer`, \d+ edge\(s\) keep their meaning\)/);
    const changes = JSON.parse(read("releases/1.1.0/changes.json"));
    assert.equal(changes.previous, "1.0.0");
    assert.deepEqual(changes.changes.relationshipTypeRenames.map((x: any) => [x.from, x.to]), [["MAKER", "PRODUCER"]]);
    assert.equal(changes.changes.summary.nodesAdded, 1);
    assert.equal(changes.changes.summary.edgesRemoved, 0);
    assert.match(read("RELEASES.md"), /## 1\.1\.0[\s\S]*## 1\.0\.0/);
    assert.equal(okb("release", "verify").status, 0);
    assert.equal(JSON.parse(read("manifest.json")).version, "1.1.0");
  });

  it("verify reports a tampered file and a missing one, and changes nothing", () => {
    const before = read("nodes.jsonl");
    appendFileSync(join(kb, "nodes.jsonl"), '{"id":"c.sneaky","type":"Class","name":"Sneaky"}\n');
    const tampered = okb("release", "verify", "--json");
    assert.equal(tampered.status, 1);
    const j = JSON.parse(tampered.out);
    assert.equal(j.ok, false);
    assert.equal(j.problems.length, 1);
    assert.match(j.problems[0], /ontology: nodes\.jsonl differs/);
    writeFileSync(join(kb, "nodes.jsonl"), before);
    assert.equal(okb("release", "verify").status, 0);
    rmSync(join(kb, "edges.jsonl"));
    assert.match(okb("release", "verify").out, /edges\.jsonl is missing/);
    cpSync(join(kb, "releases", "1.1.0", "edges.jsonl"), join(kb, "edges.jsonl"));
    assert.equal(okb("release", "verify").status, 0);
  });
});

describe("renaming back", () => {
  it("drops the name from the former names", () => {
    const d = join(tmp, "back");
    mkdirSync(d);
    for (const f of ["okb.json", "nodes.jsonl", "edges.jsonl"]) cpSync(join(WINE, f), join(d, f));
    const run = (...a: string[]) => spawnSync(process.execPath, [CLI, "-C", d, ...a], { encoding: "utf8", env: ENV });
    assert.equal(run("rename", "DessertWine", "SweetWine").status, 0);
    assert.equal(run("rename", "SweetWine", "DessertWine").status, 0);
    const line = readFileSync(join(d, "nodes.jsonl"), "utf8").split("\n").find((l) => l.includes('"c.dessert-wine"') && l.includes('"Class"'))!;
    assert.deepEqual(JSON.parse(line).formerNames, ["SweetWine"]);
  });
});

describe("a release over a KB with errors", () => {
  it("is refused", () => {
    const bad = join(tmp, "bad");
    cpSync(kb, bad, { recursive: true });
    rmSync(join(bad, "releases"), { recursive: true });
    rmSync(join(bad, "manifest.json"));
    appendFileSync(join(bad, "edges.jsonl"), '{"from":"c.nope","type":"IS_A","to":"c.wine"}\n');
    const r = spawnSync(process.execPath, [CLI, "-C", bad, "release", "2.0.0"], { encoding: "utf8", env: ENV });
    assert.equal(r.status, 2);
    assert.match(r.stderr + r.stdout, /okb validate reports \d+ error/);
    assert.equal(existsSync(join(bad, "manifest.json")), false);
  });
});

describe("sources are pinned", () => {
  it("hashes registered source files and lists changes to them in the change log", () => {
    const dir = join(tmp, "withsrc");
    mkdirSync(join(dir, "docs"), { recursive: true });
    for (const f of ["okb.json", "nodes.jsonl", "edges.jsonl"]) cpSync(join(WINE, f), join(dir, f));
    writeFileSync(join(dir, "docs", "guide.md"), "# Guide\n\nServe red wine at room temperature.\n");
    const run = (...a: string[]) => spawnSync(process.execPath, [CLI, "-C", dir, ...a], { encoding: "utf8", env: ENV });
    assert.equal(run("source", "add", join(dir, "docs", "guide.md"), "--title", "Guide").status, 0);
    assert.equal(run("release", "1.0.0").status, 0);
    const m = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
    assert.equal(m.datasets.docs.path, "docs");
    assert.deepEqual(Object.keys(m.datasets.docs.files), ["guide.md"]);
    writeFileSync(join(dir, "docs", "guide.md"), "# Guide\n\nServe red wine slightly cool.\n");
    assert.equal(run("release", "verify").status, 1);
    const r = run("release", "1.0.1");
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(readFileSync(join(dir, "releases", "1.0.1", "CHANGES.md"), "utf8"), /### Source files\n\n- \*\*Changed\*\* `guide\.md`/);
    rmSync(join(dir, "docs", "guide.md"));
    assert.match(run("release", "1.0.2").stderr, /source file\(s\) are missing/);
  });
});

describe("the same release twice gives the same bytes", () => {
  it("is deterministic", () => {
    const outs = ["a", "b"].map((n) => {
      const d = join(tmp, "det-" + n);
      mkdirSync(d);
      for (const f of ["okb.json", "nodes.jsonl", "edges.jsonl"]) cpSync(join(WINE, f), join(d, f));
      spawnSync(process.execPath, [CLI, "-C", d, "release", "1.0.0"], { encoding: "utf8", env: ENV });
      return ["manifest.json", "RELEASES.md", "releases/1.0.0/changes.json"].map((f) => readFileSync(join(d, f), "utf8"));
    });
    assert.deepEqual(outs[0], outs[1]);
  });
});
