import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { FORMAT, NODE_TYPES, Ontology, PROVENANCE_EDGE_TYPES, STRUCTURAL_EDGE_TYPES, isStructuralEdgeType } from "@ontology-kit/format";
import { MetaKB } from "../src/metakb.ts";

const ESPRESSO = join(dirname(dirname(fileURLToPath(import.meta.url))), "examples", "espresso");

/**
 * The format registry has one source, meta-kb/src/format.yaml. The meta-KB build compiles it into the
 * meta-KB (which `okb validate` reads) and into packages/format/src/registry.ts (which the reader
 * ships as data). These tests fail if the two copies drift apart, e.g. after a YAML edit without
 * `pnpm build:meta`.
 */
describe("format registry (the reader's copy against the meta-KB)", () => {
  const registry = MetaKB.get().formatRegistry();

  it("lists the same node types, in the same order", () => {
    assert.deepEqual([...NODE_TYPES], [...registry.nodeTypes.keys()]);
  });

  it("lists the same edge types, in the same order, with the same provenance subset", () => {
    assert.deepEqual([...STRUCTURAL_EDGE_TYPES], [...registry.edgeTypes.keys()]);
    assert.deepEqual([...PROVENANCE_EDGE_TYPES], [...registry.edgeTypes.values()].filter((e) => e.provenance).map((e) => e.name));
  });

  it("has the format version the meta-KB records", () => {
    assert.equal(FORMAT, MetaKB.get().node("metakb", "MetaKB").formatVersion);
  });

  it("classifies every edge in the espresso example as structural or a relationship value", () => {
    const ont = Ontology.load(ESPRESSO);
    const relTypes = ont.rel.edgeTypes();
    assert.ok(relTypes.size > 0);
    for (const e of ont.edges) assert.ok(isStructuralEdgeType(e.type) || relTypes.has(e.type), `${e.type} is classified`);
  });
});
