/** Modeling: conventions, classes, slots, links and instances (steps 4 to 7). */
import { type Command, type Ctx, NAME_DESC, opt, tri } from "../command-table.ts";
import * as ops from "../ops.ts";
import { renderConvention, show, tree } from "../render.ts";
import { setInstance, showData } from "../workflows.ts";

const { str, strs, bool } = opt;

/** The slot options both `slot add` and `slot set` take, as the op wants them. */
const slotOpts = (ctx: Ctx): ops.SlotOpts => {
  const o = ctx.opts;
  return {
    on: o.on, off: o.off, type: o.type, values: o.values, range: o.range, addRange: o["add-range"], removeRange: o["remove-range"],
    card: o.card, min: ctx.int("min"), max: ctx.int("max"), default: o.default, description: o.desc, force: o.force, onRules: o["on-rules"], offRules: o["off-rules"],
  };
};

/** `okb relationship ...` is `okb slot ...` for a slot whose values are instances; `--from`/`--to` are `--on`/`--range`. */
const relationshipRewrite = (rest: string[]): string[] => {
  const words = rest.map((w, i) => (i === 0 ? w : w === "--from" ? "--on" : w === "--to" ? "--range" : w));
  if (rest[0] === "add") words.push("--type", "Instance");
  return [rest[0] === "property" ? "edgeprop" : "slot", ...words];
};

