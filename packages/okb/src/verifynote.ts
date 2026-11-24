// Suggested verification notes (issue #138): what a verifier could write after OVERREACH, built from
// the difference between the original draft and the correction. Pure text in, text out; nothing here
// stores anything.
import type { Modality } from "@ontology-kit/reader";

const MODALITY = /\b(MUST\s+NOT|SHOULD\s+NOT|MUST|SHOULD|MAY)\b/gi;
const keyword = (m: string): string => m.toUpperCase().replace(/\s+/g, " ");
const NUMBER = /\d+(?:[.,]\d+)*/g;
const WORD = /[\p{L}'-]+/gu;
/** Strongest first, so a drop in rank reads as narrowing. */
const RANK = ["MUST NOT", "MUST", "SHOULD NOT", "SHOULD", "MAY"];
/** A diff longer than this is a rewrite, and a list of words wouldn't name it. */
const MAX_WORDS = 4;

const found = (text: string, re: RegExp): string[] => [...text.matchAll(re)].map((m) => m[0]);
const quote = (words: string[]): string => words.map((w) => `"${w}"`).join(", ");

/** Items in `a` that `b` doesn't have, counting repeats. */
function without(a: string[], b: string[]): string[] {
  const left = [...b];
  return a.filter((x) => {
    const i = left.indexOf(x);
    if (i < 0) return true;
    left.splice(i, 1);
    return false;
  });
}

/** Words minus the modality and number tokens, which the other parts of the suggestion name. */
function plainWords(text: string): string[] {
  return found(text.replace(MODALITY, " ").replace(NUMBER, " "), WORD).map((w) => w.toLowerCase());
}

/**
 * One sentence naming what changed: a modality, a number, or a few words. Null when the difference
 * can't be named this way (a rewording, or a change too big to list), so the caller falls back to the
 * generic tip.
 */
export function suggestNote(original: string, corrected: string): string | null {
  const parts: string[] = [];

  const m0 = found(original, MODALITY).map(keyword);
  const m1 = found(corrected, MODALITY).map(keyword);
  if (m0.length && m0.length === m1.length) {
    const i = m0.findIndex((m, k) => m !== m1[k]);
    if (i >= 0) {
      const [r0, r1] = [RANK.indexOf(m0[i]), RANK.indexOf(m1[i])];
      // MUST NOT to MUST (or the other way) flips the meaning; it is neither narrower nor stronger.
      const flips = m0[i].endsWith("NOT") !== m1[i].endsWith("NOT");
      parts.push(`${flips ? "changed" : r1 > r0 ? "narrowed" : "strengthened"} ${m0[i]} to ${m1[i]}`);
    }
  } else if (m0.join() !== m1.join()) return null;

  const n0 = found(original, NUMBER);
  const n1 = found(corrected, NUMBER);
  const goneN = without(n0, n1);
  const newN = without(n1, n0);
  if (goneN.length && goneN.length === newN.length) parts.push(`changed ${goneN.join(", ")} to ${newN.join(", ")}`);
  else {
    if (goneN.length) parts.push(`removed ${goneN.join(", ")}`);
    if (newN.length) parts.push(`added ${newN.join(", ")}`);
  }

  const w0 = plainWords(original);
  const w1 = plainWords(corrected);
  const goneW = without(w0, w1);
  const newW = without(w1, w0);
  if (goneW.length > MAX_WORDS || newW.length > MAX_WORDS) return null;
  if (goneW.length && newW.length && goneW.length === newW.length && goneW.length <= 2) parts.push(`replaced ${quote(goneW)} with ${quote(newW)}`);
  else {
    if (goneW.length) parts.push(`removed ${quote(goneW)}`);
    if (newW.length) parts.push(`added ${quote(newW)}`);
  }
  return parts.length ? parts.join("; ") : null;
}

/**
 * The one modality a statement states in capitals (`... SHOULD be ...` is SHOULD, `MUST NOT` is MUST_NOT), or null
 * when it states none or more than one. Lower-case "may" or "should" is ordinary prose and doesn't count.
 */
export function statedModality(statement: string): Modality | null {
  const found = new Set([...statement.matchAll(/\b(MUST\s+NOT|SHOULD\s+NOT|MUST|SHOULD|MAY)\b/g)].map((m) => m[1].replace(/\s+/g, "_")));
  return found.size === 1 ? ([...found][0] as Modality) : null;
}

/** A double-quoted shell argument. */
export const shellQuote = (s: string): string => `"${s.replace(/(["\\$`])/g, "\\$1")}"`;

export const GENERIC_NOTE_TIP =
  'Tip: add a note so a reviewer sees why, not just the verdict: --note "<one sentence naming the word or number you changed>". Skip it when the correction speaks for itself.';
export const UNSUPPORTED_NOTE_TIP =
  'Tip: add --note "<which part of the statement the quote doesn\'t support>". One sentence naming the word or claim; don\'t restate UNSUPPORTED.';

/** Lines to print after OVERREACH with no --note. */
export function overreachNoteTips(id: string, original: string, corrected: string, extra: string): string[] {
  const s = suggestNote(original, corrected);
  if (!s) return [GENERIC_NOTE_TIP];
  return [`Suggested note: ${s}`, `To store it: okb verify ${id} --status OVERREACH --corrected ${shellQuote(corrected)} --note ${shellQuote(s)}${extra}`];
}
