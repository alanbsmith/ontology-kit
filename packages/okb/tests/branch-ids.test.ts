// Ids that two branches can't both create (issue #91, okb-lpg/3).
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { Ontology, type OkbNode } from "@ontology-kit/reader";
import { runChecks } from "../src/checks.ts";
import * as ops from "../src/ops.ts";

const TAGGED = /^(cq|d)\.[0-9a-hjkmnp-tv-z]{6}$/;
let savedEpoch: string | undefined;
beforeEach(() => {
  savedEpoch = process.env.SOURCE_DATE_EPOCH;
  delete process.env.SOURCE_DATE_EPOCH; // real use: random tags
});
afterEach(() => {
  if (savedEpoch === undefined) delete process.env.SOURCE_DATE_EPOCH;
  else process.env.SOURCE_DATE_EPOCH = savedEpoch;
});

function base(): Ontology {
  const ont = Ontology.fromData([{ type: "Ontology", id: "ontology", name: "T" } as OkbNode], []);
  ops.setConventions(ont, {});
  ops.addClass(ont, "Wine", { description: "d" });
  ops.addCQ(ont, "Which wines are red?");
  ops.addDecision(ont, { title: "Base", decision: "d", about: ["Wine"] });
  return ont;
}

/** What a branch added: the nodes and edges that are not in the base. */
function added(branch: Ontology, from: Ontology) {
  const ids = new Set(from.nodes.map((n) => n.id));
  const key = (e: { from: string; type: string; to: string }) => `${e.from}|${e.type}|${e.to}`;
  const edges = new Set(from.edges.map(key));
  return { nodes: branch.nodes.filter((n) => !ids.has(n.id)), edges: branch.edges.filter((e) => !edges.has(key(e))) };
}

function branchFrom(root: Ontology, name: string): Ontology {
  const b = Ontology.fromData(structuredClone(root.nodes), structuredClone(root.edges));
  ops.addCQ(b, `Which wines does ${name} like?`);
  ops.addDecision(b, { title: `${name}'s choice`, decision: "d", about: ["Wine"] });
  ops.addInstance(b, "Margaux", { of: ["Wine"], description: name });
  ops.linkCQ(b, "2", ["Wine"]);
  return b;
}

describe("ids two branches can't both create", () => {
  it("a question, a decision and a same-named instance added on two branches merge into a valid ontology", () => {
    const root = base();
    const a = branchFrom(root, "Ann");
    const b = branchFrom(root, "Bo");
    const [da, db] = [added(a, root), added(b, root)];
    // What git does when each branch only appends: the union of both branches' additions.
    const merged = Ontology.fromData([...root.nodes, ...da.nodes, ...db.nodes], [...root.edges, ...da.edges, ...db.edges]);
    const ids = merged.nodes.map((n) => n.id);
    assert.equal(new Set(ids).size, ids.length, "no id appears twice");
    assert.equal(merged.ofType("CompetencyQuestion").length, 3);
    assert.equal(merged.ofType("DesignDecision").length, 3);
    assert.equal(merged.ofType("Instance").length, 2);
    const findings = runChecks(merged, { all: true }).findings.filter((f) => f.rule === "struct-well-formed");
    assert.deepEqual(findings, []);
    // The one thing left for a human is real: two people made an instance with the same name.
    // It is reported as a naming problem, not as a broken id or a link to the wrong node.
    const errors = runChecks(merged, { all: true }).findings.filter((f) => f.severity === "error");
    assert.deepEqual(errors.map((f) => f.rule), ["naming-unique"]);
    // Each branch's link still points at that branch's own question.
    const links = merged.edgesOf("NEEDS");
    assert.equal(links.length, 2);
    assert.notEqual(links[0].from, links[1].from);
  });

  it("new question and decision ids keep their prefix and add a tag, and instances add one to the slug", () => {
    const ont = base();
    const [q, d] = [ont.ofType("CompetencyQuestion")[0], ont.ofType("DesignDecision")[0]];
    assert.match(q.id, TAGGED);
    assert.match(d.id, TAGGED);
    const ids = [ont.newId("Instance", "Margaux")];
    ont.addNode({ type: "Instance", id: ids[0], name: "Margaux" });
    ids.push(ont.newId("Instance", "Margaux"));
    assert.equal(new Set(ids).size, 2);
    for (const id of ids) assert.match(id, /^i\.margaux-[0-9a-hjkmnp-tv-z]{6}$/);
  });

  it("classes and slots keep plain slug ids, with a tag instead of a counter on a clash", () => {
    const ont = base();
    assert.equal(ont.find("Wine", "Class").id, "c.wine");
    assert.match(ont.newId("Class", "Wine"), /^c\.wine-[0-9a-hjkmnp-tv-z]{6}$/);
  });

  it("short numbers still work: they are positions in okb cq list / okb decision list", () => {
    const ont = base();
    ops.addCQ(ont, "A second question?");
    const [q1, q2] = ont.ofType("CompetencyQuestion");
    assert.equal(ont.find("1", "CompetencyQuestion"), q1);
    assert.equal(ont.find("2", "CompetencyQuestion"), q2);
    assert.equal(ont.displayNumber(q2), 2);
    assert.equal(ont.find("1", "DesignDecision"), ont.ofType("DesignDecision")[0]);
    assert.throws(() => ont.find("3", "CompetencyQuestion"), /No CompetencyQuestion/);
  });

  it("with SOURCE_DATE_EPOCH set, the same steps give the same ids every run", () => {
    process.env.SOURCE_DATE_EPOCH = "1767225600";
    const run = () => {
      const o = base();
      const first = o.newId("Instance", "Margaux");
      o.addNode({ type: "Instance", id: first, name: "Margaux" });
      return [...o.nodes.map((n) => n.id), first, o.newId("Instance", "Margaux")];
    };
    assert.deepEqual(run(), run());
  });

  it("okb-lpg/2 folders load with every id unchanged, and only the version moves", () => {
    const dir = mkdtempSync(join(tmpdir(), "okb-v2-"));
    const nodes = [
      { type: "Ontology", id: "ontology", name: "T" },
      { type: "CompetencyQuestion", id: "cq.1", text: "Q one?" },
      { type: "CompetencyQuestion", id: "cq.3", text: "Q three?" },
      { type: "DesignDecision", id: "d.1", title: "t", decision: "d" },
      { type: "Instance", id: "i.margaux-2", name: "Margaux" },
    ];
    writeFileSync(join(dir, "okb.json"), JSON.stringify({ format: "okb-lpg/2", currentStep: 3 }));
    writeFileSync(join(dir, "nodes.json"), JSON.stringify(nodes));
    const ont = Ontology.load(dir);
    assert.equal(ont.manifest.format, "okb-lpg/3");
    assert.deepEqual(ont.nodes.map((n) => n.id), nodes.map((n) => n.id));
    assert.equal(ont.find("3", "CompetencyQuestion").id, "cq.3", "an old id keeps answering to its number");
    assert.equal(ont.find("1", "DesignDecision").id, "d.1");
  });
});
