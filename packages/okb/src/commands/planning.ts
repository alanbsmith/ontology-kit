/** Planning: scope, competency questions, reuse and terms (steps 1 to 3). */
import { type Command, opt } from "../command-table.ts";
import { type CompetencyQuestionNode } from "@ontology-kit/reader";
import * as ops from "../ops.ts";
import { renderQuestions, renderReuse, renderScope, renderTerms } from "../render.ts";

const { str, strs } = opt;

const SCOPE_OPTIONS = { name: str, domain: str, purpose: str, users: strs, maintainers: strs, "out-of-scope": strs, kind: str } as const;

export const planning: Command[] = [
  {
    name: "scope",
    group: "Planning",
    summary: "record the domain, purpose and users",
    description: "Records the domain, purpose, users and boundaries of the ontology. With no flags it shows what you have.",
    forms: [
      {
        description: "Sets any of the fields you pass and prints the result.",
        examples: ["okb scope --domain \"Wine and food pairing\" --purpose \"Recommend wines for a meal\" --users sommeliers,cooks"],
        args: [
          ["--domain", "text", "What the ontology covers."],
          ["--purpose", "text", "What it is for."],
          ["--users", "list", "Who will use it."],
          ["--maintainers", "list", "Who keeps it up to date."],
          ["--out-of-scope", "list", "What it deliberately leaves out."],
          ["--kind", "text", "The kind of ontology, such as a domain ontology."],
          ["--name", "text", "Rename the ontology."],
        ],
        options: SCOPE_OPTIONS,
        cheat: { example: "okb scope --domain \"...\" --purpose \"...\"", description: "Record what the ontology is for" },
        run: (ctx) => {
          const o = ctx.opts;
          const touched = Object.keys(SCOPE_OPTIONS).some((k) => o[k] !== undefined);
          const ont = touched
            ? ctx.edit((ont) => {
              ops.setScope(ont, { name: o.name, domain: o.domain, purpose: o.purpose, users: o.users, maintainers: o.maintainers, outOfScope: o["out-of-scope"], kind: o.kind });
              ont.save();
              return ont;
            })
            : ctx.load();
          ctx.emit(() => ont.meta, () => renderScope(ont.meta));
        },
      },
    ],
  },
  {
    name: "cq",
    group: "Planning",
    summary: "competency questions",
    description: "Manages competency questions: the questions your ontology must be able to answer.",
    bare: "list",
    forms: [
      {
        sub: "add",
        description: "Adds one or more questions.",
        examples: ["okb cq add \"Which wines go with fish?\""],
        args: [
          ["<question>", "text", "The question. Quote it."],
        ],
        usage: 'Usage: okb cq add "Your question?"',
        min: 1,
        cheat: { example: "okb cq add \"Which wines go with fish?\"", description: "Add a competency question" },
        run: (ctx) => ctx.mutate((ont) => ctx.args.flatMap((t) => ops.addCQ(ont, t))),
      },
      {
        sub: "list",
        description: "Lists the questions and what each one needs. Bare `okb cq` does the same.",
        examples: ["okb cq list"],
        args: [],
        run: (ctx) => {
          const ont = ctx.load();
          const qs = ont.numbered("CompetencyQuestion") as CompetencyQuestionNode[];
          ctx.emit(() => qs.map((q) => ({ ...q, needs: ont.targets(q.id, "NEEDS") })), () => renderQuestions(ont, qs));
        },
      },
      {
        sub: "link",
        description: "Says which classes, slots or instances a question needs. Use `unlink` to undo it.",
        examples: ["okb cq link 1 Wine Food goesWellWith"],
        args: [
          ["<number>", "number", "The question's number."],
          ["<name>...", "names", "The classes, slots or instances it needs."],
        ],
        usage: "Usage: okb cq link <question number> <Class|slot|instance>...",
        min: 2,
        run: (ctx) => ctx.mutate((ont) => ops.linkCQ(ont, ctx.args[0], ctx.args.slice(1), false)),
      },
      {
        sub: "set",
        description: "Changes a question's text or marks it answerable.",
        examples: ["okb cq set 1 --status answerable"],
        args: [
          ["<number>", "number", "The question's number."],
          ["--text", "text", "New wording."],
          ["--status", "draft or answerable", "Whether the ontology can answer it yet."],
        ],
        options: { text: str, status: str },
        run: (ctx) => ctx.mutate((ont) => ops.setCQ(ont, ctx.args[0], { text: ctx.opts.text, status: ctx.opts.status })),
      },
      {
        sub: "remove",
        description: "Deletes a question.",
        examples: ["okb cq remove 3"],
        args: [
          ["<number>", "number", "The question's number."],
        ],
        run: (ctx) => ctx.mutate((ont) => ops.remove(ont, ctx.args[0], ["CompetencyQuestion"])),
      },
      {
        sub: "unlink",
        description: "",
        examples: [],
        args: [],
        usage: "Usage: okb cq unlink <question number> <Class|slot|instance>...",
        min: 2,
        hidden: true,
        run: (ctx) => ctx.mutate((ont) => ops.linkCQ(ont, ctx.args[0], ctx.args.slice(1), true)),
      },
    ],
  },
  {
    name: "reuse",
    group: "Planning",
    summary: "record existing ontologies you considered",
    description: "Records which existing ontologies you looked at and what you decided about each.",
    bare: "list",
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
        options: { name: str, url: str, decision: str, notes: str },
        usage: "Usage: okb reuse add --name ... --decision reuse|adapt|reference|rejected [--url ...] [--notes ...]",
        require: ["name", "decision"],
        run: (ctx) => ctx.mutate((ont) => ops.addReuse(ont, { name: ctx.opts.name, url: ctx.opts.url, decision: ctx.opts.decision, notes: ctx.opts.notes })),
      },
      {
        sub: "none",
        description: "Records that you looked and found nothing that fits.",
        examples: ["okb reuse none --why \"Checked schema.org and FOAF; neither covers wine.\""],
        args: [
          ["--why", "text", "What you looked at and why nothing fit."],
        ],
        options: { why: str },
        usage: 'Usage: okb reuse none --why "what you looked at and why nothing fit"',
        require: ["why"],
        cheat: { example: "okb reuse none --why \"...\"", description: "Record that nothing existing fits" },
        run: (ctx) => ctx.mutate((ont) => ops.reuseNone(ont, ctx.opts.why)),
      },
      {
        sub: "list",
        description: "Lists what you recorded. Bare `okb reuse` does the same.",
        examples: ["okb reuse list"],
        args: [],
        run: (ctx) => ctx.print(renderReuse(ctx.load())),
      },
    ],
  },
  {
    name: "term",
    group: "Planning",
    summary: "collect the words of your domain",
    description: "Collects the important words of your domain, then decides what each one becomes.",
    bare: "list",
    forms: [
      {
        sub: "add",
        description: "Adds terms to the list.",
        examples: ["okb term add wine grape winery color"],
        args: [
          ["<term>...", "text", "One or more terms. Quote multi-word terms."],
          ["--note", "text", "A note to keep with them."],
        ],
        options: { note: str },
        usage: "Usage: okb term add <term> [<term>...]   (quote multi-word terms)",
        min: 1,
        cheat: { example: "okb term add wine grape winery", description: "Collect the words of your domain" },
        run: (ctx) => ctx.mutate((ont) => ops.addTerms(ont, ctx.args, ctx.opts.note)),
      },
      {
        sub: "list",
        description: "Lists terms grouped by what you decided. Bare `okb term` does the same.",
        examples: ["okb term list"],
        args: [],
        run: (ctx) => {
          const ont = ctx.load();
          ctx.emit(() => ont.ofType("Term"), () => renderTerms(ont));
        },
      },
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
        options: { as: str, node: str, note: str },
        usage: "Usage: okb term set <term> --as class|slot|instance|value|synonym|out-of-scope [--node Name]",
        min: 1,
        require: ["as"],
        run: (ctx) => ctx.mutate((ont) => ops.setTerm(ont, ctx.args[0], ctx.opts.as, ctx.opts.node, ctx.opts.note)),
      },
    ],
  },
];
