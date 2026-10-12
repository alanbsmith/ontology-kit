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
 * Domain rules come along by default, so whatever reads the export gets the guidance
 * with the data: (:OkbRule) nodes that GOVERN what they're about, and CITE the quote
 * (:OkbSourceLocation) that's PART_OF its document (:OkbSource). Only verified rules
 * are exported: a rule nobody has checked against its quote shouldn't reach an app
 * as if it were fact. Links whose `rule` property points at a held-back rule are held
 * back too, since that rule is their only justification.
 *
 * Options:
 *   inherited   (default true) copy fixed property values from classes onto their instances
 *   schema      also export the class graph: (:OkbClass) nodes, IS_A, and INSTANCE_OF from each instance
 *   rules       (default true) export verified domain rules with their quotes and sources
 *   unverified  also export rules that aren't verified yet, each with its verification status
 */
import { edgeProps, type Ontology } from "./model.ts";
import { MetaKB } from "./metakb.ts";
import type { RuleNode } from "./types.ts";

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
  format: "okb-export/2";
  ontology: string;
  metaKbVersion: string;
  nodes: ExportNode[];
  relationships: ExportRel[];
  notes: string[];
}

export interface ExportOptions {
  inherited?: boolean;
  schema?: boolean;
  rules?: boolean;
  unverified?: boolean;
}

export function exportGraph(ont: Ontology, opts: ExportOptions = {}): ExportGraph {
  const inherited = opts.inherited ?? true;
  const withRules = opts.rules ?? true;
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
      const s = ont.get(sid);
      if (s?.type !== "Slot") continue; // a HAS_SLOT to a non-slot: struct-well-formed reports it
      if (s.valueType === "Instance") {
        // A class-level link to an instance (e.g. every Merlot has grape = Merlot grape) is inherited by each member.
        if (inherited && ont.rel.values(inst.id, sid).length === 0) {
          const fixed = ont.inheritedFixed(sid, ctx);
          const spec = ont.rel.spec(sid);
          for (const t of fixed?.values ?? []) {
            if (ont.get(String(t))?.type !== "Instance" || !spec) continue;
            const [from, to] = spec.reverse ? [String(t), inst.id] : [inst.id, String(t)];
            const classEdge = ont.rel.edge(fixed!.cls, sid, String(t));
            inheritedRels.push({ type: spec.type, from, to, properties: { ...(classEdge ? edgeProps(classEdge) : {}), inheritedFrom: ont.label(fixed!.cls) } });
          }
        }
        continue;
      }
      let v: unknown = inst.values?.[sid];
      if (v === undefined && inherited) {
        const fixed = ont.inheritedFixed(sid, ctx);
        if (fixed) v = s.cardinality === "multiple" ? fixed.values : fixed.values[0];
      }
      if (v !== undefined) properties[s.name] = v;
    }
    nodes.push({ id: inst.id, labels: labelsFor(inst.id), properties });
  }

  rels.push(...inheritedRels);
  const relTypes = ont.rel.edgeTypes();
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
  if (withRules) exportRules(ont, { schema: !!opts.schema, unverified: !!opts.unverified }, nodes, rels, notes);
  const kept = settleRuleReferences(ont, rels, new Set(nodes.filter((n) => n.labels.includes("OkbRule")).map((n) => n.id)), { withRules, unverified: !!opts.unverified }, notes);

  const inverses = ont.edgesOf("INVERSE_OF").map((e) => {
    const from = ont.get(e.from);
    return `${ont.label(e.to)} = ${from?.type === "Slot" ? from.relType : undefined} followed backwards`;
  });
  if (inverses.length) notes.push(`Inverse relationships are stored once: ${inverses.join("; ")}.`);

  return { format: "okb-export/2", ontology: ont.meta.name, metaKbVersion: MetaKB.get().version, nodes, relationships: kept, notes };
}

// Rules

const isVerified = (r: RuleNode) => r.verification?.status === "SUPPORTED";

