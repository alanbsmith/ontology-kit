# CLI reference

## Overview

This page lists every `okb` command, grouped by what you are trying to do. Each entry shows what the command does, an example, and a table of its arguments. For the commands you will use most, see the [cheat sheet](CLI-CHEAT-SHEET.md). In your terminal, `okb help` prints a short summary.

Angle brackets like `<name>` mark a required argument, and square brackets like `[name]` mark an optional one. Two options work with most commands:

| Argument | Type | Description |
| --- | --- | --- |
| `-C` | path | The ontology folder. Defaults to the current folder. |
| `--json` | flag | Print machine-readable output, for commands that support it. |

> **Tip:** When a class and a slot share a name, say which one you mean with `class:Genre` or `slot:genre`.

## Getting started

<a id="cmd-init"></a>
### okb init

Creates a new ontology folder with the starting files and shows the guide for step 1.

```bash
$ okb init wine --name "Wine and Food"
```

#### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `<folder>` | path | Where to create the ontology. |
| `--name` | text | The ontology's name. Defaults to the folder name. |

<a id="cmd-status"></a>
### okb status

Shows which step you are on, what is done, and what to do next.

```bash
$ okb status
```

<a id="cmd-step"></a>
### okb step

Moves between the eight steps and shows the guide for a step.

```bash
$ okb step
$ okb step next
$ okb step 4
```

#### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `[n\|next\|prev]` | number or word | The step to move to: 1 to 8, `next`, or `prev`. Moving on with a step unfinished is allowed. |

<a id="cmd-explain"></a>
### okb explain

Explains a concept, rule, step or decision guide in plain language.

```bash
$ okb explain class
$ okb explain 5
$ okb explain --search inverse
```

#### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `[topic]` | text | A concept, rule key, step number or decision guide. |
| `--search` | text | Find entries that mention these words instead. |

<a id="cmd-validate"></a>
### okb validate

Checks your ontology against the rules. Errors make the command exit with code 1.

```bash
$ okb validate
$ okb validate --all --why
```

#### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `--all` | flag | Include warnings and hints from steps you haven't reached. |
| `--why` | flag | Show why each rule exists. |
| `--rule` | rule key | Run only this rule. Repeat it for more. |
| `--strict` | flag | Also exit with code 1 on warnings. |
| `--json` | flag | Print the findings as JSON. |

## Planning

<a id="cmd-scope"></a>
### okb scope

Records the domain, purpose, users and boundaries of the ontology. With no flags it shows what you have.

```bash
$ okb scope --domain "Wine and food pairing" --purpose "Recommend wines for a meal" --users sommeliers,cooks
```

#### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `--domain` | text | What the ontology covers. |
| `--purpose` | text | What it is for. |
| `--users` | list | Who will use it. |
| `--maintainers` | list | Who keeps it up to date. |
| `--out-of-scope` | list | What it deliberately leaves out. |
| `--kind` | text | The kind of ontology, such as a domain ontology. |
| `--name` | text | Rename the ontology. |

<a id="cmd-cq"></a>
### okb cq

Manages competency questions: the questions your ontology must be able to answer.

<a id="cmd-cq-add"></a>
#### okb cq add

Adds one or more questions.

```bash
$ okb cq add "Which wines go with fish?"
```

##### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `<question>` | text | The question. Quote it. |

<a id="cmd-cq-list"></a>
#### okb cq list

Lists the questions and what each one needs. Bare `okb cq` does the same.

```bash
$ okb cq list
```

<a id="cmd-cq-link"></a>
#### okb cq link

Says which classes, slots or instances a question needs. Use `unlink` to undo it.

```bash
$ okb cq link 1 Wine Food goesWellWith
```

##### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `<number>` | number | The question's number. |
| `<name>...` | names | The classes, slots or instances it needs. |

<a id="cmd-cq-set"></a>
#### okb cq set

Changes a question's text or marks it answerable.

```bash
$ okb cq set 1 --status answerable
```

##### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `<number>` | number | The question's number. |
| `--text` | text | New wording. |
| `--status` | draft or answerable | Whether the ontology can answer it yet. |

<a id="cmd-cq-remove"></a>
#### okb cq remove

Deletes a question.

```bash
$ okb cq remove 3
```

##### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `<number>` | number | The question's number. |

<a id="cmd-reuse"></a>
### okb reuse

