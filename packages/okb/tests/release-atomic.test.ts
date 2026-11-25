// A failed manifest write must leave the previous manifest whole and no temp file behind (issue #145).
import assert from "node:assert/strict";
import { appendFileSync, cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, beforeEach, describe, it } from "node:test";
import { Ontology } from "@ontology-kit/reader";
import { cutRelease, readReleaseManifest, releaseIo, verifyRelease } from "../src/release.ts";

const PKG = dirname(dirname(fileURLToPath(import.meta.url)));
const WINE = join(PKG, "examples", "wine");

let work: string;
let kb: string;
before(() => {
  process.env.SOURCE_DATE_EPOCH = "1790000000";
  work = mkdtempSync(join(tmpdir(), "okb-atomic-"));
});
after(() => rmSync(work, { recursive: true, force: true }));
// A fresh copy of the wine ontology with 1.0.0 released and one new class waiting for 1.1.0.
beforeEach(() => {
  kb = mkdtempSync(join(work, "kb-"));
  for (const f of ["okb.json", "nodes.jsonl", "edges.jsonl"]) cpSync(join(WINE, f), join(kb, f));
  release("1.0.0");
  appendFileSync(join(kb, "nodes.jsonl"), '{"id":"c.extra","type":"Class","name":"Extra"}\n');
});

const release = (v: string) => Ontology.edit(kb, (ont) => cutRelease(ont, v, []));
const rootManifest = () => join(kb, "manifest.json");
const snapManifest = (v: string) => join(kb, "releases", v, "manifest.json");

function leftoverTempFiles(dir = kb): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return leftoverTempFiles(path);
    return e.name.endsWith(".tmp") ? [path] : [];
  });
}

/** Whether the root manifest still verifies against the files it pinned (the working copy has moved on since, so check them from the 1.0.0 snapshot). */
function pinsStillVerify(): boolean {
  const copy = mkdtempSync(join(work, "pin-"));
  for (const f of ["okb.json", "nodes.jsonl", "edges.jsonl"]) cpSync(join(kb, "releases", "1.0.0", f), join(copy, f));
  cpSync(rootManifest(), join(copy, "manifest.json"));
  return verifyRelease(copy).ok;
}

/** Run `fn` with the manifest writer failing on the files `fails` accepts, after truncating the temp file: what a full disk or a crash does. */
function withFailingWrite(fails: (finalName: string, dir: string) => boolean, fn: () => void): void {
  const real = releaseIo.write;
  releaseIo.write = (file, text) => {
    const target = file.replace(/\.tmp$/, "");
    if (!fails(basename(target), dirname(target))) return real(file, text);
    writeFileSync(file, text.slice(0, 10));
    throw new Error("disk full");
  };
  try {
    fn();
  } finally {
    releaseIo.write = real;
  }
}

describe("atomic manifest writes", () => {
  it("keeps the earlier manifest and leaves no temp file when the snapshot manifest write fails, then a retry works", () => {
    const earlier = readFileSync(rootManifest(), "utf8");
    withFailingWrite((_, dir) => dir === join(kb, "releases", "1.1.0"), () => assert.throws(() => release("1.1.0"), /disk full/));
    assert.equal(readFileSync(rootManifest(), "utf8"), earlier);
    assert.equal(readReleaseManifest(rootManifest()).version, "1.0.0");
    assert.deepEqual(leftoverTempFiles(), []);
    assert.equal(existsSync(snapManifest("1.1.0")), false);

    assert.equal(release("1.1.0").version, "1.1.0");
    assert.equal(readReleaseManifest(rootManifest()).version, "1.1.0");
  });

  it("keeps the earlier root manifest when only the root write fails, then a retry overwrites the half-finished folder", () => {
    const earlier = readFileSync(rootManifest(), "utf8");
    withFailingWrite((_, dir) => dir === kb, () => assert.throws(() => release("1.1.0"), /disk full/));

    // The snapshot's own manifest was written, but the root still pins 1.0.0, whole and verifiable.
    assert.equal(existsSync(snapManifest("1.1.0")), true);
    assert.equal(readFileSync(rootManifest(), "utf8"), earlier);
    assert.equal(readReleaseManifest(rootManifest()).version, "1.0.0");
    assert.equal(pinsStillVerify(), true);
    assert.deepEqual(leftoverTempFiles(), []);

    assert.equal(release("1.1.0").version, "1.1.0");
    assert.equal(readReleaseManifest(rootManifest()).version, "1.1.0");
    assert.equal(readReleaseManifest(snapManifest("1.1.0")).version, "1.1.0");
    assert.equal(verifyRelease(kb).ok, true);
    assert.deepEqual(leftoverTempFiles(), []);
  });
});
