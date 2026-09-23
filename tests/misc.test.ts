import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { MetaKB } from "../src/metakb.ts";
import * as naming from "../src/naming.ts";
import { findQuote } from "../src/quotes.ts";
import { Ontology } from "../src/model.ts";
import * as ops from "../src/ops.ts";
import { runChecks } from "../src/checks.ts";
import { computeStatus } from "../src/status.ts";
import { exportGraph, toCypher } from "../src/export.ts";
import type { OkbNode } from "../src/types.ts";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

describe("naming", () => {
  it("converts between styles", () => {
    assert.equal(naming.convert("red wine", "PascalCase"), "RedWine");
    assert.equal(naming.convert("RedWine", "camelCase"), "redWine");
    assert.equal(naming.convert("tanninLevel", "snake_case"), "tannin_level");
    assert.equal(naming.convert("red_wine", "Title Case"), "Red Wine");
  });
  it("guesses plurals conservatively", () => {
    for (const w of ["Wines", "Wineries", "Grapes", "Children"]) assert.ok(naming.isPlural(w), w);
    for (const w of ["Wine", "Glass", "Status", "Analysis", "Rosé", "Bordeaux", "Series"]) assert.ok(!naming.isPlural(w), w);
    assert.equal(naming.singularize("Wineries"), "Winery");
    assert.equal(naming.pluralize("Winery"), "Wineries");
  });
});

describe("quotes", () => {
  it("matches across line breaks, split words, curly quotes and page numbers", () => {
    const pages = ["...instances of those classes will have to migrate often from one class t o\n", "18\nanother. More “text”."];
    assert.deepEqual(findQuote("will have to migrate often from one class to another.", pages), { found: true, pages: [1, 2] });
    assert.equal(findQuote("More \"text\".", pages).found, true);
    assert.equal(findQuote("migrate rarely", pages).found, false);
  });
  it("supports ... gaps, in order", () => {
    const pages = ["alpha beta gamma delta"];
    assert.equal(findQuote("alpha ... delta", pages).found, true);
    assert.equal(findQuote("delta ... alpha", pages).found, false);
  });
});

describe("meta-KB", () => {
  const meta = MetaKB.get();
  it("every sourced rule cites at least one verbatim quote", () => {
    for (const r of meta.ofType("Rule")) {
      if (r.basis === "operational") continue;
      assert.ok(meta.citations(r.id).length > 0, r.key);
    }
  });
  it("modality never exceeds what severity allows without a stated reason", () => {
    const def: Record<string, string> = { MUST: "error", MUST_NOT: "error", SHOULD: "warning", SHOULD_NOT: "warning", MAY: "info" };
    for (const r of meta.ofType("Rule")) if (r.severity !== def[r.modality]) assert.ok(r.severityReason, r.key);
  });
  it("was built from the current YAML (run npm run build:meta if this fails)", () => {
    const before = readFileSync(join(ROOT, "meta-kb/data/nodes.json"), "utf8");
    execFileSync(process.execPath, [join(ROOT, "meta-kb/build.ts")], { stdio: "ignore" });
    assert.equal(readFileSync(join(ROOT, "meta-kb/data/nodes.json"), "utf8"), before);
  });
  it("explain resolves rules, concepts, aliases and step numbers", () => {
    assert.equal(meta.resolve("hier-no-cycles")[0].key, "hier-no-cycles");
    assert.equal(meta.resolve("range")[0].id, "concept.range");
    assert.equal(meta.resolve("is-a")[0].id, "concept.subclass");
    assert.equal(meta.resolve("4")[0].id, "step.4-classes");
  });
});

