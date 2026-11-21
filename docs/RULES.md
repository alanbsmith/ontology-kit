# Rules

<!-- Generated from the meta-KB (v2.4.1) by `pnpm run docs`. Don't edit by hand: change `meta-kb/src/*.yaml` and regenerate. -->

A rule is one thing okb checks about your ontology, such as "a class can't be its own ancestor" or "every slot says what kind of value it holds". `okb validate` runs them and reports the ones your ontology breaks. The ontology-review skill asks about the ones only a person can judge.

Most rules come from *Ontology 101* (Noy & McGuinness, 2001), the paper the [method](METHOD.md) is based on. When a rule says it comes "from the source", it means that paper, and the quotes in each rule's Sources section are its own words.

<details><summary>How to read a rule</summary>

Each rule is a card. The title is the rule's name, which is what `okb validate` prints. The small tags under it say how strict the rule is, how it is checked, where it comes from, and when it starts to matter. The rows give the details:

| Row | What it tells you |
|---|---|
| Rule | What must hold, stated exactly. |
| In plain words | The same thing, said simply. |
| Why | The reason the rule exists. |
| Ask yourself | A question to put to your own ontology. Shown only on rules a person has to judge. |
| How to fix | What to change when the rule is broken. |
| Severity | Why okb treats a rule more strictly or more loosely than its wording suggests. Shown only when it does. |
| Sources | The passages the rule is based on, folded away at the bottom of the card. |

**How strict: modality and severity**

The first tag combines the rule's **modality** with its **severity**. The modality comes from the wording of the passage the rule cites: MUST, SHOULD or MAY (see *Modality* in the [glossary](GLOSSARY.md)). The severity is what `okb validate` reports.

| Modality | Severity | Meaning |
|---|---|---|
| MUST / MUST NOT | error | Fix it. A design decision can't waive it. |
| SHOULD / SHOULD NOT | warning | Fix it, or record a design decision that explains why not (`okb decision add --waives <rule>`). |
| MAY | info | A hint worth considering. |

**How it is checked, and where it comes from**

- **Automatic check:** okb checks it exactly.
- **Likely-case check:** okb flags likely cases, so it can be wrong.
- **You decide:** only a person can judge it. The review skill asks the question shown under *Ask yourself*.
- **From the source:** the source states the rule.
- **Follows from the source:** it follows from a source definition, and the gap is explained under *Why*.
- **Toolkit convention:** okb's own rule, with no source.
- **From step N:** `okb validate` hides the rule until you reach step N of the [method](METHOD.md), unless it's an error.

</details>

## All rules

<div class="entry-filter" data-label="Filter rules (try “error”, “slot” or “naming”)"></div>

## Class hierarchy

<section class="entry">

<div class="head">

<a id="rule-hier-is-a-means-kind-of"></a>
### `hier-is-a-means-kind-of`

<p class="chips"><span class="chip error">MUST · error</span> <span class="chip">You decide</span> <span class="chip">From the source</span> <span class="chip">From step 4</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

An IS_A link from B to A must mean that every instance of B is necessarily an instance of A.

</div>

<div class="row">
<span class="label">In plain words</span>

Only use 'is a' for 'is a kind of'. 'Is part of', 'is made by', 'is related to' and 'is usually' are not is-a.

</div>

<div class="row">
<span class="label">Why</span>

This is the definition of the subclass relation; everything else (inheritance, disjointness, transitivity) depends on it holding.

</div>

<div class="row">
<span class="label">Ask yourself</span>

For each IS_A edge, say out loud: 'Every &lt;child> is, by definition, a &lt;parent>.' If you hesitate, or the honest word is 'part of' / 'has' / 'usually', it is not an is-a.

</div>

<div class="row">
<span class="label">How to fix</span>

Replace the IS_A with a slot (e.g. partOf, madeBy) or move the class under its real parent.

</div>

<details class="sources"><summary>Sources (4)</summary>

> “The class hierarchy represents an “is-a” relation: a class A is a subclass of B if every instance of A is also an instance of B.”  
> — Ontology 101 §4.1 Ensuring that the class hierarchy is correct, p.12

> “If a class A is a superclass of class B, then every instance of B is also an instance of A In other words, the class B represents a concept that is a “kind of” A.”  
> — Ontology 101 §3 Step 4. Define the classes and the class hierarchy, p.8

> “Indeed, since B is a subclass of A, all B’s instances must be instances of the class A.”  
> — Ontology 101 §4.1 Ensuring that the class hierarchy is correct, p.13

> “We organize the classes into a hierarchical taxonomy by asking if by being an instance of one class, the object will necessarily (i.e., by definition) be an instance of some other class.”  
> — Ontology 101 §3 Step 4. Define the classes and the class hierarchy, p.8

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-hier-no-cycles"></a>
### `hier-no-cycles`

<p class="chips"><span class="chip error">SHOULD NOT · error</span> <span class="chip">Automatic check</span> <span class="chip">From the source</span> <span class="chip">From step 4</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

The class hierarchy should not contain cycles (A is a subclass of B and B is, directly or indirectly, a subclass of A).

</div>

<div class="row">
<span class="label">In plain words</span>

A class can't be its own ancestor. If A is a kind of B and B is a kind of A, they're the same class.

</div>

<div class="row">
<span class="label">Why</span>

A cycle amounts to declaring the classes equivalent: all instances of A are instances of B and vice versa.

</div>

<div class="row">
<span class="label">How to fix</span>

If they're the same concept, merge them (keep one name, add the other as a synonym). If not, remove the IS_A edge that's wrong.

</div>

<div class="row muted">
<span class="label">Severity</span>

The source says cycles 'should' be avoided because a cycle declares the classes equivalent. The checker can't tell an intended equivalence from a mistake, and okb has no equivalence construct, so a cycle is treated as an error: merge the classes and keep the other name as a synonym.

</div>

<details class="sources"><summary>Source</summary>

> “We should avoid cycles in the class hierarchy. We say that there is a cycle in a hierarchy when some class A has a subclass B and at the same time B is a superclass of A. Creating such a cycle in a hierarchy amounts to declaring that the classes A and B are equivalent”  
> — Ontology 101 §4.1 Ensuring that the class hierarchy is correct, p.13

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-hier-no-singular-plural-pair"></a>
### `hier-no-singular-plural-pair`

<p class="chips"><span class="chip error">MUST NOT · error</span> <span class="chip">Likely-case check</span> <span class="chip">From the source</span> <span class="chip">From step 4</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

The hierarchy must not make the singular and plural versions of the same concept subclasses of one another (such as Wine as a subclass of Wines).

</div>

<div class="row">
<span class="label">In plain words</span>

'Wine' is not a kind of 'Wines'. Pick singular or plural for every class name and use only that form.

</div>

<div class="row">
<span class="label">Why</span>

The source calls this a common modeling mistake and says it is wrong: a single Wine is not a kind of Wines. okb reports a singular/plural pair that is NOT linked as a warning only: that's the naming-consistency concern, not this rule's.

</div>

<div class="row">
<span class="label">How to fix</span>

Delete one of the two classes and move its children and instances to the other.

</div>

<details class="sources"><summary>Source</summary>

> “A common modeling mistake is to include both a singular and a plural version of the same concept in the hierarchy making the former a subclass of the latter. For example, it is wrong to define a class Wines and a class Wine as a subclass of Wines.”  
> — Ontology 101 §4.1 Ensuring that the class hierarchy is correct, p.12

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-hier-no-synonym-classes"></a>
### `hier-no-synonym-classes`

<p class="chips"><span class="chip error">MUST NOT · error</span> <span class="chip">Likely-case check</span> <span class="chip">From the source</span> <span class="chip">From step 4</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

Synonyms for the same concept must not be represented as different classes.

</div>

<div class="row">
<span class="label">In plain words</span>

Shrimp and Prawn are one class with two names, not two classes.

</div>

<div class="row">
<span class="label">Why</span>

Classes represent concepts, not the words for them; the source states this rule 'should always be followed'. okb catches a class whose name matches another class's name or listed synonym; true synonyms with unrelated spellings need a human eye.

</div>

<div class="row">
<span class="label">Ask yourself</span>

Scan class names for pairs a domain expert would call 'the same thing'.

</div>

<div class="row">
<span class="label">How to fix</span>

Merge the classes: keep one, add the other name to its synonyms, and move edges over.

</div>

<details class="sources"><summary>Sources (3)</summary>

> “the following rule should always be followed: Synonyms for the same concept do not represent different classes”  
> — Ontology 101 §4.1 Ensuring that the class hierarchy is correct, p.13

> “Classes represent concepts in the domain and not the words that denote these concepts.”  
> — Ontology 101 §4.1 Ensuring that the class hierarchy is correct, p.13

> “Many systems allow associating a list of synonyms, translations, or presentation names with a class. If a system does not allow these associations, synonyms could always be listed in the class documentation.”  
> — Ontology 101 §4.1 Ensuring that the class hierarchy is correct, p.13

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-hier-siblings-same-generality"></a>
### `hier-siblings-same-generality`

<p class="chips"><span class="chip error">MUST · error</span> <span class="chip">You decide</span> <span class="chip">From the source</span> <span class="chip">From step 4</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

All siblings in the hierarchy, except those at the root, must be at the same level of generality.

</div>

<div class="row">
<span class="label">In plain words</span>

Classes that share a parent should be about equally specific, like chapter headings in the same book. White Wine and Chardonnay shouldn't both sit directly under Wine.