Records which existing ontologies you looked at and what you decided about each.

<a id="cmd-reuse-add"></a>
#### okb reuse add

Records one ontology you considered.

```bash
$ okb reuse add --name FOAF --url http://xmlns.com/foaf/spec/ --decision reference
```

##### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `--name` | text | The ontology's name. |
| `--decision` | reuse, adapt, reference or rejected | What you decided. |
| `--url` | url | Where it lives. |
| `--notes` | text | Why. |

<a id="cmd-reuse-none"></a>
#### okb reuse none

Records that you looked and found nothing that fits.

```bash
$ okb reuse none --why "Checked schema.org and FOAF; neither covers wine."
```

##### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `--why` | text | What you looked at and why nothing fit. |

<a id="cmd-reuse-list"></a>
#### okb reuse list

Lists what you recorded. Bare `okb reuse` does the same.

```bash
$ okb reuse list
```

<a id="cmd-term"></a>
### okb term

Collects the important words of your domain, then decides what each one becomes.

<a id="cmd-term-add"></a>
#### okb term add

Adds terms to the list.

```bash
$ okb term add wine grape winery color
```

##### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `<term>...` | text | One or more terms. Quote multi-word terms. |
| `--note` | text | A note to keep with them. |

<a id="cmd-term-list"></a>
#### okb term list

Lists terms grouped by what you decided. Bare `okb term` does the same.

```bash
$ okb term list
```

<a id="cmd-term-set"></a>
#### okb term set

Decides what a term becomes.

```bash
$ okb term set wine --as class
$ okb term set vintage --as synonym --node Year
```

##### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `<term>` | text | The term. |
| `--as` | class, slot, instance, value, synonym or out-of-scope | What it becomes. |
| `--node` | name | The class, slot or instance it became or points to. |
| `--note` | text | A note about the decision. |

## Modeling

<a id="cmd-convention"></a>
### okb convention

Sets how names are written, so the validator can check them. With no flags it shows the current choices.

```bash
$ okb convention --class-case PascalCase --slot-case camelCase --number singular
```

#### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `--class-case` | text | Case for class names, such as PascalCase. |
| `--slot-case` | text | Case for slot names, such as camelCase. |
| `--instance-case` | text | Case for instance names. |
| `--number` | singular or plural | Whether class names are singular or plural. |
| `--slot-affix` | text | A prefix or suffix every slot name carries, if any. |

<a id="cmd-class"></a>
### okb class

Creates and changes classes, the kinds of things in your domain.

<a id="cmd-class-add"></a>
#### okb class add

Adds a class.

```bash
$ okb class add RedWine --parent Wine --desc "Wine made with dark grapes"
```

##### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `<Name>` | text | The name, in the case your naming convention asks for. |
| `--parent` | class | A parent class. Repeat it for more. |
| `--desc` | text | A one-line description. |
| `--synonym` | text | Another name for it. Repeat it for more. |
| `--abstract` | flag | Mark it as a grouping with no members of its own. |
| `--terminological` | flag | Mark it as terminological. |
| `--force` | flag | Add it even if the name breaks your convention. |

<a id="cmd-class-set"></a>
#### okb class set

Changes a class.

```bash
$ okb class set RedWine --add-parent Beverage
```

##### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `<Class>` | class | The class to change. |
| `--desc` | text | New description. |
| `--add-parent` | class | Add a parent. |
| `--remove-parent` | class | Remove a parent. |
| `--synonym` | text | Add a synonym. |
| `--abstract` | true or false | Whether it is abstract. |
| `--terminological` | true or false | Whether it is terminological. |

<a id="cmd-class-disjoint"></a>
#### okb class disjoint

Says that no one thing can belong to more than one of these classes.

```bash
$ okb class disjoint RedWine WhiteWine RoseWine
```

##### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `<Class>...` | classes | Two or more classes. |

<a id="cmd-class-fix"></a>
#### okb class fix

Gives every member of a class the same value for a slot.

```bash
$ okb class fix DessertWine sugar=sweet
```

##### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `<Class>` | class | The class. |
| `<slot=value>...` | slot=value | The values every member has. |

<a id="cmd-class-default"></a>
#### okb class default

Gives a class a starting value for a slot that individual members can override.

```bash
$ okb class default Wine body=full
```

##### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `<Class>` | class | The class. |
| `<slot=value>...` | slot=value | The starting values. |

