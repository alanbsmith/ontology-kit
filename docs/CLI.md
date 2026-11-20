# CLI commands

> Generated from the `okb help` text by `npm run docs`. Don't edit by hand: change `HELP` in `src/help.ts` and regenerate.

Run `okb help` for the same summary in your terminal. Each section below is one command, with every form the help lists for it.

- **Names:** when a class and a slot share a name, say which: `class:Genre` / `slot:genre`
- **Global options:** `-C <folder>` (default: current folder) · `--json` (machine-readable output where supported)

[`init`](#cmd-init) · [`status`](#cmd-status) · [`step`](#cmd-step) · [`explain`](#cmd-explain) · [`validate`](#cmd-validate) · [`scope`](#cmd-scope) · [`cq`](#cmd-cq) · [`reuse`](#cmd-reuse) · [`term`](#cmd-term) · [`convention`](#cmd-convention) · [`class`](#cmd-class) · [`tree`](#cmd-tree) · [`property`](#cmd-property) · [`relationship`](#cmd-relationship) · [`slot`](#cmd-slot) · [`show`](#cmd-show) · [`link`](#cmd-link) · [`unlink`](#cmd-unlink) · [`instance`](#cmd-instance) · [`review`](#cmd-review) · [`decision`](#cmd-decision) · [`diagram`](#cmd-diagram) · [`export`](#cmd-export) · [`source`](#cmd-source) · [`quote`](#cmd-quote) · [`rule`](#cmd-rule) · [`fulfills`](#cmd-fulfills) · [`cite`](#cmd-cite) · [`verify`](#cmd-verify) · [`rename`](#cmd-rename) · [`remove`](#cmd-remove) · [`drift`](#cmd-drift) · [`help`](#cmd-help) · [`version`](#cmd-version)

<a id="cmd-init"></a>
## okb init

*Listed under:* Getting started

```text
okb init <folder> --name "Wine and Food"
```

- `okb init <folder> --name "Wine and Food"`: create a new ontology

<a id="cmd-status"></a>
## okb status

*Listed under:* Getting started

```text
okb status
```

- `okb status`: where you are and what to do next

<a id="cmd-step"></a>
## okb step

*Listed under:* Getting started

```text
okb step [n|next|prev]
```

- `okb step [n|next|prev]`: move between steps and show the guide

<a id="cmd-explain"></a>
## okb explain

*Listed under:* Getting started

```text
okb explain [topic]
```

- `okb explain [topic]`: learn a concept, rule, step (e.g. okb explain 5) or decision guide

<a id="cmd-validate"></a>
## okb validate

*Listed under:* Getting started, Step 8: review

```text
okb validate [--all] [--why] [--json]
okb validate --all
```

- `okb validate [--all] [--why] [--json]`: check your ontology against the rules

<a id="cmd-scope"></a>
## okb scope

*Listed under:* Step 1: scope

```text
okb scope --domain "..." --purpose "..." --users a,b --maintainers x --out-of-scope "..."
```

<a id="cmd-cq"></a>
## okb cq

*Listed under:* Step 1: scope, Step 8: review

```text
okb cq add "Which wines go with fish?"
okb cq list
okb cq link 1 Wine Food goesWellWith
```

<a id="cmd-reuse"></a>
## okb reuse

*Listed under:* Step 2: reuse

```text
okb reuse add --name "..." --url ... --decision reuse|adapt|reference|rejected
okb reuse none --why "..."
```

<a id="cmd-term"></a>
## okb term

*Listed under:* Step 3: terms, Step 4: classes

```text
okb term add wine grape winery color ...
okb term list
okb term set wine --as class|slot|instance|value|synonym|out-of-scope [--node Name]
```

<a id="cmd-convention"></a>
## okb convention

*Listed under:* Step 4: classes

```text
okb convention [--class-case PascalCase] [--slot-case camelCase] [--number singular]
```

<a id="cmd-class"></a>
## okb class

*Listed under:* Step 4: classes, Step 6: facets

```text
okb class add RedWine --parent Wine [--desc "..."] [--synonym ...] [--abstract]
okb class set RedWine [--desc] [--add-parent X] [--remove-parent X] [--synonym S]
okb class disjoint RedWine WhiteWine RoseWine
okb class fix DessertWine sugar=sweet
okb class default Wine body=full
okb class restrict SingleVarietal grape --max 1
```

- `okb class fix DessertWine sugar=sweet`: (a value every member has)
- `okb class default Wine body=full`: (a starting value, overridable)

<a id="cmd-tree"></a>
## okb tree

*Listed under:* Step 4: classes

```text
okb tree [--instances]
```

<a id="cmd-property"></a>
## okb property

*Listed under:* Step 4: classes

```text
okb property add body --on Wine --type Enumerated --values light,medium,full --card single
```

<a id="cmd-relationship"></a>
## okb relationship

*Listed under:* Step 4: classes, Step 6: facets

```text
okb relationship add maker --from Wine --to Winery --card single
okb relationship inverse maker produces
okb relationship property preferredOver condition --type String [--required] [--values a,b]
```

- `okb relationship add maker --from Wine --to Winery --card single`: (stored as edges :MAKER)
- `okb relationship inverse maker produces`: (one edge, readable from both ends)

<a id="cmd-slot"></a>
## okb slot

*Listed under:* Step 4: classes, Step 6: facets

```text
okb slot set body [--on X] [--off X] [--desc] ...
okb slot set maker --card single --min 1
okb slot set producer --range Winery
```

<a id="cmd-show"></a>
## okb show

*Listed under:* Step 4: classes, Also

```text
okb show Wine
okb show <name>
```

<a id="cmd-link"></a>
## okb link

*Listed under:* Step 6: facets

```text
okb link Radio preferredOver SegmentedControl condition="2 to 7 options" [--rule <rule id>]
```

<a id="cmd-unlink"></a>
## okb unlink

*Listed under:* Step 6: facets

```text
okb unlink Radio preferredOver SegmentedControl
```

<a id="cmd-instance"></a>
## okb instance

*Listed under:* Step 7: instances

```text
okb instance add "Chateau Morgon Beaujolais" --of Beaujolais body=light maker="Chateau Morgon"
okb instance set "Chateau Morgon Beaujolais" grape+=Gamay
okb instance set "Chateau Morgon Beaujolais" --of Beaujolais
```

- `okb instance set "Chateau Morgon Beaujolais" grape+=Gamay`: (+= adds, -= removes, slot= clears)
- `okb instance set "Chateau Morgon Beaujolais" --of Beaujolais`: (move to another class)

<a id="cmd-review"></a>
## okb review

*Listed under:* Step 8: review

```text
okb review
```

<a id="cmd-decision"></a>
## okb decision

*Listed under:* Step 8: review

```text
okb decision add --title "..." --decision "..." --why "..." [--about X] [--waives rule-id]
```

<a id="cmd-diagram"></a>
## okb diagram

*Listed under:* Step 8: review

```text
okb diagram [--out diagram.md]
```

<a id="cmd-export"></a>
## okb export

*Listed under:* Export

```text
okb export [--format json|cypher] [--with-schema] [--no-inherited] [--no-rules] [--include-unverified] [--out file]
```

<a id="cmd-source"></a>
## okb source

*Listed under:* Documents

```text
okb source add docs/button.md [--repo-url https://github.com/.../button.md] [--url https://site/button]
okb source outline <source> [--quotable] [--json]
okb source refresh <source>
```

- `okb source outline <source> [--quotable] [--json]`: every block, with heading path and lines
- `okb source refresh <source>`: after the document changes

<a id="cmd-quote"></a>
## okb quote

*Listed under:* Documents

```text
okb quote add <source> "verbatim text" [--cites Node] [--line N]
```

- `okb quote add <source> "verbatim text" [--cites Node] [--line N]`: located automatically

<a id="cmd-rule"></a>
## okb rule

*Listed under:* Documents

```text
okb rule add --statement "..." --modality SHOULD --governs Button --cites <quote id> [--authored] [--value slot=value] [--refines <rule> --adds "..."]
okb rule refines <rule> <broader rule> [--adds "..."]
```

<a id="cmd-fulfills"></a>
## okb fulfills

*Listed under:* Documents

```text
okb fulfills <instance> <rule>
```

<a id="cmd-cite"></a>
## okb cite

*Listed under:* Documents

```text
okb cite <node> <quote id>
```

- `okb cite <node> <quote id>`: attach an existing quote to a node

<a id="cmd-verify"></a>
## okb verify

*Listed under:* Documents

```text
okb verify <node> --status SUPPORTED|OVERREACH|UNSUPPORTED [--corrected "..."]
okb verify <node> --approve
```

<a id="cmd-rename"></a>
## okb rename

*Listed under:* Also

```text
okb rename <old> <new>
```

<a id="cmd-remove"></a>
## okb remove

*Listed under:* Also

```text
okb remove <name>
```

<a id="cmd-drift"></a>
## okb drift

*Listed under:* Also

```text
okb drift <folder>...
```

<a id="cmd-help"></a>
## okb help

```text
okb help
```

- `okb help`: show the command summary (also `okb --help` or `okb -h`)

<a id="cmd-version"></a>
## okb version

```text
okb version
```

- `okb version`: print the okb version (also `okb --version`)

