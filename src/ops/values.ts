/** Parsing and storing values: instance values, class fixed values, defaults and restrictions. */
import * as naming from "../naming.ts";
import { OkbError, type Ontology, literalValues, nameOrText } from "../model.ts";
import type { Literal, SlotNode } from "../types.ts";
import { an, splitList as list, type Notes } from "./common.ts";

export function parseAssignments(args: string[]): { slot: string; op: "=" | "+=" | "-="; raw: string }[] {
  return args.map((a) => {
    const m = a.match(/^([^=+\-][^=]*?)\s*(\+=|-=|=)(.*)$/s);
    if (!m) throw new OkbError(`Expected slot=value (or slot+=value / slot-=value), got '${a}'.`);
    return { slot: m[1].trim(), op: m[2] as "=", raw: m[3].trim() };
  });
}

export function findSlotFor(ont: Ontology, ownerId: string, ref: string): SlotNode {
  const s = ont.find(ref, "Slot");
  if (!ont.applicableSlots(ownerId).includes(s.id)) {
    throw new OkbError(`'${s.name}' isn't a slot of ${ont.label(ownerId)} (attached to: ${ont.domain(s.id).map((d) => ont.label(d)).join(", ") || "nothing"}).`);
  }
  return s;
}

/** Parse a command-line value for a slot. A relationship's value is the id of the node it names. */
export function coerce(ont: Ontology, slot: SlotNode, raw: string, allowClass = false): Literal {
  switch (slot.valueType) {
    case "Integer": {
      if (!/^-?\d+$/.test(raw)) throw new OkbError(`${slot.name} needs a whole number; got '${raw}'.`);
      return Number(raw);
    }
    case "Float":
    case "Number": {
      const n = Number(raw);
      if (raw === "" || Number.isNaN(n)) throw new OkbError(`${slot.name} needs a number; got '${raw}'.`);
      return n;
    }
    case "Boolean": {
      const v = raw.toLowerCase();
      if (["true", "yes", "y", "1"].includes(v)) return true;
      if (["false", "no", "n", "0"].includes(v)) return false;
      throw new OkbError(`${slot.name} needs true or false; got '${raw}'.`);
    }
    case "Enumerated": {
      const hit = (slot.allowedValues ?? []).find((v: string) => naming.key(v) === naming.key(raw));
      if (!hit) throw new OkbError(`${slot.name} must be one of ${(slot.allowedValues ?? []).join(", ")}; got '${raw}'.`);
      return hit;
    }
    case "Instance":
      return ont.find(raw, allowClass ? ["Instance", "Class"] : ["Instance"]).id;
    default:
      return raw;
  }
}

function splitValues(slot: SlotNode, raw: string): string[] {
  return slot.cardinality === "multiple" && slot.valueType !== "String" ? list(raw) : [raw];
}