</div>

<div class="row">
<span class="label">Why</span>

Siblings at mismatched generality mean the hierarchy has skipped a level; the more specific one usually belongs under the more general one.

</div>

<div class="row">
<span class="label">Ask yourself</span>

For each parent with 2+ children, ask: 'Is any of these a kind of another one?' and 'Would an expert put these on the same level?'

</div>

<div class="row">
<span class="label">How to fix</span>

Move the more specific class under the more general sibling.

</div>

<details class="sources"><summary>Sources (2)</summary>

> “All the siblings in the hierarchy (except for the ones at the root) must be at the same level of generality. For example, White wine and Chardonnay should not be subclasses of the same class (say, Wine).”  
> — Ontology 101 §4.2 Analyzing siblings in a class hierarchy, p.14

> “The concepts at the root of the hierarchy however (which are often represented as direct subclasses of some very general class, such as Thing) represent major divisions of the domain and do not have to be similar concepts.”  
> — Ontology 101 §4.2 Analyzing siblings in a class hierarchy, p.14

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-hier-no-redundant-isa"></a>
### `hier-no-redundant-isa`

<p class="chips"><span class="chip warning">SHOULD NOT · warning</span> <span class="chip">Automatic check</span> <span class="chip">Follows from the source</span> <span class="chip">From step 4</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

A class should not have a direct IS_A edge to an ancestor it already reaches through another parent.

</div>

<div class="row">
<span class="label">In plain words</span>

If Chardonnay is a White Wine, and White Wine is a Wine, don't also link Chardonnay directly to Wine. That link is already implied.

</div>

<div class="row">
<span class="label">Why</span>

Subclassing is transitive, so the shortcut edge adds nothing. It also makes the class a sibling of its own parent, which is exactly the mismatched-generality mistake the source's White Wine / Chardonnay example warns about.

</div>

<div class="row">
<span class="label">How to fix</span>

Remove the direct edge to the higher ancestor.

</div>

<details class="sources"><summary>Sources (3)</summary>

> “A subclass relationship is transitive: If B is a subclass of A and C is a subclass of B, then C is a subclass of A”  
> — Ontology 101 §4.1 Ensuring that the class hierarchy is correct, p.13

> “In our example, Chardonnay is a direct subclass of White wine and is not a direct subclass of Wine.”  
> — Ontology 101 §4.1 Ensuring that the class hierarchy is correct, p.13

> “All the siblings in the hierarchy (except for the ones at the root) must be at the same level of generality. For example, White wine and Chardonnay should not be subclasses of the same class (say, Wine).”  
> — Ontology 101 §4.2 Analyzing siblings in a class hierarchy, p.14

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-hier-single-child"></a>
### `hier-single-child`

<p class="chips"><span class="chip info">MAY · info</span> <span class="chip">Automatic check</span> <span class="chip">From the source</span> <span class="chip">From step 4</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

A class with only one direct subclass may indicate a modeling problem or an incomplete ontology.

</div>

<div class="row">
<span class="label">In plain words</span>

A parent with one child is like a bulleted list with one bullet. Either a sibling is missing, or the child isn't really different from the parent.

</div>

<div class="row">
<span class="label">Why</span>

If the only subclass is effectively equivalent to its parent, it adds no information; if it isn't, its siblings are probably missing.

</div>

<div class="row">
<span class="label">Ask yourself</span>

Is something missing next to the only child? If not, is the child really different from its parent?

</div>

<div class="row">
<span class="label">How to fix</span>

Add the missing sibling(s), or remove the child and fold it into the parent. If neither applies, record a design decision.

</div>

<details class="sources"><summary>Sources (2)</summary>

> “If a class has only one direct subclass there may be a modeling problem or the ontology is not complete.”  
> — Ontology 101 §4.2 Analyzing siblings in a class hierarchy, p.14

> “There are no hard rules for the number of direct subclasses that a class should have. However, many well-structured ontologies have between two and a dozen direct subclasses.”  
> — Ontology 101 §4.2 Analyzing siblings in a class hierarchy, p.14

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-hier-too-many-children"></a>
### `hier-too-many-children`

<p class="chips"><span class="chip info">MAY · info</span> <span class="chip">Automatic check</span> <span class="chip">From the source</span> <span class="chip">From step 4</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

A class with more than a dozen direct subclasses may need additional intermediate categories.

</div>

<div class="row">
<span class="label">In plain words</span>

A long flat list of children usually hides natural groups. Look for them, but don't invent groups that don't exist in the domain.

</div>

<div class="row">
<span class="label">Why</span>

Many well-structured ontologies have between two and a dozen direct subclasses; but if no natural grouping exists, the source says to leave the list as it is.

</div>

<div class="row">
<span class="label">Ask yourself</span>

Do domain experts group these children somehow (by color, region, size...)? If yes, add those groups as intermediate classes.

</div>

<div class="row">
<span class="label">How to fix</span>

Add intermediate classes for natural groupings, or record a design decision that none exist.

</div>

<details class="sources"><summary>Sources (2)</summary>

> “If there are more than a dozen subclasses for a given class then additional intermediate categories may be necessary.”  
> — Ontology 101 §4.2 Analyzing siblings in a class hierarchy, p.14

> “However, if no natural classes exist to group concepts in the long list of siblings, there is no need to create artificial classes—just leave the classes the way they are.”  
> — Ontology 101 §4.2 Analyzing siblings in a class hierarchy, p.15

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-hier-subclass-adds-something"></a>
### `hier-subclass-adds-something`

<p class="chips"><span class="chip warning">SHOULD · warning</span> <span class="chip">Likely-case check</span> <span class="chip">From the source</span> <span class="chip">From step 6</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

Each subclass should add something its superclass doesn't have: new slots, new slot values, overridden facets, or different relationships. Classes in terminological hierarchies, and distinctions experts commonly make, are exceptions.

</div>

<div class="row">
<span class="label">In plain words</span>

If you can't say anything about the subclass that isn't also true of its parent, it may not need to exist.

</div>

<div class="row">
<span class="label">Why</span>

The source says we introduce a new class 'usually only when there is something that we can say about this class that we cannot say about the superclass'. okb looks for own slots, fixed values, defaults, facet overrides, being the range or value of some slot, and disjointness declarations. It skips classes marked terminological or covered by a design decision.

</div>

<div class="row">
<span class="label">Ask yourself</span>

What can you say about this class that you can't say about its parent? If the answer is 'experts always distinguish these', mark it terminological or record that decision.

</div>

<div class="row">
<span class="label">How to fix</span>

Add the slot, value, restriction or relationship that makes it different; or mark it `terminological`; or merge it into its parent.

</div>

<details class="sources"><summary>Sources (4)</summary>

> “Subclasses of a class usually (1) have additional properties that the superclass does not have, or (2) restrictions different from those of the superclass, or (3) participate in different relationships than the superclasses”  
> — Ontology 101 §4.4 When to introduce a new class (or not), p.16

> “In practical terms, each subclass should either have new slots added to it, or have new slot values defined, or override some facets for the inherited slots.”  
> — Ontology 101 §4.4 When to introduce a new class (or not), p.16

> “Classes in terminological hierarchies do not have to introduce new properties”  
> — Ontology 101 §4.4 When to introduce a new class (or not), p.16

> “Another reason to introduce new classes without any new properties is to model concepts among which domain experts commonly make a distinction even though we may have decided not to model the distinction itself.”  
> — Ontology 101 §4.4 When to introduce a new class (or not), p.16

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-hier-no-subclass-per-restriction"></a>
### `hier-no-subclass-per-restriction`

<p class="chips"><span class="chip warning">SHOULD NOT · warning</span> <span class="chip">You decide</span> <span class="chip">From the source</span> <span class="chip">From step 4</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

Do not create a subclass for each additional restriction; strike a balance between useful organization and too many classes.

</div>

<div class="row">
<span class="label">In plain words</span>

Red, white and rosé are natural classes of wine. 'Delicate Wine', 'Moderate Wine' and 'Strong Wine' are just flavor values.

</div>

<div class="row">
<span class="label">Why</span>

A hierarchy with a class per restriction becomes deeply nested and hard to navigate.

</div>

<div class="row">
<span class="label">Ask yourself</span>

For each class created mainly to hold one value of one slot, ask whether it's really just that slot's value.

</div>

<div class="row">
<span class="label">How to fix</span>

Replace the class with a slot value on the parent.

</div>

<details class="sources"><summary>Sources (2)</summary>

> “Finally, we should not create subclasses of a class for each additional restriction.”  
> — Ontology 101 §4.4 When to introduce a new class (or not), p.16

> “When defining a class hierarchy, our goal is to strike a balance between creating new classes useful for class organization and creating too many classes.”  
> — Ontology 101 §4.4 When to introduce a new class (or not), p.17

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-hier-class-or-value"></a>
### `hier-class-or-value`

<p class="chips"><span class="chip warning">SHOULD · warning</span> <span class="chip">You decide</span> <span class="chip">From the source</span> <span class="chip">From step 4</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

Create a new class for a distinction if objects with different values are thought of as different kinds of things, or if the distinction restricts slots in other classes; otherwise represent it as a slot value.

</div>

<div class="row">
<span class="label">In plain words</span>

In a wine-pairing ontology, red vs. white wine is a class split because it changes which foods go with the wine. In an ontology for a wine-label factory, the same color distinction is just a value.

</div>

