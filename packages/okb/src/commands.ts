/**
 * The command reference behind docs/CLI.md: what each `okb` command does, an example,
 * and its arguments. `tests/misc.test.ts` checks that every command in the dispatch table
 * is here and that every flag the help text shows for a command is documented.
 */

/** [name, value type, description] */
export type Arg = readonly [name: string, type: string, description: string];

/** One way to call a command (a subcommand such as `add`, or the bare command). */
export interface Form {
  /** The subcommand word, if any: `add` for `okb cq add`. */
  sub?: string;
  description: string;
  examples: string[];
  args: Arg[];
}

export interface Command {
  name: string;
  /** The heading it appears under, by what you are trying to do. Commands appear in the order listed, so keep a group together. */
  group: string;
  description: string;
  forms: Form[];
}

const NAME_DESC = "The name, in the case your naming convention asks for.";

export const COMMANDS: Command[] = [
  {
    name: "init",
    group: "Getting started",
    description: "Creates a new ontology folder with the starting files and shows the guide for step 1.",
    forms: [{
      description: "Creates the folder, then tells you what to do first.",
      examples: ['okb init wine --name "Wine and Food"'],
      args: [["<folder>", "path", "Where to create the ontology."], ["--name", "text", "The ontology's name. Defaults to the folder name."]],
    }],
  },
  {
    name: "status",
    group: "Getting started",
    description: "Shows which step you are on, what is done, and what to do next.",
    forms: [{ description: "Prints every step with its checklist, plus a count of validator findings.", examples: ["okb status"], args: [] }],
  },
  {
    name: "step",
    group: "Getting started",
    description: "Moves between the eight steps and shows the guide for a step.",
    forms: [{
      description: "With no argument it shows the guide for your current step. With one, it moves you there.",
      examples: ["okb step", "okb step next", "okb step 4"],
      args: [["[n|next|prev]", "number or word", "The step to move to: 1 to 8, `next`, or `prev`. Moving on with a step unfinished is allowed."]],
    }],
  },
  {
    name: "explain",
    group: "Getting started",
    description: "Explains a concept, rule, step or decision guide in plain language.",
    forms: [{
      description: "With no argument it lists everything you can ask about.",
      examples: ["okb explain class", "okb explain 5", "okb explain --search inverse"],
      args: [["[topic]", "text", "A concept, rule key, step number or decision guide."], ["--search", "text", "Find entries that mention these words instead."]],
    }],
  },
  {
    name: "validate",
    group: "Getting started",
    description: "Checks your ontology against the rules. Errors make the command exit with code 1.",
    forms: [{
      description: "By default it shows errors, plus warnings and hints for the steps you have reached.",
      examples: ["okb validate", "okb validate --all --why"],
      args: [
        ["--all", "flag", "Include warnings and hints from steps you haven't reached."],
        ["--why", "flag", "Show why each rule exists."],
        ["--rule", "rule key", "Run only this rule. Repeat it for more."],
        ["--strict", "flag", "Also exit with code 1 on warnings."],
        ["--json", "flag", "Print the findings as JSON."],
      ],
    }],
  },
  {
    name: "scope",
    group: "Planning",
    description: "Records the domain, purpose, users and boundaries of the ontology. With no flags it shows what you have.",
    forms: [{
      description: "Sets any of the fields you pass and prints the result.",
      examples: ['okb scope --domain "Wine and food pairing" --purpose "Recommend wines for a meal" --users sommeliers,cooks'],
      args: [
        ["--domain", "text", "What the ontology covers."],
        ["--purpose", "text", "What it is for."],
        ["--users", "list", "Who will use it."],
        ["--maintainers", "list", "Who keeps it up to date."],
        ["--out-of-scope", "list", "What it deliberately leaves out."],
        ["--kind", "text", "The kind of ontology, such as a domain ontology."],
        ["--name", "text", "Rename the ontology."],
      ],
    }],
  },
  {
    name: "cq",
    group: "Planning",
    description: "Manages competency questions: the questions your ontology must be able to answer.",
    forms: [
      { sub: "add", description: "Adds one or more questions.", examples: ['okb cq add "Which wines go with fish?"'], args: [["<question>", "text", "The question. Quote it."]] },
      { sub: "list", description: "Lists the questions and what each one needs. Bare `okb cq` does the same.", examples: ["okb cq list"], args: [] },
      {
        sub: "link",
        description: "Says which classes, slots or instances a question needs. Use `unlink` to undo it.",
        examples: ["okb cq link 1 Wine Food goesWellWith"],
        args: [["<number>", "number", "The question's number."], ["<name>...", "names", "The classes, slots or instances it needs."]],
      },
      {
        sub: "set",
        description: "Changes a question's text or marks it answerable.",
        examples: ["okb cq set 1 --status answerable"],
        args: [["<number>", "number", "The question's number."], ["--text", "text", "New wording."], ["--status", "draft or answerable", "Whether the ontology can answer it yet."]],
      },
      { sub: "remove", description: "Deletes a question.", examples: ["okb cq remove 3"], args: [["<number>", "number", "The question's number."]] },
    ],
  },
  {
    name: "reuse",
    group: "Planning",
    description: "Records which existing ontologies you looked at and what you decided about each.",
    forms: [
      {
        sub: "add",
        description: "Records one ontology you considered.",
        examples: ["okb reuse add --name FOAF --url http://xmlns.com/foaf/spec/ --decision reference"],
        args: [
          ["--name", "text", "The ontology's name."],
          ["--decision", "reuse, adapt, reference or rejected", "What you decided."],
          ["--url", "url", "Where it lives."],
          ["--notes", "text", "Why."],
        ],
      },
      { sub: "none", description: "Records that you looked and found nothing that fits.", examples: ['okb reuse none --why "Checked schema.org and FOAF; neither covers wine."'], args: [["--why", "text", "What you looked at and why nothing fit."]] },
      { sub: "list", description: "Lists what you recorded. Bare `okb reuse` does the same.", examples: ["okb reuse list"], args: [] },
    ],
  },
  {
    name: "term",
    group: "Planning",
    description: "Collects the important words of your domain, then decides what each one becomes.",
    forms: [
      { sub: "add", description: "Adds terms to the list.", examples: ["okb term add wine grape winery color"], args: [["<term>...", "text", "One or more terms. Quote multi-word terms."], ["--note", "text", "A note to keep with them."]] },
      { sub: "list", description: "Lists terms grouped by what you decided. Bare `okb term` does the same.", examples: ["okb term list"], args: [] },
      {
        sub: "set",
        description: "Decides what a term becomes.",
        examples: ["okb term set wine --as class", "okb term set vintage --as synonym --node Year"],
        args: [
          ["<term>", "text", "The term."],
          ["--as", "class, slot, instance, value, synonym or out-of-scope", "What it becomes."],
          ["--node", "name", "The class, slot or instance it became or points to."],
          ["--note", "text", "A note about the decision."],
        ],
      },
    ],
  },
  {
    name: "convention",
    group: "Modeling",
    description: "Sets how names are written, so the validator can check them. With no flags it shows the current choices.",
    forms: [{
      description: "Sets any of the options you pass.",
      examples: ["okb convention --class-case PascalCase --slot-case camelCase --number singular"],
      args: [
        ["--class-case", "text", "Case for class names, such as PascalCase."],
        ["--slot-case", "text", "Case for slot names, such as camelCase."],
        ["--instance-case", "text", "Case for instance names."],
        ["--number", "singular or plural", "Whether class names are singular or plural."],
        ["--slot-affix", "text", "A prefix or suffix every slot name carries, if any."],
      ],
    }],
  },
  {
    name: "class",
    group: "Modeling",
    description: "Creates and changes classes, the kinds of things in your domain.",
    forms: [
      {
        sub: "add",
        description: "Adds a class.",
        examples: ['okb class add RedWine --parent Wine --desc "Wine made with dark grapes"'],
        args: [
          ["<Name>", "text", NAME_DESC],
          ["--parent", "class", "A parent class. Repeat it for more."],
          ["--desc", "text", "A one-line description."],
          ["--synonym", "text", "Another name for it. Repeat it for more."],
          ["--abstract", "flag", "Mark it as a grouping with no members of its own."],
          ["--terminological", "flag", "Mark it as terminological."],
          ["--force", "flag", "Add it even if the name breaks your convention."],
        ],
      },
      {
        sub: "set",
        description: "Changes a class.",
        examples: ["okb class set RedWine --add-parent Beverage"],
        args: [
          ["<Class>", "class", "The class to change."],
          ["--desc", "text", "New description."],
          ["--add-parent", "class", "Add a parent."],
          ["--remove-parent", "class", "Remove a parent."],
          ["--synonym", "text", "Add a synonym."],
          ["--abstract", "true or false", "Whether it is abstract."],
          ["--terminological", "true or false", "Whether it is terminological."],
        ],
      },
      { sub: "disjoint", description: "Says that no one thing can belong to more than one of these classes.", examples: ["okb class disjoint RedWine WhiteWine RoseWine"], args: [["<Class>...", "classes", "Two or more classes."]] },
      {
        sub: "fix",
        description: "Gives every member of a class the same value for a slot.",
        examples: ["okb class fix DessertWine sugar=sweet"],
        args: [["<Class>", "class", "The class."], ["<slot=value>...", "slot=value", "The values every member has."]],
      },
      {
        sub: "default",
        description: "Gives a class a starting value for a slot that individual members can override.",
        examples: ["okb class default Wine body=full"],
        args: [["<Class>", "class", "The class."], ["<slot=value>...", "slot=value", "The starting values."]],
      },
      {
        sub: "restrict",
        description: "Narrows a slot for one class: fewer values, a limit on how many, or a narrower range.",
        examples: ["okb class restrict SingleVarietal grape --max 1"],
        args: [
          ["<Class>", "class", "The class."],
          ["<slot>", "slot", "The slot to narrow."],
          ["--values", "list", "Allowed values."],
          ["--min", "number", "The fewest values allowed."],
          ["--max", "number", "The most values allowed."],
          ["--range", "class", "Allowed classes, for a relationship."],
          ["--clear", "flag", "Remove the restriction."],
        ],
      },
    ],
  },
  {
    name: "tree",
    group: "Modeling",
    description: "Prints the class hierarchy as an indented tree.",
    forms: [{ description: "Shows each class under its parents.", examples: ["okb tree", "okb tree --instances"], args: [["--instances", "flag", "Show instances under their classes."]] }],
  },
  {
    name: "property",
    group: "Modeling",
    description: "A slot that holds a plain value, such as a number, text or one of a fixed list. It takes the same subcommands as `okb slot`.",
    forms: [{
      sub: "add",
      description: "Adds a property to a class.",
      examples: ["okb property add body --on Wine --type Enumerated --values light,medium,full --card single"],
      args: [
        ["<name>", "text", NAME_DESC],
        ["--on", "class", "The class it belongs to."],
        ["--type", "String, Integer, Float, Boolean or Enumerated", "What kind of value it holds."],
        ["--values", "list", "The allowed values, for Enumerated."],
        ["--card", "single or multiple", "Whether it holds one value or several."],
        ["--desc", "text", "A one-line description."],
      ],
    }],
  },
  {
    name: "relationship",
    group: "Modeling",
    description: "A slot that links one thing to another, such as a wine to its winery. Okb stores it as edges, so `maker` becomes `:MAKER`.",
    forms: [
      {
        sub: "add",
        description: "Adds a relationship between two classes.",
        examples: ["okb relationship add maker --from Wine --to Winery --card single"],
        args: [
          ["<name>", "text", NAME_DESC],
          ["--from", "class", "The class the relationship starts at."],
          ["--to", "class", "The class it points to."],
          ["--card", "single or multiple", "Whether it holds one target or several."],
        ],
      },
      {
        sub: "inverse",
        description: "Declares that two relationships are the same link read from opposite ends.",
        examples: ["okb relationship inverse maker produces"],
        args: [["<slotA>", "slot", "The relationship that is stored."], ["<slotB>", "slot", "Its inverse."]],
      },
      {
        sub: "property",
        description: "Adds a property to a relationship itself, such as the condition under which one thing is preferred over another.",
        examples: ["okb relationship property preferredOver condition --type String"],
        args: [
          ["<relationship>", "slot", "The relationship."],
          ["<name>", "text", "The property's name."],
          ["--type", "String, Integer, Float, Boolean or Enumerated", "What kind of value it holds."],
          ["--values", "list", "The allowed values, for Enumerated."],
          ["--required", "flag", "Every link must give it a value."],
          ["--desc", "text", "A one-line description."],
          ["--remove", "flag", "Remove the property."],
        ],
      },
    ],
  },
  {
    name: "slot",
    group: "Modeling",
    description: "Creates and changes slots, the properties and relationships of a class. `okb property` and `okb relationship` are friendlier names for the same command.",
    forms: [
      {
        sub: "add",
        description: "Adds a slot to a class.",
        examples: ["okb slot add body --on Wine --type Enumerated --values light,medium,full"],
        args: [
          ["<name>", "text", NAME_DESC],
          ["--on", "class", "A class it belongs to. Repeat it for more."],
          ["--type", "String, Integer, Float, Boolean, Enumerated or Instance", "What it holds. `Instance` makes it a relationship."],
          ["--values", "list", "The allowed values, for Enumerated."],
          ["--range", "class", "The class a relationship points to."],
          ["--card", "single or multiple", "Whether it holds one value or several."],
          ["--min", "number", "The fewest values allowed."],
          ["--max", "number", "The most values allowed."],
          ["--default", "text", "A starting value."],
          ["--desc", "text", "A one-line description."],
          ["--force", "flag", "Add it even if the name breaks your convention."],
        ],
      },
      {
        sub: "set",
        description: "Changes a slot. It takes every flag `add` takes, plus the ones below.",
        examples: ["okb slot set maker --card single --min 1", "okb slot set body --off Beverage"],
        args: [
          ["<slot>", "slot", "The slot to change."],
          ["--off", "class", "Take the slot off a class."],
          ["--add-range", "class", "Add a class a relationship can point to."],
          ["--remove-range", "class", "Remove one."],
          ["--on-rules", "flag", "Let rules set this slot."],
          ["--off-rules", "flag", "Stop rules setting this slot."],
        ],
      },
      { sub: "inverse", description: "Declares that two relationships are the same link read from opposite ends.", examples: ["okb slot inverse maker produces"], args: [["<slotA>", "slot", "The relationship that is stored."], ["<slotB>", "slot", "Its inverse."]] },
    ],
  },
  {
    name: "show",
    group: "Modeling",
    description: "Shows everything about one class, slot or instance: its parents, slots, values and links.",
    forms: [{
      description: "With no name it shows the ontology itself.",
      examples: ["okb show Wine", "okb show class:Genre"],
      args: [["[name]", "text", "The thing to show. When a class and a slot share a name, write `class:Genre` or `slot:genre`."]],
    }],
  },
  {
    name: "link",
    group: "Modeling",
    description: "Connects two instances (or an instance and a class) with a relationship.",
    forms: [{
      description: "Adds one link. Values for the relationship's own properties go at the end.",
      examples: ['okb link Radio preferredOver SegmentedControl condition="2 to 7 options"'],
      args: [
        ["<from>", "name", "Where the link starts."],
        ["<relationship>", "slot", "The relationship."],
        ["<to>", "name", "Where it ends."],
        ["<name=value>...", "name=value", "Values for the relationship's own properties."],
        ["--rule", "rule id", "The extracted rule this link comes from."],
        ["--clear", "text", "Remove a property value from the link."],
      ],
    }],
  },
  {
    name: "unlink",
    group: "Modeling",
    description: "Removes a link.",
    forms: [{ description: "Removes one link.", examples: ["okb unlink Radio preferredOver SegmentedControl"], args: [["<from>", "name", "Where the link starts."], ["<relationship>", "slot", "The relationship."], ["<to>", "name", "Where it ends."]] }],
  },
  {
    name: "instance",
    group: "Modeling",
    description: "Adds and changes instances, the individual things your classes describe.",
    forms: [
      {
        sub: "add",
        description: "Adds an instance and sets its values.",
        examples: ['okb instance add "Chateau Morgon Beaujolais" --of Beaujolais body=light maker="Chateau Morgon"'],
        args: [
          ["<Name>", "text", "The instance's name. Quote it if it has spaces."],
          ["--of", "class", "A class it belongs to. Repeat it for more."],
          ["--desc", "text", "A one-line description."],
          ["<slot=value>...", "slot=value", "Values for its slots."],
        ],
      },
      {
        sub: "set",
        description: "Changes an instance's values. Use `+=` to add a value, `-=` to remove one, and `slot=` to clear it.",
        examples: ['okb instance set "Chateau Morgon Beaujolais" grape+=Gamay', 'okb instance set "Chateau Morgon Beaujolais" --of Beaujolais'],
        args: [
          ["<Name>", "text", "The instance."],
          ["<slot=value>...", "slot=value", "The changes."],
          ["--of", "class", "Move it to another class."],
          ["--desc", "text", "New description."],
        ],
      },
    ],
  },
  {
    name: "review",
    group: "Reviewing and sharing",
    description: "Turns the rules only a person can judge into questions about your ontology. The ontology-review skill uses it.",
    forms: [{ description: "Lists the questions for the steps you have reached.", examples: ["okb review", "okb review --all --json"], args: [["--all", "flag", "Include every rule, not only the visible ones."], ["--json", "flag", "Print everything as JSON."]] }],
  },
  {
    name: "decision",
    group: "Reviewing and sharing",
    description: "Records a design decision, with the reason, so you and others can see why the ontology is the way it is.",
    forms: [
      {
        sub: "add",
        description: "Records a decision. A decision can waive a rule, which turns that rule's warning into a note.",
        examples: ['okb decision add --title "Wines are not foods" --decision "Keep them separate" --why "Pairing needs both"'],
        args: [
          ["--title", "text", "A short title."],
          ["--decision", "text", "What you decided."],
          ["--why", "text", "The reason."],
          ["--question", "text", "The question it answers."],
          ["--alt", "text", "An option you rejected. Repeat it for more."],
          ["--about", "name", "A class, slot or instance it concerns. Repeat it for more."],
          ["--waives", "rule key", "A rule it explains away. Repeat it for more."],
        ],
      },
      { sub: "list", description: "Lists the decisions. Bare `okb decision` does the same.", examples: ["okb decision list"], args: [] },
    ],
  },
  {
    name: "diagram",
    group: "Reviewing and sharing",
    description: "Draws the ontology as a Mermaid diagram you can open in GitHub or VS Code.",
    forms: [{ description: "Prints the diagram, or writes it to a file.", examples: ["okb diagram --out diagram.md"], args: [["--out", "path", "Write the diagram here instead of printing it."]] }],
  },
  {
    name: "export",
    group: "Reviewing and sharing",
    description: "Writes the ontology as JSON or as openCypher, ready for Neo4j, Neptune or Memgraph. Instances become nodes labeled with their classes.",
    forms: [{
      description: "Prints the export, or writes it to a file.",
      examples: ["okb export --format cypher --out wine.cypher"],
      args: [
        ["--format", "json or cypher", "The output format. Defaults to json."],
        ["--out", "path", "Write to this file instead of printing."],
        ["--with-schema", "flag", "Include classes and slots, not only instances."],
        ["--no-inherited", "flag", "Leave out values an instance inherits from its class."],
        ["--no-rules", "flag", "Leave out extracted rules."],
        ["--include-unverified", "flag", "Include rules and quotes that haven't been verified."],
      ],
    }],
  },
  {
    name: "docs",
    group: "Reviewing and sharing",
    description: "Writes Markdown reference pages for the ontology, so people can read its structure and rules without okb: an index, one page per class, a rules page and a sources page.",
    forms: [{
      description: "Writes `index.md` (scope, competency questions, class tree, decisions), `classes/<id>.md` (slots with allowed values, inherited and own rules with their quotes, instances, decisions), `rules.md` and `sources.md`. Every rule links to its quote on the sources page. Items have stable anchors made from their ids (`rule.breve` becomes `#rule-breve`), links are relative, and the output has no dates, so you can commit it and check it for drift. It replaces pages an earlier run wrote and leaves other files alone. It never changes the ontology.",
      examples: ["okb docs --out docs/kb"],
      args: [["--out", "folder", "Where to write the pages. Required; it is created if it doesn't exist."]],
    }],
  },
  {
    name: "source",
    group: "Working from documents",
    description: "Registers documents you are extracting from, so quotes and rules can point back to them.",
    forms: [
      {
        sub: "add",
        description: "Registers a Markdown or PDF file.",
        examples: ["okb source add docs/button.md --repo-url https://github.com/acme/ds/blob/main/button.md"],
        args: [
          ["<file>", "path", "A Markdown or PDF file."],
          ["--title", "text", "A title."],
          ["--repo-url", "url", "The file's address on GitHub."],
          ["--url", "url", "The address of the rendered page."],
          ["--id", "text", "Your own id for it."],
        ],
      },
      {
        sub: "outline",
        description: "Lists every block of a Markdown source with its heading path and line numbers, and shows which are already quoted.",
        examples: ["okb source outline button --quotable"],
        args: [["<source>", "name", "The source."], ["--quotable", "flag", "Show only blocks you can quote."], ["--problems", "flag", "Show only problems in the document."]],
      },
      {
        sub: "refresh",
        description: "Checks quotes again after the document changes. With `--all` it checks every source, reports quotes that are gone (with the rules and facts that cite them) or moved, and lists the new, changed and removed blocks as a worklist. It exits with code 1 when a quote is gone or a source can't be read.",
        examples: ["okb source refresh button", "okb source refresh --all", "okb source refresh --all --json --dry-run"],
        args: [
          ["[<source>]", "name", "The source to check (leave it out with --all)."],
          ["--all", "flag", "Check every source and list the worklist of new, changed and removed blocks."],
          ["--dry-run", "flag", "With --all: write nothing, not even moved quotes."],
          ["--record", "flag", "With --all: store the current blocks as the baseline once the worklist is dealt with."],
          ["--strict", "flag", "With --all: also exit with code 1 when the worklist isn't empty."],
        ],
      },
      { sub: "list", description: "Lists the sources. Bare `okb source` does the same.", examples: ["okb source list"], args: [] },
    ],
  },
  {
    name: "quote",
    group: "Working from documents",
    description: "Records a verbatim passage from a source. Okb finds it in the document for you.",
    forms: [
      {
        sub: "add",
        description: "Records one quote.",
        examples: ['okb quote add button "Use a primary button for the main action." --cites Button'],
        args: [
          ["<source>", "name", "The source it comes from."],
          ["<text>", "text", "The passage, word for word."],
          ["--cites", "node", "A node the quote supports. Repeat it for more."],
          ["--line", "number", "A line to look near, if the text appears more than once."],
          ["--allow-code", "flag", "Allow a quote from a code block."],
        ],
      },
      { sub: "list", description: "Lists the quotes. Bare `okb quote` does the same.", examples: ["okb quote list"], args: [] },
    ],
  },
  {
    name: "rule",
    group: "Working from documents",
    description: "Records a rule a document states, tied to the quote that supports it.",
    forms: [
      {
        sub: "add",
        description: "Records one rule.",
        examples: ['okb rule add --statement "Buttons SHOULD have one primary per page." --modality SHOULD --governs Button --cites quote.1'],
        args: [
          ["--statement", "text", "The rule, in one sentence."],
          ["--modality", "MUST, SHOULD, MAY, MUST_NOT or SHOULD_NOT", "How strong the document makes it."],
          ["--cites", "quote id", "The quote that supports it. Repeat it for more."],
          ["--governs", "class or slot", "What it applies to. Repeat it for more."],
          ["--name", "text", "A short name."],
          ["--authored", "flag", "You wrote it; the document doesn't state it."],
          ["--value", "slot=value", "A value it sets. Repeat it for more."],
          ["--refines", "rule id", "A broader rule this one narrows."],
          ["--adds", "text", "What this rule adds to the one it refines."],
        ],
      },
      {
        sub: "refines",
        description: "Says that one rule narrows another.",
        examples: ['okb rule refines rule.2 rule.1 --adds "Only inside dialogs"'],
        args: [["<rule>", "rule id", "The narrower rule."], ["<broader rule>", "rule id", "The rule it narrows."], ["--adds", "text", "What it adds."], ["--remove", "flag", "Remove the link."]],
      },
      { sub: "list", description: "Lists the rules. Bare `okb rule` does the same.", examples: ["okb rule list"], args: [] },
    ],
  },
  {
    name: "fulfills",
    group: "Working from documents",
    description: "Says that an instance follows a rule.",
    forms: [{ description: "Links the instance to the rule.", examples: ["okb fulfills SaveButton rule.1"], args: [["<instance>", "name", "The instance."], ["<rule>", "rule id", "The rule."], ["--remove", "flag", "Remove the link."]] }],
  },
  {
    name: "cite",
    group: "Working from documents",
    description: "Attaches a quote you already recorded to another node.",
    forms: [{ description: "Links the quote to the node.", examples: ["okb cite Button quote.4"], args: [["<node>", "name", "The class, slot, instance or rule."], ["<quote id>", "quote id", "The quote. `okb quote list` shows them."]] }],
  },
  {
    name: "verify",
    group: "Working from documents",
    description: "Records the result of an independent check that a node matches what its quote says, or approves it.",
    forms: [{
      description: "Sets a verification status, or approves the node.",
      examples: ["okb verify rule.1 --status SUPPORTED", "okb verify rule.1 --approve"],
      args: [
        ["<node>", "name", "The node to verify."],
        ["--status", "SUPPORTED, OVERREACH or UNSUPPORTED", "What the check found."],
        ["--corrected", "text", "A corrected wording, for OVERREACH."],
        ["--confidence", "verbatim or paraphrased", "How closely the node follows the quote."],
        ["--note", "text", "A note about the check."],
        ["--approve", "flag", "Approve it after review."],
      ],
    }],
  },
  {
    name: "skills",
    group: "Skills",
    description: "Puts the skills that come with okb where Claude Code and Cursor load them from, and checks that they match this okb.",
    forms: [
      {
        sub: "install",
        description: "Links the three skills into `~/.claude/skills/` (a link keeps them current when the package updates), or copies them. It replaces a link to an older okb, a broken link or an older copy. It refuses to touch a folder that is not one of okb's, and changes nothing if it refuses.",
        examples: ["okb skills install", "okb skills install --copy", "okb skills install --dir ~/.cursor/skills"],
        args: [
          ["--copy", "flag", "Copy the skill folders instead of linking to them. Run it again after you update okb."],
          ["--dir", "path", "The skills folder to use instead of `~/.claude/skills/`. The `OKB_SKILLS_DIR` environment variable sets it too."],
          ["--force", "flag", "Delete a folder or file that is not one of okb's skills (or a copy you edited) and put the skill in its place."],
        ],
      },
      {
        sub: "status",
        description: "Lists each skill with where it is installed and whether its version matches this okb. It exits with code 1 when any skill is missing or out of date.",
        examples: ["okb skills status", "okb skills status --dir ~/.cursor/skills"],
        args: [["--dir", "path", "The skills folder to check instead of `~/.claude/skills/`."]],
      },
    ],
  },
  {
    name: "rename",
    group: "Housekeeping",
    description: "Renames a class, slot or instance and updates everything that points to it.",
    forms: [{ description: "Renames one thing.", examples: ["okb rename Vino Wine"], args: [["<old name>", "name", "The current name."], ["<new name>", "text", "The new name."], ["--force", "flag", "Rename it even if the name breaks your convention."]] }],
  },
  {
    name: "remove",
    group: "Housekeeping",
    description: "Deletes a class, slot, instance, term or other node, with the edges that touch it.",
    forms: [{ description: "Deletes one thing.", examples: ["okb remove Vino", "okb remove genre --type Slot"], args: [["<name>", "name", "What to delete."], ["--type", "text", "Which kind, when a name is ambiguous: Class, Slot, Instance, Term and so on."]] }],
  },
  {
    name: "drift",
    group: "Housekeeping",
    description: "Compares quotes with the documents they came from and reports quotes that no longer match.",
    forms: [{ description: "Checks one or more ontology folders. With none it checks the current folder.", examples: ["okb drift .", "okb drift ../wine ../food"], args: [["[folder]...", "paths", "The ontology folders to check."]] }],
  },
  {
    name: "check",
    group: "Housekeeping",
    description: "Says whether a knowledge base is safe to merge: no validation errors, every quote still in its source, and nothing unverified, unsupported or waiting for approval. Exits non-zero when a check fails, so a CI job can gate on it.",
    forms: [{
      description: "Checks the current folder. It reads the folder and its source files and never changes them or takes the write lock. Warnings from `okb validate` don't block a merge. It also warns when the installed okb is older than the `okbVersion` the KB pins in okb.json.",
      examples: ["okb check", "okb check --json", "okb check -C ../wine"],
      args: [["--json", "flag", "Print the result as JSON: `ok`, the installed and pinned versions, and each check with its status, summary and problems."]],
    }],
  },
  {
    name: "pin",
    group: "Housekeeping",
    description: "Records the installed okb version in okb.json as `okbVersion`, so `okb check` warns anyone with an older okb and the CI workflow installs that version. Run it again after you upgrade okb.",
    forms: [{ description: "Pins the installed version.", examples: ["okb pin"], args: [] }],
  },
  {
    name: "diff",
    group: "Housekeeping",
    description: "Shows what changed in the knowledge between two versions of an ontology: added, removed, renamed and changed things, rules side by side, moved quotes and changed links, in words rather than JSON lines.",
    forms: [{
      description: "Each side is an ontology folder or a git ref. With one argument, the other side is the current folder, so `okb diff main` shows what this branch changes. It never modifies the folder or checks anything out. The output is Markdown, ready for a PR comment; createdAt and updatedAt changes are not reported.",
      examples: ["okb diff main", "okb diff v1.0 v1.1", "okb diff ../wine-old .", "okb diff main --json"],
      args: [
        ["<old>", "folder or git ref", "The earlier version. An existing folder is read as it is; anything else is a branch, tag or commit in the repository around the current folder. A name that is both is an error that shows both spellings (`./name` for the folder, `refs/heads/name` for the branch)."],
        ["[new]", "folder or git ref", "The later version. Defaults to the current folder."],
        ["--json", "flag", "Print the changes as JSON for other tools."],
      ],
    }],
  },
  {
    name: "release",
    group: "Housekeeping",
    description: "Cuts a numbered release of the knowledge base that other tools can pin: a manifest with the SHA-256 of every file and source, and a change log of what changed since the last release.",
    forms: [
      {
        description: "Writes `manifest.json` (the pin), `RELEASES.md` (every release's change log, newest first) and `releases/<version>/` (the files as released, plus `CHANGES.md` and `changes.json`), and records the version in `okb.json`. The change log is `okb diff` against the previous release's snapshot, so it lists renames with old and new names and renamed edge types. It stops, and writes nothing, if `okb validate` reports an error, if the version isn't newer than the last release, if a registered source file is missing or if nothing changed. Commit the files it writes.",
        examples: ["okb release 1.0.0", "okb release 1.1.0 --json"],
        args: [
          ["<version>", "semver", "The new version: `1.0.0`, `1.2.3` or `2.0.0-rc.1`. It must be higher than the version in `manifest.json`."],
          ["--json", "flag", "Print the version and the manifest as JSON."],
        ],
      },
      {
        sub: "verify",
        description: "Checks the files against `manifest.json`: every pinned file must exist and match its SHA-256, and `okb.json` must carry the manifest's version. It changes nothing. It exits 1 when something differs, so it can run in CI or before a server starts.",
        examples: ["okb release verify", "okb release verify -C ../wine --json"],
        args: [["--json", "flag", "Print the result as JSON."]],
      },
    ],
  },
  {
    name: "help",
    group: "Housekeeping",
    description: "Prints a one-screen summary of the commands. `okb --help` and `okb -h` do the same.",
    forms: [{ description: "Prints the summary.", examples: ["okb help"], args: [] }],
  },
  {
    name: "version",
    group: "Housekeeping",
    description: "Prints the okb version and the version of the rules it carries. `okb --version` does the same.",
    forms: [{ description: "Prints both versions.", examples: ["okb version"], args: [] }],
  },
];

