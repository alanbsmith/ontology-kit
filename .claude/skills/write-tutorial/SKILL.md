---
name: write-tutorial
description: Write or edit an ontology-kit tutorial (packages/okb/examples/<name>/tutorial-src/*.md, built into pages by the tutorial engine). Use it when adding a new tutorial such as the espresso one, changing the wine tutorial, or reviewing tutorial pages, so every tutorial has the same page layout, voice, links and command-block conventions.
---

# Write a tutorial

A tutorial builds one ontology from scratch, one step per page. The wine tutorial (`packages/okb/examples/wine/tutorial-src/`) is the model. A new tutorial should feel like its sibling: same sections in the same order, same voice, same kinds of links. Read two or three of the wine pages before you start, and copy their shape.

This skill covers the writing. The mechanics (how the engine runs commands, what it writes) are in the header of `packages/okb/examples/lib/tutorial.ts` and the "Tutorials" section of `CONTRIBUTING.md`. The general voice rules are in CONTRIBUTING's "Writing style", and Vale enforces part of them on `packages/okb/examples/*/tutorial-src/*.md`.

## Files and routes

- One file per page: `0-intro.md`, then `1-scope.md` to `8-review.md`. The names are `N-slug.md`, and the number is the order.
- Page titles: the intro is `# Tutorial: <Name>` (for example `# Tutorial: Wine ontology`). Each step is `# Step N: <Word>` (`# Step 4: Classes`). Use the word the Method step uses.
- Routes live in `site/src/nav.ts`: the intro at `/getting-started/tutorial/<name>/` and the steps at `/getting-started/tutorial/<name>/N-slug/`. The sidebar label for the intro is the page title. The labels for the steps are `1. Scope`, `2. Reuse` and so on. Add every generated page there, or `packages/okb/tests/site.test.ts` fails.
- Never edit `packages/okb/examples/<name>/tutorial/` or `TRANSCRIPT.md`. They're generated. Edit the sources and run `pnpm example`.

## Page layout

Keep these sections in this order, with these names. The same names on every page are what make the tutorials feel alike.

### A step page

1. `## Introduction`: one sentence that says the goal, then a short paragraph on why it matters, using a concrete problem ("without this, you can't tell when you're done"). Define the step's key term here, once, with a glossary link and an example ("A class is a kind of thing, like Wine or Winery."). End the section with the sentence "You can read the full guide to this step in [Method](...)." as the last sentence of the last paragraph, not on its own line.
2. `## What you'll make`: what exists when the step is done, with real numbers ("21 classes in a tree").
3. The commands. Use one section, `## Run the commands`, for a short step. For a long step, split into short sections named for what they do: `## Add Wine`, `## Add colors`, `## Settle the terms`. Each section has a sentence or two that tells the reader what to do, then the command block.
4. `## Read the output`: what the reader should look at in what okb printed, as a short list. Keep it right after the commands. If a note explains one command, put it directly under that command instead (the `Wines` refusal on step 4 does this).
5. `## Check your work`: `okb status` (and `okb validate` where the step has checks), what a good result looks like, and then `okb step next` in its own block.
6. A callout of common mistakes (see below). It has no heading.
7. `## Next step`: a summary in two sentences: "You built X. Next, you'll Y." No link, because the page has Previous and Next buttons. On the last page, say what to do next with their own subject.

### The intro page

`## Introduction` (say "using the okb CLI" in the first sentence, and define what an ontology is), `## Who it's for` (developers, no coding needed, comfortable in a terminal, no ontology background), `## What you'll build`, `## Before you start`, `## Create the ontology`, `## Read the output`, the mistakes callout, and `## Next step`.

### The mistakes callout

A quote block (`>`) with a bold lead and a list. It renders as a callout on the site and as a quote on GitHub:

```markdown
> **Common mistakes**
>
> - **Plural names.** `Wines` instead of `Wine`. okb refuses these.
> - **No disjoint groups.** Without them, okb can't catch a wine labeled both red and white.
```

Each item names the mistake in bold, then says what goes wrong. Put no links in it.

## Voice

- **Instructive, not descriptive.** Tell the reader what to do. Not "The `init` command creates the folder", but "Run the `init` command to make a folder named `wine`, and use `--name` to call the ontology 'Wine and Food'." Start command lead-ins with a verb: Run, Add, Set, Pick, Record, Link.
- **Say "you".** Don't say "we". Vale flags "we", and the guide in CONTRIBUTING says to write for one reader.
- **Short sentences**, under about 25 words, and one idea per paragraph. Aim for reading grade 9 or lower.
- **Examples before abstractions.** Show the wine, then name the idea.
- **Headings** are three words or fewer, in sentence case, except the titles above.
- **Say why, then what.** After every new idea: the problem it solves, a small concrete example, and the command that uses it.
- **Name the source by its title once**, then call it by the short name. The wine tutorial says "[_Ontology Development 101_](url) by Noy and McGuinness (PDF), which this tutorial calls Ontology 101", and uses "Ontology 101" after that. Don't write "the paper" unless the title is in a nearby sentence.
- **American English.** Color, behavior, fulfill.
- Don't claim what a command prints until you've read the real output. Write the notes after you run the build, not before.

## Links

- **Link ontology terms to the glossary** at their first mention on each page, and again in a later section where the term is used on its own. Don't link twice in the same paragraph or section. Add a short clue next to a term the reader hasn't met: "a slot is a fact you can state about a class, such as `color`". Never use a term without a clue before it has been defined or linked.
- Use relative paths from `packages/okb/examples/<name>/tutorial/`: `../../../../../docs/GLOSSARY.md#concept-class`. A remark plugin turns them into routes, and the build fails on a link to a `.md` file with no route.
- The anchor is the meta-KB id with the dot changed to a dash: `concept-class`, `concept-disjoint`, `step-4-classes`. Check that each anchor exists in the generated doc (`grep '<a id="concept-x">' docs/GLOSSARY.md`), because the build doesn't.
- Link a command to its reference: `[`okb convention`](../../../docs/CLI.md#cmd-convention)`. The anchors in `docs/CLI.md` are `cmd-<command>`.
- Link the matching Method step: `../../../docs/METHOD.md#step-N-slug`.
- Link between tutorial pages with the file name: `[Step 1](1-scope.md)`.
- Links to other sites show a small arrow on their own. Use the real title as the link text, and say when the target is a PDF.

## Command blocks

- A block tagged `okb` holds only commands. One command per line, each starting with `okb`. Don't write a `$` prompt. A trailing `\` continues a line.
- Quote like a shell: `"tannin level"`, `location="Beaujolais, France"`.
- Add the word `fails` after the `okb` tag, on the opening fence line, for a command that must fail, to show a mistake on purpose. The build also fails if it unexpectedly works.
- A block tagged `include` holds a file name and is replaced by that file's contents. Use it to show what an earlier command wrote, such as the diagram.
- Other blocks (`bash`) pass through unchanged. Use `bash` for commands that aren't okb, like `cd wine`.
- On the page, commands and output come out as two blocks, and the command block gets a copy button. Readers can copy the commands without the output. Don't put output or comments in a command block.
- Group related commands in one block (six `cq add` lines), and put a sentence between groups. Don't put a wall of 30 commands in one block.
- `okb init <name>` runs from the examples folder, so the name must match the folder.

## The ontology must not change by accident

The commands in the sources create the ontology files. Reordering a command, changing an option or editing a quoted description changes `nodes.jsonl` or `edges.jsonl`. That includes the prose inside `--desc` and `--why` text, since okb stores it.

- After a rebuild, run `git diff --stat -- 'packages/okb/examples/<name>/*.json' 'packages/okb/examples/<name>/*.jsonl'`. For the wine example it must be empty. For a new tutorial, the diff is the whole point, so check the files by reading them.
- Add commands to a page that only read (`status`, `validate`, `show`, `tree`) freely. They don't change the files, but they do change the page output.
- Remember `okb step next` changes `currentStep` and what `validate` shows. Keep the same order the real work would have.

## Checks before you commit

Run all of these. They're the same ones every docs issue needs:

```bash
pnpm example
pnpm tsc
pnpm test
pnpm lint:docs
node .claude/skills/okb-docs-drift/scripts/check-docs.ts
pnpm site
```

- `lint:docs` must report 0 errors. Weigh the warnings. The "Beginners may not know" jargon warning fires on the very terms the tutorial teaches, so it's expected. Add new proper nouns (wine names, drink names) to `.vale/styles/config/vocabularies/Okb/accept.txt`.
- Open the built pages (`pnpm site:dev`) and read them as a newcomer. Check that the Previous and Next buttons follow the step order, the callouts read well, and every link goes somewhere.
- Read the generated page for each step, not just the source. The real output is what the reader sees.

## Review list

When you review a tutorial page, check each of these:

1. The sections are the ones above, in order, with the same names.
2. Every lead-in sentence tells the reader what to do.
3. Each ontology term is linked at first mention and has a clue.
4. "What you'll make" and "Next step" use the real numbers from the output.
5. "Read the output" says things that are true of the output on the page.
6. The mistakes callout has two to four items, each about a mistake a beginner would really make.
7. Headings are three words or fewer.
8. No "we", no "the paper" without the title nearby, no British spellings.
