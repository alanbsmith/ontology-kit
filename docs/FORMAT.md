# The okb file format (`okb-lpg/2`)

An ontology built with okb is a folder with three JSON files:

| File         | Contents                                                                                  |
| ------------ | ----------------------------------------------------------------------------------------- |
| `okb.json`   | Tool state: format version, name, `currentStep`, the meta-KB version it was created with. |
| `nodes.json` | A list of nodes. Each has `id`, `type` and type-specific properties.                      |
| `edges.json` | A list of edges. Each has `from`, `type`, `to` and sometimes properties.                  |

It's a labeled property graph (LPG). In this file the **schema is data**: classes and slots are nodes, so the ontology can be validated, queried and versioned. For loading into Neo4j, Neptune or Memgraph, `okb export` flips that around (see [Exporting](#exporting-to-a-graph-database)). Either way, model the _meaning_ first (see _Model the domain, not the database_ in [METHOD.md](METHOD.md)).

## Vocabulary: slots, properties, relationships

Ontology 101 comes from frame-based systems and calls every attribute a **slot**. okb keeps that word in the file format and uses everyday names in the CLI:

| Ontology 101                                       | okb CLI                                   | OWL               | Graph database    |
| -------------------------------------------------- | ----------------------------------------- | ----------------- | ----------------- |
| slot with a String/number/Boolean/Enumerated value | **property** (`okb property add`)         | datatype property | node property     |
| slot with value type Instance                      | **relationship** (`okb relationship add`) | object property   | relationship type |
| class                                              | class                                     | class             | node label        |
| instance                                           | instance                                  | individual        | node              |
| facet                                              | facet                                     | restriction       | schema constraint |

The authoritative list of node and edge types lives in `meta-kb/src/format.yaml`, and `okb validate` enforces it (rule `struct-well-formed`). If you only use `okb` commands, you never need to edit these files by hand.

## Node types

