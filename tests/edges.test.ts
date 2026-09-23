/**
 * Relationship edge properties, using a real "When to Use Something Else" line from
 * the Button doc: checkbox / switch / segmented control are preferred over Button
 * "when a component is needed that can capture 2 togglable states".
 */
import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { runChecks } from "../src/checks.ts";
import { exportGraph, toCypher } from "../src/export.ts";
import { Ontology } from "../src/model.ts";
import * as ops from "../src/ops.ts";
import * as prov from "../src/provenance.ts";
import { show } from "../src/render.ts";

const FIXTURE = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "button.md");

async function setup() {
  const dir = mkdtempSync(join(tmpdir(), "okb-edge-"));
  const ont = Ontology.create(dir, "Components");
  ops.setConventions(ont, {});
  ops.addClass(ont, "Component", { description: "A Canvas Kit component.", abstract: true });
  for (const c of ["Button", "Checkbox", "Switch", "SegmentedControl"]) ops.addClass(ont, c, { parents: ["Component"], description: c });
  ops.addSlot(ont, "preferredOver", { on: ["Component"], type: "Instance", range: ["Component"], card: "multiple", description: "Use this component instead of the other one, under a condition." });
  ops.declareEdgeProperty(ont, "preferredOver", "condition", { type: "String", required: true });
  ops.declareEdgeProperty(ont, "preferredOver", "strength", { type: "Enumerated", values: ["consider", "should"] });
  mkdirSync(join(dir, "docs"));
  copyFileSync(FIXTURE, join(dir, "docs", "button.md"));
  prov.addSource(ont, join(dir, "docs", "button.md"), {});
  await prov.addQuote(ont, "src.button", "Consider using checkbox, switch, or segmented control when a component is needed that can capture 2 togglable states.");
  prov.addRule(ont, { statement: "Consider Checkbox, Switch or Segmented Control instead of Button when a component must capture 2 togglable states.", modality: "MAY", governs: ["Button"], cites: [ont.ofType("SourceLocation")[0].id] });
  const rule = ont.ofType("Rule")[0].id;
  prov.verify(ont, rule, { status: "SUPPORTED" });
  return { ont, rule };
}
const only = (ont: Ontology, rule: string) => runChecks(ont, { all: true, only: [rule] });

describe("edge properties", () => {
  it("stores the condition and rule on the one edge, and shows them", async () => {
    const { ont, rule } = await setup();
    ops.link(ont, "Checkbox", "preferredOver", "Button", { props: ["condition=capture 2 togglable states", "strength=consider"], rule });
    const e = ont.edgesOf("PREFERRED_OVER")[0];
    assert.deepEqual(
      { from: e.from, to: e.to, condition: e.condition, strength: e.strength, rule: e.rule },
      { from: "c.checkbox", to: "c.button", condition: "capture 2 togglable states", strength: "consider", rule },
    );
    assert.deepEqual(only(ont, "slot-edge-properties"), []);
    assert.match(show(ont, ont.find("Checkbox", "Class")), /Button \{condition: "capture 2 togglable states", strength: "consider", rule: "rule\./);
  });

  it("updating a link merges properties into the same edge", async () => {
    const { ont } = await setup();
    ops.link(ont, "Switch", "preferredOver", "Button", { props: ["condition=2 togglable states"] });
    ops.link(ont, "Switch", "preferredOver", "Button", { props: ["strength=should"] });
    assert.equal(ont.edgesOf("PREFERRED_OVER").length, 1);
    assert.equal(ont.edgesOf("PREFERRED_OVER")[0].condition, "2 togglable states");
  });

  it("checks values when written and when validating", async () => {
    const { ont } = await setup();
    assert.throws(() => ops.link(ont, "Switch", "preferredOver", "Button", { props: ["strength=must"] }), /must be one of consider, should/);
    assert.throws(() => ops.link(ont, "Switch", "preferredOver", "Button", { props: ["audience=dense"] }), /no edge property 'audience'/);
    const notes = ops.link(ont, "Switch", "preferredOver", "Button");
    assert.match(notes.join("\n"), /Still required on this edge: condition/);
    const e = ont.edgesOf("PREFERRED_OVER")[0];
    e.audince = "dense"; // hand-edit typo
    e.rule = "rule.missing";
    const msgs = only(ont, "slot-edge-properties").map((f) => `${f.severity}: ${f.message}`).join("\n");
    assert.match(msgs, /error: .*missing required edge property 'condition'/);
    assert.match(msgs, /warning: .*undeclared edge property 'audince'/);
    assert.match(msgs, /error: .*rule 'rule\.missing', which isn't a Rule node/);
  });

  it("keeps edge properties through rename, inverse and export", async () => {
    const { ont, rule } = await setup();
    ops.link(ont, "SegmentedControl", "preferredOver", "Button", { props: ["condition=capture 2 togglable states"], rule });
    ops.rename(ont, "preferredOver", "recommendedOver");
    assert.equal(ont.edgesOf("RECOMMENDED_OVER")[0].condition, "capture 2 togglable states");
    ops.addSlot(ont, "lessPreferredThan", { on: ["Component"], type: "Instance", range: ["Component"], card: "multiple", description: "inverse" });
    ops.inverse(ont, "recommendedOver", "lessPreferredThan");
    assert.equal(ont.linkEdge("c.button", ont.find("lessPreferredThan", "Slot").id, "c.segmented-control")!.condition, "capture 2 togglable states", "readable from the other end");
    const g = exportGraph(ont, { schema: true });
    const r = g.relationships.find((x) => x.type === "RECOMMENDED_OVER")!;
    assert.equal(r.properties.condition, "capture 2 togglable states");
    assert.equal(r.properties.rule, rule);
    assert.match(toCypher(g), /\[:RECOMMENDED_OVER \{condition: "capture 2 togglable states", rule: "rule\.[^"]+", classLevel: true\}\]/);
  });

  it("carries edge properties onto inherited instance links in export", async () => {
    const { ont } = await setup();
    ops.addClass(ont, "Icon", { description: "An icon." });
    ops.addSlot(ont, "defaultIcon", { on: ["Component"], type: "Instance", range: ["Icon"], card: "single", description: "d" });
    ops.declareEdgeProperty(ont, "defaultIcon", "position", { type: "Enumerated", values: ["start", "end"] });
    ops.addInstance(ont, "plusIcon", { of: ["Icon"] });
    ops.link(ont, "Button", "defaultIcon", "plusIcon", { props: ["position=start"] });
    ops.addInstance(ont, "Save button", { of: ["Button"] });
    const g = exportGraph(ont);
    const r = g.relationships.find((x) => x.type === "DEFAULT_ICON")!;
    assert.deepEqual(r.properties, { position: "start", inheritedFrom: "Button" });
  });
});
