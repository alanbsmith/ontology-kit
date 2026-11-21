# The okb file format (`okb-lpg/3`)

An ontology built with okb is a folder with three JSON files:

| File         | Contents                                                                                  |
| ------------ | ----------------------------------------------------------------------------------------- |
| `okb.json`   | Tool state: format version, name, `currentStep`, the meta-KB version it was created with. |
| `nodes.json` | A list of nodes. Each has `id`, `type` and type-specific properties.                      |
| `edges.json` | A list of edges. Each has `from`, `type`, `to` and sometimes properties.                  |

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

Ids never change when you rename something, so edges stay valid.

### Ids

An id is a readable prefix, a dot, and a part that says which node it is. Two people editing the same ontology on two git branches must never create the same id, because git merges the text without a conflict and the result would hold two nodes with one id (or an edge that now points at the wrong node). So the id scheme depends on whether two people could add _different_ nodes under the same name:

- **Questions, decisions, instances and quotes carry a tag.** `<tag>` is six random characters from the lowercase alphabet `0-9a-z` without `i`, `l`, `o` and `u` (30 bits, so `cq.k7x2mq`, `d.3fh9xe`, `i.margaux-4t8wzn`). The slug part, where there is one, is only there to read.
- **Classes, slots, terms, reused ontologies, sources and rules keep a plain slug** (`c.wine`, `s.maker`), because the name is the identity: two branches that both add a class `Wine` added the same thing, and git reports that as a conflict for a person to resolve. If the plain slug is taken in the folder you're editing, the new id gets a tag instead of a counter (`c.wine-4t8wzn`), because a counter would depend on what that branch already holds.
- **The short numbers people type are positions, not ids.** `okb cq list` and `okb decision list` number the entries 1, 2, 3 in file order, and `okb cq link 2 Wine` or `ont.find("2", "CompetencyQuestion")` takes the second. The numbers shift when something earlier is removed, so a script that needs a stable reference uses the id.
- **Ids made before `okb-lpg/3` stay as they are** (`cq.1`, `d.2`, `i.margaux-2`, `loc.guide.1`). The number in an old `cq.3` still answers to `3`, and nothing is renamed.

Set `SOURCE_DATE_EPOCH` (seconds since 1970, the reproducible-builds convention) and the tag is derived from it, the type, the name and a counter instead of being random, so a generated folder like `packages/okb/examples/wine` rebuilds byte for byte. Don't set it when several people edit one ontology: the same name then gives the same tag on every branch.

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
| `Ontology`                                                                                                     | An ontology folder. `Ontology.load(folder)` reads `okb.json`, `nodes.json` and `edges.json` from the folder or a parent, and converts an `okb-lpg/1` folder in memory. `Ontology.fromData(nodes, edges)` builds one from data you already have.                                                                            |
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

## Exporting to a graph database

`okb export` writes the data as JSON or as an openCypher script for Neo4j, Neptune and Memgraph (the `okb-export/2` format). What it writes, its options and an example are on the [Export](build/export.md) page.

Files from the previous formats are converted automatically the next time okb loads them. `okb-lpg/1` used `HAS_VALUE` edges. `okb-lpg/2` to `okb-lpg/3` changes only how new ids are made, so no id changes and only the version in `okb.json` moves.

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
