// createdAt and updatedAt on nodes (issue #132, okb-lpg/3).
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { Ontology, type OkbNode } from "@ontology-kit/format";
import * as ops from "../src/ops.ts";
import * as prov from "../src/provenance.ts";

const T1 = "2026-11-21T10:00:00Z";
const T2 = "2026-11-22T11:30:05Z";
const at = (iso: string) => {
  process.env.SOURCE_DATE_EPOCH = String(Date.parse(iso) / 1000);
};
let saved: string | undefined;
beforeEach(() => {
  saved = process.env.SOURCE_DATE_EPOCH;
});
afterEach(() => {
  if (saved === undefined) delete process.env.SOURCE_DATE_EPOCH;
  else process.env.SOURCE_DATE_EPOCH = saved;
});

const content = (n: OkbNode) => JSON.stringify(Object.fromEntries(Object.entries(n).filter(([k]) => k !== "createdAt" && k !== "updatedAt")));
/** A copy of the ontology, so the base state stays for comparison. */
const reload = (o: Ontology) => Ontology.fromData(structuredClone(o.nodes), structuredClone(o.edges));

async function base(dir: string): Promise<Ontology> {
  at(T1);
  const ont = Ontology.fromData([], []);
  ont.addNode({ type: "Ontology", id: "ontology", name: "T", domain: "", purpose: "", users: [], maintainers: [], outOfScope: [], kind: "application", reuseReviewed: false });
  ops.setConventions(ont, {});
  ops.addClass(ont, "Wine", { description: "d" });
  ops.addClass(ont, "RedWine", { parents: ["Wine"] });
  ops.addClass(ont, "Winery");
  ops.addSlot(ont, "body", { on: ["Wine"], type: "Enumerated", values: ["light", "full"], card: "single", description: "d" });
  ops.addSlot(ont, "grapes", { on: ["Wine"], type: "String", card: "multiple", description: "d" });
  ops.addSlot(ont, "maker", { on: ["Wine"], type: "Instance", range: ["Winery"], card: "single", description: "d" });
  ops.addSlot(ont, "madeBy", { type: "Instance", range: ["Wine"], card: "multiple", description: "d" });
  ops.addSlot(ont, "condition", { type: "String", card: "single", description: "d" });
  ops.addInstance(ont, "Margaux", { of: ["Wine"] });
  ops.addInstance(ont, "Chateau Margaux", { of: ["Winery"] });
  ops.addCQ(ont, "Which wines are red?");
  ops.addTerms(ont, ["vintage"]);
  ops.addDecision(ont, { title: "T", decision: "d", about: ["Wine"] });
  const file = join(dir, "guide.md");
  writeFileSync(file, "# Guide\n\nWines must have a body.\n");
  prov.addSource(ont, file, { title: "Guide" });
  await prov.addQuote(ont, "src.guide", "Wines must have a body.");
  const quote = ont.ofType("SourceLocation")[0].id;
  prov.addRule(ont, { statement: "Wines have a body", modality: "MUST", cites: [quote], authored: true });
  prov.addRule(ont, { statement: "Wines have a body of full", modality: "MAY", cites: [quote], authored: true });
  return ont;
}

