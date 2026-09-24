/**
 * Today's date for what okb records (an ontology's creation date, a design
 * decision's date). SOURCE_DATE_EPOCH (seconds since 1970, the reproducible-builds
 * convention) pins it, so generated output like examples/wine is the same on any
 * day and in any time zone.
 */
import { OkbError } from "./errors.ts";

/** YYYY-MM-DD, in UTC. */
export function today(): string {
  const epoch = process.env.SOURCE_DATE_EPOCH;
  if (epoch === undefined || epoch === "") return new Date().toISOString().slice(0, 10);
  if (!/^\d+$/.test(epoch)) throw new OkbError(`SOURCE_DATE_EPOCH must be whole seconds since 1970; got '${epoch}'.`);
  return new Date(Number(epoch) * 1000).toISOString().slice(0, 10);
}
