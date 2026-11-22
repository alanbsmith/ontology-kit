# The okb file format (`okb-lpg/3`)

An ontology built with okb is a folder with three plain-text files:

| File          | Contents                                                                                              |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| `okb.json`    | Tool state: format version, name, `currentStep`, the meta-KB version, and the KB's release `version`. |
| `nodes.jsonl` | The nodes, one per line, sorted by id. Each has `id`, `type` and type-specific properties.            |
| `edges.jsonl` | The edges, one per line, sorted by `from`, `type`, `to`. Each may have more properties.               |

It's a labeled property graph (LPG). In this file the **schema is data**: [classes](GLOSSARY.md#concept-class) and [slots](GLOSSARY.md#concept-slot) are nodes, so the ontology can be validated, queried and versioned. For loading into Neo4j, Neptune or Memgraph, `okb export` flips that around (see [Export](build/export.md)). Either way, model the _meaning_ first (see _Model the domain, not the database_ in [METHOD.md](METHOD.md)).

## Vocabulary: slots, properties, relationships

Ontology 101 comes from frame-based systems and calls every attribute a **slot**. okb keeps that word in the file format and uses everyday names in the CLI:

| Ontology 101                                       | okb CLI                                   | OWL               | Graph database    |
| -------------------------------------------------- | ----------------------------------------- | ----------------- | ----------------- |
| slot with a String/number/Boolean/Enumerated value | **property** (`okb property add`)         | datatype property | node property     |
| slot with value type Instance                      | **relationship** (`okb relationship add`) | object property   | relationship type |
| class                                              | class                                     | class             | node label        |
| instance                                           | instance                                  | individual        | node              |
| facet                                              | facet                                     | restriction       | schema constraint |

The authoritative list of node and edge types lives in `packages/okb/meta-kb/src/format.yaml`, and `okb validate` enforces it (rule `struct-well-formed`). If you only use `okb` commands, you never need to edit these files by hand.

## Node types

