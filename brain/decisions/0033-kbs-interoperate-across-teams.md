---
summary: A team can reference and extend another team's released KB at a pinned version, whatever okb version each uses; KB versions stay separate from okb's.
status: proposed
decided-by: owner, on a recommendation
date: 2026-11-28
updated: 2026-11-28
links: ["#31", "#32", "#33", "#101", "Discussion #105", "0026-road-to-one-point-zero-guardrails.md", "0027-cross-kb-references-before-one-point-zero.md"]
---

# 0033: KBs built with okb interoperate across teams

**Decision:** interoperability between KBs that different teams build with okb is a goal of the kit. One team can take another team's released KB and build on it at a pinned version: reference its nodes, and extend it with its own instances, subclasses and slots, so an agent that reads both sees one set of terms. For example, a design-system team releases its KB as 2.3.0, built with okb 1.2.0. A product team on okb 1.5.0 pins that release, adds its own tags as instances or subclasses of the design-system KB's `Tag` class, and validates against it.

A KB's version and okb's version are separate things. A dependency pin names a KB release (`<kb>@2.3.0`), never an okb version. okb's versions (the packages, the `okb-lpg/N` format and the meta-KB) say which tools can read and check a KB release. They don't say what the KB promises its consumers.

**Why:** the owner's reason: if everyone uses the same tools and patterns, KBs can work together. If every team builds its own KB with its own rules, aligning them later is a mess and probably never happens. Each okb KB has the same node and edge types, the same ids, the same release manifest and the same meta-KB rules, so a consumer doesn't have to translate another team's model into its own. Ontology 101's step 2 already tells a team to reuse an existing ontology before it models its own. Today okb only records that choice as a `ReusedOntology` node. It can't load the reused KB or check against it.

**Weighed:**

- **Copying the other KB into your own.** A team copies the nodes it needs and edits them freely. Not chosen: the copies drift from the source, and nothing tells the team when the source changes.
- **Leaving extension until after 1.0.** Ship #31 as references only, and add extension later as a purely additive format change. Not chosen: extension decides how a dependency's classes, slots and facets apply inside a consumer's KB, which is what validation reads, and the format freezes after 0.4.0 ([0026](0026-road-to-one-point-zero-guardrails.md)).
- **A shared registry or hosted catalog of KBs.** Not chosen: a KB stays plain files in git ([0001](0001-plain-files-in-git.md)), and #105 rules out hosting.

**Consequences:**

- **#31 grows to cover extension**, not only references. A dependency's classes can be the target of `IS_A` and `INSTANCE_OF`, its slots can be used on the consumer's classes, and inherited slots and facets apply across the boundary. A second fixture shows a product KB extending a shared tag vocabulary, beside the components-to-tokens pair. The format change is settled in 0.4.0's first issue, as 0026 requires.
- **The format compatibility policy is the interoperability contract.** A team on a newer okb must be able to read a dependency written by an older one. `docs/FORMAT.md` also says what an older okb does with a newer format: it refuses, and names the okb version it needs.
- **Consumers get a written interoperability contract.** One page lists what every KB must share and what a consumer may extend, and how. What okb fixes: the format version, the node and edge types, the id scheme, what the structural edges mean, the release manifest and the meta-KB's MUST rules. What a dependency fixes: its classes, slots, definitions, facets and, if the open question below says so, its rules. What a consumer may add: instances, subclasses, its own slots, narrower facets on its own subclasses, and rules that refine the dependency's. #31 writes the page with the format change, so the contract and the validation that enforces it land together.
- **The 1.0 test bed covers a second team.** The Canvas, tokens and icons KBs ([0027](0027-cross-kb-references-before-one-point-zero.md)) share one owner, one okb version and one set of conventions. 0026's second real KB, or a fixture, is built the way another team would build it: its own okb pin and rule pack, and an upgrade of its dependency to a new release.
- **This adds no seventh goal to [0021](0021-one-point-zero-is-six-user-goals.md).** It's a property the six goals must keep for a KB that depends on another: building, maintaining, documenting, exporting, querying and evaluating it.
- **Several questions stay [open](../open-questions.md):** whether a dependency's rules apply to the KBs that extend it, how a dependency is fetched and resolved, what a KB's semver promises, and whether a merged view for agents (#33, and MCP) has to come before 1.0. Impact checks on upgrade (#32) stay after 1.0 unless one of those answers moves them.
- **#105 needs a line about this goal.** The owner edits #105 ([0031](0031-vision-in-105-plan-in-the-brain.md)).