<div class="row">
<span class="label">Why</span>

The decision depends on the scope: the same distinction can be a class in one ontology and a value in another.

</div>

<div class="row">
<span class="label">Ask yourself</span>

Use decision guide decision.class-or-value on each suspicious class/value.

</div>

<div class="row">
<span class="label">How to fix</span>

Convert between class and slot value as the decision guide suggests, and record the decision.

</div>

<details class="sources"><summary>Sources (3)</summary>

> “If the concepts with different slot values become restrictions for different slots in other classes, then we should create a new class for the distinction. Otherwise, we represent the distinction in a slot value.”  
> — Ontology 101 §4.5 A new class or a property value?, p.17

> “If a distinction is important in the domain and we think of the objects with different values for the distinction as different kinds of objects, then we should create a new class for the distinction.”  
> — Ontology 101 §4.5 A new class or a property value?, p.17

> “Usually numbers, colors, locations are slot values and do not cause the creation of new classes.”  
> — Ontology 101 §4.5 A new class or a property value?, p.17

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-hier-stable-membership"></a>
### `hier-stable-membership`

<p class="chips"><span class="chip warning">SHOULD · warning</span> <span class="chip">You decide</span> <span class="chip">From the source</span> <span class="chip">From step 4</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

The class an individual belongs to should not change often; avoid classes defined by extrinsic properties that instances move in and out of.

</div>

<div class="row">
<span class="label">In plain words</span>

'Chilled Wine' is a bad class: the same bottle would keep switching classes. Use a slot ('chilled: true/false').

</div>

<div class="row">
<span class="label">Why</span>

Classes built on extrinsic properties force instances to migrate between classes.

</div>

<div class="row">
<span class="label">Ask yourself</span>

Could a given instance leave this class and come back tomorrow?

</div>

<div class="row">
<span class="label">How to fix</span>

Turn the class into a Boolean or Enumerated slot on the parent.

</div>

<details class="sources"><summary>Source</summary>

> “A class to which an individual instance belongs should not change often. Usually when we use extrinsic rather than intrinsic properties of concepts to differentiate among classes, instances of those classes will have to migrate often from one class to another.”  
> — Ontology 101 §4.5 A new class or a property value?, p.17

</details>

</section>

## Instances

<section class="entry">

<div class="head">

<a id="rule-inst-are-leaves"></a>
### `inst-are-leaves`

<p class="chips"><span class="chip error">MUST NOT · error</span> <span class="chip">Automatic check</span> <span class="chip">Follows from the source</span> <span class="chip">From step 4</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

Instances must not be arranged in a hierarchy: only classes can have subclasses or instances.

</div>

<div class="row">
<span class="label">In plain words</span>

Nothing can be a 'kind of' one particular thing. If you need children, make it a class.

</div>

<div class="row">
<span class="label">Why</span>

Individual instances are the most specific concepts in a knowledge base; there is no notion of a sub-instance. That nothing can be an instance of an instance follows from the same point: only classes have members.

</div>

<div class="row">
<span class="label">How to fix</span>

Turn the instance into a class, or link it with a slot instead of IS_A/INSTANCE_OF.

</div>

<details class="sources"><summary>Sources (2)</summary>

> “Individual instances are the most specific concepts represented in a knowledge base.”  
> — Ontology 101 §4.6 An instance or a class?, p.18

> “Only classes can be arranged in a hierarchy—knowledge-representation systems do not have a notion of sub-instance.”  
> — Ontology 101 §4.6 An instance or a class?, p.19

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-inst-natural-hierarchy-as-classes"></a>
### `inst-natural-hierarchy-as-classes`

<p class="chips"><span class="chip warning">SHOULD · warning</span> <span class="chip">You decide</span> <span class="chip">From the source</span> <span class="chip">From step 4</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

If concepts form a natural hierarchy, represent them as classes, even if some have no instances of their own.

</div>

<div class="row">
<span class="label">In plain words</span>

