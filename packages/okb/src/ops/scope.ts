/** Step 1 to 3: scope, competency questions, reuse, and the brainstormed term list. */
import * as naming from "../naming.ts";
import { questionFamilies } from "../families.ts";
import { OkbError, type Ontology } from "../model.ts";
import { DISPOSITIONS, isOneOf, type Disposition, type ReusedOntologyNode } from "../types.ts";
import { splitList as list, type Notes } from "./common.ts";
import { addDecision } from "./admin.ts";

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
    if (!isOneOf(["application", "terminological"], o.kind)) throw new OkbError("--kind must be 'application' or 'terminological'.");
    m.kind = o.kind;
  }
  return [];
}

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
  if (!unlink) notes.push(familyTip(ont, q.id));
  return notes;
}

/**
 * Once a question is answered, suggest its family (rule scope-cq-families): the same
 * question about similar things, and more about the same subject. One line, and
 * only after something is built, so nobody has to list every question up front.
 */
export function familyTip(ont: Ontology, cqId: string): string {
  // Two subjects at most keeps it to one readable line; okb review lists them all.
  const parts = questionFamilies(ont, cqId).slice(0, 2).map((f) => {
    const same = f.sameQuestionAbout.length ? `the same question about ${f.sameQuestionAbout.join(", ")}` : "";
    const more = f.moreAbout.length ? `more about ${f.subject} (${f.moreAbout.join(", ")})` : "";
    return [same, more].filter(Boolean).join(", or ");
  });
  const ideas = parts.length ? ` Would you also ask ${parts.join("; ")}?` : "";
  return `Tip: ${cqId} is one example of a family of questions.${ideas} Add the ones you want (okb cq add "..."), note the rest as out of scope (okb scope --out-of-scope "..."), or keep it narrow.`;
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
  if (!isOneOf(DISPOSITIONS, as)) throw new OkbError(`--as must be one of: ${DISPOSITIONS.join(", ")}.`);
  t.disposition = as;
  if (note) t.note = note;
  ont.removeEdges((e) => e.from === t.id && e.type === "BECAME");
  const notes: Notes = [`'${t.text}' → ${as}.`];
  const typeFor: Partial<Record<Disposition, ("Class" | "Slot" | "Instance")[]>> = { class: ["Class"], slot: ["Slot"], instance: ["Instance"], value: ["Slot"], synonym: ["Class"] };
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
  const decisions: ReusedOntologyNode["decision"][] = ["reuse", "adapt", "reference", "rejected"];
  if (!isOneOf(decisions, o.decision)) throw new OkbError(`--decision must be one of: ${decisions.join(", ")}.`);
  ont.addNode({ type: "ReusedOntology", id: ont.newId("ReusedOntology", o.name), name: o.name, url: o.url, decision: o.decision, notes: o.notes });
  ont.meta.reuseReviewed = true;
  return [`Recorded '${o.name}' (${o.decision}).`];
}

export function reuseNone(ont: Ontology, why: string): Notes {
  ont.meta.reuseReviewed = true;
  addDecision(ont, { title: "No existing ontology reused", decision: "Build from scratch.", rationale: why, about: ["ontology"] });
  return ["Recorded that no existing ontology was reused, with your reason as a design decision."];
}

export function linkTermIfAny(ont: Ontology, name: string, nodeId: string, as: Disposition) {
  const t = ont.ofType("Term").find((x) => naming.key(naming.withHead(x.text, naming.singularize)) === naming.key(naming.withHead(name, naming.singularize)));
  if (t && (!t.disposition || t.disposition === "undecided")) {
    t.disposition = as;
    ont.addEdge(t.id, "BECAME", nodeId);
  }
}
