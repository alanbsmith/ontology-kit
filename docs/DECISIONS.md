# Decision guides

<!-- Generated from the meta-KB (v2.6.0) by `pnpm run docs`. Don't edit by hand: change `packages/okb/meta-kb/src/*.yaml` and regenerate. -->

## What decision guides are

Building an ontology means making choices. Is this a class or one particular thing? Should I split this class in two? Where does this property belong? There is rarely one right answer.

Making decisions about your ontology can be hard, and that's why Ontology Kit provides guides to help you arrive at good decisions. Each one is a short series of yes or no questions that walks you to a sensible choice.

## How to use a guide

1. Find the guide that matches what you are deciding. The list on the right, under *The guides*, shows them all.
2. Answer the first question. Each answer either gives you your choice or sends you to the next question.
3. Read the guide as a flowchart or as a list of steps, whichever is easier for you. The toggle above each guide switches between them.

## Record what you decided

A guide helps you choose. It doesn't save your choice. When you have decided, write it down with `okb decision add`, along with why. That way you, and anyone who reads your ontology later, can see the reasoning. A recorded decision can also explain why you broke a SHOULD rule on purpose: add `--waives <rule>` and the warning is marked as explained. See [Rules](RULES.md) for which rules allow that, and [Design decision](GLOSSARY.md#concept-design-decision) in the glossary.

## The guides

<section class="decision">

<a id="decision-approach"></a><a id="decisionapproach"></a>
### Top-down, bottom-up, or combination?

Before you add your first class, decide where to start: with the big general categories, with specific examples, or somewhere in the middle. None of these is wrong. This guide helps you find the one that fits how you think about your subject.

> **Good to know.** None of the three is better than the others. Combination is often the easiest for beginners, because the middle-level concepts tend to be the most descriptive.

<div class="views">

<div class="view" data-view="chart">

```mermaid
flowchart TD
  accTitle: Top-down, bottom-up, or combination?
  accDescr: A flowchart of 2 yes or no questions, asked in order: 1. Do you naturally think of this domain starting from its broadest categories? 2. Do you think in concrete examples first (specific products, cases, items)? Each answer leads to an outcome or to the next question. The same steps are available as text.
  Q1("Do you naturally think of this domain starting from its broadest categories?")
  Q1Y["Go top-down: create the most general classes first, then specialize."]
  Q1 -->|Yes| Q1Y
  Q1 -->|No| Q2
  Q2("Do you think in concrete examples first #40;specific products, cases, items#41;?")
  Q2Y["Go bottom-up: create the most specific classes, then group them."]
  Q2 -->|Yes| Q2Y
  Q2N["Use combination: start with the most obvious concepts at any level and grow up and down from them."]
  Q2 -->|No| Q2N
```

</div>

<div class="view" data-view="text">

1. **Do you naturally think of this domain starting from its broadest categories?**
   - **Yes:** Go top-down: create the most general classes first, then specialize.
   - **No:** go to the next question
2. **Do you think in concrete examples first (specific products, cases, items)?**
   - **Yes:** Go bottom-up: create the most specific classes, then group them.
   - **No:** Use combination: start with the most obvious concepts at any level and grow up and down from them.

</div>

</div>

<details class="sources"><summary>Sources (2)</summary>

> “None of these three methods is inherently better than any of the others. The approach to take depends strongly on the personal view of the domain.”  
> — Ontology 101 §3 Step 4. Define the classes and the class hierarchy, p.7

> “The combination approach is often the easiest for many ontology developers, since the concepts “in the middle” tend to be the more descriptive concepts in the domain”  
> — Ontology 101 §3 Step 4. Define the classes and the class hierarchy, p.7

</details>

</section>

<section class="decision">

<a id="decision-is-a"></a><a id="decisionis-a"></a>
### Is this really a subclass?

Whenever you say one class is a kind of another, check that it really is. This guide catches the usual mix-ups: parts of things, other names for the same thing, and single individual things.

