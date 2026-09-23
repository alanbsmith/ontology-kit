/** Instances and the classes they belong to. */
import * as naming from "../naming.ts";
import { OkbError, type Ontology, literalValues } from "../model.ts";
import { an, type Notes } from "./common.ts";
import { assign } from "./values.ts";
import { checkParents } from "./classes.ts";

export function addInstance(ont: Ontology, name: string, o: { of: string[]; description?: string; assignments?: string[] }): Notes {
  if (!o.of?.length) throw new OkbError("Say which class it belongs to with --of <Class>.");
  const classes = o.of.map((c) => ont.find(c, "Class"));
  const clash = ont.ofType("Instance").find((i) => naming.key(i.name) === naming.key(name));
  if (clash) throw new OkbError(`There is already an instance called '${clash.name}'.`);
  const notes: Notes = [];
  for (const cl of classes) {
    if (cl.abstract) throw new OkbError(`${cl.name} is abstract, so it can't have direct instances. Pick one of its subclasses: ${ont.children(cl.id).map((k) => ont.label(k)).join(", ")}.`);
    if (ont.children(cl.id).length) notes.push(`Tip: ${cl.name} has subclasses (${ont.children(cl.id).map((k) => ont.label(k)).join(", ")}). Use the most specific class that fits.`);
  }
  const id = ont.newId("Instance", name);
  const inst = ont.addNode({ type: "Instance", id, name, ...(o.description ? { description: o.description } : {}), values: {} });
  for (const cl of classes) ont.addEdge(id, "INSTANCE_OF", cl.id);
  notes.unshift(`Added ${name} (${classes.map((x) => an(x.name)).join(" and ")}).`);
  if (o.assignments?.length) notes.push(...assign(ont, id, o.assignments));
  // Fill in defaults (most specific class first, then the slot's own default).
  const ctx = [...classes.map((x) => x.id), ...classes.flatMap((x) => [...ont.ancestors(x.id)])];
  for (const sid of ont.applicableSlots(id)) {
    if (ont.statedValues(id, sid).length || ont.inheritedFixed(sid, ctx)) continue;
    const s = ont.get(sid);
    if (s?.type !== "Slot") continue; // a HAS_SLOT to a non-slot: struct-well-formed reports it
    const fromClass = ctx.map((c) => ont.get(c)).map((c) => (c?.type === "Class" ? c.defaults?.[sid] : undefined)).find((v) => v !== undefined);
    const dv = fromClass ?? s.default;
    if (dv === undefined) continue;
    if (s.valueType === "Instance") ont.rel.link(id, sid, String(dv));
    // A multiple slot stores a list; a default that's already a list becomes that list, not a list inside a list.
    else literalValues(inst)[sid] = s.cardinality === "multiple" ? [dv].flat() : dv;
    notes.push(`Filled in default ${s.name} = ${JSON.stringify(dv)}.`);
  }
  const missing = ont.applicableSlots(id).filter((sid) => {
    const f = ont.effectiveFacets(sid, ont.instanceClasses(id));
    return f.min > 0 && ont.statedValues(id, sid).length < f.min && !ont.inheritedFixed(sid, ont.instanceClasses(id));
  });
  if (missing.length) notes.push(`Still required: ${missing.map((m) => ont.label(m)).join(", ")}. okb instance set "${name}" ${ont.label(missing[0])}=...`);
  return notes;
}

export function setInstanceClasses(ont: Ontology, ref: string, classes: string[]): Notes {
  const inst = ont.find(ref, "Instance");
  const cs = classes.map((c) => ont.find(c, "Class"));
  for (const c of cs) if (c.abstract) throw new OkbError(`${c.name} is abstract, so it can't have direct instances.`);
  checkParents(ont, cs.map((c) => c.id), inst.name);
  ont.removeEdges((e) => e.from === inst.id && e.type === "INSTANCE_OF");
  for (const c of cs) ont.addEdge(inst.id, "INSTANCE_OF", c.id);
  const lost = [...Object.keys(inst.values ?? {}), ...ont.rel.slotsWithValues(inst.id)].filter((s) => !ont.applicableSlots(inst.id).includes(s));
  const notes = [`${inst.name} is now ${cs.map((c) => an(c.name)).join(" and ")}.`];
  if (lost.length) notes.push(`Warning: its values for ${[...new Set(lost)].map((s) => ont.label(s)).join(", ")} don't apply to the new class. Remove them (okb instance set "${inst.name}" <slot>=) or pick another class.`);
  return notes;
}
