/** Shared by the ops modules. */

/** Human-readable notes about what an operation did, including gentle warnings, so beginners learn as they go. */
export type Notes = string[];

/** "a Winery" / "an Author" */
export const an = (w: string) => (/^[aeiou]/i.test(w) ? "an " : "a ") + w;

/** Command-line list values: repeated flags and/or comma-separated ("a,b" "c" -> [a, b, c]). */
export const splitList = (s: string | string[] | undefined) =>
  (Array.isArray(s) ? s : s ? [s] : []).flatMap((x) => x.split(",")).map((x) => x.trim()).filter(Boolean);