<div class="views">

<div class="view" data-view="chart">

```mermaid
flowchart TD
  accTitle: Is this really a subclass?
  accDescr: A flowchart of 4 yes or no questions, asked in order: 1. Is every single X, by definition, also a Y (not just usually)? 2. Is X a singular/plural or alternative name for Y? 3. Is X one particular thing rather than a kind of thing? 4. Is X already a subclass of Y through another parent? Each answer leads to an outcome or to the next question. The same steps are available as text.
  Q1("Is every single X, by definition, also a Y #40;not just usually#41;?")
  Q1 -->|Yes| Q2
  Q1N["Not a subclass. If X is part of Y, made by Y, or related to Y, use a slot."]
  Q1 -->|No| Q1N
  Q2("Is X a singular/plural or alternative name for Y?")
  Q2Y["Not a subclass. It's the same class#59; add the other name as a synonym."]
  Q2 -->|Yes| Q2Y
  Q2 -->|No| Q3
  Q3("Is X one particular thing rather than a kind of thing?")
  Q3Y["It's an instance of Y, not a subclass."]
  Q3 -->|Yes| Q3Y
  Q3 -->|No| Q4
  Q4("Is X already a subclass of Y through another parent?")
  Q4Y["Don't add the direct link#59; it's implied."]
  Q4 -->|Yes| Q4Y
  Q4N["Yes, X IS_A Y."]
  Q4 -->|No| Q4N
```

</div>

<div class="view" data-view="text">

1. **Is every single X, by definition, also a Y (not just usually)?**
   - **Yes:** go to the next question
   - **No:** Not a subclass. If X is part of Y, made by Y, or related to Y, use a slot.
2. **Is X a singular/plural or alternative name for Y?**
   - **Yes:** Not a subclass. It's the same class; add the other name as a synonym.
   - **No:** go to the next question
3. **Is X one particular thing rather than a kind of thing?**
   - **Yes:** It's an instance of Y, not a subclass.
   - **No:** go to the next question
4. **Is X already a subclass of Y through another parent?**
   - **Yes:** Don't add the direct link; it's implied.
   - **No:** Yes, X IS_A Y.

</div>

</div>

<details class="sources"><summary>Sources (4)</summary>

> “We organize the classes into a hierarchical taxonomy by asking if by being an instance of one class, the object will necessarily (i.e., by definition) be an instance of some other class.”  
> — Ontology 101 §3 Step 4. Define the classes and the class hierarchy, p.8

> “The class hierarchy represents an “is-a” relation: a class A is a subclass of B if every instance of A is also an instance of B.”  
> — Ontology 101 §4.1 Ensuring that the class hierarchy is correct, p.12

> “A common modeling mistake is to include both a singular and a plural version of the same concept in the hierarchy making the former a subclass of the latter. For example, it is wrong to define a class Wines and a class Wine as a subclass of Wines.”  
> — Ontology 101 §4.1 Ensuring that the class hierarchy is correct, p.12

> “A subclass relationship is transitive: If B is a subclass of A and C is a subclass of B, then C is a subclass of A”  
> — Ontology 101 §4.1 Ensuring that the class hierarchy is correct, p.13

</details>

</section>

<section class="decision">

<a id="decision-new-class"></a><a id="decisionnew-class"></a>
### Should I introduce a new subclass here?

You can always split a class into more specific ones, but not every split is worth making. This guide helps you decide when a new subclass earns its place.

> **Good to know.** Aim for a balance: neither a deep hierarchy of near-identical classes nor a flat one that stuffs everything into slots.

<div class="views">

<div class="view" data-view="chart">