| Type                 | Id pattern               | Key properties                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Ontology`           | `ontology` (exactly one) | `name`, `domain`, `purpose`, `users[]`, `maintainers[]`, `outOfScope[]`, `kind` (`application` \| `terminological`), `reuseReviewed`, `conventions`                                                                                                                                                                                                                                                               |
| `CompetencyQuestion` | `cq.<tag>`               | `text`, `status` (`draft` \| `answerable`)                                                                                                                                                                                                                                                                                                                                                                        |
| `Term`               | `t.<slug>`               | `text`, `disposition` (`undecided` \| `class` \| `slot` \| `instance` \| `value` \| `synonym` \| `out-of-scope`), `note`                                                                                                                                                                                                                                                                                          |
| `ReusedOntology`     | `r.<slug>`               | `name`, `url`, `decision` (`reuse` \| `adapt` \| `reference` \| `rejected`), `notes`                                                                                                                                                                                                                                                                                                                              |
| `Class`              | `c.<slug>`               | `name`, `description`, `synonyms[]`, `abstract`, `terminological`, `fixedValues{slotId: value}`, `defaults{slotId: value}`, `facetOverrides{slotId: {allowedValues, minCardinality, maxCardinality, range}}`                                                                                                                                                                                                      |
| `Slot`               | `s.<slug>`               | `name`, `description`, `valueType` (`String` \| `Integer` \| `Float` \| `Number` \| `Boolean` \| `Enumerated` \| `Instance`), `allowedValues[]`, `cardinality` (`single` \| `multiple`), `minCardinality`, `maxCardinality`, `default`, `relType` (relationships only: the edge type values are stored as), `edgeProperties[]` (relationships only: `{name, valueType, allowedValues?, required?, description?}`) |
| `Instance`           | `i.<slug>-<tag>`         | `name`, `description`, `values{slotId: value \| [values]}` (property values only; relationship values are edges)                                                                                                                                                                                                                                                                                                  |
| `DesignDecision`     | `d.<tag>`                | `title`, `question`, `decision`, `rationale`, `alternatives[]`, `metaRules[]` (rule ids it explains), `date`                                                                                                                                                                                                                                                                                                      |
| `Source`             | `src.<slug>`             | `title`, `localPath`, `format` (`markdown` \| `pdf` \| `text`), `url`, `repoUrl`, `meta` (markdown frontmatter)                                                                                                                                                                                                                                                                                                   |
| `SourceLocation`     | `loc.<source>-<tag>`     | `quote` (verbatim), `locator` (heading path, or `p.N`), `headingPath[]`, `startLine`, `endLine`, `lines`, `blockKind`, `sourceLink`, `pageLink`, `page`                                                                                                                                                                                                                                                           |
| `Rule`               | `rule.<slug>`            | `modality`, `statement`, `authored`, `extracted`, `verification{status, checkedAgainst}`, `extractionConfidence`, `_originalDraft`, `values{slotId: value}`. A domain rule, extracted from documentation or authored by the owner; see [EXTRACTION-PIPELINE.md](EXTRACTION-PIPELINE.md) and [Rules](#rules).                                                                                                      |

Ids never change when you rename something, so edges stay valid. `okb rename` keeps the old name on the node, as `formerNames` (see [Former names](#former-names)).

### Ids

An id is a readable prefix, a dot, and a part that says which node it is. Two people editing the same ontology on two git branches must never create the same id, because git merges the text without a conflict and the result would hold two nodes with one id (or an edge that now points at the wrong node). So the id scheme depends on whether two people could add _different_ nodes under the same name:

- **Questions, decisions, instances and quotes carry a tag.** `<tag>` is six random characters from the lowercase alphabet `0-9a-z` without `i`, `l`, `o` and `u` (30 bits, so `cq.k7x2mq`, `d.3fh9xe`, `i.margaux-4t8wzn`). The slug part, where there is one, is only there to read.
- **Classes, slots, terms, reused ontologies, sources and rules keep a plain slug** (`c.wine`, `s.maker`), because the name is the identity: two branches that both add a class `Wine` added the same thing, and git reports that as a conflict for a person to resolve. If the plain slug is taken in the folder you're editing, the new id gets a tag instead of a counter (`c.wine-4t8wzn`), because a counter would depend on what that branch already holds.
- **The short numbers people type are positions, not ids.** `okb cq list` and `okb decision list` number the entries 1, 2, 3 in the order they were created (by `createdAt`; older nodes without one come first, in id order), not in file order, and `okb cq link 2 Wine` or `ont.find("2", "CompetencyQuestion")` takes the second. Adding a question doesn't change the numbers of the ones before it, but removing one does shift the later numbers, so a script that needs a stable reference uses the id.
- **Ids made before `okb-lpg/3` stay as they are** (`cq.1`, `d.2`, `i.margaux-2`, `loc.guide.1`). The number in an old `cq.3` still answers to `3`, and nothing is renamed.

Set `SOURCE_DATE_EPOCH` (seconds since 1970, the reproducible-builds convention) and the tag is derived from it, the type, the name and a counter instead of being random, so a generated folder like `packages/okb/examples/wine` rebuilds byte for byte. Don't set it when several people edit one ontology: the same name then gives the same tag on every branch.

### Former names

`okb rename` keeps what a thing was called. A `Class`, `Slot` or `Instance` that has been renamed carries `formerNames`, an array of its earlier names, oldest first. A relationship `Slot` whose rename changed its edge type also carries `formerRelTypes`, the earlier edge types (`["MAKER"]` after `maker` became `producer`), oldest first. Renaming a thing back to a former name removes it from the list. Both are optional, so older okb versions load the files and keep the properties.

The id is still the identity: nothing reads `formerNames` to find a node. They are for people and for tools that hold old names, such as a saved Cypher query that matches `:MAKER`. `okb diff` and a release's change log use them to say "also named" and to map an old edge type to the new one.

### Timestamps

Every node carries `createdAt` and `updatedAt`, UTC to the second (`2026-11-21T14:03:22Z`). Ids no longer say when a node was made, and array order after a git merge is merge order, so these two fields are the clock. Both are set when the node is created, and they're equal then. Ties in `createdAt` (several nodes made in the same second, or under `SOURCE_DATE_EPOCH`) fall back to array order.

`updatedAt` changes only when something stored **on the node** changes:

- its own fields: name, description, text, statement, modality, status, disposition and so on;
- its property values: `Instance.values`, `Class.fixedValues` and `defaults`;
- its facets: `Class.facetOverrides`, and a slot's cardinality, allowed values and range.

Anything stored as an **edge** doesn't count: `IS_A`, `INSTANCE_OF`, `HAS_SLOT`, `NEEDS`, `CITES`, `GOVERNS`, `REFINES`, `FULFILLS`, and relationship values such as `MAKER`. Edges have no timestamps. Setting `body=light` on an instance updates it, because the value lives in the instance's `values`, but linking it to a winery doesn't, because that link is an edge. Adding a slot to a class doesn't update the class (`HAS_SLOT`), and linking a rule to a quote doesn't update the rule. A slot's `RANGE` is an edge too, but it's a facet of the slot, so changing it does update the slot. A rule's `authored` flag and a node's `verification` are fields, so they count.

`okb show` prints both, and every `--json` output that includes a node includes them. `okb cq list` and `okb decision list` number by `createdAt`, not by position in the file. Two nodes created in the same second are ordered by id. Two branches that edit different nodes change different lines of `nodes.json`, so git merges them without a conflict on the stamps.

A file with no stamps (written before they existed) loads as it is. okb never invents a timestamp for a node it didn't create: read a missing field as "unknown". The first edit of such a node sets `updatedAt` and leaves `createdAt` missing.

## Edge types

| Type                          | From → To                                      | Meaning                                                                                                     |
| ----------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `IS_A`                        | Class → Class                                  | subclass → superclass (transitive, no cycles)                                                               |
| `INSTANCE_OF`                 | Instance → Class                               | an instance's (most specific) class                                                                         |
| `HAS_SLOT`                    | Class → Slot                                   | the slot is attached to the class; together these form the slot's _domain_                                  |
| `RANGE`                       | Slot → Class                                   | allowed classes for an Instance-type slot                                                                   |
| `INVERSE_OF`                  | Slot → Slot                                    | the two slots are one relationship read from both ends; the `from` slot's `relType` is the stored direction |
| _relationship types_          | Instance → Instance, or Class → Instance/Class | one edge type per relationship slot, named by its `relType` (see below)                                     |
| `DISJOINT_WITH`               | Class → Class                                  | stored once; symmetric                                                                                      |
| `NEEDS`                       | CompetencyQuestion → Class/Slot/Instance       | what's needed to answer the question                                                                        |
| `BECAME`                      | Term → Class/Slot/Instance                     | what a brainstormed term turned into                                                                        |
| `ABOUT`                       | DesignDecision → anything                      | what a decision is about                                                                                    |
| `CITES`, `PART_OF`, `GOVERNS` |                                                | provenance (see the extraction pipeline)                                                                    |
| `REFINES`                     | Rule → Rule                                    | the rule narrows a broader rule; optional `adds` (String) says how (see [Rules](#rules))                    |
| `FULFILLS`                    | Instance → Rule                                | a descriptive fact meets a rule (see [Rules](#rules))                                                       |

## Property values and relationships

- A **property value** lives on the node: `Instance.values[slotId]`, or `Class.fixedValues[slotId]` for a fact about the whole class.
- A **relationship value** is an edge whose type is the relationship's `relType`: the slot name in UPPER_SNAKE case, following the openCypher convention. `maker` → `(wine)-[:MAKER]->(winery)`, `goesWellWith` → `:GOES_WELL_WITH`. An edge from a **class** is a fixed class-level value inherited by every member: `(RedWine)-[:GOES_WELL_WITH]->(RedMeat)`.
- **Inverses are stored once.** After `okb relationship inverse maker produces`, a winery's `produces` values are simply its incoming `:MAKER` edges. Setting either side writes the same single edge, because in a graph every edge can be followed from either end.
- **Edge properties** qualify one link: `(Radio)-[:PREFERRED_OVER {condition: "2 to 7 options", rule: "rule.use-radio…"}]->(SegmentedControl)`. Declare them on the relationship (`okb relationship property preferredOver condition --type String --required`; types String, Integer, Float, Number, Boolean, Enumerated). They're stored in the relationship slot's `edgeProperties` and set with `okb link <from> <rel> <to> name=value [--rule <rule id>]`. Each (from, relationship, to) has one edge, and linking again merges properties. `rule` is reserved: it points at the Rule node whose quote and verification justify the link, so each fact has exactly one citation chain. `okb validate` checks types, allowed values, required properties and rule references (`slot-edge-properties`). For qualifiers that need relationships of their own, make the relationship a class instead (`okb explain decision.edge-or-class`).
- Renaming a relationship retypes its edges. Relationship types can't reuse okb's structural edge names (IS_A, HAS_SLOT, ...) or another relationship's type.

## Rules

A Rule is **prescriptive**: a requirement on any implementation, with a modality. A descriptive statement about one implementation (what Button does) is an ordinary Instance of a domain class, such as `Behavior`, with no modality. `okb validate` treats them separately, and `FULFILLS` connects them.

- **`authored`** (Boolean) marks a rule the ontology's owner wrote instead of extracting. `okb rule add --authored` sets `authored: true` and `extracted: false`. It still needs `--cites` (a quote in an owner-written Source) and verification, so `prov-cites-quote` and `prov-verified` apply unchanged.
- **Qualifier values** `values{slotId: value | [values]}` hold when or for whom a rule applies (for example `condition`, `inputModality`). Rules aren't instances of a class, so a slot declares that it applies to rules with `appliesToRules: true`: `okb slot add condition --on-rules --type Enumerated --values open,disabled` (`--off-rules` undoes it). The slot is then available on every rule and refused on instances, unless you also attach it to a class with `--on`. Whether a value is required follows the slot's cardinality. **Rules have no inheritance:** each rule states its own values, and nothing is inherited through `REFINES`, because a refining rule often narrows or adds a condition and an inherited value would claim something its quote doesn't say. Set values with `okb rule add ... --value condition=open`. They're checked like instance values (`slot-values-respect-facets`, `slot-value-slot-applies`). A rule's qualifiers must be properties, not relationships. Attach the same slot to a Behavior class with `--on Behavior` too, and a rule and a fact are described in the same terms.
- **`REFINES`** (Rule → Rule) is stored in one direction, specific → broad. The optional `adds` property (String) names what the narrower rule adds. Set it with `okb rule refines <rule> <broader> --adds "..."` or `okb rule add --refines <broader> --adds "..."`. A rule can't refine itself, directly or through other rules.
- **`FULFILLS`** (Instance → Rule) is stored in one direction. Many instances can fulfill one rule; read backwards it means "is fulfilled by", not "requires". Set it with `okb fulfills <instance> <rule>`.
- `okb cite <node> <quote id>` adds a `CITES` edge from an existing node to an existing quote, with the same node types as `quote add --cites`.

## Reading ontologies from code

Other tools can read an okb ontology without copying its types. [`@ontology-kit/format`](https://www.npmjs.com/package/@ontology-kit/format) is the supported way: the typed nodes, loading with migrations, the edge types okb reserves, and reading relationship values. It's a package of its own, with no runtime dependencies and none of okb's CLI, meta-KB or skills, and it needs Node 24 or newer. Add it to your project with npm, pnpm or any other package manager.

```ts
import { Ontology, isRelationship, isStructuralEdgeType } from "@ontology-kit/format";

