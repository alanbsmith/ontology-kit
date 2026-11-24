/**
 * The node and edge types the format reserves, built from the registry data (registry.ts, which the
 * okb meta-KB build generates from format.yaml). Kept apart from the public entry so the model can
 * use it without importing the entry.
 */
import { EDGE_TYPE_NAMES, NODE_TYPE_NAMES, PROVENANCE_EDGE_TYPE_NAMES } from "./registry.ts";

/** Every node type the format defines, in the order of the registry. */
export const NODE_TYPES: readonly string[] = NODE_TYPE_NAMES;

/**
 * Every edge type okb reserves for its own structure: IS_A, INSTANCE_OF, HAS_SLOT, RANGE, INVERSE_OF,
 * DISJOINT_WITH, NEEDS, BECAME, ABOUT, CITES, PART_OF, GOVERNS, REFINES, FULFILLS. An edge whose type is
 * not in this list is a relationship value, stored under a relationship slot's `relType`. Built from
 * the format registry, so a new structural edge type shows up here without a code change.
 */
export const STRUCTURAL_EDGE_TYPES: readonly string[] = EDGE_TYPE_NAMES;

/**
 * The structural edge types of the provenance and rule layer: CITES, PART_OF, GOVERNS, REFINES, FULFILLS.
 * A subset of STRUCTURAL_EDGE_TYPES.
 */
export const PROVENANCE_EDGE_TYPES: readonly string[] = PROVENANCE_EDGE_TYPE_NAMES;

const structural = new Set(STRUCTURAL_EDGE_TYPES);
const provenance = new Set(PROVENANCE_EDGE_TYPES);

/** Whether an edge type is one okb reserves (as opposed to a relationship slot's `relType`). */
export const isStructuralEdgeType = (type: string): boolean => structural.has(type);

/** Whether an edge type belongs to the provenance and rule layer. */
export const isProvenanceEdgeType = (type: string): boolean => provenance.has(type);
