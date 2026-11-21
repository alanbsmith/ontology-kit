# Step 3: Terms

## Introduction

Write down every noun and phrase people use when they talk about your subject. Don't sort them yet.

A messy list now saves you from missing a kind of thing later. It's much easier to throw a term away in step 4 than to notice a gap in step 7. You can read the full guide to this step in [Method](../../../../../docs/METHOD.md#step-3-terms).

## What you'll make

A list of 22 terms, all marked "undecided". In step 4 you'll decide which ones become [classes](../../../../../docs/GLOSSARY.md#concept-class), the kinds of thing in your ontology.

## Run the commands

Add every term in one command. Put quotes around any term that has a space in it:

```okb
okb term add wine grape winery location color body flavor sugar "tannin level" "red wine" "white wine" "rosé wine" "dessert wine" port bordeaux beaujolais food seafood "red meat" "goes well with" "vintage year" "label paper"
```

Then look at the list:

```okb
okb term list
```

## Read the output

- The list mixes different sorts of things. `wine` and `winery` are things. `color` and `body` describe a wine. `goes well with` is a link between two things. `vintage year` and `label paper` are details this tutorial will leave out.
- You don't need to sort them now. Step 4 will turn the things into classes and step 5 will turn the descriptions into [slots](../../../../../docs/GLOSSARY.md#concept-slot), the facts you can state about a class.
- The terms came from the competency questions and from thinking about the restaurant. Both are good sources.

## Check your work

```okb
okb status
```

Step 3 needs at least one term. When it has a tick, move on:

```okb
okb step next
```

> **Common mistakes**
>
> - **Sorting while you brainstorm.** Write first. Sort in step 4.
> - **Only listing nouns.** Add the describing words and the "goes with" phrases too.

## Next step

You collected 22 terms without sorting them. Next, you'll turn the things on the list into classes and arrange them in a tree.
