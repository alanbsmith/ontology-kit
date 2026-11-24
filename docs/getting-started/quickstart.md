# Quickstart

## Introduction

You'll build a tiny ontology for a coffee shop menu, break a rule on purpose, and run your first `okb validate`. You need okb installed first. See [Installation](installation.md) (`okb --help` is the check).

An [ontology](../GLOSSARY.md#concept-ontology) is a checked description of a subject: the kinds of things in it, what you can say about each kind, and examples. The point of okb is that it checks your description as you write it, so mistakes show up in seconds instead of in production. This page shows that loop on a small scale. The method behind okb comes from [_Ontology Development 101_](https://protege.stanford.edu/publications/ontology_development/ontology101.pdf) by Noy and McGuinness (PDF), which these docs call Ontology 101.

## Create the folder

Run `okb init` to make a folder named `coffee`, then move into it:

```bash
okb init coffee --name "Coffee Shop"
cd coffee
```

```text
✓ Created ontology 'Coffee Shop' in /path/to/coffee
```

`okb init` makes a folder with three plain text files (`okb.json`, `nodes.jsonl` and `edges.jsonl`), so you can commit it to git like any other code. Each node and edge is one line, so two people editing different things rarely conflict. It also prints the guide for step 1 of the method, which this page skips. The output above is trimmed to its first line, and your path will be your own. `okb step` shows it again whenever you want it.

## Set the scope

Write down what the ontology is for with `okb scope`, then confirm the naming convention:

```bash
okb scope --domain "Drinks sold at a coffee shop" --purpose "Check a menu for mistakes" --users baristas --out-of-scope "staff schedules"
okb convention
```

```text
Coffee Shop
  domain        Drinks sold at a coffee shop
  purpose       Check a menu for mistakes
  users         baristas
  maintainers   —
  out of scope  staff schedules
  kind          application

Naming convention: classes PascalCase (singular) · slots camelCase · instances free text
```

Without a stated purpose, every drink, supplier and opening hour looks like it belongs, and the ontology never finishes. A line about [scope](../GLOSSARY.md#concept-scope) lets you say no. `okb convention` confirms how okb will name things, so `Drink` and `Espresso` stay consistent. The defaults are fine.

## Add a class

A [class](../GLOSSARY.md#concept-class) is a kind of thing. Add one for drinks, and a more specific one below it:

```bash
okb class add Drink --desc "Something you can order to drink."
okb class add Espresso --parent Drink --desc "A small, strong coffee."
```

```text
Added class Drink at the top level.
Added class Espresso (a kind of Drink).
```

The `--parent` link says every Espresso is also a Drink. That matters later: anything you say about drinks applies to espressos for free, so you state it once.

## Add a slot

A [slot](../GLOSSARY.md#concept-slot) is something you can say about a kind of thing. Give every drink a size, and limit it to three values:

```bash
okb property add size --on Drink --type Enumerated --values small,medium,large --card single
```

```text
Added property size on Drink (Enumerated).
  Add a one-line description: okb slot set size --desc "..."
```

Listing the allowed values is what lets okb catch a typo like `larg` before it spreads. `--card single` sets the [cardinality](../GLOSSARY.md#concept-cardinality), how many values a slot can hold. Here each drink has at most one size.

## Add an instance

An [instance](../GLOSSARY.md#concept-instance) is one real example of a class:

```bash
okb instance add Cortado --of Espresso size=small
```

```text
Added Cortado (an Espresso).
Cortado.size = "small"
```

The size slot belongs to Drink, and Cortado is an Espresso, so it [inherits](../GLOSSARY.md#concept-inheritance) the slot. Now break the rule on purpose:

```bash
okb instance add Flat --of Espresso size=tiny
```

```text
✗ size must be one of small, medium, large; got 'tiny'.
```

okb refused it and exited with an error, so the bad value never reached your files. This is the quickest way to see why the list of values was worth writing.

## Validate

Run `okb validate` to check your work:

```bash
okb validate
```

```text
✗ 0 error(s)   ! 1 warning(s)   i 0 hint(s)   · checks for steps 1–1 (use --all for the rest)

WARNINGS: fix, or record a design decision explaining why not
  ! There are 0 competency questions; write at least 3 (`okb cq add`). [scope-competency-questions]
      Fix: `okb cq add "..."`.

Learn about any rule: okb explain <rule-id>   ·   add --why for reasons and sources
(4 warning(s)/hint(s) from later steps are hidden until you get there; okb validate --all shows them. Errors are never hidden.)
```

No errors, so your ontology is well formed. The one warning is a nudge. A [competency question](../GLOSSARY.md#concept-competency-question) is a question the finished ontology must be able to answer, like "Which drinks come in large?". Writing three gives you a way to tell when you're done. okb only shows rules for the step you're on, so later problems stay hidden until they matter. Errors always show.

Run `okb explain scope-competency-questions` to read why a rule exists and where it comes from. Every finding has a rule id like that.

## Check status

Run `okb status` to see where you are in the method:

```bash
okb status
```

```text
Coffee Shop  · 2 classes · 1 slots · 1 instances · 0 questions

▶ 1. Determine the domain and scope ◀ you are here
     ✓ Domain and purpose are written down
     ✓ Users (and ideally maintainers) are named
     ○ At least three competency questions
     ✓ At least one thing is explicitly out of scope

○ 2. Consider reusing existing ontologies
○ 3. Enumerate important terms
✓ 4. Define the classes and the class hierarchy
✓ 5. Define the properties of classes (slots)
✓ 6. Define the facets of the slots
○ 7. Create instances
○ 8. Review against your questions, and iterate

Validator (steps 1–1): ✗ 0  ! 1  i 0   okb validate for details

See the guide for this step: okb step
```

`okb status` follows the eight steps of the Ontology 101 method, which the [Method](../METHOD.md) page explains in full. Run it whenever you're unsure what to do next. You jumped ahead to classes and slots here to see results fast. The method goes in order, and the next section shows where to learn it.

## Next steps

- **Follow the method properly.** The [wine tutorial](../../packages/okb/examples/wine/tutorial/0-intro.md) builds a full ontology from step 1 to step 8, with the real output of every command.
- **Look up a term.** `okb explain <topic>` explains any concept, rule, step or decision guide, such as `okb explain class`.
- **Have Claude coach you.** Ask `coach me through building an ontology` once you've installed the skill (see [Installation](installation.md)).
