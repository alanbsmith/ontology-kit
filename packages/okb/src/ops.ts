/**
 * Every change to an ontology goes through these functions (the CLI is a thin
 * wrapper). Each returns human-readable notes about what happened, including
 * gentle warnings, so beginners learn as they go. Grouped by reason to change:
 */
export * from "./ops/common.ts";
export * from "./ops/naming.ts"; // naming conventions and name checks
export * from "./ops/scope.ts"; // steps 1-3: scope, questions, reuse, terms
export * from "./ops/classes.ts"; // the class hierarchy
export * from "./ops/slots.ts"; // slots, facets, inverses, edge-property declarations
export * from "./ops/values.ts"; // values, fixed values, defaults, restrictions
export * from "./ops/links.ts"; // single relationship values with edge properties
export * from "./ops/instances.ts"; // instances and their classes
export * from "./ops/admin.ts"; // design decisions, rename, remove
