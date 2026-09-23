/** Slots (properties and relationships), their facets, inverses and edge-property declarations. */
import * as naming from "../naming.ts";
import { OkbError, type Ontology, isRelationship } from "../model.ts";
import { CARDINALITIES, VALUE_TYPES, isOneOf, type EdgePropertyDecl, type LiteralType } from "../types.ts";
import { splitList as list, type Notes } from "./common.ts";
import { checkName } from "./naming.ts";
import { linkTermIfAny } from "./scope.ts";
import { coerce } from "./values.ts";

export interface SlotOpts {
  on?: string[]; off?: string[]; type?: string; values?: string[]; range?: string[]; addRange?: string[]; removeRange?: string[];
  card?: string; min?: number; max?: number; default?: string; description?: string; force?: boolean;
}

export function addSlot(ont: Ontology, name: string, o: SlotOpts): Notes {
  const notes: Notes = [];
  checkName(ont, name, "Slot", o.force, notes);
  if (!o.type) throw new OkbError(`Say what kind of value ${name} holds with --type (${VALUE_TYPES.join(", ")}). Not sure? okb explain "value type".`);
  const id = ont.newId("Slot", name);
  ont.addNode({ type: "Slot", id, name });
  try {
    notes.push(...updateSlot(ont, id, o, true));
  } catch (e) {
    ont.removeNode(id);
    throw e;
  }
  const added = ont.require(id, "Slot");
  notes.unshift(added.valueType === "Instance"
    ? `Added relationship ${name}: (${o.on?.join("|") || "?"})-[:${added.relType}]->(${ont.range(id).map((r) => ont.label(r)).join("|") || "?"}).`
    : `Added property ${name}${o.on?.length ? ` on ${o.on.join(", ")}` : ""} (${added.valueType}).`);
  if (!o.on?.length) notes.push(`Attach it to a class: okb slot set ${name} --on <Class>`);
  if (!o.card) notes.push(`Decide how many values it holds: --card single or --card multiple (Step 6).`);
  if (!o.description) notes.push(`Add a one-line description: okb slot set ${name} --desc "..."`);
  linkTermIfAny(ont, name, id, "slot");
  return notes;
}

export function updateSlot(ont: Ontology, ref: string, o: SlotOpts, creating = false): Notes {
  const s = ont.find(ref, "Slot");
  const notes: Notes = [];
  if (o.type) {
    const wanted = o.type.toLowerCase();
    const t = VALUE_TYPES.find((v) => v.toLowerCase() === wanted);
    if (!t) throw new OkbError(`--type must be one of ${VALUE_TYPES.join(", ")}.`);
    const wasRel = s.valueType === "Instance";
    s.valueType = t;
    if (t !== "Enumerated") delete s.allowedValues;
    if (t !== "Instance") {
      ont.removeEdges((e) => e.from === s.id && e.type === "RANGE");
      if (wasRel) {
        const dropped = ont.rel.becomeProperty(s);
        if (dropped.links) notes.push(`Removed ${dropped.links} ${dropped.type} link(s): ${s.name} no longer links to other things.`);
      }
      delete s.relType;
    } else {
      ont.rel.becomeRelationship(s);
    }
  }
  if (o.values?.length) {
    if (s.valueType !== "Enumerated") throw new OkbError("--values only applies to Enumerated slots (use --type Enumerated).");
    s.allowedValues = list(o.values);
  }
  const setRange = (refs: string[], replace: boolean) => {
    if (s.valueType !== "Instance") throw new OkbError("A range only applies to Instance slots (use --type Instance).");
    if (replace) ont.removeEdges((e) => e.from === s.id && e.type === "RANGE");
    for (const r of refs) ont.addEdge(s.id, "RANGE", ont.find(r, "Class").id);
  };
  if (o.range?.length) setRange(o.range, true);
  if (o.addRange?.length) setRange(o.addRange, false);
  for (const r of o.removeRange ?? []) {
    const rc = ont.find(r, "Class");
    ont.removeEdges((e) => e.from === s.id && e.type === "RANGE" && e.to === rc.id);
  }
  if (o.card) {
    if (!isOneOf(CARDINALITIES, o.card)) throw new OkbError("--card must be single or multiple.");
    s.cardinality = o.card;
  }
  if (o.min !== undefined) s.minCardinality = o.min;
  if (o.max !== undefined) s.maxCardinality = o.max;
  if (o.description !== undefined) s.description = o.description;
  for (const c of o.on ?? []) {
    const cl = ont.find(c, "Class");
    const inherited = ont.domain(s.id).find((d) => ont.ancestors(cl.id).has(d));
    if (inherited) notes.push(`Note: ${cl.name} already inherits ${s.name} from ${ont.label(inherited)}; attaching it again is redundant.`);
    ont.addEdge(cl.id, "HAS_SLOT", s.id);
    for (const k of ont.domain(s.id).filter((d) => ont.ancestors(d).has(cl.id))) {
      ont.removeEdges((e) => e.from === k && e.type === "HAS_SLOT" && e.to === s.id);
      notes.push(`Removed ${s.name} from ${ont.label(k)}; it now inherits it from ${cl.name}.`);
    }
  }
  for (const c of o.off ?? []) {
    const cl = ont.find(c, "Class");
    ont.removeEdges((e) => e.from === cl.id && e.type === "HAS_SLOT" && e.to === s.id);
  }
  if (o.default !== undefined) {
    if (o.default === "") delete s.default;
    else s.default = coerce(ont, s, o.default);
  }
  const mn = s.minCardinality;
  const mx = s.cardinality === "single" ? Math.min(s.maxCardinality ?? 1, 1) : s.maxCardinality;
  if (typeof mn === "number" && typeof mx === "number" && mn > mx) {
    throw new OkbError(`${s.name}: minimum ${mn} is more than maximum ${mx}${s.cardinality === "single" ? " (single cardinality means at most 1)" : ""}. Nothing could ever satisfy that.`);
  }
  if (s.valueType === "Enumerated" && !s.allowedValues?.length) notes.push(`List the allowed values: okb slot set ${s.name} --values a,b,c`);
  if (s.valueType === "Instance" && ont.range(s.id).length === 0) notes.push(`Say which class its values come from: okb slot set ${s.name} --range <Class>`);
  if (!creating && !notes.length) notes.push(`Updated ${s.name}.`);
  return notes;
}

