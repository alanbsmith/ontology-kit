/** Naming conventions, and the checks every new class or slot name goes through. */
import * as naming from "../naming.ts";
import { OkbError, type Ontology } from "../model.ts";
import type { Conventions } from "../types.ts";
import type { Notes } from "./common.ts";

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

export function checkName(ont: Ontology, name: string, kind: "Class" | "Slot", force: boolean | undefined, notes: Notes, exclude?: string): void {
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
