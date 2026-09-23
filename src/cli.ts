#!/usr/bin/env node
/** okb: command-line interface. Run `okb help` for usage. */
import { parseArgs, type ParseArgsConfig } from "node:util";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { duplicateQuotes, loadSourcePages, runChecks } from "./checks.ts";
import { MetaKB, explainName } from "./metakb.ts";
import { OkbError, Ontology } from "./model.ts";
import * as ops from "./ops.ts";
import { c, explain, formatFindings, listExplainable, mermaid, show, stepGuide, SYMBOL, tree } from "./render.ts";
import { exportGraph, toCypher } from "./export.ts";
import { buildReview } from "./review.ts";
import * as prov from "./provenance.ts";
import { computeStatus } from "./status.ts";

const HELP = `okb: build an ontology step by step (Ontology 101 method)

Getting started
  okb init <folder> --name "Wine and Food"     create a new ontology
  okb status                                  where you are and what to do next
  okb step [n|next|prev]                      move between steps and show the guide
  okb explain [topic]                         learn a concept, rule, step (e.g. okb explain 5) or decision guide
  okb validate [--all] [--why] [--json]       check your ontology against the rules

Step 1: scope          okb scope --domain "..." --purpose "..." --users a,b --maintainers x --out-of-scope "..."
                       okb cq add "Which wines go with fish?"   ·   okb cq list
Step 2: reuse          okb reuse add --name "..." --url ... --decision reuse|adapt|reference|rejected
                       okb reuse none --why "..."
Step 3: terms          okb term add wine grape winery color ...   ·   okb term list
Step 4: classes        okb convention [--class-case PascalCase] [--slot-case camelCase] [--number singular]
                       okb class add RedWine --parent Wine [--desc "..."] [--synonym ...] [--abstract]
                       okb class set RedWine [--desc] [--add-parent X] [--remove-parent X] [--synonym S]
                       okb class disjoint RedWine WhiteWine RoseWine
                       okb term set wine --as class|slot|instance|value|synonym|out-of-scope [--node Name]
                       okb tree [--instances]
Step 5: slots          Two kinds (the paper calls both "slots"):
                       okb property add body --on Wine --type Enumerated --values light,medium,full --card single
                       okb relationship add maker --from Wine --to Winery --card single     (stored as edges :MAKER)
                       okb slot set body [--on X] [--off X] [--desc] ...   ·   okb show Wine
Step 6: facets         okb slot set maker --card single --min 1   ·   okb slot set producer --range Winery
                       okb relationship inverse maker produces        (one edge, readable from both ends)
                       okb relationship property preferredOver condition --type String [--required] [--values a,b]
                       okb link Radio preferredOver SegmentedControl condition="2 to 7 options" [--rule <rule id>]
                       okb unlink Radio preferredOver SegmentedControl
                       okb class fix DessertWine sugar=sweet        (a value every member has)
                       okb class default Wine body=full              (a starting value, overridable)
                       okb class restrict SingleVarietal grape --max 1
Step 7: instances      okb instance add "Chateau Morgon Beaujolais" --of Beaujolais body=light maker="Chateau Morgon"
                       okb instance set "Chateau Morgon Beaujolais" grape+=Gamay    (+= adds, -= removes, slot= clears)
                       okb instance set "Chateau Morgon Beaujolais" --of Beaujolais  (move to another class)
Step 8: review         okb cq link 1 Wine Food goesWellWith   ·   okb validate --all   ·   okb review
                       okb decision add --title "..." --decision "..." --why "..." [--about X] [--waives rule-id]
                       okb diagram [--out diagram.md]
Export                 okb export [--format json|cypher] [--with-schema] [--no-inherited] [--out file]
                       (instances as nodes labeled with their classes, ready for Neo4j / Neptune / Memgraph)

Documents              okb source add docs/button.md [--repo-url https://github.com/.../button.md] [--url https://site/button]
(extraction)           okb source outline <source> [--quotable] [--json]     every block, with heading path and lines
                       okb quote add <source> "verbatim text" [--cites Node] [--line N]   located automatically
                       okb rule add --statement "..." --modality SHOULD --governs Button --cites <quote id>
                       okb verify <node> --status SUPPORTED|OVERREACH|UNSUPPORTED [--corrected "..."] · okb verify <node> --approve
                       okb source refresh <source>                            after the document changes

Also: okb show <name> · okb rename <old> <new> · okb remove <name> · okb drift <folder>...
Names: when a class and a slot share a name, say which: class:Genre / slot:genre
Global options: -C <folder> (default: current folder) · --json (machine-readable output where supported)`;

type Opts = NonNullable<ParseArgsConfig["options"]>;
const str = { type: "string" } as const;
const strs = { type: "string", multiple: true } as const;
const bool = { type: "boolean" } as const;
const GLOBAL: Opts = { C: { type: "string", short: "C" }, json: bool };

