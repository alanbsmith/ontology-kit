# Step 7: Instances

## Introduction

Add real examples to test the model you've built.

Until now you've described kinds of things. An [instance](../../../../../docs/GLOSSARY.md#concept-instance) is one real thing: this winery, this bottle. Adding a few is the quickest way to find out whether your [classes](../../../../../docs/GLOSSARY.md#concept-class) and [slots](../../../../../docs/GLOSSARY.md#concept-slot) work. If a real wine doesn't fit, the model needs fixing. You can read the full guide to this step in [Method](../../../../../docs/METHOD.md#step-7-instances).

## What you'll make

9 instances: two wineries, four grapes, a region and two wines. One of them is the example from Ontology 101, Chateau Morgon Beaujolais.

## Run the commands

A wine links to a winery, a grape and a region, so create those first:

```okb
okb instance add "Chateau Morgon" --of Winery location="Beaujolais, France"
okb instance add "Sterling Vineyards" --of Winery location="Napa Valley, California"
okb instance add Gamay --of WineGrape
okb instance add "Merlot grape" --of WineGrape
okb instance add "Chardonnay grape" --of WineGrape
okb instance add "Riesling grape" --of WineGrape
okb instance add "Beaujolais region" --of WineRegion
```

Give each grape-variety class its grape as a [fixed value](../../../../../docs/GLOSSARY.md#concept-fixed-value). Every Merlot wine uses the Merlot grape:

```okb
okb class fix Merlot "grape=Merlot grape"
okb class fix Chardonnay "grape=Chardonnay grape"
okb class fix Riesling "grape=Riesling grape"
```

Now add the wines. Give only the values that aren't already fixed or defaulted:

```okb
okb instance add "Chateau Morgon Beaujolais" --of Beaujolais body=light flavor=delicate tanninLevel=low grape=Gamay "maker=Chateau Morgon" "region=Beaujolais region" sugar=dry
okb instance add "Sterling Vineyards Merlot" --of Merlot "maker=Sterling Vineyards" flavor=moderate tanninLevel=moderate sugar=dry
```

Then look at both a wine and a winery:

```okb
okb show "Chateau Morgon Beaujolais"
okb show "Chateau Morgon"
```

## Read the output

- **Values you didn't type.** The wine has `color red (fixed by RedWine)` and `goesWellWith RedMeat (fixed by RedWine)`. They come from its class.
- **A default in action.** The Sterling Vineyards Merlot has no `body` in the command. okb filled in `medium` from the [default](../../../../../docs/GLOSSARY.md#concept-default-value) you set in step 6. The Beaujolais said `body=light`, so it keeps that.
- **[One edge, two views](../../../../../docs/learn/inverse-relationships.md).** Chateau Morgon `produces` the Beaujolais, yet you never wrote that. `produces` reads the `maker` edge backwards. That's what the [inverse](../../../../../docs/GLOSSARY.md#concept-inverse-slots) in step 6 does.

## Check your work

```okb
okb validate
okb status
```

The Merlot warning from step 6 is gone, because Merlot now has a fixed grape. When step 7 has a tick, move on:

```okb
okb step next
```

> **Common mistakes**
>
> - **Making an instance a class.** "Chateau Morgon Beaujolais" is one wine, so it's an instance. "Beaujolais" is a kind of wine, so it's a class. If you can have two of them, it's a class.
> - **Skipping a required link.** A wine needs a maker and a grape. `okb validate` reports what's missing.
> - **Misspelling a value.** Writing `body=meduim` fails, because the allowed values are `light`, `medium` and `full`.

## Next step

You added nine instances and saw fixed values, defaults and an inverse at work. Next, you'll check the ontology against the six questions from step 1.