Wine regions nest (France → Bourgogne → Côtes d'Or), so they are all classes, not a mix of classes and instances.

</div>

<div class="row">
<span class="label">Why</span>

Only classes can be arranged in a hierarchy, and the source finds the class/instance line arbitrary when concepts nest.

</div>

<div class="row">
<span class="label">Ask yourself</span>

Are any instances 'inside' other instances in the domain (regions, org units, categories)?

</div>

<div class="row">
<span class="label">How to fix</span>

Make them classes (often abstract).

</div>

<details class="sources"><summary>Sources (3)</summary>

> “If concepts form a natural hierarchy, then we should represent them as classes”  
> — Ontology 101 §4.6 An instance or a class?, p.18

> “we should define these terms as classes even though they may not have any instances of their own.”  
> — Ontology 101 §4.6 An instance or a class?, p.19

> “Only classes can be arranged in a hierarchy—knowledge-representation systems do not have a notion of sub-instance.”  
> — Ontology 101 §4.6 An instance or a class?, p.19

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-inst-granularity"></a>
### `inst-granularity`

<p class="chips"><span class="chip warning">SHOULD · warning</span> <span class="chip">You decide</span> <span class="chip">Follows from the source</span> <span class="chip">From step 7</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

Choose the level at which classes end and instances begin from the application: the most specific things that answer your competency questions are good candidates for instances.

</div>

<div class="row">
<span class="label">In plain words</span>

For wine pairing, 'Sterling Vineyards Merlot' is an instance. For a cellar inventory, each bottle might be.

</div>

<div class="row">
<span class="label">Why</span>

The source says the lowest level of granularity 'is in turn determined by a potential application', and calls the answers to competency questions 'very good candidates' for individuals. Those are descriptive; turning them into a SHOULD is the toolkit's reading.

</div>

<div class="row">
<span class="label">Ask yourself</span>

What are the most specific things that appear in answers to your competency questions? Those should be instances.

</div>

<div class="row">
<span class="label">How to fix</span>

Move the class/instance boundary up or down and record the decision.

</div>

<details class="sources"><summary>Sources (3)</summary>

> “Deciding whether a particular concept is a class in an ontology or an individual instance depends on what the potential applications of the ontology are.”  
> — Ontology 101 §4.6 An instance or a class?, p.18

> “The level of granularity is in turn determined by a potential application of the ontology.”  
> — Ontology 101 §4.6 An instance or a class?, p.18

> “the most specific concepts that will constitute answers to those questions are very good candidates for individuals in the knowledge base.”  
> — Ontology 101 §4.6 An instance or a class?, p.18

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-inst-not-of-abstract"></a>
### `inst-not-of-abstract`

<p class="chips"><span class="chip error">MUST NOT · error</span> <span class="chip">Automatic check</span> <span class="chip">From the source</span> <span class="chip">From step 7</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

An abstract class must not have direct instances.

</div>

<div class="row">
<span class="label">In plain words</span>

Instances of an abstract class have to belong to one of its subclasses.

</div>

<div class="row">
<span class="label">Why</span>

Being abstract means the class cannot have any direct instances.

</div>

<div class="row">
<span class="label">How to fix</span>

Point the instance at the right subclass, or remove `abstract` from the class.

</div>

<details class="sources"><summary>Source</summary>

> “Protégé-2000 allows users to specify some classes as Abstract, signifying that the class cannot have any direct instances.”  
> — Ontology 101 §4.6 An instance or a class?, p.18

</details>

</section>

## Slots and facets

<section class="entry">

<div class="head">

<a id="rule-slot-attach-most-general"></a>
### `slot-attach-most-general`

<p class="chips"><span class="chip warning">SHOULD · warning</span> <span class="chip">Automatic check</span> <span class="chip">From the source</span> <span class="chip">From step 5</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

A slot should be attached at the most general class that can have the property. Don't attach it to a class and its subclass, and if it's on every direct subclass of A, attach it to A instead.

</div>

<div class="row">
<span class="label">In plain words</span>

Put a slot as high up the tree as it truly applies, once. Children inherit it.

</div>

<div class="row">
<span class="label">Why</span>

Subclasses inherit slots, so attaching to both parent and child is redundant. Listing every child instead of the parent is the same set of classes but harder to maintain. The source states these rules for domain lists.

</div>

<div class="row">
<span class="label">How to fix</span>

Remove the HAS_SLOT edges on the subclasses and attach the slot to the parent.

</div>

<details class="sources"><summary>Sources (4)</summary>

> “A slot should be attached at the most general class that can have that property.”  
> — Ontology 101 §3 Step 5. Define the properties of classes—slots, p.9

> “All subclasses of a class inherit the slot of that class.”  
> — Ontology 101 §3 Step 5. Define the properties of classes—slots, p.9

> “If a list of classes defining a range or a domain of a slot includes a class and its subclass, remove the subclass.”  
> — Ontology 101 §3 Step 6, Domain and range of a slot, p.11

> “If a list of classes defining a range or a domain of a slot contains all subclasses of a class A, but not the class A itself, the range should contain only the class A and not the subclasses.”  
> — Ontology 101 §3 Step 6, Domain and range of a slot, p.11

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-slot-domain-fits-all"></a>
### `slot-domain-fits-all`

<p class="chips"><span class="chip error">MUST · error</span> <span class="chip">You decide</span> <span class="chip">From the source</span> <span class="chip">From step 5</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

Every class a slot is attached to must be able to have the property the slot represents.

</div>

<div class="row">
<span class="label">In plain words</span>

Don't push a slot up so high that it lands on classes it doesn't describe. tanninLevel belongs on Red Wine, not Wine, because white wines aren't described by tannin.

</div>

<div class="row">
<span class="label">Why</span>

Too general a domain lets meaningless values in.

</div>

<div class="row">
<span class="label">Ask yourself</span>

For each slot, check every class it's inherited by. Does each one really have this property?

</div>

<div class="row">
<span class="label">How to fix</span>

Move the slot down to the most general class for which it is always meaningful.

</div>

<details class="sources"><summary>Sources (2)</summary>

> “On the other hand, we must ensure that each class to which we attach the slot can indeed have the property that the slot represents.”  
> — Ontology 101 §3 Step 6, Domain and range of a slot, p.11

> “do not define a domain and range that is overly general: all the classes in the domain of a slot should be described by the slot and instances of all the classes in the range of a slot should be potential fillers for the slot. Do not choose an overly general class for range (i.e., one would not want to make the range THING) but one would want to choose a class that will cover all fillers”  
> — Ontology 101 §3 Step 6, Domain and range of a slot, p.10

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-slot-range-remove-subclass"></a>
### `slot-range-remove-subclass`

<p class="chips"><span class="chip warning">SHOULD · warning</span> <span class="chip">Automatic check</span> <span class="chip">From the source</span> <span class="chip">From step 6</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

If a slot's range includes a class and its subclass, remove the subclass.

</div>

<div class="row">
<span class="label">In plain words</span>

Range 'Wine, Red Wine' is just 'Wine'. Red Wine is already included.

</div>

<div class="row">
<span class="label">Why</span>

The subclass adds no information; the range already implicitly includes it.

</div>

<div class="row">
<span class="label">How to fix</span>

Delete the RANGE edge to the subclass.

</div>

<details class="sources"><summary>Source</summary>

> “If a list of classes defining a range or a domain of a slot includes a class and its subclass, remove the subclass.”  
> — Ontology 101 §3 Step 6, Domain and range of a slot, p.11

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-slot-range-collapse-subclasses"></a>
### `slot-range-collapse-subclasses`

<p class="chips"><span class="chip warning">SHOULD · warning</span> <span class="chip">Automatic check</span> <span class="chip">From the source</span> <span class="chip">From step 6</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

If a slot's range lists all subclasses of a class A but not A itself, the range should contain only A.

</div>

<div class="row">
<span class="label">In plain words</span>

Range 'Red Wine, White Wine, Rosé Wine' should just be 'Wine'.

</div>

<div class="row">
<span class="label">Why</span>

It's the same set of allowed classes, stated once, and it stays correct when a new subclass is added.

</div>

<div class="row">
<span class="label">How to fix</span>

Replace the RANGE edges with one edge to A.

</div>

<details class="sources"><summary>Source</summary>

> “If a list of classes defining a range or a domain of a slot contains all subclasses of a class A, but not the class A itself, the range should contain only the class A and not the subclasses.”  
> — Ontology 101 §3 Step 6, Domain and range of a slot, p.11

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-slot-range-all-but-few"></a>
### `slot-range-all-but-few`

<p class="chips"><span class="chip info">MAY · info</span> <span class="chip">Likely-case check</span> <span class="chip">From the source</span> <span class="chip">From step 6</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

If a slot's range lists all but a few subclasses of a class A, consider whether A would be a more appropriate range.

</div>

<div class="row">
<span class="label">In plain words</span>

Listing nearly every child is often a sign the parent is what you meant.

</div>

<div class="row">
<span class="label">Why</span>

Stated by the source as something to consider, not a requirement.

</div>

<div class="row">
<span class="label">How to fix</span>

Consider using A as the range; if the excluded subclasses really can't be values, keep the list and record why.

</div>

<details class="sources"><summary>Source</summary>

> “If a list of classes defining a range or a domain of a slot contains all but a few subclasses of a class A, consider if the class A would make a more appropriate range definition.”  
> — Ontology 101 §3 Step 6, Domain and range of a slot, p.11

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-slot-range-not-too-general"></a>
### `slot-range-not-too-general`

<p class="chips"><span class="chip warning">SHOULD NOT · warning</span> <span class="chip">Likely-case check</span> <span class="chip">From the source</span> <span class="chip">From step 6</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

A slot's range should not be overly general (such as Thing): instances of every class in the range should be potential values.

</div>

<div class="row">
<span class="label">In plain words</span>

'maker: Thing' says nothing. 'maker: Winery' says what fills it.

</div>

<div class="row">
<span class="label">Why</span>

An overly general range stops being informative and lets invalid values in. okb flags ranges named Thing/Entity/Object/Item and ranges that are the single root above every class.

</div>

<div class="row">
<span class="label">How to fix</span>

Narrow the range to the most general class that covers all real values.

</div>

<details class="sources"><summary>Sources (2)</summary>

> “do not define a domain and range that is overly general: all the classes in the domain of a slot should be described by the slot and instances of all the classes in the range of a slot should be potential fillers for the slot. Do not choose an overly general class for range (i.e., one would not want to make the range THING) but one would want to choose a class that will cover all fillers”  
> — Ontology 101 §3 Step 6, Domain and range of a slot, p.10

> “When defining a domain or a range for a slot, find the most general classes or class that can be respectively the domain or the range for the slots.”  
> — Ontology 101 §3 Step 6, Domain and range of a slot, p.10

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-slot-value-type-declared"></a>
### `slot-value-type-declared`

<p class="chips"><span class="chip error">MUST · error</span> <span class="chip">Automatic check</span> <span class="chip">Toolkit convention</span> <span class="chip">From step 5</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

Every slot must declare a value type (String, Integer, Float, Number, Boolean, Enumerated or Instance).

</div>

<div class="row">
<span class="label">In plain words</span>

okb needs to know what kind of value goes in a field before it can check your data.

</div>

<div class="row">
<span class="label">Why</span>

The source describes value type as one facet a slot 'can' have; the toolkit requires it so that instance values can be checked mechanically. That makes this a toolkit rule, not the source's.

</div>

<div class="row">
<span class="label">How to fix</span>

`okb slot set <slot> --type <Type>`.

</div>

<details class="sources"><summary>Source</summary>

> “A value-type facet describes what types of values can fill in the slot.”  
> — Ontology 101 §3 Step 6, Slot-value type, p.9

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-slot-instance-needs-range"></a>
### `slot-instance-needs-range`

<p class="chips"><span class="chip error">MUST · error</span> <span class="chip">Automatic check</span> <span class="chip">From the source</span> <span class="chip">From step 6</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

Slots with value type Instance must define a list of allowed classes (a range).

</div>

<div class="row">
<span class="label">In plain words</span>

A field that points at other things has to say what kind of things.

</div>

<div class="row">
<span class="label">Why</span>

Without a range, any individual could be a value and nothing can be checked.

</div>

<div class="row">
<span class="label">How to fix</span>

`okb slot set <slot> --range <Class>`.

</div>

<details class="sources"><summary>Source</summary>

> “Instance-type slots allow definition of relationships between individuals. Slots with value type Instance must also define a list of allowed classes from which the instances can come.”  
> — Ontology 101 §3 Step 6, Slot-value type, p.10

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-slot-enum-needs-values"></a>
### `slot-enum-needs-values`

<p class="chips"><span class="chip error">MUST · error</span> <span class="chip">Automatic check</span> <span class="chip">Follows from the source</span> <span class="chip">From step 6</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

Enumerated slots must list their allowed values.

</div>

<div class="row">
<span class="label">In plain words</span>

'One of a fixed list' needs the list.

</div>

<div class="row">
<span class="label">Why</span>

The source defines enumerated slots as ones that specify a list of allowed values; an enumerated slot without the list isn't one.

</div>

<div class="row">
<span class="label">How to fix</span>

`okb slot set <slot> --values a,b,c`.

</div>

<details class="sources"><summary>Source</summary>

> “Enumerated slots specify a list of specific allowed values for the slot.”  
> — Ontology 101 §3 Step 6, Slot-value type, p.9

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-slot-cardinality-declared"></a>
### `slot-cardinality-declared`

<p class="chips"><span class="chip warning">SHOULD · warning</span> <span class="chip">Automatic check</span> <span class="chip">Toolkit convention</span> <span class="chip">From step 6</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

Every slot should declare its cardinality (single or multiple).

</div>

<div class="row">
<span class="label">In plain words</span>

Decide whether this field holds one value or many. It's easy to forget and hard to fix later.

</div>

<div class="row">
<span class="label">Why</span>

The source says slots 'can' have cardinality facets and that some systems only distinguish single from multiple; it never requires every slot to declare one. The toolkit asks for it explicitly (instead of silently defaulting) because single vs. multiple is easy to forget and hard to fix once instances exist. A toolkit rule, not the source's.

</div>

<div class="row">
<span class="label">How to fix</span>

`okb slot set <slot> --card single` (or multiple).

</div>

<details class="sources"><summary>Sources (2)</summary>

> “Slots can have different facets describing the value type, allowed values, the number of the values (cardinality), and other features of the values the slot can take.”  
> — Ontology 101 §3 Step 6. Define the facets of the slots, p.9

> “Slot cardinality defines how many values a slot can have. Some systems distinguish only between single cardinality (allowing at most one value) and multiple cardinality (allowing any number of values).”  
> — Ontology 101 §3 Step 6, Slot cardinality, p.9

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-slot-cardinality-coherent"></a>
### `slot-cardinality-coherent`

<p class="chips"><span class="chip error">MUST · error</span> <span class="chip">Automatic check</span> <span class="chip">Follows from the source</span> <span class="chip">From step 6</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

Cardinality facets must be coherent: minimum ≤ maximum, neither negative, and single cardinality means a maximum of 1.

</div>

<div class="row">
<span class="label">In plain words</span>

'At least 3 and at most 1' can never be satisfied.

</div>

<div class="row">
<span class="label">Why</span>

Follows from the source's definitions of minimum, maximum and single cardinality.

</div>

<div class="row">
<span class="label">How to fix</span>

Fix the numbers with `okb slot set`.

</div>

<details class="sources"><summary>Sources (3)</summary>

> “Slot cardinality defines how many values a slot can have. Some systems distinguish only between single cardinality (allowing at most one value) and multiple cardinality (allowing any number of values).”  
> — Ontology 101 §3 Step 6, Slot cardinality, p.9

> “Minimum cardinality of N means that a slot must have at least N values.”  
> — Ontology 101 §3 Step 6, Slot cardinality, p.9

> “Maximum cardinality of M means that a slot can have at most M values.”  
> — Ontology 101 §3 Step 6, Slot cardinality, p.9

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-slot-values-respect-facets"></a>
### `slot-values-respect-facets`

<p class="chips"><span class="chip error">MUST · error</span> <span class="chip">Automatic check</span> <span class="chip">Follows from the source</span> <span class="chip">From step 7</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

Every slot value must satisfy the slot's facets: its value type, allowed values, range, and minimum and maximum cardinality (including overrides on the instance's classes).

