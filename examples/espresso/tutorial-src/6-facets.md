# Step 6: Facets

## Introduction

Narrow each slot: which values it allows, which are fixed, and which links are the same link read both ways.

A [facet](../../../docs/GLOSSARY.md#concept-facet) is a rule about a slot, such as how many values it takes. Facets make the ontology checkable. A [fixed value](../../../docs/GLOSSARY.md#concept-fixed-value) is a value every member of a class has, such as "every lungo is 60 ml". You can read the full guide to this step in [Methodology](../../../docs/METHOD.md#step-6-facets).

## What you'll make

A link with a property of its own, an [inverse](../../../docs/GLOSSARY.md#concept-inverse-slots) pair, and fixed values on the drinks and the milks.

## Describe the links

Some facts belong to the link, not to either end. How much foam goes in a drink isn't a fact about Foam or about the drink. It's a fact about the pairing. Add an [edge property](../../../docs/GLOSSARY.md#concept-edge-property) to `contains` for that. Then join `contains` and `usedIn` so one stored edge reads both ways:

```okb
okb relationship property contains amount --type Enumerated --values splash,equal,topUp --desc "How much of the ingredient goes in."
okb relationship inverse contains usedIn
```

## Fix the facts

Say each fact once, on the class. Every lungo is a 60 ml pull, and every cortado has equal parts espresso and milk. Run [`okb class fix`](../../../docs/CLI.md#cmd-class-fix):

```okb
okb class fix Espresso pullVolumeMl=30
okb class fix Ristretto pullVolumeMl=20
okb class fix Lungo pullVolumeMl=60
okb class fix Americano pullVolumeMl=30
okb class fix LongBlack pullVolumeMl=30
okb class fix Cortado espressoToMilkRatio=1
okb class fix FlatWhite espressoToMilkRatio=0.5
okb class fix WholeMilk fatPercent=3
okb class fix HalfAndHalf fatPercent=12
okb class fix CondensedMilk fatPercent=8
okb class fix Macchiato origin=Italy
okb class fix Mocha origin=USA
okb class fix ConPanna origin=Italy
okb class fix CafeBombon origin=Spain
okb class fix Cortado origin=Spain
okb class fix FlatWhite origin=Australia
okb class fix Affogato origin=Italy
```

## Set defaults and variations

Not every fact is fixed. Most milk drinks are silky, so make that a [default](../../../docs/GLOSSARY.md#concept-default-value) that a cappuccino can override. A latte and a cappuccino also get defaults for the ratio, because a breve is both and can't carry two fixed values. Then record which drinks are variations of others:

```okb
okb class fix FlatWhite texture=silky
okb class default MilkDrink texture=silky
okb class default Cappuccino texture=foamy
okb class default Cappuccino espressoToMilkRatio=0.33
okb class default Cappuccino origin=Italy
okb class default Latte espressoToMilkRatio=0.2
okb class default Breve origin=USA
okb class fix Breve variationOf=Latte,Cappuccino
okb class fix Ristretto variationOf=Espresso
okb class fix Lungo variationOf=Espresso
okb class fix Americano variationOf=Espresso
okb class fix LongBlack variationOf=Americano
```

Last, declare the drinks that can't overlap:

```okb
okb class disjoint Espresso Ristretto Lungo Americano LongBlack
okb class disjoint Mocha ConPanna Affogato CafeBombon
okb class disjoint WholeMilk HalfAndHalf CondensedMilk
```

## Read the output

- **[Fixed versus default](../../../docs/learn/facets.md).** A fixed value can't change below the class. A default is a starting guess that a subclass or instance can override.
- **[Why defaults](../../../docs/learn/disjoint-and-multiple-parents.md) for latte and cappuccino.** Breve is a kind of both. If each fixed a different ratio, okb couldn't tell which one a breve gets. A default lets Breve pick its own.
- **No disjoint group for the milk drinks.** Breve is a latte and a cappuccino, so those two can't be disjoint. okb's hint later is fair, and you'll leave it.

## Check your work

```okb
okb validate
okb status
```

```okb
okb step next
```

> **Common mistakes**
>
> - **Fixing a value that has exceptions.** If some cappuccinos are flat, a fixed `texture=foamy` is wrong. Use a default.
> - **Storing both directions.** Joining `contains` and `usedIn` with `inverse` means you only ever write one of them.
> - **Declaring Latte and Cappuccino disjoint.** A breve is both, so okb would report an error.

## Next step

You fixed the facts that never change and set one default. Next, you'll add real things: the items on a café menu.
