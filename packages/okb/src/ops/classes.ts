/** The class hierarchy: adding and changing classes, parents and disjointness. */
import * as naming from "../naming.ts";
import { OkbError, type Ontology } from "../model.ts";
import type { ClassNode } from "../types.ts";
import { an, splitList as list, type Notes } from "./common.ts";
import { checkName } from "./naming.ts";
import { linkTermIfAny } from "./scope.ts";

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
  const node: ClassNode = { type: "Class", id, name };
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
export function checkParents(ont: Ontology, parents: string[], name: string, notes?: Notes): void {
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