/** (:OkbRule)-[:CITES]->(:OkbSourceLocation)-[:PART_OF]->(:OkbSource), plus GOVERNS. */
function exportRules(ont: Ontology, o: { schema: boolean; unverified: boolean }, nodes: ExportNode[], rels: ExportRel[], notes: string[]) {
  // Rules can share a quote, and quotes share a source: add each node and PART_OF edge once.
  const seen = new Set<string>();
  const push = (n: ExportNode) => {
    if (seen.has(n.id)) return false;
    seen.add(n.id);
    nodes.push(n);
    return true;
  };
  let held = 0;
  for (const r of ont.ofType("Rule")) {
    if (!isVerified(r) && !o.unverified) {
      held++;
      continue;
    }
    // Names, so an app can match a rule to the labels on instance nodes even without --with-schema.
    const governs: Record<"governsClasses" | "governsSlots" | "governsInstances", string[]> = { governsClasses: [], governsSlots: [], governsInstances: [] };
    for (const t of ont.targets(r.id, "GOVERNS")) {
      const n = ont.get(t);
      if (n?.type === "Class") {
        governs.governsClasses.push(n.name);
        if (o.schema) rels.push({ type: "GOVERNS", from: r.id, to: n.id, properties: {} });
      } else if (n?.type === "Slot") governs.governsSlots.push(n.name);
      else if (n?.type === "Instance") {
        governs.governsInstances.push(n.name);
        rels.push({ type: "GOVERNS", from: r.id, to: n.id, properties: {} });
      }
    }
    push({
      id: r.id,
      labels: ["OkbRule"],
      properties: compact({
        okbId: r.id, name: r.name, statement: r.statement, modality: r.modality,
        verification: r.verification?.status ?? "UNVERIFIED",
        approvedAfter: r.verification?.approvedAfter,
        extractionConfidence: r.extractionConfidence,
        ...governs,
      }),
    });
    for (const lid of ont.targets(r.id, "CITES")) {
      const loc = ont.get(lid);
      if (loc?.type !== "SourceLocation") continue;
      rels.push({ type: "CITES", from: r.id, to: loc.id, properties: {} });
      const added = push({
        id: loc.id,
        labels: ["OkbSourceLocation"],
        properties: compact({ okbId: loc.id, quote: loc.quote, locator: loc.locator, lines: loc.lines, page: loc.page, sourceLink: loc.sourceLink, pageLink: loc.pageLink }),
      });
      if (!added) continue;
      for (const sid of ont.targets(loc.id, "PART_OF")) {
        const src = ont.get(sid);
        if (src?.type !== "Source") continue;
        push({ id: src.id, labels: ["OkbSource"], properties: compact({ okbId: src.id, title: src.title, format: src.format, url: src.url, repoUrl: src.repoUrl }) });
        rels.push({ type: "PART_OF", from: loc.id, to: src.id, properties: {} });
      }
    }
  }
  if (held) notes.push(`${held} rule(s) haven't passed verification, so they're left out (okb validate lists them). --include-unverified exports them with their status.`);
}

/**
 * Every exported `rule` property must point at an exported OkbRule node. A link that
 * cites a held-back (unverified) rule is dropped with it; with --no-rules the property is
 * removed, since the id would point at nothing.
 */
function settleRuleReferences(ont: Ontology, rels: ExportRel[], exportedRules: Set<string>, o: { withRules: boolean; unverified: boolean }, notes: string[]): ExportRel[] {
  let dropped = 0;
  let stripped = 0;
  const out: ExportRel[] = [];
  for (const r of rels) {
    const ref = r.properties.rule;
    if (ref === undefined || (typeof ref === "string" && exportedRules.has(ref))) {
      out.push(r);
      continue;
    }
    const rule = typeof ref === "string" ? ont.get(ref) : undefined;
    if (rule?.type === "Rule" && !isVerified(rule) && !o.unverified) {
      dropped++;
      continue;
    }
    const { rule: _r, ...rest } = r.properties;
    out.push({ ...r, properties: rest });
    stripped++;
  }
  if (dropped) notes.push(`${dropped} link(s) cite a rule that hasn't passed verification, so they're left out too.`);
  if (stripped) {
    notes.push(o.withRules
      ? `${stripped} link(s) had a rule property that doesn't point at a Rule node (okb validate reports it as slot-edge-properties), so the property was removed.`
      : `Rules weren't exported (--no-rules), so the rule property was removed from ${stripped} link(s).`);
  }
  return out;
}

function compact(o: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && !(Array.isArray(v) && v.length === 0)));
}

// Cypher
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
