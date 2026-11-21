/**
 * The commit and pull request conventions, in one place. commitlint.config.js reads the scopes,
 * scripts/pr.ts checks PR bodies against the categories, and scripts/release-notes.ts groups the
 * release notes by them. CONTRIBUTING.md ("Commits and pull requests") documents both lists.
 */

/** Commit scopes: a package, or a part of the repo that isn't one. The scope is optional. */
export const SCOPES = [
  "format", // @ontology-kit/format
  "okb", // @ontology-kit/okb, the CLI
  "ontology-kit", // the unscoped wrapper package
  "meta-kb", // the method, rules, glossary and decision guides
  "skills", // the shipped skills
  "examples", // the tutorials and example ontologies
  "site", // the docs site
  "release", // the release workflow and scripts
  "deps", // dependency updates
] as const;

/**
 * Release categories, in the order the release notes list them. Each PR picks one in its
 * `## Release Category` section. The description is what the PR template shows.
 */
export const CATEGORIES = [
  { name: "CLI", about: "okb commands, flags, output and behavior" },
  { name: "Format", about: "the okb-lpg file format and the @ontology-kit/format package" },
  { name: "Method", about: "the meta-KB: the steps, rules, glossary and decision guides" },
  { name: "Skills", about: "the skills that ship with okb" },
  { name: "Documentation", about: "the docs, tutorials and docs site" },
  { name: "Infrastructure", about: "CI, the release workflow, build and repo tooling, tests" },
  { name: "Dependencies", about: "dependency updates" },
] as const;

export type Category = (typeof CATEGORIES)[number]["name"];

export const CATEGORY_NAMES: readonly Category[] = CATEGORIES.map((c) => c.name);

/** Commit types whose PRs change what users get, so the PR must say how in its release notes. */
export const TYPES_NEEDING_NOTES = ["feat", "fix", "perf"] as const;