</div>

<div class="row">
<span class="label">In plain words</span>

The data has to follow the rules you set: body must be light, medium or full; a wine needs at least one grape; a maker has to be a Winery.

</div>

<div class="row">
<span class="label">Why</span>

Only minimum cardinality is worded as a 'must' in the source ('a slot must have at least N values'). The other facets are definitions of what 'can fill in the slot' (value type, allowed values, allowed classes, 'at most M values'), and subclasses may 'override some facets'. The toolkit infers that values outside those definitions are errors, because a facet nothing enforces constrains nothing.

</div>

<div class="row">
<span class="label">How to fix</span>

Correct the value, or loosen the facet if the data shows the rule was wrong (and record why).

</div>

<details class="sources"><summary>Sources (6)</summary>

> “Minimum cardinality of N means that a slot must have at least N values.”  
> — Ontology 101 §3 Step 6, Slot cardinality, p.9

> “Maximum cardinality of M means that a slot can have at most M values.”  
> — Ontology 101 §3 Step 6, Slot cardinality, p.9

> “A value-type facet describes what types of values can fill in the slot.”  
> — Ontology 101 §3 Step 6, Slot-value type, p.9

> “Enumerated slots specify a list of specific allowed values for the slot.”  
> — Ontology 101 §3 Step 6, Slot-value type, p.9

> “Instance-type slots allow definition of relationships between individuals. Slots with value type Instance must also define a list of allowed classes from which the instances can come.”  
> — Ontology 101 §3 Step 6, Slot-value type, p.10

> “In practical terms, each subclass should either have new slots added to it, or have new slot values defined, or override some facets for the inherited slots.”  
> — Ontology 101 §4.4 When to introduce a new class (or not), p.16

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-slot-value-slot-applies"></a>
### `slot-value-slot-applies`

<p class="chips"><span class="chip error">MUST · error</span> <span class="chip">Automatic check</span> <span class="chip">Follows from the source</span> <span class="chip">From step 7</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

An instance (or class) may only have values for slots attached to its class or inherited from an ancestor.

</div>

<div class="row">
<span class="label">In plain words</span>

A Winery can't have a tanninLevel: that slot belongs to Red Wine and its subclasses.

</div>

<div class="row">
<span class="label">Why</span>

The source attaches each property to the class it describes, and subclasses inherit it. Treating any other value as an error is the toolkit's closed-world reading of that: the source doesn't say values for unattached slots are forbidden, but a value no class declares can't be checked or queried reliably.

</div>

<div class="row">
<span class="label">How to fix</span>

Attach the slot to the right class, or remove the value.

</div>

<details class="sources"><summary>Sources (3)</summary>

> “For each property in the list, we must determine which class it describes. These properties become slots attached to classes.”  
> — Ontology 101 §3 Step 5. Define the properties of classes—slots, p.8

> “The classes to which a slot is attached or a classes which property a slot describes, are called the domain of the slot.”  
> — Ontology 101 §3 Step 6, Domain and range of a slot, p.10

> “All subclasses of a class inherit the slot of that class.”  
> — Ontology 101 §3 Step 5. Define the properties of classes—slots, p.9

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-slot-default-allowed"></a>
### `slot-default-allowed`

<p class="chips"><span class="chip error">MUST · error</span> <span class="chip">Automatic check</span> <span class="chip">Follows from the source</span> <span class="chip">From step 6</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

A default value must be a value the slot's facets allow.

</div>

<div class="row">
<span class="label">In plain words</span>

The default for body can't be 'sparkly' if the allowed values are light, medium and full.

</div>

<div class="row">
<span class="label">Why</span>

Defaults can be changed to 'any other value that the facets will allow', so the default must itself be one of them.

</div>

<div class="row">
<span class="label">How to fix</span>

Change the default or the allowed values.

</div>

<details class="sources"><summary>Sources (2)</summary>

> “If a particular slot value is the same for most instances of a class, we can define this value to be a default value for the slot.”  
> — Ontology 101 §5.2 Default values, p.21

> “We can then change the value to any other value that the facets will allow. That is, default values are there for convenience: they do not enforce any new restrictions on the model or change the model in any way.”  
> — Ontology 101 §5.2 Default values, p.21

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-slot-fixed-not-overridden"></a>
### `slot-fixed-not-overridden`

<p class="chips"><span class="chip error">MUST NOT · error</span> <span class="chip">Automatic check</span> <span class="chip">From the source</span> <span class="chip">From step 6</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

A fixed slot value set on a class must not be changed by any of its subclasses or instances.

</div>

<div class="row">
<span class="label">In plain words</span>

If every Dessert Wine is sweet, no dessert wine may say sugar=dry.

</div>

<div class="row">
<span class="label">Why</span>

Unlike defaults, class-level slot values cannot be changed in subclasses or instances.

</div>

<div class="row">
<span class="label">How to fix</span>

Remove the conflicting value, or turn the fixed value into a default if it really can vary.

</div>

<details class="sources"><summary>Source</summary>

> “Slot values cannot be changed. For example, we can say that the slot sugar has value SWEET for the Dessert wine class. Then all the subclasses and instances of the Dessert wine class will have the SWEET value for the slot sugar. This value cannot be changed in any of the subclasses or instances of the class.”  
> — Ontology 101 §5.2 Default values, p.21

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-slot-inverse-consistent"></a>
### `slot-inverse-consistent`

<p class="chips"><span class="chip warning">SHOULD · warning</span> <span class="chip">Likely-case check</span> <span class="chip">Follows from the source</span> <span class="chip">From step 6</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

Inverse slots should mirror each other: the range of one should match the domain of the other.

</div>

<div class="row">
<span class="label">In plain words</span>

If maker goes Wine → Winery, produces should go Winery → Wine.

</div>

<div class="row">
<span class="label">Why</span>

Inverse slots describe one relation from both ends (maker on Wine, produces on Winery). That the range of one should line up with the domain of the other is the toolkit's inference from 'one relation, two ends'; the source doesn't state it. Values can't disagree in okb, because each fact is stored as a single edge that both slots read.

</div>

<div class="row">
<span class="label">How to fix</span>

Adjust the range or domain of one slot so they match (`okb slot set <slot> --range ...` / `--on ...`).

</div>

<details class="sources"><summary>Sources (3)</summary>

> “Storing the information “in both directions” is redundant. When we know that a wine is produced by a winery, an application using the knowledge base can always infer the value for the inverse relation that the winery produces the wine. However, from the knowledge-acquisition perspective it is convenient to have both pieces of information explicitly available.”  
> — Ontology 101 §5.1 Inverse slots, p.20

> “The knowledge-acquisition system could then automatically fill in the value for the inverse relation insuring consistency of the knowledge base.”  
> — Ontology 101 §5.1 Inverse slots, p.20

> “The slot produces for the class Winery is an inverse of the slot maker for the class Wine.”  
> — Ontology 101 §5.1 Inverse slots, Figure 9, p.21

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-slot-edge-properties"></a>
### `slot-edge-properties`

<p class="chips"><span class="chip error">MUST · error</span> <span class="chip">Automatic check</span> <span class="chip">Toolkit convention</span> <span class="chip">From step 6</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

Properties on relationship edges must be declared on the relationship and must match their declared type, allowed values and required-ness; an edge's `rule` must point at a Rule node.

</div>

<div class="row">
<span class="label">In plain words</span>

If PREFERRED_OVER edges carry a condition, declare `condition` once, and every edge's condition gets checked like any other value.

</div>

<div class="row">
<span class="label">Why</span>

Ontology 101's frame model has no properties on relationships (a qualified relation would be reified as its own class). Labeled property graphs support them natively, so the toolkit allows them and gives them facets, so they get the same checking as slots. A toolkit rule, not the source's. Undeclared properties are reported as warnings (usually a hand edit or a typo); wrong types, missing required values and broken rule references are errors.

</div>

