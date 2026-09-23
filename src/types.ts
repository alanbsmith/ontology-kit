/**
 * Shared types for the okb file format (okb-lpg/2). The node and edge registry
 * is meta-kb/src/format.yaml; docs/FORMAT.md describes each property.
 *
 * Files can be edited by hand, so what's loaded is only *expected* to match these
 * types. The struct-well-formed rule reports what doesn't, and code that walks
 * edges should still expect ids that point nowhere (use Ontology.require).
 */

/** An untyped graph node: the meta-KB, and okb files before they're checked. */
export interface GraphNode {
  id: string;
  type: string;
  [prop: string]: any;
}

/** An edge. Anything besides from/type/to is an edge property (see OkbEdgeProps). */
export interface GraphEdge {
  from: string;
  type: string;
  to: string;
  [prop: string]: unknown;
}

export interface Manifest {
  format: string;
  currentStep: number;
  name?: string;
  created?: string;
  metaKbVersion?: string;
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

/** Narrows a string from the command line or a file to one of a fixed set of values. */
export function isOneOf<T extends string>(values: readonly T[], v: string | undefined): v is T {
  return (values as readonly string[]).includes(v as string);
}

// ------------------------------------------------------------------ values
export const VALUE_TYPES = ["String", "Integer", "Float", "Number", "Boolean", "Enumerated", "Instance"] as const;
export type ValueType = (typeof VALUE_TYPES)[number];
/** Value types an edge property can have: everything except links to other things. */
export type LiteralType = Exclude<ValueType, "Instance">;

/** A stored property value (Instance.values, Class.fixedValues/defaults, Slot.default). */
export type Literal = string | number | boolean;
export type StoredValue = Literal | Literal[];

export const DISPOSITIONS = ["undecided", "class", "slot", "instance", "value", "synonym", "out-of-scope"] as const;
export type Disposition = (typeof DISPOSITIONS)[number];

export const CARDINALITIES = ["single", "multiple"] as const;
export type Cardinality = (typeof CARDINALITIES)[number];

// ------------------------------------------------------------------ provenance (extraction pipeline)
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export interface Verification {
  status: VerificationStatus;
  checkedAgainst?: string[];
  note?: string;
  /** Set by `okb verify --approve`: the status a person approved it from. */
  approvedAfter?: VerificationStatus;
}

/** Fields the extraction pipeline adds to nodes drafted from a document. */
export interface ExtractedFields {
  extracted?: boolean;
  verification?: Verification;
  extractionConfidence?: "verbatim" | "paraphrased" | "corrected";
  _originalDraft?: string;
}

// ------------------------------------------------------------------ nodes
export interface OntologyNode {
  type: "Ontology";
  id: string;
  name: string;
  domain: string;
  purpose: string;
  users: string[];
  maintainers: string[];
  outOfScope: string[];
  kind: "application" | "terminological";
  reuseReviewed: boolean;
  conventions?: Conventions;
}

export interface CompetencyQuestionNode {
  type: "CompetencyQuestion";
  id: string;
  text: string;
  status?: "draft" | "answerable";
}

export interface TermNode {
  type: "Term";
  id: string;
  text: string;
  disposition?: Disposition;
  note?: string;
}

export interface ReusedOntologyNode {
  type: "ReusedOntology";
  id: string;
  name: string;
  url?: string;
  decision: "reuse" | "adapt" | "reference" | "rejected";
  notes?: string;
}

/** A class's restriction of an inherited slot (Ontology 101's facet overrides). */
export interface FacetOverride {
  allowedValues?: Literal[];
  minCardinality?: number;
  maxCardinality?: number;
  range?: string[];
}

export interface ClassNode extends ExtractedFields {
  type: "Class";
  id: string;
  name: string;
  description?: string;
  synonyms?: string[];
  abstract?: boolean;
  terminological?: boolean;
  /** Property values every member has. Relationship values are edges from the class. */
  fixedValues?: Record<string, StoredValue>;
  /** Starting values for new instances; they can change them. */
  defaults?: Record<string, StoredValue>;
  facetOverrides?: Record<string, FacetOverride>;
}

export interface EdgePropertyDecl {
  name: string;
  valueType: LiteralType;
  allowedValues?: string[];
  required?: boolean;
  description?: string;
}

export interface SlotNode extends ExtractedFields {
  type: "Slot";
  id: string;
  name: string;
  description?: string;
  /** "Instance" makes the slot a relationship (see RelationshipSlot). Missing until declared. */
  valueType?: ValueType;
  allowedValues?: string[];
  cardinality?: Cardinality;
  minCardinality?: number;
  maxCardinality?: number;
  default?: StoredValue;
  /** Relationships only: the edge type its values are stored as (maker -> MAKER). */
  relType?: string;
  /** Relationships only: properties its edges can carry. */
  edgeProperties?: EdgePropertyDecl[];
}

/** A slot whose values link to other things; they're stored as edges of type relType. */
export type RelationshipSlot = SlotNode & { valueType: "Instance"; relType: string };

export interface InstanceNode extends ExtractedFields {
  type: "Instance";
  id: string;
  name: string;
  description?: string;
  /** Property values only; relationship values are edges. */
  values?: Record<string, StoredValue>;
}

export interface DesignDecisionNode extends ExtractedFields {
  type: "DesignDecision";
  id: string;
  title: string;
  decision: string;
  question?: string;
  rationale?: string;
  alternatives?: string[];
  /** Rule keys this decision explains (waives, for warnings and hints). */
  metaRules?: string[];
  date: string;
}

export interface SourceNode {
  type: "Source";
  id: string;
  title: string;
  localPath?: string;
  format?: "markdown" | "pdf" | "text";
  url?: string;
  repoUrl?: string;
  /** Markdown frontmatter. */
  meta?: Record<string, unknown>;
}

export interface SourceLocationNode {
  type: "SourceLocation";
  id: string;
  quote: string;
  locator?: string;
  headingPath?: string[];
  startLine?: number;
  endLine?: number;
  lines?: string;
  blockKind?: string;
  sourceLink?: string;
  pageLink?: string;
  page?: number | string;
}

export const MODALITIES = ["MUST", "MUST_NOT", "SHOULD", "SHOULD_NOT", "MAY"] as const;
export const VERIFICATION_STATUSES = ["SUPPORTED", "OVERREACH", "UNSUPPORTED"] as const;
export type Modality = (typeof MODALITIES)[number];

/** A domain rule extracted from documentation (docs/EXTRACTION-PIPELINE.md). */
export interface RuleNode extends ExtractedFields {
  type: "Rule";
  id: string;
  name: string;
  modality: Modality;
  statement: string;
}

export type OkbNode =
  | OntologyNode
  | CompetencyQuestionNode
  | TermNode
  | ReusedOntologyNode
  | ClassNode
  | SlotNode
  | InstanceNode
  | DesignDecisionNode
  | SourceNode
  | SourceLocationNode
  | RuleNode;

export type NodeType = OkbNode["type"];
export type NodeOf<T extends NodeType> = Extract<OkbNode, { type: T }>;

// ------------------------------------------------------------------ findings
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
  valueType?: ValueType;
  allowedValues: Literal[] | null;
  min: number;
  max: number | null;
  range: string[];
  overriddenBy: string[];
}
