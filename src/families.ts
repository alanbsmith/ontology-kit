/**
 * A competency question is one example of a type of question (Ontology 101 calls
 * them "just a sketch"). This finds its family in the current ontology, for the
 * `okb cq link` hint and the scope-cq-families review:
 *   - the same question about similar things: sibling classes, subclasses, or
 *     other instances of the same class
 *   - more questions about the same subject: its slots that no question uses yet
 * Things another question already needs are left out (they're covered), and each
 * suggestion appears once, under the first subject it came up for.
 */
import type { Ontology } from "./model.ts";

export interface QuestionFamily {
  /** What the question is about (a class, instance, or a slot's class). */
  subject: string;
  /** Similar things the same question could be asked about. */
  sameQuestionAbout: string[];
  /** The subject's slots no question uses yet. */
  moreAbout: string[];
}

/** At most this many suggestions per list, so a hint stays one line. */
const MAX_SUGGESTIONS = 4;

export function questionFamilies(ont: Ontology, cqId: string): QuestionFamily[] {
  const needed = new Set(ont.edgesOf("NEEDS").map((e) => e.to));
  const suggested = new Set<string>();
  const fresh = (ids: Iterable<string>) => {
    const out = [...new Set(ids)].filter((id) => !needed.has(id) && !suggested.has(id));
    for (const id of out) suggested.add(id);
    return out;
  };
  const labels = (ids: string[]) => ids.slice(0, MAX_SUGGESTIONS).map((id) => ont.label(id));
  const families: QuestionFamily[] = [];
  const seen = new Set<string>();
  for (const id of ont.targets(cqId, "NEEDS")) {
    const n = ont.get(id);
    if (!n) continue;
    let subject = id;
    let same: string[] = [];
    if (n.type === "Class") {
      const siblings = ont.parents(id).flatMap((p) => ont.children(p)).filter((c) => c !== id);
      same = fresh([...siblings, ...ont.children(id)]);
    } else if (n.type === "Instance") {
      same = fresh(ont.targets(id, "INSTANCE_OF").flatMap((c) => ont.sources(c, "INSTANCE_OF")).filter((i) => i !== id));
    } else {
      // A slot: the question is about the class that has it.
      subject = ont.domain(id)[0] ?? id;
    }
    if (seen.has(subject)) continue;
    seen.add(subject);
    const more = fresh(ont.get(subject)?.type === "Slot" ? [] : ont.applicableSlots(subject));
    if (same.length || more.length) families.push({ subject: ont.label(subject), sameQuestionAbout: labels(same), moreAbout: labels(more) });
  }
  return families;
}
