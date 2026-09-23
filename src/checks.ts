/**
 * The validator. Every exported check implements exactly one meta-KB rule whose
 * `check` is mechanical or heuristic; meta-kb/build.ts fails if the two drift apart.
 *
 * A check returns raw hits ({message, nodes, severity?}). runChecks() attaches the
 * rule's severity (from its modality), hides rules not yet relevant at the current
 * step, and marks warnings/info as "explained" when a DesignDecision waives them.
 */
import { existsSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { MetaKB } from "./metakb.ts";
import { Ontology, VALUE_TYPES, DISPOSITIONS } from "./model.ts";
import * as naming from "./naming.ts";
import { findQuote, loadPages, normalize } from "./quotes.ts";
import { locate, parseMarkdown, type MdDoc } from "./markdown.ts";
import { readFileSync } from "node:fs";
import type { Facets, Finding, GraphNode, Severity } from "./types.ts";

export interface Hit {
  message: string;
  nodes: string[];
  severity?: Severity;
}
type Check = (ont: Ontology, ctx: CheckContext) => Hit[];
export interface CheckContext {
  /** Source id -> loaded pages (PDF/text) or parsed markdown, for prov-quote-current. */
  pages: Map<string, string[] | MdDoc | Error>;
}

const L = (ont: Ontology, id: string) => `'${ont.label(id)}'`;
const an = (w: string) => (/^[aeiou]/i.test(w) ? "an " : "a ") + w;
const list = (ont: Ontology, ids: Iterable<string>) => [...ids].map((i) => L(ont, i)).join(", ");
const classes = (ont: Ontology) => ont.ofType("Class");
const slots = (ont: Ontology) => ont.ofType("Slot");

// ------------------------------------------------------------------ value helpers
function literalProblem(v: unknown, f: Facets): string | null {
  switch (f.valueType) {
    case "String":
      return typeof v === "string" ? null : "should be text";
    case "Integer":
      return Number.isInteger(v) ? null : "should be a whole number";
    case "Float":
    case "Number":
      return typeof v === "number" ? null : "should be a number";
    case "Boolean":
      return typeof v === "boolean" ? null : "should be true or false";
    case "Enumerated":
      if (typeof v !== "string") return "should be one of the allowed values";
      return !f.allowedValues || f.allowedValues.includes(v) ? null : `is not one of the allowed values (${f.allowedValues.join(", ")})`;
    case "Instance":
      return "should be a link to another instance, not a plain value";
    default:
      return null;
  }
}

/** Is `target` an acceptable Instance-type value given the range? */
function inRange(ont: Ontology, target: string, range: string[], fromClass: boolean): boolean {
  const t = ont.get(target);
  if (!t) return false;
  if (range.length === 0) return true;
  if (t.type === "Instance") {
    const cs = ont.instanceClasses(target);
    return range.some((r) => cs.has(r));
  }
  if (t.type === "Class" && fromClass) return range.some((r) => ont.isSub(target, r));
  return false;
}

function isTerminological(ont: Ontology, c: GraphNode): boolean {
  return Boolean(c.terminological) || ont.meta.kind === "terminological";
}

// ================================================================== CHECKS
export const CHECKS: Record<string, Check> = {
  // ---------------------------------------------------------------- structure
  "struct-well-formed": (ont) => {
    const hits: Hit[] = [];
    const { nodeTypes, edgeTypes } = MetaKB.get().formatRegistry();
    const seen = new Set<string>();
    for (const n of ont.nodes) {
      if (!n.id) {
        hits.push({ message: `A ${n.type ?? "node"} has no id.`, nodes: [] });
        continue;
      }
      if (seen.has(n.id)) hits.push({ message: `Two nodes share the id '${n.id}'.`, nodes: [n.id] });
      seen.add(n.id);
      const nt = nodeTypes.get(n.type);
      if (!nt) {
        hits.push({ message: `Node '${n.id}' has unknown type '${n.type}'. Allowed: ${[...nodeTypes.keys()].join(", ")}.`, nodes: [n.id] });
        continue;
      }
      const missing = (nt.required as string[]).filter((p) => n[p] === undefined || n[p] === "");
      if (missing.length) hits.push({ message: `${n.type} '${n.id}' is missing ${missing.join(", ")}.`, nodes: [n.id] });
      if (n.type === "Slot" && n.cardinality !== undefined && !["single", "multiple"].includes(n.cardinality)) {
        hits.push({ message: `Slot ${L(ont, n.id)} has cardinality '${n.cardinality}'; use 'single' or 'multiple'.`, nodes: [n.id] });
      }
      if (n.type === "Term" && n.disposition !== undefined && !DISPOSITIONS.includes(n.disposition)) {
        hits.push({ message: `Term ${L(ont, n.id)} has disposition '${n.disposition}'; use one of ${DISPOSITIONS.join(", ")}.`, nodes: [n.id] });
      }
    }
    const onto = ont.ofType("Ontology");
    if (onto.length !== 1 || onto[0].id !== "ontology") {
      hits.push({ message: `There must be exactly one Ontology node with id 'ontology' (found ${onto.length}).`, nodes: onto.map((o) => o.id) });
    }
    const relTypes = ont.relationshipTypes();
    for (const e of ont.edges) {
      const et = edgeTypes.get(e.type);
      const tag = `${e.from} -${e.type}-> ${e.to}`;
      if (!et) {
        if (relTypes.has(e.type)) {
          // A relationship value: must join two Instances, or start at a Class (a fixed class-level value).
          const a = ont.get(e.from);
          const b = ont.get(e.to);
          if (!a || !b) hits.push({ message: `Edge ${tag} points at a node that doesn't exist (${!a ? e.from : e.to}).`, nodes: [a ? e.from : e.to] });
          else if (!["Instance", "Class"].includes(a.type) || !["Instance", "Class"].includes(b.type) || (a.type === "Instance" && b.type === "Class")) {
            hits.push({ message: `Relationship ${tag} connects ${a.type} → ${b.type}; relationships link instances (or state a fixed value on a class).`, nodes: [e.from, e.to] });
          }
          continue;
        }
        hits.push({ message: `Edge ${tag} has unknown type. It's neither an okb structural edge (${[...edgeTypes.keys()].join(", ")}) nor the relationship type of any relationship slot (${[...relTypes.keys()].join(", ") || "none yet"}).`, nodes: [e.from] });
        continue;
      }
      const a = ont.get(e.from);
      const b = ont.get(e.to);
      if (!a || !b) {
        hits.push({ message: `Edge ${tag} points at a node that doesn't exist (${!a ? e.from : e.to}).`, nodes: [a ? e.from : e.to] });
        continue;
      }
      // Instance misuse in the hierarchy gets its own friendlier rule (inst-are-leaves).
      const instanceMisuse = (e.type === "IS_A" && (a.type === "Instance" || b.type === "Instance")) ||
        (e.type === "INSTANCE_OF" && b.type === "Instance");
      if (!instanceMisuse && (!et.fromTypes.includes(a.type) || !et.toTypes.includes(b.type))) {
        hits.push({ message: `Edge ${tag} connects ${a.type} → ${b.type}; ${e.type} must go ${et.fromTypes.join("/")} → ${et.toTypes.join("/")}.`, nodes: [e.from, e.to] });
      }
      for (const p of et.props as string[]) {
        if (e[p] === undefined) hits.push({ message: `Edge ${tag} is missing property '${p}'.`, nodes: [e.from] });
      }
    }
    return hits;
  },

  // ---------------------------------------------------------------- hierarchy
  "hier-no-cycles": (ont) => {
    const hits: Hit[] = [];
    const reported = new Set<string>();
    const color = new Map<string, number>();
    const visit = (u: string, path: string[]) => {
      color.set(u, 1);
      path.push(u);
      for (const v of ont.parents(u)) {
        if (color.get(v) === 1) {
          const cycle = path.slice(path.indexOf(v));
          const k = [...cycle].sort().join("|");
          if (!reported.has(k)) {
            reported.add(k);
            hits.push({ message: `Cycle in the hierarchy: ${[...cycle, v].map((c) => ont.label(c)).join(" → ")}. These classes would all be the same class.`, nodes: cycle });
          }
        } else if (!color.get(v)) visit(v, path);
      }
      path.pop();
      color.set(u, 2);
    };
    for (const c of classes(ont)) if (!color.get(c.id)) visit(c.id, []);
    return hits;
  },

  "hier-no-singular-plural-pair": (ont) => {
    const hits: Hit[] = [];
    const cs = classes(ont);
    for (const a of cs) {
      for (const b of cs) {
        if (a.id >= b.id || !a.name || !b.name) continue;
        const sa = naming.key(naming.withHead(a.name, naming.singularize));
        const sb = naming.key(naming.withHead(b.name, naming.singularize));
        if (sa !== sb || naming.key(a.name) === naming.key(b.name)) continue;
        const linked = ont.parents(a.id).includes(b.id) || ont.parents(b.id).includes(a.id);
        hits.push({
          message: linked
            ? `${L(ont, a.id)} and ${L(ont, b.id)} are singular/plural forms of the same concept, and one is a subclass of the other.`
            : `${L(ont, a.id)} and ${L(ont, b.id)} look like singular/plural forms of the same concept.`,
          nodes: [a.id, b.id],
          severity: linked ? "error" : "warning",
        });
      }
    }
    return hits;
  },

  "hier-no-synonym-classes": (ont) => {
    const hits: Hit[] = [];
    const cs = classes(ont);
    for (const a of cs) {
      for (const syn of a.synonyms ?? []) {
        for (const b of cs) {
          if (b.id !== a.id && naming.key(b.name ?? "") === naming.key(syn)) {
            hits.push({ message: `${L(ont, b.id)} is listed as a synonym of ${L(ont, a.id)} but is also its own class.`, nodes: [a.id, b.id] });
          }
        }
      }
    }
    return hits;
  },

  "hier-no-redundant-isa": (ont) => {
    const hits: Hit[] = [];
    for (const c of classes(ont)) {
      const ps = ont.parents(c.id);
      for (const p of ps) {
        const via = ps.find((q) => q !== p && ont.ancestors(q).has(p));
        if (via) {
          hits.push({ message: `${L(ont, c.id)} is linked directly to ${L(ont, p)}, but it already is one through ${L(ont, via)}.`, nodes: [c.id, p] });
        }
      }
    }
    return hits;
  },

  "hier-single-child": (ont) =>
    classes(ont)
      .filter((c) => ont.children(c.id).length === 1)
      .map((c) => ({
        message: `${L(ont, c.id)} has only one direct subclass (${L(ont, ont.children(c.id)[0])}). Is a sibling missing, or is the subclass really the same as its parent?`,
        nodes: [c.id],
      })),

  "hier-too-many-children": (ont) =>
    classes(ont)
      .filter((c) => ont.children(c.id).length > 12)
      .map((c) => ({
        message: `${L(ont, c.id)} has ${ont.children(c.id).length} direct subclasses. Are there natural groups among them?`,
        nodes: [c.id],
      })),

  "hier-subclass-adds-something": (ont) => {
    const hits: Hit[] = [];
    const rangeTargets = new Set(ont.edgesOf("RANGE").map((e) => e.to));
    const relTypes = ont.relationshipTypes();
    const valueTargets = new Set(ont.edges.filter((e) => relTypes.has(e.type)).map((e) => e.to));
    const disjoint = new Set(ont.edgesOf("DISJOINT_WITH").flatMap((e) => [e.from, e.to]));
    for (const c of classes(ont)) {
      if (ont.parents(c.id).length === 0 || isTerminological(ont, c)) continue;
      const nonEmpty = (o: unknown) => o && typeof o === "object" && Object.keys(o).length > 0;
      const addsSomething =
        ont.ownSlots(c.id).length > 0 || nonEmpty(c.fixedValues) || nonEmpty(c.defaults) || nonEmpty(c.facetOverrides) ||
        ont.linkedSlots(c.id).length > 0 || rangeTargets.has(c.id) || valueTargets.has(c.id) ||
        disjoint.has(c.id) || ont.sources(c.id, "ABOUT").length > 0 || ont.parents(c.id).length > 1;
      if (!addsSomething) {
        hits.push({ message: `${L(ont, c.id)} doesn't add anything to ${list(ont, ont.parents(c.id))}: no own slots, values, restrictions or relationships.`, nodes: [c.id] });
      }
    }
    return hits;
  },

  // ---------------------------------------------------------------- instances
  "inst-are-leaves": (ont) => {
    const hits: Hit[] = [];
    for (const e of ont.edges) {
      const a = ont.get(e.from);
      const b = ont.get(e.to);
      if (!a || !b) continue;
      if (e.type === "IS_A" && (a.type === "Instance" || b.type === "Instance")) {
        hits.push({ message: `${L(ont, e.from)} IS_A ${L(ont, e.to)}, but instances can't be in the class hierarchy.`, nodes: [e.from, e.to] });
      }
      if (e.type === "INSTANCE_OF" && b.type === "Instance") {
        hits.push({ message: `${L(ont, e.from)} is an instance of ${L(ont, e.to)}, which is itself an instance. Nothing can be an instance of an instance.`, nodes: [e.from, e.to] });
      }
    }
    return hits;
  },

  "inst-not-of-abstract": (ont) =>
    ont.edgesOf("INSTANCE_OF")
      .filter((e) => ont.get(e.to)?.abstract)
      .map((e) => ({ message: `${L(ont, e.from)} is a direct instance of ${L(ont, e.to)}, which is abstract.`, nodes: [e.from, e.to] })),

  // ---------------------------------------------------------------- slots
  "slot-attach-most-general": (ont) => {
    const hits: Hit[] = [];
    for (const s of slots(ont)) {
      const dom = ont.domain(s.id);
      for (const c of dom) {
        const anc = dom.find((d) => d !== c && ont.ancestors(c).has(d));
        if (anc) hits.push({ message: `${L(ont, s.id)} is attached to ${L(ont, c)} and to its ancestor ${L(ont, anc)}. ${L(ont, c)} inherits it already.`, nodes: [s.id, c] });
      }
      for (const p of classes(ont)) {
        const kids = ont.children(p.id);
        if (kids.length < 2 || dom.includes(p.id) || dom.some((d) => ont.ancestors(p.id).has(d))) continue;
        if (kids.every((k) => dom.includes(k))) {
          hits.push({ message: `${L(ont, s.id)} is attached to every subclass of ${L(ont, p.id)} (${list(ont, kids)}). Attach it to ${L(ont, p.id)} instead.`, nodes: [s.id, p.id] });
        }
      }
    }
    return hits;
  },

  "slot-value-type-declared": (ont) =>
    slots(ont)
      .filter((s) => !VALUE_TYPES.includes(s.valueType))
      .map((s) => ({
        message: s.valueType
          ? `Slot ${L(ont, s.id)} has value type '${s.valueType}'. Use one of ${VALUE_TYPES.join(", ")}.`
          : `Slot ${L(ont, s.id)} has no value type.`,
        nodes: [s.id],
      })),

  "slot-instance-needs-range": (ont) =>
    slots(ont)
      .filter((s) => s.valueType === "Instance" && ont.range(s.id).length === 0)
      .map((s) => ({ message: `Slot ${L(ont, s.id)} links to other things but doesn't say which class they must belong to (no range).`, nodes: [s.id] })),

  "slot-enum-needs-values": (ont) =>
    slots(ont)
      .filter((s) => s.valueType === "Enumerated" && !(Array.isArray(s.allowedValues) && s.allowedValues.length))
      .map((s) => ({ message: `Slot ${L(ont, s.id)} is Enumerated but lists no allowed values.`, nodes: [s.id] })),

  "slot-cardinality-declared": (ont) => {
    const missing = slots(ont).filter((s) => !s.cardinality).map((s) => s.id);
    return missing.length ? [{ message: `No cardinality (single or multiple) on: ${list(ont, missing)}.`, nodes: missing }] : [];
  },

  "slot-cardinality-coherent": (ont) => {
    const hits: Hit[] = [];
    const bad = (label: string, id: string, min: unknown, max: unknown, single: boolean) => {
      const probs: string[] = [];
      if (typeof min === "number" && min < 0) probs.push(`minimum ${min} is negative`);
      if (typeof max === "number" && max < 0) probs.push(`maximum ${max} is negative`);
      if (typeof min === "number" && typeof max === "number" && min > max) probs.push(`minimum ${min} is more than maximum ${max}`);
      if (single && typeof max === "number" && max > 1) probs.push(`it is 'single' but maximum is ${max}`);
      if (single && typeof min === "number" && min > 1) probs.push(`it is 'single' but minimum is ${min}`);
      if (probs.length) hits.push({ message: `${label}: ${probs.join("; ")}.`, nodes: [id] });
    };
    for (const s of slots(ont)) bad(`Slot ${L(ont, s.id)}`, s.id, s.minCardinality, s.maxCardinality, s.cardinality === "single");
    for (const c of classes(ont)) {
      for (const [sid, ov] of Object.entries<any>(c.facetOverrides ?? {})) {
        const s = ont.get(sid);
        if (!s) continue;
        const f = ont.effectiveFacets(sid, ont.up(c.id));
        bad(`${L(ont, c.id)}'s restriction on ${L(ont, sid)}`, c.id, f.min, f.max, s.cardinality === "single");
        if (Array.isArray(ov.allowedValues) && Array.isArray(s.allowedValues)) {
          const extra = ov.allowedValues.filter((v: string) => !s.allowedValues.includes(v));
          if (extra.length) hits.push({ message: `${L(ont, c.id)} allows ${extra.join(", ")} for ${L(ont, sid)}, which the slot itself doesn't allow.`, nodes: [c.id, sid] });
        }
      }
    }
    return hits;
  },

  "slot-range-remove-subclass": (ont) => {
    const hits: Hit[] = [];
    for (const s of slots(ont)) {
      const r = ont.range(s.id);
      for (const b of r) {
        const a = r.find((x) => x !== b && ont.ancestors(b).has(x));
        if (a) hits.push({ message: `${L(ont, s.id)}'s range lists ${L(ont, a)} and its subclass ${L(ont, b)}. Remove ${L(ont, b)}.`, nodes: [s.id, b] });
      }
    }
    return hits;
  },

  "slot-range-collapse-subclasses": (ont) => {
    const hits: Hit[] = [];
    for (const s of slots(ont)) {
      const r = ont.range(s.id);
      for (const p of classes(ont)) {
        const kids = ont.children(p.id);
        if (kids.length >= 2 && !r.includes(p.id) && kids.every((k) => r.includes(k))) {
          hits.push({ message: `${L(ont, s.id)}'s range lists every subclass of ${L(ont, p.id)}. Use ${L(ont, p.id)} instead.`, nodes: [s.id, p.id] });
        }
      }
    }
    return hits;
  },

  "slot-range-all-but-few": (ont) => {
    const hits: Hit[] = [];
    for (const s of slots(ont)) {
      const r = ont.range(s.id);
      for (const p of classes(ont)) {
        const kids = ont.children(p.id);
        const listed = kids.filter((k) => r.includes(k));
        const missing = kids.length - listed.length;
        if (kids.length >= 4 && !r.includes(p.id) && missing >= 1 && missing <= 2 && listed.length >= kids.length / 2) {
          hits.push({ message: `${L(ont, s.id)}'s range lists ${listed.length} of ${kids.length} subclasses of ${L(ont, p.id)}. Would ${L(ont, p.id)} be the better range?`, nodes: [s.id, p.id] });
        }
      }
    }
    return hits;
  },

  "slot-range-not-too-general": (ont) => {
    const hits: Hit[] = [];
    const generic = new Set(["thing", "entity", "object", "item", "anything", "node", "resource"]);
    const all = classes(ont);
    const roots = ont.roots();
    for (const s of slots(ont)) {
      for (const r of ont.range(s.id)) {
        const n = ont.get(r);
        const topOfEverything = roots.length === 1 && roots[0] === r && all.length >= 5;
        if (n && (generic.has(naming.key(n.name ?? "")) || topOfEverything)) {
          hits.push({ message: `${L(ont, s.id)}'s range is ${L(ont, r)}, which covers almost everything. What kind of thing actually fills it?`, nodes: [s.id, r] });
        }
      }
    }
    return hits;
  },

  "slot-values-respect-facets": (ont) => {
    const hits: Hit[] = [];
    const owners = [...ont.ofType("Instance"), ...classes(ont)];
    for (const n of owners) {
      const isInst = n.type === "Instance";
      const ctx = ont.classContext(n.id);
      const applicable = ont.applicableSlots(n.id);
      for (const sid of applicable) {
        const s = ont.get(sid)!;
        const f = ont.effectiveFacets(sid, ctx);
        let vals = ont.statedValues(n.id, sid);
        // Values inherited from a class's fixed value were checked on that class; only count them here.
        const inherited = isInst && vals.length === 0;
        if (inherited) vals = ont.inheritedFixed(sid, ctx)?.values ?? [];
        for (const v of inherited ? [] : vals) {
          if (f.valueType === "Instance") {
            if (typeof v !== "string" || !ont.get(v)) {
              hits.push({ message: `${L(ont, n.id)}.${s.name} = ${JSON.stringify(v)} should be a link to another instance.`, nodes: [n.id, sid] });
            } else if (!inRange(ont, v, f.range, !isInst)) {
              hits.push({ message: `${L(ont, n.id)}.${s.name} points at ${L(ont, v)}, which isn't ${f.range.map((r) => an(ont.label(r))).join(" or ")}.`, nodes: [n.id, sid, v] });
            }
          } else {
            const p = literalProblem(v, f);
            if (p) hits.push({ message: `${L(ont, n.id)}.${s.name} = ${JSON.stringify(v)} ${p}.`, nodes: [n.id, sid] });
          }
        }
        if (f.max !== null && vals.length > f.max) {
          hits.push({ message: `${L(ont, n.id)} has ${vals.length} values for ${s.name}; at most ${f.max} allowed.`, nodes: [n.id, sid] });
        }
        if (isInst && vals.length < f.min) {
          hits.push({ message: `${L(ont, n.id)} has ${vals.length} value(s) for ${s.name}; at least ${f.min} required.`, nodes: [n.id, sid] });
        }
      }
    }
    return hits;
  },

  "slot-value-slot-applies": (ont) => {
    const hits: Hit[] = [];
    for (const n of [...ont.ofType("Instance"), ...classes(ont)]) {
      const applicable = new Set(ont.applicableSlots(n.id));
      const used = new Set<string>();
      for (const field of n.type === "Instance" ? ["values"] : ["fixedValues", "defaults", "facetOverrides"]) {
        for (const sid of Object.keys(n[field] ?? {})) used.add(sid);
      }
      for (const sid of ont.linkedSlots(n.id)) used.add(sid);
      for (const sid of used) {
        if (!ont.get(sid)) hits.push({ message: `${L(ont, n.id)} has a value for '${sid}', which isn't a slot.`, nodes: [n.id] });
        else if (!applicable.has(sid)) {
          hits.push({ message: `${L(ont, n.id)} has a value for ${L(ont, sid)}, but that slot isn't attached to ${n.type === "Instance" ? "its class" : "it"} or any ancestor.`, nodes: [n.id, sid] });
        }
      }
    }
    return hits;
  },

  "slot-default-allowed": (ont) => {
    const hits: Hit[] = [];
    const check = (owner: string, sid: string, v: unknown, ctx: Iterable<string>) => {
      const s = ont.get(sid);
      if (!s) return;
      const f = ont.effectiveFacets(sid, ctx);
      const p = f.valueType === "Instance"
        ? (typeof v === "string" && ont.get(v) && inRange(ont, v, f.range, false) ? null : "isn't an instance in the slot's range")
        : literalProblem(v, f);
      if (p) hits.push({ message: `Default for ${L(ont, sid)}${owner !== sid ? ` on ${L(ont, owner)}` : ""} (${JSON.stringify(v)}) ${p}.`, nodes: [owner, sid] });
    };
    for (const s of slots(ont)) if (s.default !== undefined) check(s.id, s.id, s.default, []);
    for (const c of classes(ont)) for (const [sid, v] of Object.entries(c.defaults ?? {})) check(c.id, sid, v, ont.up(c.id));
    return hits;
  },

  "slot-fixed-not-overridden": (ont) => {
    const hits: Hit[] = [];
    const same = (a: unknown[], b: unknown[]) => JSON.stringify([...a].map(String).sort()) === JSON.stringify([...b].map(String).sort());
    for (const c of classes(ont)) {
      const fixedSlots = new Set([...Object.keys(c.fixedValues ?? {}), ...ont.linkedSlots(c.id)]);
      for (const sid of fixedSlots) {
        const fixed = ont.statedValues(c.id, sid);
        for (const d of ont.descendants(c.id)) {
          const dn = ont.get(d)!;
          const theirs = ont.statedValues(d, sid);
          if (theirs.length && !same(theirs, fixed)) {
            hits.push({ message: `${L(ont, c.id)} fixes ${ont.label(sid)} = ${fixed.map((v) => ont.label(String(v))).join(", ")}, but its subclass ${L(ont, d)} says ${theirs.map((v) => ont.label(String(v))).join(", ")}.`, nodes: [d, c.id, sid] });
          }
          const dd = dn.defaults?.[sid];
          if (dd !== undefined && !same([dd], fixed)) {
            hits.push({ message: `${L(ont, d)} sets a default for ${ont.label(sid)}, but ${L(ont, c.id)} already fixes it to ${fixed.join(", ")}.`, nodes: [d, c.id, sid] });
          }
        }
        for (const inst of ont.ofType("Instance")) {
          if (!ont.instanceClasses(inst.id).has(c.id)) continue;
          const theirs = ont.statedValues(inst.id, sid);
          if (theirs.length && !same(theirs, fixed)) {
            hits.push({ message: `${L(ont, inst.id)} says ${ont.label(sid)} = ${theirs.map((v) => ont.label(String(v))).join(", ")}, but every ${ont.label(c.id)} has ${fixed.map((v) => ont.label(String(v))).join(", ")}.`, nodes: [inst.id, c.id, sid] });
          }
        }
      }
    }
    return hits;
  },

  "slot-inverse-consistent": (ont) => {
    const hits: Hit[] = [];
    const related = (a: string[], b: string[]) =>
      a.length === 0 || b.length === 0 || a.some((x) => b.some((y) => ont.isSub(x, y) || ont.isSub(y, x)));
    for (const e of ont.edgesOf("INVERSE_OF")) {
      const [s1, s2] = [e.from, e.to];
      for (const [x, y] of [[s1, s2], [s2, s1]]) {
        if (!related(ont.range(x), ont.domain(y))) {
          hits.push({ message: `${L(ont, x)} and ${L(ont, y)} are inverses, but ${L(ont, x)}'s range (${list(ont, ont.range(x))}) doesn't match ${L(ont, y)}'s domain (${list(ont, ont.domain(y))}).`, nodes: [x, y] });
        }
      }
    }
    return hits;
  },

  "slot-edge-properties": (ont) => {
    const hits: Hit[] = [];
    const rel = ont.relationshipTypes();
    for (const e of ont.edges) {
      const sid = rel.get(e.type);
      if (!sid) continue;
      const s = ont.get(sid)!;
      const decls: any[] = s.edgeProperties ?? [];
      const tag = `(${ont.label(e.from)})-[:${e.type}]->(${ont.label(e.to)})`;
      for (const [k, v] of Object.entries(e)) {
        if (["from", "to", "type"].includes(k)) continue;
        if (k === "rule") {
          if (ont.get(String(v))?.type !== "Rule") hits.push({ message: `${tag} points at rule '${v}', which isn't a Rule node.`, nodes: [e.from, e.to] });
          continue;
        }
        const d = decls.find((x) => x.name === k);
        if (!d) {
          hits.push({ message: `${tag} has an undeclared edge property '${k}'. Declare it: okb relationship property ${s.name} ${k} --type ...`, nodes: [e.from, sid], severity: "warning" });
          continue;
        }
        const f = { valueType: d.valueType, allowedValues: d.allowedValues ?? null, min: 0, max: null, range: [], overriddenBy: [] } as Facets;
        const p = literalProblem(v, f);
        if (p) hits.push({ message: `${tag}.${k} = ${JSON.stringify(v)} ${p}.`, nodes: [e.from, sid] });
      }
      for (const d of decls) {
        if (d.required && e[d.name] === undefined) hits.push({ message: `${tag} is missing required edge property '${d.name}'.`, nodes: [e.from, sid] });
      }
    }
    return hits;
  },

  // ---------------------------------------------------------------- disjointness
  "disjoint-no-shared-members": (ont) => {
    const hits: Hit[] = [];
    const pairs = ont.edgesOf("DISJOINT_WITH").map((e) => [e.from, e.to] as const);
    for (const [a, b] of pairs) {
      if (ont.isSub(a, b) || ont.isSub(b, a)) {
        const [sub, sup] = ont.isSub(a, b) ? [a, b] : [b, a];
        hits.push({ message: `${L(ont, sub)} is declared disjoint with its own ancestor ${L(ont, sup)}, so it could never have members.`, nodes: [a, b] });
      }
    }
    const violates = (set: Set<string>) => pairs.filter(([a, b]) => set.has(a) && set.has(b) && !(a === b));
    for (const c of classes(ont)) {
      const v = violates(ont.up(c.id));
      // Report only where the conflict starts, not on every descendant.
      const fresh = v.filter(([a, b]) => !ont.parents(c.id).some((p) => ont.up(p).has(a) && ont.up(p).has(b)));
      for (const [a, b] of fresh) {
        if (c.id === a || c.id === b) continue;
        hits.push({ message: `${L(ont, c.id)} is under both ${L(ont, a)} and ${L(ont, b)}, which are declared disjoint.`, nodes: [c.id, a, b] });
      }
    }
    for (const i of ont.ofType("Instance")) {
      const direct = ont.targets(i.id, "INSTANCE_OF");
      const v = violates(ont.instanceClasses(i.id)).filter(([a, b]) => !direct.some((d) => ont.up(d).has(a) && ont.up(d).has(b)));
      for (const [a, b] of v) hits.push({ message: `Instance ${L(ont, i.id)} is both ${an(ont.label(a))} and ${an(ont.label(b))}, which are declared disjoint.`, nodes: [i.id, a, b] });
    }
    return hits;
  },

  "disjoint-consider-siblings": (ont) => {
    const hits: Hit[] = [];
    const pairs = new Set(ont.edgesOf("DISJOINT_WITH").map((e) => [e.from, e.to].sort().join("|")));
    for (const p of classes(ont)) {
      const kids = ont.children(p.id);
      if (kids.length < 2) continue;
      const any = kids.some((a, i) => kids.slice(i + 1).some((b) => pairs.has([a, b].sort().join("|")) || ont.disjointImplied(a, b)));
      if (!any) hits.push({ message: `The subclasses of ${L(ont, p.id)} (${list(ont, kids)}) have no disjointness declared. Can anything be more than one of them?`, nodes: [p.id] });
    }
    return hits;
  },

  // ---------------------------------------------------------------- naming
  "naming-convention-defined": (ont) => {
    if (ont.conventions?.source !== "default" && ont.conventions) return [];
    if (!ont.ofType("Class").length && !ont.ofType("Slot").length) return [];
    return [{
      message: ont.conventions
        ? "okb is using its default naming convention because none was chosen. Confirm it (or pick your own) with `okb convention`."
        : "No naming convention is set yet. Run `okb convention` to pick one.",
      nodes: ["ontology"],
    }];
  },

  "naming-follow-convention": (ont) => {
    const conv = ont.conventions;
    if (!conv) return [];
    const hits: Hit[] = [];
    for (const c of classes(ont)) {
      if (c.name && !naming.matches(c.name, conv.classCase)) {
        hits.push({ message: `Class ${L(ont, c.id)} isn't ${conv.classCase}. Try '${naming.convert(c.name, conv.classCase)}'.`, nodes: [c.id] });
      }
    }
    for (const s of slots(ont)) {
      if (!s.name) continue;
      const ws = naming.tokens(s.name);
      const affixOk = conv.slotAffix === "has-prefix" ? ws[0] === "has" : conv.slotAffix === "of-suffix" ? ws[ws.length - 1] === "of" : true;
      if (!naming.matches(s.name, conv.slotCase) || !affixOk) {
        hits.push({ message: `Slot ${L(ont, s.id)} doesn't follow the slot convention (${conv.slotCase}${conv.slotAffix !== "none" ? `, ${conv.slotAffix}` : ""}). Try '${naming.applySlotAffix(s.name, conv)}'.`, nodes: [s.id] });
      }
    }
    if (conv.instanceCase) {
      for (const i of ont.ofType("Instance")) {
        if (i.name && !naming.matches(i.name, conv.instanceCase)) {
          hits.push({ message: `Instance ${L(ont, i.id)} isn't ${conv.instanceCase}.`, nodes: [i.id] });
        }
      }
    }
    return hits;
  },

  "naming-singular-plural-consistent": (ont) => {
    const conv = ont.conventions;
    if (!conv) return [];
    const wantPlural = conv.classNumber === "plural";
    return classes(ont)
      .filter((c) => c.name && naming.isPlural(naming.headWord(c.name)) !== wantPlural)
      .map((c) => ({
        message: `Class ${L(ont, c.id)} looks ${wantPlural ? "singular" : "plural"}, but the convention is ${conv.classNumber}. Try '${naming.withHead(c.name, wantPlural ? naming.pluralize : naming.singularize)}'.`,
        nodes: [c.id],
      }));
  },

  "naming-no-type-words": (ont) => {
    const banned = new Set(["class", "slot", "property", "prop", "attribute", "attr", "concept", "instance"]);
    return [...classes(ont), ...slots(ont)]
      .filter((n) => n.name && naming.tokens(n.name).length > 1 && banned.has(naming.headWord(n.name)))
      .map((n) => ({ message: `${n.type} ${L(ont, n.id)} ends in '${naming.headWord(n.name)}'. Leave type words out of names.`, nodes: [n.id] }));
  },

  "naming-no-abbreviations": (ont) => {
    const hits: Hit[] = [];
    for (const n of [...classes(ont), ...slots(ont)]) {
      if (!n.name) continue;
      const suspicious = naming.rawTokens(n.name).filter((t) => /^[A-Z]{2,5}$/.test(t) || /\.$/.test(t));
      if (suspicious.length) hits.push({ message: `${n.type} ${L(ont, n.id)} may contain an abbreviation (${suspicious.join(", ")}).`, nodes: [n.id] });
    }
    return hits;
  },

  "naming-subclass-names-consistent": (ont) => {
    const hits: Hit[] = [];
    for (const p of classes(ont)) {
      const kids = ont.children(p.id);
      if (kids.length < 2 || !p.name) continue;
      const head = naming.headWord(p.name);
      const incl = kids.filter((k) => naming.tokens(ont.label(k)).includes(head) || naming.tokens(ont.label(k)).includes(naming.pluralize(head)));
      if (incl.length && incl.length < kids.length) {
        const excl = kids.filter((k) => !incl.includes(k));
        hits.push({ message: `Subclasses of ${L(ont, p.id)} are named inconsistently: ${list(ont, incl)} ${incl.length === 1 ? "includes" : "include"} '${head}' but ${list(ont, excl)} ${excl.length === 1 ? "doesn't" : "don't"}.`, nodes: [p.id, ...excl] });
      }
    }
    return hits;
  },

  "naming-unique": (ont) => {
    const hits: Hit[] = [];
    for (const t of ["Class", "Slot", "Instance"]) {
      const seen = new Map<string, string>();
      for (const n of ont.ofType(t)) {
        const k = naming.key(n.name ?? "");
        if (!k) continue;
        if (seen.has(k)) hits.push({ message: `Two ${t === "Class" ? "classes" : t.toLowerCase() + "s"} have the same name: ${L(ont, seen.get(k)!)} and ${L(ont, n.id)}.`, nodes: [seen.get(k)!, n.id] });
        else seen.set(k, n.id);
      }
    }
    return hits;
  },

  // ---------------------------------------------------------------- scope & docs
  "scope-defined": (ont) => {
    const m = ont.meta;
    const missing = ["domain", "purpose"].filter((k) => !m[k]);
    if (!(m.users ?? []).length) missing.push("users");
    return missing.length ? [{ message: `Scope is missing: ${missing.join(", ")}. Run \`okb scope\`.`, nodes: ["ontology"] }] : [];
  },

  "scope-competency-questions": (ont) => {
    const n = ont.ofType("CompetencyQuestion").length;
    return n >= 3 ? [] : [{ message: `There ${n === 1 ? "is 1 competency question" : `are ${n} competency questions`}; write at least three (\`okb cq add\`).`, nodes: ["ontology"] }];
  },

  "scope-cq-coverage": (ont) => {
    const loose = ont.ofType("CompetencyQuestion").filter((q) => ont.targets(q.id, "NEEDS").length === 0);
    return loose.map((q) => ({ message: `Competency question ${q.id} ("${q.text}") isn't linked to anything that answers it.`, nodes: [q.id] }));
  },

  "scope-no-unneeded": (ont) => {
    const needs = ont.edgesOf("NEEDS").map((e) => e.to);
    if (needs.length === 0) return [];
    const neededClasses = new Set<string>();
    const neededSlots = new Set<string>();
    for (const t of needs) {
      const n = ont.get(t);
      if (!n) continue;
      if (n.type === "Class") {
        for (const x of ont.up(t)) neededClasses.add(x);
        for (const k of ont.children(t)) neededClasses.add(k);
      } else if (n.type === "Slot") {
        neededSlots.add(t);
        for (const i of ont.inverses(t)) neededSlots.add(i);
        for (const d of ont.domain(t)) for (const x of ont.up(d)) neededClasses.add(x);
        for (const r of ont.range(t)) for (const x of ont.up(r)) neededClasses.add(x);
      } else if (n.type === "Instance") {
        for (const c of ont.targets(t, "INSTANCE_OF")) for (const x of ont.up(c)) neededClasses.add(x);
      }
    }
    // One extra level of specialization is allowed (Ontology 101 §4.7).
    for (const c of [...neededClasses]) for (const k of ont.children(c)) neededClasses.add(k);
    const extraC = classes(ont).filter((c) => !neededClasses.has(c.id)).map((c) => c.id);
    const extraS = slots(ont).filter((s) => !neededSlots.has(s.id)).map((s) => s.id);
    const hits: Hit[] = [];
    if (extraC.length) hits.push({ message: `No competency question needs these classes (or their parent/child): ${list(ont, extraC)}.`, nodes: extraC });
    if (extraS.length) hits.push({ message: `No competency question needs these slots: ${list(ont, extraS)}.`, nodes: extraS });
    return hits;
  },

  "doc-descriptions": (ont) => {
    const missing = [...classes(ont), ...slots(ont)].filter((n) => !n.description).map((n) => n.id);
    return missing.length ? [{ message: `No description on ${missing.length} class(es)/slot(s): ${list(ont, missing)}.`, nodes: missing }] : [];
  },

  "reuse-recorded": (ont) =>
    ont.meta.reuseReviewed || ont.ofType("ReusedOntology").length
      ? []
      : [{ message: "Reuse hasn't been considered yet (Step 2). Record what you found, or `okb reuse none --why ...`.", nodes: ["ontology"] }],

  "terms-dispositioned": (ont) => {
    const open = ont.ofType("Term").filter((t) => !t.disposition || t.disposition === "undecided").map((t) => t.id);
    return open.length ? [{ message: `${open.length} term(s) from Step 3 haven't been sorted yet: ${list(ont, open)}.`, nodes: open }] : [];
  },

  // ---------------------------------------------------------------- provenance
  "prov-verified": (ont) =>
    ont.nodes
      .filter((n) => (n.type === "Rule" || n.extracted) && !n.verification)
      .map((n): Hit => ({ message: `${n.type} ${L(ont, n.id)} was extracted from a document but hasn't been verified against its quote yet (Step 3 of the extraction pipeline): okb verify ${n.id} --status ...`, nodes: [n.id] }))
      .concat(ont.nodes
      .filter((n) => n.verification && n.verification.status !== "SUPPORTED")
      .map((n) => ({
        message: n.verification.status === "OVERREACH"
          ? `${n.type} ${L(ont, n.id)} was corrected after claiming more than its quote supports. A person must check it: okb verify ${n.id} --approve`
          : `${n.type} ${L(ont, n.id)} has verification status ${n.verification.status ?? "(none)"}. A person must resolve it.`,
        nodes: [n.id],
      }))),

  "prov-cites-quote": (ont) => {
    const hits: Hit[] = [];
    for (const n of ont.nodes) {
      if (!(n.type === "Rule" || n.extracted || n.verification)) continue;
      const locs = ont.targets(n.id, "CITES").map((i) => ont.get(i)).filter((l): l is GraphNode => Boolean(l));
      const good = locs.filter((l) => l.quote && ont.targets(l.id, "PART_OF").some((s) => ont.get(s)?.type === "Source"));
      if (good.length === 0) hits.push({ message: `${n.type} ${L(ont, n.id)} doesn't cite a verbatim quote from a Source.`, nodes: [n.id] });
    }
    return hits;
  },

  "prov-quote-current": (ont, ctx) => {
    const hits: Hit[] = [];
    for (const src of ont.ofType("Source")) {
      if (!src.localPath) continue;
      const pages = ctx.pages.get(src.id);
      if (!pages) continue;
      if (pages instanceof Error) {
        hits.push({ message: `Can't read ${src.localPath} for Source ${L(ont, src.id)}: ${pages.message}`, nodes: [src.id], severity: "warning" });
        continue;
      }
      for (const loc of ont.sources(src.id, "PART_OF").map((i) => ont.get(i)!)) {
        if (!loc?.quote) continue;
        if (Array.isArray(pages)) {
          if (!findQuote(loc.quote, pages).found) hits.push({ message: `Quote ${loc.id} no longer appears in ${src.localPath}: "${String(loc.quote).slice(0, 70)}…"`, nodes: [loc.id] });
          continue;
        }
        const found = locate(pages, loc.quote);
        if (!found.length) {
          hits.push({ message: `Quote ${loc.id} no longer appears in ${src.localPath} (was ${loc.locator}, line ${loc.lines}): "${String(loc.quote).slice(0, 70)}…"`, nodes: [loc.id] });
        } else if (loc.startLine && !found.some((h) => h.startLine === loc.startLine)) {
          hits.push({ message: `Quote ${loc.id} moved (was line ${loc.lines}, now line ${found[0].startLine}). Update links with: okb source refresh ${src.id}`, nodes: [loc.id], severity: "info" });
        }
      }
    }
    return hits;
  },

  "prov-duplicate-quotes": (ont) => duplicateQuotes(ont),
};

/** Near-identical quotes attributed to different sources (also used by `okb drift`). */
export function duplicateQuotes(ont: Ontology, threshold = 0.9): Hit[] {
  const hits: Hit[] = [];
  const locs = ont.ofType("SourceLocation").filter((l) => l.quote);
  const src = (l: GraphNode) => ont.targets(l.id, "PART_OF")[0];
  const buckets = new Map<string, GraphNode[]>();
  for (const l of locs) {
    const k = String(l.quote).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).slice(0, 6).join(" ");
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k)!.push(l);
  }
  for (const group of buckets.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const [a, b] = [group[i], group[j]];
        if (!src(a) || !src(b) || src(a) === src(b)) continue;
        const sim = similarity(normalize(a.quote), normalize(b.quote));
        if (sim >= threshold) {
          hits.push({ message: `${a.id} (${ont.label(src(a))}) and ${b.id} (${ont.label(src(b))}) are ${sim === 1 ? "identical" : Math.round(sim * 100) + "% similar"}. Possibly copy-pasted; check each is right for its own document.`, nodes: [a.id, b.id] });
        }
      }
    }
  }
  return hits;
}

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const bigrams = (s: string) => {
    const m = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) m.set(s.slice(i, i + 2), (m.get(s.slice(i, i + 2)) ?? 0) + 1);
    return m;
  };
  const A = bigrams(a);
  const B = bigrams(b);
  let inter = 0;
  for (const [k, v] of A) inter += Math.min(v, B.get(k) ?? 0);
  return (2 * inter) / Math.max(1, a.length - 1 + b.length - 1);
}

