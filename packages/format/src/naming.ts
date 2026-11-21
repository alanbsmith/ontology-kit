/**
 * How names turn into identities: the folding that makes lookups case- and delimiter-insensitive,
 * the slug an id is built from, and the edge type a relationship slot's name becomes. These are the
 * parts of naming the file format itself depends on. okb keeps the style rules (PascalCase, plurals).
 */

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

/** Lowercase letters and digits only, without accents: 'Rosé Wine!' -> 'rosewine'. */
export function fold(text: string): string {
  return stripAccents(text).toLowerCase().replace(/[^a-z0-9]/g, "");
}

const keyCache = new Map<string, string>();

/**
 * Case- and delimiter-insensitive identity for uniqueness checks (the fold of a
 * name). Memoized: name lookups compare against every node's name, so the same
 * short strings recur constantly.
 */
export function key(name: string): string {
  let k = keyCache.get(name);
  if (k === undefined) {
    k = fold(name);
    keyCache.set(name, k);
  }
  return k;
}

/** The part of an id built from a name: 'Red Wine' -> 'red-wine'. */
export function slug(name: string): string {
  const ts = tokens(stripAccents(name));
  return ts.length ? ts.join("-") : "x";
}

/** "a Winery" / "an Author" */
export const an = (w: string) => (/^[aeiou]/i.test(w) ? "an " : "a ") + w;

/** Relationship (edge) type for a slot name: 'goesWellWith' -> 'GOES_WELL_WITH' (the openCypher convention). */
export function relType(slotName: string): string {
  return tokens(stripAccents(slotName)).join("_").toUpperCase();
}
