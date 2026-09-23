/**
 * Every change to an ontology goes through these functions (the CLI is a thin
 * wrapper). Each returns human-readable notes about what happened, including
 * gentle warnings, so beginners learn as they go.
 */
import { runChecks } from "./checks.ts";
import { MetaKB } from "./metakb.ts";
import { DISPOSITIONS, OkbError, Ontology, VALUE_TYPES, edgeProps } from "./model.ts";
import * as naming from "./naming.ts";
import type { Conventions, GraphNode } from "./types.ts";

export type Notes = string[];
/** "a Winery" / "an Author" */
export const an = (w: string) => (/^[aeiou]/i.test(w) ? "an " : "a ") + w;
const list = (s: string | string[] | undefined) =>
  (Array.isArray(s) ? s : s ? [s] : []).flatMap((x) => x.split(",")).map((x) => x.trim()).filter(Boolean);

// ------------------------------------------------------------------ scope & conventions
export function setScope(ont: Ontology, o: { name?: string; domain?: string; purpose?: string; users?: string[]; maintainers?: string[]; outOfScope?: string[]; kind?: string }): Notes {
  const m = ont.meta;
  if (o.name) {
    m.name = o.name;
    ont.manifest.name = o.name;
  }
  if (o.domain !== undefined) m.domain = o.domain;
  if (o.purpose !== undefined) m.purpose = o.purpose;
  if (o.users?.length) m.users = list(o.users);
  if (o.maintainers?.length) m.maintainers = list(o.maintainers);
  if (o.outOfScope?.length) m.outOfScope = [...new Set([...(m.outOfScope ?? []), ...o.outOfScope])];
  if (o.kind) {
    if (!["application", "terminological"].includes(o.kind)) throw new OkbError("--kind must be 'application' or 'terminological'.");
    m.kind = o.kind;
  }
  return [];
}

export function setConventions(ont: Ontology, o: Partial<Conventions>): Notes {
  const conv: Conventions = { ...naming.DEFAULT_CONVENTIONS, ...(ont.conventions ?? {}) };
  if (o.classCase) {
    if (!naming.CLASS_STYLES.includes(o.classCase)) throw new OkbError(`Class case must be one of: ${naming.CLASS_STYLES.join(", ")}.`);
    conv.classCase = o.classCase;
  }
  if (o.slotCase) {
    if (!naming.SLOT_STYLES.includes(o.slotCase)) throw new OkbError(`Slot case must be one of: ${naming.SLOT_STYLES.join(", ")}.`);
    conv.slotCase = o.slotCase;
  }
  if (o.instanceCase !== undefined) conv.instanceCase = o.instanceCase || null;
  if (o.classNumber) {
    if (!["singular", "plural"].includes(o.classNumber)) throw new OkbError("--number must be singular or plural.");
    conv.classNumber = o.classNumber;
  }
  if (o.slotAffix) {
    if (!["none", "has-prefix", "of-suffix"].includes(o.slotAffix)) throw new OkbError("--slot-affix must be none, has-prefix or of-suffix.");
    conv.slotAffix = o.slotAffix;
  }
  conv.source = "chosen";
  ont.meta.conventions = conv;
  const notes: Notes = [];
  const bad = [...ont.ofType("Class"), ...ont.ofType("Slot")].filter(
    (n) => n.name && naming.conventionalName(n.name, n.type as "Class", conv) !== n.name,
  );
  if (bad.length) notes.push(`${bad.length} existing name(s) don't fit this convention yet: ${bad.map((b) => b.name).join(", ")}. Use okb rename.`);
  return notes;
}

function ensureConventions(ont: Ontology, notes: Notes): Conventions {
  if (!ont.conventions) {
    ont.meta.conventions = { ...naming.DEFAULT_CONVENTIONS, source: "default" };
    notes.push("No naming convention was set, so okb is using its defaults: classes PascalCase and singular, slots camelCase. Confirm them with `okb convention` (or pick your own).");
  }
  return ont.conventions!;
}

