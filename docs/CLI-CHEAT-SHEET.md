# CLI cheat sheet

The `okb` commands you will use most, in the order you usually need them. For every command and argument, see the [full reference](CLI.md).

## Getting started

<div class="cheat-card">

Start a new ontology:

```bash
okb init wine --name "Wine and Food"
```

</div>

<div class="cheat-card">

See where you are and what to do next:

```bash
okb status
```

</div>

<div class="cheat-card">

Move on to the next step:

```bash
okb step next
```

</div>

<div class="cheat-card">

Learn what a term or rule means:

```bash
okb explain class
```

</div>

<div class="cheat-card">

Check your ontology against the rules:

```bash
okb validate
```

</div>

## Planning

<div class="cheat-card">

Record what the ontology is for:

```bash
okb scope --domain "..." --purpose "..."
```

</div>

<div class="cheat-card">

Add a competency question:

```bash
okb cq add "Which wines go with fish?"
```

</div>

<div class="cheat-card">

Record that nothing existing fits:

```bash
okb reuse none --why "..."
```

</div>

<div class="cheat-card">

Collect the words of your domain:

```bash
okb term add wine grape winery
```

</div>

## Modeling

<div class="cheat-card">

Add a class:

```bash
okb class add RedWine --parent Wine
```

</div>

<div class="cheat-card">

See the class hierarchy:

```bash
okb tree
```

</div>

<div class="cheat-card">

Add a plain-value slot:

```bash
okb property add body --on Wine --type Enumerated --values light,full
```

</div>

<div class="cheat-card">

Add a link between classes:

```bash
okb relationship add maker --from Wine --to Winery
```

</div>

<div class="cheat-card">

Tighten a slot:

```bash
okb slot set maker --card single --min 1
```

</div>

<div class="cheat-card">

See everything about one class, slot or instance:

```bash
okb show Wine
```

</div>

<div class="cheat-card">

Add an instance:

```bash
okb instance add "Chateau Morgon" --of Beaujolais body=light
```

</div>

<div class="cheat-card">

Connect two instances:

```bash
okb link Radio preferredOver SegmentedControl
```

</div>

## Reviewing and sharing

<div class="cheat-card">

Get questions only a person can judge:

```bash
okb review
```

</div>

<div class="cheat-card">

Record a design decision:

```bash
okb decision add --title "..." --decision "..." --why "..."
```

</div>

<div class="cheat-card">

Draw the ontology:

```bash
okb diagram --out diagram.md
```

</div>

<div class="cheat-card">

Export for a graph database:

```bash
okb export --format cypher --out wine.cypher
```

</div>

## Working from documents

<div class="cheat-card">

Register a document to extract from:

```bash
okb source add docs/button.md
```

</div>

<div class="cheat-card">

Record a quote:

```bash
okb quote add button "verbatim text" --cites Button
```

</div>

<div class="cheat-card">

Record a rule a document states:

```bash
okb rule add --statement "..." --modality SHOULD --cites quote.1
```

</div>

<div class="cheat-card">

Record an independent check:

```bash
okb verify rule.1 --status SUPPORTED
```

</div>

## Housekeeping

<div class="cheat-card">

Rename something everywhere:

```bash
okb rename Vino Wine
```

</div>

<div class="cheat-card">

Delete something:

```bash
okb remove Vino
```

</div>

