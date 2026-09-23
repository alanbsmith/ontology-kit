/** One relationship value at a time, with edge properties (okb link / unlink). */
import * as naming from "../naming.ts";
import { OkbError, type Ontology, edgeProps } from "../model.ts";
import type { EdgePropertyDecl, Literal } from "../types.ts";
import type { Notes } from "./common.ts";
import { assign, findSlotFor, parseAssignments } from "./values.ts";

function coerceEdgeValue(decl: EdgePropertyDecl, raw: string, relName: string): Literal {
  switch (decl.valueType) {
    case "Integer":
      if (!/^-?\d+$/.test(raw)) throw new OkbError(`${relName}.${decl.name} needs a whole number; got '${raw}'.`);
      return Number(raw);
    case "Float":
    case "Number": {
      const n = Number(raw);
      if (raw === "" || Number.isNaN(n)) throw new OkbError(`${relName}.${decl.name} needs a number; got '${raw}'.`);
      return n;
    }
    case "Boolean":
      if (/^(true|yes|1)$/i.test(raw)) return true;
      if (/^(false|no|0)$/i.test(raw)) return false;
      throw new OkbError(`${relName}.${decl.name} needs true or false; got '${raw}'.`);
    case "Enumerated": {
      const hit = (decl.allowedValues ?? []).find((v) => naming.key(v) === naming.key(raw));
      if (!hit) throw new OkbError(`${relName}.${decl.name} must be one of ${(decl.allowedValues ?? []).join(", ")}; got '${raw}'.`);
      return hit;
    }
    default:
      return raw;
  }
}

/** Create (or update) one relationship value, with edge properties. */
export function link(ont: Ontology, fromRef: string, relRef: string, toRef: string, o: { props?: string[]; rule?: string; clear?: string[] } = {}): Notes {
  const owner = ont.find(fromRef, ["Instance", "Class"]);
  const slot = findSlotFor(ont, owner.id, relRef);
  if (slot.valueType !== "Instance") throw new OkbError(`${slot.name} is a property, not a relationship. Use okb instance set / class fix for values.`);
  const target = ont.find(toRef, owner.type === "Class" ? ["Class", "Instance"] : ["Instance"]);
  const primary = ont.require(ont.rel.primary(slot.id), "Slot");
  const decls = primary.edgeProperties ?? [];
  const props: Record<string, unknown> = {};
  for (const a of parseAssignments(o.props ?? [])) {
    const decl = decls.find((d) => naming.key(d.name) === naming.key(a.slot));
    if (!decl) throw new OkbError(`${primary.name} has no edge property '${a.slot}'. Declare it first: okb relationship property ${primary.name} ${a.slot} --type String${decls.length ? ` (declared: ${decls.map((d) => d.name).join(", ")})` : ""}`);
    props[decl.name] = coerceEdgeValue(decl, a.raw, primary.name);
  }
  if (o.rule) {
    const r = ont.find(o.rule, "Rule");
    props.rule = r.id;
  }
  const existing = ont.rel.edge(owner.id, slot.id, target.id);
  if (!existing) {
    // New value: same range/cardinality rules as okb instance set.
    const current = ont.rel.values(owner.id, slot.id);
    const f = ont.effectiveFacets(slot.id, ont.classContext(owner.id));
    if (f.max !== null && current.length + 1 > f.max) {
      throw new OkbError(`${owner.name}.${slot.name} allows at most ${f.max} value(s) and already has ${current.map((x) => ont.label(x)).join(", ")}. Remove one first (okb unlink ...).`);
    }
    assign(ont, owner.id, [`${slot.name}+=${target.name}`], owner.type === "Class" ? "fixed" : "value");
  }
  const edge = ont.rel.edge(owner.id, slot.id, target.id)!;
  Object.assign(edge, props);
  for (const k of o.clear ?? []) delete edge[k];
  const missing = decls.filter((d) => d.required && edge[d.name] === undefined).map((d) => d.name);
  const shown = Object.entries(edgeProps(edge)).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(", ");
  const notes = [`${existing ? "Updated" : "Linked"} (${ont.label(edge.from)})-[:${edge.type}${shown ? ` {${shown}}` : ""}]->(${ont.label(edge.to)})`];
  if (missing.length) notes.push(`Still required on this edge: ${missing.join(", ")}.`);
  if (!props.rule && !edge.rule && ont.ofType("Rule").length) notes.push(`Tip: if a documented rule justifies this link, add --rule <rule id> so the edge shares its quote and verification.`);
  return notes;
}

export function unlink(ont: Ontology, fromRef: string, relRef: string, toRef: string): Notes {
  const owner = ont.find(fromRef, ["Instance", "Class"]);
  const slot = findSlotFor(ont, owner.id, relRef);
  const target = ont.find(toRef, ["Instance", "Class"]);
  if (!ont.rel.edge(owner.id, slot.id, target.id)) throw new OkbError(`${owner.name} isn't linked to ${target.name} by ${slot.name}.`);
  ont.rel.unlink(owner.id, slot.id, target.id);
  return [`Removed ${owner.name} ${slot.name} ${target.name} (and its edge properties).`];
}
