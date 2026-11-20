# Step 5: Slots

## Introduction

Describe what you can say about each class: its color, its maker, the foods it pairs with.

A class with no description is just a name. [Slots](../../../docs/GLOSSARY.md#concept-slot) are how an ontology holds facts. They also keep the model tidy, because you attach each slot to one class and every class below it gets it for free ([inheritance](../../../docs/GLOSSARY.md#concept-inheritance)). You can read the full guide to this step in [Methodology](../../../docs/METHOD.md#step-5-slots).

## What you'll make

11 slots. Some hold a value, like `color` or `body`. Others link to another thing, like `maker`. You'll attach each slot to the most general class that can use it.

## Run the commands

A [slot](../../../docs/GLOSSARY.md#concept-slot) comes in two kinds. A **property** holds a value, such as `light` or `Napa Valley`. A **relationship** links to another thing, such as a winery. okb stores a relationship as an edge in the graph.

Start with the properties every wine has. The `--values` list is the allowed set, and `--card single` sets the [cardinality](../../../docs/GLOSSARY.md#concept-cardinality), which is how many values the slot can hold. Here it's one at most:

```okb
okb property add color --on Wine --type Enumerated --values red,white,rose --card single --desc "The wine's color."
okb property add body --on Wine --type Enumerated --values light,medium,full --card single --desc "How heavy the wine feels in the mouth."
okb property add flavor --on Wine --type Enumerated --values delicate,moderate,strong --card single --desc "Intensity of the wine's flavor."
okb property add sugar --on Wine --type Enumerated --values dry,offDry,sweet --card single --desc "Residual sweetness."
```

Tannin comes from grape skins, so only red wines have it. Attach it to RedWine, not Wine:

```okb
okb property add tanninLevel --on RedWine --type Enumerated --values low,moderate,high --card single --desc "Astringency from grape skins; only meaningful for red wines."
```

Now add the links between things. `--min 1` means a wine must have at least one maker:

```okb
okb relationship add maker --from Wine --to Winery --card single --min 1 --desc "The winery that produced the wine."
okb relationship add produces --from Winery --to Wine --card multiple --desc "Wines the winery makes."
okb relationship add grape --from Wine --to WineGrape --card multiple --min 1 --desc "Grape varieties the wine is made from."
okb relationship add region --from Wine --to WineRegion --card single --desc "Where the wine comes from."
okb property add location --on Winery --type String --card single --desc "Where the winery is."
okb relationship add goesWellWith --from Wine --to Food --card multiple --desc "Foods this wine pairs well with."
```

Then look at what RedWine ended up with:

```okb
okb show RedWine
```

## Read the output

- **Inheritance.** RedWine lists `color`, `body`, `flavor` and `sugar` "from Wine". You added them once, and every class below RedWine [inherits](../../../docs/GLOSSARY.md#concept-inheritance) them too.
- **Tannin stays on RedWine.** Only red wines show `tanninLevel`. A white wine can't be given one by mistake.
- **Properties versus relationships.** `maker` shows `→ Winery (:MAKER)`. The `:MAKER` is the name of the edge okb will store. `body` has no arrow, because it holds a plain value.
- **Two slots for one fact.** `maker` and `produces` are the same fact seen from each side. Step 6 joins them.

## Check your work

```okb
okb status
```

When step 5 has a tick, move on:

```okb
okb step next
```

> **Common mistakes**
>
> - **Attaching a slot too high.** If `tanninLevel` were on Wine, every white wine would be asked for one.
> - **Attaching a slot too low.** If `color` were on each of the four color classes, you'd repeat yourself and drift apart later.
> - **Using a property for a thing.** If the value is something with its own details, like a winery, make it a relationship.

## Next step

You added 11 slots: properties that hold values, and relationships that link one thing to another. Next, you'll add limits and shortcuts, such as fixed values and inverses.
