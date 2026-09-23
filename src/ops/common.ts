/** Shared by the ops modules. */

/** Human-readable notes about what an operation did, including gentle warnings, so beginners learn as they go. */
export type Notes = string[];

export { an } from "../naming.ts";

/** Command-line list values: repeated flags and/or comma-separated ("a,b" "c" -> [a, b, c]). */
export const splitList = (s: string | string[] | undefined) =>
  (Array.isArray(s) ? s : s ? [s] : []).flatMap((x) => x.split(",")).map((x) => x.trim()).filter(Boolean);
