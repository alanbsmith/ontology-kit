# Step 1: Scope

## Introduction

Decide what your [ontology](../../../../../docs/GLOSSARY.md#concept-ontology) is for, and write down the questions it must answer.

Without this, you can't tell when you're done. An ontology about "wine" can grow forever. An ontology that must answer six specific questions has an end. What it covers, and what it leaves out, is its [scope](../../../../../docs/GLOSSARY.md#concept-scope). You can read the full guide to this step in [Method](../../../../../docs/METHOD.md#step-1-scope).

## What you'll make

A written scope (domain, purpose, users, what's left out) and six competency questions. A [competency question](../../../../../docs/GLOSSARY.md#concept-competency-question) is a question your ontology should be able to answer. You'll use them to test your work in step 8.

## Run the commands

Set the scope first. The Ontology 101 example covers wines, foods and which pairings are good. Winery inventory and restaurant staff are out:

```okb
okb scope --domain "Wines, foods, and which wines go well with which foods" --purpose "Suggest good wine and food combinations for a restaurant menu and answer diners' questions" --users diners,waiters --maintainers sommelier --out-of-scope "winery inventory" --out-of-scope "restaurant staff"
```

Now add the questions. Write each one the way a diner or a waiter would ask it:

```okb
okb cq add "Which wine characteristics should I consider when choosing a wine?"
okb cq add "Is Bordeaux a red or white wine?"
okb cq add "Does Cabernet Sauvignon go well with seafood?"
okb cq add "What is the best choice of wine for grilled meat?"
okb cq add "Which characteristics of a wine affect its appropriateness for a dish?"
okb cq add "Which wines does a given winery produce?"
```

## Read the output

- okb numbers each question (`cq.1`, `cq.2` and so on). You'll use those numbers in step 8 to link each question to the parts of the ontology that answer it.
- The out-of-scope list matters as much as the scope. When someone asks "is the vintage year in scope?" later, you can point at the list.
- Look at what the questions ask for. They're [competency questions](../../../../../docs/learn/competency-questions.md), and each one names a part the ontology needs. "Is Bordeaux a red or white wine?" needs a [class](../../../../../docs/GLOSSARY.md#concept-class) called Bordeaux. "Which wines does a winery produce?" needs a link between wines and wineries. The questions already hint at the model.

## Check your work

`okb status` shows each step and what it still needs:

```okb
okb status
```

Step 1 has four checks, and all of them have a tick. When you see "Step 1 looks done", move on. This prints the guide for step 2:

```okb
okb step next
```

> **Common mistakes**
>
> - **Fewer than three questions.** okb asks for at least three, because one or two don't test much.
> - **Questions that are really tasks.** "Build a menu" isn't a competency question. "Which wine goes with this dish?" is.
> - **No out-of-scope list.** Without it, every idea seems to belong.

## Next step

You wrote down what the ontology is for and six questions it must answer. Next, you'll check whether anyone has already modeled wine, so you don't start from scratch.
