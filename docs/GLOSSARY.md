# Glossary

<!-- Generated from the meta-KB (v2.4.1) by `pnpm run docs`. Don't edit by hand: change `packages/okb/meta-kb/src/*.yaml` and regenerate. -->

> **Tip:** You can read any entry in your terminal too. Run `okb explain <term>` (for example `okb explain class`) while you work.

<div class="entry-filter" data-label="Filter terms"></div>

<section class="entry">

<div class="head">

<a id="concept-abstract-class"></a>
## Abstract class

</div>

<div class="row">
<span class="label">Definition</span>

A class that cannot have any direct instances; only its subclasses can.

</div>

<div class="row">
<span class="label">In plain words</span>

A grouping class that exists to organize other classes. Nothing is ever 'just' one of these without also belonging to a more specific subclass.

</div>

<div class="row">
<span class="label">Example</span>

In Ontology 101, every wine-region class is abstract.

</div>

<div class="row muted">
<span class="label">In okb</span>

Class property `abstract: true` (`okb class add ... --abstract`).

</div>

<details class="sources"><summary>Source</summary>

> “Protégé-2000 allows users to specify some classes as Abstract, signifying that the class cannot have any direct instances.”  
> — Ontology 101 §4.6 An instance or a class?, p.18

</details>

</section>

<section class="entry">

<div class="head">

<a id="concept-authored-rule"></a>
## Authored rule

</div>

<div class="row">
<span class="label">Definition</span>

A Rule written by the ontology's owner rather than extracted from a document (`authored: true`, `extracted: false`). Every rule needs provenance, authored or extracted: an authored rule cites its sentence in an owner-written file registered as a Source, and goes through the same verification.

</div>

<div class="row">
<span class="label">In plain words</span>

Sometimes the owner knows a principle the documentation never states in one place. Write it down in a file, register the file as a Source, and cite the sentence. It then has the same quote and check trail as any other rule. Being authored is a label, not an exemption.

</div>

<div class="row">
<span class="label">Example</span>

'Interactive components MUST support keyboard navigation in their operable conditions' cited from principles.md.

</div>

<div class="row">
<span class="label">Also called</span>

owner-written rule

</div>

<div class="row muted">
<span class="label">In okb</span>

`okb rule add --authored --cites <quote id> ...`. Shown in `okb rule list` and `okb show`; exported as `authored` on the OkbRule node. prov-cites-quote and prov-verified apply to it unchanged.

</div>

<div class="row muted">
<span class="label">Origin</span>

A toolkit concept, not from the sources.

</div>

</section>

<section class="entry">

<div class="head">

<a id="concept-cardinality"></a>
## Cardinality

</div>

<div class="row">
<span class="label">Definition</span>

How many values a slot can have: single (at most one) or multiple, optionally with an explicit minimum and maximum.

</div>

<div class="row">
<span class="label">In plain words</span>

'Exactly one', 'zero or one', 'at least one', or 'any number'. Minimum 1 means the field is required. Maximum 0 on a subclass means 'this subclass never has this field'.

</div>

<div class="row">
<span class="label">Example</span>

A wine has one body (single). A winery produces many wines (multiple). grape has minimum 1, because every wine is made of at least one grape.

</div>

<div class="row muted">
<span class="label">In okb</span>

Slot.cardinality ('single' | 'multiple'), Slot.minCardinality, Slot.maxCardinality. A class can override them in facetOverrides.

</div>

<details class="sources"><summary>Sources (4)</summary>

> “Slot cardinality defines how many values a slot can have. Some systems distinguish only between single cardinality (allowing at most one value) and multiple cardinality (allowing any number of values).”  
> — Ontology 101 §3 Step 6, Slot cardinality, p.9

> “Minimum cardinality of N means that a slot must have at least N values.”  
> — Ontology 101 §3 Step 6, Slot cardinality, p.9

> “Maximum cardinality of M means that a slot can have at most M values.”  
> — Ontology 101 §3 Step 6, Slot cardinality, p.9

> “Sometimes it may be useful to set the maximum cardinality to 0. This setting would indicate that the slot cannot have any values for a particular subclass.”  
> — Ontology 101 §3 Step 6, Slot cardinality, p.9

</details>

</section>

<section class="entry">

<div class="head">

<a id="concept-class"></a>
## Class

</div>

<div class="row">
<span class="label">Definition</span>

A description of a concept in the domain. A class represents the set of all things of that kind; classes are the focus of most ontologies.

</div>

<div class="row">
<span class="label">In plain words</span>

A kind of thing, like 'Wine' or 'Winery'. It's the category, not any particular one. Classes are usually nouns that name things with an independent existence.

</div>

<div class="row">
<span class="label">Example</span>

The class Wine represents all wines. Bordeaux is a class of the more specific Bordeaux wines.

</div>

<div class="row">
<span class="label">Also called</span>

concept, type, category

</div>

<div class="row muted">
<span class="label">In okb</span>

A node of type Class, created with `okb class add`.

</div>

<details class="sources"><summary>Sources (2)</summary>

> “Classes are the focus of most ontologies. Classes describe concepts in the domain.”  
> — Ontology 101 §2 What is in an ontology?, p.3

> “From the list created in Step 3, we select the terms that describe objects having independent existence rather than terms that describe these objects.”  
> — Ontology 101 §3 Step 4. Define the classes and the class hierarchy, p.7

</details>

</section>

<section class="entry">

<div class="head">

<a id="concept-class-hierarchy"></a>
## Class hierarchy (taxonomy)

</div>

<div class="row">
<span class="label">Definition</span>

The classes arranged by subclass–superclass (is-a) relations.

</div>

<div class="row">
<span class="label">In plain words</span>

The family tree of your classes, from general at the top to specific at the bottom.

</div>

<div class="row">
<span class="label">Example</span>

Wine → Red Wine → Bordeaux → Médoc → Pauillac.

</div>

<div class="row muted">
<span class="label">In okb</span>

`okb tree` prints it; `okb diagram` draws it.

</div>

