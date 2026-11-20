# Step 3: Terms

## Introduction

Write down every word someone might use about your subject, without sorting them.

A term is any word or phrase from the domain. A long list now means fewer surprises later, because you sort the words in later steps. You can read the full guide to this step in [Methodology](../../../docs/METHOD.md#step-3-terms).

## What you'll make

A list of 35 terms: drinks, ingredients, and the words people use to describe them.

## Add the terms

Run the [`okb term add`](../../../docs/CLI.md#cmd-term-add) command with every word you can think of. Include describing words and links, like `contains`. One term, "tip jar", is a word you'll decide to leave out:

```okb
okb term add drink espresso ristretto lungo americano "long black" macchiato cortado "flat white" cappuccino latte breve mocha "con panna" affogato "cafe bombon" ingredient coffee water milk "whole milk" "half and half" "condensed milk" foam chocolate "whipped cream" gelato "pull volume" "espresso to milk ratio" texture "pour order" contains "variation of" origin "tip jar"
```

Then look at the list:

```okb
okb term list
```

## Read the output

- The list mixes drinks, ingredients, and describing words. You don't sort them yet.
- The terms came from the competency questions and from picturing a café menu. Both are good sources.

## Check your work

```okb
okb status
okb step next
```

> **Common mistakes**
>
> - **Sorting while you brainstorm.** Write first. Sort in the next steps.
> - **Only listing nouns.** Add the describing words and the "goes in" phrases too.

## Next step

You collected 35 terms without sorting them. Next, you'll turn the things on the list into classes.
