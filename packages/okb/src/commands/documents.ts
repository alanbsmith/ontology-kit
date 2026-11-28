/** Working from documents: sources, quotes, rules extracted from them, and verification. */
import { type Command, opt } from "../command-table.ts";
import { OkbError } from "@ontology-kit/reader";
import * as prov from "../provenance.ts";
import { formatNotes, renderOutline, renderQuotes, renderRules, renderSources } from "../render.ts";
import { renderResync } from "../resync.ts";
import { outline, quotes, refreshAll } from "../workflows.ts";

const { str, strs, bool } = opt;

export const documents: Command[] = [
  {
    name: "source",
    group: "Working from documents",
    summary: "register documents to extract from",
    description: "Registers documents you are extracting from, so quotes and rules can point back to them.",
    bare: "list",
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
        options: { title: str, url: str, "repo-url": str, id: str },
        usage: "Usage: okb source add <file.md|file.pdf> [--title ...] [--repo-url <GitHub file URL>] [--url <rendered page URL>]",
        min: 1,
        cheat: { example: "okb source add docs/button.md", description: "Register a document to extract from" },
        run: (ctx) => {
          const o = ctx.opts;
          ctx.mutate((ont) => prov.addSource(ont, ctx.args[0], { title: o.title, url: o.url, repoUrl: o["repo-url"], id: o.id }));
        },
      },
      {
        sub: "outline",
        description: "Lists every block of a Markdown source with its heading path and line numbers, and shows which are already quoted.",
        examples: ["okb source outline button --quotable"],
        args: [
          ["<source>", "name", "The source."],
          ["--quotable", "flag", "Show only blocks you can quote."],
          ["--problems", "flag", "Show only problems in the document."],
        ],
        options: { quotable: bool, problems: bool },
        run: (ctx) => {
          const o = outline(ctx.load(), ctx.args[0], { quotable: ctx.opts.quotable });
          ctx.emit(o.data, () => renderOutline(o.src, o.doc, o.blocks, o.quoted, ctx.opts.problems));
        },
      },
      {
        sub: "refresh",
        description: "Checks quotes again after the document changes. With `--all` it checks every source, reports quotes that are gone (with the rules and facts that cite them) or moved, and lists the new, changed and removed blocks as a worklist. With `--all` it exits with code 1 when a quote is gone or a source can't be read (a single source only reports).",
        examples: ["okb source refresh button", "okb source refresh --all", "okb source refresh --all --json --dry-run"],
        args: [
          ["[<source>]", "name", "The source to check (leave it out with --all)."],
          ["--all", "flag", "Check every source and list the worklist of new, changed and removed blocks."],
          ["--dry-run", "flag", "With --all: write nothing, not even moved quotes."],
          ["--record", "flag", "With --all: store the current blocks as the baseline once the worklist is dealt with."],
          ["--strict", "flag", "With --all: also exit with code 1 when the worklist isn't empty."],
        ],
        options: { all: bool, record: bool, "dry-run": bool, strict: bool },
        run: async (ctx) => {
          const o = ctx.opts;
          if (!o.all) return ctx.mutate((ont) => prov.refreshSource(ont, ctx.args[0]));
          if (ctx.args.length) throw new OkbError("--all re-checks every source; leave out the source name (or drop --all).");
          const { report, write } = await refreshAll(ctx.dir, { dryRun: o["dry-run"], record: o.record });
          ctx.emit(() => report, () => formatNotes(renderResync(report, { dryRun: !write })));
          // 1 when the KB no longer matches its documents (a quote is gone or a source can't be read); --strict also when blocks need work.
          if (!report.ok || (o.strict && report.worklist.length)) ctx.exit(1);
        },
      },
      {
        sub: "list",
        description: "Lists the sources. Bare `okb source` does the same.",
        examples: ["okb source list"],
        args: [],
        run: (ctx) => ctx.print(renderSources(ctx.load())),
      },
    ],
  },
  {
    name: "quote",
    group: "Working from documents",
    summary: "record a verbatim passage",
    description: "Records a verbatim passage from a source. Okb finds it in the document for you.",
    bare: "list",
    forms: [
      {
        sub: "add",
        description: "Records one quote.",
        examples: ["okb quote add button \"Use a primary button for the main action.\" --cites Button"],
        args: [
          ["<source>", "name", "The source it comes from."],
          ["<text>", "text", "The passage, word for word."],
          ["--cites", "node", "A node the quote supports. Repeat it for more."],
          ["--line", "number", "A line to look near, if the text appears more than once."],
          ["--allow-code", "flag", "Allow a quote from a code block."],
        ],
        options: { cites: strs, line: str, "allow-code": bool },
        usage: 'Usage: okb quote add <source> "verbatim text" [--cites <node>] [--line N]',
        min: 2,
        cheat: { example: "okb quote add button \"verbatim text\" --cites Button", description: "Record a quote" },
        run: (ctx) => ctx.mutateAsync((ont) => prov.addQuote(ont, ctx.args[0], ctx.args.slice(1).join(" "), { cites: ctx.opts.cites, line: ctx.int("line"), allowCode: ctx.opts["allow-code"] })),
      },
      {
        sub: "list",
        description: "Lists the quotes. Bare `okb quote` does the same.",
        examples: ["okb quote list"],
        args: [],
        run: (ctx) => {
          const ont = ctx.load();
          const q = quotes(ont, ctx.args[0]);
          ctx.emit(q.data, () => renderQuotes(ont, q.locs));
        },
      },
    ],
  },
  {
    name: "rule",
    group: "Working from documents",
    summary: "record a rule a document states",
    description: "Records a rule a document states, tied to the quote that supports it.",
    bare: "list",
    forms: [
      {
        sub: "add",
        description: "Records one rule.",
        examples: ["okb rule add --statement \"Buttons SHOULD have one primary per page.\" --modality SHOULD --governs Button --cites quote.1"],
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
        options: { statement: str, modality: str, governs: strs, cites: strs, name: str, authored: bool, value: strs, refines: strs, adds: str },
        usage: 'Usage: okb rule add --statement "..." --modality MUST|SHOULD|MAY|MUST_NOT|SHOULD_NOT --cites <quote id> [--governs <Class|slot>] [--authored] [--value slot=value ...] [--refines <rule> [--adds "..."]]',
        require: ["statement", "modality"],
        cheat: { example: "okb rule add --statement \"...\" --modality SHOULD --cites quote.1", description: "Record a rule a document states" },
        run: (ctx) => {
          const o = ctx.opts;
          ctx.mutate((ont) => prov.addRule(ont, { statement: o.statement, modality: o.modality, governs: o.governs, cites: o.cites, name: o.name, authored: o.authored, values: o.value, refines: o.refines, adds: o.adds }));
        },
      },
      {
        sub: "refines",
        description: "Says that one rule narrows another.",
        examples: ["okb rule refines rule.2 rule.1 --adds \"Only inside dialogs\""],
        args: [
          ["<rule>", "rule id", "The narrower rule."],
          ["<broader rule>", "rule id", "The rule it narrows."],
          ["--adds", "text", "What it adds."],
          ["--remove", "flag", "Remove the link."],
        ],
        options: { adds: str, remove: bool },
        usage: 'Usage: okb rule refines <rule> <broader rule> [--adds "..."] [--remove]',
        min: 2,
        max: 2,
        run: (ctx) => ctx.mutate((ont) => prov.refine(ont, ctx.args[0], ctx.args[1], { adds: ctx.opts.adds, remove: ctx.opts.remove })),
      },
      {
        sub: "list",
        description: "Lists the rules. Bare `okb rule` does the same.",
        examples: ["okb rule list"],
        args: [],
        run: (ctx) => ctx.print(renderRules(ctx.load())),
      },
    ],
  },
  {
    name: "fulfills",
    group: "Working from documents",
    summary: "say an instance follows a rule",
    description: "Says that an instance follows a rule.",
    forms: [
      {
        description: "Links the instance to the rule.",
        examples: ["okb fulfills SaveButton rule.1"],
        args: [
          ["<instance>", "name", "The instance."],
          ["<rule>", "rule id", "The rule."],
          ["--remove", "flag", "Remove the link."],
        ],
        options: { remove: bool },
        usage: "Usage: okb fulfills <instance> <rule> [--remove]",
        min: 2,
        max: 2,
        run: (ctx) => ctx.mutate((ont) => prov.fulfill(ont, ctx.args[0], ctx.args[1], { remove: ctx.opts.remove })),
      },
    ],
  },
  {
    name: "cite",
    group: "Working from documents",
    summary: "attach a quote to a node",
    description: "Attaches a quote you already recorded to another node.",
    forms: [
      {
        description: "Links the quote to the node.",
        examples: ["okb cite Button quote.4"],
        args: [
          ["<node>", "name", "The class, slot, instance or rule."],
          ["<quote id>", "quote id", "The quote. `okb quote list` shows them."],
        ],
        usage: "Usage: okb cite <node> <quote id>   (attach an existing quote; see okb quote list)",
        min: 2,
        max: 2,
        run: (ctx) => ctx.mutate((ont) => prov.cite(ont, ctx.args[0], ctx.args[1])),
      },
    ],
  },
  {
    name: "verify",
    group: "Working from documents",
    summary: "record an independent check",
    description: "Records the result of an independent check that a node matches what its quote says, or approves it.",
    forms: [
      {
        description: "Sets a verification status, or approves the node.",
        examples: ["okb verify rule.1 --status SUPPORTED", "okb verify rule.1 --approve"],
        args: [
          ["<node>", "name", "The node to verify."],
          ["--status", "SUPPORTED, OVERREACH or UNSUPPORTED", "What the check found."],
          ["--corrected", "text", "A corrected wording, for OVERREACH."],
          ["--confidence", "verbatim or paraphrased", "How closely the node follows the quote."],
          ["--note", "text", "One sentence on why: the word or number you changed, or the part of the statement the quote doesn't support. OVERREACH prints a suggestion."],
          ["--ref", "url", "An http or https link to the PR comment, issue or review thread where the reasoning happened."],
          ["--approve", "flag", "Approve it after review."],
        ],
        options: { status: str, corrected: str, confidence: str, note: str, ref: str, approve: bool },
        usage: 'Usage: okb verify <node> --status SUPPORTED|OVERREACH|UNSUPPORTED [--corrected "..."] [--confidence verbatim|paraphrased] [--note "..."] [--ref <url>]  ·  okb verify <node> --approve',
        min: 1,
        cheat: { example: "okb verify rule.1 --status SUPPORTED", description: "Record an independent check" },
        run: (ctx) => {
          const o = ctx.opts;
          ctx.mutate((ont) => prov.verify(ont, ctx.args[0], { status: o.status, corrected: o.corrected, confidence: o.confidence, note: o.note, ref: o.ref, approve: o.approve }));
        },
      },
    ],
  },
];
