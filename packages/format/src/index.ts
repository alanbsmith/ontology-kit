/**
 * @ontology-kit/format: the okb file format, as a library.
 *
 * Everything another tool needs to read an okb ontology folder: the typed nodes, loading with
 * migrations of older formats, the edge types okb reserves, reading relationship values, and the
 * few name helpers the format's identities are built from. It's an explicit allowlist: nothing else
 * in the package is public, and the write side, which @ontology-kit/okb uses, is tagged internal in the
 * source and left out of the shipped type declarations. docs/FORMAT.md lists the
 * API and says what counts as a breaking change.
 */
export { Ontology, FORMAT, MANIFEST, findRoot, nodeLabel, nameOrText, literalValue, literalValues } from "./model.ts";
export { OkbError } from "./errors.ts";
export { Relationships, isRelationship, edgeProps } from "./relationships.ts";
export type { LinkSpec } from "./relationships.ts";
export { NODE_TYPES, STRUCTURAL_EDGE_TYPES, PROVENANCE_EDGE_TYPES, isStructuralEdgeType, isProvenanceEdgeType } from "./edge-types.ts";
export { fold, key, rawTokens, relType, slug, stripAccents, tokens } from "./naming.ts";
export {
  CARDINALITIES, DISPOSITIONS, MODALITIES, VALUE_TYPES, VERIFICATION_STATUSES,
} from "./types.ts";
export type {
  Cardinality, ClassNode, CompetencyQuestionNode, Conventions, DesignDecisionNode, Disposition, EdgePropertyDecl,
  ExtractedFields, Facets, FacetOverride, GraphEdge, GraphNode, InstanceNode, Literal, LiteralType, Manifest, Modality, NodeOf,
  NodeType, OkbNode, OntologyNode, RelationshipSlot, ReusedOntologyNode, RuleNode, SlotNode, SourceLocationNode,
  SourceBlock, SourceNode, StoredValue, TermNode, ValueType, Verification, VerificationStatus,
} from "./types.ts";