| Type                 | Id pattern               | Key properties                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Ontology`           | `ontology` (exactly one) | `name`, `domain`, `purpose`, `users[]`, `maintainers[]`, `outOfScope[]`, `kind` (`application` \| `terminological`), `reuseReviewed`, `conventions`                                                                                                                                                                                                                                                               |
| `CompetencyQuestion` | `cq.N`                   | `text`, `status` (`draft` \| `answerable`)                                                                                                                                                                                                                                                                                                                                                                        |
| `Term`               | `t.<slug>`               | `text`, `disposition` (`undecided` \| `class` \| `slot` \| `instance` \| `value` \| `synonym` \| `out-of-scope`), `note`                                                                                                                                                                                                                                                                                          |
| `ReusedOntology`     | `r.<slug>`               | `name`, `url`, `decision` (`reuse` \| `adapt` \| `reference` \| `rejected`), `notes`                                                                                                                                                                                                                                                                                                                              |
| `Class`              | `c.<slug>`               | `name`, `description`, `synonyms[]`, `abstract`, `terminological`, `fixedValues{slotId: value}`, `defaults{slotId: value}`, `facetOverrides{slotId: {allowedValues, minCardinality, maxCardinality, range}}`                                                                                                                                                                                                      |
| `Slot`               | `s.<slug>`               | `name`, `description`, `valueType` (`String` \| `Integer` \| `Float` \| `Number` \| `Boolean` \| `Enumerated` \| `Instance`), `allowedValues[]`, `cardinality` (`single` \| `multiple`), `minCardinality`, `maxCardinality`, `default`, `relType` (relationships only: the edge type values are stored as), `edgeProperties[]` (relationships only: `{name, valueType, allowedValues?, required?, description?}`) |
| `Instance`           | `i.<slug>`               | `name`, `description`, `values{slotId: value \| [values]}` (property values only; relationship values are edges)                                                                                                                                                                                                                                                                                                  |
| `DesignDecision`     | `d.N`                    | `title`, `question`, `decision`, `rationale`, `alternatives[]`, `metaRules[]` (rule ids it explains), `date`                                                                                                                                                                                                                                                                                                      |
| `Source`             | `src.<slug>`             | `title`, `localPath`, `format` (`markdown` \| `pdf` \| `text`), `url`, `repoUrl`, `meta` (markdown frontmatter)                                                                                                                                                                                                                                                                                                   |
| `SourceLocation`     | `loc.<source>.N`         | `quote` (verbatim), `locator` (heading path, or `p.N`), `headingPath[]`, `startLine`, `endLine`, `lines`, `blockKind`, `sourceLink`, `pageLink`, `page`                                                                                                                                                                                                                                                           |
| `Rule`               | `rule.<slug>`            | `modality`, `statement`, `extracted`, `verification{status, checkedAgainst}`, `extractionConfidence`, `_originalDraft`. A domain rule extracted from documentation; see [EXTRACTION-PIPELINE.md](EXTRACTION-PIPELINE.md).                                                                                                                                                                                         |

Ids never change when you rename something, so edges stay valid.

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

## Property values and relationships

- A **property value** lives on the node: `Instance.values[slotId]`, or `Class.fixedValues[slotId]` for a fact about the whole class.
- A **relationship value** is an edge whose type is the relationship's `relType`: the slot name in UPPER_SNAKE case, following the openCypher convention. `maker` → `(wine)-[:MAKER]->(winery)`, `goesWellWith` → `:GOES_WELL_WITH`. An edge from a **class** is a fixed class-level value inherited by every member: `(RedWine)-[:GOES_WELL_WITH]->(RedMeat)`.
- **Inverses are stored once.** After `okb relationship inverse maker produces`, a winery's `produces` values are simply its incoming `:MAKER` edges. Setting either side writes the same single edge, because in a graph every edge can be followed from either end.
- **Edge properties** qualify one link: `(Radio)-[:PREFERRED_OVER {condition: "2 to 7 options", rule: "rule.use-radio…"}]->(SegmentedControl)`. Declare them on the relationship (`okb relationship property preferredOver condition --type String --required`; types String, Integer, Float, Number, Boolean, Enumerated). They're stored in the relationship slot's `edgeProperties` and set with `okb link <from> <rel> <to> name=value [--rule <rule id>]`. Each (from, relationship, to) has one edge, and linking again merges properties. `rule` is reserved: it points at the Rule node whose quote and verification justify the link, so each fact has exactly one citation chain. `okb validate` checks types, allowed values, required properties and rule references (`slot-edge-properties`). For qualifiers that need relationships of their own, make the relationship a class instead (`okb explain decision.edge-or-class`).
- Renaming a relationship retypes its edges. Relationship types can't reuse okb's structural edge names (IS_A, HAS_SLOT, ...) or another relationship's type.

## Exporting to a graph database

`okb export` writes the **data** the way graph databases expect it:

```bash
okb export --format cypher --out wine.cypher        # openCypher CREATE script (Neo4j, Memgraph, Neptune)
okb export --out wine.json                          # {nodes: [{id, labels, properties}], relationships: [{type, from, to, properties}]}
okb export --with-schema --out wine-full.json       # also the class graph: (:OkbClass) nodes, IS_A, INSTANCE_OF, class-level values
okb export --no-inherited ...                       # don't copy fixed class values onto instances
```

- Each **instance** becomes a node labeled with its class and every ancestor, most specific first: `(:Beaujolais:RedWine:Wine)`. Labels are flat, so multiple labels are how a graph database expresses is-a.
- **Property values**, including fixed values inherited from classes (`color: "red"` from RedWine), become node properties. Every node gets `okbId` and `name`.
- **Relationships** between instances are exported as-is. Class-level links to an instance (every Merlot's grape is _Merlot grape_) are copied onto each member with an `inheritedFrom` property. Class-level links to a class (RedWine goes well with RedMeat) exist only in the schema, so they're exported with `--with-schema`.

Files from the previous format (`okb-lpg/1`, which used `HAS_VALUE` edges) are converted automatically the next time okb loads them.

## Example (from examples/wine)

```json
{ "type": "Class", "id": "c.dessert-wine", "name": "DessertWine",
  "description": "Sweet wine served with or as dessert.",
  "fixedValues": { "s.sugar": "sweet" } }

{ "type": "Slot", "id": "s.maker", "name": "maker", "valueType": "Instance", "relType": "MAKER",
  "cardinality": "single", "minCardinality": 1, "description": "The winery that produced the wine." }

{ "from": "c.port", "type": "IS_A", "to": "c.red-wine" }
{ "from": "c.port", "type": "IS_A", "to": "c.dessert-wine" }
{ "from": "s.maker", "type": "INVERSE_OF", "to": "s.produces" }
{ "from": "i.chateau-morgon-beaujolais", "type": "MAKER", "to": "i.chateau-morgon" }
{ "from": "c.red-wine", "type": "GOES_WELL_WITH", "to": "c.red-meat" }
```