<div class="row">
<span class="label">How to fix</span>

`okb relationship property <rel> <name> --type ...` to declare; `okb link <from> <rel> <to> name=value` to set.

</div>

</section>

## Disjoint classes

<section class="entry">

<div class="head">

<a id="rule-disjoint-no-shared-members"></a>
### `disjoint-no-shared-members`

<p class="chips"><span class="chip error">MUST NOT · error</span> <span class="chip">Automatic check</span> <span class="chip">From the source</span> <span class="chip">From step 4</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

No class or instance may fall under two classes declared disjoint, and a class must not be declared disjoint with its own ancestor.

</div>

<div class="row">
<span class="label">In plain words</span>

If Red Wine and White Wine are disjoint, nothing can be under both, directly or through its parents.

</div>

<div class="row">
<span class="label">Why</span>

Disjoint classes cannot have any instances in common, and declaring disjointness lets the system report exactly this modeling error (the Riesling/Port example). The ancestor case is the toolkit's inference: a class disjoint with its own ancestor could never have members, which is consistent but almost certainly a mistake.

</div>

<div class="row">
<span class="label">How to fix</span>

Move the class/instance under the right parent, or remove the disjointness if it was wrong.

</div>

<details class="sources"><summary>Sources (2)</summary>

> “Classes are disjoint if they cannot have any instances in common.”  
> — Ontology 101 §4.8 Disjoint subclasses, p.20

> “Specifying that classes are disjoint enables the system to validate the ontology better. If we declare the Red wine and the White wine classes to be disjoint and later create a class that is a subclass of both Riesling (a subclass of White wine) and Port (a subclass of Red wine), a system can indicate that there is a modeling error.”  
> — Ontology 101 §4.8 Disjoint subclasses, p.20

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-disjoint-consider-siblings"></a>
### `disjoint-consider-siblings`

<p class="chips"><span class="chip info">MAY · info</span> <span class="chip">Automatic check</span> <span class="chip">From the source</span> <span class="chip">From step 4</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

Consider declaring sibling classes disjoint when nothing can belong to more than one of them.

</div>

<div class="row">
<span class="label">In plain words</span>

Can anything be both a Red Wine and a White Wine? No? Say so, and okb will catch mistakes for you.

</div>

<div class="row">
<span class="label">Why</span>

Specifying disjointness enables the system to validate the ontology better.

</div>

<div class="row">
<span class="label">How to fix</span>

`okb class disjoint A B C`, or ignore it if the siblings can overlap (Dessert Wine and White Wine can).

</div>

<details class="sources"><summary>Source</summary>

> “Specifying that classes are disjoint enables the system to validate the ontology better. If we declare the Red wine and the White wine classes to be disjoint and later create a class that is a subclass of both Riesling (a subclass of White wine) and Port (a subclass of Red wine), a system can indicate that there is a modeling error.”  
> — Ontology 101 §4.8 Disjoint subclasses, p.20

</details>

</section>

## Naming

<section class="entry">

<div class="head">

<a id="rule-naming-convention-defined"></a>
### `naming-convention-defined`

<p class="chips"><span class="chip error">MUST · error</span> <span class="chip">Automatic check</span> <span class="chip">From the source</span> <span class="chip">From step 4</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

Define a naming convention for classes and slots (capitalization, delimiters, singular/plural, prefixes) before creating many names.

</div>

<div class="row">
<span class="label">In plain words</span>

Pick how names look. okb starts you on its defaults so you can keep moving, but you need to confirm them (or choose your own) with `okb convention`.

</div>

<div class="row">
<span class="label">Why</span>

The source says 'we need to' define one; strictly adhering to it makes the ontology easier to understand and avoids common mistakes.

</div>

<div class="row">
<span class="label">How to fix</span>

`okb convention` (the defaults are PascalCase singular classes, camelCase slots).

</div>

<details class="sources"><summary>Sources (2)</summary>

> “However, we need to Define a naming convention for classes and slots and adhere to it.”  
> — Ontology 101 §6 What's in a name?, p.21

> “Defining naming conventions for concepts in an ontology and then strictly adhering to these conventions not only makes the ontology easier to understand but also helps avoid some common modeling mistakes.”  
> — Ontology 101 §6 What's in a name?, p.21

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-naming-follow-convention"></a>
### `naming-follow-convention`

<p class="chips"><span class="chip error">MUST · error</span> <span class="chip">Automatic check</span> <span class="chip">From the source</span> <span class="chip">From step 4</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

Class and slot names must follow the declared naming convention.

</div>

<div class="row">
<span class="label">In plain words</span>

Once you've chosen a style, every name uses it.

</div>

<div class="row">
<span class="label">Why</span>

A convention only helps if it is adhered to; the source says to define one 'and adhere to it'.

</div>

<div class="row">
<span class="label">How to fix</span>

`okb rename <old> <new>`.

</div>

<details class="sources"><summary>Source</summary>

> “However, we need to Define a naming convention for classes and slots and adhere to it.”  
> — Ontology 101 §6 What's in a name?, p.21

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-naming-singular-plural-consistent"></a>
### `naming-singular-plural-consistent`

<p class="chips"><span class="chip warning">SHOULD · warning</span> <span class="chip">Likely-case check</span> <span class="chip">From the source</span> <span class="chip">From step 4</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

Class names should consistently be singular or consistently plural, as declared in the convention.

</div>

<div class="row">
<span class="label">In plain words</span>

All classes singular (Wine, Winery) or all plural (Wines, Wineries). Don't mix.

</div>

<div class="row">
<span class="label">Why</span>

Neither is better (singular is more common), but the choice should be consistent throughout, and this also prevents the Wine/Wines mistake. okb guesses plurals from English endings, so check its suggestions.

</div>

<div class="row">
<span class="label">How to fix</span>

`okb rename`, or ignore a false positive (e.g. 'Glass', 'Series').

</div>

<details class="sources"><summary>Sources (2)</summary>

> “No alternative is better or worse than the other (although singular for class names is used more often in practice). However, whatever the choice, it should be consistent throughout the whole ontology.”  
> — Ontology 101 §6.2 Singular or plural, p.22

> “The best way to avoid such an error is always to use either singular or plural in naming classes”  
> — Ontology 101 §4.1 Ensuring that the class hierarchy is correct, p.12

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-naming-no-type-words"></a>
### `naming-no-type-words`

<p class="chips"><span class="chip warning">SHOULD NOT · warning</span> <span class="chip">Automatic check</span> <span class="chip">From the source</span> <span class="chip">From step 4</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

Do not add strings such as 'class', 'property' or 'slot' to concept names.

</div>

<div class="row">
<span class="label">In plain words</span>

Call it Wine, not WineClass; maker, not makerProperty.

</div>

<div class="row">
<span class="label">Why</span>

Context and the naming convention already show whether a name is a class or a slot. The source lists this among naming things 'to consider', hence SHOULD NOT rather than MUST NOT.

</div>

<div class="row">
<span class="label">How to fix</span>

`okb rename`.

</div>

<details class="sources"><summary>Sources (2)</summary>

> “Do not add strings such as “class”, “property”, “slot”, and so on to concept names.”  
> — Ontology 101 §6.4 Other naming considerations, p.23

> “Here are a few more things to consider when defining naming conventions:”  
> — Ontology 101 §6.4 Other naming considerations, p.23

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-naming-no-abbreviations"></a>
### `naming-no-abbreviations`

<p class="chips"><span class="chip info">SHOULD NOT · info</span> <span class="chip">Likely-case check</span> <span class="chip">From the source</span> <span class="chip">From step 4</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

Avoid abbreviations in concept names.

</div>

<div class="row">
<span class="label">In plain words</span>

CabernetSauvignon, not Cab.

</div>

<div class="row">
<span class="label">Why</span>

Stated as 'usually a good idea'. okb only flags all-caps words and names ending in '.', so it misses most abbreviations; the review skill looks for the rest.

</div>

<div class="row">
<span class="label">How to fix</span>

`okb rename`, or add the short form as a synonym.

</div>

<div class="row muted">
<span class="label">Severity</span>

Abbreviation detection is a guess; downgraded to info to avoid noisy warnings.

</div>

<details class="sources"><summary>Source</summary>

> “It is usually a good idea to avoid abbreviations in concept names (that is, use Cabernet Sauvignon rather than Cab)”  
> — Ontology 101 §6.4 Other naming considerations, p.23

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-naming-subclass-names-consistent"></a>
### `naming-subclass-names-consistent`

<p class="chips"><span class="chip warning">SHOULD · warning</span> <span class="chip">Automatic check</span> <span class="chip">From the source</span> <span class="chip">From step 4</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

Names of direct subclasses of a class should either all include or all omit the superclass name.

</div>

<div class="row">
<span class="label">In plain words</span>

Either put the parent's name in every subclass name or in none. For the subclasses of Wine: RedWine and WhiteWine, or Red and White, but not RedWine and White.

</div>

<div class="row">
<span class="label">Why</span>

Inconsistent sibling names make the structure harder to read.

</div>

<div class="row">
<span class="label">How to fix</span>

`okb rename` the odd one(s) out.

</div>

<details class="sources"><summary>Source</summary>

> “Names of direct subclasses of a class should either all include or not include the name of the superclass.”  
> — Ontology 101 §6.4 Other naming considerations, p.23

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-naming-unique"></a>
### `naming-unique`

