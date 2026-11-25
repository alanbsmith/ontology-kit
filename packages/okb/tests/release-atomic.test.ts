// A failed manifest write must leave the previous manifest whole and no temp file behind (issue #145).
import assert from "node:assert/strict";
import { appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";
import { Ontology } from "@ontology-kit/reader";
import { cutRelease, readReleaseManifest, releaseIo } from "../src/release.ts";

const PKG = dirname(dirname(fileURLToPath(import.meta.url)));
const WINE = join(PKG, "examples", "wine");

let tmp: string;
let kb: string;
before(() => {
  process.env.SOURCE_DATE_EPOCH = "1790000000";
  tmp = mkdtempSync(join(tmpdir(), "okb-atomic-"));
  kb = join(tmp, "wine");
  mkdirSync(kb);
  for (const f of ["okb.json", "nodes.jsonl", "edges.jsonl"]) cpSync(join(WINE, f), join(kb, f));
});
after(() => rmSync(tmp, { recursive: true, force: true }));

const release = (v: string) => Ontology.edit(kb, (ont) => cutRelease(ont, v, []));
const tmpFiles = () => {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) (e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith(".tmp") && out.push(join(d, e.name)));
  };
  walk(kb);
  return out;
};

describe("atomic manifest writes", () => {
  it("keeps the earlier manifest and leaves no temp file when the write fails, then a retry works", () => {
    release("1.0.0");
    appendFileSync(join(kb, "nodes.jsonl"), '{"id":"c.extra","type":"Class","name":"Extra"}\n');
    const before = readFileSync(join(kb, "manifest.json"), "utf8");
    const real = releaseIo.write;
    // Truncate the temp file, then fail: what a full disk or a crash does.
    releaseIo.write = (file, text) => {
      writeFileSync(file, text.slice(0, 10));
      throw new Error("disk full");
    };
    try {
      assert.throws(() => release("1.1.0"), /disk full/);
    } finally {
      releaseIo.write = real;
    }
    assert.equal(readFileSync(join(kb, "manifest.json"), "utf8"), before);
    assert.equal(readReleaseManifest(join(kb, "manifest.json")).version, "1.0.0");
    assert.deepEqual(tmpFiles(), []);
    assert.equal(existsSync(join(kb, "releases", "1.1.0", "manifest.json")), false);

    assert.equal(release("1.1.0").version, "1.1.0");
    assert.equal(readReleaseManifest(join(kb, "manifest.json")).version, "1.1.0");
  });
});
