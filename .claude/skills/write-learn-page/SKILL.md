---
name: write-learn-page
description: Write or review a Learn page (docs/learn/*.md), one short page that teaches one idea with a definition, a Mermaid picture, an espresso graph and a real okb command. Use it when adding a page to the Learn group, editing "What is a knowledge graph?", or checking that every Learn page has the same sections, voice, links and graph embed.
---

# Write a Learn page

A Learn page explains one idea in about one screen. The reader has a problem to solve, not a vocabulary to learn. `docs/learn/knowledge-graphs.md` is the model: read it and copy its shape. The tutorials teach by building. A Learn page teaches by showing the idea, then pointing at the tutorial where it plays out at full size.

The general voice rules are in CONTRIBUTING's "Writing style", and Vale applies the `Beginner` rules to `docs/learn/`. The `write-tutorial` skill has the voice and link conventions both share. This skill covers what is special to Learn pages.

## Files and routes

- One file per page: `docs/learn/<slug>.md`. Route: `/learn/<slug>/`, in `site/src/nav.ts` with a sidebar label (the question or the idea, short).
- Add the page to `PAGES` and list it in a chapter in `LEARN_CHAPTERS`, or `tests/site.test.ts` fails.
- The title is the first level-1 heading. Phrase it as the question the reader has ("What is a knowledge graph?").

## Standalone chapters

Each chapter must make sense without the others, because readers can start anywhere. When a page uses a term or idea from outside its own chapter (a class, an instance, a slot, a competency question, the class hierarchy), give it a one-clause definition and a glossary link at its first mention on that page, and check the anchor exists. The chapter opener also lists what to know first, one line and one link each. Don't re-explain the Vertex Coffee example: the overview introduces it once (the made-up café, what a ring and a dot mean, how to use a graph). A page only reminds the reader in one sentence and links `index.md#how-to-read-the-graphs`.

## Overview, openers and closing page

The overview (`index.md`), each chapter opener and the closing page (`where-next.md`) aren't concept pages, so they skip the seven sections. They start with an H1 and follow CONTRIBUTING's "Page format" and "Writing style". Keep each short.

- **Overview** (`/learn/`, first in the Learn group): who the course is for, that the chapters can be read in any order, a table of the chapters with the question each answers, `## How to read the graphs` (the Vertex Coffee example, rings and dots, the inspector), one whole-ontology `<okb-graph>` under `## Explore it all`, and a pointer to the Quickstart and tutorials.
- **Chapter opener** (about 150 words): what the chapter covers and why you'd read it, `## What you should know` (a one-line refresher with a glossary link per prerequisite, or "Nothing"), `## The pages` (one line each, saying the question it answers), and a link to the next chapter. No graph.
- **Closing page** (last in the group): what the reader can now do, in their terms, then where to go: Quickstart, tutorials, Build, Reference.

## Adding a chapter

1. Write the opener, `docs/learn/<slug>.md`, from the template above.
2. Add its pages (see "Files and routes" and "Page layout").
3. Add every new page to `PAGES` in `site/src/nav.ts`, and one entry to `LEARN_CHAPTERS` with the title, the opener's `route` and its page routes in order.
4. Audit each page against "Standalone chapters", and link the new chapter from the overview's table and the previous chapter's "Next" line.
5. Run `pnpm test`: it fails on a page that is in no chapter or two, an opener with no page, or a missing glossary anchor.

## Page layout

Keep these sections in this order, with these names. Every Learn page has all seven.

1. `## In short`: one sentence that defines the idea, then a Mermaid picture of it. The sentence uses plain words and no term the page hasn't explained.
2. `## See it`: the espresso graph (see below). Before it, say in one or two sentences that the graph is from the [espresso tutorial](../../examples/espresso/tutorial/0-intro.md) and link it, say what a ring and a dot are if the page needs them, and say how to use it only if the page needs more than the graph's own inspector text. After it, name what to notice: two or three sentences that turn the picture into the idea. Link glossary terms here, with a clue.
3. Optional extra sections, three words or fewer each, such as `## What okb adds` or `## Explore it all` (the full espresso graph with filters). Add one only when the idea needs it. Keep the page to about one screen.
4. `## In okb`: the real command and what you'll see. Run it, then paste the real output. See "The In okb block".
5. A callout of common mistakes, with no heading (same format as the tutorials).
6. `## Related pages`: the tutorial where the idea appears at full size (wine or espresso), the glossary, and the Decision guide anchors that apply (`../DECISIONS.md#decision-instance-or-class`). Each item says why you'd go there.
7. `## Sources`: last. The paper title once as a link (say "(PDF)"), the page number, and one short verbatim quote that the meta-KB already holds (`grep` `meta-kb/data/nodes.json` for the `SourceLocation`, and use its `quote` and `page`). Don't quote more than one sentence.

Every section, including the first, has a heading.

## The espresso graph

Every Learn page shows the same ontology so readers meet it once. Embed it as raw HTML with a text fallback inside:

```html
<okb-graph src="/data/espresso.json" focus="Vertex breve, Vertex cappuccino" highlight="Vertex breve" label="One sentence that says what the graph shows">
<p>The graph shows two drinks from the Vertex Coffee menu in the espresso ontology.</p>
<ul>
<li>Vertex breve is an instance of Breve. It contains Double shot and Milk foam.</li>
</ul>
</okb-graph>
```

- `src` is `/data/<name>.json`: `espresso`, `wine`, `meta-kb`, or `wine-step-N`. `tests/site.test.ts` fails on a name with no endpoint.
- `focus` names the nodes that matter, by name or id (comma separated). Each name must match a node in the data: `tests/site.test.ts` fails on one that doesn't, so a rename in the tutorial can't silently turn a focused graph into the whole thing. The graph shows them, what they touch and the kinds above them. Pick two to four nodes that show the idea, so the graph has about 10 to 15 nodes. With no `focus`, the reader gets the whole graph and type filters: use that once per page at most, in an "Explore it all" section.
- `highlight` marks the one node the page is about (larger, bold, dashed halo). `show` adds node types such as `Slot` or `Term`.
- **No blank lines inside the element**, or Markdown ends the HTML block. The site test checks this.
- **The fallback is the text alternative and all GitHub shows.** It must say what the graph shows, in sentences. Don't start it with "Text version", because the site adds that label itself. Name every node and link the page relies on.
- Explain the names. The espresso data belongs to a made-up Vertex Coffee, so a name such as "Vertex breve" means nothing on its own. The sentence before the graph says so in a few words and links [how to read the graphs](index.md#how-to-read-the-graphs); the overview holds the full explanation.
- Never depend on color alone in the text: say "ring" and "dot", not "blue" and "pink".

## The Mermaid picture

- A `flowchart LR` of three to six nodes. It must have `accTitle` and `accDescr`; `tests/site.test.ts` fails without them.
- Use the same names as the graph (Vertex breve, Breve, Latte) so the two pictures read as one story.
- Label every edge with a short verb phrase: `instance of`, `is a`, `contains`.

## The In okb block

- Don't guess the output. Copy the espresso ontology to a scratch folder outside the repo (`cp -r examples/espresso $SCRATCH/espresso`), run the command from there (`node <repo>/src/cli.ts show "Vertex breve"`), and paste what it prints.
- The command goes in a `bash` block (so it gets a copy button) and the output in a `text` block. One command per idea.
- After the output, say what to look at in it, and tie it back to the graph ("The `contains` line is three edges").
- Link the command to its reference: `[`okb show`](../CLI.md#cmd-show)`.

## The mistakes callout

A quote block with a bold lead and two to four items. Each names a mistake a beginner would really make, then says what goes wrong. No links inside.

```markdown
> **Common mistakes**
>
> - **Mixing up a kind and an example.** "Breve" is a kind of drink. "Vertex breve" is one on the menu.
```

## Voice

- Answer the reader's question first, then the term. Examples before abstractions: show the drink, then name the idea.
- Say "you". Short sentences, under about 25 words. Reading grade 9 or lower.
- Link each glossary term at first mention (`../GLOSSARY.md#concept-class`) and add a clue. Check each anchor exists: `grep '<a id="concept-x">' docs/GLOSSARY.md`.
- Headings are three words or fewer, in sentence case, except the page title.
- American English. No "we". No "the paper" unless its title is nearby.

## Checks before you commit

```bash
pnpm tsc
pnpm test
pnpm lint:docs
node .claude/skills/okb-docs-drift/scripts/check-docs.ts
pnpm site
```

- `lint:docs` must report 0 errors. The "Beginners may not know" warning fires on terms the page links on purpose. Weigh the others.
- Open the page (`pnpm site:dev`) and check the graph: it loads only when scrolled to, the nodes you focused are there, Tab reaches them, and the fallback reads well on its own (open "Text version of this graph").

## Review list

1. All seven sections, in order, each with a heading.
2. The definition is one sentence with no unexplained term.
3. The Mermaid block has `accTitle` and `accDescr`, and the graph uses the same names.
4. The text before the graph links the espresso tutorial, reminds the reader of Vertex Coffee in one sentence with a link to the overview, and explains any other name the reader can't know.
5. The `<okb-graph>` fallback is a real description and doesn't start with "Text version".
6. The In okb output was run, not written.
7. The sources quote is verbatim, one sentence, from the meta-KB.
8. The page fits about one screen of reading.
9. Every term from outside the page's chapter has a one-clause definition and a glossary link.
