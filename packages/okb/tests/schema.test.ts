import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, describe, it } from "node:test";
import { Ajv2020 } from "ajv/dist/2020.js";
import { parse } from "yaml";
import { buildSchemas, schemaText } from "../meta-kb/schema.ts";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SCHEMA_DIR = join(ROOT, "schema");
const CLI = join(ROOT, "src", "cli.ts");
const fmt = parse(readFileSync(join(ROOT, "meta-kb", "src", "format.yaml"), "utf8"));
const NODE_TYPE_NAMES: string[] = fmt.nodeTypes.map((n: any) => n.name);
const EDGE_TYPE_NAMES: string[] = fmt.edgeTypes.map((e: any) => e.name);
const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const lines = (path: string): any[] => readFileSync(path, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));

function validators() {
  const ajv = new Ajv2020({ strict: true, allowUnionTypes: true, allErrors: true });
  for (const f of readdirSync(SCHEMA_DIR)) ajv.addSchema(read(join(SCHEMA_DIR, f)));
  const get = (file: string) => ajv.getSchema(read(join(SCHEMA_DIR, file)).$id)!;
  return { manifest: get("okb.schema.json"), node: get("node.schema.json"), edge: get("edge.schema.json"), nodes: get("nodes.schema.json"), edges: get("edges.schema.json") };
}
const v = validators();

/** Every problem in an ontology folder, as readable strings. */
function problems(dir: string): string[] {
  const out: string[] = [];
  if (!v.manifest(read(join(dir, "okb.json")))) out.push(`okb.json: ${JSON.stringify(v.manifest.errors)}`);
  lines(join(dir, "nodes.jsonl")).forEach((n, i) => v.node(n) || out.push(`nodes.jsonl:${i + 1} (${n.type} ${n.id}): ${JSON.stringify(v.node.errors?.slice(0, 3))}`));
  lines(join(dir, "edges.jsonl")).forEach((e, i) => v.edge(e) || out.push(`edges.jsonl:${i + 1}: ${JSON.stringify(v.edge.errors?.slice(0, 3))}`));
  return out;
}

describe("relationship types that start with a digit", () => {
  it("are accepted, because relType() makes '24 Hour Support' into 24_HOUR_SUPPORT", async () => {
    const { relType } = await import("@ontology-kit/reader");
    const type = relType("24 Hour Support");
    assert.equal(type, "24_HOUR_SUPPORT");
    assert.ok(v.edge({ from: "c.a", type, to: "c.b" }), JSON.stringify(v.edge.errors));
    const slot = { id: "s.support", type: "Slot", name: "24 Hour Support", valueType: "Instance", relType: type };
    assert.ok(v.node(slot), JSON.stringify(v.node.errors));
    assert.equal(v.edge({ from: "c.a", type: "lower_case", to: "c.b" }), false);
  });
});