<a id="cmd-class-restrict"></a>
#### okb class restrict

Narrows a slot for one class: fewer values, a limit on how many, or a narrower range.

```bash
$ okb class restrict SingleVarietal grape --max 1
```

##### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `<Class>` | class | The class. |
| `<slot>` | slot | The slot to narrow. |
| `--values` | list | Allowed values. |
| `--min` | number | The fewest values allowed. |
| `--max` | number | The most values allowed. |
| `--range` | class | Allowed classes, for a relationship. |
| `--clear` | flag | Remove the restriction. |

<a id="cmd-tree"></a>
### okb tree

Prints the class hierarchy as an indented tree.

```bash
$ okb tree
$ okb tree --instances
```

#### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `--instances` | flag | Show instances under their classes. |

<a id="cmd-property"></a>
### okb property

A slot that holds a plain value, such as a number, text or one of a fixed list. It takes the same subcommands as `okb slot`.

<a id="cmd-property-add"></a>
#### okb property add

Adds a property to a class.

```bash
$ okb property add body --on Wine --type Enumerated --values light,medium,full --card single
```

##### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `<name>` | text | The name, in the case your naming convention asks for. |
| `--on` | class | The class it belongs to. |
| `--type` | String, Integer, Float, Boolean or Enumerated | What kind of value it holds. |
| `--values` | list | The allowed values, for Enumerated. |
| `--card` | single or multiple | Whether it holds one value or several. |
| `--desc` | text | A one-line description. |

<a id="cmd-relationship"></a>
### okb relationship

A slot that links one thing to another, such as a wine to its winery. Okb stores it as edges, so `maker` becomes `:MAKER`.

<a id="cmd-relationship-add"></a>
#### okb relationship add

Adds a relationship between two classes.

```bash
$ okb relationship add maker --from Wine --to Winery --card single
```

##### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `<name>` | text | The name, in the case your naming convention asks for. |
| `--from` | class | The class the relationship starts at. |
| `--to` | class | The class it points to. |
| `--card` | single or multiple | Whether it holds one target or several. |

<a id="cmd-relationship-inverse"></a>
#### okb relationship inverse

Declares that two relationships are the same link read from opposite ends.

```bash
$ okb relationship inverse maker produces
```

##### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `<slotA>` | slot | The relationship that is stored. |
| `<slotB>` | slot | Its inverse. |

<a id="cmd-relationship-property"></a>
#### okb relationship property

Adds a property to a relationship itself, such as the condition under which one thing is preferred over another.

```bash
$ okb relationship property preferredOver condition --type String
```

##### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `<relationship>` | slot | The relationship. |
| `<name>` | text | The property's name. |
| `--type` | String, Integer, Float, Boolean or Enumerated | What kind of value it holds. |
| `--values` | list | The allowed values, for Enumerated. |
| `--required` | flag | Every link must give it a value. |
| `--desc` | text | A one-line description. |
| `--remove` | flag | Remove the property. |

<a id="cmd-slot"></a>
### okb slot

Creates and changes slots, the properties and relationships of a class. `okb property` and `okb relationship` are friendlier names for the same command.

<a id="cmd-slot-add"></a>
#### okb slot add

Adds a slot to a class.

```bash
$ okb slot add body --on Wine --type Enumerated --values light,medium,full
```

##### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `<name>` | text | The name, in the case your naming convention asks for. |
| `--on` | class | A class it belongs to. Repeat it for more. |
| `--type` | String, Integer, Float, Boolean, Enumerated or Instance | What it holds. `Instance` makes it a relationship. |
| `--values` | list | The allowed values, for Enumerated. |
| `--range` | class | The class a relationship points to. |
| `--card` | single or multiple | Whether it holds one value or several. |
| `--min` | number | The fewest values allowed. |
| `--max` | number | The most values allowed. |
| `--default` | text | A starting value. |
| `--desc` | text | A one-line description. |
| `--force` | flag | Add it even if the name breaks your convention. |

<a id="cmd-slot-set"></a>
#### okb slot set

Changes a slot. It takes every flag `add` takes, plus the ones below.

```bash
$ okb slot set maker --card single --min 1
$ okb slot set body --off Beverage
```

##### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `<slot>` | slot | The slot to change. |
| `--off` | class | Take the slot off a class. |
| `--add-range` | class | Add a class a relationship can point to. |
| `--remove-range` | class | Remove one. |
| `--on-rules` | flag | Let rules set this slot. |
| `--off-rules` | flag | Stop rules setting this slot. |

<a id="cmd-slot-inverse"></a>
#### okb slot inverse

Declares that two relationships are the same link read from opposite ends.

```bash
$ okb slot inverse maker produces
```

##### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `<slotA>` | slot | The relationship that is stored. |
| `<slotB>` | slot | Its inverse. |

<a id="cmd-show"></a>
### okb show

Shows everything about one class, slot or instance: its parents, slots, values and links.

```bash
$ okb show Wine
$ okb show class:Genre
```

#### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `[name]` | text | The thing to show. When a class and a slot share a name, write `class:Genre` or `slot:genre`. |

<a id="cmd-link"></a>
### okb link

Connects two instances (or an instance and a class) with a relationship.

```bash
$ okb link Radio preferredOver SegmentedControl condition="2 to 7 options"
```

#### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `<from>` | name | Where the link starts. |
| `<relationship>` | slot | The relationship. |
| `<to>` | name | Where it ends. |
| `<name=value>...` | name=value | Values for the relationship's own properties. |
| `--rule` | rule id | The extracted rule this link comes from. |
| `--clear` | text | Remove a property value from the link. |

<a id="cmd-unlink"></a>
### okb unlink

Removes a link.

```bash
$ okb unlink Radio preferredOver SegmentedControl
```

#### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `<from>` | name | Where the link starts. |
| `<relationship>` | slot | The relationship. |
| `<to>` | name | Where it ends. |

<a id="cmd-instance"></a>
### okb instance

Adds and changes instances, the individual things your classes describe.

<a id="cmd-instance-add"></a>
#### okb instance add

Adds an instance and sets its values.

```bash
$ okb instance add "Chateau Morgon Beaujolais" --of Beaujolais body=light maker="Chateau Morgon"
```

##### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `<Name>` | text | The instance's name. Quote it if it has spaces. |
| `--of` | class | A class it belongs to. Repeat it for more. |
| `--desc` | text | A one-line description. |
| `<slot=value>...` | slot=value | Values for its slots. |

<a id="cmd-instance-set"></a>
#### okb instance set

Changes an instance's values. Use `+=` to add a value, `-=` to remove one, and `slot=` to clear it.

```bash
$ okb instance set "Chateau Morgon Beaujolais" grape+=Gamay
$ okb instance set "Chateau Morgon Beaujolais" --of Beaujolais
```

##### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `<Name>` | text | The instance. |
| `<slot=value>...` | slot=value | The changes. |
| `--of` | class | Move it to another class. |
| `--desc` | text | New description. |

## Reviewing and sharing

<a id="cmd-review"></a>
### okb review

Turns the rules only a person can judge into questions about your ontology. The ontology-review skill uses it.

```bash
$ okb review
$ okb review --all --json
```

#### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `--all` | flag | Include every rule, not only the visible ones. |
| `--json` | flag | Print everything as JSON. |

<a id="cmd-decision"></a>
### okb decision

Records a design decision, with the reason, so you and others can see why the ontology is the way it is.

<a id="cmd-decision-add"></a>
#### okb decision add

Records a decision. A decision can waive a rule, which turns that rule's warning into a note.

```bash
$ okb decision add --title "Wines are not foods" --decision "Keep them separate" --why "Pairing needs both"
```

##### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `--title` | text | A short title. |
| `--decision` | text | What you decided. |
| `--why` | text | The reason. |
| `--question` | text | The question it answers. |
| `--alt` | text | An option you rejected. Repeat it for more. |
| `--about` | name | A class, slot or instance it concerns. Repeat it for more. |
| `--waives` | rule key | A rule it explains away. Repeat it for more. |

<a id="cmd-decision-list"></a>
#### okb decision list

Lists the decisions. Bare `okb decision` does the same.

```bash
$ okb decision list
```

<a id="cmd-diagram"></a>
### okb diagram

Draws the ontology as a Mermaid diagram you can open in GitHub or VS Code.

```bash
$ okb diagram --out diagram.md
```

#### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `--out` | path | Write the diagram here instead of printing it. |

<a id="cmd-export"></a>
### okb export

Writes the ontology as JSON or as openCypher, ready for Neo4j, Neptune or Memgraph. Instances become nodes labeled with their classes.

