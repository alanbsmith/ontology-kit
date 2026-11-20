# Learn what an ontology is

This course is for developers whose team's knowledge lives in docs, wikis and heads, and who want a program to answer questions from it. You don't need to know anything about ontologies yet. Each page takes a few minutes to read and shows one idea with a picture and one real command.

## The chapters

Read them in order, or jump to the one you need. Each chapter explains what it relies on, so you can start anywhere.

| Chapter                                   | The question it answers                                  |
| ----------------------------------------- | -------------------------------------------------------- |
| [The big picture](big-picture.md)         | What is a knowledge graph, and why start with questions? |
| [Things and kinds](things-and-kinds.md)   | How do I sort things into kinds and stack the kinds?     |
| [Describing things](describing-things.md) | How do I say what each thing is like?                    |
| [Staying honest](staying-honest.md)       | How do I know the result is consistent, and why?         |

When you finish, [Where next](where-next.md) points to the tutorials and the rest of the docs.

## How to read the graphs

Every page uses one example: the espresso ontology, for Vertex Coffee, a made-up café. A name such as "Vertex breve" is that café's breve, one drink on its menu. You can build the same ontology yourself in the [espresso tutorial](../../examples/espresso/tutorial/0-intro.md).

In the graphs, a ring is a kind of thing, such as Breve, and a dot is one real example of it, such as Vertex breve. A dashed outline marks what the page is about. Click a node to open the inspector and read about it. Drag a node to move it, drag the background to pan, and click the graph before you scroll to zoom. Under each graph, "Text version" describes it in words.

## Explore it all

Here is the whole espresso ontology. Use the checkboxes to add the terms, slots and competency questions that built it, and click any node to see what it links to.

<okb-graph src="/data/espresso.json" label="The whole espresso ontology">
<p>The espresso ontology has 31 classes and 16 instances.</p>
<ul>
<li>Drink is the top class. Espresso drink, Milk drink, Pure espresso and Sweetened drink sit below it, with the drinks themselves below those, such as Cortado, Latte, Mocha and Breve.</li>
<li>Ingredient is the other top class. It has Coffee, Water, Milk, Foam, Chocolate, Whipped cream and Gelato.</li>
<li>Sixteen instances tie the two together, such as Vertex cortado, which contains Double shot and Steamed whole milk.</li>
</ul>
</okb-graph>

## Prefer to build first?

If you learn by doing, start with the [Quickstart](../getting-started/quickstart.md) or build a whole ontology in the [wine](../../examples/wine/tutorial/0-intro.md) or [espresso](../../examples/espresso/tutorial/0-intro.md) tutorial, and come back here when a term needs explaining. The [Glossary](../GLOSSARY.md) defines every term.
