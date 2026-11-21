/**
 * The public file-format API (`@ontology-kit/okb/format`).
 *
 * Everything another tool needs to read an okb ontology folder: the typed nodes, loading with
 * migrations of older formats, the edge types okb reserves, and reading relationship values.
 * It's an explicit allowlist: nothing else in the package is public, and anything a class
 * member marks `@internal` is left out of the shipped type declarations. docs/FORMAT.md lists
 * the API and says what counts as a breaking change.
 */
import { MetaKB } from "./metakb.ts";

export { Ontology, FORMAT, MANIFEST, findRoot, nodeLabel, nameOrText, literalValue, literalValues } from "./model.ts";
export { OkbError } from "./errors.ts";
export { Relationships, isRelationship, edgeProps } from "./relationships.ts";
export type { LinkSpec } from "./relationships.ts";
export {
  CARDINALITIES, DISPOSITIONS, MODALITIES, VALUE_TYPES, VERIFICATION_STATUSES,
} from "./types.ts";
export type {
  Cardinality, ClassNode, CompetencyQuestionNode, Conventions, DesignDecisionNode, Disposition, EdgePropertyDecl,
  ExtractedFields, Facets, FacetOverride, GraphEdge, InstanceNode, Literal, LiteralType, Manifest, Modality, NodeOf,
  NodeType, OkbNode, OntologyNode, RelationshipSlot, ReusedOntologyNode, RuleNode, SlotNode, SourceLocationNode,
  SourceNode, StoredValue, TermNode, ValueType, Verification, VerificationStatus,
} from "./types.ts";

const registry = MetaKB.get().formatRegistry();

/** Every node type the format defines, in the order of the registry (meta-kb/src/format.yaml). */
export const NODE_TYPES: readonly string[] = [...registry.nodeTypes.keys()];

/**
 * Every edge type okb reserves for its own structure: IS_A, INSTANCE_OF, HAS_SLOT, RANGE, INVERSE_OF,
 * DISJOINT_WITH, NEEDS, BECAME, ABOUT, CITES, PART_OF, GOVERNS, REFINES, FULFILLS. An edge whose type is
 * not in this list is a relationship value, stored under a relationship slot's `relType`. Built from
 * the format registry, so a new structural edge type shows up here without a code change.
 */
export const STRUCTURAL_EDGE_TYPES: readonly string[] = [...registry.edgeTypes.keys()];

/**
 * The structural edge types of the provenance and rule layer: CITES, PART_OF, GOVERNS, REFINES, FULFILLS.
 * A subset of STRUCTURAL_EDGE_TYPES.
 */
export const PROVENANCE_EDGE_TYPES: readonly string[] = [...registry.edgeTypes.values()].filter((e) => e.provenance).map((e) => e.name);

const structural = new Set(STRUCTURAL_EDGE_TYPES);
const provenance = new Set(PROVENANCE_EDGE_TYPES);

/** Whether an edge type is one okb reserves (as opposed to a relationship slot's `relType`). */
export const isStructuralEdgeType = (type: string): boolean => structural.has(type);

/** Whether an edge type belongs to the provenance and rule layer. */
export const isProvenanceEdgeType = (type: string): boolean => provenance.has(type);