function checkName(ont: Ontology, name: string, kind: "Class" | "Slot", force: boolean | undefined, notes: Notes, exclude?: string): void {
  const wasSet = Boolean(ont.conventions);
  const conv = ensureConventions(ont, notes);
  const whose = wasSet ? "your naming convention" : "the default naming convention (pick your own with `okb convention`)";
  if (kind === "Class" ? !naming.matches(name, conv.classCase) : naming.applySlotAffix(name, conv) !== name) {
    const want = naming.conventionalName(name, kind, conv);
    const style = kind === "Class" ? conv.classCase : conv.slotCase + (conv.slotAffix !== "none" ? ", " + conv.slotAffix : "");
    const msg = `'${name}' doesn't follow ${whose}: ${style}. Suggested: '${want}'.`;
    if (!force) throw new OkbError(`${msg} Re-run with the suggested name, or add --force to keep yours.`);
    notes.push(msg + " Kept as-is because of --force.");
  }
  if (kind === "Class" && naming.isPlural(naming.headWord(name)) !== (conv.classNumber === "plural")) {
    notes.push(`Note: '${name}' looks ${conv.classNumber === "plural" ? "singular" : "plural"}, but class names here are ${conv.classNumber}. If it's a proper name that just ends in 's' (like Sauternes), that's fine: record it with okb decision add ... --waives naming-singular-plural-consistent.`);
  }
  const clash = ont.ofType(kind).find((n) => n.id !== exclude && naming.key(n.name ?? "") === naming.key(name));
  if (clash) throw new OkbError(`There is already a ${kind.toLowerCase()} called '${clash.name}' (${clash.id}).`);
  if (kind === "Class") {
    const syn = ont.ofType("Class").find((cl) => cl.id !== exclude && (cl.synonyms ?? []).some((s: string) => naming.key(s) === naming.key(name)));
    if (syn) throw new OkbError(`'${name}' is already listed as a synonym of '${syn.name}'. Synonyms aren't separate classes (Ontology 101 §4.1).`);
    const sg = naming.key(naming.withHead(name, naming.singularize));
    const pair = ont.ofType("Class").find((cl) => cl.id !== exclude && naming.key(naming.withHead(cl.name, naming.singularize)) === sg);
    if (pair) notes.push(`Careful: '${name}' and '${pair.name}' look like the singular and plural of the same concept.`);
  }
}

// ------------------------------------------------------------------ competency questions, terms, reuse
export function addCQ(ont: Ontology, text: string): Notes {
  const id = ont.newId("CompetencyQuestion");
  ont.addNode({ type: "CompetencyQuestion", id, text, status: "draft" });
  const notes = [`Added ${id}.`];
  if (!text.trim().endsWith("?")) notes.push("Tip: phrase competency questions as actual questions.");
  return notes;
}

export function linkCQ(ont: Ontology, cqRef: string, refs: string[], unlink = false): Notes {
  const q = ont.find(cqRef, "CompetencyQuestion");
  const notes: Notes = [];
  for (const r of refs) {
    const n = ont.find(r, ["Class", "Slot", "Instance"]);
    if (unlink) ont.removeEdges((e) => e.from === q.id && e.type === "NEEDS" && e.to === n.id);
    else ont.addEdge(q.id, "NEEDS", n.id);
    notes.push(`${unlink ? "Unlinked" : "Linked"} ${q.id} ${unlink ? "from" : "→"} ${n.name} (${n.type}).`);
  }
  return notes;
}

export function addTerms(ont: Ontology, terms: string[], note?: string): Notes {
  const notes: Notes = [];
  for (const t of terms.map((x) => x.trim()).filter(Boolean)) {
    if (ont.ofType("Term").some((n) => naming.key(n.text) === naming.key(t))) {
      notes.push(`'${t}' is already on the list.`);
      continue;
    }
    ont.addNode({ type: "Term", id: ont.newId("Term", t), text: t, disposition: "undecided", ...(note ? { note } : {}) });
  }
  notes.push(`${ont.ofType("Term").length} term(s) on the list.`);
  return notes;
}

export function setTerm(ont: Ontology, ref: string, as: string, nodeRef?: string, note?: string): Notes {
  const t = ont.find(ref, "Term");
  if (!DISPOSITIONS.includes(as)) throw new OkbError(`--as must be one of: ${DISPOSITIONS.join(", ")}.`);
  t.disposition = as;
  if (note) t.note = note;
  ont.removeEdges((e) => e.from === t.id && e.type === "BECAME");
  const notes: Notes = [`'${t.text}' → ${as}.`];
  const typeFor: Record<string, string[]> = { class: ["Class"], slot: ["Slot"], instance: ["Instance"], value: ["Slot"], synonym: ["Class"] };
  if (nodeRef) {
    const n = ont.find(nodeRef, typeFor[as] ?? ["Class", "Slot", "Instance"]);
    ont.addEdge(t.id, "BECAME", n.id);
    notes.push(`Linked to ${n.type} '${n.name}'.`);
  } else if (typeFor[as]) {
    const guess = ont.find(t.text, typeFor[as], false);
    if (guess) {
      ont.addEdge(t.id, "BECAME", guess.id);
      notes.push(`Linked to ${guess.type} '${guess.name}'.`);
    }
  }
  return notes;
}

