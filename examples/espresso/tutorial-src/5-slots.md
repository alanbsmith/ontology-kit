# Step 5: Slots

## Introduction

List the facts you can state about each class.

A [slot](../../../docs/GLOSSARY.md#concept-slot) is a fact you can state about a class, such as `pullVolumeMl` for an espresso drink. A slot comes in two kinds. A **property** holds a value, such as `30`. A **relationship** links to another thing, such as the ingredients in a drink. okb stores a relationship as an edge in the graph. You can read the full guide to this step in [Method](../../../docs/METHOD.md#step-5-slots).

## What you'll make

Nine slots: six properties and three relationships. Each sits on the highest class where it makes sense, so every subclass inherits it.

## Add properties

Run the [`okb property add`](../../../docs/CLI.md#cmd-property-add) command. Put each slot where it's true of everything below it: `texture` is about milk, so it goes on MilkDrink, not Drink.

```okb
okb property add pullVolumeMl --on EspressoDrink --type Integer --card single --desc "Milliliters of espresso pulled for one drink."
okb property add espressoToMilkRatio --on MilkDrink --type Float --card single --desc "Parts espresso per part milk, so 1 means equal parts."
okb property add texture --on MilkDrink --type Enumerated --values silky,foamy,thick --card single --desc "How the milk feels."
okb property add pourOrder --on Drink --type String --card single --desc "What goes in the cup first, and what goes on top."
okb property add fatPercent --on Milk --type Integer --card single --desc "Percent fat."
okb property add origin --on Drink --type String --card single --desc "Where the drink was first made."
```

## Add relationships

Run [`okb relationship add`](../../../docs/CLI.md#cmd-relationship-add) for the links between things. A drink contains ingredients, and a drink can be a variation of another drink. `usedIn` is the same link as `contains`, read from the ingredient's side. You'll join them in step 6.

```okb
okb relationship add contains --from Drink --to Ingredient --card multiple --min 1 --desc "What goes into the drink."
okb relationship add variationOf --from Drink --to Drink --card multiple --desc "A drink this one is a twist on."
okb relationship add usedIn --from Ingredient --to Drink --card multiple --desc "Drinks the ingredient goes into."
okb show MilkDrink
```

## Sort the terms

Go back to the list from step 3 and say what two of the terms turned out to be. "Pull volume" became a slot. "Tip jar" is out of scope:

```okb
okb term set "pull volume" --as slot --node pullVolumeMl
okb term set "tip jar" --as out-of-scope
```

## Read the output

- **[Inherited slots](../../../docs/learn/slot-inheritance.md).** `okb show MilkDrink` lists slots from EspressoDrink and Drink as well as its own.
- **[Properties versus relationships](../../../docs/learn/properties-and-relationships.md).** `contains` shows an arrow and a type like `:CONTAINS`, the name of the edge okb will store. `texture` has no arrow, because it holds a plain value.

## Check your work

```okb
okb status
```

```okb
okb step next
```

> **Common mistakes**
>
> - **Putting a slot too high.** `texture` on Drink would claim an espresso has a milk texture.
> - **Storing a link as text.** The ingredients are things in the ontology, so use a relationship, not a string.

## Next step

You added nine slots. Next, you'll set their rules: what values they can take, which are fixed and which are only defaults.