<p class="chips"><span class="chip error">MUST · error</span> <span class="chip">Automatic check</span> <span class="chip">Toolkit convention</span> <span class="chip">From step 3</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

Names must be unique among classes, among slots and among instances (ignoring case and delimiters).

</div>

<div class="row">
<span class="label">In plain words</span>

Two classes called RedWine and Red_Wine would be confusing and break lookups.

</div>

<div class="row">
<span class="label">Why</span>

The source points out that systems differ in whether classes, slots and instances share a name space and whether names are case-sensitive. okb chooses one namespace per node type, case- and delimiter-insensitive, so names stay portable to whichever system you exchange them with.

</div>

<div class="row">
<span class="label">How to fix</span>

`okb rename` one of them, or merge them if they're the same concept.

</div>

<details class="sources"><summary>Sources (2)</summary>

> “Does the system have the same name space for classes, slots, and instances? That is, does the system allow having a class and a slot with the same name (such as a class winery and a slot winery)? Is the system case-sensitive?”  
> — Ontology 101 §6 What's in a name?, p.22

> “It is however, important to consider other systems with which your system may interact.”  
> — Ontology 101 §6.1 Capitalization and delimiters, p.22

</details>

</section>

## Scope and documentation

<section class="entry">

<div class="head">

<a id="rule-scope-defined"></a>
### `scope-defined`

<p class="chips"><span class="chip warning">SHOULD · warning</span> <span class="chip">Automatic check</span> <span class="chip">From the source</span> <span class="chip">From step 1</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

Start by defining the domain and scope: the domain covered, what the ontology is for, and who will use and maintain it.

</div>

<div class="row">
<span class="label">In plain words</span>

Write down what it's about, what it's for, and who it's for, before you build anything.

</div>

<div class="row">
<span class="label">Why</span>

The answers may change later, but at any given time they help limit the scope of the model.

</div>

<div class="row">
<span class="label">How to fix</span>

`okb scope --domain ... --purpose ... --users ...`.

</div>

<details class="sources"><summary>Sources (2)</summary>

> “We suggest starting the development of an ontology by defining its domain and scope. That is, answer several basic questions: What is the domain that the ontology will cover? For what we are going to use the ontology? For what types of questions the information in the ontology should provide answers? Who will use and maintain the ontology?”  
> — Ontology 101 §3 Step 1. Determine the domain and scope, p.5

> “The answers to these questions may change during the ontology-design process, but at any given time they help limit the scope of the model.”  
> — Ontology 101 §3 Step 1. Determine the domain and scope, p.5

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-scope-competency-questions"></a>
### `scope-competency-questions`

<p class="chips"><span class="chip warning">SHOULD · warning</span> <span class="chip">Automatic check</span> <span class="chip">Toolkit convention</span> <span class="chip">From step 1</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

An ontology should have competency questions (the toolkit suggests at least three to start).

</div>

<div class="row">
<span class="label">In plain words</span>

Write down a few questions your ontology must be able to answer. You'll use them to decide what to include and to test the result.

</div>

<div class="row">
<span class="label">Why</span>

The source offers competency questions as 'one of the ways' to scope an ontology and as the later litmus test. The toolkit makes them expected because every later check on scope depends on them. The number three is a toolkit suggestion; the source says the list 'does not need to be exhaustive'.

</div>

<div class="row">
<span class="label">How to fix</span>

`okb cq add "..."`.

</div>

<details class="sources"><summary>Sources (3)</summary>

> “One of the ways to determine the scope of the ontology is to sketch a list of questions that a knowledge base based on the ontology should be able to answer, competency questions”  
> — Ontology 101 §3 Step 1, Competency questions, p.5

> “These questions will serve as the litmus test later: Does the ontology contain enough information to answer these types of questions?”  
> — Ontology 101 §3 Step 1, Competency questions, p.5

> “These competency questions are just a sketch and do not need to be exhaustive.”  
> — Ontology 101 §3 Step 1, Competency questions, p.5

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-scope-cq-coverage"></a>
### `scope-cq-coverage`

<p class="chips"><span class="chip warning">SHOULD · warning</span> <span class="chip">Automatic check</span> <span class="chip">Follows from the source</span> <span class="chip">From step 8</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

Each competency question should be linked to the classes and slots needed to answer it.

</div>

<div class="row">
<span class="label">In plain words</span>

For each question, point at the parts of the ontology that answer it. A question with nothing to point at isn't answerable yet.

</div>

<div class="row">
<span class="label">Why</span>

Competency questions are the litmus test: does the ontology contain enough information to answer them? NEEDS links make that test explicit and checkable.

</div>

<div class="row">
<span class="label">How to fix</span>

`okb cq link <cq> <Class|slot>...`, or add what's missing.

</div>

<details class="sources"><summary>Sources (2)</summary>

> “These questions will serve as the litmus test later: Does the ontology contain enough information to answer these types of questions?”  
> — Ontology 101 §3 Step 1, Competency questions, p.5

> “The classes alone will not provide enough information to answer the competency questions from Step 1.”  
> — Ontology 101 §3 Step 5. Define the properties of classes—slots, p.8

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-scope-no-unneeded"></a>
### `scope-no-unneeded`

<p class="chips"><span class="chip info">SHOULD NOT · info</span> <span class="chip">Likely-case check</span> <span class="chip">From the source</span> <span class="chip">From step 8</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

The ontology should not contain all possible information, properties and distinctions: don't specialize or generalize more than the application needs (at most one extra level each way).

</div>

<div class="row">
<span class="label">In plain words</span>

If no competency question needs a class or slot (or its parent or child), ask whether it belongs.

</div>

<div class="row">
<span class="label">Why</span>

Extra detail costs maintenance and can actively hurt (the Experimenter example). okb reports classes and slots not reachable within one level from anything a competency question needs. It only does this once questions have been linked.

</div>

<div class="row">
<span class="label">Ask yourself</span>

For each flagged element: which question needs it? If none, add the question it serves, or remove it.

</div>

<div class="row">
<span class="label">How to fix</span>

Link it to (or add) the question that needs it, or remove it.

</div>

<div class="row muted">
<span class="label">Severity</span>

Whether something is 'needed' depends on how completely questions were linked, so this is a prompt, not a warning.

</div>

<details class="sources"><summary>Sources (2)</summary>

> “The ontology should not contain all the possible information about the domain: you do not need to specialize (or generalize) more than you need for your application (at most one extra level each way).”  
> — Ontology 101 §4.7 Limiting the scope, p.19

> “The ontology should not contain all the possible properties of and distinctions among classes in the hierarchy.”  
> — Ontology 101 §4.7 Limiting the scope, p.19

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-scope-cq-families"></a>
### `scope-cq-families`

<p class="chips"><span class="chip warning">SHOULD · warning</span> <span class="chip">You decide</span> <span class="chip">Follows from the source</span> <span class="chip">From step 8</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

Treat each competency question as one example of a type of question: once it's answered, check whether the ontology should also answer its family (the same question about similar things, and related questions about the same thing), and record the ones that are out of scope.

</div>

<div class="row">
<span class="label">In plain words</span>

If 'Which wines go with grilled meat?' is a question, 'Which wines go with seafood?' probably is too. Answering only the exact questions you wrote down passes the test but misses the point. You don't need to list them all at the start: look at each family once the question it came from is answered.

</div>

<div class="row">
<span class="label">Why</span>

The source calls competency questions 'just a sketch' that 'do not need to be exhaustive', and uses them as a litmus test for 'these types of questions'. So each one stands for a type of question, not a checklist item. Asking about the family once a question is answered, rather than up front, is the toolkit's reading. The source also warns against including everything (scope-no-unneeded), so 'out of scope' is a fine answer, as long as it's recorded.

</div>

<div class="row">
<span class="label">Ask yourself</span>

For each answered competency question: what's its family (the same question about sibling classes or other instances, and the questions next to it about the same subject)? Would the ontology answer them? Is each one you don't want recorded as out of scope?

</div>

<div class="row">
<span class="label">How to fix</span>

Add the questions you want (okb cq add, then okb cq link), and record the rest as out of scope (okb scope --out-of-scope) or in a design decision.

</div>

<details class="sources"><summary>Sources (2)</summary>

> “These competency questions are just a sketch and do not need to be exhaustive.”  
> — Ontology 101 §3 Step 1, Competency questions, p.5

> “These questions will serve as the litmus test later: Does the ontology contain enough information to answer these types of questions?”  
> — Ontology 101 §3 Step 1, Competency questions, p.5

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-doc-descriptions"></a>
### `doc-descriptions`

<p class="chips"><span class="chip warning">SHOULD · warning</span> <span class="chip">Automatic check</span> <span class="chip">Follows from the source</span> <span class="chip">From step 4</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

Every class and slot should have a human-readable description of what it denotes.

</div>

<div class="row">
<span class="label">In plain words</span>

One sentence per class and slot saying what it means. The name alone is ambiguous.

</div>

<div class="row">
<span class="label">Why</span>

Gruber describes ontology definitions as associating names with human-readable text as well as formal constraints; the Ontology 101 paper relies on class documentation for synonyms and design decisions. It is framed as what a definition contains, not as a 'must', hence SHOULD.

</div>

<div class="row">
<span class="label">How to fix</span>

`okb class set <Class> --desc "..."` / `okb slot set <slot> --desc "..."`.

</div>

<details class="sources"><summary>Sources (2)</summary>

