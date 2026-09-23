/**
 * Every automated rule gets at least one fixture that must trigger it
 * (the last test fails if a rule in CHECKS has no fixture here).
 */
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { CHECKS, loadSourcePages, runChecks } from "../src/checks.ts";
import { Ontology } from "../src/model.ts";
import * as ops from "../src/ops.ts";
import { DEFAULT_CONVENTIONS } from "../src/naming.ts";
import { exportGraph } from "../src/export.ts";
import { mermaid, show } from "../src/render.ts";
import type { GraphEdge, GraphNode, OkbNode } from "../src/types.ts";

const covered = new Set<string>();

/** A minimal, valid starting point: scope, 3 questions, conventions, reuse reviewed. */
function base(): Ontology {
  const nodes: OkbNode[] = [{
    type: "Ontology", id: "ontology", name: "T", domain: "d", purpose: "p", users: ["u"], maintainers: [],
    outOfScope: ["x"], kind: "application", reuseReviewed: true, conventions: { ...DEFAULT_CONVENTIONS, source: "chosen" },
  }];
  for (let i = 1; i <= 3; i++) nodes.push({ type: "CompetencyQuestion", id: `cq.${i}`, text: `Q${i}?` });
  return Ontology.fromData(nodes, []);
}
function cls(ont: Ontology, name: string, parents: string[] = [], extra: Record<string, unknown> = {}) {
  ops.addClass(ont, name, { parents, description: "d", force: true, ...extra });
  return ont.find(name, "Class").id;
}
function slot(ont: Ontology, name: string, o: ops.SlotOpts) {
  ops.addSlot(ont, name, { description: "d", card: "single", force: true, ...o });
  return ont.find(name, "Slot").id;
}
function fires(ont: Ontology, rule: string, pages?: Map<string, any>) {
  covered.add(rule);
  const f = runChecks(ont, { all: true, only: [rule] }, { pages: pages ?? new Map() }).findings;
  assert.ok(f.length > 0, `expected ${rule} to fire`);
  return f;
}
function quiet(ont: Ontology, rule: string) {
  const f = runChecks(ont, { all: true, only: [rule] }).findings;
  assert.deepEqual(f.map((x) => x.message), [], `expected ${rule} to be quiet`);
}
/** An ontology with extra nodes and edges as a hand edit might leave them: unchecked, possibly malformed. */
const raw = (nodes: GraphNode[], edges: GraphEdge[] = []) => {
  const o = base();
  return Ontology.fromData([...o.nodes, ...(nodes as unknown as OkbNode[])], [...o.edges, ...edges]);
};

