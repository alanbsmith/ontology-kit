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
const only = (ont: Ontology, rule: string) => runChecks(ont, { all: true, only: [rule] }).findings;

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
    assert.equal(ont.rel.edge("c.button", ont.find("lessPreferredThan", "Slot").id, "c.segmented-control")!.condition, "capture 2 togglable states", "readable from the other end");
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

describe("export: rules", () => {
  /** A second rule, from another quote, left unverified. */
  async function withUnverified() {
    const ctx = await setup();
    const { ont } = ctx;
    await prov.addQuote(ont, "src.button", "Use Hyperlinks within a paragraph to navigate to another page.");
    const loc = ont.ofType("SourceLocation").find((l) => l.quote.startsWith("Use Hyperlinks"))!.id;
    prov.addRule(ont, { statement: "Use a Hyperlink instead of Button to navigate within a paragraph.", modality: "SHOULD", governs: ["Button"], cites: [loc] });
    const draft = ont.ofType("Rule").find((r) => r.id !== ctx.rule)!.id;
    ops.addClass(ont, "Hyperlink", { parents: ["Component"], description: "Hyperlink" });
    ops.link(ont, "Hyperlink", "preferredOver", "Button", { props: ["condition=navigating within a paragraph"], rule: draft });
    ops.link(ont, "Checkbox", "preferredOver", "Button", { props: ["condition=capture 2 togglable states"], rule: ctx.rule });
    return { ...ctx, draft };
  }
  const byLabel = (g: ReturnType<typeof exportGraph>, label: string) => g.nodes.filter((n) => n.labels.includes(label));

  it("exports verified rules with their quote and source, and what they govern", async () => {
    const { ont, rule } = await setup();
    ops.addInstance(ont, "Save button", { of: ["Button"] });
    ops.link(ont, "Checkbox", "preferredOver", "Button", { props: ["condition=capture 2 togglable states"], rule });
    const g = exportGraph(ont, { schema: true });
    const [r] = byLabel(g, "OkbRule");
    assert.equal(r.id, rule);
    assert.equal(r.properties.modality, "MAY");
    assert.equal(r.properties.verification, "SUPPORTED");
    assert.deepEqual(r.properties.governsClasses, ["Button"], "matchable against instance labels without the schema");
    const [loc] = byLabel(g, "OkbSourceLocation");
    assert.match(String(loc.properties.quote), /^Consider using checkbox/);
    assert.match(String(loc.properties.locator), /When to Use Something Else/);
    const [src] = byLabel(g, "OkbSource");
    const has = (type: string, from: string, to: string) => g.relationships.some((x) => x.type === type && x.from === from && x.to === to);
    assert.ok(has("CITES", rule, loc.id) && has("PART_OF", loc.id, src.id));
    assert.ok(has("GOVERNS", rule, "c.button"), "to the OkbClass node, with --with-schema");
    assert.match(toCypher(g), /CREATE \(:OkbRule \{okbId: "rule\./);
    assert.ok(!exportGraph(ont).relationships.some((x) => x.type === "GOVERNS"), "no class nodes to point at without the schema");
  });

  it("leaves every rule property pointing at an exported rule", async () => {
    const { ont } = await withUnverified();
    for (const opts of [{ schema: true }, { schema: true, unverified: true }, { schema: true, rules: false }]) {
      const g = exportGraph(ont, opts);
      const ids = new Set(g.nodes.map((n) => n.id));
      for (const r of g.relationships) {
        if (r.properties.rule !== undefined) assert.ok(ids.has(String(r.properties.rule)), `${JSON.stringify(opts)}: ${r.type} cites ${r.properties.rule}`);
      }
    }
  });

  it("holds back unverified rules, and the links that cite them, unless asked", async () => {
    const { ont, rule, draft } = await withUnverified();
    const g = exportGraph(ont, { schema: true });
    assert.deepEqual(byLabel(g, "OkbRule").map((n) => n.id), [rule]);
    const pref = g.relationships.filter((x) => x.type === "PREFERRED_OVER");
    assert.deepEqual(pref.map((x) => x.from), ["c.checkbox"], "the Hyperlink link rests on the unverified rule");
    assert.match(g.notes.join("\n"), /1 rule\(s\) haven't passed verification/);
    assert.match(g.notes.join("\n"), /1 link\(s\) cite a rule that hasn't passed verification/);

    const all = exportGraph(ont, { schema: true, unverified: true });
    const d = all.nodes.find((n) => n.id === draft)!;
    assert.equal(d.properties.verification, "UNVERIFIED");
    assert.equal(all.relationships.filter((x) => x.type === "PREFERRED_OVER").length, 2);
    assert.equal(byLabel(all, "OkbSource").length, 1, "two quotes from one document share its node");
    assert.equal(all.relationships.filter((x) => x.type === "PART_OF").length, 2);
  });

  it("--no-rules exports no provenance and strips rule references", async () => {
    const { ont } = await withUnverified();
    const g = exportGraph(ont, { schema: true, rules: false });
    assert.ok(!g.nodes.some((n) => n.labels.some((l) => l.startsWith("OkbRule") || l.startsWith("OkbSource"))));
    assert.ok(!g.relationships.some((x) => "rule" in x.properties));
    assert.equal(g.relationships.filter((x) => x.type === "PREFERRED_OVER").length, 1, "unverified-rule links stay out either way");
    assert.match(g.notes.join("\n"), /--no-rules/);
  });
});