/** Set values on an Instance (literal values / relationship edges) or a Class (fixed values). */
export function assign(ont: Ontology, ownerId: string, assignments: string[], mode: "value" | "fixed" = "value"): Notes {
  const owner = ont.require(ownerId);
  if (owner.type !== "Instance" && owner.type !== "Class") throw new OkbError(`Only instances and classes have values; ${ont.label(ownerId)} is ${an(owner.type)}.`);
  const notes: Notes = [];
  const firstFixed = mode === "fixed" && !ont.ofType("Class").some((c) => Object.keys(c.fixedValues ?? {}).length || ont.rel.slotsWithValues(c.id).length);
  for (const a of parseAssignments(assignments)) {
    const slot = findSlotFor(ont, ownerId, a.slot);
    const vals = a.raw === "" ? [] : splitValues(slot, a.raw).map((r) => coerce(ont, slot, r, owner.type === "Class"));
    if (slot.valueType === "Instance") {
      const current = ont.rel.values(ownerId, slot.id);
      const next = a.op === "=" ? (vals as string[]) : a.op === "+=" ? [...new Set([...current, ...(vals as string[])])] : current.filter((x) => !vals.includes(x));
      const f = ont.effectiveFacets(slot.id, ont.classContext(ownerId));
      for (const v of next) {
        if (!current.includes(v) && f.range.length) {
          const t = ont.require(v);
          const ok = t.type === "Instance"
            ? f.range.some((r) => ont.instanceClasses(v).has(r))
            : owner.type === "Class" && f.range.some((r) => ont.isSub(v, r));
          if (!ok) throw new OkbError(`${owner.name}.${slot.name} must point at ${f.range.map((r) => an(ont.label(r))).join(" or ")}; ${nameOrText(t)} is ${an(t.type === "Instance" ? ont.targets(v, "INSTANCE_OF").map((c) => ont.label(c)).join("/") || "instance with no class" : "class outside that range")}.`);
        }
      }
      for (const gone of current.filter((x) => !next.includes(x))) ont.rel.unlink(ownerId, slot.id, gone);
      for (const v of next) ont.rel.link(ownerId, slot.id, v);
      const spec = ont.rel.spec(slot.id)!;
      const shown = next.map((x) => ont.label(x)).join(", ") || "(nothing)";
      notes.push(`${owner.name}.${slot.name} ${mode === "fixed" ? "fixed to" : "="} ${shown}`);
      if (spec.reverse && next.length) {
        notes.push(`  (stored once as ${next.map((x) => `(${ont.label(x)})-[:${spec.type}]->(${owner.name})`).join(", ")}; ${slot.name} reads it backwards)`);
      }
    } else {
      const stored = literalValues(owner);
      const cur = stored[slot.id];
      const curList = cur === undefined ? [] : Array.isArray(cur) ? cur : [cur];
      const next = a.op === "=" ? vals : a.op === "+=" ? [...curList, ...vals] : curList.filter((x) => !vals.includes(x));
      if (slot.cardinality !== "multiple" && next.length > 1) throw new OkbError(`${slot.name} holds a single value; got ${next.length}.`);
      if (next.length === 0) delete stored[slot.id];
      else stored[slot.id] = slot.cardinality === "multiple" ? next : next[0];
      notes.push(`${owner.name}.${slot.name} ${mode === "fixed" ? "fixed to" : "="} ${next.map((v) => JSON.stringify(v)).join(", ") || "(nothing)"}`);
    }
  }
  if (firstFixed) notes.push("Fixed values apply to every subclass and instance and can't be changed below. For an overridable starting value use `okb class default`.");
  return notes;
}

export function classDefault(ont: Ontology, ref: string, assignments: string[]): Notes {
  const cl = ont.find(ref, "Class");
  const notes: Notes = [];
  for (const a of parseAssignments(assignments)) {
    const slot = findSlotFor(ont, cl.id, a.slot);
    cl.defaults ??= {};
    if (a.raw === "") delete cl.defaults[slot.id];
    else cl.defaults[slot.id] = coerce(ont, slot, a.raw);
    notes.push(`New ${cl.name} instances will start with ${slot.name} = ${JSON.stringify(cl.defaults[slot.id] ?? null)} (can be changed per instance).`);
  }
  return notes;
}

export function restrict(ont: Ontology, ref: string, slotRef: string, o: { values?: string[]; min?: number; max?: number; range?: string[]; clear?: boolean }): Notes {
  const cl = ont.find(ref, "Class");
  const slot = findSlotFor(ont, cl.id, slotRef);
  cl.facetOverrides ??= {};
  if (o.clear) {
    delete cl.facetOverrides[slot.id];
    return [`Removed ${cl.name}'s restrictions on ${slot.name}.`];
  }
  const ov = (cl.facetOverrides[slot.id] ??= {});
  if (o.values?.length) ov.allowedValues = list(o.values).map((v) => coerce(ont, slot, v));
  if (o.min !== undefined) ov.minCardinality = o.min;
  if (o.max !== undefined) ov.maxCardinality = o.max;
  if (o.range?.length) ov.range = o.range.map((r) => ont.find(r, "Class").id);
  const notes = [`${cl.name} now restricts ${slot.name}: ${JSON.stringify(ov)}.`];
  if (o.max === 0) notes.push(`Maximum 0 means ${cl.name} never has a ${slot.name} (Ontology 101 §3, Step 6).`);
  return notes;
}