<details class="sources"><summary>Sources (2)</summary>

> “In practical terms, developing an ontology includes: defining classes in the ontology, arranging the classes in a taxonomic (subclass–superclass) hierarchy, defining slots and describing allowed values for these slots, filling in the values for slots for instances.”  
> — Ontology 101 §2 What is in an ontology?, p.3

> “We organize the classes into a hierarchical taxonomy by asking if by being an instance of one class, the object will necessarily (i.e., by definition) be an instance of some other class.”  
> — Ontology 101 §3 Step 4. Define the classes and the class hierarchy, p.8

</details>

</section>

<section class="entry">

<div class="head">

<a id="concept-competency-question"></a>
## Competency question

</div>

<div class="row">
<span class="label">Definition</span>

A question the knowledge base built on the ontology should be able to answer. Together they sketch the scope, and later serve as the litmus test for whether the ontology contains enough information.

</div>

<div class="row">
<span class="label">In plain words</span>

Before building anything, write down the actual questions you want answered. They tell you what to include, what to leave out, and when you're done.

</div>

<div class="row">
<span class="label">Example</span>

'Does Cabernet Sauvignon go well with seafood?' 'What is the best choice of wine for grilled meat?'

</div>

<div class="row muted">
<span class="label">In okb</span>

CompetencyQuestion nodes (`okb cq add`). NEEDS edges link each question to the classes and slots that answer it.

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

<a id="concept-conceptualization"></a>
## Conceptualization

</div>

<div class="row">
<span class="label">Definition</span>

An abstract, simplified view of the world that we wish to represent for some purpose.

</div>

<div class="row">
<span class="label">In plain words</span>

The picture of the domain in your head: which things you think matter and how you think they fit together. The ontology is you writing that picture down explicitly.

</div>

<div class="row">
<span class="label">Example</span>

A sommelier and a wine-label printer have different conceptualizations of wine. One cares about pairings and the other about label sizes.

</div>

<div class="row muted">
<span class="label">In okb</span>

Step 1 (scope) is where you make your conceptualization explicit.

</div>

<details class="sources"><summary>Source</summary>

> “A conceptualization is an abstract, simplified view of the world that we wish to represent for some purpose.”  
> — Gruber 1993 §1 Introduction, p.2

</details>

</section>

<section class="entry">

<div class="head">

<a id="concept-default-value"></a>
## Default value

</div>

<div class="row">
<span class="label">Definition</span>

A value filled in automatically for new instances because it is the same for most of them; it can be changed to any value the facets allow and adds no restriction to the model.

</div>

<div class="row">
<span class="label">In plain words</span>

A starting suggestion that you can override.

</div>

<div class="row">
<span class="label">Example</span>

If most wines you describe are full-bodied, body defaults to full.

</div>

<div class="row muted">
<span class="label">In okb</span>

Slot.default, or a per-class default in Class.defaults.

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

<a id="concept-design-decision"></a>
## Design decision (record)

</div>

<div class="row">
<span class="label">Definition</span>

A written note of a modeling choice and the reason for it, for people who reuse the ontology without knowing the application it was designed for.

</div>

<div class="row">
<span class="label">In plain words</span>