```mermaid
flowchart TD
  accTitle: Should I introduce a new subclass here?
  accDescr: A flowchart of 4 yes or no questions, asked in order: 1. Will the subclass have slots the parent doesn't have? 2. Will it have different restrictions (a fixed value, fewer allowed values, a different cardinality)? 3. Will it take part in relationships the parent doesn't (e.g. a wine that 'goes well with seafood')? 4. Is this a reference hierarchy people browse to pick a level of detail, or a distinction experts always make? Each answer leads to an outcome or to the next question. The same steps are available as text.
  Q1("Will the subclass have slots the parent doesn't have?")
  Q1Y["Create it."]
  Q1 -->|Yes| Q1Y
  Q1 -->|No| Q2
  Q2("Will it have different restrictions #40;a fixed value, fewer allowed values, a different cardinality#41;?")
  Q2Y["Create it."]
  Q2 -->|Yes| Q2Y
  Q2 -->|No| Q3
  Q3("Will it take part in relationships the parent doesn't #40;e.g. a wine that 'goes well with seafood'#41;?")
  Q3Y["Create it."]
  Q3 -->|Yes| Q3Y
  Q3 -->|No| Q4
  Q4("Is this a reference hierarchy people browse to pick a level of detail, or a distinction experts always make?")
  Q4Y["Create it, mark it terminological, and record why."]
  Q4 -->|Yes| Q4Y
  Q4N["Probably don't. Use a slot value on the parent instead."]
  Q4 -->|No| Q4N
```

</div>

<div class="view" data-view="text">

1. **Will the subclass have slots the parent doesn't have?**
   - **Yes:** Create it.
   - **No:** go to the next question
2. **Will it have different restrictions (a fixed value, fewer allowed values, a different cardinality)?**
   - **Yes:** Create it.
   - **No:** go to the next question
3. **Will it take part in relationships the parent doesn't (e.g. a wine that 'goes well with seafood')?**
   - **Yes:** Create it.
   - **No:** go to the next question
4. **Is this a reference hierarchy people browse to pick a level of detail, or a distinction experts always make?**
   - **Yes:** Create it, mark it terminological, and record why.
   - **No:** Probably don't. Use a slot value on the parent instead.

</div>

</div>

<details class="sources"><summary>Sources (6)</summary>

> “Subclasses of a class usually (1) have additional properties that the superclass does not have, or (2) restrictions different from those of the superclass, or (3) participate in different relationships than the superclasses”  
> — Ontology 101 §4.4 When to introduce a new class (or not), p.16

> “In practical terms, each subclass should either have new slots added to it, or have new slot values defined, or override some facets for the inherited slots.”  
> — Ontology 101 §4.4 When to introduce a new class (or not), p.16

> “Classes in terminological hierarchies do not have to introduce new properties”  
> — Ontology 101 §4.4 When to introduce a new class (or not), p.16

> “Another reason to introduce new classes without any new properties is to model concepts among which domain experts commonly make a distinction even though we may have decided not to model the distinction itself.”  
> — Ontology 101 §4.4 When to introduce a new class (or not), p.16

> “Finally, we should not create subclasses of a class for each additional restriction.”  
> — Ontology 101 §4.4 When to introduce a new class (or not), p.16

> “When defining a class hierarchy, our goal is to strike a balance between creating new classes useful for class organization and creating too many classes.”  
> — Ontology 101 §4.4 When to introduce a new class (or not), p.17

</details>

</section>

<section class="decision">

<a id="decision-class-or-value"></a><a id="decisionclass-or-value"></a>
### New class, or just a slot value?

A difference such as red versus white wine can be modeled as two classes or as a value on one class. This guide helps you choose.

> **Good to know.** The same distinction can be a class in one ontology and a value in another. It depends on your scope. Record which you chose.

<div class="views">

<div class="view" data-view="chart">