/** The commands you need most, for the cheat sheet. Each example's command must exist above. */
export const CHEAT_SHEET: { example: string; description: string }[] = [
  { example: 'okb init wine --name "Wine and Food"', description: "Start a new ontology" },
  { example: "okb status", description: "See where you are and what to do next" },
  { example: "okb step next", description: "Move on to the next step" },
  { example: "okb explain class", description: "Learn what a term or rule means" },
  { example: "okb validate", description: "Check your ontology against the rules" },
  { example: 'okb scope --domain "..." --purpose "..."', description: "Record what the ontology is for" },
  { example: 'okb cq add "Which wines go with fish?"', description: "Add a competency question" },
  { example: 'okb reuse none --why "..."', description: "Record that nothing existing fits" },
  { example: "okb term add wine grape winery", description: "Collect the words of your domain" },
  { example: "okb class add RedWine --parent Wine", description: "Add a class" },
  { example: "okb tree", description: "See the class hierarchy" },
  { example: "okb property add body --on Wine --type Enumerated --values light,full", description: "Add a plain-value slot" },
  { example: "okb relationship add maker --from Wine --to Winery", description: "Add a link between classes" },
  { example: "okb slot set maker --card single --min 1", description: "Tighten a slot" },
  { example: "okb show Wine", description: "See everything about one class, slot or instance" },
  { example: 'okb instance add "Chateau Morgon" --of Beaujolais body=light', description: "Add an instance" },
  { example: "okb link Radio preferredOver SegmentedControl", description: "Connect two instances" },
  { example: "okb review", description: "Get questions only a person can judge" },
  { example: 'okb decision add --title "..." --decision "..." --why "..."', description: "Record a design decision" },
  { example: "okb diagram --out diagram.md", description: "Draw the ontology" },
  { example: "okb export --format cypher --out wine.cypher", description: "Export for a graph database" },
  { example: "okb source add docs/button.md", description: "Register a document to extract from" },
  { example: 'okb quote add button "verbatim text" --cites Button', description: "Record a quote" },
  { example: 'okb rule add --statement "..." --modality SHOULD --cites quote.1', description: "Record a rule a document states" },
  { example: "okb verify rule.1 --status SUPPORTED", description: "Record an independent check" },
  { example: "okb skills install", description: "Install the Claude skills that ship with okb" },
  { example: "okb rename Vino Wine", description: "Rename something everywhere" },
  { example: "okb remove Vino", description: "Delete something" },
];
