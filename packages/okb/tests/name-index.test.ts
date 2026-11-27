/** The name index behind Ontology.find(): lookups give the same answers as a scan of every node, before and after changes. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Ontology, key, nodeLabel, type NodeType, type OkbNode } from "@ontology-kit/reader";
import * as ops from "../src/ops.ts";

function fresh(): Ontology {
  return Ontology.fromData([
    { type: "Ontology", id: "ontology", name: "T", domain: "", purpose: "", users: [], maintainers: [], outOfScope: [], kind: "application", reuseReviewed: false },
  ], []);
}

/** What a linear scan over every node finds: the oracle the index must agree with. */
function scan(ont: Ontology, ref: string, types?: NodeType[]): OkbNode[] {
  const k = key(ref);
  const names = (n: OkbNode) => ["name", "text", "title", "quote"].map((f) => (f in n ? (n as unknown as Record<string, unknown>)[f] : undefined)).filter((x): x is string => typeof x === "string");
  return ont.nodes.filter((n) => (!types || types.includes(n.type)) && k && names(n).some((x) => key(x) === k));
}

/** find() must give the one node a scan finds, nothing for none, and an ambiguity error for several. */
function agree(ont: Ontology, ref: string, types?: NodeType[]): void {
  const want = scan(ont, ref, types);
  if (want.length === 1) assert.equal(ont.find(ref, types, false), want[0], `find(${ref})`);
  else if (want.length === 0) assert.equal(ont.find(ref, types, false), undefined, `find(${ref})`);
  else {
    // Several matches: an error naming them, or (untyped only) the modeling element a lookup prefers.
    let got: OkbNode | undefined;
    try {
      got = ont.find(ref, types, false);
    } catch (e) {
      assert.match(String((e as Error).message), /more than one/);
      return;
    }
    assert.ok(!types && got && want.includes(got), `find(${ref}) returned something a scan did not find`);
  }
}

function everyName(ont: Ontology): string[] {
  return ont.nodes.map(nodeLabel).concat(["Nothing", "", "  ", "winery"]);
}

