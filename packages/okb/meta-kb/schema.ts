/**
 * Build the JSON Schema files for the okb file format from src/format.yaml (the one source):
 *
 *   okb.schema.json    okb.json, the manifest
 *   node.schema.json   one line of nodes.jsonl (also one element of the nodes.json array of older folders)
 *   edge.schema.json   one line of edges.jsonl (also one element of the edges.json array)
 *   nodes.schema.json  the older nodes.json file: an array of node lines
 *   edges.schema.json  the older edges.json file: an array of edge lines
 *
 * meta-kb/build.ts writes them to packages/okb/schema/ (committed, shipped in the package), and
 * tests/schema.test.ts fails when the committed files differ from what this returns.
 */
const SITE = "https://ontology-kit.dev/schema";
const DRAFT = "https://json-schema.org/draft/2020-12/schema";
const STAMP = { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$", description: "UTC to the second, e.g. 2026-11-21T14:03:22Z. Missing means unknown." };

export type SchemaFiles = Record<string, unknown>;

export function buildSchemas(fmt: any): SchemaFiles {
  const version: string = fmt.version;
  const dir = version.replace("/", "-"); // okb-lpg-3
  const id = (file: string) => `${SITE}/${dir}/${file}`;
  const defs = fmt.definitions ?? {};
  const nodeProps: Record<string, any> = fmt.nodeProperties ?? {};

  const nodeDef = (nt: any) => {
    const { $extracted, ...own } = nodeProps[nt.name] ?? {};
    const properties = {
      id: { type: "string", minLength: 1 },
      type: { const: nt.name },
      createdAt: STAMP,
      updatedAt: STAMP,
      ...($extracted ? defs.Extracted : {}),
      ...own,
    };
    return { title: nt.name, description: nt.description, type: "object", required: [...new Set(["id", "type", ...(nt.required ?? [])])], properties };
  };
  const nodeDefs = Object.fromEntries(fmt.nodeTypes.map((nt: any) => [nt.name, nodeDef(nt)]));
  const { Extracted: _e, ...sharedDefs } = defs;

  const node = {
    $schema: DRAFT,
    $id: id("node.schema.json"),
    title: `An okb node (${version}): one line of nodes.jsonl`,
    description: "Which keys a node may have depends on its type. Keys not listed are allowed (okb keeps them). Whether an edge's ends exist, ids are unique and the ontology follows the rules is checked by `okb validate`, not by this schema.",
    oneOf: fmt.nodeTypes.map((nt: any) => ({ $ref: `#/$defs/${nt.name}` })),
    $defs: { ...sharedDefs, ...nodeDefs },
  };

  const reserved = fmt.reservedEdgeProperties ?? {};
  const edge = {
    $schema: DRAFT,
    $id: id("edge.schema.json"),
    title: `An okb edge (${version}): one line of edges.jsonl`,
    description: "An edge is {from, type, to} plus optional properties. The type is one of the reserved types below or the relType of a relationship slot (UPPER_SNAKE case). Whether the ends exist and have the right node types is checked by `okb validate`.",
    type: "object",
    required: ["from", "type", "to"],
    properties: {
      from: { type: "string", minLength: 1 },
      type: { type: "string", pattern: "^[A-Z0-9][A-Z0-9_]*$", examples: fmt.edgeTypes.map((e: any) => e.name) },
      to: { type: "string", minLength: 1 },
      ...reserved,
    },
    allOf: fmt.edgeTypes
      .filter((e: any) => e.optionalProps?.length || e.props?.length)
      .map((e: any) => ({
        if: { properties: { type: { const: e.name } }, required: ["type"] },
        then: { properties: Object.fromEntries([...(e.props ?? []), ...(e.optionalProps ?? [])].map((p: string) => [p, { type: "string" }])), required: e.props ?? [] },
      })),
  };

  const manifest = {
    $schema: DRAFT,
    $id: id("okb.schema.json"),
    title: `An okb manifest (${version}): okb.json`,
    type: "object",
    required: ["format", "currentStep"],
    properties: {
      $schema: { type: "string", description: "Optional pointer for editors; okb ignores it." },
      format: { const: version },
      currentStep: { type: "integer", minimum: 1, maximum: 8 },
      name: { type: "string" },
      created: { type: "string" },
      metaKbVersion: { type: "string" },
      version: { type: "string", description: "The knowledge base's release version, set by okb release." },
      okbVersion: { type: "string", description: "The okb version the KB was built with; okb check warns when the installed okb is older." },
    },
  };

  const array = (file: string, title: string, item: string) => ({
    $schema: DRAFT,
    $id: id(file),
    title,
    type: "array",
    items: { $ref: item },
  });

  return {
    "okb.schema.json": manifest,
    "node.schema.json": node,
    "edge.schema.json": edge,
    "nodes.schema.json": array("nodes.schema.json", `An older nodes.json (${version} folders written before the one-per-line layout): an array of nodes`, "node.schema.json"),
    "edges.schema.json": array("edges.schema.json", `An older edges.json: an array of edges`, "edge.schema.json"),
  };
}

export const schemaText = (schema: unknown) => JSON.stringify(schema, null, 2) + "\n";