When you deliberately leave something out, or pick between two reasonable options, write one sentence on what you chose and why. Future readers, including you in six months, will need it. (Ontology 101 asks for this for scope decisions; the toolkit suggests it for any choice a reader wouldn't expect.)

</div>

<div class="row">
<span class="label">Example</span>

'Experimenter is NOT modeled as a subclass of Biological Organism, because we never run experiments on experimenters.'

</div>

<div class="row muted">
<span class="label">In okb</span>

DesignDecision nodes with ABOUT edges (`okb decision add`).

</div>

<details class="sources"><summary>Source</summary>

> “However, we should record such design decision in the documentation for the benefit of the users who will be looking at this ontology and who may not be aware of the application we had in mind.”  
> — Ontology 101 §4.7 Limiting the scope, p.20

</details>

</section>

<section class="entry">

<div class="head">

<a id="concept-direct-subclass"></a>
## Direct subclass

</div>

<div class="row">
<span class="label">Definition</span>

The closest subclass of a class: there are no classes between it and the parent in the hierarchy.

</div>

<div class="row">
<span class="label">In plain words</span>

Its immediate child, as opposed to a grandchild.

</div>

<div class="row">
<span class="label">Example</span>

Chardonnay is a direct subclass of White Wine and an indirect subclass of Wine.

</div>

<div class="row muted">
<span class="label">In okb</span>

An IS_A edge you actually wrote. Indirect subclasses are worked out automatically.

</div>

<details class="sources"><summary>Source</summary>

> “A direct subclass is the “closest” subclass of the class: there are no classes between a class and its direct subclass in a hierarchy.”  
> — Ontology 101 §4.1 Ensuring that the class hierarchy is correct, p.13

</details>

</section>

<section class="entry">

<div class="head">

<a id="concept-disjoint"></a>
## Disjoint classes

</div>

<div class="row">
<span class="label">Definition</span>

Classes that cannot have any instances in common. Declaring them lets a system catch a class or instance placed under both.

</div>

<div class="row">
<span class="label">In plain words</span>

'Nothing can be both.' Declaring it lets okb catch mistakes like a wine that is both red and white.

</div>

<div class="row">
<span class="label">Example</span>

Red Wine and White Wine are disjoint. Dessert Wine and White Wine are not (a sweet Riesling is both).

</div>

<div class="row muted">
<span class="label">In okb</span>

A DISJOINT_WITH edge (`okb class disjoint RedWine WhiteWine RoseWine`).

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

<a id="concept-domain"></a>
## Domain (of a slot)

</div>

<div class="row">
<span class="label">Definition</span>

The classes to which a slot is attached, i.e. the classes whose property the slot describes.

</div>

<div class="row">
<span class="label">In plain words</span>

Which kinds of things have this field.

</div>

<div class="row">
<span class="label">Example</span>

Winery is the domain of produces.

</div>

<div class="row muted">
<span class="label">In okb</span>

HAS_SLOT edges from each domain class to the slot.

</div>

<details class="sources"><summary>Source</summary>

> “The classes to which a slot is attached or a classes which property a slot describes, are called the domain of the slot.”  
> — Ontology 101 §3 Step 6, Domain and range of a slot, p.10

</details>

</section>

<section class="entry">

<div class="head">

<a id="concept-edge-property"></a>
## Edge property (relationship property)

</div>

<div class="row">
<span class="label">Definition</span>

A property stored on one relationship edge rather than on either end: a fact about the link itself, such as the condition under which one component is preferred over another. Declared once per relationship (name, value type, allowed values, required) and checked like a slot facet. An edge may also carry a `rule` reference to the Rule node whose quote justifies it.

</div>

<div class="row">
<span class="label">In plain words</span>

Some facts belong to the connection, not to either thing it connects. 'Use Radio instead of Segmented Control *when there are 2 to 7 options*': the condition isn't a property of Radio or of Segmented Control, it's a property of that recommendation.

</div>

<div class="row">
<span class="label">Example</span>

(Radio)-[:PREFERRED_OVER {condition: "2 to 7 options", rule: "rule.use-radio-for-2-7-options"}]->(SegmentedControl)

</div>

<div class="row">
<span class="label">Also called</span>

relationship property, link property, qualifier

</div>

<div class="row muted">
<span class="label">In okb</span>

`okb relationship property preferredOver condition --type String --required`, then `okb link Radio preferredOver SegmentedControl condition="2 to 7 options" --rule <rule id>`. The frame model in Ontology 101 has no equivalent; see decision.edge-or-class for when a qualifier should become its own class instead.

</div>

<div class="row muted">
<span class="label">Origin</span>

A toolkit concept, not from the sources.

</div>

</section>

<section class="entry">

<div class="head">

<a id="concept-facet"></a>
## Facet

</div>

<div class="row">
<span class="label">Definition</span>

A restriction on a slot: its value type, allowed values, number of values (cardinality), and other features of the values it can take.

</div>

<div class="row">
<span class="label">In plain words</span>

The rules for filling in a field: what kind of value goes in it, which values are allowed, and how many.

</div>

<div class="row">
<span class="label">Example</span>

body: value type Enumerated, allowed values {light, medium, full}, cardinality single.

</div>

<div class="row">
<span class="label">Also called</span>

role restriction, slot constraint

</div>

<div class="row muted">
<span class="label">In okb</span>

Properties on the Slot node: valueType, allowedValues, cardinality, minCardinality, maxCardinality, default.

</div>

<details class="sources"><summary>Sources (2)</summary>

> “Slots can have different facets describing the value type, allowed values, the number of the values (cardinality), and other features of the values the slot can take.”  
> — Ontology 101 §3 Step 6. Define the facets of the slots, p.9

> “an ontology is a formal explicit description of concepts in a domain of discourse (classes (sometimes called concepts)), properties of each concept describing various features and attributes of the concept (slots (sometimes called roles or properties)), and restrictions on slots (facets (sometimes called role restrictions)).”  
> — Ontology 101 §2 What is in an ontology?, p.3

</details>

</section>

<section class="entry">

<div class="head">

<a id="concept-facet-override"></a>
## Facet override (restriction on a subclass)

</div>

<div class="row">
<span class="label">Definition</span>

A subclass restricting an inherited slot's facets more tightly, such as fewer allowed values or a different maximum cardinality.

</div>

<div class="row">
<span class="label">In plain words</span>

The subclass inherits the field but tightens its rules.

</div>

<div class="row">
<span class="label">Example</span>

Single-varietal wines restrict grape to maximum cardinality 1.

</div>

<div class="row muted">
<span class="label">In okb</span>

Class.facetOverrides: {&lt;slot id>: {allowedValues | minCardinality | maxCardinality | range}}.

</div>

<details class="sources"><summary>Sources (2)</summary>

> “In practical terms, each subclass should either have new slots added to it, or have new slot values defined, or override some facets for the inherited slots.”  
> — Ontology 101 §4.4 When to introduce a new class (or not), p.16

> “Sometimes it may be useful to set the maximum cardinality to 0. This setting would indicate that the slot cannot have any values for a particular subclass.”  
> — Ontology 101 §3 Step 6, Slot cardinality, p.9

</details>

</section>

<section class="entry">

<div class="head">

<a id="concept-fixed-value"></a>
## Fixed (class-level) slot value

</div>

<div class="row">
<span class="label">Definition</span>

A slot value stated for a class that all of its subclasses and instances have and cannot change.

</div>

<div class="row">
<span class="label">In plain words</span>

A fact about the whole class, not a starting suggestion. Every Dessert Wine is sweet, full stop.

</div>

<div class="row">
<span class="label">Example</span>

sugar = SWEET for Dessert Wine.

</div>

<div class="row muted">
<span class="label">In okb</span>

Class.fixedValues for property values; for relationships, an edge of the relationship's type from the class node, e.g. (RedWine)-[:GOES_WELL_WITH]->(RedMeat) (`okb class fix DessertWine sugar=sweet`).

</div>

<details class="sources"><summary>Source</summary>

> “Slot values cannot be changed. For example, we can say that the slot sugar has value SWEET for the Dessert wine class. Then all the subclasses and instances of the Dessert wine class will have the SWEET value for the slot sugar. This value cannot be changed in any of the subclasses or instances of the class.”  
> — Ontology 101 §5.2 Default values, p.21

</details>

</section>

<section class="entry">

<div class="head">

<a id="concept-rule-fulfills"></a>
## Fulfills (fact to Rule)

</div>

<div class="row">
<span class="label">Definition</span>

An edge from a descriptive fact (an Instance, such as a Behavior) to the Rule it meets. Many facts may fulfill one rule, because there is often more than one way to meet it. Read backwards it is 'is fulfilled by', not 'requires'. Stored in one direction.

</div>

<div class="row">
<span class="label">In plain words</span>

A rule says what's needed; a fact says what one implementation does. FULFILLS connects the two, so you can ask 'how does Button meet the keyboard rule?' or 'which rules does nothing fulfill yet?'.

</div>

<div class="row">
<span class="label">Example</span>

(Button activates on Enter and Space)-[:FULFILLS]->(Interactive components support keyboard navigation)

</div>

<div class="row">
<span class="label">Also called</span>

FULFILLS, meets, satisfies

</div>

<div class="row muted">
<span class="label">In okb</span>

`okb fulfills <instance> <rule>`.

</div>

<div class="row muted">
<span class="label">Origin</span>

A toolkit concept, not from the sources.

</div>

</section>

<section class="entry">

<div class="head">

<a id="concept-instance"></a>
## Instance

</div>

<div class="row">
<span class="label">Definition</span>

An individual member of a class, and the most specific kind of concept represented in a knowledge base.

</div>

<div class="row">
<span class="label">In plain words</span>

One specific, real thing, like this particular wine. An instance belongs to a class, but nothing can be a 'kind of' an instance.

</div>

<div class="row">
<span class="label">Example</span>

Château Morgon Beaujolais is an instance of the class Beaujolais.

</div>

<div class="row">
<span class="label">Also called</span>

individual

</div>

<div class="row muted">
<span class="label">In okb</span>

A node of type Instance with an INSTANCE_OF edge to its class. Created with `okb instance add`.

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

<a id="concept-intrinsic-extrinsic"></a>
## Intrinsic vs. extrinsic property

</div>

<div class="row">
<span class="label">Definition</span>

Intrinsic properties belong to the thing itself (a wine's flavor); extrinsic properties are assigned from outside (a wine's name, the area it comes from).

</div>

<div class="row">
<span class="label">In plain words</span>

A rough test (the toolkit's, not Ontology 101's): would the property stay the same if nobody was looking? Flavor would, so it's intrinsic. A name, a location, or whether it's currently chilled is extrinsic. Extrinsic properties make poor classes because things move in and out of them.

</div>

<div class="row">
<span class="label">Example</span>

Chilled Wine should not be a class: a bottle goes in and out of the fridge. 'chilled' is a slot.

</div>

<div class="row muted">
<span class="label">In okb</span>

It matters when you decide between a class and a slot value (decision guide class-or-value).

</div>

<details class="sources"><summary>Sources (2)</summary>

> “In general, there are several types of object properties that can become slots in an ontology: “intrinsic” properties such as the flavor of a wine; “extrinsic” properties such as a wine’s name, and area it comes from; parts, if the object is structured; these can be both physical and abstract “parts” (e.g., the courses of a meal) relationships to other individuals;”  
> — Ontology 101 §3 Step 5. Define the properties of classes—slots, p.8

> “A class to which an individual instance belongs should not change often. Usually when we use extrinsic rather than intrinsic properties of concepts to differentiate among classes, instances of those classes will have to migrate often from one class to another.”  
> — Ontology 101 §4.5 A new class or a property value?, p.17

</details>

</section>

<section class="entry">

<div class="head">

<a id="concept-inverse-slots"></a>
## Inverse slots

</div>

<div class="row">
<span class="label">Definition</span>

Two slots describing the same relationship from opposite directions. Storing both is redundant, but convenient for entering data, and a tool can fill in the inverse automatically to keep them consistent.

</div>

<div class="row">
<span class="label">In plain words</span>

'Wine → maker → Winery' and 'Winery → produces → Wine' are the same fact seen from each end. Declare them as inverses and okb keeps the two sides in sync.

</div>

<div class="row">
<span class="label">Example</span>

maker (on Wine) and produces (on Winery).

</div>

<div class="row muted">
<span class="label">In okb</span>

An INVERSE_OF edge between the two slots (`okb relationship inverse maker produces`). Each fact is stored once, as a MAKER edge from wine to winery; `produces` reads those edges backwards. In a graph every edge can be followed from either end, so storing both directions would duplicate data.

</div>

<details class="sources"><summary>Sources (2)</summary>

> “Storing the information “in both directions” is redundant. When we know that a wine is produced by a winery, an application using the knowledge base can always infer the value for the inverse relation that the winery produces the wine. However, from the knowledge-acquisition perspective it is convenient to have both pieces of information explicitly available.”  
> — Ontology 101 §5.1 Inverse slots, p.20

> “The knowledge-acquisition system could then automatically fill in the value for the inverse relation insuring consistency of the knowledge base.”  
> — Ontology 101 §5.1 Inverse slots, p.20

</details>

</section>

<section class="entry">

<div class="head">

<a id="concept-knowledge-base"></a>
## Knowledge base

</div>

<div class="row">
<span class="label">Definition</span>

An ontology together with a set of individual instances of classes. The line between where the ontology ends and the knowledge base begins is a fine one.

</div>

<div class="row">
<span class="label">In plain words</span>

The ontology is the empty form: which fields exist and what's allowed in them. The knowledge base is the form filled in with real things.

</div>

<div class="row">
<span class="label">Example</span>

The ontology defines the Wine class and its slots; adding 'Château Morgon Beaujolais' with body=light turns it into a knowledge base.

</div>

<div class="row muted">
<span class="label">In okb</span>

The same nodes.json/edges.json hold both. Instance nodes are the knowledge-base part.

</div>

<details class="sources"><summary>Source</summary>

> “An ontology together with a set of individual instances of classes constitutes a knowledge base. In reality, there is a fine line where the ontology ends and the knowledge base begins.”  
> — Ontology 101 §2 What is in an ontology?, p.3

</details>

</section>

<section class="entry">

<div class="head">

<a id="concept-lpg"></a>
## Labeled property graph (LPG)

</div>

<div class="row">
<span class="label">Definition</span>

The storage format used by this toolkit: nodes and edges that each carry a type label and a set of key/value properties.

</div>

<div class="row">
<span class="label">In plain words</span>

Your ontology is saved as two JSON lists, nodes and edges, which is how graph databases like Neo4j and Neptune think. Classes, slots and instances are nodes. Structural links (IS_A, HAS_SLOT...) and relationship values ((wine)-[:MAKER]->(winery)) are edges. `okb export` writes the data the way a graph database expects it: instances as nodes labeled with their classes. It's still just the storage format, so model the meaning first (see principle.knowledge-level).

</div>

<div class="row">
<span class="label">Example</span>

{"type": "Class", "id": "c.red-wine", "name": "RedWine"} and {"from": "c.red-wine", "type": "IS_A", "to": "c.wine"}

</div>

<div class="row muted">
<span class="label">In okb</span>

nodes.json and edges.json in your ontology folder. See docs/FORMAT.md.

</div>

<div class="row muted">
<span class="label">Origin</span>

A toolkit concept, not from the sources.

</div>

</section>

<section class="entry">

<div class="head">

<a id="concept-modality"></a>
## Modality (MUST / SHOULD / MAY)

</div>

<div class="row">
<span class="label">Definition</span>

How strong a rule is. The toolkit takes each rule's modality from the wording of the passage it cites: 'must', 'should always', 'it is wrong' → MUST; 'should', or a plain imperative guideline → SHOULD; 'consider', 'may', 'can', 'there may be' → MAY.

</div>

<div class="row">
<span class="label">In plain words</span>

MUST findings are errors to fix. SHOULD findings are warnings: fix them or record why not. MAY findings are hints worth a look.

</div>

<div class="row">
<span class="label">Example</span>

'Slots with value type Instance must also define a list of allowed classes' → MUST. 'If a class has only one direct subclass there may be a modeling problem' → MAY.

</div>

<div class="row muted">
<span class="label">In okb</span>

Rule.modality in the meta-KB; `okb validate` maps MUST→error, SHOULD→warning, MAY→info unless a rule states a documented override.

</div>

<div class="row muted">
<span class="label">Origin</span>

A toolkit concept, not from the sources.

</div>

</section>

<section class="entry">

<div class="head">

<a id="concept-multiple-inheritance"></a>
## Multiple inheritance

</div>

<div class="row">
<span class="label">Definition</span>

A class that is a subclass of several classes, inheriting slots and facets from all of its parents.

</div>

<div class="row">
<span class="label">In plain words</span>

A class can have more than one parent when it really is a kind of each of them. It's allowed and sometimes the right answer, so write down why you did it.

</div>

<div class="row">
<span class="label">Example</span>

Port is both a Red Wine and a Dessert Wine.

</div>

<div class="row muted">
<span class="label">In okb</span>

Two or more IS_A edges from the same class (`--parent RedWine --parent DessertWine`).

</div>

<details class="sources"><summary>Sources (2)</summary>

> “Most knowledge-representation systems allow multiple inheritance in the class hierarchy: a class can be a subclass of several classes.”  
> — Ontology 101 §4.3 Multiple inheritance, p.15

> “The Port class will inherit its slots and their facets from both its parents.”  
> — Ontology 101 §4.3 Multiple inheritance, p.16

</details>

</section>

<section class="entry">

<div class="head">

<a id="concept-naming-convention"></a>
## Naming convention

</div>

<div class="row">
<span class="label">Definition</span>

An agreed scheme for naming classes and slots (capitalization, word delimiters, singular vs. plural, prefixes/suffixes), chosen once and followed throughout.

</div>

<div class="row">
<span class="label">In plain words</span>

Decide once how names look, for example classes in PascalCase and singular, slots in camelCase, and then never deviate.

</div>

<div class="row">
<span class="label">Example</span>

Classes: RedWine, Winery. Slots: tanninLevel, maker.

</div>

<div class="row muted">
<span class="label">In okb</span>

Ontology.conventions, set with `okb convention`. okb checks every name against it.

</div>

<details class="sources"><summary>Sources (3)</summary>

> “However, we need to Define a naming convention for classes and slots and adhere to it.”  
> — Ontology 101 §6 What's in a name?, p.21

> “Defining naming conventions for concepts in an ontology and then strictly adhering to these conventions not only makes the ontology easier to understand but also helps avoid some common modeling mistakes.”  
> — Ontology 101 §6 What's in a name?, p.21

> “it is common to capitalize class names and use lower case for slot names (assuming the system is case-sensitive).”  
> — Ontology 101 §6.1 Capitalization and delimiters, p.22

</details>

</section>

<section class="entry">

<div class="head">

<a id="concept-ontology"></a>
## Ontology

</div>

<div class="row">
<span class="label">Definition</span>

A formal, explicit description of the concepts in a domain (classes), the properties of each concept (slots), and restrictions on those properties (facets). Gruber's shorter version: an explicit specification of a conceptualization.

</div>

<div class="row">
<span class="label">In plain words</span>

A shared, precise vocabulary for one subject: what kinds of things exist, how they relate, and which statements about them make sense. It's written down so that people and software use the words the same way.

</div>

<div class="row">
<span class="label">Example</span>

The wine ontology says there are Wines, Wineries and Grapes; that a Red Wine is a kind of Wine; that every Wine has a body (light, medium or full) and a maker that is a Winery.

</div>

<div class="row muted">
<span class="label">In okb</span>

Your Class, Slot and CompetencyQuestion nodes plus the Ontology node that records scope and conventions.

</div>

<details class="sources"><summary>Sources (2)</summary>

> “an ontology is a formal explicit description of concepts in a domain of discourse (classes (sometimes called concepts)), properties of each concept describing various features and attributes of the concept (slots (sometimes called roles or properties)), and restrictions on slots (facets (sometimes called role restrictions)).”  
> — Ontology 101 §2 What is in an ontology?, p.3

> “An ontology is an explicit specification of a conceptualization.”  
> — Gruber 1993 §1 Introduction, p.2

</details>

</section>

<section class="entry">

<div class="head">

<a id="concept-prescriptive-vs-descriptive"></a>
## Prescriptive vs descriptive statements (Rule vs fact)

</div>

<div class="row">
<span class="label">Definition</span>

A prescriptive statement says what any implementation must, should or may do; it is a Rule, with a modality. A descriptive statement says what one implementation does; it is an ordinary Instance of a domain class (for example a Behavior), with no modality. A descriptive fact can meet a prescriptive rule, and the FULFILLS edge records that.

</div>

<div class="row">
<span class="label">In plain words</span>

'Interactive components MUST support keyboard navigation' tells you what is required, of everything. 'Button handles Enter and Space' tells you what one component does. Keep them apart: the first is a Rule, the second is a fact about Button. Then you can ask which facts meet which rules.

</div>

<div class="row">
<span class="label">Example</span>

(Rule: Interactive components MUST support keyboard navigation) &lt;-[:FULFILLS]- (Behavior: Button activates on Enter and Space)

</div>

<div class="row">
<span class="label">Also called</span>

requirement vs behavior, rule vs behavior

</div>

<div class="row muted">
<span class="label">In okb</span>

Rules: `okb rule add`. Descriptive facts: `okb instance add --of <your Behavior class>`. Link them with `okb fulfills <instance> <rule>`.

</div>

<div class="row muted">
<span class="label">Origin</span>

A toolkit concept, not from the sources.

</div>

</section>

<section class="entry">

<div class="head">

<a id="concept-rule-qualifier"></a>
## Qualifier values on a Rule

</div>

<div class="row">
<span class="label">Definition</span>

Slot values stored on a Rule (`Rule.values{slotId: value}`) that say when or for whom it applies, such as the state of the governed node (condition) or the input device (inputModality). The slots are defined by the ontology and declared to apply to Rules (`appliesToRules`), so every rule can carry them and nothing else can; no class is involved. Values are validated like instance slot values (allowed values, cardinality). Rules have no inheritance: each rule states its own values, and a refining rule does not inherit its broader rule's.

</div>

<div class="row">
<span class="label">In plain words</span>

A rule often holds only in some situations: 'while the component is open', 'for keyboard users'. Store that as values on the rule, using slots you define, so you can filter rules by situation. The same slots can sit on descriptive facts, so a rule and the fact that fulfills it can be compared on the same terms.

</div>

<div class="row">
<span class="label">Example</span>

Rule 'Menus close on Escape' with condition = open and inputModality = keyboard.

</div>

<div class="row">
<span class="label">Also called</span>

rule qualifier, rule condition

</div>

<div class="row muted">
<span class="label">In okb</span>

`okb slot add condition --on-rules --type Enumerated --values open,disabled` (add `--on Behavior` as well to share the slot with a descriptive class), then `okb rule add ... --value condition=open`. Checked by slot-values-respect-facets; exported as properties of the OkbRule node.

</div>

<div class="row muted">
<span class="label">Origin</span>

A toolkit concept, not from the sources.

</div>

</section>

<section class="entry">

<div class="head">

<a id="concept-range"></a>
## Range (of a slot)

</div>

<div class="row">
<span class="label">Definition</span>

For slots of value type Instance, the allowed classes that values must come from.

</div>

<div class="row">
<span class="label">In plain words</span>

For a field that points at another thing, what kind of thing it's allowed to point at.

</div>

<div class="row">
<span class="label">Example</span>

Wine is the range of produces; Winery is the range of maker.

</div>

<div class="row muted">
<span class="label">In okb</span>

RANGE edges from the slot to each allowed class (`okb relationship add maker --from Wine --to Winery`).

</div>

<details class="sources"><summary>Sources (2)</summary>

> “Allowed classes for slots of type Instance are often called a range of a slot.”  
> — Ontology 101 §3 Step 6, Domain and range of a slot, p.10

> “Instance-type slots allow definition of relationships between individuals. Slots with value type Instance must also define a list of allowed classes from which the instances can come.”  
> — Ontology 101 §3 Step 6, Slot-value type, p.10

</details>

</section>

<section class="entry">

<div class="head">

<a id="concept-rule-refines"></a>
## Refines (Rule to Rule)

</div>

<div class="row">
<span class="label">Definition</span>

An edge from a rule to a broader rule that it narrows by adding a part, condition, key or case. Stored in one direction (specific → broad). The optional `adds` property names what the narrower rule adds, so a verifier can check that the detail appears in its quote. Refinement cannot loop.

</div>

<div class="row">
<span class="label">In plain words</span>

A broad rule ('interactive components support keyboard navigation') can have component rules that say how, for one component ('Menu moves focus with the arrow keys'). The component rule REFINES the broad one. It is not a subclass: it adds a requirement to the broad rule's setting.

</div>

<div class="row">
<span class="label">Example</span>

(Menu rule)-[:REFINES {adds: "arrow keys move focus"}]->(keyboard navigation rule)

</div>

<div class="row">
<span class="label">Also called</span>

REFINES, narrows

</div>

<div class="row muted">
<span class="label">In okb</span>

`okb rule refines <rule> <broader> --adds "..."` or `okb rule add ... --refines <broader> --adds "..."`.

</div>

<div class="row muted">
<span class="label">Origin</span>

A toolkit concept, not from the sources.

</div>

</section>

<section class="entry">

<div class="head">

<a id="concept-scope"></a>
## Scope

</div>

<div class="row">
<span class="label">Definition</span>

The domain an ontology covers, what it will be used for, which questions it should answer, and who will use and maintain it.

</div>

<div class="row">
<span class="label">In plain words</span>

The fence around your project. It's what lets you say 'that's out of scope' with confidence.

</div>

<div class="row">
<span class="label">Example</span>

Wine & food pairing: in scope. Winery inventory and restaurant staffing: out of scope.

</div>

<div class="row muted">
<span class="label">In okb</span>

The Ontology node: domain, purpose, users, maintainers, outOfScope (`okb scope`).

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

<a id="concept-sibling"></a>
## Siblings

</div>

<div class="row">
<span class="label">Definition</span>

Classes that are direct subclasses of the same class.

</div>

<div class="row">
<span class="label">In plain words</span>

Classes that share the same parent. Like same-level headings in a book outline, siblings should be about equally general.

</div>

<div class="row">
<span class="label">Example</span>

Red Wine, White Wine and Rosé Wine are siblings under Wine.

</div>

<div class="row muted">
<span class="label">In okb</span>

Several classes with IS_A edges to the same parent.

</div>

<details class="sources"><summary>Sources (2)</summary>

> “Siblings in the hierarchy are classes that are direct subclasses of the same class”  
> — Ontology 101 §4.2 Analyzing siblings in a class hierarchy, p.14

> “All the siblings in the hierarchy (except for the ones at the root) must be at the same level of generality. For example, White wine and Chardonnay should not be subclasses of the same class (say, Wine).”  
> — Ontology 101 §4.2 Analyzing siblings in a class hierarchy, p.14

</details>

</section>

<section class="entry">

<div class="head">

<a id="concept-slot"></a>
## Slot

</div>

<div class="row">
<span class="label">Definition</span>

A property of a class describing features and attributes of its instances. Slots can hold simple values (like a name) or relationships to other individuals (like a maker).

</div>

<div class="row">
<span class="label">In plain words</span>

A field every member of a class has. There are two kinds. A property holds a plain value, such as a name, a year or one of a fixed list. A relationship points at another thing: a wine's maker is a Winery. 'Slot' is Ontology 101's word for both. OWL calls them datatype properties and object properties, and a graph database stores them as node properties and relationship types.

</div>

<div class="row">
<span class="label">Example</span>

Wine has slots color, body, flavor, sugar, name, maker and grape.

</div>

<div class="row">
<span class="label">Also called</span>

property, relationship, role, attribute, datatype property, object property

</div>

<div class="row muted">
<span class="label">In okb</span>

A node of type Slot, attached to classes with HAS_SLOT edges. `okb property add body --on Wine ...` creates a property; `okb relationship add maker --from Wine --to Winery` creates a relationship (a Slot with value type Instance, stored as edges of type MAKER).

</div>

<details class="sources"><summary>Sources (3)</summary>

> “an ontology is a formal explicit description of concepts in a domain of discourse (classes (sometimes called concepts)), properties of each concept describing various features and attributes of the concept (slots (sometimes called roles or properties)), and restrictions on slots (facets (sometimes called role restrictions)).”  
> — Ontology 101 §2 What is in an ontology?, p.3

> “Slots describe properties of classes and instances”  
> — Ontology 101 §2 What is in an ontology?, p.3

> “In general, there are several types of object properties that can become slots in an ontology: “intrinsic” properties such as the flavor of a wine; “extrinsic” properties such as a wine’s name, and area it comes from; parts, if the object is structured; these can be both physical and abstract “parts” (e.g., the courses of a meal) relationships to other individuals;”  
> — Ontology 101 §3 Step 5. Define the properties of classes—slots, p.8

</details>

</section>

<section class="entry">

<div class="head">

<a id="concept-inheritance"></a>
## Slot inheritance

</div>

<div class="row">
<span class="label">Definition</span>

All subclasses of a class inherit the slots of that class.

</div>

<div class="row">
<span class="label">In plain words</span>

Attach a slot once, as high in the tree as it applies, and every class below gets it for free.

</div>

<div class="row">
<span class="label">Example</span>

Because body is attached to Wine, Red Wine and Pauillac have a body slot too.

</div>

<div class="row muted">
<span class="label">In okb</span>

okb works out inherited slots automatically; `okb show <Class>` lists them.

</div>

<details class="sources"><summary>Source</summary>

> “All subclasses of a class inherit the slot of that class.”  
> — Ontology 101 §3 Step 5. Define the properties of classes—slots, p.9

</details>

</section>

<section class="entry">

<div class="head">

<a id="concept-subclass"></a>
## Subclass / superclass (is-a)

</div>

<div class="row">
<span class="label">Definition</span>

Class B is a subclass of class A if every instance of B is necessarily an instance of A; B represents a concept that is a 'kind of' A.

</div>

<div class="row">
<span class="label">In plain words</span>

Ask: 'Is every B, by definition, also an A?' If yes, B is a subclass of A. If the answer is 'usually', 'is part of' or 'is related to', it is NOT a subclass.

</div>

<div class="row">
<span class="label">Example</span>

Every Pinot Noir is necessarily a Red Wine, so Pinot Noir is a subclass of Red Wine. A Wheel is part of a Car, but a Wheel is not a kind of Car.

</div>

<div class="row">
<span class="label">Also called</span>

is-a, kind-of, specialization, parent, child

</div>

<div class="row muted">
<span class="label">In okb</span>

An IS_A edge from the subclass to the superclass (`okb class add PinotNoir --parent RedWine`).

</div>

<details class="sources"><summary>Sources (3)</summary>

> “If a class A is a superclass of class B, then every instance of B is also an instance of A In other words, the class B represents a concept that is a “kind of” A.”  
> — Ontology 101 §3 Step 4. Define the classes and the class hierarchy, p.8

> “The class hierarchy represents an “is-a” relation: a class A is a subclass of B if every instance of A is also an instance of B.”  
> — Ontology 101 §4.1 Ensuring that the class hierarchy is correct, p.12

> “We organize the classes into a hierarchical taxonomy by asking if by being an instance of one class, the object will necessarily (i.e., by definition) be an instance of some other class.”  
> — Ontology 101 §3 Step 4. Define the classes and the class hierarchy, p.8

</details>

</section>

<section class="entry">

<div class="head">

<a id="concept-synonym"></a>
## Synonym

</div>

<div class="row">
<span class="label">Definition</span>

A different name for the same concept. Synonyms are not different classes; they can be recorded as a list attached to the class.

</div>

<div class="row">
<span class="label">In plain words</span>

Shrimp and Prawn are two words for one thing, so they belong in one class with the other name listed as a synonym.

</div>

<div class="row">
<span class="label">Example</span>

One class named Shrimp, with synonyms [Prawn, Crevette].

</div>

<div class="row muted">
<span class="label">In okb</span>

Class.synonyms (`okb class add Shrimp --synonym Prawn`).

</div>

<details class="sources"><summary>Sources (3)</summary>

> “the following rule should always be followed: Synonyms for the same concept do not represent different classes”  
> — Ontology 101 §4.1 Ensuring that the class hierarchy is correct, p.13

> “Many systems allow associating a list of synonyms, translations, or presentation names with a class. If a system does not allow these associations, synonyms could always be listed in the class documentation.”  
> — Ontology 101 §4.1 Ensuring that the class hierarchy is correct, p.13

> “Classes represent concepts in the domain and not the words that denote these concepts.”  
> — Ontology 101 §4.1 Ensuring that the class hierarchy is correct, p.13

</details>

</section>

<section class="entry">

<div class="head">

<a id="concept-terminological-hierarchy"></a>
## Terminological hierarchy

</div>

<div class="row">
<span class="label">Definition</span>

A reference hierarchy of terms whose classes do not have to introduce new properties; it is organized as a hierarchy for navigation and to let users pick a level of generality.

</div>

<div class="row">
<span class="label">In plain words</span>

Sometimes the hierarchy itself is the point, like a classification of diseases or product categories. In that case it's fine for subclasses to add nothing new.

</div>

<div class="row">
<span class="label">Example</span>

A classification of diseases in a medical-records ontology.

</div>

<div class="row muted">
<span class="label">In okb</span>

Class property `terminological: true` (or on the Ontology node for the whole ontology). It switches off the 'subclass adds nothing new' warning.

</div>

<details class="sources"><summary>Source</summary>

> “Classes in terminological hierarchies do not have to introduce new properties”  
> — Ontology 101 §4.4 When to introduce a new class (or not), p.16

</details>

</section>

<section class="entry">

<div class="head">

<a id="concept-development-approach"></a>
## Top-down / bottom-up / combination

</div>

<div class="row">
<span class="label">Definition</span>

Three ways to grow a class hierarchy: start from the most general concepts and specialize (top-down), start from the most specific and group them (bottom-up), or start from the most salient concepts and go both ways (combination).

</div>

<div class="row">
<span class="label">In plain words</span>

Start wherever your head naturally is. Many people find the middle easiest ('Red Wine', 'Bordeaux') and work up and down from there.

</div>

<div class="row">
<span class="label">Example</span>

Top-down: Wine → Red Wine → Syrah. Bottom-up: Pauillac, Margaux → Médoc → Bordeaux. Combination: Wine and Margaux, then Médoc in the middle.

</div>

<div class="row muted">
<span class="label">In okb</span>

Decision guide `decision.approach`.

</div>

<details class="sources"><summary>Sources (4)</summary>

> “A top-down development process starts with the definition of the most general concepts in the domain and subsequent specialization of the concepts.”  
> — Ontology 101 §3 Step 4. Define the classes and the class hierarchy, p.6

> “A bottom-up development process starts with the definition of the most specific classes, the leaves of the hierarchy, with subsequent grouping of these classes into more general concepts.”  
> — Ontology 101 §3 Step 4. Define the classes and the class hierarchy, p.7

> “A combination development process is a combination of the top-down and bottom-up approaches: We define the more salient concepts first and then generalize and specialize them appropriately.”  
> — Ontology 101 §3 Step 4. Define the classes and the class hierarchy, p.7

> “None of these three methods is inherently better than any of the others. The approach to take depends strongly on the personal view of the domain.”  
> — Ontology 101 §3 Step 4. Define the classes and the class hierarchy, p.7

</details>

</section>

<section class="entry">

<div class="head">

<a id="concept-transitivity"></a>
## Transitivity (of is-a)

</div>

<div class="row">
<span class="label">Definition</span>

The subclass relationship is transitive: if B is a subclass of A and C is a subclass of B, then C is a subclass of A.

</div>

<div class="row">
<span class="label">In plain words</span>

Kind-of relationships chain together. You only need to state the direct parent, and everything further up follows automatically.

</div>

<div class="row">
<span class="label">Example</span>

Chardonnay ⊂ White Wine ⊂ Wine, so Chardonnay is a Wine.

</div>

<div class="row muted">
<span class="label">In okb</span>

okb follows IS_A chains when it checks inheritance, disjointness and slot values. Don't add shortcut edges (see rule hier-no-redundant-isa).

</div>

<details class="sources"><summary>Source</summary>

> “A subclass relationship is transitive: If B is a subclass of A and C is a subclass of B, then C is a subclass of A”  
> — Ontology 101 §4.1 Ensuring that the class hierarchy is correct, p.13

</details>

</section>

<section class="entry">

<div class="head">

<a id="concept-value-type"></a>
## Value type

</div>

<div class="row">
<span class="label">Definition</span>

A facet describing what types of values can fill a slot: String, Number (Integer/Float), Boolean, Enumerated (a fixed list of symbols) or Instance (a relationship to another individual).

</div>

<div class="row">
<span class="label">In plain words</span>

Is it text, a number, yes/no, one of a fixed list of words, or a link to another thing?

</div>

<div class="row">
<span class="label">Example</span>

name: String; price: Float; sparkling: Boolean; flavor: Enumerated {strong, moderate, delicate}; maker: Instance of Winery.

</div>

<div class="row muted">
<span class="label">In okb</span>

Slot.valueType, one of String, Integer, Float, Number, Boolean, Enumerated, Instance.

</div>

<details class="sources"><summary>Sources (3)</summary>

> “A value-type facet describes what types of values can fill in the slot.”  
> — Ontology 101 §3 Step 6, Slot-value type, p.9

> “Enumerated slots specify a list of specific allowed values for the slot.”  
> — Ontology 101 §3 Step 6, Slot-value type, p.9

> “Instance-type slots allow definition of relationships between individuals. Slots with value type Instance must also define a list of allowed classes from which the instances can come.”  
> — Ontology 101 §3 Step 6, Slot-value type, p.10

</details>

</section>

