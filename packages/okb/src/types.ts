/** Small types and guards that only okb needs (the file format's own types are in @ontology-kit/reader). */

/** Narrows a string from the command line or a file to one of a fixed set of values. */
export function isOneOf<T extends string>(values: readonly T[], v: string | undefined): v is T {
  return (values as readonly string[]).includes(v as string);
}

export type Severity = "error" | "warning" | "info";

export interface Finding {
  rule: string;
  severity: Severity;
  message: string;
  nodes: string[];
  /** Set when a DesignDecision waives this finding (warnings/info only). */
  explainedBy?: string;
}
