# Ways to build

You can build an ontology three ways. They all produce the same three JSON files, check against the same rules, and you can switch between them at any point. Pick the one that matches what you have in hand.

| If you have...                                       | Start with                                      | What you do                                                                  |
| ---------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------- |
| An idea and a blank page, and you use Claude         | [With Claude](with-claude.md)                   | Claude asks the questions, runs the commands and explains each finding.      |
| An idea and a blank page, and you like a terminal    | [With the CLI](with-the-cli.md)                 | You run the `okb` commands yourself, one step at a time.                     |
| Documentation that already states the facts you need | [From existing docs](../EXTRACTION-PIPELINE.md) | You quote the docs, draft one claim per quote, and have every claim checked. |

## Which one first?

Start from a blank page, even if you have docs. Extraction works best once you know the method, because the questions you want answered decide what's worth quoting. A first ontology from scratch takes about an hour, and it teaches you what to look for in your own docs.

- **Never built an ontology?** Use [With Claude](with-claude.md) if you have Claude, or [With the CLI](with-the-cli.md) if you don't. The [Quickstart](../getting-started/quickstart.md) is a five-minute version of the CLI path.
- **Built one and want to scale up?** Go to [From existing docs](../EXTRACTION-PIPELINE.md). It needs a scope and at least three competency questions first, so it builds on either of the other two.

All three follow the same [methodology](../METHOD.md) in eight steps. You don't give up the method by letting Claude type for you.

## After you build

Once you have something that runs, two pages cover the rest of the loop:

- [Review and iterate](review.md) checks the ontology against the rules a script can't judge.
- [Export](export.md) writes it as JSON or openCypher for a graph database or an app.