> “definitions associate the names of entities in the universe of discourse (e.g., classes, relations, functions, or other objects) with human-readable text describing what the names are meant to denote, and formal axioms that constrain the interpretation and well-formed use of these terms.”  
> — Gruber 1993 §1 Introduction, p.3

> “Many systems allow associating a list of synonyms, translations, or presentation names with a class. If a system does not allow these associations, synonyms could always be listed in the class documentation.”  
> — Ontology 101 §4.1 Ensuring that the class hierarchy is correct, p.13

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-doc-record-decisions"></a>
### `doc-record-decisions`

<p class="chips"><span class="chip warning">SHOULD · warning</span> <span class="chip">You decide</span> <span class="chip">Follows from the source</span> <span class="chip">From step 4</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

Record design decisions in the documentation, above all deliberate omissions made for your application, and (toolkit extension) other non-obvious modeling choices.

</div>

<div class="row">
<span class="label">In plain words</span>

Every time you choose between two reasonable options, write a one-line design decision.

</div>

<div class="row">
<span class="label">Why</span>

The source's instruction is about scope-limiting choices: record that Experimenter was deliberately not made a Biological Organism, so reusers don't assume otherwise. The toolkit extends the same reasoning to any choice a reuser might not expect (multiple inheritance, terminological classes, kept warnings).

</div>

<div class="row">
<span class="label">Ask yourself</span>

Look for multiple inheritance, terminological classes, class-vs-value choices, things deliberately left out, and flagged findings you decided to keep. Does each have a DesignDecision?

</div>

<div class="row">
<span class="label">How to fix</span>

`okb decision add --title ... --decision ... --why ... --about <node>`.

</div>

<details class="sources"><summary>Source</summary>

> “However, we should record such design decision in the documentation for the benefit of the users who will be looking at this ontology and who may not be aware of the application we had in mind.”  
> — Ontology 101 §4.7 Limiting the scope, p.20

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-reuse-considered"></a>
### `reuse-considered`

<p class="chips"><span class="chip warning">SHOULD · warning</span> <span class="chip">You decide</span> <span class="chip">From the source</span> <span class="chip">From step 3</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

Consider reusing existing ontologies or vocabularies before building from scratch.

</div>

<div class="row">
<span class="label">In plain words</span>

Spend a little time looking for an existing ontology, standard list or glossary you can borrow from.

</div>

<div class="row">
<span class="label">Why</span>

It is almost always worth considering, and reuse may be required if your system must interact with applications that already committed to a vocabulary.

</div>

<div class="row">
<span class="label">Ask yourself</span>

Did you look for an industry standard, internal glossary, spreadsheet or schema that already names these things? Is there a system you must interoperate with?

</div>

<div class="row">
<span class="label">How to fix</span>

Look, then record what you found (see reuse-recorded).

</div>

<details class="sources"><summary>Sources (2)</summary>

> “It is almost always worth considering what someone else has done and checking if we can refine and extend existing sources for our particular domain and task.”  
> — Ontology 101 §3 Step 2. Consider reusing existing ontologies, p.5

> “Reusing existing ontologies may be a requirement if our system needs to interact with other applications that have already committed to particular ontologies or controlled vocabularies.”  
> — Ontology 101 §3 Step 2. Consider reusing existing ontologies, p.5-6

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-terms-dispositioned"></a>
### `terms-dispositioned`

<p class="chips"><span class="chip warning">SHOULD · warning</span> <span class="chip">Automatic check</span> <span class="chip">Toolkit convention</span> <span class="chip">From step 6</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

Every term brainstormed in Step 3 should end up as a class, slot, instance, slot value or synonym, or be marked out of scope.

</div>

<div class="row">
<span class="label">In plain words</span>

Go back to your term list and make sure nothing was forgotten.

</div>

<div class="row">
<span class="label">Why</span>

The source derives classes (Step 4) and slots (Step 5) from the Step 3 list; tracking what became of each term is the toolkit's way of making sure the list was actually used.

</div>

<div class="row">
<span class="label">How to fix</span>

`okb term set <term> --as class|slot|instance|value|synonym|out-of-scope`.

</div>

<details class="sources"><summary>Sources (2)</summary>

> “From the list created in Step 3, we select the terms that describe objects having independent existence rather than terms that describe these objects.”  
> — Ontology 101 §3 Step 4. Define the classes and the class hierarchy, p.7

> “Most of the remaining terms are likely to be properties of these classes.”  
> — Ontology 101 §3 Step 5. Define the properties of classes—slots, p.8

</details>

</section>

<section class="entry">

<div class="head">

<a id="rule-reuse-recorded"></a>
### `reuse-recorded`

<p class="chips"><span class="chip warning">SHOULD · warning</span> <span class="chip">Automatic check</span> <span class="chip">Toolkit convention</span> <span class="chip">From step 3</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

Record the outcome of Step 2: each existing ontology considered, or that none was found.

</div>

<div class="row">
<span class="label">In plain words</span>

Even 'we looked and found nothing' is worth writing down.

</div>

<div class="row">
<span class="label">Why</span>

The source asks you to consider reuse; recording the outcome is the toolkit's way of making that step visible to later readers and to `okb status`.

</div>

<div class="row">
<span class="label">How to fix</span>

`okb reuse add ...` for each candidate, or `okb reuse none --why ...`.

</div>

</section>

## File structure

<section class="entry">

<div class="head">

<a id="rule-struct-well-formed"></a>
### `struct-well-formed`

<p class="chips"><span class="chip error">MUST · error</span> <span class="chip">Automatic check</span> <span class="chip">Toolkit convention</span> <span class="chip">From step 1</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

Files must be well-formed: unique node ids, known node and edge types, edges pointing at existing nodes of the allowed types, and required properties present.

</div>

<div class="row">
<span class="label">In plain words</span>

The JSON has to hang together. If you only use okb commands, this never fails; it catches hand edits.

</div>

<div class="row">
<span class="label">Why</span>

Every other check assumes the graph is structurally sound.

</div>

<div class="row">
<span class="label">How to fix</span>

Fix the node/edge named in the finding (or undo the hand edit).

</div>

</section>

## Provenance

<section class="entry">

<div class="head">

<a id="rule-prov-verified"></a>
### `prov-verified`

<p class="chips"><span class="chip error">MUST · error</span> <span class="chip">Automatic check</span> <span class="chip">Toolkit convention</span> <span class="chip">From step 1</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

A node extracted from a document must be verified against its quote, and anything not SUPPORTED (including corrected OVERREACH results, until a person approves them) must be resolved before the ontology is published.

</div>

<div class="row">
<span class="label">In plain words</span>

If the independent check said a statement claims more than its quote supports, a human decides before it ships.

</div>

<div class="row">
<span class="label">Why</span>

The extraction pipeline's gate (docs/EXTRACTION-PIPELINE.md): drafting and verifying are separate passes, and only SUPPORTED claims merge without review.

</div>

<div class="row">
<span class="label">How to fix</span>

Edit the statement to match the quote, then set verification.status to SUPPORTED with a note, or delete the node.

</div>

</section>

<section class="entry">

<div class="head">

<a id="rule-prov-cites-quote"></a>
### `prov-cites-quote`

<p class="chips"><span class="chip error">MUST · error</span> <span class="chip">Automatic check</span> <span class="chip">Toolkit convention</span> <span class="chip">From step 1</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

Every domain Rule, and every node marked as extracted, must CITE at least one SourceLocation with a non-empty verbatim quote that is PART_OF a Source.

</div>

<div class="row">
<span class="label">In plain words</span>

Anything taken from a document has to point at the exact words it came from.

</div>

<div class="row">
<span class="label">Why</span>

Quote-first extraction: no quote, no claim.

</div>

<div class="row">
<span class="label">How to fix</span>

Add the SourceLocation and CITES edge, or delete the unsupported node.

</div>

</section>

<section class="entry">

<div class="head">

<a id="rule-prov-quote-current"></a>
### `prov-quote-current`

<p class="chips"><span class="chip error">MUST · error</span> <span class="chip">Automatic check</span> <span class="chip">Toolkit convention</span> <span class="chip">From step 1</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

Each SourceLocation quote must still appear verbatim in its source document (checked when the Source has a readable localPath).

</div>

<div class="row">
<span class="label">In plain words</span>

If the source document changed and the quote is gone, the citation is stale.

</div>

<div class="row">
<span class="label">Why</span>

Catches citations that went stale after the source was edited, which the original pipeline listed as unsolved.

</div>

<div class="row">
<span class="label">How to fix</span>

Re-extract from the current document, or update localPath to the version you cited.

</div>

</section>

<section class="entry">

<div class="head">

<a id="rule-prov-duplicate-quotes"></a>
### `prov-duplicate-quotes`

<p class="chips"><span class="chip info">MAY · info</span> <span class="chip">Automatic check</span> <span class="chip">Toolkit convention</span> <span class="chip">From step 1</span></p>

</div>

<div class="row">
<span class="label">Rule</span>

Near-identical quotes attributed to different source documents may indicate copy-pasted documentation; check each is accurate for its own source.

</div>

<div class="row">
<span class="label">In plain words</span>

The same paragraph appearing in two different docs is often a copy-paste that's only right in one of them.

</div>

<div class="row">
<span class="label">Why</span>

A documentation-quality signal carried over from the original validator (it found a button size table pasted into unrelated component docs).

</div>

<div class="row">
<span class="label">How to fix</span>

Confirm each quote against its own document; fix the documentation if one copy is wrong.

</div>

</section>

