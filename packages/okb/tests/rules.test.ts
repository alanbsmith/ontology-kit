/** Authored rules, qualifier values on rules, REFINES, FULFILLS and okb cite. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { runChecks } from "../src/checks.ts";
import { exportGraph } from "../src/export.ts";
import { Ontology } from "@ontology-kit/format";
import * as ops from "../src/ops.ts";
import * as prov from "../src/provenance.ts";
import { show } from "../src/render.ts";

const FIXTURE = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "button.md");
const CLI = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "cli.ts");
const Q1 = "Consider using checkbox, switch, or segmented control when a component is needed that can capture 2 togglable states.";
const Q2 = "Use Hyperlinks within a paragraph to navigate to another page.";

async function setup() {
  const dir = mkdtempSync(join(tmpdir(), "okb-rules-"));
  const ont = ops.createOntology(dir, "Components");
  ops.setConventions(ont, {});
  ops.addClass(ont, "Behavior", { description: "What one component does." });
  ops.addSlot(ont, "condition", { on: ["Behavior"], onRules: true, type: "Enumerated", values: ["open", "disabled"], description: "State of the governed node." });
  ops.addSlot(ont, "inputModality", { on: ["Behavior"], onRules: true, type: "Enumerated", values: ["touch", "mouse", "keyboard"], card: "multiple", description: "Input device." });
  mkdirSync(join(dir, "docs"));
  copyFileSync(FIXTURE, join(dir, "docs", "button.md"));
  prov.addSource(ont, join(dir, "docs", "button.md"), {});
  await prov.addQuote(ont, "src.button", Q1);
  await prov.addQuote(ont, "src.button", Q2);
  const [l1, l2] = ont.ofType("SourceLocation").map((l) => l.id);
  return { ont, dir, l1, l2 };
}
const errors = (ont: Ontology) => runChecks(ont, { all: true }).findings.filter((f) => f.severity === "error" && f.rule !== "prov-verified");

describe("authored rules", () => {
  it("sets authored and extracted:false, still needs a quote, and keeps both provenance checks", async () => {
    const { ont, l1 } = await setup();
    assert.throws(() => prov.addRule(ont, { statement: "Be keyboard operable.", modality: "MUST", authored: true }), /Quote first/);
    prov.addRule(ont, { statement: "Be keyboard operable.", modality: "MUST", authored: true, cites: [l1] });
    const r = ont.ofType("Rule")[0];
    assert.equal(r.authored, true);
    assert.equal(r.extracted, false);
    assert.ok(runChecks(ont, { all: true, only: ["prov-verified"] }).findings.some((f) => /written by the owner/.test(f.message)), "no exemption");
    prov.verify(ont, r.id, { status: "SUPPORTED" });
    assert.deepEqual(errors(ont), []);
    assert.equal(exportGraph(ont).nodes.find((n) => n.id === r.id)!.properties.authored, true);
    assert.match(show(ont, r), /authored/);
  });

  it("stays authored when a quote is attached later", async () => {
    const { ont, l1, l2 } = await setup();
    prov.addRule(ont, { statement: "Be keyboard operable.", modality: "MUST", authored: true, cites: [l1] });
    const r = ont.ofType("Rule")[0];
    prov.cite(ont, r.id, l2);
    assert.equal(r.extracted, false);
  });

  it("exports authored:false for extracted rules", async () => {
    const { ont, l1 } = await setup();
    prov.addRule(ont, { statement: "Consider a checkbox.", modality: "MAY", cites: [l1] });
    prov.verify(ont, ont.ofType("Rule")[0].id, { status: "SUPPORTED" });
    assert.equal(exportGraph(ont).nodes.find((n) => n.labels.includes("OkbRule"))!.properties.authored, false);
  });
});

describe("qualifier values on rules", () => {
  it("are set on add, validated like instance values, and exported", async () => {
    const { ont, l1 } = await setup();
    prov.addRule(ont, { statement: "Menus close on Escape.", modality: "MUST", cites: [l1], values: ["condition=open", "inputModality=keyboard,mouse"] });
    const r = ont.ofType("Rule")[0];
    prov.verify(ont, r.id, { status: "SUPPORTED" });
    assert.deepEqual(r.values, { [ont.find("condition", "Slot").id]: "open", [ont.find("inputModality", "Slot").id]: ["keyboard", "mouse"] });
    assert.deepEqual(errors(ont), []);
    const props = exportGraph(ont).nodes.find((n) => n.id === r.id)!.properties;
    assert.equal(props.condition, "open");
    assert.deepEqual(props.inputModality, ["keyboard", "mouse"]);
    assert.match(show(ont, r), /condition\s+open/);
  });

  it("reject values outside the allowed set, and slots that don't apply to rules", async () => {
    const { ont, l1 } = await setup();
    assert.throws(() => prov.addRule(ont, { statement: "x y z.", modality: "MUST", cites: [l1], values: ["condition=sleeping"] }), /must be one of/);
    ops.addSlot(ont, "color", { on: ["Behavior"], type: "String", description: "Color." });
    assert.throws(() => prov.addRule(ont, { statement: "x y z.", modality: "MUST", cites: [l1], values: ["color=red"] }), /okb slot set color --on-rules/);
  });

  it("belong to rules alone when the slot is only declared on rules, and are refused on instances", async () => {
    const { ont, l1 } = await setup();
    ops.addSlot(ont, "scope", { onRules: true, type: "String", description: "Where the rule applies." });
    prov.addRule(ont, { statement: "Menus close on Escape.", modality: "MUST", cites: [l1], values: ["scope=menus"] });
    assert.throws(() => ops.addInstance(ont, "Menu", { of: ["Behavior"], assignments: ["scope=menus"] }), /isn't a slot of Menu \(attached to: Rules\)/);
    assert.ok(!errors(ont).some((f) => f.rule === "slot-value-slot-applies"));
  });

  it("can't be relationships, and every rule needs a required one", async () => {
    const { ont, l1 } = await setup();
    ops.addSlot(ont, "owner", { type: "Instance", on: ["Behavior"], range: ["Behavior"], description: "Owner." });
    assert.throws(() => ops.updateSlot(ont, "owner", { onRules: true }), /must be properties/);
    ops.addSlot(ont, "area", { onRules: true, type: "String", min: 1, description: "Area." });
    prov.addRule(ont, { statement: "Menus close on Escape.", modality: "MUST", cites: [l1] });
    assert.ok(errors(ont).some((f) => f.rule === "slot-values-respect-facets" && /at least 1 required/.test(f.message)));
  });

  it("are not inherited through REFINES: each rule states its own", async () => {
    const { ont, l1, l2 } = await setup();
    prov.addRule(ont, { statement: "Be keyboard operable.", modality: "MUST", cites: [l1], name: "broad", values: ["condition=open"] });
    prov.addRule(ont, { statement: "Menus move focus with arrow keys.", modality: "MUST", cites: [l2], name: "narrow", refines: ["rule.broad"] });
    const cond = ont.find("condition", "Slot").id;
    assert.deepEqual(ont.statedValues("rule.narrow", cond), []);
    for (const r of ont.ofType("Rule")) prov.verify(ont, r.id, { status: "SUPPORTED" });
    const byId = (id: string) => exportGraph(ont).nodes.find((n) => n.id === id)!.properties;
    assert.equal(byId("rule.broad").condition, "open");
    assert.ok(!("condition" in byId("rule.narrow")));
  });

  it("are flagged when a hand edit breaks them", async () => {
    const { ont, l1 } = await setup();
    prov.addRule(ont, { statement: "Menus close on Escape.", modality: "MUST", cites: [l1], values: ["condition=open"] });
    const r = ont.ofType("Rule")[0];
    r.values![ont.find("condition", "Slot").id] = "sleeping";
    r.values!["s.nope"] = "x";
    const rules = runChecks(ont, { all: true }).findings.map((f) => f.rule);
    assert.ok(rules.includes("slot-values-respect-facets") && rules.includes("slot-value-slot-applies"));
  });
});

describe("REFINES and FULFILLS", () => {
  async function pair() {
    const ctx = await setup();
    const { ont, l1, l2 } = ctx;
    prov.addRule(ont, { statement: "Be keyboard operable.", modality: "MUST", authored: true, cites: [l1], name: "broad" });
    prov.addRule(ont, { statement: "Menus move focus with arrow keys.", modality: "MUST", cites: [l2], name: "narrow", refines: ["rule.broad"], adds: "arrow keys" });
    for (const r of ont.ofType("Rule")) prov.verify(ont, r.id, { status: "SUPPORTED" });
    ops.addInstance(ont, "Menu arrows", { of: ["Behavior"], assignments: ["condition=open"] });
    prov.fulfill(ont, "Menu arrows", "rule.narrow");
    prov.fulfill(ont, "Menu arrows", "rule.broad");
    return ctx;
  }

  it("validate and survive export, with adds", async () => {
    const { ont } = await pair();
    assert.deepEqual(errors(ont), []);
    const edge = ont.edgesOf("REFINES")[0];
    assert.equal(edge.adds, "arrow keys");
    const g = exportGraph(ont);
    assert.deepEqual(g.relationships.find((r) => r.type === "REFINES"), { type: "REFINES", from: "rule.narrow", to: "rule.broad", properties: { adds: "arrow keys" } });
    assert.equal(g.relationships.filter((r) => r.type === "FULFILLS").length, 2);
    assert.match(show(ont, ont.find("rule.broad", "Rule")), /refined by\s+narrow/);
  });

  it("hold back edges to rules that aren't exported", async () => {
    const { ont } = await pair();
    ont.find("rule.broad", "Rule").verification = undefined;
    const types = exportGraph(ont).relationships.map((r) => `${r.type}:${r.to}`);
    assert.ok(!types.includes("REFINES:rule.broad") && !types.includes("FULFILLS:rule.broad") && types.includes("FULFILLS:rule.narrow"));
  });

  it("update adds when refining again, without a second edge", async () => {
    const { ont } = await pair();
    prov.refine(ont, "rule.narrow", "rule.broad", { adds: "arrow keys and Home/End" });
    assert.deepEqual(ont.edgesOf("REFINES").map((e) => e.adds), ["arrow keys and Home/End"]);
    prov.refine(ont, "rule.narrow", "rule.broad");
    assert.equal(ont.edgesOf("REFINES")[0].adds, "arrow keys and Home/End", "kept when --adds is omitted");
  });

  it("refuse self and circular refinement, and can be removed", async () => {
    const { ont } = await pair();
    assert.throws(() => prov.refine(ont, "rule.broad", "rule.broad"), /itself/);
    assert.throws(() => prov.refine(ont, "rule.broad", "rule.narrow"), /cycle/);
    prov.refine(ont, "rule.narrow", "rule.broad", { remove: true });
    assert.equal(ont.edgesOf("REFINES").length, 0);
    prov.fulfill(ont, "Menu arrows", "rule.broad", { remove: true });
    assert.equal(ont.edgesOf("FULFILLS").length, 1);
  });

  it("are checked for direction and property type by struct-well-formed", async () => {
    const { ont } = await pair();
    ont.addEdge("rule.broad", "FULFILLS", "rule.narrow");
    ont.edgesOf("REFINES")[0].adds = 7;
    const msgs = runChecks(ont, { all: true, only: ["struct-well-formed"] }).findings.map((f) => f.message).join("\n");
    assert.match(msgs, /FULFILLS must go Instance → Rule/);
    assert.match(msgs, /'adds'.*must be text/);
  });
});

describe("okb cite", () => {
  it("attaches an existing quote to a node, once", async () => {
    const { ont, l1, l2 } = await setup();
    ops.addClass(ont, "Switch", { description: "A switch." });
    await prov.addQuote(ont, "src.button", Q2, { cites: ["Switch"] });
    const [first] = prov.cite(ont, "Switch", l1);
    assert.match(first, /now cites/);
    assert.match(prov.cite(ont, "Switch", l1)[0], /already cited/);
    assert.equal(ont.targets(ont.find("Switch", "Class").id, "CITES").length, 2, "one edge per quote");
    assert.throws(() => prov.cite(ont, "Switch", "loc.nope"), /nope/);
    assert.throws(() => prov.cite(ont, "src.button", l2), /No Class or Slot or Instance or Rule or DesignDecision/);
  });

  it("runs the whole workflow from the command line", async () => {
    const { dir, l1, l2 } = await setup().then(async (c) => { c.ont.save(); return c; });
    const okb = (...a: string[]) => execFileSync("node", [CLI, "-C", dir, ...a], { encoding: "utf8" });
    okb("slot", "add", "severity", "--on-rules", "--type", "Enumerated", "--values", "high,low");
    okb("rule", "add", "--statement", "Be keyboard operable.", "--modality", "MUST", "--authored", "--cites", l1, "--name", "broad", "--value", "condition=open", "--value", "severity=high");
    okb("rule", "add", "--statement", "Menus move focus with arrow keys.", "--modality", "MUST", "--cites", l2, "--name", "narrow", "--refines", "rule.broad", "--adds", "arrow keys");
    okb("instance", "add", "Menu arrows", "--of", "Behavior");
    okb("fulfills", "Menu arrows", "rule.broad");
    okb("cite", "rule.narrow", l1);
    for (const r of ["rule.broad", "rule.narrow"]) okb("verify", r, "--status", "SUPPORTED");
    assert.match(okb("rule", "list"), /authored/);
    assert.match(okb("validate", "--all"), /0 error/);
    const g = JSON.parse(okb("export", "--format", "json"));
    assert.deepEqual(g.relationships.map((r: any) => r.type).sort(), ["CITES", "CITES", "CITES", "FULFILLS", "PART_OF", "PART_OF", "REFINES"]);
    assert.equal(g.nodes.find((n: any) => n.id === "rule.broad").properties.condition, "open");
    assert.equal(g.nodes.find((n: any) => n.id === "rule.broad").properties.severity, "high");
  });
});
