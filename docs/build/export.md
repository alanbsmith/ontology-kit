# Export

Your ontology lives in three plain JSON files, which suit okb and git. A graph database or an app wants something else: nodes with labels and properties, ready to load. `okb export` writes your **data** that way, as JSON or as an openCypher script for Neo4j, Neptune or Memgraph. The files in your folder don't change.

The ontology file format itself is in [File format](../FORMAT.md). This page covers the export. Either way, model the _meaning_ first (see _Model the domain, not the database_ in [Method](../METHOD.md)).

## Run an export

This is the coffee menu from [Review and iterate](review.md), with one instance, House Latte. Run `okb export` with no options to print JSON:

```bash
okb export
```

```json
{
  "format": "okb-export/2",
  "ontology": "Coffee Shop",
  "metaKbVersion": "2.4.2",
  "nodes": [
    {
      "id": "i.house-latte",
      "labels": ["Latte", "Espresso", "Drink"],
      "properties": {
        "okbId": "i.house-latte",
        "name": "House Latte",
        "size": "medium"
      }
    }
  ],
  "relationships": [],
  "notes": []
}
```

The real output spreads `labels` over several lines. Here it is shortened. To load it into a graph database, write an openCypher script instead:

```bash
okb export --format cypher --out coffee.cypher
cat coffee.cypher
```

```text
Wrote coffee.cypher: 1 nodes, 0 relationships (cypher).
// Coffee Shop: exported by okb (meta-KB 2.4.2)
// Every node carries okbId. To re-import, first run: MATCH (n) WHERE n.okbId IS NOT NULL DETACH DELETE n;

CREATE (:Latte:Espresso:Drink {okbId: "i.house-latte", name: "House Latte", size: "medium"});
```

House Latte is one node with three labels: its class, the class above it and the class above that. That's how a graph database says "a kind of".

## Options

```bash
okb export --format cypher --out wine.cypher        # openCypher CREATE script (Neo4j, Memgraph, Neptune)
okb export --out wine.json                          # {nodes: [{id, labels, properties}], relationships: [{type, from, to, properties}]}
okb export --with-schema --out wine-full.json       # also the class graph: (:OkbClass) nodes, IS_A, INSTANCE_OF, class-level values
okb export --no-inherited ...                       # don't copy fixed class values onto instances
okb export --no-rules ...                           # data only: leave out rules, quotes and sources
okb export --include-unverified ...                 # also rules that haven't passed verification yet
```

With `--with-schema`, the coffee menu's export grows from 1 node to 6 nodes and 5 relationships, because the five classes come along with their `IS_A` links. The full list of options is in the [CLI reference](../CLI.md#cmd-export).

## What you get

- Each **instance** becomes a node labeled with its class and every ancestor, most specific first: `(:Beaujolais:RedWine:Wine)`. Labels are flat, so multiple labels are how a graph database expresses is-a.
- **Property values**, including fixed values inherited from classes (`color: "red"` from RedWine), become node properties. Every node gets `okbId` and `name`.
- **Relationships** between instances are exported as-is. Class-level links to an instance (every Merlot's grape is _Merlot grape_) are copied onto each member with an `inheritedFrom` property. Class-level links to a class (RedWine goes well with RedMeat) exist only in the schema, so they're exported with `--with-schema`.
- **Rules** come along by default, so an app reading the export gets the guidance with the data. Each verified domain rule becomes an `(:OkbRule {statement, modality, authored, verification, governsClasses, governsSlots, governsInstances, <qualifier slots>})` node that `CITES` its quote, `(:OkbSourceLocation {quote, locator, sourceLink, ...})`, which is `PART_OF` its document, `(:OkbSource)`. `governsClasses` holds class names, so `MATCH (r:OkbRule) WHERE "Button" IN r.governsClasses` works against instance labels without the schema. A rule also gets `GOVERNS` edges to the instances it's about, and to `(:OkbClass)` nodes with `--with-schema`. Its qualifier values are properties named by their slots, `REFINES` edges (with `adds`) join exported rules, and `FULFILLS` edges run from instances to exported rules.
- **Only verified rules are exported.** A rule that's unverified, OVERREACH but not yet approved, or UNSUPPORTED is left out, and so is any link whose `rule` property points at it, because that rule is the link's only justification. The export's `notes` say how many were held back. `--include-unverified` exports them with their `verification` status (`UNVERIFIED` when there's none yet), for review tools rather than apps.
- **Every `rule` property points at an exported `OkbRule` node.** With `--no-rules` the property is removed from links, since the id would point at nothing.

The coffee ontology has no rules, so its export has none. Rules come from [extracting them from documents](../EXTRACTION-PIPELINE.md), which also explains why only verified ones leave the toolkit.

## The export format

The export format is `okb-export/2`. Version 1 had no rules, so every node in it was an instance.

## Load it

Run the `.cypher` script in your graph database's query tool. Its header gives the statement that clears an earlier import first, so you can load again after a change. The JSON export gives each node an `id`, its `labels` and its `properties`, and each relationship a `type`, `from`, `to` and `properties`, for an app or an importer of your own.