```mermaid
flowchart TD
  accTitle: New class, or just a slot value?
  accDescr: A flowchart of 4 yes or no questions, asked in order: 1. Would things with different values change which values are allowed in OTHER classes' slots? (e.g. red vs white wine changes which dishes pair well) 2. Do people in the domain think of things with different values as different kinds of things? 3. Could one individual change its value over time (chilled/not chilled, active/inactive)? 4. Is it a number, color, location or similar measurement? Each answer leads to an outcome or to the next question. The same steps are available as text.
  Q1("Would things with different values change which values are allowed in OTHER classes' slots? #40;e.g. red vs white wine changes which dishes pair well#41;")
  Q1Y["Make classes."]
  Q1 -->|Yes| Q1Y
  Q1 -->|No| Q2
  Q2("Do people in the domain think of things with different values as different kinds of things?")
  Q2Y["Make classes."]
  Q2 -->|Yes| Q2Y
  Q2 -->|No| Q3
  Q3("Could one individual change its value over time #40;chilled/not chilled, active/inactive#41;?")
  Q3Y["Slot value. Class membership shouldn't change often."]
  Q3 -->|Yes| Q3Y
  Q3 -->|No| Q4
  Q4("Is it a number, color, location or similar measurement?")
  Q4Y["Slot value #40;usually#41;."]
  Q4 -->|Yes| Q4Y
  Q4N["Slot value, unless one of the earlier tests applied."]
  Q4 -->|No| Q4N
```

</div>

<div class="view" data-view="text">

1. **Would things with different values change which values are allowed in OTHER classes' slots? (e.g. red vs white wine changes which dishes pair well)**
   - **Yes:** Make classes.
   - **No:** go to the next question
2. **Do people in the domain think of things with different values as different kinds of things?**
   - **Yes:** Make classes.
   - **No:** go to the next question
3. **Could one individual change its value over time (chilled/not chilled, active/inactive)?**
   - **Yes:** Slot value. Class membership shouldn't change often.
   - **No:** go to the next question
4. **Is it a number, color, location or similar measurement?**
   - **Yes:** Slot value (usually).
   - **No:** Slot value, unless one of the earlier tests applied.

</div>

</div>

<details class="sources"><summary>Sources (4)</summary>

> “If the concepts with different slot values become restrictions for different slots in other classes, then we should create a new class for the distinction. Otherwise, we represent the distinction in a slot value.”  
> — Ontology 101 §4.5 A new class or a property value?, p.17

> “If a distinction is important in the domain and we think of the objects with different values for the distinction as different kinds of objects, then we should create a new class for the distinction.”  
> — Ontology 101 §4.5 A new class or a property value?, p.17

> “A class to which an individual instance belongs should not change often. Usually when we use extrinsic rather than intrinsic properties of concepts to differentiate among classes, instances of those classes will have to migrate often from one class to another.”  
> — Ontology 101 §4.5 A new class or a property value?, p.17

> “Usually numbers, colors, locations are slot values and do not cause the creation of new classes.”  
> — Ontology 101 §4.5 A new class or a property value?, p.17

</details>

</section>

<section class="decision">

<a id="decision-instance-or-class"></a><a id="decisioninstance-or-class"></a>
### Instance or class?

A term can name a kind of thing (a class) or one particular thing (an instance). This guide helps you tell which one you have, especially when you reach the bottom of your hierarchy.

<div class="views">

<div class="view" data-view="chart">

```mermaid
flowchart TD
  accTitle: Instance or class?
  accDescr: A flowchart of 3 yes or no questions, asked in order: 1. Do the concepts form a natural hierarchy (one inside another, like regions)? 2. Is it among the most specific things that appear in the answers to your competency questions? 3. Will you need to record different facts about finer-grained versions of it (e.g. each year's vintage of a wine)? Each answer leads to an outcome or to the next question. The same steps are available as text.
  Q1("Do the concepts form a natural hierarchy #40;one inside another, like regions#41;?")
  Q1Y["Classes #40;possibly abstract#41;, even if they have no instances yet."]
  Q1 -->|Yes| Q1Y
  Q1 -->|No| Q2
  Q2("Is it among the most specific things that appear in the answers to your competency questions?")
  Q2Y["Instance."]
  Q2 -->|Yes| Q2Y
  Q2 -->|No| Q3
  Q3("Will you need to record different facts about finer-grained versions of it #40;e.g. each year's vintage of a wine#41;?")
  Q3Y["Class, with the finer-grained things as its instances."]
  Q3 -->|Yes| Q3Y
  Q3N["Instance."]
  Q3 -->|No| Q3N
```

