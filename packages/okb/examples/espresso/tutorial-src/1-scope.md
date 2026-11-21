# Step 1: Scope

## Introduction

Write down what the ontology is for, and the questions it must answer.

The [scope](../../../../../docs/GLOSSARY.md#concept-scope) is the part of the world your ontology covers. Without it, you can't tell when you're done. A coffee ontology could cover beans, roasting and farms forever. A [competency question](../../../../../docs/GLOSSARY.md#concept-competency-question) is a question the finished ontology must be able to answer, like "Which drinks have no milk?" You can read the full guide to this step in [Method](../../../../../docs/METHOD.md#step-1-scope).

## What you'll make

A scope with a domain, a purpose, users and two things left out, plus six competency questions.

## Set the scope

Run the [`okb scope`](../../../../../docs/CLI.md#cmd-scope) command. The out-of-scope list matters as much as the rest:

```okb
okb scope --domain "Espresso-based coffee drinks and what goes in them" --purpose "Help baristas and customers compare drinks on a café menu" --users baristas,customers --maintainers "head barista" --out-of-scope "brewing equipment" --out-of-scope "coffee beans and roasting"
```

## Add questions

Add each question the way a barista or customer would ask it. The last one asks about price, which you won't model. You'll see what okb says about that in step 8:

```okb
okb cq add "Which drinks have no milk?"
okb cq add "What's the difference between a cortado and a latte?"
okb cq add "What goes into a cappuccino?"
okb cq add "Which drinks are a variation of another drink?"
okb cq add "Which drinks on the menu come with chocolate?"
okb cq add "How much does each drink cost?"
```

## Read the output

- `okb cq list` numbers the questions 1, 2 and so on, in the order you added them. You'll use those numbers in step 8. (The ids underneath, like `cq.k7x2mq`, end in a random tag so two people adding questions on different branches never pick the same one.)
- The questions mix kinds (see [Why start with questions?](../../../../../docs/learn/competency-questions.md)): one filters ("no milk"), one compares, one lists ingredients. Good questions pull different parts out of the model.

## Check your work

Run the [`okb status`](../../../../../docs/CLI.md#cmd-status) command. Step 1 should have a tick. Then move on:

```okb
okb status
```

```okb
okb step next
```

> **Common mistakes**
>
> - **Fewer than three questions.** okb asks for at least three.
> - **Questions that are really tasks.** "Build a menu" isn't a question the ontology can answer.
> - **No out-of-scope list.** Without it, every idea seems to belong.

## Next step

You wrote down what the ontology is for and six questions it must answer. Next, you'll check whether someone has already modeled coffee.