describe("structure", () => {
  it("struct-well-formed: unknown types, dangling edges, bad endpoints", () => {
    const o = raw([{ type: "Gizmo", id: "g" }, { type: "Class", id: "c.a", name: "A" }], [
      { from: "c.a", type: "IS_A", to: "c.missing" },
      { from: "c.a", type: "HAS_SLOT", to: "c.a" },
      { from: "c.a", type: "LIKES", to: "c.a" },
    ]);
    const msgs = fires(o, "struct-well-formed").map((f) => f.message).join("\n");
    assert.match(msgs, /unknown type 'Gizmo'/);
    assert.match(msgs, /doesn't exist/);
    assert.match(msgs, /HAS_SLOT must go Class → Slot/);
    assert.match(msgs, /LIKES.*unknown type/);
  });
  it("a fresh base ontology has no errors at all", () => {
    assert.equal(runChecks(base(), { all: true }).findings.filter((f) => f.severity === "error").length, 0);
  });
});

describe("hierarchy", () => {
  it("hier-no-cycles", () => {
    const o = raw([{ type: "Class", id: "c.a", name: "A" }, { type: "Class", id: "c.b", name: "B" }], [
      { from: "c.a", type: "IS_A", to: "c.b" }, { from: "c.b", type: "IS_A", to: "c.a" },
    ]);
    const f = fires(o, "hier-no-cycles");
    assert.equal(f.length, 1);
    assert.equal(f[0].severity, "error");
  });
  it("hier-no-singular-plural-pair: linked pair is an error, unlinked a warning", () => {
    const o = raw([{ type: "Class", id: "c.wines", name: "Wines" }, { type: "Class", id: "c.wine", name: "Wine" }], [{ from: "c.wine", type: "IS_A", to: "c.wines" }]);
    assert.equal(fires(o, "hier-no-singular-plural-pair")[0].severity, "error");
    const o2 = raw([{ type: "Class", id: "c.wines", name: "Wines" }, { type: "Class", id: "c.wine", name: "Wine" }]);
    assert.equal(fires(o2, "hier-no-singular-plural-pair")[0].severity, "warning");
  });
  it("ops refuses a plural subclass of its singular, even with --force", () => {
    const o = base();
    cls(o, "Wine");
    assert.throws(() => ops.addClass(o, "Wines", { parents: ["Wine"], force: true }), /singular and plural/);
  });
  it("hier-no-synonym-classes", () => {
    const o = raw([{ type: "Class", id: "c.shrimp", name: "Shrimp", synonyms: ["Prawn"] }, { type: "Class", id: "c.prawn", name: "Prawn" }]);
    fires(o, "hier-no-synonym-classes");
  });
  it("hier-no-redundant-isa (the White wine / Chardonnay example)", () => {
    const o = base();
    const wine = cls(o, "Wine");
    cls(o, "WhiteWine", [wine]);
    o.addEdge(cls(o, "Chardonnay", ["WhiteWine"]), "IS_A", wine);
    fires(o, "hier-no-redundant-isa");
  });
  it("hier-single-child and hier-too-many-children", () => {
    const o = base();
    cls(o, "Burgundy");
    cls(o, "CotesDor", ["Burgundy"]);
    fires(o, "hier-single-child");
    cls(o, "Wine");
    for (let i = 0; i < 13; i++) cls(o, `Kind${String.fromCharCode(65 + i)}`, ["Wine"]);
    fires(o, "hier-too-many-children");
  });
  it("hier-subclass-adds-something, unless terminological", () => {
    const o = base();
    cls(o, "Wine");
    cls(o, "RedWine", ["Wine"]);
    fires(o, "hier-subclass-adds-something");
    ops.setClass(o, "RedWine", { terminological: true });
    quiet(o, "hier-subclass-adds-something");
  });
  it("inst-are-leaves", () => {
    const o = raw([{ type: "Class", id: "c.a", name: "A" }, { type: "Instance", id: "i.x", name: "X" }, { type: "Instance", id: "i.y", name: "Y" }], [
      { from: "c.a", type: "IS_A", to: "i.x" }, { from: "i.y", type: "INSTANCE_OF", to: "i.x" },
    ]);
    assert.equal(fires(o, "inst-are-leaves").length, 2);
    quiet(o, "struct-well-formed");
  });
  it("inst-not-of-abstract", () => {
    const o = raw([{ type: "Class", id: "c.a", name: "A", abstract: true }, { type: "Instance", id: "i.x", name: "X" }], [{ from: "i.x", type: "INSTANCE_OF", to: "c.a" }]);
    fires(o, "inst-not-of-abstract");
    assert.throws(() => ops.addInstance(o, "Y", { of: ["A"] }), /abstract/);
  });
});

describe("disjointness", () => {
  it("disjoint-no-shared-members: class under two disjoint classes (the Riesling + Port example)", () => {
    const o = base();
    cls(o, "Wine");
    cls(o, "RedWine", ["Wine"]);
    cls(o, "WhiteWine", ["Wine"]);
    ops.disjoint(o, ["RedWine", "WhiteWine"]);
    cls(o, "Port", ["RedWine"]);
    cls(o, "Riesling", ["WhiteWine"]);
    assert.throws(() => cls(o, "Mixup", ["Port", "Riesling"]), /declared disjoint/, "okb refuses it at write time");
    cls(o, "Mixup", ["Port"]);
    o.addEdge(o.find("Mixup", "Class").id, "IS_A", o.find("Riesling", "Class").id); // as if hand-edited
    cls(o, "SubMixup", ["Mixup"]);
    const f = fires(o, "disjoint-no-shared-members");
    assert.equal(f.length, 1, "reported where the conflict starts, not on every descendant");
    assert.deepEqual(f[0].nodes[0], o.find("Mixup", "Class").id);
  });
  it("disjoint-no-shared-members: instance of both", () => {
    const o = base();
    cls(o, "A");
    cls(o, "B");
    ops.disjoint(o, ["A", "B"]);
    o.addNode({ type: "Instance", id: "i.x", name: "X" });
    o.addEdge("i.x", "INSTANCE_OF", o.find("A", "Class").id);
    o.addEdge("i.x", "INSTANCE_OF", o.find("B", "Class").id);
    fires(o, "disjoint-no-shared-members");
  });
  it("disjoint-consider-siblings is quiet when disjointness is inherited", () => {
    const o = base();
    cls(o, "Wine");
    cls(o, "RedWine", ["Wine"]);
    cls(o, "WhiteWine", ["Wine"]);
    fires(o, "disjoint-consider-siblings");
    ops.disjoint(o, ["RedWine", "WhiteWine"]);
    cls(o, "DessertWine", ["Wine"]);
    cls(o, "Port", ["RedWine", "DessertWine"]);
    cls(o, "Sauternes", ["WhiteWine", "DessertWine"]);
    const f = runChecks(o, { all: true, only: ["disjoint-consider-siblings"] }).findings;
    assert.ok(!f.some((x) => x.message.includes("'DessertWine'")), "Port/Sauternes are already disjoint via Red/White");
  });
});

describe("slots and facets", () => {
  const wineOnt = () => {
    const o = base();
    cls(o, "Wine");
    cls(o, "RedWine", ["Wine"]);
    cls(o, "WhiteWine", ["Wine"]);
    cls(o, "Winery");
    return o;
  };
  it("slot-attach-most-general: redundant attachment and 'every child'", () => {
    const o = wineOnt();
    const s = slot(o, "body", { on: ["RedWine", "WhiteWine"], type: "String" });
    fires(o, "slot-attach-most-general");
    o.addEdge(o.find("Wine", "Class").id, "HAS_SLOT", s);
    assert.ok(fires(o, "slot-attach-most-general").some((f) => f.message.includes("ancestor")));
  });
  it("attaching to a parent via ops removes redundant child attachments", () => {
    const o = wineOnt();
    slot(o, "body", { on: ["RedWine"], type: "String" });
    const notes = ops.updateSlot(o, "body", { on: ["Wine"] });
    assert.ok(notes.some((n) => n.includes("Removed body from RedWine")));
    quiet(o, "slot-attach-most-general");
  });
  it("slot-value-type-declared, slot-instance-needs-range, slot-enum-needs-values, slot-cardinality-declared", () => {
    const o = raw([
      { type: "Slot", id: "s.a", name: "a" },
      { type: "Slot", id: "s.b", name: "b", valueType: "Instance", cardinality: "single" },
      { type: "Slot", id: "s.c", name: "c", valueType: "Enumerated", cardinality: "single" },
    ]);
    fires(o, "slot-value-type-declared");
    fires(o, "slot-instance-needs-range");
    fires(o, "slot-enum-needs-values");
    assert.deepEqual(fires(o, "slot-cardinality-declared")[0].nodes, ["s.a"]);
  });
  it("slot-cardinality-coherent", () => {
    const o = raw([{ type: "Slot", id: "s.a", name: "a", valueType: "String", cardinality: "single", minCardinality: 3, maxCardinality: 2 }]);
    fires(o, "slot-cardinality-coherent");
  });
  it("slot-range-remove-subclass, slot-range-collapse-subclasses, slot-range-all-but-few, slot-range-not-too-general", () => {
    const o = wineOnt();
    slot(o, "produces", { on: ["Winery"], type: "Instance", range: ["Wine", "RedWine"], card: "multiple" });
    fires(o, "slot-range-remove-subclass");
    ops.updateSlot(o, "produces", { range: ["RedWine", "WhiteWine"] });
    fires(o, "slot-range-collapse-subclasses");
    cls(o, "RoseWine", ["Wine"]);
    cls(o, "OrangeWine", ["Wine"]);
    ops.updateSlot(o, "produces", { range: ["RedWine", "WhiteWine", "RoseWine"] });
    fires(o, "slot-range-all-but-few");
    cls(o, "Thing");
    ops.updateSlot(o, "produces", { range: ["Thing"] });
    fires(o, "slot-range-not-too-general");
  });
  it("slot-values-respect-facets: enum, type, range, min and max", () => {
    const o = wineOnt();
    slot(o, "body", { on: ["Wine"], type: "Enumerated", values: ["light", "full"] });
    slot(o, "year", { on: ["Wine"], type: "Integer" });
    slot(o, "maker", { on: ["Wine"], type: "Instance", range: ["Winery"], min: 1 });
    o.addNode({ type: "Instance", id: "i.w", name: "W", values: { [o.find("body", "Slot").id]: "sparkly", [o.find("year", "Slot").id]: "1999" } });
    o.addEdge("i.w", "INSTANCE_OF", o.find("RedWine", "Class").id);
    const msgs = fires(o, "slot-values-respect-facets").map((f) => f.message).join("\n");
    assert.match(msgs, /not one of the allowed values/);
    assert.match(msgs, /whole number/);
    assert.match(msgs, /at least 1 required/);
    o.addNode({ type: "Instance", id: "i.x", name: "X" });
    o.addEdge("i.x", "INSTANCE_OF", o.find("Wine", "Class").id);
    o.addEdge("i.w", o.find("maker", "Slot").relType!, "i.x"); // as if hand-edited
    assert.match(fires(o, "slot-values-respect-facets").map((f) => f.message).join("\n"), /isn't a Winery/);
  });
  it("ops.coerce rejects bad values up front", () => {
    const o = wineOnt();
    slot(o, "body", { on: ["Wine"], type: "Enumerated", values: ["light", "full"] });
    o.addNode({ type: "Instance", id: "i.w", name: "W", values: {} });
    o.addEdge("i.w", "INSTANCE_OF", o.find("Wine", "Class").id);
    assert.throws(() => ops.assign(o, "i.w", ["body=sparkly"]), /must be one of light, full/);
    ops.assign(o, "i.w", ["body=LIGHT"]);
    assert.equal(o.require("i.w", "Instance").values?.[o.find("body", "Slot").id], "light");
  });
  it("slot-value-slot-applies", () => {
    const o = wineOnt();
    slot(o, "tanninLevel", { on: ["RedWine"], type: "String" });
    o.addNode({ type: "Instance", id: "i.w", name: "W", values: { [o.find("tanninLevel", "Slot").id]: "low" } });
    o.addEdge("i.w", "INSTANCE_OF", o.find("WhiteWine", "Class").id);
    fires(o, "slot-value-slot-applies");
  });
  it("slot-edge-properties", () => {
    const o = wineOnt();
    cls(o, "Food");
    slot(o, "goesWellWith", { on: ["Wine"], type: "Instance", range: ["Food"], card: "multiple" });
    ops.declareEdgeProperty(o, "goesWellWith", "strength", { type: "Enumerated", values: ["excellent", "fine"], required: true });
    o.addEdge(o.find("Wine", "Class").id, "GOES_WELL_WITH", o.find("Food", "Class").id, { strength: "meh" });
    assert.match(fires(o, "slot-edge-properties")[0].message, /not one of the allowed values/);
  });
  it("slot-default-allowed", () => {
    const o = raw([{ type: "Slot", id: "s.a", name: "a", valueType: "Enumerated", allowedValues: ["x"], cardinality: "single", default: "y" }]);
    fires(o, "slot-default-allowed");
  });
  it("slot-fixed-not-overridden (Dessert wine is sweet)", () => {
    const o = wineOnt();
    cls(o, "DessertWine", ["Wine"]);
    cls(o, "Port", ["DessertWine"]);
    slot(o, "sugar", { on: ["Wine"], type: "Enumerated", values: ["dry", "sweet"] });
    ops.assign(o, o.find("DessertWine", "Class").id, ["sugar=sweet"], "fixed");
    ops.assign(o, o.find("Port", "Class").id, ["sugar=dry"], "fixed");
    fires(o, "slot-fixed-not-overridden");
  });
  it("inverses are stored once and read from both ends; slot-inverse-consistent checks domain/range", () => {
    const o = wineOnt();
    slot(o, "maker", { on: ["Wine"], type: "Instance", range: ["Winery"] });
    slot(o, "produces", { on: ["Winery"], type: "Instance", range: ["Wine"], card: "multiple" });
    ops.inverse(o, "maker", "produces");
    ops.addInstance(o, "Morgon", { of: ["Winery"] });
    ops.addInstance(o, "Sterling", { of: ["Winery"] });
    ops.addInstance(o, "Morgon Beaujolais", { of: ["RedWine"], assignments: ["maker=Morgon"] });
    ops.addInstance(o, "Sterling Merlot", { of: ["RedWine"] });
    ops.assign(o, o.find("Sterling", "Instance").id, ["produces+=Sterling Merlot"]); // set from the other end
    const ids = (n: string) => o.find(n, "Instance").id;
    assert.deepEqual(o.statedValues(ids("Morgon"), o.find("produces", "Slot").id), [ids("Morgon Beaujolais")]);
    assert.deepEqual(o.statedValues(ids("Sterling Merlot"), o.find("maker", "Slot").id), [ids("Sterling")]);
    assert.equal(o.edgesOf("MAKER").length, 2, "one edge per fact");
    assert.equal(o.edgesOf("PRODUCES").length, 0);
    quiet(o, "slot-inverse-consistent");
    ops.updateSlot(o, "produces", { range: ["Winery"] });
    fires(o, "slot-inverse-consistent");
  });
  it("declaring an inverse after data exists merges the two edge types", () => {
    const o = wineOnt();
    slot(o, "maker", { on: ["Wine"], type: "Instance", range: ["Winery"] });
    slot(o, "produces", { on: ["Winery"], type: "Instance", range: ["Wine"], card: "multiple" });
    ops.addInstance(o, "Morgon", { of: ["Winery"] });
    ops.addInstance(o, "Morgon Beaujolais", { of: ["RedWine"], assignments: ["maker=Morgon"] });
    ops.assign(o, o.find("Morgon", "Instance").id, ["produces=Morgon Beaujolais"]);
    assert.equal(o.edgesOf("PRODUCES").length, 1);
    ops.inverse(o, "maker", "produces");
    assert.equal(o.edgesOf("PRODUCES").length, 0);
    assert.equal(o.edgesOf("MAKER").length, 1, "the duplicate fact collapsed into one edge");
  });
  it("renaming a relationship retypes its edges; removing it keeps data stored via its inverse", () => {
    const o = wineOnt();
    slot(o, "maker", { on: ["Wine"], type: "Instance", range: ["Winery"] });
    slot(o, "produces", { on: ["Winery"], type: "Instance", range: ["Wine"], card: "multiple" });
    ops.inverse(o, "maker", "produces");
    ops.addInstance(o, "Morgon", { of: ["Winery"] });
    ops.addInstance(o, "Morgon Beaujolais", { of: ["RedWine"], assignments: ["maker=Morgon"] });
    ops.rename(o, "maker", "producer");
    assert.equal(o.edgesOf("PRODUCER").length, 1);
    ops.remove(o, "producer", ["Slot"]);
    assert.deepEqual(o.edgesOf("PRODUCES").map((e) => [e.from, e.to]), [[o.find("Morgon", "Instance").id, o.find("Morgon Beaujolais", "Instance").id]]);
  });
  it("relationship names can't collide with okb's structural edge types", () => {
    const o = wineOnt();
    assert.throws(() => slot(o, "isA", { on: ["Wine"], type: "Instance", range: ["Wine"] }), /okb uses for its own structure/);
  });
});

describe("naming", () => {
  it("naming-convention-defined", () => {
    const o = base();
    delete o.meta.conventions;
    quiet(o, "naming-convention-defined"); // nothing named yet
    o.addNode({ type: "Class", id: "c.a", name: "A" });
    fires(o, "naming-convention-defined");
    o.meta.conventions = { ...DEFAULT_CONVENTIONS, source: "default" };
    assert.match(fires(o, "naming-convention-defined")[0].message, /default/);
  });
  it("naming-follow-convention and ops refusal", () => {
    const o = raw([{ type: "Class", id: "c.a", name: "red_wine" }, { type: "Slot", id: "s.a", name: "TanninLevel", valueType: "String" }]);
    assert.equal(fires(o, "naming-follow-convention").length, 2);
    assert.throws(() => ops.addClass(o, "white wine"), /Suggested: 'WhiteWine'/);
  });
  it("naming-singular-plural-consistent", () => {
    fires(raw([{ type: "Class", id: "c.a", name: "Wineries" }]), "naming-singular-plural-consistent");
    quiet(raw([{ type: "Class", id: "c.a", name: "Glass" }]), "naming-singular-plural-consistent");
  });
  it("naming-no-type-words", () => {
    fires(raw([{ type: "Class", id: "c.a", name: "WineClass" }]), "naming-no-type-words");
  });
  it("naming-no-abbreviations", () => {
    fires(raw([{ type: "Class", id: "c.a", name: "CabSauvignon" }, { type: "Class", id: "c.b", name: "USWine" }]), "naming-no-abbreviations");
  });
  it("naming-subclass-names-consistent (RedWine and White)", () => {
    const o = base();
    cls(o, "Wine");
    cls(o, "RedWine", ["Wine"]);
    cls(o, "White", ["Wine"]);
    fires(o, "naming-subclass-names-consistent");
  });
  it("naming-unique (case/delimiter-insensitive)", () => {
    fires(raw([{ type: "Class", id: "c.a", name: "RedWine" }, { type: "Class", id: "c.b", name: "Red_Wine" }]), "naming-unique");
  });
});

describe("scope, docs, terms, reuse", () => {
  it("scope-defined, scope-competency-questions, reuse-recorded", () => {
    const o = Ontology.fromData([{ type: "Ontology", id: "ontology", name: "T" } as OkbNode], []);
    fires(o, "scope-defined");
    fires(o, "scope-competency-questions");
    fires(o, "reuse-recorded");
  });
  it("scope-cq-coverage and scope-no-unneeded", () => {
    const o = base();
    cls(o, "Wine");
    cls(o, "Winery");
    fires(o, "scope-cq-coverage");
    ops.linkCQ(o, "1", ["Wine"]);
    const f = fires(o, "scope-no-unneeded");
    assert.match(f[0].message, /Winery/);
  });
  it("doc-descriptions", () => {
    fires(raw([{ type: "Class", id: "c.a", name: "A" }]), "doc-descriptions");
  });
  it("terms-dispositioned; creating a class sorts the matching term", () => {
    const o = base();
    ops.addTerms(o, ["red wine", "vintage"]);
    fires(o, "terms-dispositioned");
    cls(o, "RedWine");
    const f = runChecks(o, { all: true, only: ["terms-dispositioned"] }).findings;
    assert.match(f[0].message, /1 term/);
  });
});

describe("waivers", () => {
  it("a design decision explains a warning but can't waive an error", () => {
    const o = base();
    cls(o, "Burgundy");
    cls(o, "CotesDor", ["Burgundy"]);
    ops.addDecision(o, { title: "t", decision: "d", about: ["Burgundy"], waives: ["hier-single-child"] });
    const f = runChecks(o, { all: true, only: ["hier-single-child"] }).findings;
    assert.equal(f[0].explainedBy, "d.1");
    assert.throws(() => ops.addDecision(o, { title: "t", decision: "d", waives: ["hier-no-cycles"] }), /can't waive an error/);
  });
  it("warnings from later steps are hidden until then; errors never are", () => {
    const o = base();
    o.manifest.currentStep = 1;
    o.addNode({ type: "Slot", id: "s.a", name: "a", valueType: "Instance" });
    const early = runChecks(o, { only: ["slot-cardinality-declared", "slot-instance-needs-range"] });
    assert.deepEqual(early.findings.map((f) => f.rule), ["slot-instance-needs-range"]);
    assert.equal(early.hiddenLater, 1);
    assert.equal(runChecks(o, { all: true, only: ["slot-cardinality-declared"] }).findings.length, 1);
  });
  it("a waiver about a class also covers its subclasses, and reports what it matched", () => {
    const o = base();
    cls(o, "Genre");
    cls(o, "Fiction", ["Genre"]);
    cls(o, "Mystery", ["Fiction"]);
    cls(o, "Poetry", ["Genre"]);
    const notes = ops.addDecision(o, { title: "t", decision: "d", about: ["Genre"], waives: ["hier-subclass-adds-something"] });
    assert.match(notes.join(" "), /explains 3 current finding/);
    assert.ok(runChecks(o, { all: true, only: ["hier-subclass-adds-something"] }).findings.every((f) => f.explainedBy));
  });
});

describe("provenance", () => {
  const dir = mkdtempSync(join(tmpdir(), "okb-"));
  after(() => {});
  it("prov-verified, prov-cites-quote", () => {
    const o = raw([{ type: "Rule", id: "rule.a", modality: "MUST", statement: "x", verification: { status: "OVERREACH" } }]);
    fires(o, "prov-verified");
    fires(o, "prov-cites-quote");
  });
  it("prov-quote-current reads the Source's localPath", async () => {
    writeFileSync(join(dir, "doc.md"), "Buttons must have a minimum target of 24px.");
    const o = raw([
      { type: "Source", id: "src.a", title: "Doc", localPath: join(dir, "doc.md") },
      { type: "SourceLocation", id: "loc.1", quote: "minimum target of 44px" },
      { type: "SourceLocation", id: "loc.2", quote: "must have a minimum target of 24px" },
    ], [{ from: "loc.1", type: "PART_OF", to: "src.a" }, { from: "loc.2", type: "PART_OF", to: "src.a" }]);
    const f = fires(o, "prov-quote-current", await loadSourcePages(o));
    assert.deepEqual(f.map((x) => x.nodes[0]), ["loc.1"]);
  });
  it("prov-duplicate-quotes across sources", () => {
    const o = raw([
      { type: "Source", id: "src.a", title: "A" }, { type: "Source", id: "src.b", title: "B" },
      { type: "SourceLocation", id: "loc.1", quote: "Sizes: extraSmall, small, medium, large." },
      { type: "SourceLocation", id: "loc.2", quote: "Sizes: extraSmall, small, medium, large" },
    ], [{ from: "loc.1", type: "PART_OF", to: "src.a" }, { from: "loc.2", type: "PART_OF", to: "src.b" }]);
    fires(o, "prov-duplicate-quotes");
  });
});

describe("ops regressions", () => {
  it("rename can change only capitalization", () => {
    const o = base();
    cls(o, "Hardcover");
    ops.rename(o, "Hardcover", "HardCover");
    assert.equal(o.find("HardCover", "Class").name, "HardCover");
  });
  it("remove moves instances up, reports orphaned slots and resets terms", () => {
    const o = base();
    cls(o, "Book");
    cls(o, "Novel", ["Book"]);
    ops.addTerms(o, ["novel"]);
    ops.setTerm(o, "novel", "class", "Novel");
    slot(o, "narrator", { on: ["Novel"], type: "String" });
    ops.addInstance(o, "Dune", { of: ["Novel"] });
    const notes = ops.remove(o, "Novel", ["Class"]).join("\n");
    assert.deepEqual(o.targets(o.find("Dune", "Instance").id, "INSTANCE_OF"), [o.find("Book", "Class").id]);
    assert.match(notes, /narrator is no longer attached/);
    assert.equal(o.find("novel", "Term").disposition, "undecided");
  });
  it("instance links are range-checked at write time and inverses only land where they apply", () => {
    const o = base();
    cls(o, "Book");
    cls(o, "Author");
    cls(o, "Publisher");
    slot(o, "writtenBy", { on: ["Book"], type: "Instance", range: ["Author"], card: "multiple" });
    slot(o, "wrote", { on: ["Author"], type: "Instance", range: ["Book"], card: "multiple" });
    ops.inverse(o, "writtenBy", "wrote");
    ops.addInstance(o, "Dune", { of: ["Book"] });
    ops.addInstance(o, "Ace", { of: ["Publisher"] });
    assert.throws(() => ops.assign(o, o.find("Dune", "Instance").id, ["writtenBy+=Ace"]), /must point at an Author/);
  });
  it("incoherent facets are refused when written", () => {
    const o = base();
    cls(o, "Book");
    assert.throws(() => slot(o, "genre", { on: ["Book"], type: "String", card: "single", min: 3 }), /minimum 3 is more than maximum 1/);
  });
  it("a class and a slot with the same name can be told apart with a prefix", () => {
    const o = base();
    cls(o, "Genre");
    slot(o, "genre", { on: ["Genre"], type: "String" });
    assert.throws(() => o.find("Genre", ["Class", "Slot"]), /class:Genre/);
    assert.equal(o.find("slot:genre", ["Class", "Slot"]).type, "Slot");
  });
  it("naming an instance as a parent class explains why that can't work", () => {
    const o = base();
    cls(o, "Book");
    ops.addInstance(o, "Dune", { of: ["Book"] });
    assert.throws(() => ops.addClass(o, "DuneMessiah", { parents: ["Dune"] }), /is an Instance, not a Class. Instances can't have subclasses/);
  });
});

describe("hand-edited files", () => {
  // A HAS_SLOT edge to a class, as a hand edit might leave it. struct-well-formed
  // reports it; everything else should carry on around it, not fail.
  const withBadSlot = () => {
    const o = raw(
      [
        { type: "Class", id: "c.a", name: "A", description: "d" },
        { type: "Class", id: "c.b", name: "B", description: "d" },
        { type: "Slot", id: "s.n", name: "n", valueType: "Integer", cardinality: "single", description: "d" },
        { type: "Instance", id: "i.x", name: "X", values: { "s.n": "many" } },
      ],
      [
        { from: "c.a", type: "HAS_SLOT", to: "s.n" }, { from: "c.a", type: "HAS_SLOT", to: "c.b" },
        { from: "i.x", type: "INSTANCE_OF", to: "c.a" },
      ],
    );
    return o;
  };
  it("still validates the real slots around a HAS_SLOT to a non-slot", () => {
    const f = runChecks(withBadSlot(), { all: true }).findings;
    assert.ok(f.some((x) => x.rule === "struct-well-formed" && /HAS_SLOT/.test(x.message)));
    assert.ok(f.some((x) => x.rule === "slot-values-respect-facets" && /whole number/.test(x.message)));
    assert.ok(!f.some((x) => /check crashed/.test(x.message)), f.filter((x) => /crashed/.test(x.message)).map((x) => x.message).join("\n"));
  });
  it("still shows, diagrams, exports and adds instances", () => {
    const o = withBadSlot();
    assert.match(show(o, o.require("c.a")), /n\s+Integer/);
    assert.match(mermaid(o), /Integer n/);
    assert.equal(exportGraph(o).nodes.find((n) => n.id === "i.x")?.properties.n, "many");
    ops.addInstance(o, "Y", { of: ["A"] });
  });
  it("a list-valued default for a multiple slot is stored as that list", () => {
    const o = base();
    cls(o, "Wine");
    slot(o, "grapes", { on: ["Wine"], type: "String", card: "multiple" });
    o.require(o.find("Wine", "Class").id, "Class").defaults = { [o.find("grapes", "Slot").id]: ["Gamay", "Pinot"] };
    ops.addInstance(o, "W", { of: ["Wine"] });
    assert.deepEqual(o.require(o.find("W", "Instance").id, "Instance").values?.[o.find("grapes", "Slot").id], ["Gamay", "Pinot"]);
  });
});

describe("coverage", () => {
  it("every automated rule has a fixture in this file", () => {
    const missing = Object.keys(CHECKS).filter((k) => !covered.has(k));
    assert.deepEqual(missing, []);
  });
});
