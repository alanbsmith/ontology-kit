/** Creating an ontology, design decisions, renaming and removing. */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import * as naming from "../naming.ts";
import { runChecks } from "../checks.ts";
import { today } from "../clock.ts";
import { MetaKB } from "../metakb.ts";
import { FORMAT, MANIFEST, OkbError, Ontology, nameOrText, type Manifest, type NodeType } from "@ontology-kit/format";
import type { Notes } from "./common.ts";
import { checkName } from "./naming.ts";

/** Start an empty ontology folder: the manifest, the one Ontology node, no edges. Saved before it returns. */
export function createOntology(root: string, name: string): Ontology {
  mkdirSync(root, { recursive: true });
  if (existsSync(join(root, MANIFEST))) throw new OkbError(`${root} already contains an ontology (${MANIFEST}).`);
  const manifest: Manifest = { format: FORMAT, name, currentStep: 1, created: today() };
  const ont = new Ontology(resolve(root), manifest, [], []);
  ont.addNode({
    type: "Ontology", id: "ontology", name, domain: "", purpose: "", users: [], maintainers: [],
    outOfScope: [], kind: "application", reuseReviewed: false,
  });
  ont.save();
  // Keep the lock file and half-written temp files out of git (a team keeps the folder in a repository).
  const ignore = join(root, ".gitignore");
  if (!existsSync(ignore)) writeFileSync(ignore, ".okb.lock\n*.tmp\n");
  return ont;
}

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
    date: today(),
  });
  for (const a of o.about ?? []) ont.addEdge(id, "ABOUT", a === "ontology" ? "ontology" : ont.find(a).id);
  const notes = [`Recorded design decision ${id}: ${o.title}.`];
  if (o.waives?.length) {
    const explained = runChecks(ont, { all: true, only: o.waives }).findings.filter((f) => f.explainedBy === id).length;
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
    const oldType = n.relType;
    const retyped = ont.rel.rename(n, next);
    if (retyped) notes.push(`Its links are now stored as ${retyped.to} (were ${retyped.from}).`);
    if (oldType && n.relType && n.relType !== oldType) n.formerRelTypes = remember(n.formerRelTypes, oldType, n.relType);
  }
  if (n.type !== "ReusedOntology" && old !== next) n.formerNames = remember(n.formerNames, old, next);
  n.name = next;
  ont.touch(n);
  notes.unshift(`Renamed ${n.type} '${old}' → '${next}' (id ${n.id} unchanged).`);
  if (n.type !== "ReusedOntology" && old !== next) notes.push(`Kept '${old}' as a former name, so a release's change log can map old to new.`);
  return notes;
}

/** The former names after a rename: `old` goes on the end (oldest first), and a name that comes back is no longer former. */
function remember(former: string[] | undefined, old: string, next: string): string[] {
  return [...(former ?? []).filter((x) => x !== old && x !== next), old];
}

export function remove(ont: Ontology, ref: string, types?: NodeType[]): Notes {
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
  if (n.type === "Slot") {
    const kept = ont.rel.drop(n);
    if (kept) notes.push(`Its ${kept.links} link(s) are kept, now stored from the other end as ${kept.type} (${kept.name}).`);
  }
  for (const t of ont.ofType("Term")) {
    if (ont.targets(t.id, "BECAME").includes(n.id)) {
      t.disposition = "undecided";
      ont.touch(t);
      notes.push(`Term '${t.text}' is undecided again.`);
    }
  }
  ont.removeNode(n.id);
  for (const [sid, before] of slotsBefore) {
    if (sid === n.id) continue;
    if (before.domain > 0 && !ont.isAttached(sid)) notes.push(`Warning: slot ${ont.label(sid)} is no longer attached to any class. Attach it (okb slot set ${ont.label(sid)} --on <Class>) or remove it.`);
    if (before.range > 0 && ont.range(sid).length < before.range) notes.push(`Warning: slot ${ont.label(sid)}'s range lost ${nameOrText(n)}${ont.range(sid).length ? "" : ", and is now empty"}.`);
  }
  notes.unshift(`Removed ${n.type} '${nameOrText(n) ?? n.id}'.`);
  return notes;
}

/** Change which class(es) an instance belongs to, keeping its values. */
