# Step 7: Instances

## Introduction

Add the real things your ontology describes.

An [instance](../../../docs/GLOSSARY.md#concept-instance) is one specific thing, like the cortado on your café's menu. Classes say what kinds of things exist. Instances are the things. You can read the full guide to this step in [Method](../../../docs/METHOD.md#step-7-instances).

## What you'll make

16 instances: eight ingredients, such as "Steamed whole milk", and eight menu items, each linked to what goes in it.

## Add ingredients

Run [`okb instance add`](../../../docs/CLI.md#cmd-instance-add) with `--of` for the class. Add the ingredients first, so the drinks can point at them:

```okb
okb instance add "Double shot" --of Coffee
okb instance add "Hot water" --of Water
okb instance add "Steamed whole milk" --of WholeMilk
okb instance add "Steamed half-and-half" --of HalfAndHalf
okb instance add "Milk foam" --of Foam
okb instance add "Chocolate syrup" --of Chocolate
okb instance add "Whipped cream" --of WhippedCream
okb instance add "Vanilla gelato" --of Gelato
```

## Add the menu

Now add the menu items. Give only the values that aren't already fixed or defaulted. A cortado needs no ratio, because the class already fixes it:

```okb
okb instance add "House espresso" --of Espresso "contains=Double shot" "pourOrder=Shot into a warm cup"
okb instance add "Vertex cortado" --of Cortado "contains=Double shot,Steamed whole milk" "pourOrder=Shot first, then equal warm milk"
okb instance add "Vertex flat white" --of FlatWhite "contains=Double shot,Steamed whole milk" "pourOrder=Shot first, then thin milk"
okb instance add "Vertex cappuccino" --of Cappuccino "contains=Double shot,Steamed whole milk,Milk foam" "pourOrder=Shot, milk, then a cap of foam"
okb instance add "Vertex breve" --of Breve "contains=Double shot,Steamed half-and-half,Milk foam" "pourOrder=Shot, half-and-half, then foam"
okb instance add "Vertex mocha" --of Mocha "contains=Double shot,Chocolate syrup,Steamed whole milk" "pourOrder=Chocolate, shot, then milk"
okb instance add "Vertex affogato" --of Affogato "contains=Double shot,Vanilla gelato" "pourOrder=Gelato first, shot poured over"
```

## Add a link value

Some facts belong to the link itself. A macchiato has only a splash of foam, so say that on the link:

```okb
okb instance add "Vertex macchiato" --of Macchiato "contains=Double shot" "pourOrder=Shot, then a spoonful of foam"
okb link "Vertex macchiato" contains "Milk foam" amount=splash
```

## Read the output

Look at a drink and at an ingredient:

```okb
okb show "Vertex breve"
okb show "Milk foam"
```

- **Values you didn't type.** The breve has `espressoToMilkRatio` and `texture` from the defaults on Cappuccino, and `origin` from its own default, USA. `variationOf` lists both Latte and Cappuccino, from the class.
- **[One edge, two views](../../../docs/learn/inverse-relationships.md).** "Milk foam" lists the drinks it goes into, though you only wrote `contains`. That's the inverse from step 6.

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
> - **Making an instance a class.** "Vertex cortado" is one cup on one menu. "Cortado" is a kind.
> - **Skipping a required link.** A drink needs at least one ingredient, so `okb validate` reports a drink without `contains`.

## Next step

You added eight ingredients and eight menu items. Next, you'll check the ontology against your questions and add two rules.