// ================================================================== runner
export interface RunOptions {
  /** Ignore the current step and run every rule. */
  all?: boolean;
  /** Only these rule keys. */
  only?: string[];
}

export async function loadSourcePages(ont: Ontology): Promise<Map<string, string[] | MdDoc | Error>> {
  const pages = new Map<string, string[] | MdDoc | Error>();
  for (const s of ont.ofType("Source")) {
    if (!s.localPath) continue;
    const p = isAbsolute(s.localPath) ? s.localPath : join(ont.root, s.localPath);
    try {
      if (!existsSync(p)) pages.set(s.id, new Error("file not found"));
      else if (s.format === "markdown" || /\.(md|markdown)$/i.test(p)) pages.set(s.id, parseMarkdown(readFileSync(p, "utf8")));
      else pages.set(s.id, await loadPages(p));
    } catch (e) {
      pages.set(s.id, e as Error);
    }
  }
  return pages;
}

export function runChecks(ont: Ontology, opts: RunOptions = {}, ctx: CheckContext = { pages: new Map() }): Finding[] {
  const meta = MetaKB.get();
  // A decision about a class also covers that class's subclasses.
  const waivers = ont.ofType("DesignDecision").flatMap((d) =>
    (d.metaRules ?? []).map((r: string) => {
      const about = new Set<string>();
      for (const a of ont.targets(d.id, "ABOUT")) {
        about.add(a);
        if (ont.get(a)?.type === "Class") for (const x of ont.descendants(a)) about.add(x);
      }
      return { rule: r, decision: d.id, about, any: ont.targets(d.id, "ABOUT").length === 0 };
    }),
  );
  let hidden = 0;
  const findings: Finding[] = [];
  for (const [key, check] of Object.entries(CHECKS)) {
    if (opts.only && !opts.only.includes(key)) continue;
    const rule = meta.rule(key);
    // Rules for later steps are hidden until you get there, except errors: those always show.
    const later = !opts.all && (rule.fromStep ?? 1) > ont.step;
    let hits: Hit[];
    try {
      hits = check(ont, ctx);
    } catch (e) {
      hits = [{ message: `(internal) check crashed: ${(e as Error).message}. Run okb validate after fixing struct-well-formed errors.`, nodes: [], severity: "warning" }];
    }
    for (const h of hits) {
      const severity: Severity = h.severity ?? rule.severity;
      if (later && severity !== "error") {
        hidden++;
        continue;
      }
      const f: Finding = { rule: key, severity, message: h.message, nodes: h.nodes };
      if (severity !== "error") {
        const w = waivers.find((w) => w.rule === key && (w.any || h.nodes.some((n) => w.about.has(n))));
        if (w) f.explainedBy = w.decision;
      }
      findings.push(f);
    }
  }
  const order = { error: 0, warning: 1, info: 2 };
  const sorted = findings.sort((a, b) => order[a.severity] - order[b.severity]);
  // Non-enumerable so it doesn't leak into comparisons or JSON (see docs/CODE-REVIEW.md: should become a result object).
  return Object.defineProperty(sorted, "hiddenLater", { value: hidden, enumerable: false });
}
