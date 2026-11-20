# Tutorial: Espresso ontology

## Introduction

In this tutorial, you'll build a small knowledge base about coffee drinks using the okb CLI. It goes one step at a time and ends with an ontology that passes every check. It takes about an hour.

An [ontology](../../../docs/GLOSSARY.md#concept-ontology) is a shared, precise vocabulary for one subject. Say a café wants software that answers "what's the difference between a cortado and a latte?" The software has to know that both are milk drinks, and that one has twice the milk. An ontology is where you write that down so a program can check it.

This tutorial is a sibling of the [wine tutorial](../../wine/tutorial/0-intro.md). It follows the same eight steps. It also covers things wine doesn't: a class with two parents, a fact that sits on a link, and rules that come from a document.

## Who it's for

Developers who are comfortable in a terminal. You don't need to write code or know anything about ontologies. You don't need to know coffee either.

## What you'll build

A small ontology of espresso drinks: the drinks, what goes into them, and a short café menu.

## Before you start

Install okb and check that `okb --help` works. The [Quickstart](../../../docs/getting-started/quickstart.md) shows how.

## Create the ontology

Run the [`okb init`](../../../docs/CLI.md#cmd-init) command to make a folder named `espresso` and call the ontology "Espresso drinks":

```okb
okb init espresso --name "Espresso drinks"
```

```bash
cd espresso
```

## Read the output

- okb made a folder with three files: `okb.json`, `nodes.json` and `edges.json`. Every command from here on changes them.
- Each command appears in a block you can copy. What okb printed appears in a separate block under it.

> **Common mistakes**
>
> - **Running commands outside the folder.** okb looks for `okb.json` in the current folder, so run `cd espresso` first.
> - **Editing the files by hand.** Use the commands. They check your work as you go.

## Next step

You made an empty ontology. Next, you'll say what it's for and which questions it must answer.
