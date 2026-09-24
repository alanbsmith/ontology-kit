# Glossary

> Generated from the meta-KB (v2.3.1) by `npm run docs`. Don't edit by hand: change `meta-kb/src/*.yaml` and regenerate.

Every term a beginner meets while building an ontology, in plain language first. `okb explain <term>` shows the same entry in the terminal.

[Abstract class](#abstract-class) · [Cardinality](#cardinality) · [Class](#class) · [Class hierarchy (taxonomy)](#class-hierarchy-taxonomy) · [Competency question](#competency-question) · [Conceptualization](#conceptualization) · [Default value](#default-value) · [Design decision (record)](#design-decision-record) · [Direct subclass](#direct-subclass) · [Disjoint classes](#disjoint-classes) · [Domain (of a slot)](#domain-of-a-slot) · [Edge property (relationship property)](#edge-property-relationship-property) · [Facet](#facet) · [Facet override (restriction on a subclass)](#facet-override-restriction-on-a-subclass) · [Fixed (class-level) slot value](#fixed-class-level-slot-value) · [Instance](#instance) · [Intrinsic vs. extrinsic property](#intrinsic-vs-extrinsic-property) · [Inverse slots](#inverse-slots) · [Knowledge base](#knowledge-base) · [Labeled property graph (LPG)](#labeled-property-graph-lpg) · [Modality (MUST / SHOULD / MAY)](#modality-must--should--may) · [Multiple inheritance](#multiple-inheritance) · [Naming convention](#naming-convention) · [Ontology](#ontology) · [Range (of a slot)](#range-of-a-slot) · [Scope](#scope) · [Siblings](#siblings) · [Slot](#slot) · [Slot inheritance](#slot-inheritance) · [Subclass / superclass (is-a)](#subclass--superclass-is-a) · [Synonym](#synonym) · [Terminological hierarchy](#terminological-hierarchy) · [Top-down / bottom-up / combination](#top-down--bottom-up--combination) · [Transitivity (of is-a)](#transitivity-of-is-a) · [Value type](#value-type)

## Abstract class

A grouping class that exists to organize other classes. Nothing is ever 'just' one of these without also belonging to a more specific subclass.

**Definition.** A class that cannot have any direct instances; only its subclasses can.

**Example.** In the paper, every wine-region class is abstract.

**In okb.** Class property `abstract: true` (`okb class add ... --abstract`).

> “Protégé-2000 allows users to specify some classes as Abstract, signifying that the class cannot have any direct instances.”  
> — Ontology 101 §4.6 An instance or a class?, p.18

## Cardinality

'Exactly one', 'zero or one', 'at least one', or 'any number'. Minimum 1 means the field is required. Maximum 0 on a subclass means 'this subclass never has this field'.

**Definition.** How many values a slot can have: single (at most one) or multiple, optionally with an explicit minimum and maximum.

**Example.** A wine has one body (single). A winery produces many wines (multiple). grape has minimum 1, because every wine is made of at least one grape.

**In okb.** Slot.cardinality ('single' | 'multiple'), Slot.minCardinality, Slot.maxCardinality. A class can override them in facetOverrides.

> “Slot cardinality defines how many values a slot can have. Some systems distinguish only between single cardinality (allowing at most one value) and multiple cardinality (allowing any number of values).”  
> — Ontology 101 §3 Step 6, Slot cardinality, p.9

> “Minimum cardinality of N means that a slot must have at least N values.”  
> — Ontology 101 §3 Step 6, Slot cardinality, p.9

> “Maximum cardinality of M means that a slot can have at most M values.”  
> — Ontology 101 §3 Step 6, Slot cardinality, p.9

> “Sometimes it may be useful to set the maximum cardinality to 0. This setting would indicate that the slot cannot have any values for a particular subclass.”  
> — Ontology 101 §3 Step 6, Slot cardinality, p.9

## Class

*Also called:* concept, type, category

A kind of thing, like 'Wine' or 'Winery'. It's the category, not any particular one. Classes are usually nouns that name things with an independent existence.

**Definition.** A description of a concept in the domain. A class represents the set of all things of that kind; classes are the focus of most ontologies.

**Example.** The class Wine represents all wines. Bordeaux is a class of the more specific Bordeaux wines.

**In okb.** A node of type Class, created with `okb class add`.

> “Classes are the focus of most ontologies. Classes describe concepts in the domain.”  
> — Ontology 101 §2 What is in an ontology?, p.3

> “From the list created in Step 3, we select the terms that describe objects having independent existence rather than terms that describe these objects.”  
> — Ontology 101 §3 Step 4. Define the classes and the class hierarchy, p.7

## Class hierarchy (taxonomy)

The family tree of your classes, from general at the top to specific at the bottom.

**Definition.** The classes arranged by subclass–superclass (is-a) relations.

**Example.** Wine → Red Wine → Bordeaux → Médoc → Pauillac.

**In okb.** `okb tree` prints it; `okb diagram` draws it.

> “In practical terms, developing an ontology includes: defining classes in the ontology, arranging the classes in a taxonomic (subclass–superclass) hierarchy, defining slots and describing allowed values for these slots, filling in the values for slots for instances.”  
> — Ontology 101 §2 What is in an ontology?, p.3

> “We organize the classes into a hierarchical taxonomy by asking if by being an instance of one class, the object will necessarily (i.e., by definition) be an instance of some other class.”  
> — Ontology 101 §3 Step 4. Define the classes and the class hierarchy, p.8

## Competency question

Before building anything, write down the actual questions you want answered. They tell you what to include, what to leave out, and when you're done.

**Definition.** A question the knowledge base built on the ontology should be able to answer. Together they sketch the scope, and later serve as the litmus test for whether the ontology contains enough information.

**Example.** 'Does Cabernet Sauvignon go well with seafood?' 'What is the best choice of wine for grilled meat?'

**In okb.** CompetencyQuestion nodes (`okb cq add`). NEEDS edges link each question to the classes and slots that answer it.

> “One of the ways to determine the scope of the ontology is to sketch a list of questions that a knowledge base based on the ontology should be able to answer, competency questions”  
> — Ontology 101 §3 Step 1, Competency questions, p.5

> “These questions will serve as the litmus test later: Does the ontology contain enough information to answer these types of questions?”  
> — Ontology 101 §3 Step 1, Competency questions, p.5

> “These competency questions are just a sketch and do not need to be exhaustive.”  
> — Ontology 101 §3 Step 1, Competency questions, p.5

## Conceptualization

The picture of the domain in your head: which things you think matter and how you think they fit together. The ontology is you writing that picture down explicitly.

**Definition.** An abstract, simplified view of the world that we wish to represent for some purpose.

**Example.** A sommelier and a wine-label printer have different conceptualizations of wine. One cares about pairings and the other about label sizes.

**In okb.** Step 1 (scope) is where you make your conceptualization explicit.

> “A conceptualization is an abstract, simplified view of the world that we wish to represent for some purpose.”  
> — Gruber 1993 §1 Introduction, p.2

## Default value

A starting suggestion that you can override.

**Definition.** A value filled in automatically for new instances because it is the same for most of them; it can be changed to any value the facets allow and adds no restriction to the model.

**Example.** If most wines you describe are full-bodied, body defaults to full.

**In okb.** Slot.default, or a per-class default in Class.defaults.

> “If a particular slot value is the same for most instances of a class, we can define this value to be a default value for the slot.”  
> — Ontology 101 §5.2 Default values, p.21

> “We can then change the value to any other value that the facets will allow. That is, default values are there for convenience: they do not enforce any new restrictions on the model or change the model in any way.”  
> — Ontology 101 §5.2 Default values, p.21

## Design decision (record)

When you deliberately leave something out, or pick between two reasonable options, write one sentence on what you chose and why. Future readers, including you in six months, will need it. (The paper asks for this for scope decisions; the toolkit suggests it for any choice a reader wouldn't expect.)

**Definition.** A written note of a modeling choice and the reason for it, for people who reuse the ontology without knowing the application it was designed for.

**Example.** 'Experimenter is NOT modeled as a subclass of Biological Organism, because we never run experiments on experimenters.'

**In okb.** DesignDecision nodes with ABOUT edges (`okb decision add`).

> “However, we should record such design decision in the documentation for the benefit of the users who will be looking at this ontology and who may not be aware of the application we had in mind.”  
> — Ontology 101 §4.7 Limiting the scope, p.20

## Direct subclass

Its immediate child, as opposed to a grandchild.

**Definition.** The closest subclass of a class: there are no classes between it and the parent in the hierarchy.

**Example.** Chardonnay is a direct subclass of White Wine and an indirect subclass of Wine.

**In okb.** An IS_A edge you actually wrote. Indirect subclasses are worked out automatically.

> “A direct subclass is the “closest” subclass of the class: there are no classes between a class and its direct subclass in a hierarchy.”  
> — Ontology 101 §4.1 Ensuring that the class hierarchy is correct, p.13

## Disjoint classes

'Nothing can be both.' Declaring it lets okb catch mistakes like a wine that is both red and white.

**Definition.** Classes that cannot have any instances in common. Declaring them lets a system catch a class or instance placed under both.

**Example.** Red Wine and White Wine are disjoint. Dessert Wine and White Wine are not (a sweet Riesling is both).

**In okb.** A DISJOINT_WITH edge (`okb class disjoint RedWine WhiteWine RoseWine`).

> “Classes are disjoint if they cannot have any instances in common.”  
> — Ontology 101 §4.8 Disjoint subclasses, p.20

> “Specifying that classes are disjoint enables the system to validate the ontology better. If we declare the Red wine and the White wine classes to be disjoint and later create a class that is a subclass of both Riesling (a subclass of White wine) and Port (a subclass of Red wine), a system can indicate that there is a modeling error.”  
> — Ontology 101 §4.8 Disjoint subclasses, p.20

## Domain (of a slot)

Which kinds of things have this field.

**Definition.** The classes to which a slot is attached, i.e. the classes whose property the slot describes.

**Example.** Winery is the domain of produces.

**In okb.** HAS_SLOT edges from each domain class to the slot.

> “The classes to which a slot is attached or a classes which property a slot describes, are called the domain of the slot.”  
> — Ontology 101 §3 Step 6, Domain and range of a slot, p.10

## Edge property (relationship property)

*Also called:* relationship property, link property, qualifier

Some facts belong to the connection, not to either thing it connects. 'Use Radio instead of Segmented Control *when there are 2 to 7 options*': the condition isn't a property of Radio or of Segmented Control, it's a property of that recommendation.

**Definition.** A property stored on one relationship edge rather than on either end: a fact about the link itself, such as the condition under which one component is preferred over another. Declared once per relationship (name, value type, allowed values, required) and checked like a slot facet. An edge may also carry a `rule` reference to the Rule node whose quote justifies it.

**Example.** (Radio)-[:PREFERRED_OVER {condition: "2 to 7 options", rule: "rule.use-radio-for-2-7-options"}]->(SegmentedControl)

**In okb.** `okb relationship property preferredOver condition --type String --required`, then `okb link Radio preferredOver SegmentedControl condition="2 to 7 options" --rule <rule id>`. The frame model in Ontology 101 has no equivalent; see decision.edge-or-class for when a qualifier should become its own class instead.

*A toolkit concept (not from the sources).*

## Facet

*Also called:* role restriction, slot constraint

The rules for filling in a field: what kind of value goes in it, which values are allowed, and how many.

**Definition.** A restriction on a slot: its value type, allowed values, number of values (cardinality), and other features of the values it can take.

**Example.** body: value type Enumerated, allowed values {light, medium, full}, cardinality single.

**In okb.** Properties on the Slot node: valueType, allowedValues, cardinality, minCardinality, maxCardinality, default.

> “Slots can have different facets describing the value type, allowed values, the number of the values (cardinality), and other features of the values the slot can take.”  
> — Ontology 101 §3 Step 6. Define the facets of the slots, p.9

> “an ontology is a formal explicit description of concepts in a domain of discourse (classes (sometimes called concepts)), properties of each concept describing various features and attributes of the concept (slots (sometimes called roles or properties)), and restrictions on slots (facets (sometimes called role restrictions)).”  
> — Ontology 101 §2 What is in an ontology?, p.3

## Facet override (restriction on a subclass)

The subclass inherits the field but tightens its rules.

**Definition.** A subclass restricting an inherited slot's facets more tightly, such as fewer allowed values or a different maximum cardinality.

**Example.** Single-varietal wines restrict grape to maximum cardinality 1.

**In okb.** Class.facetOverrides: {<slot id>: {allowedValues | minCardinality | maxCardinality | range}}.

> “In practical terms, each subclass should either have new slots added to it, or have new slot values defined, or override some facets for the inherited slots.”  
> — Ontology 101 §4.4 When to introduce a new class (or not), p.16

> “Sometimes it may be useful to set the maximum cardinality to 0. This setting would indicate that the slot cannot have any values for a particular subclass.”  
> — Ontology 101 §3 Step 6, Slot cardinality, p.9

## Fixed (class-level) slot value

A fact about the whole class, not a starting suggestion. Every Dessert Wine is sweet, full stop.

**Definition.** A slot value stated for a class that all of its subclasses and instances have and cannot change.

**Example.** sugar = SWEET for Dessert Wine.

**In okb.** Class.fixedValues for property values; for relationships, an edge of the relationship's type from the class node, e.g. (RedWine)-[:GOES_WELL_WITH]->(RedMeat) (`okb class fix DessertWine sugar=sweet`).

> “Slot values cannot be changed. For example, we can say that the slot sugar has value SWEET for the Dessert wine class. Then all the subclasses and instances of the Dessert wine class will have the SWEET value for the slot sugar. This value cannot be changed in any of the subclasses or instances of the class.”  
> — Ontology 101 §5.2 Default values, p.21

## Instance

*Also called:* individual

One specific, real thing, like this particular wine. An instance belongs to a class, but nothing can be a 'kind of' an instance.

**Definition.** An individual member of a class, and the most specific kind of concept represented in a knowledge base.

**Example.** Château Morgon Beaujolais is an instance of the class Beaujolais.

**In okb.** A node of type Instance with an INSTANCE_OF edge to its class. Created with `okb instance add`.

> “Individual instances are the most specific concepts represented in a knowledge base.”  
> — Ontology 101 §4.6 An instance or a class?, p.18

> “Only classes can be arranged in a hierarchy—knowledge-representation systems do not have a notion of sub-instance.”  
> — Ontology 101 §4.6 An instance or a class?, p.19

## Intrinsic vs. extrinsic property

A rough test (the toolkit's, not the paper's): would the property stay the same if nobody was looking? Flavor would, so it's intrinsic. A name, a location, or whether it's currently chilled is extrinsic. Extrinsic properties make poor classes because things move in and out of them.

**Definition.** Intrinsic properties belong to the thing itself (a wine's flavor); extrinsic properties are assigned from outside (a wine's name, the area it comes from).

**Example.** Chilled Wine should not be a class: a bottle goes in and out of the fridge. 'chilled' is a slot.

**In okb.** It matters when you decide between a class and a slot value (decision guide class-or-value).

> “In general, there are several types of object properties that can become slots in an ontology: “intrinsic” properties such as the flavor of a wine; “extrinsic” properties such as a wine’s name, and area it comes from; parts, if the object is structured; these can be both physical and abstract “parts” (e.g., the courses of a meal) relationships to other individuals;”  
> — Ontology 101 §3 Step 5. Define the properties of classes—slots, p.8

> “A class to which an individual instance belongs should not change often. Usually when we use extrinsic rather than intrinsic properties of concepts to differentiate among classes, instances of those classes will have to migrate often from one class to another.”  
> — Ontology 101 §4.5 A new class or a property value?, p.17

## Inverse slots

'Wine → maker → Winery' and 'Winery → produces → Wine' are the same fact seen from each end. Declare them as inverses and okb keeps the two sides in sync.

**Definition.** Two slots describing the same relationship from opposite directions. Storing both is redundant, but convenient for entering data, and a tool can fill in the inverse automatically to keep them consistent.

**Example.** maker (on Wine) and produces (on Winery).

**In okb.** An INVERSE_OF edge between the two slots (`okb relationship inverse maker produces`). Each fact is stored once, as a MAKER edge from wine to winery; `produces` reads those edges backwards. In a graph every edge can be followed from either end, so storing both directions would duplicate data.

> “Storing the information “in both directions” is redundant. When we know that a wine is produced by a winery, an application using the knowledge base can always infer the value for the inverse relation that the winery produces the wine. However, from the knowledge-acquisition perspective it is convenient to have both pieces of information explicitly available.”  
> — Ontology 101 §5.1 Inverse slots, p.20

> “The knowledge-acquisition system could then automatically fill in the value for the inverse relation insuring consistency of the knowledge base.”  
> — Ontology 101 §5.1 Inverse slots, p.20

## Knowledge base

The ontology is the empty form: which fields exist and what's allowed in them. The knowledge base is the form filled in with real things.

**Definition.** An ontology together with a set of individual instances of classes. The line between where the ontology ends and the knowledge base begins is a fine one.

**Example.** The ontology defines the Wine class and its slots; adding 'Château Morgon Beaujolais' with body=light turns it into a knowledge base.

**In okb.** The same nodes.json/edges.json hold both. Instance nodes are the knowledge-base part.

> “An ontology together with a set of individual instances of classes constitutes a knowledge base. In reality, there is a fine line where the ontology ends and the knowledge base begins.”  
> — Ontology 101 §2 What is in an ontology?, p.3

## Labeled property graph (LPG)

Your ontology is saved as two JSON lists, nodes and edges, which is how graph databases like Neo4j and Neptune think. Classes, slots and instances are nodes. Structural links (IS_A, HAS_SLOT...) and relationship values ((wine)-[:MAKER]->(winery)) are edges. `okb export` writes the data the way a graph database expects it: instances as nodes labeled with their classes. It's still just the storage format, so model the meaning first (see principle.knowledge-level).

**Definition.** The storage format used by this toolkit: nodes and edges that each carry a type label and a set of key/value properties.

**Example.** {"type": "Class", "id": "c.red-wine", "name": "RedWine"} and {"from": "c.red-wine", "type": "IS_A", "to": "c.wine"}

**In okb.** nodes.json and edges.json in your ontology folder. See docs/FORMAT.md.

*A toolkit concept (not from the sources).*

## Modality (MUST / SHOULD / MAY)

MUST findings are errors to fix. SHOULD findings are warnings: fix them or record why not. MAY findings are hints worth a look.

**Definition.** How strong a rule is. The toolkit takes each rule's modality from the wording of the passage it cites: 'must', 'should always', 'it is wrong' → MUST; 'should', or a plain imperative guideline → SHOULD; 'consider', 'may', 'can', 'there may be' → MAY.

**Example.** 'Slots with value type Instance must also define a list of allowed classes' → MUST. 'If a class has only one direct subclass there may be a modeling problem' → MAY.

**In okb.** Rule.modality in the meta-KB; `okb validate` maps MUST→error, SHOULD→warning, MAY→info unless a rule states a documented override.

*A toolkit concept (not from the sources).*

## Multiple inheritance

A class can have more than one parent when it really is a kind of each of them. It's allowed and sometimes the right answer, so write down why you did it.

**Definition.** A class that is a subclass of several classes, inheriting slots and facets from all of its parents.

**Example.** Port is both a Red Wine and a Dessert Wine.

**In okb.** Two or more IS_A edges from the same class (`--parent RedWine --parent DessertWine`).

> “Most knowledge-representation systems allow multiple inheritance in the class hierarchy: a class can be a subclass of several classes.”  
> — Ontology 101 §4.3 Multiple inheritance, p.15

> “The Port class will inherit its slots and their facets from both its parents.”  
> — Ontology 101 §4.3 Multiple inheritance, p.16

## Naming convention

Decide once how names look, for example classes in PascalCase and singular, slots in camelCase, and then never deviate.

**Definition.** An agreed scheme for naming classes and slots (capitalization, word delimiters, singular vs. plural, prefixes/suffixes), chosen once and followed throughout.

**Example.** Classes: RedWine, Winery. Slots: tanninLevel, maker.

**In okb.** Ontology.conventions, set with `okb convention`. okb checks every name against it.

> “However, we need to Define a naming convention for classes and slots and adhere to it.”  
> — Ontology 101 §6 What's in a name?, p.21

> “Defining naming conventions for concepts in an ontology and then strictly adhering to these conventions not only makes the ontology easier to understand but also helps avoid some common modeling mistakes.”  
> — Ontology 101 §6 What's in a name?, p.21

> “it is common to capitalize class names and use lower case for slot names (assuming the system is case-sensitive).”  
> — Ontology 101 §6.1 Capitalization and delimiters, p.22

## Ontology

A shared, precise vocabulary for one subject: what kinds of things exist, how they relate, and which statements about them make sense. It's written down so that people and software use the words the same way.

**Definition.** A formal, explicit description of the concepts in a domain (classes), the properties of each concept (slots), and restrictions on those properties (facets). Gruber's shorter version: an explicit specification of a conceptualization.

**Example.** The wine ontology says there are Wines, Wineries and Grapes; that a Red Wine is a kind of Wine; that every Wine has a body (light, medium or full) and a maker that is a Winery.

**In okb.** Your Class, Slot and CompetencyQuestion nodes plus the Ontology node that records scope and conventions.

> “an ontology is a formal explicit description of concepts in a domain of discourse (classes (sometimes called concepts)), properties of each concept describing various features and attributes of the concept (slots (sometimes called roles or properties)), and restrictions on slots (facets (sometimes called role restrictions)).”  
> — Ontology 101 §2 What is in an ontology?, p.3

> “An ontology is an explicit specification of a conceptualization.”  
> — Gruber 1993 §1 Introduction, p.2

## Range (of a slot)

For a field that points at another thing, what kind of thing it's allowed to point at.

**Definition.** For slots of value type Instance, the allowed classes that values must come from.

**Example.** Wine is the range of produces; Winery is the range of maker.

**In okb.** RANGE edges from the slot to each allowed class (`okb relationship add maker --from Wine --to Winery`).

> “Allowed classes for slots of type Instance are often called a range of a slot.”  
> — Ontology 101 §3 Step 6, Domain and range of a slot, p.10

> “Instance-type slots allow definition of relationships between individuals. Slots with value type Instance must also define a list of allowed classes from which the instances can come.”  
> — Ontology 101 §3 Step 6, Slot-value type, p.10

## Scope

The fence around your project. It's what lets you say 'that's out of scope' with confidence.

**Definition.** The domain an ontology covers, what it will be used for, which questions it should answer, and who will use and maintain it.

**Example.** Wine & food pairing: in scope. Winery inventory and restaurant staffing: out of scope.

**In okb.** The Ontology node: domain, purpose, users, maintainers, outOfScope (`okb scope`).

> “We suggest starting the development of an ontology by defining its domain and scope. That is, answer several basic questions: What is the domain that the ontology will cover? For what we are going to use the ontology? For what types of questions the information in the ontology should provide answers? Who will use and maintain the ontology?”  
> — Ontology 101 §3 Step 1. Determine the domain and scope, p.5

> “The answers to these questions may change during the ontology-design process, but at any given time they help limit the scope of the model.”  
> — Ontology 101 §3 Step 1. Determine the domain and scope, p.5

## Siblings

Classes that share the same parent. Like same-level headings in a book outline, siblings should be about equally general.

**Definition.** Classes that are direct subclasses of the same class.

**Example.** Red Wine, White Wine and Rosé Wine are siblings under Wine.

**In okb.** Several classes with IS_A edges to the same parent.

> “Siblings in the hierarchy are classes that are direct subclasses of the same class”  
> — Ontology 101 §4.2 Analyzing siblings in a class hierarchy, p.14

> “All the siblings in the hierarchy (except for the ones at the root) must be at the same level of generality. For example, White wine and Chardonnay should not be subclasses of the same class (say, Wine).”  
> — Ontology 101 §4.2 Analyzing siblings in a class hierarchy, p.14

## Slot

*Also called:* property, relationship, role, attribute, datatype property, object property

A field every member of a class has. There are two kinds. A property holds a plain value, such as a name, a year or one of a fixed list. A relationship points at another thing: a wine's maker is a Winery. 'Slot' is the paper's word for both. OWL calls them datatype properties and object properties, and a graph database stores them as node properties and relationship types.

**Definition.** A property of a class describing features and attributes of its instances. Slots can hold simple values (like a name) or relationships to other individuals (like a maker).

**Example.** Wine has slots color, body, flavor, sugar, name, maker and grape.

**In okb.** A node of type Slot, attached to classes with HAS_SLOT edges. `okb property add body --on Wine ...` creates a property; `okb relationship add maker --from Wine --to Winery` creates a relationship (a Slot with value type Instance, stored as edges of type MAKER).

> “an ontology is a formal explicit description of concepts in a domain of discourse (classes (sometimes called concepts)), properties of each concept describing various features and attributes of the concept (slots (sometimes called roles or properties)), and restrictions on slots (facets (sometimes called role restrictions)).”  
> — Ontology 101 §2 What is in an ontology?, p.3

> “Slots describe properties of classes and instances”  
> — Ontology 101 §2 What is in an ontology?, p.3

> “In general, there are several types of object properties that can become slots in an ontology: “intrinsic” properties such as the flavor of a wine; “extrinsic” properties such as a wine’s name, and area it comes from; parts, if the object is structured; these can be both physical and abstract “parts” (e.g., the courses of a meal) relationships to other individuals;”  
> — Ontology 101 §3 Step 5. Define the properties of classes—slots, p.8

## Slot inheritance

Attach a slot once, as high in the tree as it applies, and every class below gets it for free.

**Definition.** All subclasses of a class inherit the slots of that class.

**Example.** Because body is attached to Wine, Red Wine and Pauillac have a body slot too.

**In okb.** okb works out inherited slots automatically; `okb show <Class>` lists them.

> “All subclasses of a class inherit the slot of that class.”  
> — Ontology 101 §3 Step 5. Define the properties of classes—slots, p.9

## Subclass / superclass (is-a)

*Also called:* is-a, kind-of, specialization, parent, child

Ask: 'Is every B, by definition, also an A?' If yes, B is a subclass of A. If the answer is 'usually', 'is part of' or 'is related to', it is NOT a subclass.

**Definition.** Class B is a subclass of class A if every instance of B is necessarily an instance of A; B represents a concept that is a 'kind of' A.

**Example.** Every Pinot Noir is necessarily a Red Wine, so Pinot Noir is a subclass of Red Wine. A Wheel is part of a Car, but a Wheel is not a kind of Car.

**In okb.** An IS_A edge from the subclass to the superclass (`okb class add PinotNoir --parent RedWine`).

> “If a class A is a superclass of class B, then every instance of B is also an instance of A In other words, the class B represents a concept that is a “kind of” A.”  
> — Ontology 101 §3 Step 4. Define the classes and the class hierarchy, p.8

> “The class hierarchy represents an “is-a” relation: a class A is a subclass of B if every instance of A is also an instance of B.”  
> — Ontology 101 §4.1 Ensuring that the class hierarchy is correct, p.12

> “We organize the classes into a hierarchical taxonomy by asking if by being an instance of one class, the object will necessarily (i.e., by definition) be an instance of some other class.”  
> — Ontology 101 §3 Step 4. Define the classes and the class hierarchy, p.8

## Synonym

Shrimp and Prawn are two words for one thing, so they belong in one class with the other name listed as a synonym.

**Definition.** A different name for the same concept. Synonyms are not different classes; they can be recorded as a list attached to the class.

**Example.** One class named Shrimp, with synonyms [Prawn, Crevette].

**In okb.** Class.synonyms (`okb class add Shrimp --synonym Prawn`).

> “the following rule should always be followed: Synonyms for the same concept do not represent different classes”  
> — Ontology 101 §4.1 Ensuring that the class hierarchy is correct, p.13

> “Many systems allow associating a list of synonyms, translations, or presentation names with a class. If a system does not allow these associations, synonyms could always be listed in the class documentation.”  
> — Ontology 101 §4.1 Ensuring that the class hierarchy is correct, p.13

> “Classes represent concepts in the domain and not the words that denote these concepts.”  
> — Ontology 101 §4.1 Ensuring that the class hierarchy is correct, p.13

## Terminological hierarchy

Sometimes the hierarchy itself is the point, like a classification of diseases or product categories. In that case it's fine for subclasses to add nothing new.

**Definition.** A reference hierarchy of terms whose classes do not have to introduce new properties; it is organized as a hierarchy for navigation and to let users pick a level of generality.

**Example.** A classification of diseases in a medical-records ontology.

**In okb.** Class property `terminological: true` (or on the Ontology node for the whole ontology). It switches off the 'subclass adds nothing new' warning.

> “Classes in terminological hierarchies do not have to introduce new properties”  
> — Ontology 101 §4.4 When to introduce a new class (or not), p.16

## Top-down / bottom-up / combination

Start wherever your head naturally is. Many people find the middle easiest ('Red Wine', 'Bordeaux') and work up and down from there.

**Definition.** Three ways to grow a class hierarchy: start from the most general concepts and specialize (top-down), start from the most specific and group them (bottom-up), or start from the most salient concepts and go both ways (combination).

**Example.** Top-down: Wine → Red Wine → Syrah. Bottom-up: Pauillac, Margaux → Médoc → Bordeaux. Combination: Wine and Margaux, then Médoc in the middle.

**In okb.** Decision guide `decision.approach`.

> “A top-down development process starts with the definition of the most general concepts in the domain and subsequent specialization of the concepts.”  
> — Ontology 101 §3 Step 4. Define the classes and the class hierarchy, p.6

> “A bottom-up development process starts with the definition of the most specific classes, the leaves of the hierarchy, with subsequent grouping of these classes into more general concepts.”  
> — Ontology 101 §3 Step 4. Define the classes and the class hierarchy, p.7

> “A combination development process is a combination of the top-down and bottom-up approaches: We define the more salient concepts first and then generalize and specialize them appropriately.”  
> — Ontology 101 §3 Step 4. Define the classes and the class hierarchy, p.7

> “None of these three methods is inherently better than any of the others. The approach to take depends strongly on the personal view of the domain.”  
> — Ontology 101 §3 Step 4. Define the classes and the class hierarchy, p.7

## Transitivity (of is-a)

Kind-of relationships chain together. You only need to state the direct parent, and everything further up follows automatically.

**Definition.** The subclass relationship is transitive: if B is a subclass of A and C is a subclass of B, then C is a subclass of A.

**Example.** Chardonnay ⊂ White Wine ⊂ Wine, so Chardonnay is a Wine.

**In okb.** okb follows IS_A chains when it checks inheritance, disjointness and slot values. Don't add shortcut edges (see rule hier-no-redundant-isa).

> “A subclass relationship is transitive: If B is a subclass of A and C is a subclass of B, then C is a subclass of A”  
> — Ontology 101 §4.1 Ensuring that the class hierarchy is correct, p.13

## Value type

Is it text, a number, yes/no, one of a fixed list of words, or a link to another thing?

**Definition.** A facet describing what types of values can fill a slot: String, Number (Integer/Float), Boolean, Enumerated (a fixed list of symbols) or Instance (a relationship to another individual).

**Example.** name: String; price: Float; sparkling: Boolean; flavor: Enumerated {strong, moderate, delicate}; maker: Instance of Winery.

**In okb.** Slot.valueType, one of String, Integer, Float, Number, Boolean, Enumerated, Instance.

> “A value-type facet describes what types of values can fill in the slot.”  
> — Ontology 101 §3 Step 6, Slot-value type, p.9

> “Enumerated slots specify a list of specific allowed values for the slot.”  
> — Ontology 101 §3 Step 6, Slot-value type, p.9

> “Instance-type slots allow definition of relationships between individuals. Slots with value type Instance must also define a list of allowed classes from which the instances can come.”  
> — Ontology 101 §3 Step 6, Slot-value type, p.10

