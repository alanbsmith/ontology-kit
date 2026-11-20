# Review and iterate

`okb validate` catches the mistakes a script can see: a cycle in the hierarchy, a plural class name, a value outside its allowed list. It can't tell whether "every Latte is, by definition, an Espresso" is true, or whether Mocha and Latte belong on the same level. Only someone who knows the subject can judge that. Review is how you get those questions in front of a person.

There are two tools for it, and they work together:

- **`okb review`** turns each judgment rule into questions about your own classes and slots.
- **The ontology-review skill** has Claude work through those questions, double-check the validator's guesses, and report what to fix.

## Ask the questions

Run `okb review` inside your ontology folder. This is the coffee menu from the [Quickstart](../getting-started/quickstart.md), with a few more drinks:

```bash
okb review
```

```text
Review: what only a person can judge (step 1 and anything already visible)

? hier-is-a-means-kind-of (MUST)  For each IS_A edge, say out loud: 'Every <child> is, by definition, a <parent>.' If you hesitate, or the honest word is 'part of' / 'has' / 'usually', it is not an is-a.
   · Every Espresso is, by definition, a Drink?
   · Every Latte is, by definition, an Espresso?
   · Every Mocha is, by definition, an Espresso?
   · Every Cappuccino is, by definition, a Latte?
   Ontology 101 §4.1 Ensuring that the class hierarchy is correct, p.12

? hier-siblings-same-generality (MUST)  For each parent with 2+ children, ask: 'Is any of these a kind of another one?' and 'Would an expert put these on the same level?'
   · Espresso → Latte, Mocha: equally general? Is any one a kind of another?
   Ontology 101 §4.2 Analyzing siblings in a class hierarchy, p.14

? slot-domain-fits-all (MUST)  For each slot, check every class it's inherited by. Does each one really have this property?
   · size applies to Drink, Espresso, Mocha, Latte, Cappuccino. Does every one of these really have it?
   Ontology 101 §3 Step 6, Domain and range of a slot, p.11

Record answers that needed thought (or that someone might question later): okb decision add ...
```

Each question names your classes, so you can answer it in a minute. The line under it is the source in _Ontology Development 101_. Like `okb validate`, `okb review` shows only what's relevant to your current step. Add `--all` to see every judgment rule, and `--json` for output a program or an agent can read.

When you hesitate on a question, that's a finding. Fix the model, or write down why it's fine as it is.

## Record what you decide

If you keep something the validator warns about, record why. A [design decision](../GLOSSARY.md#concept-design-decision) can turn a warning into a note, and it stays in the ontology for the next person:

```bash
okb decision add --title "Mocha is on the menu" --decision "Keep Mocha as its own class" --why "Baristas order and price mocha separately, so the menu needs it" --about Mocha --waives hier-subclass-adds-something
```

```text
Recorded design decision d.1: Mocha is on the menu.
```

The output is trimmed to its first line. The `--waives` option names the rule, and `--about` names the class. In the coffee menu, `okb validate --all` went from 9 warnings to 8 once that decision was recorded. A decision about a class also covers its subclasses. A decision can't waive an error. okb refuses (`hier-siblings-same-generality` is a MUST rule), so for an error you fix the model.

## Run the review skill

The ontology-review skill does the same review with Claude. Install it the way you installed the coach (see [Skills](../reference/skills.md)), then ask:

```text
review my ontology
```

The skill gathers `okb status`, `okb validate --all --json` and `okb review --all --json`, reads your design decisions first (anything already explained is a closed question), and then:

1. **Answers each judgment question** about your actual classes, naming the ones that violate the rule, or saying plainly that none do.
2. **Double-checks every heuristic finding** from `okb validate`. A heuristic can be wrong. "Sauternes" isn't a plural, for example. A false positive gets a decision with `--waives`.
3. **Checks scope.** Does each competency question have what it needs? Is there content no question asks for?
4. **Reports in four groups:** must fix, should fix or explain, worth considering, and what looks good. Each finding says what's wrong, why it matters (with the rule id and its source), and the exact `okb` commands that fix it.

The skill doesn't change your ontology unless you ask. When you say yes, it applies the fixes one group at a time and runs `okb validate --all` after each. For a high-stakes ontology, it suggests running the review in a separate agent that hasn't seen how you built the model, so it isn't grading its own work.

## Iterate

Review isn't a gate you pass once. A typical loop is:

1. `okb validate --all` and fix the errors.
2. `okb review`, answer the questions, fix or record each.
3. `okb cq link` each competency question to what answers it. A question with nothing to link means something is missing.
4. Show `okb diagram --out diagram.md` to someone who knows the subject.
5. Repeat until the model answers your questions and the findings are fixed or explained.

For what each rule means, see [How do I read and fix a finding?](../learn/rules-and-findings.md) and the [rules reference](../RULES.md). The commands are in the [CLI reference](../CLI.md#cmd-review).
