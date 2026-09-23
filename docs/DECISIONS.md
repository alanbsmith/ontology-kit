# Decision guides

> Generated from the meta-KB (v2.2.0) by `npm run docs`. Don't edit by hand: change `meta-kb/src/*.yaml` and regenerate.

The recurring "which way do I model this?" questions, as short yes/no walkthroughs. Remember there's no single right answer; record what you chose with `okb decision add`.

<a id="decisionapproach"></a>
## Top-down, bottom-up, or combination?

*When:* At the start of Step 4, before you add classes.

1. **Do you naturally think of this domain starting from its broadest categories?**  
   Yes → Go top-down: create the most general classes first, then specialize.  
   No → go to the next question

2. **Do you think in concrete examples first (specific products, cases, items)?**  
   Yes → Go bottom-up: create the most specific classes, then group them.  
   No → Use combination: start with the most obvious concepts at any level and grow up and down from them.

None of the three is better than the others. Combination is often the easiest for beginners, because the middle-level concepts tend to be the most descriptive.

**Wine example:** Combination: start with Wine and Margaux, then add Médoc between them.

> “None of these three methods is inherently better than any of the others. The approach to take depends strongly on the personal view of the domain.”  
> — Ontology 101 §3 Step 4. Define the classes and the class hierarchy, p.7

> “The combination approach is often the easiest for many ontology developers, since the concepts “in the middle” tend to be the more descriptive concepts in the domain”  
> — Ontology 101 §3 Step 4. Define the classes and the class hierarchy, p.7

<a id="decisionis-a"></a>
## Is this really a subclass?

*When:* Every time you add an IS_A (parent) link.

1. **Is every single X, by definition, also a Y (not just usually)?**  
   Yes → go to the next question  
   No → Not a subclass. If X is part of Y, made by Y, or related to Y, use a slot.

2. **Is X a singular/plural or alternative name for Y?**  
   Yes → Not a subclass. It's the same class; add the other name as a synonym.  
   No → go to the next question

3. **Is X one particular thing rather than a kind of thing?**  
   Yes → It's an instance of Y, not a subclass.  
   No → go to the next question

4. **Is X already a subclass of Y through another parent?**  
   Yes → Don't add the direct link; it's implied.  
   No → Yes, X IS_A Y.

**Wine example:** Pinot Noir → Red Wine: every Pinot Noir is necessarily red. ✓. Wine → Wines: ✗ (plural). Château Morgon Beaujolais → Beaujolais: ✗, it's an instance.

> “We organize the classes into a hierarchical taxonomy by asking if by being an instance of one class, the object will necessarily (i.e., by definition) be an instance of some other class.”  
> — Ontology 101 §3 Step 4. Define the classes and the class hierarchy, p.8

> “The class hierarchy represents an “is-a” relation: a class A is a subclass of B if every instance of A is also an instance of B.”  
> — Ontology 101 §4.1 Ensuring that the class hierarchy is correct, p.12

> “A common modeling mistake is to include both a singular and a plural version of the same concept in the hierarchy making the former a subclass of the latter. For example, it is wrong to define a class Wines and a class Wine as a subclass of Wines.”  
> — Ontology 101 §4.1 Ensuring that the class hierarchy is correct, p.12

> “A subclass relationship is transitive: If B is a subclass of A and C is a subclass of B, then C is a subclass of A”  
> — Ontology 101 §4.1 Ensuring that the class hierarchy is correct, p.13

<a id="decisionnew-class"></a>
## Should I introduce a new subclass here?

*When:* When you're tempted to split a class into more specific ones.

1. **Will the subclass have slots the parent doesn't have?**  
   Yes → Create it.  
   No → go to the next question

2. **Will it have different restrictions (a fixed value, fewer allowed values, a different cardinality)?**  
   Yes → Create it.  
   No → go to the next question

3. **Will it take part in relationships the parent doesn't (e.g. 'goes well with seafood')?**  
   Yes → Create it.  
   No → go to the next question

4. **Is this a reference hierarchy people browse to pick a level of detail, or a distinction experts always make?**  
   Yes → Create it, mark it terminological, and record why.  
   No → Probably don't. Use a slot value on the parent instead.

