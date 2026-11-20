# Introduction

Ontology Kit helps you turn knowledge that lives in documents into a structured, sourced knowledge base that people and AI agents can both rely on. It guides you through building your first ontology, following the method in **Ontology Development 101** (Noy & McGuinness, 2001).

It's written for a developer whose team's knowledge sits in docs (component guidelines, API references, how-to guides) and who wants it structured, checked and traceable to its source. You don't need to know what an ontology is yet.

## What's in the kit

It has three parts:

| Part                     | What it is                                                                                                                                                                                                                                                                                   |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **meta-KB** (`meta-kb/`) | A knowledge base _about building knowledge bases_: the 8-step method, 40 glossary concepts, 7 principles, 10 decision guides and 57 rules. Every rule cites a verbatim, page-checked quote from the paper (or Gruber 1993), or says plainly that it's a toolkit convention.                  |
| **okb** (`src/`)         | A command-line tool that creates the ontology one step at a time, refuses common mistakes as you make them, checks everything against the meta-KB rules, and explains every finding in plain language.                                                                                       |
| **Skills** (`skills/`)   | Instructions for Claude: **ontology-coach** (hand-holding from a blank page), **ontology-review** (a second opinion on the judgment rules a script can't check) and **build-domain-kb-from-docs** (extracting an ontology from existing documentation with a quote-first verification gate). |

## The path from here

1. **Learn the method.** An ontology is a precise, shared vocabulary for one subject. It says what _kinds_ of things exist (classes), how they're organized ("a Red Wine is a kind of Wine"), what you can say about them (slots like `body` or `maker`), and the rules for filling those in (facets). Add real examples (instances) and you have a knowledge base. The [wine tutorial](../../examples/wine/tutorial/0-intro.md) builds the paper's wine ontology command by command, with real output.
2. **Install okb.** See [Installation](installation.md).
3. **Build your first ontology.** Ask Claude to `coach me through building an ontology` (this uses the ontology-coach skill), or run the commands yourself:

   ```bash
   okb init my-ontology --name "My Ontology"
   cd my-ontology
   okb status          # where you are and what's next, at any time
   okb step            # the guide for the current step
   okb explain range   # plain-language explanation of any term, rule or step
   okb validate        # check your work (only rules relevant to your current step)
   ```

4. **Turn your docs into a knowledge base.** `okb source add docs/button.md` reads markdown (frontmatter, headings, lists, callouts, prop tables) and `okb quote add` finds your quote in it by heading and line. The full quote-first pipeline is in [From existing docs](../EXTRACTION-PIPELINE.md).

The full guide is [Methodology](../METHOD.md). The reference pages are the [glossary](../GLOSSARY.md), [every rule and its source](../RULES.md), [modeling choices](../DECISIONS.md) and the [file format](../FORMAT.md).

## The method at a glance

| Step         | You'll produce                                                                            | Key commands                                                                                         |
| ------------ | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1. Scope     | domain, purpose, users, out-of-scope, 3+ competency questions                             | `okb scope`, `okb cq add`                                                                            |
| 2. Reuse     | what existing vocabularies you considered                                                 | `okb reuse add`, `okb reuse none`                                                                    |
| 3. Terms     | an unsorted brainstorm list                                                               | `okb term add`                                                                                       |
| 4. Classes   | naming convention, class hierarchy, disjointness                                          | `okb convention`, `okb class add`, `okb class disjoint`, `okb tree`                                  |
| 5. Slots     | properties (values) and relationships (links), attached at the right level                | `okb property add`, `okb relationship add`, `okb show`                                               |
| 6. Facets    | value types, allowed values, ranges, cardinality, fixed values, inverses, edge properties | `okb slot set`, `okb class fix`, `okb relationship inverse`, `okb relationship property`, `okb link` |
| 7. Instances | real examples, which test the steps before                                                | `okb instance add`                                                                                   |
| 8. Review    | questions linked to what answers them, decisions recorded                                 | `okb cq link`, `okb validate --all`, `okb decision add`                                              |

When it's built, `okb export --format cypher --out my.cypher` writes the data for a graph database: instances as nodes labeled with their class chain, properties on the nodes, relationships as typed edges, and the verified domain rules with the quotes they cite.

## Findings

- **Errors** (MUST rules): fix them.
- **Warnings** (SHOULD rules): fix them, _or_ record a design decision that explains why not. For example, `okb decision add --title "..." --decision "..." --why "..." --about Sauternes --waives naming-singular-plural-consistent`. Explained warnings stop counting against you but stay visible.
- **Hints** (MAY rules): prompts to think about; nothing to fix.
- Warnings and hints appear once you reach the step they belong to. Errors always appear. `okb validate --all` shows everything.
- The **ontology-review** skill covers what a script can't judge, such as whether siblings are equally general or whether something should be a class or a value. It works through the `judgment` rules with you.
