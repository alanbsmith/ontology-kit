/** Shared types for the okb file format (okb-lpg/2). */

export interface GraphNode {
  id: string;
  type: string;
  // Every node type carries its own properties; see meta-kb/src/format.yaml.
  [prop: string]: any;
}

export interface GraphEdge {
  from: string;
  type: string;
  to: string;
  [prop: string]: any;
}

export interface Manifest {
  format: string;
  currentStep: number;
  created?: string;
  metaKbVersion?: string;
  [prop: string]: any;
}

export interface Conventions {
  classCase: string;
  slotCase: string;
  instanceCase: string | null;
  classNumber: "singular" | "plural";
  slotAffix: "none" | "has-prefix" | "of-suffix";
  /** "chosen" once the user ran `okb convention`; "default" when okb filled it in. */
  source?: "chosen" | "default";
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

export interface Facets {
  valueType?: string;
  allowedValues: string[] | null;
  min: number;
  max: number | null;
  range: string[];
  overriddenBy: string[];
}
