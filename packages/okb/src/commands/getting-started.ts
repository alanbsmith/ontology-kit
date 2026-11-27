/** Getting started: create an ontology, see where you are, learn a concept, check your work. */
import { type Command, opt } from "../command-table.ts";
import { MetaKB } from "../metakb.ts";
import { listExplainable, renderExplainHits, renderFindings, renderInit, renderSearchHits, renderStatus, renderStepGuide, renderStepMove } from "../render.ts";
import { currentStep, explainData, initOntology, moveToStep, status, validate } from "../workflows.ts";

const { str, strs, bool } = opt;

export const gettingStarted: Command[] = [
  {
    name: "init",
    group: "Getting started",
    summary: "create a new ontology",
    description: "Creates a new ontology folder with the starting files and shows the guide for step 1.",
    forms: [
      {
        description: "Creates the folder, then tells you what to do first.",
        examples: ["okb init wine --name \"Wine and Food\""],
        args: [
          ["<folder>", "path", "Where to create the ontology."],
          ["--name", "text", "The ontology's name. Defaults to the folder name."],
        ],
        options: { name: str },
        usage: 'Usage: okb init <folder> --name "My Ontology"',
        min: 1,
        cheat: { example: "okb init wine --name \"Wine and Food\"", description: "Start a new ontology" },
        run: (ctx) => {
          const [folder] = ctx.args;
          const name = ctx.opts.name ?? folder;
          const { ont, guide } = initOntology(folder, name);
          ctx.print(renderInit(name, ont.root, folder, guide));
        },
      },
    ],
  },
  {
    name: "status",
    group: "Getting started",
    summary: "where you are and what to do next",
    description: "Shows which step you are on, what is done, and what to do next.",
    forms: [
      {
        description: "Prints every step with its checklist, plus a count of validator findings.",
        examples: ["okb status"],
        args: [],
        cheat: { example: "okb status", description: "See where you are and what to do next" },
        run: async (ctx) => {
          const ont = ctx.load();
          const s = await status(ont);
          ctx.emit(() => s.data, () => renderStatus(ont, s.findings, s.st));
        },
      },
    ],
  },
  {
    name: "step",
    group: "Getting started",
    summary: "move between steps and show the guide",
    description: "Moves between the eight steps and shows the guide for a step.",
    forms: [
      {
        description: "With no argument it shows the guide for your current step. With one, it moves you there.",
        examples: ["okb step", "okb step next", "okb step 4"],
        args: [
          ["[n|next|prev]", "number or word", "The step to move to: 1 to 8, `next`, or `prev`. Moving on with a step unfinished is allowed."],
        ],
        cheat: { example: "okb step next", description: "Move on to the next step" },
        run: (ctx) => {
          const [which] = ctx.args;
          if (which) {
            const { target, leaving } = moveToStep(ctx.dir, which);
            ctx.print(renderStepMove(target, leaving));
          } else ctx.print(renderStepGuide(currentStep(ctx.dir)));
        },
      },
    ],
  },
  {
    name: "explain",
    group: "Getting started",
    summary: "learn a concept, rule, step or decision guide",
    description: "Explains a concept, rule, step or decision guide in plain language.",
    forms: [
      {
        description: "With no argument it lists everything you can ask about.",
        examples: ["okb explain class", "okb explain 5", "okb explain --search inverse"],
        args: [
          ["[topic]", "text", "A concept, rule key, step number or decision guide."],
          ["--search", "text", "Find entries that mention these words instead."],
        ],
        options: { search: str },
        cheat: { example: "okb explain class", description: "Learn what a term or rule means" },
        run: (ctx) => {
          const meta = MetaKB.get();
          const { search } = ctx.opts;
          if (search) return ctx.print(renderSearchHits(meta.search(search.replace(/[-_]/g, " ")), search));
          if (!ctx.args.length) return ctx.print(listExplainable());
          const q = ctx.args.join(" ");
          const hits = meta.resolve(q);
          ctx.emit(() => explainData(hits), () => renderExplainHits(hits, q));
        },
      },
    ],
  },
  {
    name: "validate",
    group: "Getting started",
    summary: "check your ontology against the rules",
    description: "Checks your ontology against the rules. Errors make the command exit with code 1.",
    forms: [
      {
        description: "By default it shows errors, plus warnings and hints for the steps you have reached.",
        examples: ["okb validate", "okb validate --all --why"],
        args: [
          ["--all", "flag", "Include warnings and hints from steps you haven't reached."],
          ["--why", "flag", "Show why each rule exists."],
          ["--rule", "rule key", "Run only this rule. Repeat it for more."],
          ["--strict", "flag", "Also exit with code 1 on warnings."],
          ["--json", "flag", "Print the findings as JSON."],
        ],
        options: { all: bool, why: bool, rule: strs, strict: bool },
        cheat: { example: "okb validate", description: "Check your ontology against the rules" },
        run: async (ctx) => {
          const o = ctx.opts;
          const ont = ctx.load();
          const v = await validate(ont, { all: o.all, rule: o.rule, strict: o.strict });
          ctx.emit(() => v.data, () => renderFindings(v.findings, v.hiddenLater, ont, { all: o.all, verbose: o.why }));
          ctx.exit(v.fail ? 1 : 0);
        },
      },
    ],
  },
];
