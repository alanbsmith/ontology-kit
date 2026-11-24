import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { after, before, describe, it } from "node:test";
import * as format from "../src/index.ts";
import { Ontology, PROVENANCE_EDGE_TYPES, STRUCTURAL_EDGE_TYPES, isProvenanceEdgeType, isRelationship, isStructuralEdgeType } from "../src/index.ts";

const PKG = dirname(dirname(fileURLToPath(import.meta.url)));
const COFFEE = join(PKG, "tests", "fixtures", "coffee");
const FORMAT_DOC = join(dirname(dirname(PKG)), "docs", "FORMAT.md");

/** The public allowlist. Adding or removing a name here is a semver decision (docs/FORMAT.md). */
const PUBLIC_EXPORTS = [
  "CARDINALITIES", "DISPOSITIONS", "FORMAT", "MANIFEST", "MODALITIES", "NODE_TYPES", "OkbError", "Ontology",
  "PROVENANCE_EDGE_TYPES", "Relationships", "STRUCTURAL_EDGE_TYPES", "VALUE_TYPES", "VERIFICATION_STATUSES",
  "edgeProps", "findRoot", "fold", "isProvenanceEdgeType", "isRelationship", "isStructuralEdgeType", "key", "literalValue",
  "literalValues", "nameOrText", "nodeLabel", "rawTokens", "relType", "slug", "stripAccents", "tokens",
];

describe("public file-format API (@ontology-kit/reader)", () => {
  let work = "";
  before(() => {
    work = mkdtempSync(join(tmpdir(), "okb-reader-api-"));
  });
  after(() => rmSync(work, { recursive: true, force: true }));

  it("exports exactly the allowlist", () => {
    assert.deepEqual(Object.keys(format).sort(), [...PUBLIC_EXPORTS].sort());
  });

  it("lists the edge types okb reserves, REFINES and FULFILLS included", () => {
    for (const t of ["IS_A", "INSTANCE_OF", "HAS_SLOT", "RANGE", "INVERSE_OF", "DISJOINT_WITH", "NEEDS", "BECAME", "ABOUT", "CITES", "PART_OF", "GOVERNS", "REFINES", "FULFILLS"]) {
      assert.ok(isStructuralEdgeType(t), t);
    }
    assert.equal(STRUCTURAL_EDGE_TYPES.length, 14);
    assert.deepEqual([...PROVENANCE_EDGE_TYPES].sort(), ["CITES", "FULFILLS", "GOVERNS", "PART_OF", "REFINES"]);
    assert.ok(PROVENANCE_EDGE_TYPES.every((t) => isStructuralEdgeType(t) && isProvenanceEdgeType(t)));
    assert.ok(!isProvenanceEdgeType("IS_A"));
    assert.ok(!isStructuralEdgeType("CONTAINS"), "a relationship's relType is not structural");
    assert.ok(format.NODE_TYPES.includes("Rule") && format.NODE_TYPES.includes("SourceLocation"));
  });

  it("loads an ontology and reads relationship values, from either end", () => {
    const ont = Ontology.load(COFFEE);
    assert.equal(ont.manifest.format, format.FORMAT);
    // Every edge is structural or the type of exactly one relationship slot.
    const relTypes = ont.rel.edgeTypes();
    assert.ok(relTypes.size > 0);
    for (const e of ont.edges) assert.ok(isStructuralEdgeType(e.type) || relTypes.has(e.type), `${e.type} is classified`);
    assert.ok(ont.edges.some((e) => e.type === "REFINES") && ont.edges.some((e) => e.type === "FULFILLS"));
    for (const n of ont.nodes) assert.ok(format.NODE_TYPES.includes(n.type), `${n.type} is a node type`);

    const slots = ont.ofType("Slot").filter(isRelationship);
    assert.ok(slots.length >= 1);
    const contains = ont.require("s.contains", "Slot");
    const stored = ont.edges.find((e) => e.type === "CONTAINS");
    assert.ok(stored);
    assert.deepEqual(ont.rel.spec("s.contains"), { type: "CONTAINS", reverse: false });
    assert.ok(ont.rel.values(stored.from, contains.id).includes(stored.to));
    assert.equal(ont.rel.edge(stored.from, contains.id, stored.to), stored);
    // The inverse slot reads the same edge backwards.
    const inverse = ont.inverses("s.contains")[0];
    assert.ok(inverse);
    assert.deepEqual(ont.rel.spec(inverse), { type: "CONTAINS", reverse: true });
    assert.ok(ont.rel.values(stored.to, inverse).includes(stored.from));
  });

  it("migrates an okb-lpg/1 folder on load", () => {
    const dir = join(work, "v1");
    mkdirSync(dir);
    writeFileSync(join(dir, "okb.json"), JSON.stringify({ format: "okb-lpg/1", currentStep: 7 }));
    writeFileSync(join(dir, "nodes.json"), JSON.stringify([
      { type: "Ontology", id: "ontology", name: "x" },
      { type: "Slot", id: "s.knows", name: "knows", valueType: "Instance" },
      { type: "Instance", id: "i.x", name: "X" },
      { type: "Instance", id: "i.y", name: "Y" },
    ]));
    writeFileSync(join(dir, "edges.json"), JSON.stringify([{ from: "i.x", type: "HAS_VALUE", to: "i.y", slot: "s.knows" }]));
    const ont = Ontology.load(dir);
    assert.equal(ont.manifest.format, format.FORMAT);
    assert.deepEqual(ont.rel.values("i.x", "s.knows"), ["i.y"]);
    assert.equal(ont.edges.some((e) => e.type === "HAS_VALUE"), false);
  });

  it("builds names and edge types the way the file does", () => {
    assert.equal(format.relType("goesWellWith"), "GOES_WELL_WITH");
    assert.equal(format.relType("Rosé maker"), "ROSE_MAKER");
    assert.equal(format.key("Red Wine"), format.key("red_wine"));
    assert.equal(format.slug("Rosé Wine"), "rose-wine");
    assert.deepEqual(format.tokens("RedWine"), ["red", "wine"]);
  });

  it("refuses a relationship type the format reserves", () => {
    const ont = Ontology.fromData(
      [{ type: "Slot", id: "s.is-a", name: "isA", valueType: "Instance", relType: "IS_A" }, { type: "Slot", id: "s.x", name: "x", valueType: "Instance" }],
      [],
    );
    assert.throws(() => ont.rel.typeFor("is a", "s.x"), /okb uses for its own structure/);
  });

  it("runs the usage example in docs/FORMAT.md", () => {
    const doc = readFileSync(FORMAT_DOC, "utf8");
    const block = doc.match(/```ts\n([\s\S]*?)```/)?.[1];
    assert.ok(block, "FORMAT.md has a ts usage example");
    assert.ok(block.includes('"@ontology-kit/reader"') && block.includes('"./my-ontology"'));
    const script = block
      .replace('"@ontology-kit/reader"', JSON.stringify(pathToFileURL(join(PKG, "src", "index.ts")).href))
      .replace('"./my-ontology"', JSON.stringify(COFFEE));
    const file = join(work, "example.mts");
    writeFileSync(file, script);
    const out = execFileSync(process.execPath, [file], { encoding: "utf8" });
    assert.match(out, /^Vertex cortado contains Double shot$/m, "prints relationship values");
    assert.match(out, /\d+ relationship edges$/m);
  });
});