const ont = Ontology.load("./my-ontology");

// Every relationship value of every instance, whichever end the edge is stored on.
for (const slot of ont.ofType("Slot").filter(isRelationship)) {
  for (const instance of ont.ofType("Instance")) {
    for (const target of ont.rel.values(instance.id, slot.id)) {
      console.log(`${instance.name} ${slot.name} ${ont.label(target)}`);
    }
  }
}

// An edge whose type okb doesn't reserve is a relationship value.
const links = ont.edges.filter((e) => !isStructuralEdgeType(e.type));
console.log(`${links.length} relationship edges`);
```

The test suite runs this example against a small ontology in `packages/format/tests/fixtures/coffee` (`packages/format/tests/format-api.test.ts`), so it stays true.

### What's public

Everything is exported from `packages/format/src/index.ts`, and nothing else in the package is public. The tests pin the list of exported names.

| Export                                                                                                         | What it is                                                                                                                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Ontology`                                                                                                     | An ontology folder. `Ontology.load(folder)` reads `okb.json`, `nodes.jsonl` and `edges.jsonl` (or the older `nodes.json` and `edges.json`) from the folder or a parent, and converts an `okb-lpg/1` folder in memory. `Ontology.fromData(nodes, edges)` builds one from data you already have.                             |
| Reading methods of `Ontology`                                                                                  | `nodes`, `edges`, `manifest`, `meta`, `get`, `require`, `find`, `ofType`, `label`, `outEdges`, `inEdges`, `targets`, `sources`, `edgesOf`, `parents`, `children`, `ancestors`, `descendants`, `roots`, `ownSlots`, `applicableSlots`, `domain`, `range`, `inverses`, `effectiveFacets`, `statedValues`, `instanceClasses`. |
| `ont.rel` (`Relationships`)                                                                                    | `values(id, slotId)`, `edge(id, slotId, target)`, `spec(slotId)`, `primary`, `isPrimary`, `edgeTypes()`, `slotsWithValues` and `edgeProperties`. This is how to read a relationship value without knowing how it's stored.                                                                                                 |
| `OkbNode` and the node types                                                                                   | The typed union of every node (`ClassNode`, `SlotNode`, `InstanceNode`, `RuleNode`, ...), plus `NodeType`, `NodeOf<T>`, `GraphEdge`, `GraphNode`, `Manifest`, `Conventions`, `StoredValue`, `Facets` and the other types in the node tables above.                                                                         |
| `STRUCTURAL_EDGE_TYPES`, `PROVENANCE_EDGE_TYPES`, `NODE_TYPES`, `isStructuralEdgeType`, `isProvenanceEdgeType` | The types the format registry defines. The first holds every edge type okb reserves (including `REFINES` and `FULFILLS`). The second is the provenance and rule layer: `CITES`, `PART_OF`, `GOVERNS`, `REFINES`, `FULFILLS`.                                                                                               |
| `key`, `relType`, `slug`, `tokens`, `rawTokens`, `fold`, `stripAccents`                                        | The name helpers the format's identities are built from: `key` is the case- and delimiter-insensitive identity that `find` matches names by, `relType` turns a slot name into its edge type (`goesWellWith` becomes `GOES_WELL_WITH`), and `slug` builds the part of an id that comes from a name.                         |
| `isRelationship`, `nodeLabel`, `nameOrText`, `literalValue`, `literalValues`, `edgeProps`, `findRoot`          | Small helpers.                                                                                                                                                                                                                                                                                                             |
| `FORMAT`, `MANIFEST`, `VALUE_TYPES`, `DISPOSITIONS`, `CARDINALITIES`, `MODALITIES`, `VERIFICATION_STATUSES`    | The format name (`okb-lpg/3`), the manifest file name and the value lists the node tables use.                                                                                                                                                                                                                             |
| `OkbError`                                                                                                     | What loading and lookups throw for a problem a person can fix.                                                                                                                                                                                                                                                             |

