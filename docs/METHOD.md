# The method: eight steps

<!-- Generated from the meta-KB (v2.6.0) by `pnpm run docs`. Don't edit by hand: change `packages/okb/meta-kb/src/*.yaml` and regenerate. -->

Ontology 101 (Noy & McGuinness, 2001) describes seven steps. The toolkit adds an eighth, **Review and iterate**, which makes explicit Ontology 101's instruction to stand back, test the ontology against its competency questions, and revise it.

## Principles to keep in mind throughout

### There is no single correct model

Two careful people will build two different ontologies of the same thing, and both can be good. Stop looking for the right answer and look for the one that fits your purpose. When you get stuck, go back to your competency questions.

### Build it iteratively

Your first version will be wrong in places, and that's expected. Get a rough version working end to end (scope → classes → slots → a few instances), test it against your questions, then go back and fix it.

### Model what's really in the domain

Write a few plain sentences about your domain. The nouns are usually your classes and the verbs are usually your relationships. If a class isn't something people in the domain would recognize, be suspicious of it.

### An ontology exists to serve a purpose

You aren't cataloguing everything that's true about a domain. You're building something that can answer specific questions for specific people. If a detail doesn't help answer one of your questions, leave it out.

### Think in structure, not behavior

If you write software, be careful: an ontology class is not a code class. You aren't grouping things by what they do or which code they share. You're grouping them by what they are. 'Is every X necessarily a Y?' is the only question that makes X a subclass of Y.

### Model the domain, not the database

Decide what your concepts mean before you think about how they'll be stored. The toolkit saves your ontology as graph (LPG) JSON, but you should never make a modeling choice because it's convenient for a graph database. The graph is just the storage format.

### Write down what every term means

A class name alone is ambiguous: does 'Order' mean a purchase or a sequence? Give every class and slot a one-sentence description. The structure tells a machine how to use a term, and the description tells a person what it means.

<a id="step-1-scope"></a>
## Step 1: Determine the domain and scope

<p class="block-label"><strong>Goal</strong></p>

Write down what the ontology is about, what it's for, who will use and maintain it, and which questions it must answer.

<p class="block-label"><strong>Why it matters</strong></p>

Scope is what lets you say 'no' to things later. Without it, every interesting fact looks like it belongs, and the ontology never finishes.

<p class="block-label"><strong>Questions to answer</strong></p>

- What is the domain that the ontology will cover? (One sentence.)
- What are we going to use the ontology for? What app, search, report or decision will it feed?
- What types of questions should it be able to answer? (These become competency questions.)
- Who will use it, and who will maintain it? Do they use the same words for things?
- What is related but deliberately out of scope?

<p class="block-label"><strong>You're done when</strong></p>

- [ ] Domain and purpose are written down
- [ ] Users (and ideally maintainers) are named
- [ ] At least three competency questions
- [ ] At least one thing is explicitly out of scope

<p class="block-label"><strong>Tips</strong></p>

- Competency questions are a sketch, not a contract. You'll add and change them.
- Don't try to list every question now. Write a few examples; each stands for a family of similar questions, and you can fill in the rest of the family once a question is answered.
- Good questions are specific and answerable: 'Which wines go with grilled meat?' beats 'Tell me about wine'.
- Include a few questions that need relationships (X goes with Y), not only lookups (what color is X).

> <p class="block-label"><strong>In the wine example</strong></p>
>
> - Domain: wine and food
> - Purpose: suggest good wine–food combinations
> - Out of scope: winery inventory, restaurant staff
> - Question: Is Bordeaux a red or white wine?
> - Question: Does Cabernet Sauvignon go well with seafood?
> - Question: What is the best choice of wine for grilled meat?

<details><summary>Source passages</summary>

> “We suggest starting the development of an ontology by defining its domain and scope. That is, answer several basic questions: What is the domain that the ontology will cover? For what we are going to use the ontology? For what types of questions the information in the ontology should provide answers? Who will use and maintain the ontology?”  
> — Ontology 101 §3 Step 1. Determine the domain and scope, p.5

> “One of the ways to determine the scope of the ontology is to sketch a list of questions that a knowledge base based on the ontology should be able to answer, competency questions”  
> — Ontology 101 §3 Step 1, Competency questions, p.5

> “These competency questions are just a sketch and do not need to be exhaustive.”  
> — Ontology 101 §3 Step 1, Competency questions, p.5

> “The answers to these questions may change during the ontology-design process, but at any given time they help limit the scope of the model.”  
> — Ontology 101 §3 Step 1. Determine the domain and scope, p.5

</details>