describe("name index", () => {
  it("finds by name, case and delimiter variants, and keeps ids first", () => {
    const ont = fresh();
    ops.addClass(ont, "RedWine");
    ops.addSlot(ont, "maker", { on: ["RedWine"], type: "String" });
    ops.addInstance(ont, "Chateau Margaux", { of: ["RedWine"] });
    for (const ref of ["RedWine", "red wine", "red_wine", "RED-WINE", "c.red-wine", "Chateau Margaux", "chateau-margaux", "maker"]) assert.ok(ont.find(ref, undefined, false), ref);
    assert.equal(ont.find("class:redwine").id, "c.red-wine");
    assert.equal(ont.find("instance:chateau margaux").type, "Instance");
    assert.throws(() => ont.find("class:maker"), /'maker' is a Slot, not a Class/);
    assert.throws(() => ont.find("maker", "Class"), /is a Slot, not a Class/);
    assert.throws(() => ont.find("RedWinee", "Class"), /Did you mean: RedWine/);
    for (const r of everyName(ont)) agree(ont, r);
  });

  it("keeps ambiguity behavior: same name across types", () => {
    const ont = fresh();
    ops.addClass(ont, "Grape");
    ops.addSlot(ont, "grape", { on: ["Grape"], type: "String", force: true });
    assert.equal(ont.find("grape", "Slot").type, "Slot");
    assert.equal(ont.find("grape", "Class").type, "Class");
    assert.equal(ont.find("grape").type, "Class", "untyped lookups prefer the class");
    ops.addInstance(ont, "Shiraz", { of: ["Grape"] });
    ops.addClass(ont, "Shiraz2");
    assert.throws(() => ont.find("class:nonesuch"), /No Class/);
  });

  it("resolves bare numbers to questions and decisions", () => {
    const ont = fresh();
    ops.addCQ(ont, "Which wines pair with fish?");
    ops.addCQ(ont, "Who makes this wine?");
    assert.equal(ont.find("2", "CompetencyQuestion").type, "CompetencyQuestion");
    assert.equal(ont.find("1", "CompetencyQuestion"), ont.numbered("CompetencyQuestion")[0]);
    assert.equal(ont.find("which wines pair with fish", "CompetencyQuestion").id, ont.numbered("CompetencyQuestion")[0].id);
    assert.equal(ont.find("cq:who makes this wine").id, ont.numbered("CompetencyQuestion")[1].id);
    assert.equal(ont.find("9", "CompetencyQuestion", false), undefined);
  });

  it("follows a rename, including the old name and a relationship slot", () => {
    const ont = fresh();
    ops.addClass(ont, "Wine");
    ops.addClass(ont, "Winery");
    ops.addSlot(ont, "producer", { on: ["Wine"], type: "Instance", range: ["Winery"] });
    ops.addInstance(ont, "Domaine", { of: ["Winery"] });
    ops.addInstance(ont, "Bottle", { of: ["Wine"], assignments: ["producer=Domaine"] });
    ops.rename(ont, "Wine", "Vintage");
    assert.equal(ont.find("Wine", "Class", false), undefined);
    assert.equal(ont.find("Vintage", "Class").id, "c.wine");
    ops.rename(ont, "producer", "maker");
    assert.equal(ont.find("producer", "Slot", false), undefined);
    assert.equal(ont.find("maker", "Slot").id, "s.producer");
    assert.equal(ont.rel.values(ont.find("Bottle").id, "s.producer").length, 1);
    ops.rename(ont, "Vintage", "Wine"); // a name that comes back
    assert.equal(ont.find("Wine", "Class").id, "c.wine");
    ops.setScope(ont, { name: "Cellar" });
    assert.equal(ont.find("Cellar", "Ontology").id, "ontology");
    assert.equal(ont.find("T", "Ontology", false), undefined);
    ops.addCQ(ont, "Old text?");
    ops.setCQ(ont, "old text", { text: "New text?" });
    assert.equal(ont.find("new text", "CompetencyQuestion").type, "CompetencyQuestion");
    assert.equal(ont.find("old text", "CompetencyQuestion", false), undefined);
    for (const r of everyName(ont).concat(["Vintage", "producer", "Wine"])) agree(ont, r);
  });

  it("keeps order when a rename joins a bucket that already has nodes", () => {
    const ont = fresh();
    ops.addClass(ont, "Alpha");
    ops.addSlot(ont, "beta", { on: ["Alpha"], type: "String", force: true });
    ops.addSlot(ont, "gamma", { on: ["Alpha"], type: "String", force: true });
    const ids = ont.ofType("Slot").map((s) => s.id);
    ops.rename(ont, "beta", "Alpha2", true);
    ops.rename(ont, "gamma", "alpha", true); // now collides with the class by key
    assert.equal(ont.find("alpha", "Class").id, "c.alpha");
    assert.equal(ont.find("alpha", "Slot").id, ids[1]);
    assert.equal(ont.find("alpha").type, "Class");
  });

  it("forgets removed nodes and still finds the rest", () => {
    const ont = fresh();
    for (const c of ["Aa", "Bb", "Cc"]) ops.addClass(ont, c);
    ops.addInstance(ont, "One", { of: ["Aa"] });
    ops.remove(ont, "Bb");
    assert.equal(ont.find("Bb", "Class", false), undefined);
    assert.equal(ont.find("Aa", "Class").id, "c.aa");
    assert.equal(ont.find("Cc", "Class").id, "c.cc");
    ops.remove(ont, "One");
    assert.equal(ont.find("one", "Instance", false), undefined);
    ops.addClass(ont, "Bb"); // the name is free again
    assert.equal(ont.find("Bb", "Class").id, "c.bb");
    for (const r of everyName(ont).concat(["Bb", "One"])) agree(ont, r);
  });

  it("agrees with a scan after loading from data with duplicate names", () => {
    const ont = Ontology.fromData([
      { type: "Ontology", id: "ontology", name: "T", domain: "", purpose: "", users: [], maintainers: [], outOfScope: [], kind: "application", reuseReviewed: false },
      { type: "Class", id: "c.a", name: "Thing" },
      { type: "Class", id: "c.b", name: "thing" },
      { type: "Term", id: "t.x", text: "Thing" },
      { type: "Slot", id: "s.a", name: "Thing", valueType: "String" },
    ], []);
    assert.throws(() => ont.find("thing", "Class"), /more than one/);
    assert.throws(() => ont.find("thing", ["Class", "Term"]), /more than one/);
    assert.equal(ont.find("thing", "Term").id, "t.x");
    assert.equal(ont.find("thing", "Slot").id, "s.a");
    assert.equal(ont.find("c.a").id, "c.a");
    for (const r of ["Thing", "thing", "THING"]) for (const t of [undefined, ["Class"], ["Term", "Slot"]] as (NodeType[] | undefined)[]) agree(ont, r, t);
  });
});
