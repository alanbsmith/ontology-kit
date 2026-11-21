# Step 2: Reuse

## Introduction

Check whether someone has already modeled part of your subject, and write down what you found.

If a good wine vocabulary exists, borrowing its terms saves time. It also makes your data easier to combine with other people's. You can read the full guide to this step in [Method](../../../../../docs/METHOD.md#step-2-reuse).

## What you'll make

A recorded decision about reuse. In this tutorial the decision is "none", and you'll say why.

## Run the commands

Ontology 101 mentions existing wine vocabularies but builds its own, to teach the method. Record that choice and your reason:

```okb
okb reuse none --why "Following Ontology 101, which builds the wine ontology from scratch for teaching; a French-wine knowledge base or retailer vocabulary would be candidates in a real project."
```

## Read the output

- okb confirms in one line. It saved your reason as a [design decision](../../../../../docs/GLOSSARY.md#concept-design-decision), which is a note that stays with the ontology and explains a choice.
- Someone who opens the files in a year can read your reason and see that you looked and chose not to reuse.
- For your own project, spend about half an hour on this step. The guide (`okb step 2`) lists where to look, such as Linked Open Vocabularies and schema.org. You rarely need to import a whole vocabulary. Borrowing its terms and definitions is usually enough.

## Check your work

```okb
okb status
```

Step 2 now has a tick. Move on:

```okb
okb step next
```

> **Common mistakes**
>
> - **Letting this step stall you.** A quick search is enough for a first version.
> - **Skipping the record.** If you skip it, step 2 isn't complete, and okb keeps reminding you.

## Next step

You recorded that you're building from scratch, and why. Next, you'll brainstorm the words people use when they talk about wine and food.
