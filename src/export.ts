/**
 * `okb export`: writes the ontology's DATA the way a graph database expects it.
 *
 * In the okb file, classes are nodes (so the schema itself can be queried and
 * validated). In a graph database you usually want the opposite: each instance is a
 * node labeled with its class and every ancestor class (labels are flat, so
 * multiple labels are how is-a is expressed), property values are node properties,
 * and relationships are typed edges.
 *
 *   (:Beaujolais:RedWine:Wine {name: "Chateau Morgon Beaujolais", body: "light", color: "red"})
 *     -[:MAKER]->(:Winery {name: "Chateau Morgon"})
 *
 * Options:
 *   inherited  (default true) copy fixed property values from classes onto their instances
 *   schema     also export the class graph: (:OkbClass) nodes, IS_A, and INSTANCE_OF from each instance
 */
import { edgeProps, type Ontology } from "./model.ts";
import { MetaKB } from "./metakb.ts";

export interface ExportNode {
  id: string;
  labels: string[];
  properties: Record<string, unknown>;
}
export interface ExportRel {
  type: string;
  from: string;
  to: string;
  properties: Record<string, unknown>;
}
export interface ExportGraph {
  format: "okb-export/1";
  ontology: string;
  metaKbVersion: string;
  nodes: ExportNode[];
  relationships: ExportRel[];
  notes: string[];
}

export function exportGraph(ont: Ontology, opts: { inherited?: boolean; schema?: boolean } = {}): ExportGraph {
  const inherited = opts.inherited ?? true;
  const nodes: ExportNode[] = [];
  const rels: ExportRel[] = [];
  const notes: string[] = [];
  const inheritedRels: ExportRel[] = [];

  // Most specific class first, then ancestors (nearest first).
  const labelsFor = (iid: string) => {
    const out: string[] = [];
    let frontier = ont.targets(iid, "INSTANCE_OF");
    while (frontier.length) {
      const next: string[] = [];
      for (const c of frontier) {
        const name = ont.label(c);
        if (!out.includes(name)) out.push(name);
        next.push(...ont.parents(c));
      }
      frontier = next;
    }
    return out;
  };

  for (const inst of ont.ofType("Instance")) {
    const properties: Record<string, unknown> = { okbId: inst.id, name: inst.name };
    if (inst.description) properties.description = inst.description;
    const ctx = ont.instanceClasses(inst.id);
    for (const sid of ont.applicableSlots(inst.id)) {
      const s = ont.get(sid)!;
      if (s.valueType === "Instance") {
        // A class-level link to an instance (e.g. every Merlot has grape = Merlot grape) is inherited by each member.
        if (inherited && ont.linked(inst.id, sid).length === 0) {
          const fixed = ont.inheritedFixed(sid, ctx);
          const spec = ont.linkSpec(sid);
          for (const t of fixed?.values ?? []) {
            if (ont.get(String(t))?.type !== "Instance" || !spec) continue;
            const [from, to] = spec.reverse ? [String(t), inst.id] : [inst.id, String(t)];
            const classEdge = ont.linkEdge(fixed!.cls, sid, String(t));
            inheritedRels.push({ type: spec.type, from, to, properties: { ...(classEdge ? edgeProps(classEdge) : {}), inheritedFrom: ont.label(fixed!.cls) } });
          }
        }
        continue;
      }
      let v = inst.values?.[sid];
      if (v === undefined && inherited) {
        const fixed = ont.inheritedFixed(sid, ctx);
        if (fixed) v = s.cardinality === "multiple" ? fixed.values : fixed.values[0];
      }
      if (v !== undefined) properties[s.name] = v;
    }
    nodes.push({ id: inst.id, labels: labelsFor(inst.id), properties });
  }

  rels.push(...inheritedRels);
  const relTypes = ont.relationshipTypes();
  let classLevel = 0;
  for (const e of ont.edges) {
    if (!relTypes.has(e.type)) continue;
    const a = ont.get(e.from);
    const b = ont.get(e.to);
    if (a?.type === "Instance" && b?.type === "Instance") rels.push({ type: e.type, from: e.from, to: e.to, properties: edgeProps(e) });
    else if (b?.type === "Class") classLevel++;
  }

  if (opts.schema) {
    for (const c of ont.ofType("Class")) {
      nodes.push({
        id: c.id, labels: ["OkbClass"],
        properties: { okbId: c.id, name: c.name, ...(c.description ? { description: c.description } : {}), ...(c.abstract ? { abstract: true } : {}) },
      });
    }
    for (const e of ont.edgesOf("IS_A")) rels.push({ type: "IS_A", from: e.from, to: e.to, properties: {} });
    for (const e of ont.edgesOf("INSTANCE_OF")) rels.push({ type: "INSTANCE_OF", from: e.from, to: e.to, properties: {} });
    for (const e of ont.edges) {
      if (relTypes.has(e.type) && ont.get(e.from)?.type === "Class") rels.push({ type: e.type, from: e.from, to: e.to, properties: { ...edgeProps(e), classLevel: true } });
    }
  } else if (classLevel) {
    notes.push(`${classLevel} class-level relationship value(s) point at classes (e.g. RedWine GOES_WELL_WITH RedMeat), not instances, so they're only exported with --with-schema.`);
  }
  const inverses = ont.edgesOf("INVERSE_OF").map((e) => `${ont.label(e.to)} = ${ont.get(e.from)?.relType} followed backwards`);
  if (inverses.length) notes.push(`Inverse relationships are stored once: ${inverses.join("; ")}.`);

  return { format: "okb-export/1", ontology: ont.meta.name, metaKbVersion: MetaKB.get().version, nodes, relationships: rels, notes };
}

// ------------------------------------------------------------------ Cypher
const ident = (s: string) => (/^[A-Za-z_][A-Za-z0-9_]*$/.test(s) ? s : "`" + s.replace(/`/g, "``") + "`");

function literal(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (Array.isArray(v)) return "[" + v.map(literal).join(", ") + "]";
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(JSON.stringify(v));
}

function mapLiteral(props: Record<string, unknown>): string {
  return "{" + Object.entries(props).map(([k, v]) => `${ident(k)}: ${literal(v)}`).join(", ") + "}";
}

/** openCypher script (Neo4j, Memgraph, Amazon Neptune). Run against an empty database, or delete the previous import first. */
export function toCypher(g: ExportGraph): string {
  const out: string[] = [
    `// ${g.ontology}: exported by okb (meta-KB ${g.metaKbVersion})`,
    "// Every node carries okbId. To re-import, first run: MATCH (n) WHERE n.okbId IS NOT NULL DETACH DELETE n;",
    ...g.notes.map((n) => `// ${n}`),
    "",
  ];
  for (const n of g.nodes) {
    const labels = n.labels.length ? ":" + n.labels.map(ident).join(":") : "";
    out.push(`CREATE (${labels} ${mapLiteral(n.properties)});`);
  }
  out.push("");
  for (const r of g.relationships) {
    const props = Object.keys(r.properties).length ? " " + mapLiteral(r.properties) : "";
    out.push(`MATCH (a {okbId: ${literal(r.from)}}), (b {okbId: ${literal(r.to)}}) CREATE (a)-[:${ident(r.type)}${props}]->(b);`);
  }
  return out.join("\n") + "\n";
}
