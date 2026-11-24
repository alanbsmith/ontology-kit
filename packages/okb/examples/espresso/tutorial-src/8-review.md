# Step 8: Review

## Introduction

Check the ontology against the questions you wrote in step 1, add rules, and run every check.

An ontology is only good if it does its job. This step is where you find out, and where you decide what to change. You can read the full guide to this step in [Method](../../../../../docs/METHOD.md#step-8-review).

## What you'll make

Five of the six [competency questions](../../../../../docs/GLOSSARY.md#concept-competency-question) linked to the classes and slots that answer them. You'll also have two [rules](../../../../../docs/GLOSSARY.md#concept-prescriptive-vs-descriptive) from a house guide, one that narrows the other, a clean `validate --all` with no errors, and one warning you decide about.

## Link the questions

Run [`okb cq link`](../../../../../docs/CLI.md#cmd-cq-link) with the question's number, then the parts of the model that answer it. Link the first five. Leave question 6, the price question, alone:

```okb
okb cq link 1 Drink contains Milk
okb cq link 2 Cortado Latte espressoToMilkRatio texture
okb cq link 3 Cappuccino contains
okb cq link 4 variationOf Breve
okb cq link 5 contains Chocolate Mocha
```

## Add rules

A fact describes what something is. A rule says what anything of that kind must, should or may do. The strength is its [modality](../../../../../docs/GLOSSARY.md#concept-modality): MUST, MUST NOT, SHOULD, SHOULD NOT or MAY. Rules come from a document, so they cite the exact words. Register the café's house guide, quote two sentences from it, and write a rule for each. Both use MUST, because the guide says "must". Both are [authored rules](../../../../../docs/GLOSSARY.md#concept-authored-rule): you wrote the wording, and the guide backs it up.

```okb
okb source add tutorial-src/sources/house-guide.md --id house-guide --title "Vertex Coffee house guide"
okb quote add house-guide "Every milk drink must contain milk or cream."
okb quote add house-guide "A breve must use half-and-half, never whole milk."
```

The second rule narrows the first. Every milk drink needs milk, and a breve needs one particular milk. That's a [refinement](../../../../../docs/GLOSSARY.md#concept-rule-refines):

```okb
okb rule add --authored --name "Milk drinks have milk" --statement "A MilkDrink MUST contain a milk ingredient." --modality MUST --governs MilkDrink --cites "Every milk drink must contain milk or cream."
okb rule add --authored --name "Breve uses half-and-half" --statement "A Breve MUST be made with HalfAndHalf." --modality MUST --governs Breve --cites "A breve must use half-and-half, never whole milk." --refines "Milk drinks have milk" --adds "The milk must be half-and-half."
okb rule list
```

A rule starts unverified. Check that each quote supports its rule, then approve them:

```okb
okb verify "Milk drinks have milk" --status SUPPORTED
okb verify "Breve uses half-and-half" --status SUPPORTED
okb verify "Milk drinks have milk" --approve
okb verify "Breve uses half-and-half" --approve
```

Last, say which menu items follow which rule. A fact that meets a rule [fulfills it](../../../../../docs/GLOSSARY.md#concept-rule-fulfills):

```okb
okb fulfills "Vertex breve" "Breve uses half-and-half"
okb fulfills "Vertex cortado" "Milk drinks have milk"
```

## Validate and review

Run every check, including the ones hidden until now, then ask okb what only a person can judge:

```okb
okb validate --all
okb review
```

## Read the output

- **No errors.** An error means something is wrong. [How do I read and fix a finding?](../../../../../docs/learn/rules-and-findings.md) covers errors, warnings and hints. okb found none.
- **One warning, left on purpose.** Question 6 asks "How much does each drink cost?", but nothing in the model answers it. Either add a `price` slot, or take the question out. In a real project, you'd decide now. Here it shows what a finding looks like.
- **Hints.** Breve is the only child of Latte and of Cappuccino, so okb asks if a sibling is missing. Nothing needs the five pure espresso drinks. Those are prompts to think, not faults.
- **The review list.** `okb review` asks questions no program can answer, like "Is every cortado, by definition, a milk drink?"

## Check your work

Run `okb status`. Steps 1 to 7 have a tick. Step 8 doesn't yet, because the price warning is still open and two items need a person to judge them:

```okb
okb status
```

> **Common mistakes**
>
> - **Treating hints as errors.** A hint is a prompt to think. You can accept it and move on.
> - **Linking a question to everything.** Link only what's needed to answer it.
> - **Writing a rule with no source.** okb asks for a quote, so the rule always points back to the words behind it.

## Next step

You linked the questions, wrote two rules and ran every check. For your own subject, repeat these steps with your own scope, questions and terms.