The edge lists come from `packages/okb/meta-kb/src/format.yaml`, the same registry `okb validate` reads, so they can't drift from it. A `provenance: true` flag on an edge type there puts it in `PROVENANCE_EDGE_TYPES`. Don't copy the lists into another tool; import them.

Loading trusts the files, as the CLI does. A hand-edited file may hold nodes that don't match the types or edges that point nowhere, so use `ont.require` (it throws a readable `OkbError`) for ids that must exist. Checking a file is `okb validate`.

### What isn't public

- **Writing.** Adding and removing nodes and edges, `save()` and the relationship-changing operations on `ont.rel` exist for okb's own commands. They're tagged `@internal` in the source, which leaves them out of the type declarations, but they are in the compiled code, because okb runs on it. Change an ontology with `okb` commands. A supported write API needs the operations designed as a public surface first, so it isn't part of this one. Starting a new folder (`okb init`) is okb's, not this package's.
- **Validation.** The checks behind `okb validate` depend on the meta-KB rules and change with them. They stay in `@ontology-kit/okb` until a tool needs them as a library.
- **Anything under `dist/`.** Import only from `@ontology-kit/format`; the `exports` map refuses other paths.

### Versions and semver

The exports above follow semver. The format package has its own version, but while the packages are young all three (`@ontology-kit/format`, `@ontology-kit/okb` and the unscoped `ontology-kit`) release together at one version. Before 1.0, any release may break the API; [Releases](../CONTRIBUTING.md#releases) says what 1.0 will promise and how the package versions relate to the meta-KB version.

- **Major (breaking):** removing or renaming an export; narrowing a type or signature; removing a node or edge property or changing its meaning; changing what `rel.values`, `rel.edge` or `rel.spec` return for a file that was valid before; dropping the conversion of an older format; raising the Node floor.
- **Minor:** a new export; a new optional property on a node; a new node type or structural edge type (it appears in the lists, so a tool that reads the lists keeps working and one that copied them doesn't); reading a newer file format.
- **Patch:** fixes that don't change what the API returns for valid files.

Type declarations ship with the package (`dist/*.d.ts`, found through the `types` condition of the package's `exports`).

### Why a package of its own

The reader first shipped as a subpath of okb, `@ontology-kit/okb/format`, before anything was published. It's its own package because a tool that reads okb files shouldn't have to install the CLI, the meta-KB and the skills to do it, and so that the format's contract (the semver rules above) has a name and a version of its own. Nothing was published under the old path, so there's no compatibility shim.

Where the line falls:

- **In `@ontology-kit/format`:** the node and edge types, `Ontology` (loading, migration from `okb-lpg/1`, the indexes and every query), the relationship module (`ont.rel`), the name helpers the format's identities use, `OkbError`, and the registry of node and edge types as data (`packages/format/src/registry.ts`).
- **In `@ontology-kit/okb`:** everything that writes or judges: the commands and operations, creating a folder, the validator and its rules, the meta-KB, the skills, the naming _style_ rules (PascalCase, plurals), the clock and the export.
- **The write methods stayed on `Ontology`.** `Ontology` keeps its indexes private and every mutation must keep them current, so splitting the class into a reader and a writer would mean exposing those indexes or duplicating them. The write methods (`addNode`, `addEdge`, `removeNode`, `save`, the `rel` intents like `becomeRelationship`) are tagged `@internal` instead: they're in the compiled JavaScript that okb runs, and `stripInternal` leaves them out of the shipped `.d.ts`, so a consumer's compiler doesn't offer them. `packages/format/tsconfig.internal.json` also writes a full set of declarations to the gitignored `packages/format/types-internal/`, which okb's own build compiles against; it isn't published.
- **The registry has one source.** `packages/okb/meta-kb/src/format.yaml` stays where it is, because the meta-KB build compiles it into the meta-KB graph that `struct-well-formed` reads (and that data must not change). The same build writes the names the reader needs into `packages/format/src/registry.ts`, a generated file that is committed like `meta-kb/data`. The reader needs no YAML parser and no meta-KB at runtime, and a test (`packages/okb/tests/format-registry.test.ts`) fails if the two copies drift apart. The regenerate-and-diff step in CI catches a YAML edit that wasn't rebuilt.

### Moving a tool onto the API

A tool that kept its own copy of the node types and its own list of structural edge types (okb-mcp, for example) replaces them with imports from `@ontology-kit/format`: the node types, `STRUCTURAL_EDGE_TYPES` in place of a hand-written list, and `ont.rel.values` in place of its own edge walking. A new edge type like `REFINES` then reaches it with an upgrade, not a copy edit. A changed `rel.values` result, a removed export or a node property that went away in a new major version are the breaking changes to watch for.

## JSON Schema and editors

The files are described by JSON Schema (draft 2020-12), generated from `packages/okb/meta-kb/src/format.yaml` by `pnpm build:meta` and committed in `packages/okb/schema/`. The package ships them, so an install has them at `node_modules/@ontology-kit/okb/schema/`.

| Schema              | Describes                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------- |
| `okb.schema.json`   | `okb.json`.                                                                                  |
| `node.schema.json`  | One line of `nodes.jsonl`: an object whose `type` picks one of the node types below.         |
| `edge.schema.json`  | One line of `edges.jsonl`: `from`, `type` (UPPER_SNAKE case), `to` and free-form properties. |
| `nodes.schema.json` | An older `nodes.json`: an array of nodes. `edges.schema.json` is the same for `edges.json`.  |

The schema checks what one line can show: the shape of each node type, required properties, value types and allowed values, and the timestamp format. It doesn't check what needs the whole graph (an edge's ends exist, ids are unique, a Class's parents exist, the rules); that's `okb validate`. A node may carry keys the schema doesn't list, because okb keeps them, so the schema doesn't forbid extra properties. Run the schema in a KB repo's CI to catch a hand edit before `okb validate` does, or use it from a tool that has no okb.

To point an editor at it, add this to the KB repo's `.vscode/settings.json` (VS Code and other editors that read `json.schemas`):

```json
{
  "json.schemas": [
    { "fileMatch": ["okb.json"], "url": "./node_modules/@ontology-kit/okb/schema/okb.schema.json" }
  ]
}
```

`okb.json` may also carry a `"$schema"` key with the same path; okb ignores it, and keeps it when it saves. Editors have no standard way to attach a schema to each line of a `.jsonl` file, so for `nodes.jsonl` and `edges.jsonl` validate with a tool that reads lines, that checks each line against `node.schema.json` or `edge.schema.json` (`packages/okb/tests/schema.test.ts` does this with Ajv, in a few lines). The `$id` URLs in the schemas name them; they aren't hosted yet, so reference the files in the package.

## Compatibility policy

The file format has a version of its own, the `format` in `okb.json` (`okb-lpg/3`), separate from the package's. A package can release many times with no format change; the package's [semver rules](../CONTRIBUTING.md#releases) say what each release promises about the CLI and the library, and this section says what the files promise.

**What a format version promises.** A folder written as `okb-lpg/N` has the node and edge types, properties and meanings that this page and `schema/` describe for `N`. Within a version, okb may add optional properties, node types and edge types, and a file that was valid stays valid. It never changes what an existing property means or its id.

**okb reads older formats and migrates them.** Every okb release loads folders written in an older format and converts them in memory; the next command that saves writes the current format. Nothing is lost, no id is renamed, and no data is invented (a missing timestamp stays unknown). The conversions so far are in the [changelog](CHANGELOG.md): `okb-lpg/1` to `/2` (relationship values) and `/2` to `/3` (ids, timestamps and layout). The older array layout (`nodes.json`, `edges.json`) loads too.

**How long an old format is read.** A format version is read for at least two major package releases after the release that replaced it, and the changelog announces a removal one release before it happens. Before 1.0 the package promises nothing (see [What 0.x means](../CONTRIBUTING.md#releases)), but okb reads every format back to `okb-lpg/1` today. Dropping the conversion of an older format is a breaking change.

**What counts as breaking.** The format version number goes up, and the package makes a major release from 1.0 on, when:

- a node type, edge type or property is removed or renamed, or its meaning changes;
- a property that was optional becomes required, or a value that was allowed becomes invalid, so a file that was valid is rejected;
- the id scheme or the file layout changes so that an older okb can't read the new files (the one-node-per-line layout was this; it still reads the old one);
- okb stops reading an older format.

Adding an optional property or a new node or edge type is not breaking, and doesn't change the version. The schema files are regenerated with it, and the changelog says so. Older okb versions keep unknown properties but report an unknown node type as an error (`struct-well-formed`), so a team that adds a type should upgrade everyone together. A new format version is announced in the [changelog](CHANGELOG.md) with its conversion, and the policy for the library that reads it is under [Versions and semver](#versions-and-semver).

## Working in a team: git is the database

A team keeps an ontology folder in git, so a branch is a copy of the knowledge base and a pull request is a change to it. That works only if two people's unrelated edits merge without a conflict, so the files are laid out for it:

- **One node or edge per line.** `nodes.jsonl` and `edges.jsonl` hold one JSON object per line. A line is the unit git merges, so a class added on one branch and instances added on another touch different lines. A reviewer can read a diff as "these nodes changed".
- **Sorted, with a fixed key order.** Nodes are sorted by id (numbers compare as numbers, so `cq.2` comes before `cq.10`) and edges by `from`, `type`, `to`. Each node starts with `id` and `type`, each edge with `from`, `type` and `to`, and every other key follows alphabetically, so saving a file twice gives the same text and a save never moves a line it didn't change. Keys okb doesn't know are kept. Because the file is in id order, lists such as `okb term list` are no longer in the order you added things; questions and decisions are numbered by `createdAt` instead (see above).
- **Ids that two branches can't both make.** Questions, decisions, instances and quotes carry a random six-character tag, so two branches that each add a node never pick the same id. A class with the same name on two branches gets the same id on purpose: git then shows one conflict on that line, which is the real disagreement.

Two commands on one folder at the same time can't lose a write either. Every command that changes the folder takes the lock file `.okb.lock` first (created exclusively, holding the process id), loads, changes and saves, then removes it. A second command waits up to ten seconds and then stops with an error that says which process holds the lock. A lock left by a crashed command is taken over when its process is gone, or after ten minutes. If one is stuck, delete `.okb.lock`. `okb init` writes a `.gitignore` with `.okb.lock` and `*.tmp`, so neither is committed. Commands that only read wait briefly for the lock, so they never read half a save.

After a merge, run `okb validate`. A merge can leave things that no single branch had: an edge whose node the other branch deleted, or two nodes with one id. Both are reported with the likely cause named (rule `struct-well-formed`), and the fix is to keep one node or remove the edge. If git stopped with a conflict, the file holds conflict markers; okb refuses to read it and says so. Keep the lines you want from both sides, delete the markers, and run `okb validate`.

## Releases

A team that wants other tools to pin a version of its knowledge base cuts releases with `okb release <version>`. It writes these files into the KB folder, and they are meant to be committed:

| File                  | Contents                                                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `manifest.json`       | The pin for the latest release: id, version, and the SHA-256 of each file.                                                      |
| `RELEASES.md`         | Every release's change log, newest first.                                                                                       |
| `releases/<version>/` | The release as it was: `manifest.json`, `okb.json`, `nodes.jsonl`, `edges.jsonl`, plus `CHANGES.md` and `changes.json` (below). |

`okb.json` gets `"version": "<version>"`. The version is semver (`1.2.0`, `2.0.0-rc.1`). It must be higher than the last release's, and okb refuses a release when `okb validate` reports an error, when a registered source file is missing, or when nothing has changed. A refused release writes nothing.

**The change log.** The last release is the `version` in `manifest.json`, and its snapshot is `releases/<version>/`. `CHANGES.md` is `okb diff` between that snapshot and the folder: added, removed and renamed classes, slots and instances (with old and new names), renamed edge types (`:MAKER` to `:PRODUCER`), changed rules and links, and changed source files. `changes.json` is the same as data (`diff --json` plus the source changes) for tools. Nothing needs git, and the output depends only on the files and `SOURCE_DATE_EPOCH` (the date in the heading), so the same release is the same bytes. The first release has no previous version and says so.

**The manifest.** It has the shape the Canvas KB's consumers read:

```json
{
  "id": "wine-and-food",
  "version": "1.1.0",
  "title": "Wine and Food",
  "datasets": {
    "docs": { "path": "docs", "description": "...", "files": { "guide.md": "<sha-256>" } },
    "ontology": { "path": ".", "description": "...", "files": { "edges.jsonl": "<sha-256>", "nodes.jsonl": "<sha-256>", "okb.json": "<sha-256>" } }
  },
  "provenance": {}
}
```

`docs` lists the files registered as sources (`okb source add`) with paths relative to the folder they share, and is left out when there are none. `ontology` lists the three graph files. `id` comes from the ontology's name the first time and is kept after that, and `description` and `provenance` are carried forward from the previous manifest if you wrote them by hand. Keys and files are sorted.

Where it differs from the Canvas KB's manifest: the Canvas KB keeps `manifest.json` next to its `ontology/` and `docs-<date>/` folders and requires each dataset folder to hold exactly the files listed. An okb manifest lives inside the ontology folder, so its `ontology` dataset has `path: "."` and the folder also holds files the manifest doesn't pin (`manifest.json`, `RELEASES.md`, `releases/`, and in `docs` anything else in the folder). A verifier that treats unlisted files as an error will report them. A verifier that checks the listed files (what `okb release verify` does) works unchanged. The version is semver where the Canvas KB's is a date and a tag (`2026-10-14-v3`); `verify` accepts any string. To use a Canvas-style layout, put the KB folder inside a folder, name it `ontology`, and copy `manifest.json` up one level with `path: "ontology"`.

`okb release verify` checks that every pinned file exists and matches its SHA-256, and that `okb.json` carries the manifest's version. It changes nothing and exits 1 on a difference, so a server or CI job can run it before it trusts the files. After a release, any edit to the folder makes it fail until the next release, which is the point: the version names exact bytes.

## Exporting to a graph database

`okb export` writes the data as JSON or as an openCypher script for Neo4j, Neptune and Memgraph (the `okb-export/2` format). What it writes, its options and an example are on the [Export](build/export.md) page.

Files from the previous formats are converted automatically the next time okb loads them. `okb-lpg/1` used `HAS_VALUE` edges. `okb-lpg/2` to `okb-lpg/3` changes how new ids are made and adds [timestamps](#timestamps) to new nodes, so no id changes, no timestamps are added to existing nodes, and only the version in `okb.json` moves. The same release changes the file layout (see below): a folder with `nodes.json` and `edges.json` loads as it is, and the next command that saves writes `nodes.jsonl` and `edges.jsonl` and removes the two old files.

## Example (from packages/okb/examples/wine)

```json
{ "type": "Class", "id": "c.dessert-wine", "name": "DessertWine",
  "description": "Sweet wine served with or as dessert.",
  "fixedValues": { "s.sugar": "sweet" } }

{ "type": "Slot", "id": "s.maker", "name": "maker", "valueType": "Instance", "relType": "MAKER",
  "cardinality": "single", "minCardinality": 1, "description": "The winery that produced the wine." }

{ "from": "c.port", "type": "IS_A", "to": "c.red-wine" }
{ "from": "c.port", "type": "IS_A", "to": "c.dessert-wine" }
{ "from": "s.maker", "type": "INVERSE_OF", "to": "s.produces" }
{ "from": "i.chateau-morgon-beaujolais-ygb1b8", "type": "MAKER", "to": "i.chateau-morgon-ypqfhf" }
{ "from": "c.red-wine", "type": "GOES_WELL_WITH", "to": "c.red-meat" }
```
