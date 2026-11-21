# @ontology-kit/format

Read the file format of [Ontology Kit](https://ontology-kit.dev): an ontology folder of `okb.json`, `nodes.json` and `edges.json`. It gives another tool the typed nodes and edges, loading (with conversion of older formats), the edge types the format reserves and the relationship values, without the `okb` command line, the meta-KB or the skills.

Needs **Node.js 24+**. It has no runtime dependencies.

```bash
npm install @ontology-kit/format
```

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

This package reads. To change an ontology, use the [`okb`](https://www.npmjs.com/package/@ontology-kit/okb) command. The exports follow semver, and `docs/FORMAT.md` lists them and says what counts as a breaking change. Before 1.0 any release may break them.

**Docs: [the format reference](https://ontology-kit.dev/reference/format/)**. The source is at [github.com/alanbsmith/ontology-kit](https://github.com/alanbsmith/ontology-kit).

## License

[MIT](LICENSE)
