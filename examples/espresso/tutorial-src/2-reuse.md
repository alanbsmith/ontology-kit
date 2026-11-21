# Step 2: Reuse

## Introduction

Check whether someone has already modeled your subject, and record what you found.

Reuse saves you work, and it makes your ontology easier to share. Even a "we looked and found nothing" is worth a note, because someone will ask later. You can read the full guide to this step in [Method](../../../docs/METHOD.md#step-2-reuse).

## What you'll make

One [design decision](../../../docs/GLOSSARY.md#concept-design-decision), a note that explains a choice, saying you're starting from scratch and why.

## Run the commands

Run the [`okb reuse none`](../../../docs/CLI.md#cmd-reuse-none) command and give your reason:

```okb
okb reuse none --why "No coffee vocabulary is small enough to teach with, so this ontology starts from scratch. A real café would look at a food or beverage vocabulary first."
```

## Read the output

- okb confirms in one line and keeps your reason with the ontology.
- A reader in a year can see that you looked, and why you chose not to reuse.

## Check your work

```okb
okb status
okb step next
```

> **Common mistakes**
>
> - **Letting this step stall you.** A quick search is enough for a first version.
> - **Skipping the record.** Step 2 isn't complete without it.

## Next step

You recorded that you're building from scratch, and why. Next, you'll brainstorm the words people use about coffee.
