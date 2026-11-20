# Introduction

Your team's knowledge probably lives in docs: component guidelines, API references, how-to guides. Ontology Kit helps you turn that into a structured knowledge base where every fact points back to its source. People and AI agents can then look facts up and trust them.

You don't need to know what an ontology is yet. An [ontology](../learn/ontologies.md) is a precise, shared vocabulary for one subject. It says which kinds of things exist and what you can say about each one. Ontology Kit teaches you to write one by following the method in **Ontology Development 101** (Noy & McGuinness, 2001).

## What's inside

The kit has three parts. You use all three, but you only type to one of them.

- **The `okb` tool** (in `src/`) is a command-line program. It creates your ontology one step at a time, stops common mistakes as you make them, and explains every problem it finds in plain words.
- **The meta-KB** (in `meta-kb/`) is what `okb` checks your work against. It's a knowledge base about building knowledge bases: the steps, the vocabulary, and the rules. Every rule quotes the paper it comes from, or says it's a toolkit convention. [Where do the rules come from?](../learn/meta-kb.md) shows how.
- **The skills** (in `skills/`) are instructions that let Claude work with `okb` for you:
  - **ontology-coach** guides you from a blank page.
  - **ontology-review** gives a second opinion on the judgment calls a script can't check.
  - **build-domain-kb-from-docs** pulls an ontology out of existing docs, and checks every quote before it keeps it.

## Your path

1. **Learn the method.** Start with the [Learn course](../learn/index.md). The key idea is that you sort things into _kinds_. The method calls a kind a [class](../learn/classes-and-instances.md), so "Red Wine is a kind of Wine" is a class hierarchy. Then you describe each kind with _properties_ such as `body` or `maker`. The method calls these [slots](../learn/properties-and-relationships.md). You can limit what a property accepts with [facets](../learn/facets.md), and add real examples (the method calls them instances). The [wine tutorial](../../examples/wine/tutorial/0-intro.md) builds the paper's wine ontology command by command, with real output.
2. **Install okb.** Follow [Installation](installation.md).
3. **Build your first ontology.** Try the [Quickstart](quickstart.md) for a small one. Or ask Claude to `coach me through building an ontology`, which uses the ontology-coach skill. Or run the commands yourself:

   ```bash
   okb init my-ontology --name "My Ontology"
   cd my-ontology
   okb status          # where you are and what's next, at any time
   okb step            # the guide for the current step
   okb explain range   # plain-language explanation of any term, rule or step
   okb validate        # check your work (only rules relevant to your current step)
   ```

4. **Point it at your docs.** `okb source add docs/button.md` reads a markdown file. It understands frontmatter, headings, lists, callouts and prop tables. `okb quote add` then finds your quote in it by heading and line. The full pipeline, where every claim needs a quote, is in [From existing docs](../EXTRACTION-PIPELINE.md).

More ways to build are on the [Build](../build/index.md) pages. The step-by-step guide is the [method](../METHOD.md). The reference pages are the [glossary](../GLOSSARY.md), [every rule and its source](../RULES.md), [modeling choices](../DECISIONS.md) and the [file format](../FORMAT.md).

## The method

The method has eight steps. `okb step` shows the one you're on. Each step ends with something you can point to.

| Step         | You'll produce                                                                                       | Key commands                                                                                         |
| ------------ | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1. Scope     | what the subject is, who it's for, what's out, and at least three questions it must answer           | `okb scope`, `okb cq add`                                                                            |
| 2. Reuse     | a note of which existing vocabularies you considered                                                 | `okb reuse add`, `okb reuse none`                                                                    |
| 3. Terms     | an unsorted brainstorm list of the nouns people use                                                  | `okb term add`                                                                                       |
| 4. Classes   | a naming convention, the kinds stacked into a tree, and which kinds can't overlap                    | `okb convention`, `okb class add`, `okb class disjoint`, `okb tree`                                  |
| 5. Slots     | what you can say about each kind: plain values (properties) and links (relationships)                | `okb property add`, `okb relationship add`, `okb show`                                               |
| 6. Facets    | limits on those values: type, allowed values, number of values, fixed values, inverses, link details | `okb slot set`, `okb class fix`, `okb relationship inverse`, `okb relationship property`, `okb link` |
| 7. Instances | real examples, which test the steps before                                                           | `okb instance add`                                                                                   |
| 8. Review    | each question linked to what answers it, and your decisions written down                             | `okb cq link`, `okb validate --all`, `okb decision add`                                              |

When it's built, `okb export --format cypher --out my.cypher` writes the data for a graph database. Examples become nodes labeled with their kinds. Properties sit on the nodes, and relationships become typed edges. The verified rules come along with the quotes they cite.

## Findings

`okb validate` reports problems as findings. There are three levels:

- **Errors** are the rules the source says you must follow. Fix them.
- **Warnings** are the rules it says you should follow. Fix them, _or_ record a design decision that explains why not. For example: `okb decision add --title "..." --decision "..." --why "..." --about Sauternes --waives naming-singular-plural-consistent`. Explained warnings stop counting against you but stay visible.
- **Hints** are prompts to think about. There's nothing to fix.

Warnings and hints appear once you reach the step they belong to. Errors always appear. `okb validate --all` shows everything.

The **ontology-review** skill covers what a script can't judge. One example is whether something should be a kind or a value. It works through those judgment rules with you. To see a finding fixed, read [Reading a finding](../learn/rules-and-findings.md).