describe("timestamps", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "okb-stamps-"));
  });

  it("every new node has createdAt and updatedAt, equal, as UTC to the second", async () => {
    const ont = await base(dir);
    assert.ok(ont.nodes.length > 15);
    for (const n of ont.nodes) {
      assert.equal(n.createdAt, T1, n.id);
      assert.equal(n.updatedAt, T1, n.id);
      assert.match(n.createdAt!, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    }
  });

  it("a real clock gives a full timestamp, without milliseconds", () => {
    delete process.env.SOURCE_DATE_EPOCH;
    const ont = Ontology.fromData([], []);
    const n: OkbNode = ont.addNode({ type: "Term", id: "t.x", text: "x" });
    assert.match(n.createdAt!, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    assert.equal(n.createdAt, n.updatedAt);
  });

  // Each case names the nodes whose own content the op changes. Every other node must keep its stamp.
  // `setup` runs first, at the time of creation, so the op starts from the state it needs.
  const cases: { name: string; run: (o: Ontology) => unknown; updates: string[]; setup?: (o: Ontology) => unknown }[] = [
    { name: "scope", run: (o) => ops.setScope(o, { purpose: "p" }), updates: ["ontology"] },
    { name: "convention", run: (o) => ops.setConventions(o, { classCase: "PascalCase" }), updates: ["ontology"] },
    { name: "cq set (text)", run: (o) => ops.setCQ(o, "1", { text: "x?" }), updates: ["cq"] },
    { name: "term set", run: (o) => ops.setTerm(o, "vintage", "out-of-scope"), updates: ["vintage"] },
    { name: "term set --as class links BECAME", run: (o) => ops.setTerm(o, "vintage", "class", "Wine"), updates: ["vintage"] },
    { name: "reuse add", run: (o) => ops.addReuse(o, { name: "FOAF", decision: "reference" }), updates: ["ontology"] },
    { name: "reuse none", run: (o) => ops.reuseNone(o, "why"), updates: ["ontology"] },
    { name: "class set --desc", run: (o) => ops.setClass(o, "Wine", { description: "new" }), updates: ["Wine"] },
    { name: "class set --synonym", run: (o) => ops.setClass(o, "Wine", { synonyms: ["Vino"] }), updates: ["Wine"] },
    { name: "class set --abstract", run: (o) => ops.setClass(o, "Wine", { abstract: true }), updates: ["Wine"] },
    { name: "class set --add-parent (edge only)", run: (o) => ops.setClass(o, "Winery", { addParents: ["Wine"] }), updates: [] },
    { name: "class set --remove-parent (edge only)", run: (o) => ops.setClass(o, "RedWine", { removeParents: ["Wine"] }), updates: [] },
    { name: "class disjoint (edge only)", run: (o) => ops.disjoint(o, ["RedWine", "Winery"]), updates: [] },
    { name: "class fix (property value)", run: (o) => ops.assign(o, o.find("Wine", "Class").id, ["body=light"], "fixed"), updates: ["Wine"] },
    { name: "class default", run: (o) => ops.classDefault(o, "Wine", ["body=light"]), updates: ["Wine"] },
    { name: "class restrict", run: (o) => ops.restrict(o, "RedWine", "body", { values: ["full"] }), updates: ["RedWine"] },
    { name: "class restrict --clear", setup: (o) => ops.restrict(o, "RedWine", "body", { values: ["full"] }), run: (o) => ops.restrict(o, "RedWine", "body", { clear: true }), updates: ["RedWine"] },
    { name: "slot set --desc", run: (o) => ops.updateSlot(o, "body", { description: "new" }), updates: ["body"] },
    { name: "slot set --values", run: (o) => ops.updateSlot(o, "body", { values: ["light", "full", "medium"] }), updates: ["body"] },
    { name: "slot set --card", run: (o) => ops.updateSlot(o, "body", { card: "multiple" }), updates: ["body"] },
    { name: "slot set --min/--max", run: (o) => ops.updateSlot(o, "grapes", { min: 1, max: 3 }), updates: ["grapes"] },
    { name: "slot set --default", run: (o) => ops.updateSlot(o, "body", { default: "light" }), updates: ["body"] },
    { name: "slot set --type (to a relationship)", run: (o) => ops.updateSlot(o, "grapes", { type: "Instance", range: ["Winery"] }), updates: ["grapes"] },
    { name: "slot set --range", run: (o) => ops.updateSlot(o, "maker", { range: ["Wine"] }), updates: ["maker"] },
    { name: "slot set --on (HAS_SLOT, edge only)", run: (o) => ops.updateSlot(o, "condition", { on: ["Winery"] }), updates: [] },
    { name: "slot set --off (edge only)", run: (o) => ops.updateSlot(o, "body", { off: ["Wine"] }), updates: [] },
    { name: "slot set --on-rules", run: (o) => ops.updateSlot(o, "condition", { onRules: true }), updates: ["condition"] },
    { name: "slot inverse that copies edge properties", setup: (o) => ops.declareEdgeProperty(o, "madeBy", "since", { type: "Integer" }), run: (o) => ops.inverse(o, "maker", "madeBy"), updates: ["maker"] },
    { name: "slot inverse (edge only)", run: (o) => ops.inverse(o, "maker", "madeBy"), updates: [] },
    { name: "relationship property", run: (o) => ops.declareEdgeProperty(o, "maker", "since", { type: "Integer" }), updates: ["maker"] },
    { name: "instance set slot=value", run: (o) => ops.assign(o, o.find("Margaux", "Instance").id, ["body=light"]), updates: ["Margaux"] },
    { name: "instance set relationship=value (edge only)", run: (o) => ops.assign(o, o.find("Margaux", "Instance").id, ["maker=Chateau Margaux"]), updates: [] },
    { name: "instance set --of (edge only)", run: (o) => ops.setInstanceClasses(o, "Margaux", ["RedWine"]), updates: [] },
    { name: "link (edge only)", run: (o) => ops.link(o, "Margaux", "maker", "Chateau Margaux"), updates: [] },
    { name: "unlink (edge only)", setup: (o) => ops.link(o, "Margaux", "maker", "Chateau Margaux"), run: (o) => ops.unlink(o, "Margaux", "maker", "Chateau Margaux"), updates: [] },
    { name: "cq link (edge only)", run: (o) => ops.linkCQ(o, "1", ["Wine"]), updates: [] },
    { name: "rename", run: (o) => ops.rename(o, "Wine", "Vino"), updates: ["Wine"] },
    { name: "rename a relationship", run: (o) => ops.rename(o, "maker", "producer"), updates: ["maker"] },
    { name: "rule refines (edge only)", run: (o) => prov.refine(o, "Wines have a body of full", "Wines have a body"), updates: [] },
    { name: "instance fulfills a rule (edge only)", run: (o) => prov.fulfill(o, "Margaux", "Wines have a body"), updates: [] },
    { name: "verify", run: (o) => prov.verify(o, "Wines have a body", { status: "SUPPORTED" }), updates: ["Wines have a body"] },
    { name: "cite marks a node extracted", run: (o) => prov.cite(o, "Wine", o.ofType("SourceLocation")[0].id), updates: ["Wine"] },
    { name: "remove a slot: stamps the instance and class that held values for it", setup: (o) => { ops.assign(o, o.find("Margaux", "Instance").id, ["body=light"]); ops.assign(o, o.find("Wine", "Class").id, ["body=full"], "fixed"); }, run: (o) => ops.remove(o, "body"), updates: ["Margaux", "Wine"] },
    { name: "remove a slot: stamps a class with a fixed value for it", setup: (o) => ops.assign(o, o.find("Wine", "Class").id, ["grapes=Merlot"], "fixed"), run: (o) => ops.remove(o, "grapes"), updates: ["Wine"] },
    { name: "remove a class a term became resets the term", setup: (o) => ops.setTerm(o, "vintage", "class", "RedWine"), run: (o) => ops.remove(o, "RedWine"), updates: ["vintage"] },
  ];

  for (const c of cases) {
    it(`${c.name}: stamps exactly ${c.updates.length ? c.updates.join(", ") : "nothing"}`, async () => {
      const made = await base(dir);
      if (c.setup) c.setup(made);
      const root = reload(made);
      const ont = reload(made);
      at(T2);
      c.run(ont);
      const before = new Map(root.nodes.map((n) => [n.id, n]));
      const touched = ont.nodes.filter((n) => before.has(n.id) && n.updatedAt === T2).map((n) => n.id);
      const want = c.updates.map((u) => (u === "ontology" ? u : u === "cq" ? root.ofType("CompetencyQuestion")[0].id : root.find(u).id));
      for (const n of ont.nodes) {
        const was = before.get(n.id);
        if (!was) continue; // created by the op itself
        assert.equal(n.createdAt, T1, `${n.id} keeps createdAt`);
        // The safety net: if the op changed what's stored on the node, it must have stamped it.
        if (content(n) !== content(was)) assert.equal(n.updatedAt, T2, `${n.id} changed but was not stamped`);
      }
      assert.deepEqual(touched.sort(), [...new Set(want)].sort());
    });
  }

  it("a node the op creates and fills in keeps equal stamps, and a later op on the same object updates it", async () => {
    const ont = await base(dir);
    at(T2);
    ops.addInstance(ont, "Latour", { of: ["Wine"], assignments: ["body=full"] });
    const n = ont.find("Latour", "Instance");
    assert.equal(n.createdAt, T2);
    assert.equal(n.updatedAt, T2);
    assert.equal(n.values?.[ont.find("body", "Slot").id], "full");
    at("2026-11-23T09:00:00Z"); // no reload: the same in-memory object
    ops.assign(ont, n.id, ["body=light"]);
    assert.equal(n.createdAt, T2);
    assert.equal(n.updatedAt, "2026-11-23T09:00:00Z");
  });

  it("one tick per command: create-then-edit in the same command keeps equal stamps, without it they can differ", async () => {
    const root = await base(dir);
    const ont = reload(root);
    at(T2);
    ont.tick(() => {
      ops.addInstance(ont, "Latour", { of: ["Wine"] });
      at("2026-11-23T09:00:00Z"); // the clock moves mid-command
      ops.setInstanceDescription(ont, "Latour", "d");
    });
    const n = ont.find("Latour", "Instance");
    assert.equal(n.createdAt, T2);
    assert.equal(n.updatedAt, T2);
    ops.setInstanceDescription(ont, "Latour", "e"); // a later command
    assert.equal(n.updatedAt, "2026-11-23T09:00:00Z");
  });

  it("body=light updates the instance; linking it to a winery doesn't (stored as an edge)", async () => {
    const root = await base(dir);
    const a = reload(root);
    at(T2);
    ops.assign(a, a.find("Margaux", "Instance").id, ["body=light"]);
    assert.equal(a.find("Margaux", "Instance").updatedAt, T2);
    const b = reload(root);
    ops.assign(b, b.find("Margaux", "Instance").id, ["maker=Chateau Margaux"]);
    assert.equal(b.find("Margaux", "Instance").updatedAt, T1);
    assert.equal(b.find("Chateau Margaux", "Instance").updatedAt, T1);
  });

  it("okb-lpg/2 files load with no timestamps added and no id changed, and an edit stamps only updatedAt", () => {
    const nodes = [
      { type: "Ontology", id: "ontology", name: "Old", domain: "", purpose: "", users: [], maintainers: [], outOfScope: [], kind: "application", reuseReviewed: false },
      { type: "CompetencyQuestion", id: "cq.1", text: "Old?" },
      { type: "Class", id: "c.wine", name: "Wine" },
    ];
    writeFileSync(join(dir, "okb.json"), JSON.stringify({ format: "okb-lpg/2", currentStep: 3 }));
    writeFileSync(join(dir, "nodes.json"), JSON.stringify(nodes));
    writeFileSync(join(dir, "edges.json"), "[]");
    const ont = Ontology.load(dir);
    assert.deepEqual(ont.nodes.map((n) => n.id), ["ontology", "cq.1", "c.wine"]);
    for (const n of ont.nodes) assert.ok(!("createdAt" in n) && !("updatedAt" in n), n.id);
    at(T2);
    ops.setClass(ont, "Wine", { description: "d" });
    const wine = ont.find("Wine", "Class");
    assert.equal(wine.updatedAt, T2);
    assert.equal(wine.createdAt, undefined);
    assert.equal(ont.find("1", "CompetencyQuestion").updatedAt, undefined);
  });

  it("two branches that edit different nodes change different lines of nodes.json", async () => {
    const root = await base(dir);
    const [a, b] = [reload(root), reload(root)];
    at(T2);
    ops.setClass(a, "Wine", { description: "from a" });
    process.env.SOURCE_DATE_EPOCH = String(Date.parse(T2) / 1000 + 60);
    ops.setScope(b, { purpose: "from b" });
    const lines = (o: Ontology) => JSON.stringify(o.nodes, null, 2).split("\n");
    const base_ = lines(root);
    const changed = (o: Ontology) => new Set(lines(o).map((l, i) => (l !== base_[i] ? i : -1)).filter((i) => i >= 0));
    const [ca, cb] = [changed(a), changed(b)];
    assert.ok(ca.size && cb.size);
    for (const i of ca) assert.ok(!cb.has(i), `line ${i} changed on both branches`);
  });

  it("okb show prints the stamps", async () => {
    const { show } = await import("../src/render.ts");
    const root = await base(dir);
    const out = show(root, root.find("Wine", "Class"));
    assert.match(out, new RegExp(`created +${T1}`));
    assert.match(out, new RegExp(`updated +${T1}`));
    assert.match(show(root, root.find("1", "CompetencyQuestion")), new RegExp(`created +${T1}`));
  });
});