function parse(argv: string[], options: Opts = {}) {
  const { values, positionals } = parseArgs({ args: argv, options: { ...GLOBAL, ...options }, allowPositionals: true, strict: true });
  return { v: values as Record<string, any>, p: positionals };
}
const num = (x: string | undefined, flag: string) => {
  if (x === undefined) return undefined;
  if (!/^\d+$/.test(x)) throw new OkbError(`${flag} needs a whole number (0 or more).`);
  return Number(x);
};
const tri = (x: string | undefined) => (x === undefined ? undefined : ["true", "yes", "1"].includes(x.toLowerCase()));
/** `okb review` lists this many prompts per rule in the terminal; --json has them all. */
const REVIEW_PROMPTS_SHOWN = 12;
const TIP = /^(Tip|Add a|Attach|Decide|Say which|List the)/;

function say(notes: string[]) {
  for (const n of notes) console.log(TIP.test(n) ? c.dim("  " + n) : n);
}

/** Under --json print what `data` builds; otherwise run the human-readable printer. */
function output(v: Record<string, any>, data: () => unknown, human: () => void): void {
  if (v.json) console.log(JSON.stringify(data(), null, 2));
  else human();
}

function load(v: Record<string, any>): Ontology {
  return Ontology.load(v.C ?? ".");
}

function mutate(v: Record<string, any>, fn: (ont: Ontology) => string[]) {
  const ont = load(v);
  const notes = fn(ont);
  ont.save();
  say(notes);
}