```bash
$ okb export --format cypher --out wine.cypher
```

#### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `--format` | json or cypher | The output format. Defaults to json. |
| `--out` | path | Write to this file instead of printing. |
| `--with-schema` | flag | Include classes and slots, not only instances. |
| `--no-inherited` | flag | Leave out values an instance inherits from its class. |
| `--no-rules` | flag | Leave out extracted rules. |
| `--include-unverified` | flag | Include rules and quotes that haven't been verified. |

<a id="cmd-docs"></a>
### okb docs

Writes Markdown reference pages for the ontology, so people can read its structure and rules without okb: an index, one page per class, a rules page and a sources page.

```bash
$ okb docs --out docs/kb
```

#### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `--out` | folder | Where to write the pages. Required; it is created if it doesn't exist. |

<a id="cmd-docs---changed"></a>
#### okb docs --changed

A review view of a change: only the pages whose text differs from `<ref>` (a git ref or a folder, the same as `okb diff`). A rule changed on a class changes the page of every subclass that inherits it, so those pages come with it. It also writes `changes.md`, which lists the changed pages and the stale-quote worklist from `okb source refresh --all --dry-run` (quotes that are gone or moved, and blocks that are new or changed, each with the nodes that cite them), because a source edit that hasn't been re-synced yet changes no page. Pages are the same text as the full render, so links to pages that aren't in the folder point into the full output. It only adds and overwrites files, so write it to a scratch folder, not to the committed pages. It never changes the ontology.

```bash
$ okb docs --out review --changed main
$ okb docs --out review --changed v1.0.0 --hops 1
```

##### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `--out` | folder | Where to write the pages. Required. |
| `--changed` | ref | The git ref (or folder) to compare the working folder with. |
| `--hops` | number | Also write the class pages that link to or from a changed class page, this many links away. Default 0. It doesn't go through the index, rules or sources pages, which link to everything. |

<a id="cmd-docs---context"></a>
#### okb docs --context

A review view of every rule beside the source text around its quote: the statement, modality, verification status, the verifier's note (when `okb verify --note` stored one), the original draft of a corrected rule, the quote, and the lines around it with the quoted lines marked. Rules that need a person come first (UNSUPPORTED, OVERREACH not yet approved, not verified, no quote, quote no longer in the source), then the rest by name. It reads the source files, so it needs them on disk. A source that isn't Markdown shows the quote alone. It writes `rules-in-context.md` and never changes the ontology.

```bash
$ okb docs --out review --context
```

##### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `--out` | folder | Where to write `rules-in-context.md`. Required. |
| `--context` | flag | Write the rules-in-context page instead of the reference pages. It doesn't combine with `--changed`. |

## Working from documents

<a id="cmd-source"></a>
### okb source

Registers documents you are extracting from, so quotes and rules can point back to them.

<a id="cmd-source-add"></a>
#### okb source add

Registers a Markdown or PDF file.

```bash
$ okb source add docs/button.md --repo-url https://github.com/acme/ds/blob/main/button.md
```

##### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `<file>` | path | A Markdown or PDF file. |
| `--title` | text | A title. |
| `--repo-url` | url | The file's address on GitHub. |
| `--url` | url | The address of the rendered page. |
| `--id` | text | Your own id for it. |

<a id="cmd-source-outline"></a>
#### okb source outline

Lists every block of a Markdown source with its heading path and line numbers, and shows which are already quoted.

```bash
$ okb source outline button --quotable
```

##### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `<source>` | name | The source. |
| `--quotable` | flag | Show only blocks you can quote. |
| `--problems` | flag | Show only problems in the document. |

<a id="cmd-source-refresh"></a>
#### okb source refresh

Checks quotes again after the document changes. With `--all` it checks every source, reports quotes that are gone (with the rules and facts that cite them) or moved, and lists the new, changed and removed blocks as a worklist. It exits with code 1 when a quote is gone or a source can't be read.

```bash
$ okb source refresh button
$ okb source refresh --all
$ okb source refresh --all --json --dry-run
```

##### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `[<source>]` | name | The source to check (leave it out with --all). |
| `--all` | flag | Check every source and list the worklist of new, changed and removed blocks. |
| `--dry-run` | flag | With --all: write nothing, not even moved quotes. |
| `--record` | flag | With --all: store the current blocks as the baseline once the worklist is dealt with. |
| `--strict` | flag | With --all: also exit with code 1 when the worklist isn't empty. |

