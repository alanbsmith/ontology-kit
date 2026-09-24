# Rules

> Generated from the meta-KB (v2.3.1) by `npm run docs`. Don't edit by hand: change `meta-kb/src/*.yaml` and regenerate.

What `okb validate` checks, and what the ontology-review skill asks about. Each rule's **modality** comes from the wording of the passage it cites (see *Modality* in the [glossary](GLOSSARY.md)):

| Modality | Severity | Meaning |
|---|---|---|
| MUST / MUST NOT | error | Fix it. A design decision can't waive it. |
| SHOULD / SHOULD NOT | warning | Fix it, or record a design decision that explains why not (`okb decision add --waives <rule>`). |
| MAY | info | A hint worth considering. |

**Basis:** *direct* = the source states the rule · *interpretive* = follows from a source definition (the gap is explained) · *operational* = a toolkit convention with no source.  
**Check:** *mechanical* = okb checks it exactly · *heuristic* = okb flags likely cases (false positives possible) · *judgment* = a person decides (the review skill asks the question shown).

| Rule | Modality | Severity | Check | Basis | From step |
|---|---|---|---|---|---|
| [`hier-is-a-means-kind-of`](#hier-is-a-means-kind-of) | MUST | error | judgment | direct | 4 |
| [`hier-no-cycles`](#hier-no-cycles) | SHOULD NOT | error | mechanical | direct | 4 |
| [`hier-no-singular-plural-pair`](#hier-no-singular-plural-pair) | MUST NOT | error | heuristic | direct | 4 |
| [`hier-no-synonym-classes`](#hier-no-synonym-classes) | MUST NOT | error | heuristic | direct | 4 |
| [`hier-siblings-same-generality`](#hier-siblings-same-generality) | MUST | error | judgment | direct | 4 |
| [`hier-no-redundant-isa`](#hier-no-redundant-isa) | SHOULD NOT | warning | mechanical | interpretive | 4 |
| [`hier-single-child`](#hier-single-child) | MAY | info | mechanical | direct | 4 |
| [`hier-too-many-children`](#hier-too-many-children) | MAY | info | mechanical | direct | 4 |
| [`hier-subclass-adds-something`](#hier-subclass-adds-something) | SHOULD | warning | heuristic | direct | 6 |
| [`hier-no-subclass-per-restriction`](#hier-no-subclass-per-restriction) | SHOULD NOT | warning | judgment | direct | 4 |
| [`hier-class-or-value`](#hier-class-or-value) | SHOULD | warning | judgment | direct | 4 |
| [`hier-stable-membership`](#hier-stable-membership) | SHOULD | warning | judgment | direct | 4 |
| [`inst-are-leaves`](#inst-are-leaves) | MUST NOT | error | mechanical | interpretive | 4 |
| [`inst-natural-hierarchy-as-classes`](#inst-natural-hierarchy-as-classes) | SHOULD | warning | judgment | direct | 4 |
| [`inst-granularity`](#inst-granularity) | SHOULD | warning | judgment | interpretive | 7 |
| [`inst-not-of-abstract`](#inst-not-of-abstract) | MUST NOT | error | mechanical | direct | 7 |
| [`slot-attach-most-general`](#slot-attach-most-general) | SHOULD | warning | mechanical | direct | 5 |
| [`slot-domain-fits-all`](#slot-domain-fits-all) | MUST | error | judgment | direct | 5 |
| [`slot-range-remove-subclass`](#slot-range-remove-subclass) | SHOULD | warning | mechanical | direct | 6 |
| [`slot-range-collapse-subclasses`](#slot-range-collapse-subclasses) | SHOULD | warning | mechanical | direct | 6 |
| [`slot-range-all-but-few`](#slot-range-all-but-few) | MAY | info | heuristic | direct | 6 |
| [`slot-range-not-too-general`](#slot-range-not-too-general) | SHOULD NOT | warning | heuristic | direct | 6 |
| [`slot-value-type-declared`](#slot-value-type-declared) | MUST | error | mechanical | operational | 5 |
| [`slot-instance-needs-range`](#slot-instance-needs-range) | MUST | error | mechanical | direct | 6 |
| [`slot-enum-needs-values`](#slot-enum-needs-values) | MUST | error | mechanical | interpretive | 6 |
| [`slot-cardinality-declared`](#slot-cardinality-declared) | SHOULD | warning | mechanical | operational | 6 |
| [`slot-cardinality-coherent`](#slot-cardinality-coherent) | MUST | error | mechanical | interpretive | 6 |
| [`slot-values-respect-facets`](#slot-values-respect-facets) | MUST | error | mechanical | interpretive | 7 |
| [`slot-value-slot-applies`](#slot-value-slot-applies) | MUST | error | mechanical | interpretive | 7 |
| [`slot-default-allowed`](#slot-default-allowed) | MUST | error | mechanical | interpretive | 6 |
| [`slot-fixed-not-overridden`](#slot-fixed-not-overridden) | MUST NOT | error | mechanical | direct | 6 |
| [`slot-inverse-consistent`](#slot-inverse-consistent) | SHOULD | warning | heuristic | interpretive | 6 |
| [`slot-edge-properties`](#slot-edge-properties) | MUST | error | mechanical | operational | 6 |
| [`disjoint-no-shared-members`](#disjoint-no-shared-members) | MUST NOT | error | mechanical | direct | 4 |
| [`disjoint-consider-siblings`](#disjoint-consider-siblings) | MAY | info | mechanical | direct | 4 |
| [`naming-convention-defined`](#naming-convention-defined) | MUST | error | mechanical | direct | 4 |
| [`naming-follow-convention`](#naming-follow-convention) | MUST | error | mechanical | direct | 4 |
| [`naming-singular-plural-consistent`](#naming-singular-plural-consistent) | SHOULD | warning | heuristic | direct | 4 |
| [`naming-no-type-words`](#naming-no-type-words) | SHOULD NOT | warning | mechanical | direct | 4 |
| [`naming-no-abbreviations`](#naming-no-abbreviations) | SHOULD NOT | info | heuristic | direct | 4 |
| [`naming-subclass-names-consistent`](#naming-subclass-names-consistent) | SHOULD | warning | mechanical | direct | 4 |
| [`naming-unique`](#naming-unique) | MUST | error | mechanical | operational | 3 |
| [`scope-defined`](#scope-defined) | SHOULD | warning | mechanical | direct | 1 |
| [`scope-competency-questions`](#scope-competency-questions) | SHOULD | warning | mechanical | operational | 1 |
| [`scope-cq-coverage`](#scope-cq-coverage) | SHOULD | warning | mechanical | interpretive | 8 |
| [`scope-no-unneeded`](#scope-no-unneeded) | SHOULD NOT | info | heuristic | direct | 8 |
| [`scope-cq-families`](#scope-cq-families) | SHOULD | warning | judgment | interpretive | 8 |
| [`doc-descriptions`](#doc-descriptions) | SHOULD | warning | mechanical | interpretive | 4 |
| [`doc-record-decisions`](#doc-record-decisions) | SHOULD | warning | judgment | interpretive | 4 |
| [`reuse-considered`](#reuse-considered) | SHOULD | warning | judgment | direct | 3 |
| [`terms-dispositioned`](#terms-dispositioned) | SHOULD | warning | mechanical | operational | 6 |
| [`reuse-recorded`](#reuse-recorded) | SHOULD | warning | mechanical | operational | 3 |
| [`struct-well-formed`](#struct-well-formed) | MUST | error | mechanical | operational | 1 |
| [`prov-verified`](#prov-verified) | MUST | error | mechanical | operational | 1 |
| [`prov-cites-quote`](#prov-cites-quote) | MUST | error | mechanical | operational | 1 |
| [`prov-quote-current`](#prov-quote-current) | MUST | error | mechanical | operational | 1 |
| [`prov-duplicate-quotes`](#prov-duplicate-quotes) | MAY | info | mechanical | operational | 1 |

## hier-is-a-means-kind-of

**MUST** · error · judgment · basis: direct · from step 4

An IS_A link from B to A must mean that every instance of B is necessarily an instance of A.

*In plain words:* Only use 'is a' for 'is a kind of'. 'Is part of', 'is made by', 'is related to' and 'is usually' are not is-a.

*Why:* This is the definition of the subclass relation; everything else (inheritance, disjointness, transitivity) depends on it holding.

*Ask yourself:* For each IS_A edge, say out loud: 'Every <child> is, by definition, a <parent>.' If you hesitate, or the honest word is 'part of' / 'has' / 'usually', it is not an is-a.

*Fix:* Replace the IS_A with a slot (e.g. partOf, madeBy) or move the class under its real parent.

> “The class hierarchy represents an “is-a” relation: a class A is a subclass of B if every instance of A is also an instance of B.”  
> — Ontology 101 §4.1 Ensuring that the class hierarchy is correct, p.12

> “If a class A is a superclass of class B, then every instance of B is also an instance of A In other words, the class B represents a concept that is a “kind of” A.”  
> — Ontology 101 §3 Step 4. Define the classes and the class hierarchy, p.8

> “Indeed, since B is a subclass of A, all B’s instances must be instances of the class A.”  
> — Ontology 101 §4.1 Ensuring that the class hierarchy is correct, p.13

> “We organize the classes into a hierarchical taxonomy by asking if by being an instance of one class, the object will necessarily (i.e., by definition) be an instance of some other class.”  
> — Ontology 101 §3 Step 4. Define the classes and the class hierarchy, p.8

## hier-no-cycles

**SHOULD NOT** · error · mechanical · basis: direct · from step 4

The class hierarchy should not contain cycles (A is a subclass of B and B is, directly or indirectly, a subclass of A).

*In plain words:* A class can't be its own ancestor. If A is a kind of B and B is a kind of A, they're the same class.

*Why:* A cycle amounts to declaring the classes equivalent: all instances of A are instances of B and vice versa.

*Severity note:* The paper says cycles 'should' be avoided because a cycle declares the classes equivalent. The checker can't tell an intended equivalence from a mistake, and okb has no equivalence construct, so a cycle is treated as an error: merge the classes and keep the other name as a synonym.

*Fix:* If they're the same concept, merge them (keep one name, add the other as a synonym). If not, remove the IS_A edge that's wrong.

> “We should avoid cycles in the class hierarchy. We say that there is a cycle in a hierarchy when some class A has a subclass B and at the same time B is a superclass of A. Creating such a cycle in a hierarchy amounts to declaring that the classes A and B are equivalent”  
> — Ontology 101 §4.1 Ensuring that the class hierarchy is correct, p.13

## hier-no-singular-plural-pair

**MUST NOT** · error · heuristic · basis: direct · from step 4

The hierarchy must not make the singular and plural versions of the same concept subclasses of one another (such as Wine as a subclass of Wines).

*In plain words:* 'Wine' is not a kind of 'Wines'. Pick singular or plural for every class name and use only that form.

*Why:* The paper calls this a common modeling mistake and says it is wrong: a single Wine is not a kind of Wines. okb reports a singular/plural pair that is NOT linked as a warning only: that's the naming-consistency concern, not this rule's.

*Fix:* Delete one of the two classes and move its children and instances to the other.

> “A common modeling mistake is to include both a singular and a plural version of the same concept in the hierarchy making the former a subclass of the latter. For example, it is wrong to define a class Wines and a class Wine as a subclass of Wines.”  
> — Ontology 101 §4.1 Ensuring that the class hierarchy is correct, p.12

## hier-no-synonym-classes

**MUST NOT** · error · heuristic · basis: direct · from step 4

Synonyms for the same concept must not be represented as different classes.

*In plain words:* Shrimp and Prawn are one class with two names, not two classes.

*Why:* Classes represent concepts, not the words for them; the paper states this rule 'should always be followed'. okb catches a class whose name matches another class's name or listed synonym; true synonyms with unrelated spellings need a human eye.

*Ask yourself:* Scan class names for pairs a domain expert would call 'the same thing'.

*Fix:* Merge the classes: keep one, add the other name to its synonyms, and move edges over.

> “the following rule should always be followed: Synonyms for the same concept do not represent different classes”  
> — Ontology 101 §4.1 Ensuring that the class hierarchy is correct, p.13

> “Classes represent concepts in the domain and not the words that denote these concepts.”  
> — Ontology 101 §4.1 Ensuring that the class hierarchy is correct, p.13

> “Many systems allow associating a list of synonyms, translations, or presentation names with a class. If a system does not allow these associations, synonyms could always be listed in the class documentation.”  
> — Ontology 101 §4.1 Ensuring that the class hierarchy is correct, p.13

## hier-siblings-same-generality

**MUST** · error · judgment · basis: direct · from step 4

All siblings in the hierarchy, except those at the root, must be at the same level of generality.

*In plain words:* Classes that share a parent should be about equally specific, like chapter headings in the same book. White Wine and Chardonnay shouldn't both sit directly under Wine.

*Why:* Siblings at mismatched generality mean the hierarchy has skipped a level; the more specific one usually belongs under the more general one.

*Ask yourself:* For each parent with 2+ children, ask: 'Is any of these a kind of another one?' and 'Would an expert put these on the same level?'

*Fix:* Move the more specific class under the more general sibling.

> “All the siblings in the hierarchy (except for the ones at the root) must be at the same level of generality. For example, White wine and Chardonnay should not be subclasses of the same class (say, Wine).”  
> — Ontology 101 §4.2 Analyzing siblings in a class hierarchy, p.14

> “The concepts at the root of the hierarchy however (which are often represented as direct subclasses of some very general class, such as Thing) represent major divisions of the domain and do not have to be similar concepts.”  
> — Ontology 101 §4.2 Analyzing siblings in a class hierarchy, p.14

## hier-no-redundant-isa

**SHOULD NOT** · warning · mechanical · basis: interpretive · from step 4

A class should not have a direct IS_A edge to an ancestor it already reaches through another parent.

*In plain words:* If Chardonnay is a White Wine, and White Wine is a Wine, don't also link Chardonnay directly to Wine. That link is already implied.

*Why:* Subclassing is transitive, so the shortcut edge adds nothing. It also makes the class a sibling of its own parent, which is exactly the mismatched-generality mistake the paper's White Wine / Chardonnay example warns about.

*Fix:* Remove the direct edge to the higher ancestor.

> “A subclass relationship is transitive: If B is a subclass of A and C is a subclass of B, then C is a subclass of A”  
> — Ontology 101 §4.1 Ensuring that the class hierarchy is correct, p.13

> “In our example, Chardonnay is a direct subclass of White wine and is not a direct subclass of Wine.”  
> — Ontology 101 §4.1 Ensuring that the class hierarchy is correct, p.13

> “All the siblings in the hierarchy (except for the ones at the root) must be at the same level of generality. For example, White wine and Chardonnay should not be subclasses of the same class (say, Wine).”  
> — Ontology 101 §4.2 Analyzing siblings in a class hierarchy, p.14

## hier-single-child

**MAY** · info · mechanical · basis: direct · from step 4

A class with only one direct subclass may indicate a modeling problem or an incomplete ontology.

*In plain words:* A parent with one child is like a bulleted list with one bullet. Either a sibling is missing, or the child isn't really different from the parent.

*Why:* If the only subclass is effectively equivalent to its parent, it adds no information; if it isn't, its siblings are probably missing.

*Ask yourself:* Is something missing next to the only child? If not, is the child really different from its parent?

*Fix:* Add the missing sibling(s), or remove the child and fold it into the parent. If neither applies, record a design decision.

> “If a class has only one direct subclass there may be a modeling problem or the ontology is not complete.”  
> — Ontology 101 §4.2 Analyzing siblings in a class hierarchy, p.14

> “There are no hard rules for the number of direct subclasses that a class should have. However, many well-structured ontologies have between two and a dozen direct subclasses.”  
> — Ontology 101 §4.2 Analyzing siblings in a class hierarchy, p.14

## hier-too-many-children

**MAY** · info · mechanical · basis: direct · from step 4

A class with more than a dozen direct subclasses may need additional intermediate categories.

*In plain words:* A long flat list of children usually hides natural groups. Look for them, but don't invent groups that don't exist in the domain.

*Why:* Many well-structured ontologies have between two and a dozen direct subclasses; but if no natural grouping exists, the paper says to leave the list as it is.

*Ask yourself:* Do domain experts group these children somehow (by color, region, size...)? If yes, add those groups as intermediate classes.

*Fix:* Add intermediate classes for natural groupings, or record a design decision that none exist.

> “If there are more than a dozen subclasses for a given class then additional intermediate categories may be necessary.”  
> — Ontology 101 §4.2 Analyzing siblings in a class hierarchy, p.14

> “However, if no natural classes exist to group concepts in the long list of siblings, there is no need to create artificial classes—just leave the classes the way they are.”  
> — Ontology 101 §4.2 Analyzing siblings in a class hierarchy, p.15

## hier-subclass-adds-something

**SHOULD** · warning · heuristic · basis: direct · from step 6

Each subclass should add something its superclass doesn't have: new slots, new slot values, overridden facets, or different relationships. Classes in terminological hierarchies, and distinctions experts commonly make, are exceptions.

*In plain words:* If you can't say anything about the subclass that isn't also true of its parent, it may not need to exist.

*Why:* The paper: we introduce a new class 'usually only when there is something that we can say about this class that we cannot say about the superclass'. okb looks for own slots, fixed values, defaults, facet overrides, being the range or value of some slot, and disjointness declarations. It skips classes marked terminological or covered by a design decision.

*Ask yourself:* What can you say about this class that you can't say about its parent? If the answer is 'experts always distinguish these', mark it terminological or record that decision.

*Fix:* Add the slot, value, restriction or relationship that makes it different; or mark it `terminological`; or merge it into its parent.

> “Subclasses of a class usually (1) have additional properties that the superclass does not have, or (2) restrictions different from those of the superclass, or (3) participate in different relationships than the superclasses”  
> — Ontology 101 §4.4 When to introduce a new class (or not), p.16

> “In practical terms, each subclass should either have new slots added to it, or have new slot values defined, or override some facets for the inherited slots.”  
> — Ontology 101 §4.4 When to introduce a new class (or not), p.16

> “Classes in terminological hierarchies do not have to introduce new properties”  
> — Ontology 101 §4.4 When to introduce a new class (or not), p.16

> “Another reason to introduce new classes without any new properties is to model concepts among which domain experts commonly make a distinction even though we may have decided not to model the distinction itself.”  
> — Ontology 101 §4.4 When to introduce a new class (or not), p.16

## hier-no-subclass-per-restriction

**SHOULD NOT** · warning · judgment · basis: direct · from step 4

Do not create a subclass for each additional restriction; strike a balance between useful organization and too many classes.

*In plain words:* Red/White/Rosé are natural classes; 'Delicate Wine', 'Moderate Wine' and 'Strong Wine' are just flavor values.

*Why:* A hierarchy with a class per restriction becomes deeply nested and hard to navigate.

*Ask yourself:* For each class created mainly to hold one value of one slot, ask whether it's really just that slot's value.

*Fix:* Replace the class with a slot value on the parent.

> “Finally, we should not create subclasses of a class for each additional restriction.”  
> — Ontology 101 §4.4 When to introduce a new class (or not), p.16

> “When defining a class hierarchy, our goal is to strike a balance between creating new classes useful for class organization and creating too many classes.”  
> — Ontology 101 §4.4 When to introduce a new class (or not), p.17

## hier-class-or-value

**SHOULD** · warning · judgment · basis: direct · from step 4

Create a new class for a distinction if objects with different values are thought of as different kinds of things, or if the distinction restricts slots in other classes; otherwise represent it as a slot value.

*In plain words:* In a wine-pairing ontology, red vs. white is a class split because it changes which foods go with the wine. In an ontology for a wine-label factory, the same color distinction is just a value.

*Why:* The decision depends on the scope: the same distinction can be a class in one ontology and a value in another.

*Ask yourself:* Use decision guide decision.class-or-value on each suspicious class/value.

*Fix:* Convert between class and slot value as the decision guide suggests, and record the decision.

> “If the concepts with different slot values become restrictions for different slots in other classes, then we should create a new class for the distinction. Otherwise, we represent the distinction in a slot value.”  
> — Ontology 101 §4.5 A new class or a property value?, p.17

> “If a distinction is important in the domain and we think of the objects with different values for the distinction as different kinds of objects, then we should create a new class for the distinction.”  
> — Ontology 101 §4.5 A new class or a property value?, p.17

> “Usually numbers, colors, locations are slot values and do not cause the creation of new classes.”  
> — Ontology 101 §4.5 A new class or a property value?, p.17

## hier-stable-membership

**SHOULD** · warning · judgment · basis: direct · from step 4

The class an individual belongs to should not change often; avoid classes defined by extrinsic properties that instances move in and out of.

*In plain words:* 'Chilled Wine' is a bad class: the same bottle would keep switching classes. Use a slot ('chilled: true/false').

*Why:* Classes built on extrinsic properties force instances to migrate between classes.

*Ask yourself:* Could a given instance leave this class and come back tomorrow?

*Fix:* Turn the class into a Boolean or Enumerated slot on the parent.

> “A class to which an individual instance belongs should not change often. Usually when we use extrinsic rather than intrinsic properties of concepts to differentiate among classes, instances of those classes will have to migrate often from one class to another.”  
> — Ontology 101 §4.5 A new class or a property value?, p.17

## inst-are-leaves

**MUST NOT** · error · mechanical · basis: interpretive · from step 4

Instances must not be arranged in a hierarchy: only classes can have subclasses or instances.

*In plain words:* Nothing can be a 'kind of' one particular thing. If you need children, make it a class.

*Why:* Individual instances are the most specific concepts in a knowledge base; there is no notion of a sub-instance. That nothing can be an instance of an instance follows from the same point: only classes have members.

*Fix:* Turn the instance into a class, or link it with a slot instead of IS_A/INSTANCE_OF.

> “Individual instances are the most specific concepts represented in a knowledge base.”  
> — Ontology 101 §4.6 An instance or a class?, p.18

> “Only classes can be arranged in a hierarchy—knowledge-representation systems do not have a notion of sub-instance.”  
> — Ontology 101 §4.6 An instance or a class?, p.19

## inst-natural-hierarchy-as-classes

**SHOULD** · warning · judgment · basis: direct · from step 4

If concepts form a natural hierarchy, represent them as classes, even if some have no instances of their own.

*In plain words:* Wine regions nest (France → Bourgogne → Côtes d'Or), so they are all classes, not a mix of classes and instances.

*Why:* Only classes can be arranged in a hierarchy, and the paper finds the class/instance line arbitrary when concepts nest.

*Ask yourself:* Are any instances 'inside' other instances in the domain (regions, org units, categories)?

*Fix:* Make them classes (often abstract).

> “If concepts form a natural hierarchy, then we should represent them as classes”  
> — Ontology 101 §4.6 An instance or a class?, p.18

> “we should define these terms as classes even though they may not have any instances of their own.”  
> — Ontology 101 §4.6 An instance or a class?, p.19

> “Only classes can be arranged in a hierarchy—knowledge-representation systems do not have a notion of sub-instance.”  
> — Ontology 101 §4.6 An instance or a class?, p.19

## inst-granularity

**SHOULD** · warning · judgment · basis: interpretive · from step 7

Choose the level at which classes end and instances begin from the application: the most specific things that answer your competency questions are good candidates for instances.

*In plain words:* For wine pairing, 'Sterling Vineyards Merlot' is an instance. For a cellar inventory, each bottle might be.

*Why:* The paper says the lowest level of granularity 'is in turn determined by a potential application', and calls the answers to competency questions 'very good candidates' for individuals. Those are descriptive; turning them into a SHOULD is the toolkit's reading.

*Ask yourself:* What are the most specific things that appear in answers to your competency questions? Those should be instances.

*Fix:* Move the class/instance boundary up or down and record the decision.

> “Deciding whether a particular concept is a class in an ontology or an individual instance depends on what the potential applications of the ontology are.”  
> — Ontology 101 §4.6 An instance or a class?, p.18

> “The level of granularity is in turn determined by a potential application of the ontology.”  
> — Ontology 101 §4.6 An instance or a class?, p.18

> “the most specific concepts that will constitute answers to those questions are very good candidates for individuals in the knowledge base.”  
> — Ontology 101 §4.6 An instance or a class?, p.18

## inst-not-of-abstract

**MUST NOT** · error · mechanical · basis: direct · from step 7

An abstract class must not have direct instances.

*In plain words:* Instances of an abstract class have to belong to one of its subclasses.

*Why:* Being abstract means the class cannot have any direct instances.

*Fix:* Point the instance at the right subclass, or remove `abstract` from the class.

> “Protégé-2000 allows users to specify some classes as Abstract, signifying that the class cannot have any direct instances.”  
> — Ontology 101 §4.6 An instance or a class?, p.18

## slot-attach-most-general

**SHOULD** · warning · mechanical · basis: direct · from step 5

A slot should be attached at the most general class that can have the property. Don't attach it to a class and its subclass, and if it's on every direct subclass of A, attach it to A instead.

*In plain words:* Put a slot as high up the tree as it truly applies, once. Children inherit it.

*Why:* Subclasses inherit slots, so attaching to both parent and child is redundant. Listing every child instead of the parent is the same set of classes but harder to maintain. The paper states these rules for domain lists.

*Fix:* Remove the HAS_SLOT edges on the subclasses and attach the slot to the parent.

> “A slot should be attached at the most general class that can have that property.”  
> — Ontology 101 §3 Step 5. Define the properties of classes—slots, p.9

> “All subclasses of a class inherit the slot of that class.”  
> — Ontology 101 §3 Step 5. Define the properties of classes—slots, p.9

> “If a list of classes defining a range or a domain of a slot includes a class and its subclass, remove the subclass.”  
> — Ontology 101 §3 Step 6, Domain and range of a slot, p.11

> “If a list of classes defining a range or a domain of a slot contains all subclasses of a class A, but not the class A itself, the range should contain only the class A and not the subclasses.”  
> — Ontology 101 §3 Step 6, Domain and range of a slot, p.11

## slot-domain-fits-all

**MUST** · error · judgment · basis: direct · from step 5

Every class a slot is attached to must be able to have the property the slot represents.

*In plain words:* Don't push a slot up so high that it lands on classes it doesn't describe. tanninLevel belongs on Red Wine, not Wine, because white wines aren't described by tannin.

*Why:* Too general a domain lets meaningless values in.

*Ask yourself:* For each slot, check every class it's inherited by. Does each one really have this property?

*Fix:* Move the slot down to the most general class for which it is always meaningful.

> “On the other hand, we must ensure that each class to which we attach the slot can indeed have the property that the slot represents.”  
> — Ontology 101 §3 Step 6, Domain and range of a slot, p.11

> “do not define a domain and range that is overly general: all the classes in the domain of a slot should be described by the slot and instances of all the classes in the range of a slot should be potential fillers for the slot. Do not choose an overly general class for range (i.e., one would not want to make the range THING) but one would want to choose a class that will cover all fillers”  
> — Ontology 101 §3 Step 6, Domain and range of a slot, p.10

## slot-range-remove-subclass

**SHOULD** · warning · mechanical · basis: direct · from step 6

If a slot's range includes a class and its subclass, remove the subclass.

*In plain words:* Range 'Wine, Red Wine' is just 'Wine'. Red Wine is already included.

*Why:* The subclass adds no information; the range already implicitly includes it.

*Fix:* Delete the RANGE edge to the subclass.

> “If a list of classes defining a range or a domain of a slot includes a class and its subclass, remove the subclass.”  
> — Ontology 101 §3 Step 6, Domain and range of a slot, p.11

## slot-range-collapse-subclasses

**SHOULD** · warning · mechanical · basis: direct · from step 6

If a slot's range lists all subclasses of a class A but not A itself, the range should contain only A.

*In plain words:* Range 'Red Wine, White Wine, Rosé Wine' should just be 'Wine'.

*Why:* It's the same set of allowed classes, stated once, and it stays correct when a new subclass is added.

*Fix:* Replace the RANGE edges with one edge to A.

> “If a list of classes defining a range or a domain of a slot contains all subclasses of a class A, but not the class A itself, the range should contain only the class A and not the subclasses.”  
> — Ontology 101 §3 Step 6, Domain and range of a slot, p.11

## slot-range-all-but-few

**MAY** · info · heuristic · basis: direct · from step 6

If a slot's range lists all but a few subclasses of a class A, consider whether A would be a more appropriate range.

*In plain words:* Listing nearly every child is often a sign the parent is what you meant.

*Why:* Stated by the paper as something to consider, not a requirement.

*Fix:* Consider using A as the range; if the excluded subclasses really can't be values, keep the list and record why.

> “If a list of classes defining a range or a domain of a slot contains all but a few subclasses of a class A, consider if the class A would make a more appropriate range definition.”  
> — Ontology 101 §3 Step 6, Domain and range of a slot, p.11

## slot-range-not-too-general

**SHOULD NOT** · warning · heuristic · basis: direct · from step 6

A slot's range should not be overly general (such as Thing): instances of every class in the range should be potential values.

*In plain words:* 'maker: Thing' says nothing. 'maker: Winery' says what fills it.

*Why:* An overly general range stops being informative and lets invalid values in. okb flags ranges named Thing/Entity/Object/Item and ranges that are the single root above every class.

*Fix:* Narrow the range to the most general class that covers all real values.

> “do not define a domain and range that is overly general: all the classes in the domain of a slot should be described by the slot and instances of all the classes in the range of a slot should be potential fillers for the slot. Do not choose an overly general class for range (i.e., one would not want to make the range THING) but one would want to choose a class that will cover all fillers”  
> — Ontology 101 §3 Step 6, Domain and range of a slot, p.10

> “When defining a domain or a range for a slot, find the most general classes or class that can be respectively the domain or the range for the slots.”  
> — Ontology 101 §3 Step 6, Domain and range of a slot, p.10

## slot-value-type-declared

**MUST** · error · mechanical · basis: operational · from step 5

Every slot must declare a value type (String, Integer, Float, Number, Boolean, Enumerated or Instance).

*In plain words:* okb needs to know what kind of value goes in a field before it can check your data.

*Why:* The paper describes value type as one facet a slot 'can' have; the toolkit requires it so that instance values can be checked mechanically. That makes this a toolkit rule, not the paper's.

*Fix:* `okb slot set <slot> --type <Type>`.

> “A value-type facet describes what types of values can fill in the slot.”  
> — Ontology 101 §3 Step 6, Slot-value type, p.9

## slot-instance-needs-range

**MUST** · error · mechanical · basis: direct · from step 6

Slots with value type Instance must define a list of allowed classes (a range).

*In plain words:* A field that points at other things has to say what kind of things.

*Why:* Without a range, any individual could be a value and nothing can be checked.

*Fix:* `okb slot set <slot> --range <Class>`.

> “Instance-type slots allow definition of relationships between individuals. Slots with value type Instance must also define a list of allowed classes from which the instances can come.”  
> — Ontology 101 §3 Step 6, Slot-value type, p.10

## slot-enum-needs-values

**MUST** · error · mechanical · basis: interpretive · from step 6

Enumerated slots must list their allowed values.

*In plain words:* 'One of a fixed list' needs the list.

*Why:* The paper defines enumerated slots as ones that specify a list of allowed values; an enumerated slot without the list isn't one.

*Fix:* `okb slot set <slot> --values a,b,c`.

> “Enumerated slots specify a list of specific allowed values for the slot.”  
> — Ontology 101 §3 Step 6, Slot-value type, p.9

## slot-cardinality-declared

**SHOULD** · warning · mechanical · basis: operational · from step 6

Every slot should declare its cardinality (single or multiple).

*In plain words:* Decide whether this field holds one value or many. It's easy to forget and hard to fix later.

*Why:* The paper says slots 'can' have cardinality facets and that some systems only distinguish single from multiple; it never requires every slot to declare one. The toolkit asks for it explicitly (instead of silently defaulting) because single vs. multiple is easy to forget and hard to fix once instances exist. A toolkit rule, not the paper's.

*Fix:* `okb slot set <slot> --card single` (or multiple).

> “Slots can have different facets describing the value type, allowed values, the number of the values (cardinality), and other features of the values the slot can take.”  
> — Ontology 101 §3 Step 6. Define the facets of the slots, p.9

> “Slot cardinality defines how many values a slot can have. Some systems distinguish only between single cardinality (allowing at most one value) and multiple cardinality (allowing any number of values).”  
> — Ontology 101 §3 Step 6, Slot cardinality, p.9

## slot-cardinality-coherent

**MUST** · error · mechanical · basis: interpretive · from step 6

Cardinality facets must be coherent: minimum ≤ maximum, neither negative, and single cardinality means a maximum of 1.

*In plain words:* 'At least 3 and at most 1' can never be satisfied.

*Why:* Follows from the paper's definitions of minimum, maximum and single cardinality.

*Fix:* Fix the numbers with `okb slot set`.

> “Slot cardinality defines how many values a slot can have. Some systems distinguish only between single cardinality (allowing at most one value) and multiple cardinality (allowing any number of values).”  
> — Ontology 101 §3 Step 6, Slot cardinality, p.9

> “Minimum cardinality of N means that a slot must have at least N values.”  
> — Ontology 101 §3 Step 6, Slot cardinality, p.9

> “Maximum cardinality of M means that a slot can have at most M values.”  
> — Ontology 101 §3 Step 6, Slot cardinality, p.9

## slot-values-respect-facets

**MUST** · error · mechanical · basis: interpretive · from step 7

Every slot value must satisfy the slot's facets: its value type, allowed values, range, and minimum and maximum cardinality (including overrides on the instance's classes).

*In plain words:* The data has to follow the rules you set: body must be light, medium or full; a wine needs at least one grape; a maker has to be a Winery.

*Why:* Only minimum cardinality is worded as a 'must' in the paper ('a slot must have at least N values'). The other facets are definitions of what 'can fill in the slot' (value type, allowed values, allowed classes, 'at most M values'), and subclasses may 'override some facets'. The toolkit infers that values outside those definitions are errors, because a facet nothing enforces constrains nothing.

*Fix:* Correct the value, or loosen the facet if the data shows the rule was wrong (and record why).

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

## slot-value-slot-applies

**MUST** · error · mechanical · basis: interpretive · from step 7

An instance (or class) may only have values for slots attached to its class or inherited from an ancestor.

*In plain words:* A Winery can't have a tanninLevel: that slot belongs to Red Wine and its subclasses.

*Why:* The paper attaches each property to the class it describes, and subclasses inherit it. Treating any other value as an error is the toolkit's closed-world reading of that: the paper doesn't say values for unattached slots are forbidden, but a value no class declares can't be checked or queried reliably.

*Fix:* Attach the slot to the right class, or remove the value.

> “For each property in the list, we must determine which class it describes. These properties become slots attached to classes.”  
> — Ontology 101 §3 Step 5. Define the properties of classes—slots, p.8

> “The classes to which a slot is attached or a classes which property a slot describes, are called the domain of the slot.”  
> — Ontology 101 §3 Step 6, Domain and range of a slot, p.10

> “All subclasses of a class inherit the slot of that class.”  
> — Ontology 101 §3 Step 5. Define the properties of classes—slots, p.9

## slot-default-allowed

**MUST** · error · mechanical · basis: interpretive · from step 6

A default value must be a value the slot's facets allow.

*In plain words:* The default for body can't be 'sparkly' if the allowed values are light, medium and full.

*Why:* Defaults can be changed to 'any other value that the facets will allow', so the default must itself be one of them.

*Fix:* Change the default or the allowed values.

> “If a particular slot value is the same for most instances of a class, we can define this value to be a default value for the slot.”  
> — Ontology 101 §5.2 Default values, p.21

> “We can then change the value to any other value that the facets will allow. That is, default values are there for convenience: they do not enforce any new restrictions on the model or change the model in any way.”  
> — Ontology 101 §5.2 Default values, p.21

## slot-fixed-not-overridden

**MUST NOT** · error · mechanical · basis: direct · from step 6

A fixed slot value set on a class must not be changed by any of its subclasses or instances.

*In plain words:* If every Dessert Wine is sweet, no dessert wine may say sugar=dry.

*Why:* Unlike defaults, class-level slot values cannot be changed in subclasses or instances.

*Fix:* Remove the conflicting value, or turn the fixed value into a default if it really can vary.

> “Slot values cannot be changed. For example, we can say that the slot sugar has value SWEET for the Dessert wine class. Then all the subclasses and instances of the Dessert wine class will have the SWEET value for the slot sugar. This value cannot be changed in any of the subclasses or instances of the class.”  
> — Ontology 101 §5.2 Default values, p.21

## slot-inverse-consistent

**SHOULD** · warning · heuristic · basis: interpretive · from step 6

Inverse slots should mirror each other: the range of one should match the domain of the other.

*In plain words:* If maker goes Wine → Winery, produces should go Winery → Wine.

*Why:* Inverse slots describe one relation from both ends (maker on Wine, produces on Winery). That the range of one should line up with the domain of the other is the toolkit's inference from 'one relation, two ends'; the paper doesn't state it. Values can't disagree in okb, because each fact is stored as a single edge that both slots read.

*Fix:* Adjust the range or domain of one slot so they match (`okb slot set <slot> --range ...` / `--on ...`).

> “Storing the information “in both directions” is redundant. When we know that a wine is produced by a winery, an application using the knowledge base can always infer the value for the inverse relation that the winery produces the wine. However, from the knowledge-acquisition perspective it is convenient to have both pieces of information explicitly available.”  
> — Ontology 101 §5.1 Inverse slots, p.20

> “The knowledge-acquisition system could then automatically fill in the value for the inverse relation insuring consistency of the knowledge base.”  
> — Ontology 101 §5.1 Inverse slots, p.20

> “The slot produces for the class Winery is an inverse of the slot maker for the class Wine.”  
> — Ontology 101 §5.1 Inverse slots, Figure 9, p.21

## slot-edge-properties

**MUST** · error · mechanical · basis: operational · from step 6

Properties on relationship edges must be declared on the relationship and must match their declared type, allowed values and required-ness; an edge's `rule` must point at a Rule node.

*In plain words:* If PREFERRED_OVER edges carry a condition, declare `condition` once, and every edge's condition gets checked like any other value.

*Why:* Ontology 101's frame model has no properties on relationships (a qualified relation would be reified as its own class). Labeled property graphs support them natively, so the toolkit allows them and gives them facets, so they get the same checking as slots. A toolkit rule, not the paper's. Undeclared properties are reported as warnings (usually a hand edit or a typo); wrong types, missing required values and broken rule references are errors.

*Fix:* `okb relationship property <rel> <name> --type ...` to declare; `okb link <from> <rel> <to> name=value` to set.

## disjoint-no-shared-members

**MUST NOT** · error · mechanical · basis: direct · from step 4

No class or instance may fall under two classes declared disjoint, and a class must not be declared disjoint with its own ancestor.

*In plain words:* If Red Wine and White Wine are disjoint, nothing can be under both, directly or through its parents.

*Why:* Disjoint classes cannot have any instances in common, and declaring disjointness lets the system report exactly this modeling error (the Riesling/Port example). The ancestor case is the toolkit's inference: a class disjoint with its own ancestor could never have members, which is consistent but almost certainly a mistake.

*Fix:* Move the class/instance under the right parent, or remove the disjointness if it was wrong.

> “Classes are disjoint if they cannot have any instances in common.”  
> — Ontology 101 §4.8 Disjoint subclasses, p.20

> “Specifying that classes are disjoint enables the system to validate the ontology better. If we declare the Red wine and the White wine classes to be disjoint and later create a class that is a subclass of both Riesling (a subclass of White wine) and Port (a subclass of Red wine), a system can indicate that there is a modeling error.”  
> — Ontology 101 §4.8 Disjoint subclasses, p.20

## disjoint-consider-siblings

**MAY** · info · mechanical · basis: direct · from step 4

Consider declaring sibling classes disjoint when nothing can belong to more than one of them.

*In plain words:* Can anything be both a Red Wine and a White Wine? No? Say so, and okb will catch mistakes for you.

*Why:* Specifying disjointness enables the system to validate the ontology better.

*Fix:* `okb class disjoint A B C`, or ignore it if the siblings can overlap (Dessert Wine and White Wine can).

> “Specifying that classes are disjoint enables the system to validate the ontology better. If we declare the Red wine and the White wine classes to be disjoint and later create a class that is a subclass of both Riesling (a subclass of White wine) and Port (a subclass of Red wine), a system can indicate that there is a modeling error.”  
> — Ontology 101 §4.8 Disjoint subclasses, p.20

## naming-convention-defined

**MUST** · error · mechanical · basis: direct · from step 4

Define a naming convention for classes and slots (capitalization, delimiters, singular/plural, prefixes) before creating many names.

*In plain words:* Pick how names look. okb starts you on its defaults so you can keep moving, but you need to confirm them (or choose your own) with `okb convention`.

*Why:* The paper says 'we need to' define one; strictly adhering to it makes the ontology easier to understand and avoids common mistakes.

*Fix:* `okb convention` (the defaults are PascalCase singular classes, camelCase slots).

> “However, we need to Define a naming convention for classes and slots and adhere to it.”  
> — Ontology 101 §6 What's in a name?, p.21

> “Defining naming conventions for concepts in an ontology and then strictly adhering to these conventions not only makes the ontology easier to understand but also helps avoid some common modeling mistakes.”  
> — Ontology 101 §6 What's in a name?, p.21

## naming-follow-convention

**MUST** · error · mechanical · basis: direct · from step 4

Class and slot names must follow the declared naming convention.

*In plain words:* Once you've chosen a style, every name uses it.

*Why:* A convention only helps if it is adhered to; the paper says to define one 'and adhere to it'.

*Fix:* `okb rename <old> <new>`.

> “However, we need to Define a naming convention for classes and slots and adhere to it.”  
> — Ontology 101 §6 What's in a name?, p.21

## naming-singular-plural-consistent

**SHOULD** · warning · heuristic · basis: direct · from step 4

Class names should consistently be singular or consistently plural, as declared in the convention.

*In plain words:* All classes singular (Wine, Winery) or all plural (Wines, Wineries). Don't mix.

*Why:* Neither is better (singular is more common), but the choice should be consistent throughout, and this also prevents the Wine/Wines mistake. okb guesses plurals from English endings, so check its suggestions.

*Fix:* `okb rename`, or ignore a false positive (e.g. 'Glass', 'Series').

> “No alternative is better or worse than the other (although singular for class names is used more often in practice). However, whatever the choice, it should be consistent throughout the whole ontology.”  
> — Ontology 101 §6.2 Singular or plural, p.22

> “The best way to avoid such an error is always to use either singular or plural in naming classes”  
> — Ontology 101 §4.1 Ensuring that the class hierarchy is correct, p.12

## naming-no-type-words

**SHOULD NOT** · warning · mechanical · basis: direct · from step 4

Do not add strings such as 'class', 'property' or 'slot' to concept names.

*In plain words:* Call it Wine, not WineClass; maker, not makerProperty.

*Why:* Context and the naming convention already show whether a name is a class or a slot. The paper lists this among naming things 'to consider', hence SHOULD NOT rather than MUST NOT.

*Fix:* `okb rename`.

> “Do not add strings such as “class”, “property”, “slot”, and so on to concept names.”  
> — Ontology 101 §6.4 Other naming considerations, p.23

> “Here are a few more things to consider when defining naming conventions:”  
> — Ontology 101 §6.4 Other naming considerations, p.23

## naming-no-abbreviations

**SHOULD NOT** · info · heuristic · basis: direct · from step 4

Avoid abbreviations in concept names.

*In plain words:* CabernetSauvignon, not Cab.

*Why:* Stated as 'usually a good idea'. okb only flags all-caps words and names ending in '.', so it misses most abbreviations; the review skill looks for the rest.

*Severity note:* Abbreviation detection is a guess; downgraded to info to avoid noisy warnings.

*Fix:* `okb rename`, or add the short form as a synonym.

> “It is usually a good idea to avoid abbreviations in concept names (that is, use Cabernet Sauvignon rather than Cab)”  
> — Ontology 101 §6.4 Other naming considerations, p.23

## naming-subclass-names-consistent

**SHOULD** · warning · mechanical · basis: direct · from step 4

Names of direct subclasses of a class should either all include or all omit the superclass name.

*In plain words:* RedWine and WhiteWine, or Red and White, but not RedWine and White.

*Why:* Inconsistent sibling names make the structure harder to read.

*Fix:* `okb rename` the odd one(s) out.

> “Names of direct subclasses of a class should either all include or not include the name of the superclass.”  
> — Ontology 101 §6.4 Other naming considerations, p.23

## naming-unique

**MUST** · error · mechanical · basis: operational · from step 3

Names must be unique among classes, among slots and among instances (ignoring case and delimiters).

*In plain words:* Two classes called RedWine and Red_Wine would be confusing and break lookups.

*Why:* The paper points out that systems differ in whether classes, slots and instances share a name space and whether names are case-sensitive. okb chooses one namespace per node type, case- and delimiter-insensitive, so names stay portable to whichever system you exchange them with.

*Fix:* `okb rename` one of them, or merge them if they're the same concept.

> “Does the system have the same name space for classes, slots, and instances? That is, does the system allow having a class and a slot with the same name (such as a class winery and a slot winery)? Is the system case-sensitive?”  
> — Ontology 101 §6 What's in a name?, p.22

> “It is however, important to consider other systems with which your system may interact.”  
> — Ontology 101 §6.1 Capitalization and delimiters, p.22

## scope-defined

**SHOULD** · warning · mechanical · basis: direct · from step 1

Start by defining the domain and scope: the domain covered, what the ontology is for, and who will use and maintain it.

*In plain words:* Write down what it's about, what it's for, and who it's for, before you build anything.

*Why:* The answers may change later, but at any given time they help limit the scope of the model.

*Fix:* `okb scope --domain ... --purpose ... --users ...`.

> “We suggest starting the development of an ontology by defining its domain and scope. That is, answer several basic questions: What is the domain that the ontology will cover? For what we are going to use the ontology? For what types of questions the information in the ontology should provide answers? Who will use and maintain the ontology?”  
> — Ontology 101 §3 Step 1. Determine the domain and scope, p.5

> “The answers to these questions may change during the ontology-design process, but at any given time they help limit the scope of the model.”  
> — Ontology 101 §3 Step 1. Determine the domain and scope, p.5

## scope-competency-questions

**SHOULD** · warning · mechanical · basis: operational · from step 1

An ontology should have competency questions (the toolkit suggests at least three to start).

*In plain words:* Write down a few questions your ontology must be able to answer. You'll use them to decide what to include and to test the result.

*Why:* The paper offers competency questions as 'one of the ways' to scope an ontology and as the later litmus test. The toolkit makes them expected because every later check on scope depends on them. The number three is a toolkit suggestion; the paper says the list 'does not need to be exhaustive'.

*Fix:* `okb cq add "..."`.

> “One of the ways to determine the scope of the ontology is to sketch a list of questions that a knowledge base based on the ontology should be able to answer, competency questions”  
> — Ontology 101 §3 Step 1, Competency questions, p.5

> “These questions will serve as the litmus test later: Does the ontology contain enough information to answer these types of questions?”  
> — Ontology 101 §3 Step 1, Competency questions, p.5

> “These competency questions are just a sketch and do not need to be exhaustive.”  
> — Ontology 101 §3 Step 1, Competency questions, p.5

## scope-cq-coverage

**SHOULD** · warning · mechanical · basis: interpretive · from step 8

Each competency question should be linked to the classes and slots needed to answer it.

*In plain words:* For each question, point at the parts of the ontology that answer it. A question with nothing to point at isn't answerable yet.

*Why:* Competency questions are the litmus test: does the ontology contain enough information to answer them? NEEDS links make that test explicit and checkable.

*Fix:* `okb cq link <cq> <Class|slot>...`, or add what's missing.

> “These questions will serve as the litmus test later: Does the ontology contain enough information to answer these types of questions?”  
> — Ontology 101 §3 Step 1, Competency questions, p.5

> “The classes alone will not provide enough information to answer the competency questions from Step 1.”  
> — Ontology 101 §3 Step 5. Define the properties of classes—slots, p.8

## scope-no-unneeded

**SHOULD NOT** · info · heuristic · basis: direct · from step 8

The ontology should not contain all possible information, properties and distinctions: don't specialize or generalize more than the application needs (at most one extra level each way).

*In plain words:* If no competency question needs a class or slot (or its parent or child), ask whether it belongs.

*Why:* Extra detail costs maintenance and can actively hurt (the Experimenter example). okb reports classes and slots not reachable within one level from anything a competency question needs. It only does this once questions have been linked.

*Severity note:* Whether something is 'needed' depends on how completely questions were linked, so this is a prompt, not a warning.

*Ask yourself:* For each flagged element: which question needs it? If none, add the question it serves, or remove it.

*Fix:* Link it to (or add) the question that needs it, or remove it.

> “The ontology should not contain all the possible information about the domain: you do not need to specialize (or generalize) more than you need for your application (at most one extra level each way).”  
> — Ontology 101 §4.7 Limiting the scope, p.19

> “The ontology should not contain all the possible properties of and distinctions among classes in the hierarchy.”  
> — Ontology 101 §4.7 Limiting the scope, p.19

## scope-cq-families

**SHOULD** · warning · judgment · basis: interpretive · from step 8

Treat each competency question as one example of a type of question: once it's answered, check whether the ontology should also answer its family (the same question about similar things, and related questions about the same thing), and record the ones that are out of scope.

*In plain words:* If 'Which wines go with grilled meat?' is a question, 'Which wines go with seafood?' probably is too. Answering only the exact questions you wrote down passes the test but misses the point. You don't need to list them all at the start: look at each family once the question it came from is answered.

*Why:* The paper calls competency questions 'just a sketch' that 'do not need to be exhaustive', and uses them as a litmus test for 'these types of questions'. So each one stands for a type of question, not a checklist item. Asking about the family once a question is answered, rather than up front, is the toolkit's reading. The paper also warns against including everything (scope-no-unneeded), so 'out of scope' is a fine answer, as long as it's recorded.

*Ask yourself:* For each answered competency question: what's its family (the same question about sibling classes or other instances, and the questions next to it about the same subject)? Would the ontology answer them? Is each one you don't want recorded as out of scope?

*Fix:* Add the questions you want (okb cq add, then okb cq link), and record the rest as out of scope (okb scope --out-of-scope) or in a design decision.

> “These competency questions are just a sketch and do not need to be exhaustive.”  
> — Ontology 101 §3 Step 1, Competency questions, p.5

> “These questions will serve as the litmus test later: Does the ontology contain enough information to answer these types of questions?”  
> — Ontology 101 §3 Step 1, Competency questions, p.5

## doc-descriptions

**SHOULD** · warning · mechanical · basis: interpretive · from step 4

Every class and slot should have a human-readable description of what it denotes.

*In plain words:* One sentence per class and slot saying what it means. The name alone is ambiguous.

*Why:* Gruber describes ontology definitions as associating names with human-readable text as well as formal constraints; the Ontology 101 paper relies on class documentation for synonyms and design decisions. It is framed as what a definition contains, not as a 'must', hence SHOULD.

*Fix:* `okb class set <Class> --desc "..."` / `okb slot set <slot> --desc "..."`.

> “definitions associate the names of entities in the universe of discourse (e.g., classes, relations, functions, or other objects) with human-readable text describing what the names are meant to denote, and formal axioms that constrain the interpretation and well-formed use of these terms.”  
> — Gruber 1993 §1 Introduction, p.3

> “Many systems allow associating a list of synonyms, translations, or presentation names with a class. If a system does not allow these associations, synonyms could always be listed in the class documentation.”  
> — Ontology 101 §4.1 Ensuring that the class hierarchy is correct, p.13

## doc-record-decisions

**SHOULD** · warning · judgment · basis: interpretive · from step 4

Record design decisions in the documentation, above all deliberate omissions made for your application, and (toolkit extension) other non-obvious modeling choices.

*In plain words:* Every time you choose between two reasonable options, write a one-line design decision.

*Why:* The paper's instruction is about scope-limiting choices: record that Experimenter was deliberately not made a Biological Organism, so reusers don't assume otherwise. The toolkit extends the same reasoning to any choice a reuser might not expect (multiple inheritance, terminological classes, kept warnings).

*Ask yourself:* Look for multiple inheritance, terminological classes, class-vs-value choices, things deliberately left out, and flagged findings you decided to keep. Does each have a DesignDecision?

*Fix:* `okb decision add --title ... --decision ... --why ... --about <node>`.

> “However, we should record such design decision in the documentation for the benefit of the users who will be looking at this ontology and who may not be aware of the application we had in mind.”  
> — Ontology 101 §4.7 Limiting the scope, p.20

## reuse-considered

**SHOULD** · warning · judgment · basis: direct · from step 3

Consider reusing existing ontologies or vocabularies before building from scratch.

*In plain words:* Spend a little time looking for an existing ontology, standard list or glossary you can borrow from.

*Why:* It is almost always worth considering, and reuse may be required if your system must interact with applications that already committed to a vocabulary.

*Ask yourself:* Did you look for an industry standard, internal glossary, spreadsheet or schema that already names these things? Is there a system you must interoperate with?

*Fix:* Look, then record what you found (see reuse-recorded).

> “It is almost always worth considering what someone else has done and checking if we can refine and extend existing sources for our particular domain and task.”  
> — Ontology 101 §3 Step 2. Consider reusing existing ontologies, p.5

> “Reusing existing ontologies may be a requirement if our system needs to interact with other applications that have already committed to particular ontologies or controlled vocabularies.”  
> — Ontology 101 §3 Step 2. Consider reusing existing ontologies, p.5-6

## terms-dispositioned

**SHOULD** · warning · mechanical · basis: operational · from step 6

Every term brainstormed in Step 3 should end up as a class, slot, instance, slot value or synonym, or be marked out of scope.

*In plain words:* Go back to your term list and make sure nothing was forgotten.

*Why:* The paper derives classes (Step 4) and slots (Step 5) from the Step 3 list; tracking what became of each term is the toolkit's way of making sure the list was actually used.

*Fix:* `okb term set <term> --as class|slot|instance|value|synonym|out-of-scope`.

> “From the list created in Step 3, we select the terms that describe objects having independent existence rather than terms that describe these objects.”  
> — Ontology 101 §3 Step 4. Define the classes and the class hierarchy, p.7

> “Most of the remaining terms are likely to be properties of these classes.”  
> — Ontology 101 §3 Step 5. Define the properties of classes—slots, p.8

## reuse-recorded

**SHOULD** · warning · mechanical · basis: operational · from step 3

Record the outcome of Step 2: each existing ontology considered, or that none was found.

*In plain words:* Even 'we looked and found nothing' is worth writing down.

*Why:* The paper asks you to consider reuse; recording the outcome is the toolkit's way of making that step visible to later readers and to `okb status`.

*Fix:* `okb reuse add ...` for each candidate, or `okb reuse none --why ...`.

## struct-well-formed

**MUST** · error · mechanical · basis: operational · from step 1

Files must be well-formed: unique node ids, known node and edge types, edges pointing at existing nodes of the allowed types, and required properties present.

*In plain words:* The JSON has to hang together. If you only use okb commands, this never fails; it catches hand edits.

*Why:* Every other check assumes the graph is structurally sound.

*Fix:* Fix the node/edge named in the finding (or undo the hand edit).

## prov-verified

**MUST** · error · mechanical · basis: operational · from step 1

A node extracted from a document must be verified against its quote, and anything not SUPPORTED (including corrected OVERREACH results, until a person approves them) must be resolved before the ontology is published.

*In plain words:* If the independent check said a statement claims more than its quote supports, a human decides before it ships.

*Why:* The extraction pipeline's gate (docs/EXTRACTION-PIPELINE.md): drafting and verifying are separate passes, and only SUPPORTED claims merge without review.

*Fix:* Edit the statement to match the quote, then set verification.status to SUPPORTED with a note, or delete the node.

## prov-cites-quote

**MUST** · error · mechanical · basis: operational · from step 1

Every domain Rule, and every node marked as extracted, must CITE at least one SourceLocation with a non-empty verbatim quote that is PART_OF a Source.

*In plain words:* Anything taken from a document has to point at the exact words it came from.

*Why:* Quote-first extraction: no quote, no claim.

*Fix:* Add the SourceLocation and CITES edge, or delete the unsupported node.

## prov-quote-current

**MUST** · error · mechanical · basis: operational · from step 1

Each SourceLocation quote must still appear verbatim in its source document (checked when the Source has a readable localPath).

*In plain words:* If the source document changed and the quote is gone, the citation is stale.

*Why:* Catches citations that went stale after the source was edited, which the original pipeline listed as unsolved.

*Fix:* Re-extract from the current document, or update localPath to the version you cited.

## prov-duplicate-quotes

**MAY** · info · mechanical · basis: operational · from step 1

Near-identical quotes attributed to different source documents may indicate copy-pasted documentation; check each is accurate for its own source.

*In plain words:* The same paragraph appearing in two different docs is often a copy-paste that's only right in one of them.

*Why:* A documentation-quality signal carried over from the original validator (it found a button size table pasted into unrelated component docs).

*Fix:* Confirm each quote against its own document; fix the documentation if one copy is wrong.

