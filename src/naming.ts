/** Name styles, conversion, and singular/plural guessing. */
import type { Conventions } from "./types.ts";

export const CLASS_STYLES = ["PascalCase", "Title Case", "snake_case", "kebab-case", "Sentence case"];
export const SLOT_STYLES = ["camelCase", "snake_case", "kebab-case", "lower case"];

export const DEFAULT_CONVENTIONS: Conventions = {
  classCase: "PascalCase",
  slotCase: "camelCase",
  instanceCase: null, // instances are proper names; free text by default
  classNumber: "singular",
  slotAffix: "none",
};

/** 'Rosé' -> 'Rose': decompose, then drop the combining marks. */
export function stripAccents(s: string): string {
  return s.normalize("NFKD").replace(/\p{M}/gu, "");
}

function splitWords(name: string, keepDots = false): string[] {
  const s = name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
  return s.split(keepDots ? /[^A-Za-z0-9.]+/ : /[^A-Za-z0-9]+/).filter(Boolean);
}

/** 'RedWine' / 'red_wine' / 'Red wine' -> ['red', 'wine'] */
export function tokens(name: string): string[] {
  return splitWords(name).map((t) => t.toLowerCase());
}

/** Words with original capitalization (and trailing dots kept, for abbreviation checks). */
export function rawTokens(name: string): string[] {
  return splitWords(name, true);
}

/** Case- and delimiter-insensitive identity for uniqueness checks. */
export function key(name: string): string {
  return stripAccents(name)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function slug(name: string): string {
  const ts = tokens(stripAccents(name));
  return ts.length ? ts.join("-") : "x";
}

const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

export function convert(name: string, style: string): string {
  const ws = tokens(name);
  if (ws.length === 0) return name;
  switch (style) {
    case "PascalCase":
      return ws.map(cap).join("");
    case "camelCase":
      return ws[0] + ws.slice(1).map(cap).join("");
    case "Title Case":
      return ws.map(cap).join(" ");
    case "Sentence case":
      return cap(ws.join(" "));
    case "snake_case":
      return ws.join("_");
    case "kebab-case":
      return ws.join("-");
    case "lower case":
      return ws.join(" ");
    default:
      return name;
  }
}

const PATTERNS: Record<string, RegExp> = {
  PascalCase: /^[A-Z][A-Za-z0-9]*$/,
  camelCase: /^[a-z][A-Za-z0-9]*$/,
  "Title Case": /^[A-Z0-9][A-Za-z0-9'’]*( [A-Z0-9][A-Za-z0-9'’]*)*$/,
  "Sentence case": /^[A-Z0-9][a-z0-9'’]*( [a-z0-9][a-z0-9'’]*)*$/,
  snake_case: /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/,
  "kebab-case": /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/,
  "lower case": /^[a-z][a-z0-9]*( [a-z0-9]+)*$/,
};

export function matches(name: string, style: string | null | undefined): boolean {
  if (!style) return true;
  const re = PATTERNS[style];
  return re ? re.test(name) : true;
}

// ------------------------------------------------------------------ plurals
const INVARIANT = new Set([
  "series", "species", "sheep", "fish", "deer", "news", "means", "glass", "class", "status", "analysis",
  "basis", "axis", "gas", "bus", "chaos", "canvas", "lens", "corps", "cross", "business", "process",
  "address", "access", "boss", "rose", "bordeaux", "physics", "mathematics", "economics", "data", "media",
  "metadata", "software", "hardware", "information", "equipment", "cheese", "vs", "cotes", "alsace",
]);
const IRREGULAR_PL: Record<string, string> = {
  people: "person", children: "child", men: "man", women: "woman", mice: "mouse", geese: "goose",
  feet: "foot", teeth: "tooth", criteria: "criterion", phenomena: "phenomenon", indices: "index",
  matrices: "matrix", vertices: "vertex",
};
const IRREGULAR_SG: Record<string, string> = Object.fromEntries(Object.entries(IRREGULAR_PL).map(([p, s]) => [s, p]));

const plain = (w: string) => stripAccents(w).toLowerCase();

export function isPlural(word: string): boolean {
  const w = plain(word);
  if (w in IRREGULAR_PL) return true;
  if (INVARIANT.has(w) || w in IRREGULAR_SG || w.length <= 3) return false;
  if (/(ss|us|is|ous|ics|ness|sis|xis)$/.test(w)) return false;
  return w.endsWith("s");
}

function matchCase(original: string, next: string): string {
  return /^[A-Z]/.test(original) ? cap(next) : next;
}

export function singularize(word: string): string {
  const w = word.toLowerCase();
  let out: string;
  if (w in IRREGULAR_PL) out = IRREGULAR_PL[w];
  else if (!isPlural(word)) return word;
  else if (w.endsWith("ies") && w.length > 4) out = w.slice(0, -3) + "y";
  else if (/(ches|shes|xes|zes|sses)$/.test(w)) out = w.slice(0, -2);
  else out = w.slice(0, -1);
  return matchCase(word, out);
}

export function pluralize(word: string): string {
  const w = word.toLowerCase();
  let out: string;
  if (w in IRREGULAR_SG) out = IRREGULAR_SG[w];
  else if (isPlural(word) || INVARIANT.has(plain(word))) return word;
  else if (/[^aeiou]y$/.test(w)) out = w.slice(0, -1) + "ies";
  else if (/(ch|sh|x|z|s)$/.test(w)) out = w + "es";
  else out = w + "s";
  return matchCase(word, out);
}

export function headWord(name: string): string {
  const ts = tokens(name);
  return ts.length ? ts[ts.length - 1] : name;
}

/** Apply fn to the last word of name, preserving the rest of the name's layout. */
export function withHead(name: string, fn: (w: string) => string): string {
  const raw = rawTokens(name).map((t) => t.replace(/\.$/, ""));
  if (raw.length === 0) return name;
  const last = raw[raw.length - 1];
  const idx = name.lastIndexOf(last);
  return name.slice(0, idx) + fn(last) + name.slice(idx + last.length);
}

/** Apply the slot affix convention to a proposed slot name. */
export function applySlotAffix(name: string, conv: Conventions): string {
  const style = conv.slotCase;
  const ws = tokens(name);
  if (conv.slotAffix === "has-prefix" && ws[0] !== "has") return convert(["has", ...ws].join(" "), style);
  if (conv.slotAffix === "of-suffix" && ws[ws.length - 1] !== "of") return convert([...ws, "of"].join(" "), style);
  return convert(name, style);
}

/** The name a class/slot should have under the conventions (for "did you mean" hints). */
export function conventionalName(name: string, kind: "Class" | "Slot", conv: Conventions): string {
  if (kind === "Slot") return applySlotAffix(name, conv);
  let n = convert(name, conv.classCase);
  n = withHead(n, conv.classNumber === "plural" ? pluralize : singularize);
  return n;
}

/** Relationship (edge) type for a slot name: 'goesWellWith' -> 'GOES_WELL_WITH' (the openCypher convention). */
export function relType(slotName: string): string {
  return tokens(stripAccents(slotName)).join("_").toUpperCase();
}