<a id="cmd-source-list"></a>
#### okb source list

Lists the sources. Bare `okb source` does the same.

```bash
$ okb source list
```

<a id="cmd-quote"></a>
### okb quote

Records a verbatim passage from a source. Okb finds it in the document for you.

<a id="cmd-quote-add"></a>
#### okb quote add

Records one quote.

```bash
$ okb quote add button "Use a primary button for the main action." --cites Button
```

##### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `<source>` | name | The source it comes from. |
| `<text>` | text | The passage, word for word. |
| `--cites` | node | A node the quote supports. Repeat it for more. |
| `--line` | number | A line to look near, if the text appears more than once. |
| `--allow-code` | flag | Allow a quote from a code block. |

<a id="cmd-quote-list"></a>
#### okb quote list

Lists the quotes. Bare `okb quote` does the same.

```bash
$ okb quote list
```

<a id="cmd-rule"></a>
### okb rule

Records a rule a document states, tied to the quote that supports it.

<a id="cmd-rule-add"></a>
#### okb rule add

Records one rule.

```bash
$ okb rule add --statement "Buttons SHOULD have one primary per page." --modality SHOULD --governs Button --cites quote.1
```

##### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `--statement` | text | The rule, in one sentence. |
| `--modality` | MUST, SHOULD, MAY, MUST_NOT or SHOULD_NOT | How strong the document makes it. |
| `--cites` | quote id | The quote that supports it. Repeat it for more. |
| `--governs` | class or slot | What it applies to. Repeat it for more. |
| `--name` | text | A short name. |
| `--authored` | flag | You wrote it; the document doesn't state it. |
| `--value` | slot=value | A value it sets. Repeat it for more. |
| `--refines` | rule id | A broader rule this one narrows. |
| `--adds` | text | What this rule adds to the one it refines. |

<a id="cmd-rule-refines"></a>
#### okb rule refines

Says that one rule narrows another.

```bash
$ okb rule refines rule.2 rule.1 --adds "Only inside dialogs"
```

##### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `<rule>` | rule id | The narrower rule. |
| `<broader rule>` | rule id | The rule it narrows. |
| `--adds` | text | What it adds. |
| `--remove` | flag | Remove the link. |

<a id="cmd-rule-list"></a>
#### okb rule list

Lists the rules. Bare `okb rule` does the same.

```bash
$ okb rule list
```

<a id="cmd-fulfills"></a>
### okb fulfills

Says that an instance follows a rule.

```bash
$ okb fulfills SaveButton rule.1
```

#### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `<instance>` | name | The instance. |
| `<rule>` | rule id | The rule. |
| `--remove` | flag | Remove the link. |

<a id="cmd-cite"></a>
### okb cite

Attaches a quote you already recorded to another node.

```bash
$ okb cite Button quote.4
```

#### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `<node>` | name | The class, slot, instance or rule. |
| `<quote id>` | quote id | The quote. `okb quote list` shows them. |

<a id="cmd-verify"></a>
### okb verify

Records the result of an independent check that a node matches what its quote says, or approves it.

```bash
$ okb verify rule.1 --status SUPPORTED
$ okb verify rule.1 --approve
```

#### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `<node>` | name | The node to verify. |
| `--status` | SUPPORTED, OVERREACH or UNSUPPORTED | What the check found. |
| `--corrected` | text | A corrected wording, for OVERREACH. |
| `--confidence` | verbatim or paraphrased | How closely the node follows the quote. |
| `--note` | text | One sentence on why: the word or number you changed, or the part of the statement the quote doesn't support. OVERREACH prints a suggestion. |
| `--ref` | url | An http or https link to the PR comment, issue or review thread where the reasoning happened. |
| `--approve` | flag | Approve it after review. |

## Skills

<a id="cmd-skills"></a>
### okb skills

Puts the skills that come with okb where Claude Code and Cursor load them from, and checks that they match this okb.

<a id="cmd-skills-install"></a>
#### okb skills install

Links the three skills into `~/.claude/skills/` (a link keeps them current when the package updates), or copies them. It replaces a link to an older okb, a broken link or an older copy. It refuses to touch a folder that is not one of okb's, and changes nothing if it refuses.