export function addReuse(ont: Ontology, o: { name: string; url?: string; decision: string; notes?: string }): Notes {
  const decisions = ["reuse", "adapt", "reference", "rejected"];
  if (!decisions.includes(o.decision)) throw new OkbError(`--decision must be one of: ${decisions.join(", ")}.`);
  ont.addNode({ type: "ReusedOntology", id: ont.newId("ReusedOntology", o.name), name: o.name, url: o.url, decision: o.decision, notes: o.notes });
  ont.meta.reuseReviewed = true;
  return [`Recorded '${o.name}' (${o.decision}).`];
}

export function reuseNone(ont: Ontology, why: string): Notes {
  ont.meta.reuseReviewed = true;
  addDecision(ont, { title: "No existing ontology reused", decision: "Build from scratch.", rationale: why, about: ["ontology"] });
  return ["Recorded that no existing ontology was reused, with your reason as a design decision."];
}

// ------------------------------------------------------------------ classes
export function addClass(ont: Ontology, name: string, o: { parents?: string[]; description?: string; synonyms?: string[]; abstract?: boolean; terminological?: boolean; force?: boolean } = {}): Notes {
  const notes: Notes = [];
  checkName(ont, name, "Class", o.force, notes);
  const parents = (o.parents ?? []).map((p) => ont.find(p, "Class"));
  const sg = (x: string) => naming.key(naming.withHead(x, naming.singularize));
  const pairParent = parents.find((p) => sg(p.name) === sg(name));
  if (pairParent) {
    throw new OkbError(`'${name}' can't be a subclass of '${pairParent.name}': they're the singular and plural of the same concept, so neither is a kind of the other (Ontology 101 §4.1: "a single Wine is not a kind of Wines"). Use one class.`);
  }
  checkParents(ont, parents.map((p) => p.id), name);
  const id = ont.newId("Class", name);
  const node: GraphNode = { type: "Class", id, name };
  if (o.description) node.description = o.description;
  if (o.synonyms?.length) node.synonyms = list(o.synonyms);
  if (o.abstract) node.abstract = true;
  if (o.terminological) node.terminological = true;
  ont.addNode(node);
  for (const p of parents) ont.addEdge(id, "IS_A", p.id);
  notes.unshift(`Added class ${name}${parents.length ? ` (a kind of ${parents.map((p) => p.name).join(" and ")})` : " at the top level"}.`);
  if (parents.length > 1) notes.push("Multiple parents are fine when it's truly a kind of each. Consider recording why with `okb decision add`.");
  for (const p of parents) {
    const sibs = ont.children(p.id).filter((k) => k !== id);
    if (sibs.length === 1 && !ont.disjointImplied(id, sibs[0])) {
      notes.push(`Can anything be both ${an(name)} and ${an(ont.label(sibs[0]))}? If not, say so: okb class disjoint "${name}" "${ont.label(sibs[0])}"`);
    }
  }
  const asValue = ont.ofType("Slot").find((s) => (s.allowedValues ?? []).some((v: string) => naming.key(v) === naming.key(name)));
  if (asValue) notes.push(`Careful: '${name}' is also an allowed value of the slot ${asValue.name}. Model it as a class OR a value, not both (okb explain decision.class-or-value).`);
  if (!o.description) notes.push(`Add a one-line description: okb class set "${name}" --desc "..."`);
  linkTermIfAny(ont, name, id, "class");
  return notes;
}

/** Refuse parents that are disjoint; warn about redundant ones. */
function checkParents(ont: Ontology, parents: string[], name: string, notes?: Notes): void {
  for (let i = 0; i < parents.length; i++) {
    for (let j = i + 1; j < parents.length; j++) {
      if (ont.disjointImplied(parents[i], parents[j])) {
        throw new OkbError(`${name} can't be under both ${ont.label(parents[i])} and ${ont.label(parents[j])}: they're declared disjoint, so nothing can be both (rule disjoint-no-shared-members).`);
      }
    }
  }
  for (const p of parents) {
    const via = parents.find((q) => q !== p && ont.ancestors(q).has(p));
    if (via) notes?.push(`Note: ${name} is already under ${ont.label(p)} through ${ont.label(via)}, so the direct link to ${ont.label(p)} is redundant (rule hier-no-redundant-isa).`);
  }
}