Aim for a balance: neither a deep hierarchy of near-identical classes nor a flat one that stuffs everything into slots.

**Wine example:** Red Wine ✓ (adds tanninLevel). Dessert Wine ✓ (fixes sugar = sweet). 'Delicate Wine' ✗ (it's just flavor = delicate).

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

<a id="decisionclass-or-value"></a>
## New class, or just a slot value?

*When:* When a term is a distinction among things (red/white, small/large, active/inactive).

1. **Would things with different values change which values are allowed in OTHER classes' slots? (e.g. red vs white changes which dishes pair well)**  
   Yes → Make classes.  
   No → go to the next question

2. **Do people in the domain think of things with different values as different kinds of things?**  
   Yes → Make classes.  
   No → go to the next question

3. **Could one individual change its value over time (chilled/not chilled, active/inactive)?**  
   Yes → Slot value. Class membership shouldn't change often.  
   No → go to the next question

4. **Is it a number, color, location or similar measurement?**  
   Yes → Slot value (usually).  
   No → Slot value, unless one of the earlier tests applied.

The same distinction can be a class in one ontology and a value in another. It depends on your scope. Record which you chose.

**Wine example:** Wine color is a class split in the pairing ontology (red and white pair differently), but just a value in a label-printing ontology.

> “If the concepts with different slot values become restrictions for different slots in other classes, then we should create a new class for the distinction. Otherwise, we represent the distinction in a slot value.”  
> — Ontology 101 §4.5 A new class or a property value?, p.17

> “If a distinction is important in the domain and we think of the objects with different values for the distinction as different kinds of objects, then we should create a new class for the distinction.”  
> — Ontology 101 §4.5 A new class or a property value?, p.17

> “A class to which an individual instance belongs should not change often. Usually when we use extrinsic rather than intrinsic properties of concepts to differentiate among classes, instances of those classes will have to migrate often from one class to another.”  
> — Ontology 101 §4.5 A new class or a property value?, p.17

> “Usually numbers, colors, locations are slot values and do not cause the creation of new classes.”  
> — Ontology 101 §4.5 A new class or a property value?, p.17

<a id="decisioninstance-or-class"></a>
## Instance or class?

*When:* When a term names something specific, or when you reach the bottom of the hierarchy.

1. **Do the concepts form a natural hierarchy (one inside another, like regions)?**  
   Yes → Classes (possibly abstract), even if they have no instances yet.  
   No → go to the next question

2. **Is it among the most specific things that appear in the answers to your competency questions?**  
   Yes → Instance.  
   No → go to the next question

3. **Will you need to record different facts about finer-grained versions of it (e.g. each vintage)?**  
   Yes → Class, with the finer-grained things as its instances.  
   No → Instance.

**Wine example:** For pairing, Sterling Vineyards Merlot is an instance. If you track each vintage, it becomes a class and the vintages become instances. Wine regions are all classes because they nest.

> “Deciding whether a particular concept is a class in an ontology or an individual instance depends on what the potential applications of the ontology are.”  
> — Ontology 101 §4.6 An instance or a class?, p.18

> “the most specific concepts that will constitute answers to those questions are very good candidates for individuals in the knowledge base.”  
> — Ontology 101 §4.6 An instance or a class?, p.18

> “If concepts form a natural hierarchy, then we should represent them as classes”  
> — Ontology 101 §4.6 An instance or a class?, p.18

<a id="decisiondisjoint"></a>
## Are these classes disjoint?

*When:* After creating siblings.

1. **Can any single thing be a member of both classes at once?**  
   Yes → Not disjoint. Leave them.  
   No → Declare them disjoint (okb class disjoint A B).

**Wine example:** Red Wine / White Wine: disjoint. Dessert Wine / White Wine: not disjoint (sweet Riesling is both).

> “Classes are disjoint if they cannot have any instances in common.”  
> — Ontology 101 §4.8 Disjoint subclasses, p.20

> “Specifying that classes are disjoint enables the system to validate the ontology better. If we declare the Red wine and the White wine classes to be disjoint and later create a class that is a subclass of both Riesling (a subclass of White wine) and Port (a subclass of Red wine), a system can indicate that there is a modeling error.”  
> — Ontology 101 §4.8 Disjoint subclasses, p.20

<a id="decisionslot-placement"></a>
## Which class does this slot go on?

*When:* Step 5, for each property.

1. **Does every member of the parent class have this property?**  
   Yes → Move up and ask again about the next parent.  
   No → Attach it to the current class, the highest one where every member has it.

2. **Are you about to attach it to every child of some class?**  
   Yes → Attach it to that class instead.  
   No → go to the next question

**Wine example:** body goes on Wine (all wines have a body). tanninLevel goes on Red Wine, not Wine.

> “A slot should be attached at the most general class that can have that property.”  
> — Ontology 101 §3 Step 5. Define the properties of classes—slots, p.9

> “On the other hand, we must ensure that each class to which we attach the slot can indeed have the property that the slot represents.”  
> — Ontology 101 §3 Step 6, Domain and range of a slot, p.11

> “If a list of classes defining a range or a domain of a slot contains all subclasses of a class A, but not the class A itself, the range should contain only the class A and not the subclasses.”  
> — Ontology 101 §3 Step 6, Domain and range of a slot, p.11

<a id="decisionrange"></a>
## What should this slot's range be?

*When:* Step 6, for each Instance-type slot.

1. **Is there one class that covers every valid value?**  
   Yes → Use the most general such class that contains only valid values.  
   No → List several classes.

2. **Does your list include a class and its subclass?**  
   Yes → Drop the subclass.  
   No → go to the next question

3. **Does your list include all (or nearly all) children of one class?**  
   Yes → Use the parent instead.  
   No → go to the next question

4. **Is the range something like Thing/Entity/Object?**  
   Yes → Too general. Narrow it.  
   No → Done.

**Wine example:** produces → Wine (not Red Wine + White Wine + Rosé Wine, and not Thing).

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

<a id="decisionnaming"></a>
## Choosing a naming convention

*When:* Start of Step 4, before you create many names.

1. **Will the names be used in code, a graph database, or URLs that don't handle spaces well?**  
   Yes → Use PascalCase for classes and camelCase for slots (the toolkit default).  
   No → Title Case With Spaces is also fine for classes.

2. **Is there a reason to prefer plural class names (e.g. a system you integrate with uses them)?**  
   Yes → Use plural everywhere.  
   No → Use singular (more common in practice) everywhere.

3. **Do you want slot names to show they're slots (hasMaker, makerOf)?**  
   Yes → Set a has-/-of prefix/suffix convention and use it on every slot.  
   No → No prefix (the default).

4. **Will the data go into a graph database?**  
   Yes → Nothing extra to decide: okb stores each relationship under its name in UPPER_SNAKE case (maker → MAKER, goesWellWith → GOES_WELL_WITH), the usual openCypher style, and class names become node labels in `okb export`.  
   No → Nothing to decide.

There's often no reason to prefer one option; what matters is sticking to it. Consider other systems your ontology will be exchanged with.

**Wine example:** Classes: RedWine, Winery (PascalCase, singular). Slots: tanninLevel, maker (camelCase).

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

<a id="decisionedge-or-class"></a>
## Edge property, or make the relationship its own class?

*When:* When a relationship needs extra information: a condition, a strength, a date, a source.

1. **Is the extra information a simple value about this one link (a short condition, a number, a date)?**  
   Yes → go to the next question  
   No → Make the relationship a class (e.g. a Recommendation with slots from, to, condition, audience), so it can have its own relationships.

2. **Does the qualifier need relationships of its own (to people, sources, other components), or several values that vary independently?**  
   Yes → Make it a class. Edges can only hold plain values (and a `rule` reference).  
   No → go to the next question

3. **Will you query or validate by it (e.g. 'all recommendations that apply to dense layouts')?**  
   Yes → An Enumerated edge property works if the values are a fixed list; otherwise consider a class.  
   No → Use an edge property (okb relationship property ...).

Ontology 101's frame model has no properties on relationships: the standard move there is to turn the relationship into a class (reification). Graph databases support edge properties natively, so for simple qualifiers they're the lighter choice. Record which you chose.

**Wine example:** A wine–food pairing with a strength ("excellent", "acceptable") fits an Enumerated edge property on goesWellWith. A pairing that records who recommended it, for which menu and from which source would be a Pairing class.

