/** Reviewing and sharing: review questions, decisions, diagrams, exports and reference pages (step 8). */
import { type Command, opt } from "../command-table.ts";
import { type DesignDecisionNode } from "@ontology-kit/reader";
import * as ops from "../ops.ts";
import { buildReview } from "../review.ts";
import { mermaid, renderDecisions, renderDiagramWritten, renderExportWritten, renderReview, renderWrote } from "../render.ts";
import { docs, exportOntology, reviewData } from "../workflows.ts";

const { str, strs, bool } = opt;

export const reviewing: Command[] = [
  {
    name: "review",
    group: "Reviewing and sharing",
    summary: "questions only a person can judge",
    description: "Turns the rules only a person can judge into questions about your ontology. The ontology-review skill uses it.",
    forms: [
      {
        description: "Lists the questions for the steps you have reached.",
        examples: ["okb review", "okb review --all --json"],
        args: [
          ["--all", "flag", "Include every rule, not only the visible ones."],
          ["--json", "flag", "Print everything as JSON."],
        ],
        options: { all: bool },
        cheat: { example: "okb review", description: "Get questions only a person can judge" },
        run: (ctx) => {
          const ont = ctx.load();
          const items = buildReview(ont, ctx.opts.all);
          ctx.emit(() => reviewData(ont, items), () => renderReview(ont, items, ctx.opts.all));
        },
      },
    ],
  },
  {
    name: "decision",
    group: "Reviewing and sharing",
    summary: "record a design decision",
    description: "Records a design decision, with the reason, so you and others can see why the ontology is the way it is.",
    bare: "list",
    forms: [
      {
        sub: "add",
        description: "Records a decision. A decision can waive a rule, which turns that rule's warning into a note.",
        examples: ["okb decision add --title \"Wines are not foods\" --decision \"Keep them separate\" --why \"Pairing needs both\""],
        args: [
          ["--title", "text", "A short title."],
          ["--decision", "text", "What you decided."],
          ["--why", "text", "The reason."],
          ["--question", "text", "The question it answers."],
          ["--alt", "text", "An option you rejected. Repeat it for more."],
          ["--about", "name", "A class, slot or instance it concerns. Repeat it for more."],
          ["--waives", "rule key", "A rule it explains away. Repeat it for more."],
        ],
        options: { title: str, decision: str, question: str, why: str, alt: strs, about: strs, waives: strs },
        usage: 'Usage: okb decision add --title "..." --decision "..." --why "..." [--about X] [--waives rule-id]',
        require: ["title", "decision"],
        cheat: { example: "okb decision add --title \"...\" --decision \"...\" --why \"...\"", description: "Record a design decision" },
        run: (ctx) => {
          const o = ctx.opts;
          ctx.mutate((ont) => ops.addDecision(ont, { title: o.title, decision: o.decision, question: o.question, rationale: o.why, alternatives: o.alt, about: o.about, waives: o.waives }));
        },
      },
      {
        sub: "list",
        description: "Lists the decisions. Bare `okb decision` does the same.",
        examples: ["okb decision list"],
        args: [],
        run: (ctx) => {
          const ont = ctx.load();
          const ds = ont.numbered("DesignDecision") as DesignDecisionNode[];
          ctx.emit(() => ds, () => renderDecisions(ont, ds));
        },
      },
    ],
  },
  {
    name: "diagram",
    group: "Reviewing and sharing",
    summary: "draw the ontology as Mermaid",
    description: "Draws the ontology as a Mermaid diagram you can open in GitHub or VS Code.",
    forms: [
      {
        description: "Prints the diagram, or writes it to a file.",
        examples: ["okb diagram --out diagram.md"],
        args: [
          ["--out", "path", "Write the diagram here instead of printing it."],
        ],
        options: { out: str },
        cheat: { example: "okb diagram --out diagram.md", description: "Draw the ontology" },
        run: (ctx) => {
          const md = mermaid(ctx.load());
          const { out } = ctx.opts;
          if (out) {
            ctx.write(out, md + "\n");
            ctx.print(renderDiagramWritten(out));
          } else ctx.print(md);
        },
      },
    ],
  },
  {
    name: "export",
    group: "Reviewing and sharing",
    summary: "write JSON or openCypher",
    description: "Writes the ontology as JSON or as openCypher, ready for Neo4j, Neptune or Memgraph. Instances become nodes labeled with their classes.",
    forms: [
      {
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
        options: { format: str, out: str, "with-schema": bool, "no-inherited": bool, "no-rules": bool, "include-unverified": bool },
        cheat: { example: "okb export --format cypher --out wine.cypher", description: "Export for a graph database" },
        run: (ctx) => {
          const o = ctx.opts;
          const { fmt, graph, text } = exportOntology(ctx.load(), { format: o.format, out: o.out, schema: o["with-schema"], noInherited: o["no-inherited"], noRules: o["no-rules"], includeUnverified: o["include-unverified"] });
          if (o.out) {
            ctx.write(o.out, text);
            ctx.print(renderExportWritten(o.out, graph, fmt));
          } else ctx.printRaw(text);
        },
      },
    ],
  },
  {
    name: "docs",
    group: "Reviewing and sharing",
    summary: "write Markdown reference pages",
    description: "Writes Markdown reference pages for the ontology, so people can read its structure and rules without okb: an index, one page per class, a rules page and a sources page.",
    forms: [
      {
        description: "Writes `index.md` (scope, competency questions, class tree, decisions), `classes/<id>.md` (slots with allowed values, inherited and own rules with their quotes, instances, decisions), `rules.md` and `sources.md`. Every rule links to its quote on the sources page. Items have stable anchors made from their ids (`rule.breve` becomes `#rule-breve`), links are relative, and the output has no dates, so you can commit it and check it for drift. It replaces pages an earlier run wrote and leaves other files alone. It never changes the ontology.",
        examples: ["okb docs --out docs/kb"],
        args: [
          ["--out", "folder", "Where to write the pages. Required; it is created if it doesn't exist."],
        ],
        options: { out: str, changed: str, hops: str, context: bool },
        usage: "Usage: okb docs --out <folder>  ·  okb docs --out <folder> --changed <ref> [--hops N]  ·  okb docs --out <folder> --context",
        max: 0,
        require: ["out"],
        run: async (ctx) => {
          const o = ctx.opts;
          const r = await docs(ctx.dir, o.out, { changed: o.changed, hops: o.hops, context: o.context });
          ctx.emit(() => ({ out: o.out, files: r.files, ...r.extra }), () => renderWrote(o.out, r.what, r.hint));
        },
      },
      {
        sub: "--changed",
        description: "A review view of a change: only the pages whose text differs from `<ref>` (a git ref or a folder, the same as `okb diff`). A rule changed on a class changes the page of every subclass that inherits it, so those pages come with it. It also writes `changes.md`, which lists the changed pages and the stale-quote worklist from `okb source refresh --all --dry-run` (quotes that are gone or moved, and blocks that are new or changed, each with the nodes that cite them), because a source edit that hasn't been re-synced yet changes no page. Pages are the same text as the full render, so links to pages that aren't in the folder point into the full output. It only adds and overwrites files, so write it to a scratch folder, not to the committed pages. It never changes the ontology.",
        examples: ["okb docs --out review --changed main", "okb docs --out review --changed v1.0.0 --hops 1"],
        args: [
          ["--out", "folder", "Where to write the pages. Required."],
          ["--changed", "ref", "The git ref (or folder) to compare the working folder with."],
          ["--hops", "number", "Also write the class pages that link to or from a changed class page, this many links away. Default 0. It doesn't go through the index, rules or sources pages, which link to everything."],
        ],
      },
      {
        sub: "--context",
        description: "A review view of every rule beside the source text around its quote: the statement, modality, verification status, the verifier's note (when `okb verify --note` stored one), the original draft of a corrected rule, the quote, and the lines around it with the quoted lines marked. Rules that need a person come first (UNSUPPORTED, OVERREACH not yet approved, not verified, no quote, quote no longer in the source), then the rest by name. It reads the source files, so it needs them on disk. A source that isn't Markdown shows the quote alone. It writes `rules-in-context.md` and never changes the ontology.",
        examples: ["okb docs --out review --context"],
        args: [
          ["--out", "folder", "Where to write `rules-in-context.md`. Required."],
          ["--context", "flag", "Write the rules-in-context page instead of the reference pages. It doesn't combine with `--changed`."],
        ],
      },
    ],
  },
];