async function main(argvIn: string[]) {
  // Accept -C <folder> anywhere, including before the command.
  const argv = [...argvIn];
  if (argv[0] === "-C" && argv.length > 2) argv.push(...argv.splice(0, 2));
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(HELP);
    return;
  }
  // "property" and "relationship" are everyday names for the paper's two kinds of slot.
  if (argv[0] === "property") argv[0] = "slot";
  if (argv[0] === "relationship") {
    argv[0] = "slot";
    if (argv[1] === "add") argv.push("--type", "Instance");
    if (argv[1] === "property") argv[0] = "edgeprop";
    for (let i = 2; i < argv.length; i++) {
      if (argv[i] === "--from") argv[i] = "--on";
      else if (argv[i] === "--to") argv[i] = "--range";
    }
  }
  const [cmd, ...rest] = argv;
  const sub = rest[0];
  switch (cmd) {
    case undefined:
    case "help":
      console.log(HELP);
      return;

    case "version":
    case "--version":
      console.log(`okb 1.0.0 · meta-KB ${MetaKB.get().version}`);
      return;

    case "init": {
      const { v, p } = parse(rest, { name: str });
      if (!p[0]) throw new OkbError('Usage: okb init <folder> --name "My Ontology"');
      const name = v.name ?? p[0];
      const ont = Ontology.create(p[0], name);
      ont.manifest.metaKbVersion = MetaKB.get().version;
      ont.save();
      console.log(`${SYMBOL.ok} Created ontology '${name}' in ${ont.root}\n`);
      console.log(stepGuide(MetaKB.get().step(1)!));
      console.log(c.dim(`\nNext: cd ${p[0]} && okb scope --domain "..." --purpose "..." --users "..."`));
      return;
    }

    case "scope": {
      const { v } = parse(rest, { name: str, domain: str, purpose: str, users: strs, maintainers: strs, "out-of-scope": strs, kind: str });
      const touched = ["name", "domain", "purpose", "users", "maintainers", "out-of-scope", "kind"].some((k) => v[k] !== undefined);
      const ont = load(v);
      if (touched) {
        ops.setScope(ont, { name: v.name, domain: v.domain, purpose: v.purpose, users: v.users, maintainers: v.maintainers, outOfScope: v["out-of-scope"], kind: v.kind });
        ont.save();
      }
      const m = ont.meta;
      const row = (k: string, val: unknown) => console.log(`  ${c.dim(k.padEnd(13))} ${Array.isArray(val) ? val.join(", ") || c.yellow("—") : val || c.yellow("—")}`);
      return output(v, () => m, () => {
        console.log(c.bold(m.name));
        row("domain", m.domain);
        row("purpose", m.purpose);
        row("users", m.users);
        row("maintainers", m.maintainers);
        row("out of scope", m.outOfScope);
        row("kind", m.kind);
      });
    }

    case "convention": {
      const { v } = parse(rest, { "class-case": str, "slot-case": str, "instance-case": str, number: str, "slot-affix": str });
      mutate(v, (ont) => {
        const notes = ops.setConventions(ont, { classCase: v["class-case"], slotCase: v["slot-case"], instanceCase: v["instance-case"], classNumber: v.number, slotAffix: v["slot-affix"] });
        const cv = ont.conventions!;
        return [`Naming convention: classes ${cv.classCase} (${cv.classNumber}) · slots ${cv.slotCase}${cv.slotAffix !== "none" ? ` (${cv.slotAffix})` : ""} · instances ${cv.instanceCase ?? "free text"}`, ...notes];
      });
      return;
    }

    case "cq": {
      if (sub === "add") {
        const { v, p } = parse(rest.slice(1));
        if (!p.length) throw new OkbError('Usage: okb cq add "Your question?"');
        return mutate(v, (ont) => p.flatMap((t) => ops.addCQ(ont, t)));
      }
      if (sub === "link" || sub === "unlink") {
        const { v, p } = parse(rest.slice(1));
        if (p.length < 2) throw new OkbError(`Usage: okb cq ${sub} <question number> <Class|slot|instance>...`);
        return mutate(v, (ont) => ops.linkCQ(ont, p[0], p.slice(1), sub === "unlink"));
      }
      if (sub === "set") {
        const { v, p } = parse(rest.slice(1), { text: str, status: str });
        return mutate(v, (ont) => {
          const q = ont.find(p[0], "CompetencyQuestion");
          if (v.text) q.text = v.text;
          if (v.status) {
            if (!["draft", "answerable"].includes(v.status)) throw new OkbError("--status must be draft or answerable.");
            q.status = v.status;
          }
          return [`Updated ${q.id}.`];
        });
      }
      if (sub === "remove") {
        const { v, p } = parse(rest.slice(1));
        return mutate(v, (ont) => ops.remove(ont, p[0], ["CompetencyQuestion"]));
      }
      const { v } = parse(sub === "list" ? rest.slice(1) : rest);
      const ont = load(v);
      const qs = ont.ofType("CompetencyQuestion");
      return output(v, () => qs.map((q) => ({ ...q, needs: ont.targets(q.id, "NEEDS") })), () => {
        if (!qs.length) return void console.log(c.dim('No competency questions yet. okb cq add "..."'));
        for (const q of qs) {
          const needs = ont.targets(q.id, "NEEDS").map((n) => ont.label(n));
          console.log(`${c.bold(q.id.padEnd(6))} ${q.text} ${c.dim(`[${q.status ?? "draft"}]`)}`);
          console.log(c.dim(`       needs: ${needs.length ? needs.join(", ") : "(not linked yet: okb cq link " + q.id.split(".")[1] + " <Class|slot>...)"}`));
        }
      });
    }

    case "term": {
      if (sub === "add") {
        const { v, p } = parse(rest.slice(1), { note: str });
        if (!p.length) throw new OkbError("Usage: okb term add <term> [<term>...]   (quote multi-word terms)");
        return mutate(v, (ont) => ops.addTerms(ont, p, v.note));
      }
      if (sub === "set") {
        const { v, p } = parse(rest.slice(1), { as: str, node: str, note: str });
        if (!p[0] || !v.as) throw new OkbError("Usage: okb term set <term> --as class|slot|instance|value|synonym|out-of-scope [--node Name]");
        return mutate(v, (ont) => ops.setTerm(ont, p[0], v.as, v.node, v.note));
      }
      const { v } = parse(sub === "list" ? rest.slice(1) : rest);
      const ont = load(v);
      const ts = ont.ofType("Term");
      return output(v, () => ts, () => {
        const groups = new Map<string, string[]>();
        for (const t of ts) {
          const d = t.disposition ?? "undecided";
          const became = ont.targets(t.id, "BECAME").map((x) => ont.label(x));
          groups.set(d, [...(groups.get(d) ?? []), t.text + (became.length ? c.dim(` → ${became.join(", ")}`) : "")]);
        }
        for (const [d, items] of groups) console.log(`${c.bold(d.padEnd(13))} ${items.join(" · ")}`);
        if (!ts.length) console.log(c.dim("No terms yet. okb term add wine grape winery ..."));
      });
    }

    case "reuse": {
      if (sub === "add") {
        const { v } = parse(rest.slice(1), { name: str, url: str, decision: str, notes: str });
        if (!v.name || !v.decision) throw new OkbError("Usage: okb reuse add --name ... --decision reuse|adapt|reference|rejected [--url ...] [--notes ...]");
        return mutate(v, (ont) => ops.addReuse(ont, { name: v.name, url: v.url, decision: v.decision, notes: v.notes }));
      }
      if (sub === "none") {
        const { v } = parse(rest.slice(1), { why: str });
        if (!v.why) throw new OkbError('Usage: okb reuse none --why "what you looked at and why nothing fit"');
        return mutate(v, (ont) => ops.reuseNone(ont, v.why));
      }
      const { v } = parse(sub === "list" ? rest.slice(1) : rest);
      const ont = load(v);
      for (const r of ont.ofType("ReusedOntology")) console.log(`${c.bold(r.name)} ${c.dim(`[${r.decision}]`)} ${r.url ?? ""} ${r.notes ? "\n  " + r.notes : ""}`);
      if (!ont.ofType("ReusedOntology").length) console.log(c.dim(ont.meta.reuseReviewed ? "Reviewed: nothing reused." : "Not reviewed yet."));
      return;
    }

    case "class": {
      const rest2 = rest.slice(1);
      if (sub === "add") {
        const { v, p } = parse(rest2, { parent: strs, desc: str, synonym: strs, abstract: bool, terminological: bool, force: bool });
        if (!p[0]) throw new OkbError("Usage: okb class add <Name> [--parent P] [--desc ...]");
        return mutate(v, (ont) => ops.addClass(ont, p[0], { parents: v.parent, description: v.desc, synonyms: v.synonym, abstract: v.abstract, terminological: v.terminological, force: v.force }));
      }
      if (sub === "set") {
        const { v, p } = parse(rest2, { desc: str, "add-parent": strs, "remove-parent": strs, synonym: strs, abstract: str, terminological: str });
        if (!p[0]) throw new OkbError("Usage: okb class set <Class> [--desc ...] [--add-parent P] [--remove-parent P] [--synonym S] [--abstract true|false]");
        return mutate(v, (ont) => ops.setClass(ont, p[0], { description: v.desc, addParents: v["add-parent"], removeParents: v["remove-parent"], synonyms: v.synonym, abstract: tri(v.abstract), terminological: tri(v.terminological) }));
      }
      if (sub === "disjoint") {
        const { v, p } = parse(rest2);
        return mutate(v, (ont) => ops.disjoint(ont, p));
      }
      if (sub === "fix") {
        const { v, p } = parse(rest2);
        if (p.length < 2) throw new OkbError("Usage: okb class fix <Class> slot=value ...");
        return mutate(v, (ont) => ops.assign(ont, ont.find(p[0], "Class").id, p.slice(1), "fixed"));
      }
      if (sub === "default") {
        const { v, p } = parse(rest2);
        if (p.length < 2) throw new OkbError("Usage: okb class default <Class> slot=value ...");
        return mutate(v, (ont) => ops.classDefault(ont, p[0], p.slice(1)));
      }
      if (sub === "restrict") {
        const { v, p } = parse(rest2, { values: strs, min: str, max: str, range: strs, clear: bool });
        if (p.length < 2) throw new OkbError("Usage: okb class restrict <Class> <slot> [--values a,b] [--min N] [--max N] [--range C] [--clear]");
        return mutate(v, (ont) => ops.restrict(ont, p[0], p[1], { values: v.values, min: num(v.min, "--min"), max: num(v.max, "--max"), range: v.range, clear: v.clear }));
      }
      throw new OkbError("Usage: okb class add|set|disjoint|fix|default|restrict ...  (okb help)");
    }

    case "slot": {
      const rest2 = rest.slice(1);
      const slotOpts = { on: strs, off: strs, type: str, values: strs, range: strs, "add-range": strs, "remove-range": strs, card: str, min: str, max: str, default: str, desc: str, force: bool } as const;
      const toOpts = (v: Record<string, any>): ops.SlotOpts => ({
        on: v.on, off: v.off, type: v.type, values: v.values, range: v.range, addRange: v["add-range"], removeRange: v["remove-range"],
        card: v.card, min: num(v.min, "--min"), max: num(v.max, "--max"), default: v.default, description: v.desc, force: v.force,
      });
      if (sub === "add") {
        const { v, p } = parse(rest2, slotOpts);
        if (!p[0]) throw new OkbError("Usage: okb slot add <name> --on <Class> --type <Type> [--card single|multiple] ...");
        return mutate(v, (ont) => ops.addSlot(ont, p[0], toOpts(v)));
      }
      if (sub === "set") {
        const { v, p } = parse(rest2, slotOpts);
        if (!p[0]) throw new OkbError("Usage: okb slot set <slot> [--on C] [--type T] [--values a,b] [--range C] [--card single|multiple] ...");
        return mutate(v, (ont) => ops.updateSlot(ont, p[0], toOpts(v)));
      }
      if (sub === "inverse") {
        const { v, p } = parse(rest2);
        if (p.length !== 2) throw new OkbError("Usage: okb slot inverse <slotA> <slotB>");
        return mutate(v, (ont) => ops.inverse(ont, p[0], p[1]));
      }
      throw new OkbError("Usage: okb slot add|set|inverse ...  (okb help)");
    }

    case "instance": {
      const rest2 = rest.slice(1);
      if (sub === "add") {
        const { v, p } = parse(rest2, { of: strs, desc: str });
        if (!p[0]) throw new OkbError('Usage: okb instance add "Name" --of <Class> [slot=value ...]');
        return mutate(v, (ont) => ops.addInstance(ont, p[0], { of: v.of, description: v.desc, assignments: p.slice(1) }));
      }
      if (sub === "set") {
        const { v, p } = parse(rest2, { of: strs, desc: str });
        if (!p[0]) throw new OkbError('Usage: okb instance set "Name" slot=value ... [--of <Class>]');
        return mutate(v, (ont) => {
          const notes = [
            ...(v.of?.length ? ops.setInstanceClasses(ont, p[0], v.of) : []),
            ...(p.length > 1 ? ops.assign(ont, ont.find(p[0], "Instance").id, p.slice(1)) : []),
          ];
          if (v.desc !== undefined) {
            ont.find(p[0], "Instance").description = v.desc;
            notes.push("Updated description.");
          }
          return notes;
        });
      }
      throw new OkbError("Usage: okb instance add|set ...  (okb help)");
    }

    case "decision": {
      if (sub === "add") {
        const { v } = parse(rest.slice(1), { title: str, decision: str, question: str, why: str, alt: strs, about: strs, waives: strs });
        if (!v.title || !v.decision) throw new OkbError('Usage: okb decision add --title "..." --decision "..." --why "..." [--about X] [--waives rule-id]');
        return mutate(v, (ont) => ops.addDecision(ont, { title: v.title, decision: v.decision, question: v.question, rationale: v.why, alternatives: v.alt, about: v.about, waives: v.waives }));
      }
      const { v } = parse(sub === "list" ? rest.slice(1) : rest);
      const ont = load(v);
      const ds = ont.ofType("DesignDecision");
      return output(v, () => ds, () => {
        for (const d of ds) {
          console.log(`${c.bold(d.id)} ${d.title}`);
          console.log(`   ${d.decision}${d.rationale ? c.dim(" · why: " + d.rationale) : ""}`);
          const about = ont.targets(d.id, "ABOUT").map((x) => ont.label(x));
          if (about.length || d.metaRules) console.log(c.dim(`   about: ${about.join(", ") || "—"}${d.metaRules ? " · explains: " + d.metaRules.join(", ") : ""}`));
        }
        if (!ds.length) console.log(c.dim("No design decisions recorded yet."));
      });
    }

    case "rename": {
      const { v, p } = parse(rest, { force: bool });
      if (p.length !== 2) throw new OkbError("Usage: okb rename <old name> <new name>");
      return mutate(v, (ont) => ops.rename(ont, p[0], p[1], v.force));
    }

    case "remove": {
      const { v, p } = parse(rest, { type: str });
      if (!p[0]) throw new OkbError("Usage: okb remove <name> [--type Class|Slot|Instance|Term|...]");
      return mutate(v, (ont) => ops.remove(ont, p[0], v.type ? [v.type] : undefined));
    }

    case "show": {
      const { v, p } = parse(rest);
      const ont = load(v);
      const n = ont.find(p[0] ?? "ontology");
      return output(v, () => ({ node: n, out: ont.edges.filter((e) => e.from === n.id), in: ont.edges.filter((e) => e.to === n.id) }), () => console.log(show(ont, n)));
    }

    case "tree": {
      const { v } = parse(rest, { instances: bool });
      console.log(tree(load(v), v.instances));
      return;
    }

    case "diagram": {
      const { v } = parse(rest, { out: str });
      const md = mermaid(load(v));
      if (v.out) {
        writeFileSync(resolve(v.out), md + "\n");
        console.log(`Wrote ${v.out}. Open it in GitHub, VS Code (Markdown preview), or mermaid.live.`);
      } else console.log(md);
      return;
    }

    case "validate": {
      const { v } = parse(rest, { all: bool, why: bool, rule: strs, strict: bool });
      const ont = load(v);
      const { findings, hiddenLater } = runChecks(ont, { all: v.all, only: v.rule }, { pages: await loadSourcePages(ont) });
      output(v, () => ({ step: ont.step, metaKbVersion: MetaKB.get().version, hiddenLater, findings }), () => {
        console.log(formatFindings(findings, ont, { all: v.all, verbose: v.why }));
        if (hiddenLater) console.log(c.dim(`(${hiddenLater} warning(s)/hint(s) from later steps are hidden until you get there; okb validate --all shows them. Errors are never hidden.)`));
      });
      const open = findings.filter((f) => !f.explainedBy);
      const fail = open.some((f) => f.severity === "error") || (v.strict && open.some((f) => f.severity === "warning"));
      process.exitCode = fail ? 1 : 0;
      return;
    }

    case "status": {
      const { v } = parse(rest);
      const ont = load(v);
      const { findings } = runChecks(ont, { all: true }, { pages: await loadSourcePages(ont) });
      const st = computeStatus(ont, findings);
      return output(v, () => ({ currentStep: ont.step, ...st }), () => {
        const meta = MetaKB.get();
        const shown = findings.filter((f) => !f.explainedBy && (f.severity === "error" || (meta.rule(f.rule).fromStep ?? 1) <= ont.step));
        const count = (sev: string) => shown.filter((f) => f.severity === sev).length;
        console.log(c.bold(ont.meta.name) + c.dim(`  · ${ont.ofType("Class").length} classes · ${ont.ofType("Slot").length} slots · ${ont.ofType("Instance").length} instances · ${ont.ofType("CompetencyQuestion").length} questions`));
        console.log("");
        for (const s of st.steps) {
          const here = s.order === ont.step ? c.cyan(" ◀ you are here") : "";
          const mark = s.complete ? SYMBOL.ok : s.order === ont.step ? c.cyan("▶") : SYMBOL.todo;
          console.log(`${mark} ${c.bold(`${s.order}. ${s.name}`)}${here}`);
          if (s.order === ont.step || (!s.complete && s.order < ont.step)) {
            for (const it of s.items) console.log(`     ${it.done === null ? SYMBOL.ask : it.done ? SYMBOL.ok : SYMBOL.todo} ${it.text}`);
          }
        }
        console.log("");
        console.log(`Validator (steps 1–${ont.step}): ${SYMBOL.error} ${count("error")}  ${SYMBOL.warning} ${count("warning")}  ${SYMBOL.info} ${count("info")}   ${c.dim("okb validate for details")}`);
        const cur = st.steps.find((s) => s.order === ont.step)!;
        if (cur.complete && ont.step < st.steps.length) console.log(c.green(`\nStep ${ont.step} looks done. When you're happy with it: okb step next`));
        else if (st.suggested < ont.step) console.log(c.yellow(`\nStep ${st.suggested} still has open items. It's fine to go back: okb step ${st.suggested}`));
        else console.log(c.dim(`\nSee the guide for this step: okb step`));
      });
    }

    case "step": {
      const { v, p } = parse(rest);
      const meta = MetaKB.get();
      if (p[0]) {
        const ont = load(v);
        const target = p[0] === "next" ? ont.step + 1 : p[0] === "prev" ? ont.step - 1 : Number(p[0]);
        if (!meta.step(target)) throw new OkbError(`There is no step ${p[0]}. Steps are 1–${meta.steps.length}.`);
        const st = computeStatus(ont);
        const leaving = st.steps.find((s) => s.order === ont.step)!;
        ont.manifest.currentStep = target;
        ont.save();
        if (target > leaving.order && !leaving.complete) {
          console.log(c.yellow(`Moving on with step ${leaving.order} unfinished (${leaving.items.filter((i) => i.done === false).map((i) => i.text).join("; ")}). That's allowed; the method is iterative.`));
        }
        console.log(c.cyan(`Now on step ${target}.`) + c.dim(` (To read a step's guide without moving: okb explain ${target})`) + "\n");
        console.log(stepGuide(meta.step(target)!));
        return;
      }
      let order = 1;
      try {
        order = load(v).step;
      } catch {
        /* no ontology here: show step 1 */
      }
      console.log(stepGuide(meta.step(order)!));
      return;
    }

    case "explain": {
      const { v, p } = parse(rest, { search: str });
      const meta = MetaKB.get();
      if (v.search) {
        const hits = meta.search(v.search.replace(/[-_]/g, " "));
        if (!hits.length) return void console.log(`Nothing mentions '${v.search}'.`);
        for (const h of hits) console.log(`${(h.type === "Rule" ? h.key : h.id).padEnd(40)} ${c.dim(h.type)}  ${h.type === "Rule" ? h.statement.slice(0, 60) : h.name}`);
        return;
      }
      if (!p.length) return void console.log(listExplainable());
      const q = p.join(" ");
      const hits = meta.resolve(q);
      return output(v, () => hits.map((h) => ({ ...h, citations: meta.citations(h.id), rationale: h.type === "Rule" ? meta.rationale(h) : undefined })), () => {
        if (!hits.length) return void console.log(`Nothing called '${q}'. Try: okb explain --search ${q}`);
        console.log(explain(hits[0]));
        if (hits.length > 1) console.log(c.dim(`\nAlso matches: ${hits.slice(1, 6).map(explainName).join(", ")}`));
      });
    }

    case "review": {
      // The judgment rules a script can't check, turned into concrete questions about
      // this ontology. Used by the ontology-review skill.
      const { v } = parse(rest, { all: bool });
      const ont = load(v);
      const items = buildReview(ont, v.all);
      const classes = () => ont.ofType("Class").map((cl) => ({
        id: cl.id, name: cl.name, description: cl.description, parents: ont.parents(cl.id).map((x) => ont.label(x)),
        children: ont.children(cl.id).map((x) => ont.label(x)), ownSlots: ont.ownSlots(cl.id).map((s) => ont.label(s)),
        abstract: cl.abstract, terminological: cl.terminological, instances: ont.sources(cl.id, "INSTANCE_OF").length,
      }));
      return output(v, () => ({ step: ont.step, scope: ont.meta, judgmentRules: items, classes: classes(), decisions: ont.ofType("DesignDecision") }), () => {
        console.log(c.bold(v.all ? "Review: what only a person can judge (all rules)" : `Review: what only a person can judge (step ${ont.step} and anything already visible)`) + "\n");
        for (const it of items) {
          console.log(`${SYMBOL.ask} ${c.bold(it.rule)} ${c.dim(`(${it.modality.replace("_", " ")})`)}  ${it.question}`);
          for (const f of it.flags) console.log(`   ${SYMBOL.warning} ${f}`);
          for (const x of it.prompts.slice(0, REVIEW_PROMPTS_SHOWN)) console.log(`   · ${x}`);
          if (it.prompts.length > REVIEW_PROMPTS_SHOWN) console.log(c.dim(`   · ...and ${it.prompts.length - REVIEW_PROMPTS_SHOWN} more (okb review --json)`));
          if (it.source) console.log(c.dim(`   ${it.source}`));
          console.log("");
        }
        console.log(c.dim("Record answers that needed thought (or that someone might question later): okb decision add ..."));
      });
    }

    case "edgeprop": {
      const { v, p } = parse(rest.slice(1), { type: str, values: strs, required: bool, desc: str, remove: bool });
      if (p.length !== 2) throw new OkbError("Usage: okb relationship property <relationship> <name> --type String|Integer|Float|Boolean|Enumerated [--values a,b] [--required] [--desc ...] [--remove]");
      return mutate(v, (ont) => ops.declareEdgeProperty(ont, p[0], p[1], { type: v.type, values: v.values, required: v.required, description: v.desc, remove: v.remove }));
    }

    case "link": {
      const { v, p } = parse(rest, { rule: str, clear: strs });
      if (p.length < 3) throw new OkbError('Usage: okb link <from> <relationship> <to> [name=value ...] [--rule <rule id>] [--clear name]');
      return mutate(v, (ont) => ops.link(ont, p[0], p[1], p[2], { props: p.slice(3), rule: v.rule, clear: v.clear }));
    }

    case "unlink": {
      const { v, p } = parse(rest);
      if (p.length !== 3) throw new OkbError("Usage: okb unlink <from> <relationship> <to>");
      return mutate(v, (ont) => ops.unlink(ont, p[0], p[1], p[2]));
    }

    case "export": {
      const { v } = parse(rest, { format: str, out: str, "with-schema": bool, "no-inherited": bool });
      const ont = load(v);
      const fmt = v.format ?? (v.out?.endsWith(".cypher") || v.out?.endsWith(".cql") ? "cypher" : "json");
      if (!["json", "cypher"].includes(fmt)) throw new OkbError("--format must be json or cypher.");
      const g = exportGraph(ont, { inherited: !v["no-inherited"], schema: v["with-schema"] });
      const text = fmt === "cypher" ? toCypher(g) : JSON.stringify(g, null, 2) + "\n";
      if (v.out) {
        writeFileSync(resolve(v.out), text);
        console.log(`Wrote ${v.out}: ${g.nodes.length} nodes, ${g.relationships.length} relationships (${fmt}).`);
        for (const n of g.notes) console.log(c.dim("  " + n));
      } else process.stdout.write(text);
      return;
    }

    case "source": {
      const rest2 = rest.slice(1);
      if (sub === "add") {
        const { v, p } = parse(rest2, { title: str, url: str, "repo-url": str, id: str });
        if (!p[0]) throw new OkbError("Usage: okb source add <file.md|file.pdf> [--title ...] [--repo-url <GitHub file URL>] [--url <rendered page URL>]");
        return mutate(v, (ont) => prov.addSource(ont, p[0], { title: v.title, url: v.url, repoUrl: v["repo-url"], id: v.id }));
      }
      if (sub === "refresh") {
        const { v, p } = parse(rest2);
        return mutate(v, (ont) => prov.refreshSource(ont, p[0]));
      }
      if (sub === "outline") {
        const { v, p } = parse(rest2, { quotable: bool, problems: bool });
        const ont = load(v);
        const src = ont.find(p[0], "Source");
        if (src.format !== "markdown") throw new OkbError("outline works on markdown sources.");
        const doc = prov.readMarkdownSource(ont, src);
        const quoted = new Map<number, string[]>();
        for (const id of ont.sources(src.id, "PART_OF")) {
          const l = ont.get(id);
          if (l?.type !== "SourceLocation" || l.startLine === undefined) continue;
          const { startLine, endLine } = l;
          for (let n = startLine; n <= (endLine ?? startLine); n++) quoted.set(n, [...(quoted.get(n) ?? []), id]);
        }
        const blocks = doc.blocks.filter((b) => !v.quotable || b.quotable);
        const outline = () => ({
          source: src.id, title: doc.title, frontmatter: doc.frontmatter, problems: doc.problems,
          blocks: blocks.map((b) => ({ index: b.index, kind: b.kind, headingPath: b.headingPath, lines: [b.startLine, b.endLine], quotable: b.quotable, note: b.note, calloutType: b.calloutType, row: b.row, text: b.kind === "code" ? undefined : b.text, alreadyQuoted: [...new Set(Array.from({ length: b.endLine - b.startLine + 1 }, (_, k) => quoted.get(b.startLine + k) ?? []).flat())] })),
        });
        return output(v, outline, () => {
          console.log(c.bold(`${doc.title ?? src.id}`) + c.dim(`  ${src.localPath} · ${doc.blocks.length} blocks, ${doc.blocks.filter((b) => b.quotable).length} quotable`));
          if (doc.problems.length) {
            console.log(c.yellow(`\n${doc.problems.length} problem(s) in the document:`));
            for (const pr of doc.problems) console.log(c.yellow(`  line ${pr.line}: ${pr.message}`));
          }
          if (v.problems) return;
          let lastPath = "";
          for (const b of blocks) {
            const pth = b.headingPath.join(" > ");
            if (pth !== lastPath) {
              console.log("\n" + c.bold(pth || "(top)"));
              lastPath = pth;
            }
            const mark = !b.quotable ? c.dim("·") : quoted.has(b.startLine) ? SYMBOL.ok : SYMBOL.todo;
            const where = `L${b.startLine}${b.endLine > b.startLine ? `-${b.endLine}` : ""}`.padEnd(9);
            const label = b.kind === "code" ? c.dim(`code (${b.lang || "text"}), not quotable`) : b.kind === "comment" ? c.dim("comment") : b.kind === "frontmatter" ? c.dim("frontmatter") : (b.calloutType ? c.cyan(`[${b.calloutType}] `) : "") + b.text.slice(0, 110) + (b.text.length > 110 ? "…" : "");
            console.log(`  ${mark} ${c.dim(where)} ${c.dim(b.kind.padEnd(10))} ${label}${b.note?.startsWith("malformed") ? c.yellow("  ⚠ " + b.note) : ""}`);
          }
          console.log(c.dim(`\n${SYMBOL.ok} quoted   ${SYMBOL.todo} not quoted yet   · not quotable   ·   okb quote add ${src.id} "..."`));
        });
      }
      const { v } = parse(sub === "list" ? rest2 : rest);
      const ont = load(v);
      for (const s of ont.ofType("Source")) {
        console.log(`${c.bold(s.id)}  ${s.title} ${c.dim(`(${s.format ?? "?"}, ${ont.sources(s.id, "PART_OF").length} quotes)`)}  ${c.dim(s.localPath ?? s.url ?? "")}`);
      }
      if (!ont.ofType("Source").length) console.log(c.dim("No sources yet. okb source add <file>"));
      return;
    }

    case "quote": {
      if (sub === "add") {
        const { v, p } = parse(rest.slice(1), { cites: strs, line: str, "allow-code": bool });
        if (p.length < 2) throw new OkbError('Usage: okb quote add <source> "verbatim text" [--cites <node>] [--line N]');
        const ont = load(v);
        const notes = await prov.addQuote(ont, p[0], p.slice(1).join(" "), { cites: v.cites, line: num(v.line, "--line"), allowCode: v["allow-code"] });
        ont.save();
        return void say(notes);
      }
      const { v, p } = parse(sub === "list" ? rest.slice(1) : rest);
      const ont = load(v);
      const locs = ont.ofType("SourceLocation").filter((l) => !p[0] || ont.targets(l.id, "PART_OF").includes(ont.find(p[0], "Source").id));
      return output(v, () => locs.map((l) => ({ ...l, citedBy: ont.sources(l.id, "CITES") })), () => {
        for (const l of locs) {
          const by = ont.sources(l.id, "CITES").map((x) => ont.label(x));
          console.log(`${c.bold(l.id)} ${c.dim(`${l.locator}${l.lines ? `, line ${l.lines}` : ""}`)}\n   "${l.quote}"${by.length ? c.dim(`\n   cited by: ${by.join(", ")}`) : ""}`);
        }
      });
    }

    case "rule": {
      if (sub === "add") {
        const { v } = parse(rest.slice(1), { statement: str, modality: str, governs: strs, cites: strs, name: str });
        if (!v.statement || !v.modality) throw new OkbError('Usage: okb rule add --statement "..." --modality MUST|SHOULD|MAY|MUST_NOT|SHOULD_NOT --cites <quote id> [--governs <Class|slot>]');
        return mutate(v, (ont) => prov.addRule(ont, { statement: v.statement, modality: v.modality, governs: v.governs, cites: v.cites, name: v.name }));
      }
      const { v } = parse(sub === "list" ? rest.slice(1) : rest);
      const ont = load(v);
      for (const r of ont.ofType("Rule")) {
        const st = r.verification?.status ?? "unverified";
        console.log(`${c.bold(r.id)} ${c.dim(`[${r.modality} · ${st}${r.extractionConfidence ? " · " + r.extractionConfidence : ""}]`)}\n   ${r.statement}${c.dim(`\n   governs: ${ont.targets(r.id, "GOVERNS").map((x) => ont.label(x)).join(", ") || "—"} · cites: ${ont.targets(r.id, "CITES").join(", ")}`)}`);
      }
      return;
    }

    case "verify": {
      const { v, p } = parse(rest, { status: str, corrected: str, confidence: str, note: str, approve: bool });
      if (!p[0]) throw new OkbError('Usage: okb verify <node> --status SUPPORTED|OVERREACH|UNSUPPORTED [--corrected "..."] [--confidence verbatim|paraphrased]  ·  okb verify <node> --approve');
      return mutate(v, (ont) => prov.verify(ont, p[0], { status: v.status, corrected: v.corrected, confidence: v.confidence, note: v.note, approve: v.approve }));
    }

    case "drift": {
      const { v, p } = parse(rest);
      const onts = (p.length ? p : ["."]).map((d) => Ontology.load(d));
      const merged = Ontology.fromData(onts.flatMap((o) => o.nodes.filter((n) => n.type !== "Ontology")), onts.flatMap((o) => o.edges));
      const hits = duplicateQuotes(merged);
      return output(v, () => hits, () => {
        if (!hits.length) return void console.log(`${SYMBOL.ok} No near-duplicate quotes across different sources.`);
        for (const h of hits) console.log(`${SYMBOL.info} ${h.message}`);
      });
    }

    default:
      throw new OkbError(`Unknown command '${cmd}'. Run okb help.`);
  }
}

try {
  await main(process.argv.slice(2));
} catch (e) {
  if (e instanceof OkbError || String((e as any)?.code ?? "").startsWith("ERR_PARSE_ARGS")) {
    console.error(`${SYMBOL.error} ${(e as Error).message}`);
    process.exitCode = 2;
  } else throw e;
}