</div>

<div class="view" data-view="text">

1. **Do the concepts form a natural hierarchy (one inside another, like regions)?**
   - **Yes:** Classes (possibly abstract), even if they have no instances yet.
   - **No:** go to the next question
2. **Is it among the most specific things that appear in the answers to your competency questions?**
   - **Yes:** Instance.
   - **No:** go to the next question
3. **Will you need to record different facts about finer-grained versions of it (e.g. each year's vintage of a wine)?**
   - **Yes:** Class, with the finer-grained things as its instances.
   - **No:** Instance.

</div>

</div>

<details class="sources"><summary>Sources (3)</summary>

> “Deciding whether a particular concept is a class in an ontology or an individual instance depends on what the potential applications of the ontology are.”  
> — Ontology 101 §4.6 An instance or a class?, p.18

> “the most specific concepts that will constitute answers to those questions are very good candidates for individuals in the knowledge base.”  
> — Ontology 101 §4.6 An instance or a class?, p.18

> “If concepts form a natural hierarchy, then we should represent them as classes”  
> — Ontology 101 §4.6 An instance or a class?, p.18

</details>

</section>

<section class="decision">

<a id="decision-disjoint"></a><a id="decisiondisjoint"></a>
### Are these classes disjoint?

Two classes are disjoint when nothing can belong to both at once. Saying so lets okb catch mistakes later. This guide helps you decide whether it applies to a pair of sibling classes.

<div class="views">

<div class="view" data-view="chart">

```mermaid
flowchart TD
  accTitle: Are these classes disjoint?
  accDescr: A flowchart of 1 yes or no questions, asked in order: 1. Can any single thing be a member of both classes at once? Each answer leads to an outcome or to the next question. The same steps are available as text.
  Q1("Can any single thing be a member of both classes at once?")
  Q1Y["Not disjoint. Leave them."]
  Q1 -->|Yes| Q1Y
  Q1N["Declare them disjoint #40;okb class disjoint A B#41;."]
  Q1 -->|No| Q1N
```

</div>

<div class="view" data-view="text">

1. **Can any single thing be a member of both classes at once?**
   - **Yes:** Not disjoint. Leave them.
   - **No:** Declare them disjoint (okb class disjoint A B).

</div>

</div>

<details class="sources"><summary>Sources (2)</summary>

> “Classes are disjoint if they cannot have any instances in common.”  
> — Ontology 101 §4.8 Disjoint subclasses, p.20

> “Specifying that classes are disjoint enables the system to validate the ontology better. If we declare the Red wine and the White wine classes to be disjoint and later create a class that is a subclass of both Riesling (a subclass of White wine) and Port (a subclass of Red wine), a system can indicate that there is a modeling error.”  
> — Ontology 101 §4.8 Disjoint subclasses, p.20

</details>

</section>

<section class="decision">

<a id="decision-slot-placement"></a><a id="decisionslot-placement"></a>
### Which class does this slot go on?

A slot (a property such as body or maker) is attached to a class, and its subclasses inherit it. This guide helps you pick the most general class where the slot makes sense for every member.

<div class="views">

<div class="view" data-view="chart">

```mermaid
flowchart TD
  accTitle: Which class does this slot go on?
  accDescr: A flowchart of 2 yes or no questions, asked in order: 1. Does every member of the parent class have this property? 2. Are you about to attach it to every child of some class? Each answer leads to an outcome or to the next question. The same steps are available as text.
  Q1("Does every member of the parent class have this property?")
  Q1Y["Move up and ask again about the next parent."]
  Q1 -->|Yes| Q1Y
  Q1N["Attach it to the current class, the highest one where every member has it."]
  Q1 -->|No| Q1N
  Q2("Are you about to attach it to every child of some class?")
  Q2Y["Attach it to that class instead."]
  Q2 -->|Yes| Q2Y
  Q2 -->|No| Done
  Done(["Done"])
```

</div>

<div class="view" data-view="text">

1. **Does every member of the parent class have this property?**
   - **Yes:** Move up and ask again about the next parent.
   - **No:** Attach it to the current class, the highest one where every member has it.
2. **Are you about to attach it to every child of some class?**
   - **Yes:** Attach it to that class instead.
   - **No:** go to the next question

</div>

</div>

<details class="sources"><summary>Sources (3)</summary>

> “A slot should be attached at the most general class that can have that property.”  
> — Ontology 101 §3 Step 5. Define the properties of classes—slots, p.9

> “On the other hand, we must ensure that each class to which we attach the slot can indeed have the property that the slot represents.”  
> — Ontology 101 §3 Step 6, Domain and range of a slot, p.11

> “If a list of classes defining a range or a domain of a slot contains all subclasses of a class A, but not the class A itself, the range should contain only the class A and not the subclasses.”  
> — Ontology 101 §3 Step 6, Domain and range of a slot, p.11

</details>

</section>

<section class="decision">

<a id="decision-range"></a><a id="decisionrange"></a>
### What should this slot's range be?

The range of a slot that points to other things says what kinds of things it can point to. Too narrow and valid values get rejected. Too broad and it stops meaning anything. This guide helps you pick a good range.

<div class="views">

<div class="view" data-view="chart">

```mermaid
flowchart TD
  accTitle: What should this slot's range be?
  accDescr: A flowchart of 4 yes or no questions, asked in order: 1. Is there one class that covers every valid value? 2. Does your list include a class and its subclass? 3. Does your list include all (or nearly all) children of one class? 4. Is the range something like Thing/Entity/Object? Each answer leads to an outcome or to the next question. The same steps are available as text.
  Q1("Is there one class that covers every valid value?")
  Q1Y["Use the most general such class that contains only valid values."]
  Q1 -->|Yes| Q1Y
  Q1N["List several classes."]
  Q1 -->|No| Q1N
  Q2("Does your list include a class and its subclass?")
  Q2Y["Drop the subclass."]
  Q2 -->|Yes| Q2Y
  Q2 -->|No| Q3
  Q3("Does your list include all #40;or nearly all#41; children of one class?")
  Q3Y["Use the parent instead."]
  Q3 -->|Yes| Q3Y
  Q3 -->|No| Q4
  Q4("Is the range something like Thing/Entity/Object?")
  Q4Y["Too general. Narrow it."]
  Q4 -->|Yes| Q4Y
  Q4N["Done."]
  Q4 -->|No| Q4N
```

</div>

<div class="view" data-view="text">

1. **Is there one class that covers every valid value?**
   - **Yes:** Use the most general such class that contains only valid values.
   - **No:** List several classes.
2. **Does your list include a class and its subclass?**
   - **Yes:** Drop the subclass.
   - **No:** go to the next question
3. **Does your list include all (or nearly all) children of one class?**
   - **Yes:** Use the parent instead.
   - **No:** go to the next question
4. **Is the range something like Thing/Entity/Object?**
   - **Yes:** Too general. Narrow it.
   - **No:** Done.

</div>

</div>

<details class="sources"><summary>Sources (5)</summary>

> “When defining a domain or a range for a slot, find the most general classes or class that can be respectively the domain or the range for the slots.”  
> — Ontology 101 §3 Step 6, Domain and range of a slot, p.10

> “do not define a domain and range that is overly general: all the classes in the domain of a slot should be described by the slot and instances of all the classes in the range of a slot should be potential fillers for the slot. Do not choose an overly general class for range (i.e., one would not want to make the range THING) but one would want to choose a class that will cover all fillers”  
> — Ontology 101 §3 Step 6, Domain and range of a slot, p.10

> “If a list of classes defining a range or a domain of a slot includes a class and its subclass, remove the subclass.”  
> — Ontology 101 §3 Step 6, Domain and range of a slot, p.11

> “If a list of classes defining a range or a domain of a slot contains all subclasses of a class A, but not the class A itself, the range should contain only the class A and not the subclasses.”  
> — Ontology 101 §3 Step 6, Domain and range of a slot, p.11

> “If a list of classes defining a range or a domain of a slot contains all but a few subclasses of a class A, consider if the class A would make a more appropriate range definition.”  
> — Ontology 101 §3 Step 6, Domain and range of a slot, p.11

</details>

</section>

<section class="decision">

<a id="decision-naming"></a><a id="decisionnaming"></a>
### Choosing a naming convention

Names should follow one convention across the whole ontology. This guide helps you pick one before you have created many names, so you don't have to rename them all later.

> **Good to know.** There's often no reason to prefer one option; what matters is sticking to it. Consider other systems your ontology will be exchanged with.

<div class="views">

<div class="view" data-view="chart">

```mermaid
flowchart TD
  accTitle: Choosing a naming convention
  accDescr: A flowchart of 4 yes or no questions, asked in order: 1. Will the names be used in code, a graph database, or URLs that don't handle spaces well? 2. Is there a reason to prefer plural class names (e.g. a system you integrate with uses them)? 3. Do you want slot names to show they're slots (hasMaker, makerOf)? 4. Will the data go into a graph database? Each answer leads to an outcome or to the next question. The same steps are available as text.
  Q1("Will the names be used in code, a graph database, or URLs that don't handle spaces well?")
  Q1Y["Use PascalCase for classes and camelCase for slots #40;the toolkit default#41;."]
  Q1 -->|Yes| Q1Y
  Q1N["Title Case With Spaces is also fine for classes."]
  Q1 -->|No| Q1N
  Q2("Is there a reason to prefer plural class names #40;e.g. a system you integrate with uses them#41;?")
  Q2Y["Use plural everywhere."]
  Q2 -->|Yes| Q2Y
  Q2N["Use singular #40;more common in practice#41; everywhere."]
  Q2 -->|No| Q2N
  Q3("Do you want slot names to show they're slots #40;hasMaker, makerOf#41;?")
  Q3Y["Set a has-/-of prefix/suffix convention and use it on every slot."]
  Q3 -->|Yes| Q3Y
  Q3N["No prefix #40;the default#41;."]
  Q3 -->|No| Q3N
  Q4("Will the data go into a graph database?")
  Q4Y["Nothing extra to decide: okb stores each relationship under its name in UPPER_SNAKE case #40;maker → MAKER, goesWellWith → GOES_WELL_WITH#41;, the usual openCypher style, and class names become node labels in #96;okb export#96;."]
  Q4 -->|Yes| Q4Y
  Q4N["Nothing to decide."]
  Q4 -->|No| Q4N
```

</div>

<div class="view" data-view="text">

1. **Will the names be used in code, a graph database, or URLs that don't handle spaces well?**
   - **Yes:** Use PascalCase for classes and camelCase for slots (the toolkit default).
   - **No:** Title Case With Spaces is also fine for classes.
2. **Is there a reason to prefer plural class names (e.g. a system you integrate with uses them)?**
   - **Yes:** Use plural everywhere.
   - **No:** Use singular (more common in practice) everywhere.
3. **Do you want slot names to show they're slots (hasMaker, makerOf)?**
   - **Yes:** Set a has-/-of prefix/suffix convention and use it on every slot.
   - **No:** No prefix (the default).
4. **Will the data go into a graph database?**
   - **Yes:** Nothing extra to decide: okb stores each relationship under its name in UPPER_SNAKE case (maker → MAKER, goesWellWith → GOES_WELL_WITH), the usual openCypher style, and class names become node labels in `okb export`.
   - **No:** Nothing to decide.

</div>

</div>

<details class="sources"><summary>Sources (5)</summary>

> “However, we need to Define a naming convention for classes and slots and adhere to it.”  
> — Ontology 101 §6 What's in a name?, p.21

> “it is common to capitalize class names and use lower case for slot names (assuming the system is case-sensitive).”  
> — Ontology 101 §6.1 Capitalization and delimiters, p.22

> “No alternative is better or worse than the other (although singular for class names is used more often in practice). However, whatever the choice, it should be consistent throughout the whole ontology.”  
> — Ontology 101 §6.2 Singular or plural, p.22

> “Two common practices are to add a has- or a suffix –of to slot names.”  
> — Ontology 101 §6.3 Prefix and suffix conventions, p.22

> “It is however, important to consider other systems with which your system may interact.”  
> — Ontology 101 §6.1 Capitalization and delimiters, p.22

</details>

</section>

<section class="decision">

<a id="decision-edge-or-class"></a><a id="decisionedge-or-class"></a>
### Edge property, or make the relationship its own class?

Sometimes a link between two things needs extra detail, such as how strong a pairing is. You can store that detail on the link itself (an edge property) or turn the link into a class. This guide helps you choose.

> **Good to know.** Ontology 101's frame model has no properties on relationships: the standard move there is to turn the relationship into a class (reification). Graph databases support edge properties natively, so for simple qualifiers they're the lighter choice. Record which you chose.

<div class="views">

<div class="view" data-view="chart">

```mermaid
flowchart TD
  accTitle: Edge property, or make the relationship its own class?
  accDescr: A flowchart of 3 yes or no questions, asked in order: 1. Is the extra information a simple value about this one link (a short condition, a number, a date)? 2. Does the qualifier need relationships of its own (to people, sources, other components), or several values that vary independently? 3. Will you query or validate by it (e.g. 'all recommendations that apply to dense layouts')? Each answer leads to an outcome or to the next question. The same steps are available as text.
  Q1("Is the extra information a simple value about this one link #40;a short condition, a number, a date#41;?")
  Q1 -->|Yes| Q2
  Q1N["Make the relationship a class #40;e.g. a Recommendation with slots from, to, condition, audience#41;, so it can have its own relationships."]
  Q1 -->|No| Q1N
  Q2("Does the qualifier need relationships of its own #40;to people, sources, other components#41;, or several values that vary independently?")
  Q2Y["Make it a class. Edges can only hold plain values #40;and a #96;rule#96; reference#41;."]
  Q2 -->|Yes| Q2Y
  Q2 -->|No| Q3
  Q3("Will you query or validate by it #40;e.g. 'all recommendations that apply to dense layouts'#41;?")
  Q3Y["An Enumerated edge property works if the values are a fixed list#59; otherwise consider a class."]
  Q3 -->|Yes| Q3Y
  Q3N["Use an edge property #40;okb relationship property ...#41;."]
  Q3 -->|No| Q3N
```

</div>

<div class="view" data-view="text">

1. **Is the extra information a simple value about this one link (a short condition, a number, a date)?**
   - **Yes:** go to the next question
   - **No:** Make the relationship a class (e.g. a Recommendation with slots from, to, condition, audience), so it can have its own relationships.
2. **Does the qualifier need relationships of its own (to people, sources, other components), or several values that vary independently?**
   - **Yes:** Make it a class. Edges can only hold plain values (and a `rule` reference).
   - **No:** go to the next question
3. **Will you query or validate by it (e.g. 'all recommendations that apply to dense layouts')?**
   - **Yes:** An Enumerated edge property works if the values are a fixed list; otherwise consider a class.
   - **No:** Use an edge property (okb relationship property ...).

</div>

</div>

<details class="sources"><summary>Sources (0)</summary>

</details>

</section>

