# Step 6: Facets

## Introduction

Add the limits that let okb check your data: [fixed values](../../../docs/GLOSSARY.md#concept-fixed-value), [defaults](../../../docs/GLOSSARY.md#concept-default-value) and [inverse slots](../../../docs/GLOSSARY.md#concept-inverse-slots).

You want every wine's body to be light, medium or full, never "pretty strong". A [facet](../../../docs/GLOSSARY.md#concept-facet) is how you say that. You already set several in step 5, with `--values`, `--card` and `--min`. This step adds the rest. You can read the full guide to this step in [Method](../../../docs/METHOD.md#step-6-facets).

## What you'll make

Facts that hold for a whole class, a default value, a link between `maker` and `produces`, and one pairing with a strength. The `validate` command now has more to check.

## Run the commands

First, join the two slots from step 5. They describe one fact from two sides, so make them [inverses](../../../docs/GLOSSARY.md#concept-inverse-slots) and okb stores the fact once:

```okb
okb relationship inverse maker produces
```

Next, set the [fixed values](../../../docs/GLOSSARY.md#concept-fixed-value). Every red wine is red, every dessert wine is sweet, and red wine goes with red meat. State each one once, on the class:

```okb
okb class fix RedWine color=red
okb class fix WhiteWine color=white
okb class fix RoseWine color=rose
okb class fix DessertWine sugar=sweet
okb class fix RedWine goesWellWith=RedMeat
okb class fix WhiteWine goesWellWith=Seafood
```

How good a pairing is belongs to the pairing itself, not to the wine or the food. A property on a link is called an [edge property](../../../docs/GLOSSARY.md#concept-edge-property). Add a `strength` to `goesWellWith`, then record that red wine with red meat is a classic:

```okb
okb relationship property goesWellWith strength --type Enumerated --values classic,good
okb link RedWine goesWellWith RedMeat strength=classic
```

Last, a [default](../../../docs/GLOSSARY.md#concept-default-value). Most wines are medium-bodied, so set that once. A wine can still say something different:

```okb
okb class default Wine body=medium
```

## Read the output

- **[Fixed versus default](../../../docs/learn/facets.md).** A fixed value can't change: no red wine is white. A default is a starting guess that any wine can override.
- **Facts about classes.** `goesWellWith=RedMeat` is on the class, so it covers every red wine, including ones you add later.
- **Why strength is an edge property.** "Classic" isn't true of red wine or of red meat. It's true of the pairing. Run `okb explain decision.edge-or-class` to see how okb helps you choose.

## Check your work

Run the checks again. Facets are where okb catches most data-quality errors:

```okb
okb validate
okb status
```

`validate` shows one warning: Merlot "doesn't add anything" to RedWine. That's fair, because it has no slots or values of its own yet. You'll fix it in step 7, when Merlot gets its grape. The step is done even so, because a warning isn't an error. When step 6 has a tick, move on:

```okb
okb step next
```

> **Common mistakes**
>
> - **Fixing a value that has exceptions.** If some red wines are really pink, a fixed `color=red` is wrong. Use a default.
> - **Storing both directions.** Joining `maker` and `produces` with `inverse` means you only ever write one of them.
> - **Putting the strength on the wine.** A wine has many pairings, and each one has its own strength.

## Next step

You set fixed values, a default, an inverse and a strength on a pairing. Next, you'll add real wines and wineries to test the model.