export function inverse(ont: Ontology, a: string, b: string): Notes {
  const sa = ont.find(a, "Slot");
  const sb = ont.find(b, "Slot");
  if (!isRelationship(sa) || !isRelationship(sb)) throw new OkbError("Only relationships (Instance slots) can be inverses.");
  if (sa.id === sb.id) throw new OkbError("A relationship can't be its own inverse here; for symmetric relationships just use one.");
  for (const x of [sa, sb]) {
    if (ont.inverses(x.id).length) throw new OkbError(`${x.name} already has an inverse (${ont.inverses(x.id).map((i) => ont.label(i)).join(", ")}).`);
  }
  const moved = ont.rel.declareInverse(sa, sb);
  return [
    `${sa.name} and ${sb.name} are now inverses: one relationship read from both ends.`,
    `Stored as (${ont.domain(sa.id).map((d) => ont.label(d)).join("|") || "?"})-[:${sa.relType}]->(${ont.range(sa.id).map((d) => ont.label(d)).join("|") || "?"}); ${sb.name} follows ${sa.relType} backwards, so nothing is stored twice.${moved ? ` Moved ${moved} existing ${sb.relType} edge(s) onto ${sa.relType}.` : ""}`,
  ];
}

// A relationship's edges can carry properties that qualify that one link (a
// condition, a weight, a date) plus a reserved `rule` reference to the Rule node
// that justifies it. Declaring them gives them facets, just like slots.

export const EDGE_VALUE_TYPES: LiteralType[] = ["String", "Integer", "Float", "Number", "Boolean", "Enumerated"];
const RESERVED_EDGE_KEYS = new Set(["from", "to", "type", "rule"]);

export function declareEdgeProperty(ont: Ontology, relRef: string, name: string, o: { type?: string; values?: string[]; required?: boolean; description?: string; remove?: boolean }): Notes {
  const rel = ont.require(ont.rel.primary(ont.find(relRef, "Slot").id), "Slot");
  if (rel.valueType !== "Instance") throw new OkbError(`${rel.name} is a property, not a relationship; only relationships have edge properties.`);
  const decls = (rel.edgeProperties ??= []);
  if (o.remove) {
    rel.edgeProperties = decls.filter((d) => d.name !== name);
    return [`Removed edge property ${name} from ${rel.name}. Existing values stay on the edges until you remove them.`];
  }
  if (RESERVED_EDGE_KEYS.has(name)) throw new OkbError(`'${name}' is reserved on edges.${name === "rule" ? " Every relationship edge can already point at a Rule with --rule." : ""}`);
  const conv = ont.conventions ?? naming.DEFAULT_CONVENTIONS;
  if (!naming.matches(name, conv.slotCase)) throw new OkbError(`Edge property names follow the slot convention (${conv.slotCase}). Try '${naming.convert(name, conv.slotCase)}'.`);
  const t = EDGE_VALUE_TYPES.find((v) => v.toLowerCase() === (o.type ?? "String").toLowerCase());
  if (!t) throw new OkbError(`--type must be one of ${EDGE_VALUE_TYPES.join(", ")} (edges can't link to other things; use --rule to reference a Rule).`);
  if (t === "Enumerated" && !o.values?.length) throw new OkbError("Enumerated edge properties need --values a,b,c.");
  const decl: EdgePropertyDecl = { name, valueType: t, ...(t === "Enumerated" ? { allowedValues: list(o.values) } : {}), ...(o.required ? { required: true } : {}), ...(o.description ? { description: o.description } : {}) };
  const i = decls.findIndex((d) => d.name === name);
  if (i >= 0) decls[i] = decl;
  else decls.push(decl);
  return [`${rel.name} edges can now carry ${name} (${t}${decl.required ? ", required" : ""}): (…)-[:${rel.relType} {${name}: …}]->(…)`];
}