describe("indexes", () => {
  it("stay equal to a full rebuild through adds, links, inverses, renames and removals", () => {
    const ont = Ontology.fromData([{ type: "Ontology", id: "ontology", name: "T" } as OkbNode], []);
    ops.setConventions(ont, {});
    ops.addClass(ont, "Wine", { description: "d" });
    ops.addClass(ont, "RedWine", { parents: ["Wine"], description: "d" });
    ops.addClass(ont, "Winery", { description: "d" });
    ops.addSlot(ont, "maker", { on: ["Wine"], type: "Instance", range: ["Winery"], card: "single", description: "d" });
    ops.addSlot(ont, "produces", { on: ["Winery"], type: "Instance", range: ["Wine"], card: "multiple", description: "d" });
    for (const i of [1, 2, 3]) {
      ops.addInstance(ont, `Winery ${i}`, { of: ["Winery"] });
      ops.addInstance(ont, `Wine ${i}`, { of: ["RedWine"], assignments: [`maker=Winery ${i}`] });
    }
    ops.inverse(ont, "maker", "produces");
    ops.rename(ont, "maker", "madeBy");
    ops.remove(ont, "Wine 2");
    const fresh = Ontology.fromData(structuredClone(ont.nodes), structuredClone(ont.edges));
    const types = [...new Set(ont.edges.map((e) => e.type))];
    for (const n of ont.nodes) {
      assert.deepEqual(ont.get(n.id), fresh.get(n.id));
      for (const t of types) {
        assert.deepEqual(ont.outEdges(n.id, t), fresh.outEdges(n.id, t), `out ${n.id} ${t}`);
        assert.deepEqual(ont.inEdges(n.id, t), fresh.inEdges(n.id, t), `in ${n.id} ${t}`);
      }
    }
    assert.deepEqual(ont.linked("i.winery-1", "s.produces"), ["i.wine-1"]);
  });
});

describe("worked example", () => {
  it("builds the wine ontology with no errors and all steps complete", () => {
    execFileSync(process.execPath, [join(ROOT, "examples/build-wine.ts")], { stdio: "ignore" });
    const ont = Ontology.load(join(ROOT, "examples/wine"));
    const findings = runChecks(ont, { all: true });
    assert.equal(findings.filter((f) => f.severity === "error").length, 0);
    assert.equal(findings.filter((f) => f.severity === "warning" && !f.explainedBy).length, 0);
    const st = computeStatus(ont, findings);
    assert.ok(st.steps.every((s) => s.complete), JSON.stringify(st.steps.filter((s) => !s.complete)));
  });
  it("stores each relationship once, under its own type", () => {
    const ont = Ontology.load(join(ROOT, "examples/wine"));
    assert.ok(ont.edgesOf("MAKER").length >= 2);
    assert.equal(ont.edgesOf("PRODUCES").length, 0);
    assert.equal(ont.edges.filter((e) => e.type === "HAS_VALUE").length, 0);
  });
  it("exports instances as nodes labeled with their class chain, with inherited fixed values", () => {
    const ont = Ontology.load(join(ROOT, "examples/wine"));
    const g = exportGraph(ont);
    const morgon = g.nodes.find((n) => n.properties.name === "Chateau Morgon Beaujolais")!;
    assert.deepEqual(morgon.labels, ["Beaujolais", "RedWine", "Wine"]);
    assert.equal(morgon.properties.color, "red", "fixed on RedWine, materialized on the instance");
    assert.equal(morgon.properties.body, "light");
    assert.ok(g.relationships.some((r) => r.type === "MAKER" && r.from === morgon.id));
    assert.ok(!g.nodes.some((n) => n.labels.includes("OkbClass")));
    const withSchema = exportGraph(ont, { schema: true });
    assert.ok(withSchema.relationships.some((r) => r.type === "GOES_WELL_WITH" && r.properties.classLevel));
    const cypher = toCypher(g);
    assert.match(cypher, /CREATE \(:Beaujolais:RedWine:Wine \{okbId: "i\.chateau-morgon-beaujolais"/);
    assert.match(cypher, /CREATE \(a\)-\[:MAKER\]->\(b\);/);
  });
  it("migrates okb-lpg/1 HAS_VALUE edges on load", async () => {
    const { mkdtempSync, writeFileSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const dir = mkdtempSync(join(tmpdir(), "okb-v1-"));
    writeFileSync(join(dir, "okb.json"), JSON.stringify({ format: "okb-lpg/1", currentStep: 7 }));
    writeFileSync(join(dir, "nodes.json"), JSON.stringify([
      { type: "Ontology", id: "ontology", name: "T" },
      { type: "Class", id: "c.a", name: "A" }, { type: "Slot", id: "s.knows", name: "knows", valueType: "Instance" },
      { type: "Instance", id: "i.x", name: "X" }, { type: "Instance", id: "i.y", name: "Y" },
    ]));
    writeFileSync(join(dir, "edges.json"), JSON.stringify([{ from: "i.x", type: "HAS_VALUE", to: "i.y", slot: "s.knows" }]));
    const ont = Ontology.load(dir);
    assert.deepEqual(ont.edges, [{ from: "i.x", type: "KNOWS", to: "i.y" }]);
    assert.equal(ont.manifest.format, "okb-lpg/2");
  });
});