function linkTermIfAny(ont: Ontology, name: string, nodeId: string, as: string) {
  const t = ont.ofType("Term").find((x) => naming.key(naming.withHead(x.text, naming.singularize)) === naming.key(naming.withHead(name, naming.singularize)));
  if (t && (!t.disposition || t.disposition === "undecided")) {
    t.disposition = as;
    ont.addEdge(t.id, "BECAME", nodeId);
  }
}

export function setClass(ont: Ontology, ref: string, o: { description?: string; addParents?: string[]; removeParents?: string[]; synonyms?: string[]; abstract?: boolean; terminological?: boolean }): Notes {
  const cl = ont.find(ref, "Class");
  const notes: Notes = [];
  if (o.description !== undefined) cl.description = o.description;
  for (const p of o.addParents ?? []) {
    const pn = ont.find(p, "Class");
    if (pn.id === cl.id || ont.ancestors(pn.id).has(cl.id)) throw new OkbError(`${pn.name} is ${pn.id === cl.id ? "the same class" : `already below ${cl.name}`}; that would create a cycle (a class can't be its own ancestor).`);
    checkParents(ont, [...ont.parents(cl.id), pn.id], cl.name, notes);
    ont.addEdge(cl.id, "IS_A", pn.id);
    notes.push(`${cl.name} is now also a kind of ${pn.name}.`);
  }
  for (const p of o.removeParents ?? []) {
    const pn = ont.find(p, "Class");
    ont.removeEdges((e) => e.from === cl.id && e.type === "IS_A" && e.to === pn.id);
    notes.push(`${cl.name} is no longer under ${pn.name}.`);
  }
  if (o.synonyms?.length) cl.synonyms = [...new Set([...(cl.synonyms ?? []), ...list(o.synonyms)])];
  if (o.abstract !== undefined) cl.abstract = o.abstract || undefined;
  if (o.terminological !== undefined) cl.terminological = o.terminological || undefined;
  return notes.length ? notes : [`Updated ${cl.name}.`];
}

export function disjoint(ont: Ontology, refs: string[]): Notes {
  if (refs.length < 2) throw new OkbError("Name at least two classes.");
  const cs = refs.map((r) => ont.find(r, "Class"));
  const notes: Notes = [];
  for (let i = 0; i < cs.length; i++) {
    for (let j = i + 1; j < cs.length; j++) {
      const [a, b] = [cs[i], cs[j]];
      if (ont.isSub(a.id, b.id) || ont.isSub(b.id, a.id)) throw new OkbError(`${a.name} and ${b.name} are in the same line of the hierarchy; one can't be disjoint with its own ancestor.`);
      const exists = ont.edgesOf("DISJOINT_WITH").some((e) => (e.from === a.id && e.to === b.id) || (e.from === b.id && e.to === a.id));
      if (!exists) ont.addEdge(a.id, "DISJOINT_WITH", b.id);
    }
  }
  notes.push(`Declared disjoint: ${cs.map((x) => x.name).join(", ")}. Nothing can be more than one of these now.`);
  return notes;
}

// ------------------------------------------------------------------ values
export function parseAssignments(args: string[]): { slot: string; op: "=" | "+=" | "-="; raw: string }[] {
  return args.map((a) => {
    const m = a.match(/^([^=+\-][^=]*?)\s*(\+=|-=|=)(.*)$/s);
    if (!m) throw new OkbError(`Expected slot=value (or slot+=value / slot-=value), got '${a}'.`);
    return { slot: m[1].trim(), op: m[2] as "=", raw: m[3].trim() };
  });
}

function findSlotFor(ont: Ontology, ownerId: string, ref: string): GraphNode {
  const s = ont.find(ref, "Slot");
  if (!ont.applicableSlots(ownerId).includes(s.id)) {
    throw new OkbError(`'${s.name}' isn't a slot of ${ont.label(ownerId)} (attached to: ${ont.domain(s.id).map((d) => ont.label(d)).join(", ") || "nothing"}).`);
  }
  return s;
}