<a id="step-2-reuse"></a>
## Step 2: Consider reusing existing ontologies

<p class="block-label"><strong>Goal</strong></p>

Check whether someone has already modeled part of your domain, and decide whether to borrow, adapt, just reference it, or skip it.

<p class="block-label"><strong>Why it matters</strong></p>

Reuse saves time and makes your ontology compatible with others. If you have to talk to systems that already use a vocabulary, reuse may not be optional.

<p class="block-label"><strong>Questions to answer</strong></p>

- Is there an industry standard, taxonomy or controlled vocabulary for this domain?
- Does any system you must integrate with already use a particular vocabulary?
- Is there an internal list, spreadsheet, glossary or schema that already names these things?

<p class="block-label"><strong>You're done when</strong></p>

- [ ] Reuse has been considered and recorded

<p class="block-label"><strong>Tips</strong></p>

- Even a glossary page or an existing database schema counts as a source of terms.
- Don't let this step stall you. 30 minutes of looking is usually enough for a first version.
- Where to look: [Linked Open Vocabularies](https://lov.linkeddata.es) searches hundreds of reusable vocabularies by term. [schema.org](https://schema.org) covers everyday things: people, organizations, products, places, events and creative works.
- W3C vocabularies cover common needs: SKOS for taxonomies and thesauri, Dublin Core for document metadata, PROV-O for provenance, ORG for organizations and OWL-Time for dates and times.
- For design systems: [WAI-ARIA roles](https://www.w3.org/TR/wai-aria/) are a standard taxonomy of UI components (button, checkbox, switch, tab...). The [W3C Design Tokens format](https://www.designtokens.org) is the standard for tokens. DSDS, the [Design System Documentation Spec](https://designsystemdocspec.org), is a draft schema for documenting components, tokens and themes.
- You rarely need to import a whole vocabulary. Borrowing its terms and definitions is usually enough.

> <p class="block-label"><strong>In the wine example</strong></p>
>
> Ontology 101 notes a French-wine knowledge base or a wine retailer's list of wine properties could be imported, but chooses to build from scratch for teaching purposes.

<details><summary>Source passages</summary>

> “It is almost always worth considering what someone else has done and checking if we can refine and extend existing sources for our particular domain and task.”  
> — Ontology 101 §3 Step 2. Consider reusing existing ontologies, p.5

> “Reusing existing ontologies may be a requirement if our system needs to interact with other applications that have already committed to particular ontologies or controlled vocabularies.”  
> — Ontology 101 §3 Step 2. Consider reusing existing ontologies, p.5-6

</details>

<a id="step-3-terms"></a>
## Step 3: Enumerate important terms

<p class="block-label"><strong>Goal</strong></p>

Brainstorm every term you'd want to make statements about or explain to a user, without worrying yet about what kind of thing each one is.

<p class="block-label"><strong>Why it matters</strong></p>

It separates what matters from how to model it. Trying to do both at once is the main reason beginners freeze.

<p class="block-label"><strong>Questions to answer</strong></p>

- What are the things we'd like to talk about?
- What properties do those things have?
- What would we like to say about those things?
- Read your competency questions: which nouns and verbs appear in them?

<p class="block-label"><strong>You're done when</strong></p>

- [ ] At least 10 terms listed

<p class="block-label"><strong>Tips</strong></p>

- Include nouns (wine, winery), adjectives and properties (color, body, sweet), and verbs (produces, goes well with).
- Overlaps and duplicates are fine here. You'll sort them out in Steps 4 and 5.
- Mine your competency questions and any documents you collected in Step 2.

> <p class="block-label"><strong>In the wine example</strong></p>
>
> Terms in the wine example include wine, grape, winery, location, a wine's color, body, flavor and sugar content, fish, red meat and white wine.

<details><summary>Source passages</summary>

> “It is useful to write down a list of all terms we would like either to make statements about or to explain to a user.”  
> — Ontology 101 §3 Step 3. Enumerate important terms, p.6

> “Initially, it is important to get a comprehensive list of terms without worrying about overlap between concepts they represent, relations among the terms, or any properties that the concepts may have, or whether the concepts are classes or slots.”  
> — Ontology 101 §3 Step 3. Enumerate important terms, p.6

> “Concepts in the ontology should be close to objects (physical or logical) and relationships in your domain of interest. These are most likely to be nouns (objects) or verbs (relationships) in sentences that describe your domain.”  
> — Ontology 101 §3 A Simple Knowledge-Engineering Methodology, p.4

</details>

<a id="step-4-classes"></a>
## Step 4: Define the classes and the class hierarchy

<p class="block-label"><strong>Goal</strong></p>

Pick the terms that name things with independent existence, make them classes, and arrange them by 'is a kind of'.

<p class="block-label"><strong>Why it matters</strong></p>

The hierarchy is the backbone: slots are inherited down it and instances hang off it. Most modeling mistakes are hierarchy mistakes.

<p class="block-label"><strong>Questions to answer</strong></p>

- Which terms name things that exist on their own (not descriptions of other things)?
- Where does your head naturally start: general, specific, or somewhere in the middle?
- For each pair: is every X necessarily (by definition) a Y?
- Do any siblings overlap? Can something be both? If not, they're disjoint.

<p class="block-label"><strong>You're done when</strong></p>

- [ ] A naming convention is set
- [ ] At least two classes, organized with at least one is-a link
- [ ] The class hierarchy has no known mistakes
- [ ] You've stood back and looked at the whole tree, checking each is-a link against the "Is this really a subclass?" guide *(your judgment)*

<p class="block-label"><strong>Tips</strong></p>

- Steps 4 and 5 are intertwined. It's normal to add a few classes, then a few slots, then go back.
- Say each is-a link out loud: 'Every Pinot Noir is a Red Wine.' If it sounds wrong, it is.
- Use singular names consistently (Wine, not Wines).
- Mark 'grouping only' classes as abstract.

> <p class="block-label"><strong>In the wine example</strong></p>
>
> - Wine → Red Wine, White Wine, Rosé Wine
> - Red Wine → Bordeaux, Burgundy, and so on
> - Bordeaux → Médoc → Pauillac, Margaux
> - Port has two parents: Red Wine and Dessert Wine

<p class="block-label"><strong>Decision guides</strong></p>

- [Top-down, bottom-up, or combination?](DECISIONS.md#decision-approach)
- [Is this really a subclass?](DECISIONS.md#decision-is-a)
- [Should I introduce a new subclass here?](DECISIONS.md#decision-new-class)
- [New class, or just a slot value?](DECISIONS.md#decision-class-or-value)
- [Instance or class?](DECISIONS.md#decision-instance-or-class)
- [Are these classes disjoint?](DECISIONS.md#decision-disjoint)
- [Choosing a naming convention](DECISIONS.md#decision-naming)

<details><summary>Source passages</summary>

> “From the list created in Step 3, we select the terms that describe objects having independent existence rather than terms that describe these objects.”  
> — Ontology 101 §3 Step 4. Define the classes and the class hierarchy, p.7

> “We organize the classes into a hierarchical taxonomy by asking if by being an instance of one class, the object will necessarily (i.e., by definition) be an instance of some other class.”  
> — Ontology 101 §3 Step 4. Define the classes and the class hierarchy, p.8

> “A top-down development process starts with the definition of the most general concepts in the domain and subsequent specialization of the concepts.”  
> — Ontology 101 §3 Step 4. Define the classes and the class hierarchy, p.6

> “A bottom-up development process starts with the definition of the most specific classes, the leaves of the hierarchy, with subsequent grouping of these classes into more general concepts.”  
> — Ontology 101 §3 Step 4. Define the classes and the class hierarchy, p.7

> “A combination development process is a combination of the top-down and bottom-up approaches: We define the more salient concepts first and then generalize and specialize them appropriately.”  
> — Ontology 101 §3 Step 4. Define the classes and the class hierarchy, p.7

> “After defining a considerable number of new classes, it is helpful to stand back and check if the emerging hierarchy conforms to these guidelines.”  
> — Ontology 101 §4 Defining classes and a class hierarchy, p.12

> “The next two steps—developing the class hierarchy and defining properties of concepts (slots)—are closely intertwined. It is hard to do one of them first and then do the other.”  
> — Ontology 101 §3 Step 3. Enumerate important terms, p.6

</details>

<a id="step-5-slots"></a>
## Step 5: Define the properties of classes (slots)

<p class="block-label"><strong>Goal</strong></p>

Turn the remaining terms into slots and attach each one to the most general class whose members all have it.

<p class="block-label"><strong>Why it matters</strong></p>

Classes alone can't answer your questions. Slots hold the facts and relationships the answers are made of.

<p class="block-label"><strong>Questions to answer</strong></p>

- Which remaining terms describe a class rather than being one?
- For each: is it intrinsic (flavor), extrinsic (name, region), a part, or a relationship to another thing (maker)?
- What is the most general class whose members all have this property?
- Which competency question needs this slot?

<p class="block-label"><strong>You're done when</strong></p>

- [ ] At least one slot
- [ ] Every slot is attached to at least one class

<p class="block-label"><strong>Tips</strong></p>

- Two kinds of slot: properties hold a value (name, year, one of a list); relationships point at another thing (maker → Winery).
- Name relationships as verbs or roles read from the domain class: a Wine has a maker; a Winery produces wines.
- If you're attaching the same slot to every child, attach it to the parent instead.

> <p class="block-label"><strong>In the wine example</strong></p>
>
> - Wine gets: color, body, flavor, sugar, name, maker, grape
> - Winery gets: location, produces
> - Red Wine gets: tanninLevel, because white wines aren't described by tannin

<p class="block-label"><strong>Decision guides</strong></p>

- [Which class does this slot go on?](DECISIONS.md#decision-slot-placement)
- [New class, or just a slot value?](DECISIONS.md#decision-class-or-value)

<details><summary>Source passages</summary>

> “The classes alone will not provide enough information to answer the competency questions from Step 1.”  
> — Ontology 101 §3 Step 5. Define the properties of classes—slots, p.8

> “Most of the remaining terms are likely to be properties of these classes.”  
> — Ontology 101 §3 Step 5. Define the properties of classes—slots, p.8

> “In general, there are several types of object properties that can become slots in an ontology: “intrinsic” properties such as the flavor of a wine; “extrinsic” properties such as a wine’s name, and area it comes from; parts, if the object is structured; these can be both physical and abstract “parts” (e.g., the courses of a meal) relationships to other individuals;”  
> — Ontology 101 §3 Step 5. Define the properties of classes—slots, p.8

> “A slot should be attached at the most general class that can have that property.”  
> — Ontology 101 §3 Step 5. Define the properties of classes—slots, p.9

> “All subclasses of a class inherit the slot of that class.”  
> — Ontology 101 §3 Step 5. Define the properties of classes—slots, p.9

</details>

<a id="step-6-facets"></a>
## Step 6: Define the facets of the slots

<p class="block-label"><strong>Goal</strong></p>

For every slot, decide its value type, allowed values or range, cardinality, and any defaults, fixed values or inverse.

<p class="block-label"><strong>Why it matters</strong></p>

Facets turn a list of fields into rules a machine can check. This is where most data-quality errors get caught later.

<p class="block-label"><strong>Questions to answer</strong></p>

- Is the value text, a number, yes/no, one of a fixed list, or another thing (Instance)?
- If it's a fixed list, what are all the allowed values?
- If it's another thing, what is the most general class of things it can be (the range)? Not too general, not too narrow.
- One value or many? Is it required (minimum 1)?
- Is there a value most instances share (default), or one every instance of a class must have (fixed value)?
- Is this relationship the reverse of another slot (maker ↔ produces)?
- Does each link need extra information of its own, like a condition or a strength? (Edge properties; see decision.edge-or-class.)

<p class="block-label"><strong>You're done when</strong></p>

- [ ] Every slot has a value type and cardinality
- [ ] The slots have no known mistakes

<p class="block-label"><strong>Tips</strong></p>

- When in doubt about range, pick the most general class that still only contains valid fillers.
- Defaults are suggestions; fixed values are facts. Don't confuse them.

> <p class="block-label"><strong>In the wine example</strong></p>
>
> - body: one of light, medium or full, and only one value
> - produces (on Winery): points to Wine, can have many values, and is the inverse of maker
> - grape: at least one value
> - Dessert Wine: sugar is fixed at sweet

<p class="block-label"><strong>Decision guides</strong></p>

- [What should this slot's range be?](DECISIONS.md#decision-range)
- [Edge property, or make the relationship its own class?](DECISIONS.md#decision-edge-or-class)

<details><summary>Source passages</summary>

> “Slots can have different facets describing the value type, allowed values, the number of the values (cardinality), and other features of the values the slot can take.”  
> — Ontology 101 §3 Step 6. Define the facets of the slots, p.9

> “When defining a domain or a range for a slot, find the most general classes or class that can be respectively the domain or the range for the slots.”  
> — Ontology 101 §3 Step 6, Domain and range of a slot, p.10

> “do not define a domain and range that is overly general: all the classes in the domain of a slot should be described by the slot and instances of all the classes in the range of a slot should be potential fillers for the slot. Do not choose an overly general class for range (i.e., one would not want to make the range THING) but one would want to choose a class that will cover all fillers”  
> — Ontology 101 §3 Step 6, Domain and range of a slot, p.10

</details>

<a id="step-7-instances"></a>
## Step 7: Create instances

<p class="block-label"><strong>Goal</strong></p>

Add real individuals: choose a class, create the instance, and fill in its slot values.

<p class="block-label"><strong>Why it matters</strong></p>

Instances are the real test. Filling them in shows up missing slots, wrong facets and classes that don't fit.

<p class="block-label"><strong>Questions to answer</strong></p>

- What are the most specific things that appear in answers to your competency questions? Those are your instances.
- Which class does each belong to? (The most specific one that fits.)
- Can you fill in every required slot? If not, is the data missing or is the facet wrong?

<p class="block-label"><strong>You're done when</strong></p>

- [ ] At least a few instances (enough to answer one competency question end to end)
- [ ] The instances have no known mistakes

<p class="block-label"><strong>Tips</strong></p>

- Start with instances that answer one competency question completely. It's the fastest way to find gaps.
- An instance that won't fit anywhere usually means a class is missing or a facet is too strict.

> <p class="block-label"><strong>In the wine example</strong></p>
>
> - Château Morgon Beaujolais is an instance of Beaujolais, with:
> - body light, color red, flavor delicate, tannin low
> - grape Gamay, maker Château Morgon, region Beaujolais, sugar dry

<p class="block-label"><strong>Decision guides</strong></p>

- [Instance or class?](DECISIONS.md#decision-instance-or-class)

<details><summary>Source passages</summary>

> “Defining an individual instance of a class requires (1) choosing a class, (2) creating an individual instance of that class, and (3) filling in the slot values.”  
> — Ontology 101 §3 Step 7. Create instances, p.11

> “the most specific concepts that will constitute answers to those questions are very good candidates for individuals in the knowledge base.”  
> — Ontology 101 §4.6 An instance or a class?, p.18

</details>

<a id="step-8-review"></a>
## Step 8: Review against your questions, and iterate

<p class="block-label"><strong>Goal</strong></p>

Stand back: check each competency question can be answered, run the full validator, review the judgment-only rules, record decisions, and go around again.

<p class="block-label"><strong>Why it matters</strong></p>

The only real test of an ontology is whether it does the job it was built for. Expect to loop back to earlier steps.

<p class="block-label"><strong>Questions to answer</strong></p>

- For each competency question: which classes, slots and instances answer it? Is anything missing?
- For each answered question: would the ontology also answer the rest of its family, the same question about similar things and the questions next to it? Which of those are out of scope?
- Is there anything in the ontology no question needs?
- Would a domain expert agree with the hierarchy? Show it to one.
- Which choices would surprise someone reusing this ontology? Are they recorded as design decisions?

<p class="block-label"><strong>You're done when</strong></p>

- [ ] Every competency question is linked to what answers it
- [ ] Each question's family has been considered: wanted questions added, the rest recorded as out of scope *(your judgment)*
- [ ] The whole ontology has no known mistakes
- [ ] Every remaining issue is fixed or explained in a design decision
- [ ] Someone who knows the domain has looked at it *(your judgment)*

<p class="block-label"><strong>Tips</strong></p>

- Iteration is part of the method, not a sign you went wrong.
- Use the ontology-review skill for the judgment rules a script can't check.

> <p class="block-label"><strong>In the wine example</strong></p>
>
> Ontology 101's own evolution example: Zinfandel starts under Red Wine, then 'white zinfandel' appears and the class has to be split into White Zinfandel and Red Zinfandel.

<details><summary>Source passages</summary>

> “After defining a considerable number of new classes, it is helpful to stand back and check if the emerging hierarchy conforms to these guidelines.”  
> — Ontology 101 §4 Defining classes and a class hierarchy, p.12

> “After we define an initial version of the ontology, we can evaluate and debug it by using it in applications or problem-solving methods or by discussing it with experts in the field, or both.”  
> — Ontology 101 §3 A Simple Knowledge-Engineering Methodology, p.4

> “These questions will serve as the litmus test later: Does the ontology contain enough information to answer these types of questions?”  
> — Ontology 101 §3 Step 1, Competency questions, p.5

> “we can assess the quality of our ontology only by using it in applications for which we designed it.”  
> — Ontology 101 §8 Conclusions, p.23

> “Ontology development is necessarily an iterative process.”  
> — Ontology 101 §3 A Simple Knowledge-Engineering Methodology, p.4

> “Maintaining a consistent class hierarchy may become challenging as domains evolve.”  
> — Ontology 101 §4.1 Ensuring that the class hierarchy is correct, p.13

> “An ontology designer may want to run Chimaera diagnostics over the evolving ontology to determine the conformance to common ontology-modeling practices.”  
> — Ontology 101 §7 Other Resources, p.23

</details>

