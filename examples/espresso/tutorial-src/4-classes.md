# Step 4: Classes

## Introduction

Turn the things on your term list into classes, and arrange them from general to specific.

A [class](../../../docs/GLOSSARY.md#concept-class) is a kind of thing, like Drink or Ingredient. A class below another is its [subclass](../../../docs/GLOSSARY.md#concept-subclass): a Latte is a kind of MilkDrink. Everything you say about MilkDrink later also applies to every subclass. You can read the full guide to this step in [Method](../../../docs/METHOD.md#step-4-classes).

## What you'll make

31 classes in two trees: Drink at the top of one, Ingredient at the top of the other. Breve has two parents. You'll also have three groups that can't overlap and five [design decisions](../../../docs/GLOSSARY.md#concept-design-decision).

## Set the convention

Pick how classes are named. The defaults are fine: `PascalCase` and singular. See the [`okb convention`](../../../docs/CLI.md#cmd-convention) reference.

```okb
okb convention
```

## Add the drinks

Say each link out loud before you add it: "Every latte is a milk drink." That's an ["is a" link](../../../docs/learn/hierarchy.md). The top classes are [abstract](../../../docs/GLOSSARY.md#concept-abstract-class), because you never serve "a drink" without saying which. Then declare the three groups [disjoint](../../../docs/GLOSSARY.md#concept-disjoint): a drink can't be both pure espresso and a milk drink.

```okb
okb class add Drink --abstract --desc "Any coffee drink on the menu."
okb class add EspressoDrink --parent Drink --abstract --desc "A drink built on a shot of espresso."
okb class add PureEspresso --parent EspressoDrink --abstract --desc "An espresso drink with nothing but coffee and water."
okb class add MilkDrink --parent EspressoDrink --abstract --desc "An espresso drink with milk."
okb class add SweetenedDrink --parent EspressoDrink --abstract --desc "An espresso drink with chocolate, cream or gelato."
okb class disjoint PureEspresso MilkDrink SweetenedDrink
```

Now add the drinks themselves. Breve has two parents, because a breve is both a latte and a cappuccino made with half-and-half. That's [multiple inheritance](../../../docs/GLOSSARY.md#concept-multiple-inheritance). Read what okb says about it.

```okb
okb class add Espresso --parent PureEspresso --desc "A short, strong shot pulled through finely ground coffee."
okb class add Ristretto --parent PureEspresso --desc "A shorter, sweeter shot pulled with less water."
okb class add Lungo --parent PureEspresso --desc "A longer shot pulled with more water."
okb class add Americano --parent PureEspresso --desc "Espresso topped up with hot water."
okb class add LongBlack --parent PureEspresso --desc "Hot water with espresso poured on top."
okb class add Macchiato --parent MilkDrink --desc "Espresso marked with a spoonful of milk foam."
okb class add Cortado --parent MilkDrink --desc "Espresso cut with an equal amount of warm milk."
okb class add FlatWhite --parent MilkDrink --desc "Espresso with a thin layer of velvety milk."
okb class add Cappuccino --parent MilkDrink --desc "Espresso with steamed milk and a thick cap of foam."
okb class add Latte --parent MilkDrink --desc "Espresso with a lot of steamed milk and a little foam."
okb class add Breve --parent Latte --parent Cappuccino --desc "A latte or cappuccino made with half-and-half instead of milk."
okb class add Mocha --parent SweetenedDrink --desc "Espresso with chocolate and steamed milk."
okb class add ConPanna --parent SweetenedDrink --desc "Espresso topped with whipped cream."
okb class add Affogato --parent SweetenedDrink --desc "A scoop of gelato drowned in a shot of espresso."
okb class add CafeBombon --parent SweetenedDrink --desc "Espresso layered with condensed milk."
```

## Add ingredients

Ingredients get their own tree. Milk is abstract: a café pours a kind of milk, never just "milk".

```okb
okb class add Ingredient --abstract --desc "Something that goes into a drink."
okb class add Coffee --parent Ingredient --desc "Ground coffee, pulled as espresso."
okb class add Water --parent Ingredient --desc "Hot water."
okb class add Milk --parent Ingredient --abstract --desc "Any milk or cream added to a drink."
okb class add WholeMilk --parent Milk --desc "Whole cow's milk."
okb class add HalfAndHalf --parent Milk --desc "Equal parts milk and cream."
okb class add CondensedMilk --parent Milk --desc "Sweetened, thickened milk."
okb class add Foam --parent Ingredient --desc "Milk aerated with steam."
okb class add Chocolate --parent Ingredient --desc "Chocolate syrup or powder."
okb class add WhippedCream --parent Ingredient --desc "Cream whipped until light."
okb class add Gelato --parent Ingredient --desc "Italian ice cream."
okb class disjoint Coffee Water Milk Foam Chocolate WhippedCream Gelato
okb tree
```

## Settle the names

okb warns when sibling names don't follow a pattern: `MilkDrink` and `SweetenedDrink` end in "Drink", but `PureEspresso` doesn't. Here the menu names win. Record that as a decision, so the warning is explained instead of ignored:

```okb
okb decision add --title "Drinks keep their own names" --decision "Espresso, Ristretto, Lungo and the other drinks keep the names a menu uses." --why "Baristas say Lungo, not LungoEspresso. The parent names group them, so the children don't repeat a word." --about EspressoDrink --waives naming-subclass-names-consistent
okb decision add --title "Menu names for pure espressos" --decision "The pure espresso drinks keep their menu names." --why "Nobody orders a LongBlackEspresso." --about PureEspresso --waives naming-subclass-names-consistent
okb decision add --title "Milk names stay natural" --decision "HalfAndHalf keeps its everyday name." --why "That's what the carton says." --about Milk --waives naming-subclass-names-consistent
```

## Class or instance

Is a cortado a class or an instance? ([Classes and instances](../../../docs/learn/classes-and-instances.md) explains the difference.) It depends on your questions. Run `okb explain decision.instance-or-class` and answer each of its questions. Here, the questions compare kinds of drinks, and each kind has its own facts. Every drink type is a class, and one cortado on today's menu is an instance. A café that only listed menu items could choose differently. Record your choice:

```okb
okb decision add --title "Cortado is a class" --decision "Every drink type, Cortado included, is a class. Items on the menu are instances." --why "The questions compare kinds of drinks, and each kind has its own facts. A café that only listed menu items would model them as instances." --about Cortado
```

## Check your work

Run `okb status`. Step 4 should have a tick. Then move on:

```okb
okb status
```

```okb
okb step next
```

> **Common mistakes**
>
> - **Making a drink an instance too early.** "Vertex cortado" is one cup. "Cortado" is a kind, and you can have two of them.
> - **Forgetting the second parent.** Without it, okb can't tell that a breve is also a cappuccino.
> - **No disjoint groups.** Without them, okb can't catch a drink filed as both pure espresso and milk drink.

## Next step

You built 31 classes in two trees and recorded how you chose them. Next, you'll say which facts you can state about each class.
