# Tutorial: Wine ontology

## Introduction

In this tutorial, you'll build a small knowledge base about wine and food using the okb CLI. You'll do it one step at a time, and end with an ontology that passes every check.

You don't need to know what an [ontology](../../../docs/GLOSSARY.md#concept-ontology) is yet. It's a shared, precise vocabulary for one subject. Say you run a restaurant and want software to suggest a wine for each dish. The software has to know that Bordeaux is a red wine, and that red wine goes well with grilled meat. An ontology is where you write that down so a program can check it. The Learn page [What is an ontology?](../../../docs/learn/ontologies.md) explains the idea in a few minutes.

The example comes from the paper [_Ontology Development 101_](https://protege.stanford.edu/publications/ontology_development/ontology101.pdf) by Noy and McGuinness (PDF), which this tutorial calls Ontology 101. It follows the paper's eight steps, and each step has its own page. The full method is in [Method](../../../docs/METHOD.md).

## Who it's for

This tutorial is for developers, but you don't need to write code. You only need to be comfortable working in a terminal: running commands, changing folders and reading what they print.

You don't need any background in ontologies, knowledge graphs or the wine trade. Each new idea is explained when it first appears.

## What you'll build

A folder called `wine` with three files in it: `okb.json`, `nodes.json` and `edges.json`. By the last page it holds 21 [classes](../../../docs/GLOSSARY.md#concept-class) (kinds of thing, such as Wine), 11 [slots](../../../docs/GLOSSARY.md#concept-slot) (facts you can state about a class, such as color), 9 [instances](../../../docs/GLOSSARY.md#concept-instance) (real things, such as one winery) and 6 [competency questions](../../../docs/GLOSSARY.md#concept-competency-question) (questions the ontology should answer), and `okb validate --all` reports no errors.

## Before you start

Install okb by following [Installation](../../../docs/getting-started/installation.md), then open a terminal.

## Create the ontology

First, create the ontology. Run the `init` command to make a folder named `wine`, and use the `--name` argument to call the ontology "Wine and Food":

```okb
okb init wine --name "Wine and Food"
```

Each command appears in a block you can copy. The output okb prints appears in a separate block under it, so you can copy the commands without it.

Then move into the new folder. Run every other command in this tutorial from inside `wine`:

```bash
cd wine
```

## Read the output

`init` printed the guide for step 1. It says what you'll do, why it matters and when you're done. Print the guide again at any time with `okb step`, and run `okb status` whenever you want to know where you are.

> **Common mistakes**
>
> - Running commands outside the `wine` folder. okb looks for `okb.json` in the current folder and its parents. If it can't find one, it says so and tells you how to create it.
> - Skipping ahead. Each step builds on the one before. okb only shows hints that matter for your current step, so you won't see everything at once.

## Next step

You created an empty ontology named "Wine and Food". Next, you'll write down what it's for and the questions it must answer.