```bash
$ okb skills install
$ okb skills install --copy
$ okb skills install --dir ~/.cursor/skills
```

##### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `--copy` | flag | Copy the skill folders instead of linking to them. Run it again after you update okb. |
| `--dir` | path | The skills folder to use instead of `~/.claude/skills/`. The `OKB_SKILLS_DIR` environment variable sets it too. |
| `--force` | flag | Delete a folder or file that is not one of okb's skills (or a copy you edited) and put the skill in its place. |

<a id="cmd-skills-status"></a>
#### okb skills status

Lists each skill with where it is installed and whether its version matches this okb. It exits with code 1 when any skill is missing or out of date.

```bash
$ okb skills status
$ okb skills status --dir ~/.cursor/skills
```

##### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `--dir` | path | The skills folder to check instead of `~/.claude/skills/`. |

## Housekeeping

<a id="cmd-rename"></a>
### okb rename

Renames a class, slot or instance and updates everything that points to it.

```bash
$ okb rename Vino Wine
```

#### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `<old name>` | name | The current name. |
| `<new name>` | text | The new name. |
| `--force` | flag | Rename it even if the name breaks your convention. |

<a id="cmd-remove"></a>
### okb remove

Deletes a class, slot, instance, term or other node, with the edges that touch it.

```bash
$ okb remove Vino
$ okb remove genre --type Slot
```

#### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `<name>` | name | What to delete. |
| `--type` | text | Which kind, when a name is ambiguous: Class, Slot, Instance, Term and so on. |

<a id="cmd-drift"></a>
### okb drift

Compares quotes with the documents they came from and reports quotes that no longer match.

```bash
$ okb drift .
$ okb drift ../wine ../food
```

#### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `[folder]...` | paths | The ontology folders to check. |

<a id="cmd-check"></a>
### okb check

Says whether a knowledge base is safe to merge: no validation errors, every quote still in its source, and nothing unverified, unsupported or waiting for approval. Exits non-zero when a check fails, so a CI job can gate on it.

```bash
$ okb check
$ okb check --json
$ okb check -C ../wine
```

#### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `--json` | flag | Print the result as JSON: `ok`, the installed and pinned versions, and each check with its status, summary and problems. |

<a id="cmd-pin"></a>
### okb pin

Records the installed okb version in okb.json as `okbVersion`, so `okb check` warns anyone with an older okb and the CI workflow installs that version. Run it again after you upgrade okb.

```bash
$ okb pin
```

<a id="cmd-diff"></a>
### okb diff

Shows what changed in the knowledge between two versions of an ontology: added, removed, renamed and changed things, rules side by side, moved quotes and changed links, in words rather than JSON lines.

```bash
$ okb diff main
$ okb diff v1.0 v1.1
$ okb diff ../wine-old .
$ okb diff main --json
```

#### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `<old>` | folder or git ref | The earlier version. An existing folder is read as it is; anything else is a branch, tag or commit in the repository around the current folder. A name that is both is an error that shows both spellings (`./name` for the folder, `refs/heads/name` for the branch). |
| `[new]` | folder or git ref | The later version. Defaults to the current folder. |
| `--json` | flag | Print the changes as JSON for other tools. |

<a id="cmd-release"></a>
### okb release

Cuts a numbered release of the knowledge base that other tools can pin: a manifest with the SHA-256 of every file and source, and a change log of what changed since the last release.

```bash
$ okb release 1.0.0
$ okb release 1.1.0 --json
```

#### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `<version>` | semver | The new version: `1.0.0`, `1.2.3` or `2.0.0-rc.1`. It must be higher than the version in `manifest.json`. |
| `--json` | flag | Print the version and the manifest as JSON. |

<a id="cmd-release-verify"></a>
#### okb release verify

Checks the files against `manifest.json`: every pinned file must exist and match its SHA-256, and `okb.json` must carry the manifest's version. It changes nothing. It exits 1 when something differs, so it can run in CI or before a server starts.

```bash
$ okb release verify
$ okb release verify -C ../wine --json
```

##### Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `--json` | flag | Print the result as JSON. |

<a id="cmd-help"></a>
### okb help

Prints a one-screen summary of the commands. `okb --help` and `okb -h` do the same.

```bash
$ okb help
```

<a id="cmd-version"></a>
### okb version

Prints the okb version and the version of the rules it carries. `okb --version` does the same.

```bash
$ okb version
```