describe("JSON Schema for the file format", () => {
  it("is regenerated whenever format.yaml changes (run pnpm build:meta)", () => {
    const expected = buildSchemas(fmt);
    assert.deepEqual(readdirSync(SCHEMA_DIR).sort(), Object.keys(expected).sort());
    for (const [file, schema] of Object.entries(expected)) {
      assert.equal(readFileSync(join(SCHEMA_DIR, file), "utf8"), schemaText(schema), `${file} is out of date: run pnpm build:meta`);
    }
  });

  it("describes every node type in the registry and the manifest's format version", () => {
    assert.deepEqual(Object.keys(read(join(SCHEMA_DIR, "node.schema.json")).$defs).filter((k) => NODE_TYPE_NAMES.includes(k)), [...NODE_TYPE_NAMES]);
    assert.equal(read(join(SCHEMA_DIR, "okb.schema.json")).properties.format.const, fmt.version);
    assert.deepEqual(read(join(SCHEMA_DIR, "edge.schema.json")).properties.type.examples, [...EDGE_TYPE_NAMES]);
  });

  it("covers every property a node type is documented to have", () => {
    for (const nt of fmt.nodeTypes) {
      assert.ok(fmt.nodeProperties[nt.name], `format.yaml has no nodeProperties for ${nt.name}`);
      for (const r of nt.required) if (r !== "id") assert.ok(r in fmt.nodeProperties[nt.name], `${nt.name}.${r} is required but has no property shape`);
    }
  });

  for (const name of ["wine", "espresso"]) {
    it(`validates the ${name} example`, () => {
      assert.deepEqual(problems(join(ROOT, "examples", name)), []);
    });
  }

  it("validates a folder okb just wrote, with every node type and edge type in use", () => {
    const dir = mkdtempSync(join(tmpdir(), "okb-schema-"));
    after(() => rmSync(dir, { recursive: true, force: true }));
    const okb = (...args: string[]) => execFileSync(process.execPath, [CLI, "-C", join(dir, "kb"), ...args], { encoding: "utf8", cwd: dir, env: { ...process.env, SOURCE_DATE_EPOCH: "1790000000" } });
    execFileSync(process.execPath, [CLI, "init", join(dir, "kb"), "--name", "Schema Test"], { cwd: dir, env: { ...process.env, SOURCE_DATE_EPOCH: "1790000000" } });
    writeFileSync(join(dir, "guide.md"), "# Buttons\n\nButtons meet a 24px minimum touch target.\n\nUse a radio for 2 to 7 options.\n");
    okb("scope", "--domain", "UI", "--purpose", "Test", "--users", "a,b", "--maintainers", "x", "--out-of-scope", "y");
    okb("cq", "add", "Which buttons are large?");
    okb("reuse", "add", "--name", "Schema.org", "--url", "https://schema.org", "--decision", "reference");
    okb("term", "add", "button", "size");
    okb("class", "add", "Button", "--desc", "A control", "--synonym", "Btn");
    okb("class", "add", "Radio", "--parent", "Button");
    okb("class", "add", "Toggle", "--parent", "Button");
    okb("class", "disjoint", "Radio", "Toggle");
    okb("property", "add", "size", "--on", "Button", "--type", "Enumerated", "--values", "small,large", "--card", "single");
    okb("property", "add", "weight", "--on", "Button", "--type", "Integer");
    okb("relationship", "add", "preferredOver", "--from", "Button", "--to", "Button");
    okb("relationship", "property", "preferredOver", "condition", "--type", "String", "--required");
    okb("class", "default", "Button", "size=small");
    okb("class", "restrict", "Radio", "size", "--max", "1");
    okb("instance", "add", "Primary", "--of", "Radio", "size=large", "weight=3");
    okb("instance", "add", "Secondary", "--of", "Toggle");
    okb("source", "add", join(dir, "guide.md"));
    const src = (lines(join(dir, "kb", "nodes.jsonl")).find((n) => n.type === "Source") as any).id;
    okb("quote", "add", src, "Buttons meet a 24px minimum touch target.");
    const quote = (lines(join(dir, "kb", "nodes.jsonl")).find((n) => n.type === "SourceLocation") as any).id;
    okb("rule", "add", "--statement", "Buttons meet a 24px minimum touch target", "--modality", "MUST", "--governs", "Button", "--cites", quote, "--authored");
    okb("rule", "add", "--statement", "Buttons meet 24px in dense lists", "--modality", "SHOULD", "--governs", "Button", "--cites", quote, "--authored");
    const rules = lines(join(dir, "kb", "nodes.jsonl")).filter((n) => n.type === "Rule").map((n) => n.id);
    okb("rule", "refines", rules[1], rules[0], "--adds", "dense lists");
    okb("fulfills", "Primary", rules[0]);
    okb("verify", rules[0], "--status", "SUPPORTED");
    okb("link", "Primary", "preferredOver", "Secondary", "condition=2 to 7 options", "--rule", rules[0]);
    okb("decision", "add", "--title", "Radio first", "--decision", "Use radios", "--why", "Clarity", "--about", "Radio");
    const nodes = lines(join(dir, "kb", "nodes.jsonl"));
    const edges = lines(join(dir, "kb", "edges.jsonl"));
    const missing = NODE_TYPE_NAMES.filter((t) => !nodes.some((n) => n.type === t));
    assert.deepEqual(missing, [], "this fixture should use every node type");
    const unused = EDGE_TYPE_NAMES.filter((t) => !edges.some((e) => e.type === t));
    assert.deepEqual(unused.filter((t) => !["NEEDS", "BECAME", "RANGE", "INVERSE_OF"].includes(t)), [], "this fixture should use the edge types");
    assert.deepEqual(problems(join(dir, "kb")), []);
  });

  it("validates the older array layout", () => {
    const wine = join(ROOT, "examples", "wine");
    assert.ok(v.nodes(lines(join(wine, "nodes.jsonl"))));
    assert.ok(v.edges(lines(join(wine, "edges.jsonl"))));
  });

  it("rejects an unknown node type, a missing required property, a wrong value and a bad manifest", () => {
    assert.equal(v.node({ id: "x.1", type: "Gizmo", name: "x" }), false, "unknown type");
    assert.equal(v.node({ id: "c.a", type: "Class" }), false, "missing name");
    assert.equal(v.node({ id: "c.a", type: "Class", name: "A", abstract: "yes" }), false, "wrong value type");
    assert.equal(v.node({ id: "q.1", type: "CompetencyQuestion", text: "?", status: "done" }), false, "bad enum");
    assert.equal(v.node({ id: "c.a", type: "Class", name: "A", createdAt: "yesterday" }), false, "bad stamp");
    assert.equal(v.node({ id: "c.a", type: "Class", name: "A", note: "kept" }), true, "unknown keys are kept, not rejected");
    assert.equal(v.edge({ from: "a", type: "is_a", to: "b" }), false, "edge type not UPPER_SNAKE");
    assert.equal(v.edge({ from: "a", type: "IS_A" }), false, "edge without to");
    assert.equal(v.edge({ from: "a", type: "REFINES", to: "b", adds: 3 }), false, "reserved edge property of the wrong type");
    assert.equal(v.manifest({ format: "okb-lpg/9", currentStep: 1 }), false, "wrong format version");
    assert.equal(v.manifest({ $schema: "./x.json", format: fmt.version, currentStep: 3 }), true);
  });

  it("rejects a hand-edited example that uses an unknown node type", () => {
    const dir = mkdtempSync(join(tmpdir(), "okb-schema-bad-"));
    after(() => rmSync(dir, { recursive: true, force: true }));
    mkdirSync(dir, { recursive: true });
    const wine = join(ROOT, "examples", "wine");
    writeFileSync(join(dir, "okb.json"), readFileSync(join(wine, "okb.json")));
    writeFileSync(join(dir, "edges.jsonl"), readFileSync(join(wine, "edges.jsonl")));
    writeFileSync(join(dir, "nodes.jsonl"), readFileSync(join(wine, "nodes.jsonl"), "utf8") + '{"id":"g.1","type":"Gizmo","name":"Oops"}\n');
    const found = problems(dir);
    assert.equal(found.length, 1);
    assert.match(found[0], /Gizmo/);
  });
});
