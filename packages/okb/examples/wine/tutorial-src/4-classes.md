# Step 4: Classes

## Introduction

Turn the things on your term list into classes, and arrange them from general to specific.

A [class](../../../../../docs/GLOSSARY.md#concept-class) is a kind of thing, like Wine or Winery. A class below another one is its [subclass](../../../../../docs/GLOSSARY.md#concept-subclass): RedWine is a subclass of Wine. The arrangement matters because everything you say about Wine later also applies to every subclass. Most modeling mistakes are mistakes in this arrangement. You can read the full guide to this step in [Method](../../../../../docs/METHOD.md#step-4-classes).

## What you'll make

21 classes in a tree, with Wine at the top and specific wines such as Pauillac at the bottom. You'll also have a naming convention, a few declared "can't be both" groups, and two recorded [design decisions](../../../../../docs/GLOSSARY.md#concept-design-decision).

## Set the convention

Pick how classes are named before you create any. This is your [naming convention](../../../../../docs/GLOSSARY.md#concept-naming-convention). The defaults are fine: `PascalCase` and singular, but you can customize them. See the [`okb convention`](../../../../../docs/CLI.md#cmd-convention) reference for the options.

```okb
okb convention
```

## Add Wine

Say each link out loud before you add it: "Every red wine is a wine." If it sounds wrong, it is. Start with Wine:

```okb
okb class add Wine --desc "A specific wine produced by a specific winery (not an individual bottle)."
```

Now make a mistake on purpose. Plural names are a classic error: a single Wine isn't a kind of Wines. Run this command. It fails, even with `--force`:

```okb fails
okb class add Wines --parent Wine --force
```

okb refused `Wines` as a subclass of `Wine` even with `--force`. Some mistakes are never right, so okb doesn't let you override them.

## Add colors

Add the middle level next, then say which groups can't overlap. A wine can't be both red and white, so declare those classes [disjoint](../../../../../docs/GLOSSARY.md#concept-disjoint):

```okb
okb class add RedWine --parent Wine --desc "Wine made from dark-skinned grapes with skin contact; described by tannin level."
okb class add WhiteWine --parent Wine --desc "Wine fermented without grape skins."
okb class add RoseWine --parent Wine --desc "Wine with brief skin contact giving a pink color." --synonym Rosé
okb class add DessertWine --parent Wine --desc "Sweet wine served with or as dessert."
okb class disjoint RedWine WhiteWine RoseWine
```

## Add specific wines

Bordeaux and its regions are classes even though they add no [slots](../../../../../docs/GLOSSARY.md#concept-slot) of their own. A slot is a fact you can state about a class, such as `color`, and you'll add them in step 5. Experts always tell them apart, so they earn a place. Port has two parents because it's both a red wine and a dessert wine:

```okb
okb class add Bordeaux --parent RedWine --terminological --desc "Red wine from the Bordeaux region of France."
okb class add Medoc --parent Bordeaux --terminological --desc "Bordeaux from the Médoc sub-region."
okb class add Pauillac --parent Medoc --terminological --desc "Médoc wine from the Pauillac appellation."
okb class add Margaux --parent Medoc --terminological --desc "Médoc wine from the Margaux appellation."
okb class add Beaujolais --parent RedWine --terminological --desc "Light red wine from the Beaujolais region, made from Gamay."
okb class add Merlot --parent RedWine --desc "Red wine made from the Merlot grape."
okb class add Port --parent RedWine --parent DessertWine --desc "Fortified sweet red wine from Portugal. (Only red Ports are modeled, as in the paper.)"
okb class add Chardonnay --parent WhiteWine --desc "White wine made from the Chardonnay grape."
okb class add Riesling --parent WhiteWine --desc "White wine made from the Riesling grape."
okb class disjoint Chardonnay Riesling
okb class add Sauternes --parent WhiteWine --parent DessertWine --desc "Sweet white wine from the Sauternes area of Bordeaux."
```

Sauternes ends in "s", so okb suspects a plural. It isn't one: it's the name of a place. Record that as a [design decision](../../../../../docs/GLOSSARY.md#concept-design-decision), a note that explains a choice, so the warning is explained instead of ignored:

```okb
okb decision add --title "Sauternes keeps its final s" --decision "The class is named Sauternes, not Sauterne." --why "It's the proper name of the appellation, not a plural." --about Sauternes --waives naming-singular-plural-consistent
```

## Add the rest

Add classes for wineries, grapes and regions, and for the food that wines pair with. Food is an [abstract class](../../../../../docs/GLOSSARY.md#concept-abstract-class): it only groups Seafood and RedMeat, and nothing is directly "a Food":

```okb
okb class add Winery --desc "A business that makes wine."
okb class add WineGrape --desc "A grape variety used to make wine." --synonym Varietal
okb class add WineRegion --desc "A geographic area wines are named after or come from."
okb class add Food --abstract --desc "A kind of dish or ingredient a wine can be paired with."
okb class add Seafood --parent Food --desc "Fish and shellfish dishes."
okb class add RedMeat --parent Food --desc "Beef, lamb and similar dishes, including grilled meat."
okb class disjoint Seafood RedMeat
```

## Settle the terms

Go back to the term list from step 3. Mark each term as a class or as out of scope, so nothing stays "undecided" by accident:

```okb
okb term set "vintage year" --as out-of-scope --note "Vintage questions deferred to v2"
okb term set "label paper" --as out-of-scope
okb term set port --as class --node Port
okb term set "rosé wine" --as class --node RoseWine
```

One more decision to record. `Bordeaux` has only one [direct subclass](../../../../../docs/GLOSSARY.md#concept-direct-subclass), which okb finds suspicious. Here it's deliberate:

```okb
okb decision add --title "Regional wines are terminological classes" --decision "Bordeaux, Medoc, Pauillac, Margaux and Beaujolais are classes even though they add no slots of their own." --why "Sommeliers and diners always distinguish these appellations (Ontology 101 §4.4: distinctions experts commonly make)." --about Bordeaux --about Medoc --about Beaujolais --waives hier-single-child
```

## Read the output

- **The follow-up questions.** After some `class add` commands, okb asked "Can anything be both…?". It nudges you to declare disjoint groups while the idea is fresh. [Disjoint classes and multiple parents](../../../../../docs/learn/disjoint-and-multiple-parents.md) explains why.
- **Two parents.** Port and Sauternes each sit under two classes, which is [multiple inheritance](../../../../../docs/GLOSSARY.md#concept-multiple-inheritance). The tree shows them twice, with "also under" and "see above". For how the tree works, see [Is a kind of](../../../../../docs/learn/hierarchy.md).
- **Hints versus warnings.** The two hints at the end are suggestions. A warning you've explained with a decision moves to its own list instead of staying open.

## Check your work

Look at the tree, then run the checks that apply to steps 1 to 4:

```okb
okb tree
okb validate
```

You should see no errors and no warnings. The two hints say that some [sibling](../../../../../docs/GLOSSARY.md#concept-sibling) classes might overlap. You can leave them for now. Check the step:

```okb
okb status
```

When step 4 has a tick, move on:

```okb
okb step next
```

> **Common mistakes**
>
> - **Plural names.** `Wines` instead of `Wine`. okb refuses these, as you saw.
> - **A class for every adjective.** "Expensive wine" isn't a kind of wine. It's a property of a wine, and step 5 handles it.
> - **A subclass that isn't a kind.** A winery isn't a kind of wine. If the sentence "every X is a Y" sounds wrong, don't link them.
> - **No disjoint groups.** Without them, okb can't catch a wine labeled both red and white.

## Next step

You built a tree of 21 classes, with Wine at the top, and recorded two design decisions. Next, you'll describe those classes with slots, such as color and maker.