export function coerce(ont: Ontology, slot: GraphNode, raw: string, allowClass = false): unknown {
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

function splitValues(slot: GraphNode, raw: string): string[] {
  return slot.cardinality === "multiple" && slot.valueType !== "String" ? list(raw) : [raw];
}

/** Set values on an Instance (literal values / relationship edges) or a Class (fixed values). */
export function assign(ont: Ontology, ownerId: string, assignments: string[], mode: "value" | "fixed" = "value"): Notes {
  const owner = ont.get(ownerId)!;
  const field = owner.type === "Instance" ? "values" : "fixedValues";
  const notes: Notes = [];
  const firstFixed = mode === "fixed" && !ont.ofType("Class").some((c) => Object.keys(c.fixedValues ?? {}).length || ont.linkedSlots(c.id).length);
  for (const a of parseAssignments(assignments)) {
    const slot = findSlotFor(ont, ownerId, a.slot);
    const vals = a.raw === "" ? [] : splitValues(slot, a.raw).map((r) => coerce(ont, slot, r, owner.type === "Class"));
    if (slot.valueType === "Instance") {
      const current = ont.linked(ownerId, slot.id);
      const next = a.op === "=" ? (vals as string[]) : a.op === "+=" ? [...new Set([...current, ...(vals as string[])])] : current.filter((x) => !vals.includes(x));
      const f = ont.effectiveFacets(slot.id, ont.classContext(ownerId));
      for (const v of next) {
        if (!current.includes(v) && f.range.length) {
          const t = ont.get(v)!;
          const ok = t.type === "Instance"
            ? f.range.some((r) => ont.instanceClasses(v).has(r))
            : owner.type === "Class" && f.range.some((r) => ont.isSub(v, r));
          if (!ok) throw new OkbError(`${owner.name}.${slot.name} must point at ${f.range.map((r) => an(ont.label(r))).join(" or ")}; ${t.name} is ${an(t.type === "Instance" ? ont.targets(v, "INSTANCE_OF").map((c) => ont.label(c)).join("/") || "instance with no class" : "class outside that range")}.`);
        }
      }
      for (const gone of current.filter((x) => !next.includes(x))) ont.removeLink(ownerId, slot.id, gone);
      for (const v of next) ont.addLink(ownerId, slot.id, v);
      const spec = ont.linkSpec(slot.id)!;
      const shown = next.map((x) => ont.label(x)).join(", ") || "(nothing)";
      notes.push(`${owner.name}.${slot.name} ${mode === "fixed" ? "fixed to" : "="} ${shown}`);
      if (spec.reverse && next.length) {
        notes.push(`  (stored once as ${next.map((x) => `(${ont.label(x)})-[:${spec.type}]->(${owner.name})`).join(", ")}; ${slot.name} reads it backwards)`);
      }
    } else {
      owner[field] ??= {};
      const cur = owner[field][slot.id];
      const curList = cur === undefined ? [] : Array.isArray(cur) ? cur : [cur];
      const next = a.op === "=" ? vals : a.op === "+=" ? [...curList, ...vals] : curList.filter((x: unknown) => !vals.includes(x));
      if (slot.cardinality !== "multiple" && next.length > 1) throw new OkbError(`${slot.name} holds a single value; got ${next.length}.`);
      if (next.length === 0) delete owner[field][slot.id];
      else owner[field][slot.id] = slot.cardinality === "multiple" ? next : next[0];
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

// ------------------------------------------------------------------ slots
/** Relationship edge type for a slot, checked against structural edge types and other slots. */
function claimRelType(ont: Ontology, name: string, slotId: string): string {
  const t = naming.relType(name);
  const { edgeTypes } = MetaKB.get().formatRegistry();
  if (edgeTypes.has(t)) throw new OkbError(`A relationship called '${name}' would be stored as ${t}, which okb uses for its own structure. Pick another name.`);
  const other = ont.ofType("Slot").find((x) => x.id !== slotId && x.relType === t);
  if (other) throw new OkbError(`'${name}' would be stored as ${t}, which ${other.name} already uses. Pick another name.`);
  return t;
}

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
  const added = ont.get(id)!;
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
    const t = VALUE_TYPES.find((v) => v.toLowerCase() === o.type!.toLowerCase());
    if (!t) throw new OkbError(`--type must be one of ${VALUE_TYPES.join(", ")}.`);
    const wasRel = s.valueType === "Instance";
    s.valueType = t;
    if (t !== "Enumerated") delete s.allowedValues;
    if (t !== "Instance") {
      ont.removeEdges((e) => e.from === s.id && e.type === "RANGE");
      if (wasRel) {
        const n = ont.edgesOf(s.relType).length;
        if (ont.primarySlot(s.id) === s.id) ont.removeEdges((e) => e.type === s.relType);
        ont.removeEdges((e) => e.type === "INVERSE_OF" && (e.from === s.id || e.to === s.id));
        if (n) notes.push(`Removed ${n} ${s.relType} link(s): ${s.name} no longer links to other things.`);
      }
      delete s.relType;
    } else if (!s.relType) {
      s.relType = claimRelType(ont, s.name, s.id);
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
    if (!["single", "multiple"].includes(o.card)) throw new OkbError("--card must be single or multiple.");
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
  if (sa.valueType !== "Instance" || sb.valueType !== "Instance") throw new OkbError("Only relationships (Instance slots) can be inverses.");
  if (sa.id === sb.id) throw new OkbError("A relationship can't be its own inverse here; for symmetric relationships just use one.");
  for (const x of [sa, sb]) {
    if (ont.inverses(x.id).length) throw new OkbError(`${x.name} already has an inverse (${ont.inverses(x.id).map((i) => ont.label(i)).join(", ")}).`);
  }
  // Move any edges stored under b's own type onto a's type, reversed: one edge per fact.
  const moved = ont.edgesOf(sb.relType);
  ont.removeEdges((e) => e.type === sb.relType);
  for (const e of moved) {
    const existing = ont.outEdges(e.to, sa.relType).find((x) => x.to === e.from);
    if (existing) Object.assign(existing, edgeProps(e));
    else ont.addEdge(e.to, sa.relType, e.from, edgeProps(e));
  }
  // Edge-property declarations follow the stored side.
  if (sb.edgeProperties?.length) sa.edgeProperties = [...(sa.edgeProperties ?? []), ...sb.edgeProperties.filter((p: any) => !(sa.edgeProperties ?? []).some((q: any) => q.name === p.name))];
  ont.addEdge(sa.id, "INVERSE_OF", sb.id);
  return [
    `${sa.name} and ${sb.name} are now inverses: one relationship read from both ends.`,
    `Stored as (${ont.domain(sa.id).map((d) => ont.label(d)).join("|") || "?"})-[:${sa.relType}]->(${ont.range(sa.id).map((d) => ont.label(d)).join("|") || "?"}); ${sb.name} follows ${sa.relType} backwards, so nothing is stored twice.${moved.length ? ` Moved ${moved.length} existing ${sb.relType} edge(s) onto ${sa.relType}.` : ""}`,
  ];
}

// ------------------------------------------------------------------ edge properties
// A relationship's edges can carry properties that qualify that one link (a
// condition, a weight, a date) plus a reserved `rule` reference to the Rule node
// that justifies it. Declaring them gives them facets, just like slots.

export const EDGE_VALUE_TYPES = ["String", "Integer", "Float", "Number", "Boolean", "Enumerated"];
const RESERVED_EDGE_KEYS = new Set(["from", "to", "type", "rule"]);

export function declareEdgeProperty(ont: Ontology, relRef: string, name: string, o: { type?: string; values?: string[]; required?: boolean; description?: string; remove?: boolean }): Notes {
  const rel = ont.get(ont.primarySlot(ont.find(relRef, "Slot").id))!;
  if (rel.valueType !== "Instance") throw new OkbError(`${rel.name} is a property, not a relationship; only relationships have edge properties.`);
  const decls: any[] = (rel.edgeProperties ??= []);
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
  const decl = { name, valueType: t, ...(t === "Enumerated" ? { allowedValues: list(o.values) } : {}), ...(o.required ? { required: true } : {}), ...(o.description ? { description: o.description } : {}) };
  const i = decls.findIndex((d) => d.name === name);
  if (i >= 0) decls[i] = decl;
  else decls.push(decl);
  return [`${rel.name} edges can now carry ${name} (${t}${decl.required ? ", required" : ""}): (…)-[:${rel.relType} {${name}: …}]->(…)`];
}

function coerceEdgeValue(decl: any, raw: string, relName: string): unknown {
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
      const hit = (decl.allowedValues ?? []).find((v: string) => naming.key(v) === naming.key(raw));
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
  const primary = ont.get(ont.primarySlot(slot.id))!;
  const decls: any[] = primary.edgeProperties ?? [];
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
  const existing = ont.linkEdge(owner.id, slot.id, target.id);
  if (!existing) {
    // New value: same range/cardinality rules as okb instance set.
    const current = ont.linked(owner.id, slot.id);
    const f = ont.effectiveFacets(slot.id, ont.classContext(owner.id));
    if (f.max !== null && current.length + 1 > f.max) {
      throw new OkbError(`${owner.name}.${slot.name} allows at most ${f.max} value(s) and already has ${current.map((x) => ont.label(x)).join(", ")}. Remove one first (okb unlink ...).`);
    }
    assign(ont, owner.id, [`${slot.name}+=${target.name}`], owner.type === "Class" ? "fixed" : "value");
  }
  const edge = ont.linkEdge(owner.id, slot.id, target.id)!;
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
  if (!ont.linkEdge(owner.id, slot.id, target.id)) throw new OkbError(`${owner.name} isn't linked to ${target.name} by ${slot.name}.`);
  ont.removeLink(owner.id, slot.id, target.id);
  return [`Removed ${owner.name} ${slot.name} ${target.name} (and its edge properties).`];
}

// ------------------------------------------------------------------ instances
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
  ont.addNode({ type: "Instance", id, name, ...(o.description ? { description: o.description } : {}), values: {} });
  for (const cl of classes) ont.addEdge(id, "INSTANCE_OF", cl.id);
  notes.unshift(`Added ${name} (${classes.map((x) => an(x.name)).join(" and ")}).`);
  if (o.assignments?.length) notes.push(...assign(ont, id, o.assignments));
  // Fill in defaults (most specific class first, then the slot's own default).
  const ctx = [...classes.map((x) => x.id), ...classes.flatMap((x) => [...ont.ancestors(x.id)])];
  for (const sid of ont.applicableSlots(id)) {
    if (ont.statedValues(id, sid).length || ont.inheritedFixed(sid, ctx)) continue;
    const s = ont.get(sid)!;
    const fromClass = ctx.map((c) => ont.get(c)!.defaults?.[sid]).find((v) => v !== undefined);
    const dv = fromClass ?? s.default;
    if (dv === undefined) continue;
    if (s.valueType === "Instance") ont.addLink(id, sid, dv);
    else ont.get(id)!.values[sid] = s.cardinality === "multiple" ? [dv] : dv;
    notes.push(`Filled in default ${s.name} = ${JSON.stringify(dv)}.`);
  }
  const missing = ont.applicableSlots(id).filter((sid) => {
    const f = ont.effectiveFacets(sid, ont.instanceClasses(id));
    return f.min > 0 && ont.statedValues(id, sid).length < f.min && !ont.inheritedFixed(sid, ont.instanceClasses(id));
  });
  if (missing.length) notes.push(`Still required: ${missing.map((m) => ont.label(m)).join(", ")}. okb instance set "${name}" ${ont.label(missing[0])}=...`);
  return notes;
}

// ------------------------------------------------------------------ decisions, rename, remove
export function addDecision(ont: Ontology, o: { title: string; decision: string; question?: string; rationale?: string; alternatives?: string[]; about?: string[]; waives?: string[] }): Notes {
  const meta = MetaKB.get();
  for (const r of o.waives ?? []) {
    const rule = meta.rules.get(r);
    if (!rule) throw new OkbError(`Unknown rule '${r}'. See okb explain for the list.`);
    if (rule.severity === "error") throw new OkbError(`'${r}' is a MUST rule; a design decision can explain warnings and hints but can't waive an error. Fix it instead.`);
  }
  const id = ont.newId("DesignDecision");
  ont.addNode({
    type: "DesignDecision", id, title: o.title, decision: o.decision, question: o.question, rationale: o.rationale,
    alternatives: o.alternatives?.length ? o.alternatives : undefined, metaRules: o.waives?.length ? o.waives : undefined,
    date: new Date().toISOString().slice(0, 10),
  });
  for (const a of o.about ?? []) ont.addEdge(id, "ABOUT", a === "ontology" ? "ontology" : ont.find(a).id);
  const notes = [`Recorded design decision ${id}: ${o.title}.`];
  if (o.waives?.length) {
    const explained = runChecks(ont, { all: true, only: o.waives }).filter((f) => f.explainedBy === id).length;
    notes.push(explained
      ? `It explains ${explained} current finding(s) from ${o.waives.join(", ")} (they'll show as 'explained' in okb validate).`
      : `Note: it doesn't match any current finding from ${o.waives.join(", ")}. Check the --about target (a decision about a class also covers its subclasses).`);
  }
  if (!o.rationale) notes.push("Tip: add --why so future readers know the reason, not just the choice.");
  return notes;
}

export function rename(ont: Ontology, ref: string, next: string, force = false): Notes {
  const n = ont.find(ref, ["Class", "Slot", "Instance", "ReusedOntology"]);
  const notes: Notes = [];
  if (n.type === "Class" || n.type === "Slot") {
    checkName(ont, next, n.type, force, notes, n.id);
  } else if (ont.ofType(n.type).some((x) => x.id !== n.id && naming.key(x.name) === naming.key(next))) {
    throw new OkbError(`There is already a ${n.type} called '${next}'.`);
  }
  const old = n.name;
  if (n.type === "Slot" && n.valueType === "Instance") {
    const t = claimRelType(ont, next, n.id);
    if (t !== n.relType) {
      if (ont.primarySlot(n.id) === n.id) {
        for (const e of ont.edges) if (e.type === n.relType) e.type = t;
        ont.reindex();
        notes.push(`Its links are now stored as ${t} (were ${n.relType}).`);
      }
      n.relType = t;
    }
  }
  n.name = next;
  notes.unshift(`Renamed ${n.type} '${old}' → '${next}' (id ${n.id} unchanged).`);
  return notes;
}

export function remove(ont: Ontology, ref: string, types?: string[]): Notes {
  const n = ont.find(ref, types);
  if (n.id === "ontology") throw new OkbError("You can't remove the Ontology node.");
  const notes: Notes = [];
  const slotsBefore = new Map(ont.ofType("Slot").map((s) => [s.id, { domain: ont.domain(s.id).length, range: ont.range(s.id).length }]));
  if (n.type === "Class") {
    const kids = ont.children(n.id);
    const parents = ont.parents(n.id);
    for (const k of kids) for (const p of parents) ont.addEdge(k, "IS_A", p);
    if (kids.length) notes.push(`Its subclasses (${kids.map((k) => ont.label(k)).join(", ")}) moved up to ${parents.length ? parents.map((p) => ont.label(p)).join(", ") : "the top level"}.`);
    const inst = ont.sources(n.id, "INSTANCE_OF");
    if (inst.length && parents.length) {
      for (const i of inst) for (const p of parents) ont.addEdge(i, "INSTANCE_OF", p);
      notes.push(`Its instances (${inst.map((i) => ont.label(i)).join(", ")}) now belong to ${parents.map((p) => ont.label(p)).join(", ")}.`);
    } else if (inst.length) {
      throw new OkbError(`${n.name} has instances (${inst.map((i) => ont.label(i)).join(", ")}) and no parent to move them to. Move them first: okb instance set "<name>" --of <OtherClass>`);
    }
  }
  if (n.type === "Slot" && n.valueType === "Instance" && ont.primarySlot(n.id) === n.id) {
    const inv = ont.targets(n.id, "INVERSE_OF")[0];
    if (inv) {
      const invNode = ont.get(inv)!;
      const moved = ont.edgesOf(n.relType);
      ont.removeEdges((e) => e.type === n.relType || (e.type === "INVERSE_OF" && e.from === n.id));
      for (const e of moved) ont.addEdge(e.to, invNode.relType, e.from, edgeProps(e));
      if (n.edgeProperties?.length && !invNode.edgeProperties?.length) invNode.edgeProperties = n.edgeProperties;
      notes.push(`Its ${moved.length} link(s) are kept, now stored from the other end as ${invNode.relType} (${invNode.name}).`);
    }
  }
  for (const t of ont.ofType("Term")) {
    if (ont.targets(t.id, "BECAME").includes(n.id)) {
      t.disposition = "undecided";
      notes.push(`Term '${t.text}' is undecided again.`);
    }
  }
  ont.removeNode(n.id);
  for (const [sid, before] of slotsBefore) {
    if (sid === n.id) continue;
    if (before.domain > 0 && ont.domain(sid).length === 0) notes.push(`Warning: slot ${ont.label(sid)} is no longer attached to any class. Attach it (okb slot set ${ont.label(sid)} --on <Class>) or remove it.`);
    if (before.range > 0 && ont.range(sid).length < before.range) notes.push(`Warning: slot ${ont.label(sid)}'s range lost ${n.name}${ont.range(sid).length ? "" : ", and is now empty"}.`);
  }
  notes.unshift(`Removed ${n.type} '${n.name ?? n.text ?? n.id}'.`);
  return notes;
}

/** Change which class(es) an instance belongs to, keeping its values. */
export function setInstanceClasses(ont: Ontology, ref: string, classes: string[]): Notes {
  const inst = ont.find(ref, "Instance");
  const cs = classes.map((c) => ont.find(c, "Class"));
  for (const c of cs) if (c.abstract) throw new OkbError(`${c.name} is abstract, so it can't have direct instances.`);
  checkParents(ont, cs.map((c) => c.id), inst.name);
  ont.removeEdges((e) => e.from === inst.id && e.type === "INSTANCE_OF");
  for (const c of cs) ont.addEdge(inst.id, "INSTANCE_OF", c.id);
  const lost = [...Object.keys(inst.values ?? {}), ...ont.linkedSlots(inst.id)].filter((s) => !ont.applicableSlots(inst.id).includes(s));
  const notes = [`${inst.name} is now ${cs.map((c) => an(c.name)).join(" and ")}.`];
  if (lost.length) notes.push(`Warning: its values for ${[...new Set(lost)].map((s) => ont.label(s)).join(", ")} don't apply to the new class. Remove them (okb instance set "${inst.name}" <slot>=) or pick another class.`);
  return notes;
}
