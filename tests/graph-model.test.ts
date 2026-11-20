// The graph explorer's model (site/src/graph/model.ts) and its data names (site/src/graph/data.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ancestors, buildGraph, defaultTypes, descendants, diffSteps, focusGraph, findNode, linksOf, neighborhood, subgraph, typesIn, type RawGraph } from "../site/src/graph/model.ts";
import { graphNames, loadGraph } from "../site/src/graph/data.ts";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const espresso = loadGraph(ROOT, "espresso");

const raw: RawGraph = {
  nodes: [
    { id: "c.drink", type: "Class", name: "Drink", description: "Any drink." },
    { id: "c.milk", type: "Class", name: "MilkDrink" },
    { id: "c.latte", type: "Class", name: "Latte" },
    { id: "i.mine", type: "Instance", name: "My latte", values: { "s.size": 12 } },
    { id: "s.size", type: "Slot", name: "sizeOz", valueType: "Integer" },
    { id: "t.milk", type: "Term", text: "milk" },
  ],
  edges: [
    { from: "c.milk", type: "IS_A", to: "c.drink" },
    { from: "c.latte", type: "IS_A", to: "c.milk" },
    { from: "i.mine", type: "INSTANCE_OF", to: "c.latte" },
    { from: "i.mine", type: "INSTANCE_OF", to: "c.latte" },
    { from: "c.drink", type: "HAS_SLOT", to: "s.size" },
    { from: "t.milk", type: "BECAME", to: "c.milk" },
  ],
};

test("graph model: opens on classes and instances, or on concepts and steps for the meta-KB", () => {
  assert.deepEqual(defaultTypes(raw), ["Class", "Instance"]);
  assert.deepEqual(defaultTypes(loadGraph(ROOT, "meta-kb")), ["Concept", "Step"]);
  assert.deepEqual(typesIn(raw)[0], ["Class", 3]);
});

test("graph model: a view keeps only the chosen types, drops dangling and duplicate edges, and reads labels", () => {
  const g = buildGraph(raw, ["Class", "Instance"]);
  assert.deepEqual(g.nodes.map((n) => n.label), ["Drink", "MilkDrink", "Latte", "My latte"]);
  assert.equal(g.edges.length, 3, "the duplicate and the edges to hidden nodes are gone");
  assert.equal(g.nodes[0].shape, "ring");
  assert.equal(g.nodes[3].shape, "dot");
  assert.equal(g.edges[2].label, "instance of");
  const withSlots = buildGraph(raw, ["Class", "Instance", "Slot", "Term"]);
  assert.equal(withSlots.edges.length, 5);
  assert.equal(withSlots.nodes.find((n) => n.id === "t.milk")?.label, "milk");
});

test("graph model: instance values are shown by slot name, and a node's own words come first", () => {
  const g = buildGraph(raw, ["Class", "Instance", "Slot"]);
  assert.deepEqual(g.nodes.find((n) => n.id === "i.mine")?.facts, [["sizeOz", "12"]]);
  assert.equal(g.nodes.find((n) => n.id === "c.drink")?.about, "Any drink.");
  assert.deepEqual(g.nodes.find((n) => n.id === "s.size")?.facts, [["Value type", "Integer"]]);
});

test("graph model: ancestors and descendants follow is-a and instance-of only", () => {
  const g = buildGraph(raw, ["Class", "Instance", "Slot", "Term"]);
  assert.deepEqual([...ancestors(g, "i.mine")], ["c.latte", "c.milk", "c.drink"]);
  assert.deepEqual([...descendants(g, "c.drink")].sort(), ["c.latte", "c.milk", "i.mine"]);
  assert.deepEqual([...ancestors(g, "c.drink")], []);
  assert.ok(!descendants(g, "c.drink").has("t.milk"), "BECAME is not a kind-of link");
});

test("graph model: neighborhoods grow by depth in either direction", () => {
  const g = buildGraph(raw, ["Class", "Instance"]);
  assert.deepEqual([...neighborhood(g, ["c.latte"], 0)], ["c.latte"]);
  assert.deepEqual([...neighborhood(g, ["c.latte"], 1)].sort(), ["c.latte", "c.milk", "i.mine"]);
  assert.equal(neighborhood(g, ["c.latte"], 2).size, 4);
  assert.equal(neighborhood(g, ["nope"], 2).size, 0);
});

test("graph model: a focus keeps the node, what it touches and the kinds above it, and reports misses", () => {
  const g = buildGraph(raw, ["Class", "Instance"]);
  const { graph, missing } = focusGraph(g, ["my latte", "Cappuccino"], 1);
  assert.deepEqual(missing, ["Cappuccino"]);
  assert.deepEqual(graph.nodes.map((n) => n.id).sort(), ["c.drink", "c.latte", "c.milk", "i.mine"]);
  assert.equal(focusGraph(g, ["Nothing"]).graph, g, "with no match, the whole graph is kept");
  assert.equal(findNode(g, "c.drink")?.label, "Drink");
});

test("graph model: links of a node read outward first, then inward", () => {
  const g = buildGraph(raw, ["Class", "Instance"]);
  assert.deepEqual(linksOf(g, "c.latte").map((l) => `${l.relation} ${l.label}`), ["is a MilkDrink", "← instance of My latte"]);
  assert.equal(subgraph(g, new Set(["c.latte"])).edges.length, 0);
});

test("graph model: the step diff lists added, removed and changed nodes", () => {
  const before: RawGraph = { nodes: [{ id: "a", type: "Class", name: "A" }, { id: "b", type: "Class", name: "B" }], edges: [] };
  const after: RawGraph = { nodes: [{ id: "a", type: "Class", name: "A", description: "now described" }, { id: "c", type: "Class", name: "C" }], edges: [] };
  assert.deepEqual(diffSteps(before, after), { added: ["c"], removed: ["b"], changed: ["a"] });
});

test("graph data: every name loads, and the wine tutorial's steps grow from step to step", () => {
  const names = graphNames(ROOT);
  for (const expected of ["espresso", "wine", "meta-kb", "wine-step-1", "wine-step-8"]) assert.ok(names.includes(expected), expected);
  for (const name of names) {
    const g = loadGraph(ROOT, name);
    assert.ok(g.nodes.length > 0 && Array.isArray(g.edges), name);
  }
  const d = diffSteps(loadGraph(ROOT, "wine-step-3"), loadGraph(ROOT, "wine-step-4"));
  assert.ok(d.added.length > 0, "step 4 adds the classes");
  assert.throws(() => loadGraph(ROOT, "nope"), /No graph named/);
});

test("graph model: the espresso and meta-KB views are drawable sizes", () => {
  const g = buildGraph(espresso, defaultTypes(espresso));
  assert.equal(g.nodes.length, 47);
  const meta = buildGraph(loadGraph(ROOT, "meta-kb"), defaultTypes(loadGraph(ROOT, "meta-kb")));
  assert.ok(meta.nodes.length < 80, "the meta-KB never opens as the full hairball");
  const nodes = JSON.parse(readFileSync(join(ROOT, "meta-kb/data/nodes.json"), "utf8")) as unknown[];
  assert.ok(nodes.length > 300);
});
