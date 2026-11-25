---
summary: The projects around Ontology Kit, whether each is public, and what this public repo may say about it.
updated: 2026-11-25
---

# Related projects

This repo is public. Before you describe another project here, in an issue or in a PR, check its row. A private project may be named, but its internals (file formats, code, data) stay out of anything public. Ask the owner before you change a row.

| Project   | Visibility                  | What it is to Ontology Kit                                                                                                                                    | What's fine to say in public                                                                     |
| --------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| okb-mcp   | Private                     | The MCP server that serves an okb ontology. It moves into this repo as `@ontology-kit/mcp` in #94, then the repo is archived.                                 | Its name, its tools (`describe_ontology`, `find`, `get`, `traverse`, `list_rules`), and the move |
| canvas-kb | Private                     | The Canvas Kit design-system KBs and the servers that serve them. The first real KB built with okb, and the source of the extraction milestone's guidance.    | Its name and that it's the first real KB                                                         |
| Tokens KB | Not started                 | A design-token KB. A test of a KB with different constraints ([decision 0027](decisions/0027-cross-kb-references-before-one-point-zero.md)). Its own project. | Everything planned here                                                                          |
| Icons KB  | Not started                 | An icon KB, the same kind of test. Its own project.                                                                                                           | Everything planned here                                                                          |
| eval-kit  | Private, to be public later | The owner's agent evaluation tools: the first evaluation runner for goal 6 ([decision 0030](decisions/0030-an-evaluation-runner-for-goal-6.md)).              | Its name. Plans and issues call it "an evaluation runner".                                       |

The Canvas KB points at the tokens and icons KBs, which is why cross-KB references come before 1.0.