export const modeling: Command[] = [
  {
    name: "convention",
    group: "Modeling",
    summary: "set how names are written",
    description: "Sets how names are written, so the validator can check them. With no flags it shows the current choices.",
    forms: [
      {
        description: "Sets any of the options you pass.",
        examples: ["okb convention --class-case PascalCase --slot-case camelCase --number singular"],
        args: [
          ["--class-case", "text", "Case for class names, such as PascalCase."],
          ["--slot-case", "text", "Case for slot names, such as camelCase."],
          ["--instance-case", "text", "Case for instance names."],
          ["--number", "singular or plural", "Whether class names are singular or plural."],
          ["--slot-affix", "text", "A prefix or suffix every slot name carries, if any."],
        ],
        options: { "class-case": str, "slot-case": str, "instance-case": str, number: str, "slot-affix": str },
        run: (ctx) => {
          const o = ctx.opts;
          ctx.mutate((ont) => {
            const notes = ops.setConventions(ont, { classCase: o["class-case"], slotCase: o["slot-case"], instanceCase: o["instance-case"], classNumber: o.number, slotAffix: o["slot-affix"] });
            return [renderConvention(ont), ...notes];
          });
        },
      },
    ],
  },
  {
    name: "class",
    group: "Modeling",
    summary: "create and change classes",
    description: "Creates and changes classes, the kinds of things in your domain.",
    forms: [
      {
        sub: "add",
        description: "Adds a class.",
        examples: ["okb class add RedWine --parent Wine --desc \"Wine made with dark grapes\""],
        args: [
          ["<Name>", "text", NAME_DESC],
          ["--parent", "class", "A parent class. Repeat it for more."],
          ["--desc", "text", "A one-line description."],
          ["--synonym", "text", "Another name for it. Repeat it for more."],
          ["--abstract", "flag", "Mark it as a grouping with no members of its own."],
          ["--terminological", "flag", "Mark it as terminological."],
          ["--force", "flag", "Add it even if the name breaks your convention."],
        ],
        options: { parent: strs, desc: str, synonym: strs, abstract: bool, terminological: bool, force: bool },
        usage: "Usage: okb class add <Name> [--parent P] [--desc ...]",
        min: 1,
        cheat: { example: "okb class add RedWine --parent Wine", description: "Add a class" },
        run: (ctx) => {
          const o = ctx.opts;
          ctx.mutate((ont) => ops.addClass(ont, ctx.args[0], { parents: o.parent, description: o.desc, synonyms: o.synonym, abstract: o.abstract, terminological: o.terminological, force: o.force }));
        },
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
        options: { desc: str, "add-parent": strs, "remove-parent": strs, synonym: strs, abstract: str, terminological: str },
        usage: "Usage: okb class set <Class> [--desc ...] [--add-parent P] [--remove-parent P] [--synonym S] [--abstract true|false]",
        min: 1,
        run: (ctx) => {
          const o = ctx.opts;
          ctx.mutate((ont) => ops.setClass(ont, ctx.args[0], { description: o.desc, addParents: o["add-parent"], removeParents: o["remove-parent"], synonyms: o.synonym, abstract: tri(o.abstract), terminological: tri(o.terminological) }));
        },
      },
      {
        sub: "disjoint",
        description: "Says that no one thing can belong to more than one of these classes.",
        examples: ["okb class disjoint RedWine WhiteWine RoseWine"],
        args: [
          ["<Class>...", "classes", "Two or more classes."],
        ],
        run: (ctx) => ctx.mutate((ont) => ops.disjoint(ont, ctx.args)),
      },
      {
        sub: "fix",
        description: "Gives every member of a class the same value for a slot.",
        examples: ["okb class fix DessertWine sugar=sweet"],
        args: [
          ["<Class>", "class", "The class."],
          ["<slot=value>...", "slot=value", "The values every member has."],
        ],
        usage: "Usage: okb class fix <Class> slot=value ...",
        min: 2,
        run: (ctx) => ctx.mutate((ont) => ops.assign(ont, ont.find(ctx.args[0], "Class").id, ctx.args.slice(1), "fixed")),
      },
      {
        sub: "default",
        description: "Gives a class a starting value for a slot that individual members can override.",
        examples: ["okb class default Wine body=full"],
        args: [
          ["<Class>", "class", "The class."],
          ["<slot=value>...", "slot=value", "The starting values."],
        ],
        usage: "Usage: okb class default <Class> slot=value ...",
        min: 2,
        run: (ctx) => ctx.mutate((ont) => ops.classDefault(ont, ctx.args[0], ctx.args.slice(1))),
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
        options: { values: strs, min: str, max: str, range: strs, clear: bool },
        usage: "Usage: okb class restrict <Class> <slot> [--values a,b] [--min N] [--max N] [--range C] [--clear]",
        min: 2,
        run: (ctx) => {
          const o = ctx.opts;
          ctx.mutate((ont) => ops.restrict(ont, ctx.args[0], ctx.args[1], { values: o.values, min: ctx.int("min"), max: ctx.int("max"), range: o.range, clear: o.clear }));
        },
      },
    ],
  },
  {
    name: "tree",
    group: "Modeling",
    summary: "show the class hierarchy",
    description: "Prints the class hierarchy as an indented tree.",
    forms: [
      {
        description: "Shows each class under its parents.",
        examples: ["okb tree", "okb tree --instances"],
        args: [
          ["--instances", "flag", "Show instances under their classes."],
        ],
        options: { instances: bool },
        cheat: { example: "okb tree", description: "See the class hierarchy" },
        run: (ctx) => ctx.print(tree(ctx.load(), ctx.opts.instances)),
      },
    ],
  },
  {
    name: "property",
    group: "Modeling",
    summary: "add a slot that holds a plain value",
    description: "A slot that holds a plain value, such as a number, text or one of a fixed list. It takes the same subcommands as `okb slot`.",
    rewrite: (rest) => ["slot", ...rest],
    forms: [
      {
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
        cheat: { example: "okb property add body --on Wine --type Enumerated --values light,full", description: "Add a plain-value slot" },
      },
    ],
  },
  {
    name: "relationship",
    group: "Modeling",
    summary: "add a slot that links things",
    description: "A slot that links one thing to another, such as a wine to its winery. Okb stores it as edges, so `maker` becomes `:MAKER`.",
    rewrite: relationshipRewrite,
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
        cheat: { example: "okb relationship add maker --from Wine --to Winery", description: "Add a link between classes" },
      },
      {
        sub: "inverse",
        description: "Declares that two relationships are the same link read from opposite ends.",
        examples: ["okb relationship inverse maker produces"],
        args: [
          ["<slotA>", "slot", "The relationship that is stored."],
          ["<slotB>", "slot", "Its inverse."],
        ],
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
    summary: "create and change slots",
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
        options: { on: strs, off: strs, type: str, values: strs, range: strs, "add-range": strs, "remove-range": strs, card: str, min: str, max: str, default: str, desc: str, force: bool, "on-rules": bool, "off-rules": bool },
        usage: "Usage: okb slot add <name> --on <Class> --type <Type> [--card single|multiple] ...",
        min: 1,
        run: (ctx) => ctx.mutate((ont) => ops.addSlot(ont, ctx.args[0], slotOpts(ctx))),
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
        options: { on: strs, off: strs, type: str, values: strs, range: strs, "add-range": strs, "remove-range": strs, card: str, min: str, max: str, default: str, desc: str, force: bool, "on-rules": bool, "off-rules": bool },
        usage: "Usage: okb slot set <slot> [--on C] [--type T] [--values a,b] [--range C] [--card single|multiple] ...",
        min: 1,
        cheat: { example: "okb slot set maker --card single --min 1", description: "Tighten a slot" },
        run: (ctx) => ctx.mutate((ont) => ops.updateSlot(ont, ctx.args[0], slotOpts(ctx))),
      },
      {
        sub: "inverse",
        description: "Declares that two relationships are the same link read from opposite ends.",
        examples: ["okb slot inverse maker produces"],
        args: [
          ["<slotA>", "slot", "The relationship that is stored."],
          ["<slotB>", "slot", "Its inverse."],
        ],
        usage: "Usage: okb slot inverse <slotA> <slotB>",
        min: 2,
        max: 2,
        run: (ctx) => ctx.mutate((ont) => ops.inverse(ont, ctx.args[0], ctx.args[1])),
      },
    ],
  },
  {
    name: "show",
    group: "Modeling",
    summary: "everything about one class, slot or instance",
    description: "Shows everything about one class, slot or instance: its parents, slots, values and links.",
    forms: [
      {
        description: "With no name it shows the ontology itself.",
        examples: ["okb show Wine", "okb show class:Genre"],
        args: [
          ["[name]", "text", "The thing to show. When a class and a slot share a name, write `class:Genre` or `slot:genre`."],
        ],
        cheat: { example: "okb show Wine", description: "See everything about one class, slot or instance" },
        run: (ctx) => {
          const ont = ctx.load();
          const n = ont.find(ctx.args[0] ?? "ontology");
          ctx.emit(() => showData(ont, n), () => show(ont, n));
        },
      },
    ],
  },
  {
    name: "link",
    group: "Modeling",
    summary: "connect two instances",
    description: "Connects two instances (or an instance and a class) with a relationship.",
    forms: [
      {
        description: "Adds one link. Values for the relationship's own properties go at the end.",
        examples: ["okb link Radio preferredOver SegmentedControl condition=\"2 to 7 options\""],
        args: [
          ["<from>", "name", "Where the link starts."],
          ["<relationship>", "slot", "The relationship."],
          ["<to>", "name", "Where it ends."],
          ["<name=value>...", "name=value", "Values for the relationship's own properties."],
          ["--rule", "rule id", "The extracted rule this link comes from."],
          ["--clear", "text", "Remove a property value from the link."],
        ],
        options: { rule: str, clear: strs },
        usage: 'Usage: okb link <from> <relationship> <to> [name=value ...] [--rule <rule id>] [--clear name]',
        min: 3,
        cheat: { example: "okb link Radio preferredOver SegmentedControl", description: "Connect two instances" },
        run: (ctx) => {
          const [from, relationship, to, ...props] = ctx.args;
          ctx.mutate((ont) => ops.link(ont, from, relationship, to, { props, rule: ctx.opts.rule, clear: ctx.opts.clear }));
        },
      },
    ],
  },
  {
    name: "unlink",
    group: "Modeling",
    summary: "remove a link",
    description: "Removes a link.",
    forms: [
      {
        description: "Removes one link.",
        examples: ["okb unlink Radio preferredOver SegmentedControl"],
        args: [
          ["<from>", "name", "Where the link starts."],
          ["<relationship>", "slot", "The relationship."],
          ["<to>", "name", "Where it ends."],
        ],
        usage: "Usage: okb unlink <from> <relationship> <to>",
        min: 3,
        max: 3,
        run: (ctx) => ctx.mutate((ont) => ops.unlink(ont, ctx.args[0], ctx.args[1], ctx.args[2])),
      },
    ],
  },
  {
    name: "instance",
    group: "Modeling",
    summary: "add and change instances",
    description: "Adds and changes instances, the individual things your classes describe.",
    forms: [
      {
        sub: "add",
        description: "Adds an instance and sets its values.",
        examples: ["okb instance add \"Chateau Morgon Beaujolais\" --of Beaujolais body=light maker=\"Chateau Morgon\""],
        args: [
          ["<Name>", "text", "The instance's name. Quote it if it has spaces."],
          ["--of", "class", "A class it belongs to. Repeat it for more."],
          ["--desc", "text", "A one-line description."],
          ["<slot=value>...", "slot=value", "Values for its slots."],
        ],
        options: { of: strs, desc: str },
        usage: 'Usage: okb instance add "Name" --of <Class> [slot=value ...]',
        min: 1,
        cheat: { example: "okb instance add \"Chateau Morgon\" --of Beaujolais body=light", description: "Add an instance" },
        run: (ctx) => ctx.mutate((ont) => ops.addInstance(ont, ctx.args[0], { of: ctx.opts.of, description: ctx.opts.desc, assignments: ctx.args.slice(1) })),
      },
      {
        sub: "set",
        description: "Changes an instance's values. Use `+=` to add a value, `-=` to remove one, and `slot=` to clear it.",
        examples: ["okb instance set \"Chateau Morgon Beaujolais\" grape+=Gamay", "okb instance set \"Chateau Morgon Beaujolais\" --of Beaujolais"],
        args: [
          ["<Name>", "text", "The instance."],
          ["<slot=value>...", "slot=value", "The changes."],
          ["--of", "class", "Move it to another class."],
          ["--desc", "text", "New description."],
        ],
        options: { of: strs, desc: str },
        usage: 'Usage: okb instance set "Name" slot=value ... [--of <Class>]',
        min: 1,
        run: (ctx) => ctx.mutate((ont) => setInstance(ont, ctx.args[0], { of: ctx.opts.of, desc: ctx.opts.desc, assignments: ctx.args.slice(1) })),
      },
    ],
  },
  {
    name: "edgeprop",
    group: "Modeling",
    description: "Declares a property on a relationship. Reached through okb relationship property.",
    hidden: true,
    forms: [
      {
        sub: "property",
        description: "",
        examples: [],
        args: [],
        options: { type: str, values: strs, required: bool, desc: str, remove: bool },
        usage: "Usage: okb relationship property <relationship> <name> --type String|Integer|Float|Boolean|Enumerated [--values a,b] [--required] [--desc ...] [--remove]",
        min: 2,
        max: 2,
        hidden: true,
        run: (ctx) => {
        const o = ctx.opts;
        ctx.mutate((ont) => ops.declareEdgeProperty(ont, ctx.args[0], ctx.args[1], { type: o.type, values: o.values, required: o.required, description: o.desc, remove: o.remove }));
      },
      },
    ],
  },
];
