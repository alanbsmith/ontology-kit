# Step 8: Review

## Introduction

Check the ontology against the questions you wrote in step 1, and run every check.

An ontology is only good if it does its job. This step is where you find out, and where you decide what to change. You can read the full guide to this step in [Method](../../../../../docs/METHOD.md#step-8-review).

## What you'll make

Every [competency question](../../../../../docs/GLOSSARY.md#concept-competency-question) linked to the [classes](../../../../../docs/GLOSSARY.md#concept-class) and [slots](../../../../../docs/GLOSSARY.md#concept-slot) that answer it, a clean `validate --all`, and a short list of hints you decide about.

## Run the commands

Link each competency question to the parts of the model that answer it. The first number is the question's number from step 1:

```okb
okb cq link 1 color body flavor sugar tanninLevel
okb cq link 2 Bordeaux RedWine WhiteWine
okb cq link 3 goesWellWith grape Seafood
okb cq link 4 RedMeat goesWellWith
okb cq link 5 goesWellWith body flavor
okb cq link 6 produces Winery
```

See the whole list:

```okb
okb cq list
```

Then run every check, including the ones hidden until now:

```okb
okb validate --all
```

## Read the output

- **The tips after `cq link`.** okb suggests related questions. If you ask about one wine's characteristics, you may also want them for white wines.
- **No errors.** An error means something is wrong. [How do I read and fix a finding?](../../../../../docs/learn/rules-and-findings.md) covers errors, warnings and hints. okb found none, so the ontology is valid.
- **Four hints, left on purpose.** `WineRegion`, `region` and `location` aren't needed by any question. Either add a question like "Where does this wine come from?", or remove them.
- **Two groups with no [disjoint](../../../../../docs/GLOSSARY.md#concept-disjoint) declaration.** This is worth a real conversation. A Bordeaux blend usually contains Merlot grapes. Are the classes Merlot and Bordeaux disjoint, then? It depends on whether Merlot means "varietal Merlot wine". Record your answer as a [design decision](../../../../../docs/GLOSSARY.md#concept-design-decision).

## Check your work

```okb
okb status
```

All eight steps have a tick. The two items marked `?` need a person: someone who knows wine should look at the tree, and you should decide which related questions to add. okb can't do that for you.

## Draw and export

Make a diagram of the classes and how they connect. Use `--out` to write it to a file, `diagram.md`, in your current folder. That's `wine`, so the file sits next to `okb.json`:

```okb
okb diagram --out diagram.md
```

okb wrote the diagram to `diagram.md` in Mermaid, a text format that GitHub and many Markdown previews draw for you. Here it is, drawn:

```include
diagram.md
```

A graph database wants the data the other way round: each [instance](../../../../../docs/GLOSSARY.md#concept-instance) becomes a node labeled with its class and all its parents. Write that out as Cypher and as JSON:

```okb
okb export --format cypher --out wine.cypher
okb export --with-schema --out wine-export.json
```

> **Common mistakes**
>
> - **Treating hints as errors.** A hint is a prompt to think. You can accept it and move on.
> - **Linking a question to everything.** Link only what's needed to answer it. The unused-part hint depends on this.
> - **Stopping at "no errors".** A valid ontology can still miss the point. Ask whether you could answer each question from it.

## Next step

You built a complete, valid ontology and exported it. To build one for your own subject, start again at [Step 1](1-scope.md) with your own domain, or ask Claude to coach you through it.

If you'd like more practice first, try the [espresso tutorial](../../espresso/tutorial/0-intro.md). It builds a small ontology of coffee drinks in the same eight steps, and it adds a class with two parents, rules from a document, and a warning you decide about.
