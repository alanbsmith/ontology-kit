/** Human-readable output: findings, explanations, trees, node details, Mermaid diagrams. */
import { ruleUrl } from "./site.ts";
import { MetaKB, explainName, type Explainable, type MetaStep } from "./metakb.ts";
import { edgeProps, nodeLabel, type CompetencyQuestionNode, type DesignDecisionNode, type Ontology, type OkbNode, type SlotNode, type SourceLocationNode, type SourceNode } from "@ontology-kit/reader";
import { type Finding } from "./types.ts";
import * as naming from "./naming.ts";
import type { CheckReport } from "./check.ts";
import type { MdDoc } from "./markdown.ts";
import type { ReviewItem } from "./review.ts";
import type { SkillState } from "./skills.ts";
import type { computeStatus } from "./status.ts";

type Status = ReturnType<typeof computeStatus>;

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const wrap = (code: number) => (s: string) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
export const c = { bold: wrap(1), dim: wrap(2), red: wrap(31), green: wrap(32), yellow: wrap(33), blue: wrap(34), cyan: wrap(36) };
export const SYMBOL = { error: c.red("✗"), warning: c.yellow("!"), info: c.blue("i"), ok: c.green("✓"), todo: c.dim("○"), ask: c.cyan("?") };

function indent(text: string, pad: string, width = 96): string {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > width - pad.length) {
      lines.push(line);
      line = w;
    } else line = (line ? line + " " : "") + w;
  }
  if (line) lines.push(line);
  return lines.map((l) => pad + l).join("\n");
}

export function formatFindings(findings: Finding[], ont: Ontology, opts: { all?: boolean; verbose?: boolean }): string {
  const meta = MetaKB.get();
  const open = findings.filter((f) => !f.explainedBy);
  const explained = findings.filter((f) => f.explainedBy);
  const count = (s: string) => open.filter((f) => f.severity === s).length;
  const out: string[] = [];
  const stepNote = opts.all ? "all checks" : `checks for steps 1–${ont.step} (use --all for the rest)`;
  out.push(`${SYMBOL.error} ${count("error")} error(s)   ${SYMBOL.warning} ${count("warning")} warning(s)   ${SYMBOL.info} ${count("info")} hint(s)   ${c.dim("· " + stepNote)}`);
  if (open.length === 0) out.push(`\n${SYMBOL.ok} Nothing to fix right now.`);
  const sections: [string, string][] = [["error", "ERRORS: must fix"], ["warning", "WARNINGS: fix, or record a design decision explaining why not"], ["info", "HINTS: worth a look"]];
  for (const [sev, title] of sections) {
    const fs = open.filter((f) => f.severity === sev);
    if (!fs.length) continue;
    out.push("", c.bold(title));
    for (const f of fs) {
      const rule = meta.rule(f.rule);
      out.push(`  ${SYMBOL[sev as "error"]} ${f.message} ${c.dim(`[${f.rule}]`)}`);
      if (rule.fix) out.push(c.dim(indent(`Fix: ${rule.fix}`, "      ")));
      if (opts.verbose) {
        out.push(c.dim(indent(`Why: ${rule.plainLanguage}`, "      ")));
        const cites = meta.citations(rule.id);
        if (cites.length) out.push(c.dim(`      Source: ${meta.citeLine(cites[0])}`));
        out.push(c.dim(`      Read more: ${ruleUrl(rule.id)}`));
      }
    }
  }
  if (explained.length) {
    out.push("", c.bold(`EXPLAINED by design decisions (${explained.length})`));
    for (const f of explained) out.push(c.dim(`  · ${f.message} [${f.rule}] → ${f.explainedBy}`));
  }
  out.push("", c.dim("Learn about any rule: okb explain <rule-id>" + (opts.verbose ? "" : "   ·   add --why for reasons and sources")));
  return out.join("\n");
}

function quotes(meta: MetaKB, id: string): string[] {
  return meta.citations(id).map((loc) => `  “${loc.quote}”\n  ${c.dim("— " + meta.citeLine(loc))}`);
}

export function explain(node: Explainable): string {
  const meta = MetaKB.get();
  const out: string[] = [];
  const h = (s: string) => out.push("", c.bold(s));
  switch (node.type) {
    case "Rule": {
      out.push(c.bold(`Rule ${node.key}`) + c.dim(`  (${node.modality.replace("_", " ")} · ${node.severity} · ${node.check} check · basis: ${node.basis})`));
      out.push("", indent(node.statement, "  "));
      h("In plain words");
      out.push(indent(node.plainLanguage, "  "));
      h("Why");
      out.push(indent(meta.rationale(node), "  "));
      if (node.severityReason) out.push(indent(`Severity note: ${node.severityReason}`, "  "));
      if (node.review) {
        h("Ask yourself");
        out.push(indent(node.review, "  "));
      }
      if (node.fix) {
        h("How to fix");
        out.push(indent(node.fix, "  "));
      }
      const q = quotes(meta, node.id);
      if (q.length) {
        h("Source");
        out.push(...q);
      } else out.push("", c.dim("  (Toolkit rule: no source passage. See basis above.)"));
      out.push("", c.dim(`  Applies from step ${node.fromStep}.`));
      out.push(c.dim(`  Read more: ${ruleUrl(node.id)}`));
      break;
    }
    case "Concept": {
      out.push(c.bold(node.name) + (node.aliases?.length ? c.dim(`  (also: ${node.aliases.join(", ")})`) : ""));
      out.push("", indent(node.plainLanguage, "  "));
      h("Definition");
      out.push(indent(node.definition, "  "));
      if (node.example) {
        h("Example");
        out.push(indent(node.example, "  "));
      }
      if (node.inThisToolkit) {
        h("In okb");
        out.push(indent(node.inThisToolkit, "  "));
      }
      const rules = meta.sources(node.id, "GOVERNS").map((r) => meta.node(r, "Rule").key);
      if (rules.length) {
        h("Related rules");
        out.push(indent(rules.join(", "), "  "));
      }
      const q = quotes(meta, node.id);
      if (q.length) {
        h("Source");
        out.push(...q);
      }
      break;
    }
    case "Principle": {
      out.push(c.bold(`Principle: ${node.name}`));
      out.push("", indent(node.plainLanguage, "  "));
      h("Stated as");
      out.push(indent(node.statement, "  "));
      h("Source");
      out.push(...quotes(meta, node.id));
      break;
    }
    case "Decision": {
      out.push(c.bold(`Decision guide: ${node.name}`));
      out.push(indent(node.plainLanguage, "  "), c.dim(`  When: ${node.whenYouFaceIt}`), "");
      node.tests.forEach((t, i) => {
        out.push(`  ${i + 1}. ${t.ask}`);
        if (t.ifYes && t.ifYes !== "continue") out.push(`       yes → ${t.ifYes}`);
        else if (t.ifYes === "continue") out.push(c.dim("       yes → next question"));
        if (t.ifNo && t.ifNo !== "continue") out.push(`       no  → ${t.ifNo}`);
        else if (t.ifNo === "continue") out.push(c.dim("       no  → next question"));
      });
      if (node.note) out.push("", indent(node.note, "  "));
      if (node.wine) {
        h("Wine example");
        out.push(indent(node.wine, "  "));
      }
      h("Source");
      out.push(...quotes(meta, node.id));
      break;
    }
    case "Step":
      out.push(stepGuide(node));
      break;
    default:
      out.push(JSON.stringify(node, null, 2));
  }
  return out.join("\n");
}

export function stepGuide(step: MetaStep): string {
  const meta = MetaKB.get();
  const out: string[] = [];
  out.push(c.bold(`Step ${step.order} of ${meta.steps.length}: ${step.name}`));
  out.push("", indent(`Goal: ${step.goal}`, "  "));
  out.push(indent(`Why it matters: ${step.whyItMatters}`, "  "));
  out.push("", c.bold("Questions to answer"));
  for (const q of step.guidingQuestions) out.push(indent(`• ${q}`, "  "));
  out.push("", c.bold("You're done when"));
  for (const d of step.doneWhen) out.push(`  ${d.check ? SYMBOL.todo : SYMBOL.ask} ${d.text}`);
  if (step.tips?.length) {
    out.push("", c.bold("Tips"));
    // Tips can hold markdown links for the docs page; in the terminal show the address after the name.
    for (const t of step.tips) out.push(indent(`• ${t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")}`, "  "));
  }
  if (step.wine) out.push("", c.bold("In Ontology 101's wine example"), ...step.wine.split("\n").map((l) => indent(step.wine.includes("\n") ? `• ${l}` : l, "  ")));
  const decisions = meta.targets(step.id, "USES").map((d) => meta.node(d, "Decision"));
  if (decisions.length) {
    out.push("", c.bold("Decision guides for this step") + c.dim("  (okb explain <id>)"));
    for (const d of decisions) out.push(`  ${d.id.padEnd(28)} ${d.name}`);
  }
  if (step.commands?.length) out.push("", c.bold("Commands"), "  " + step.commands.join("   "));
  return out.join("\n");
}

export function listExplainable(): string {
  const meta = MetaKB.get();
  const out: string[] = [c.bold("Things you can `okb explain`:"), ""];
  out.push(c.bold("Steps"));
  for (const s of meta.steps) out.push(`  ${String(s.order).padEnd(4)} ${s.name}`);
  out.push("", c.bold("Principles"));
  for (const p of meta.ofType("Principle")) out.push(`  ${p.id.padEnd(40)} ${p.name}`);
  out.push("", c.bold("Glossary"));
  out.push(indent(meta.ofType("Concept").map((x) => x.name).join(" · "), "  "));
  out.push("", c.bold("Decision guides"));
  for (const d of meta.ofType("Decision")) out.push(`  ${d.id.padEnd(28)} ${d.name}`);
  out.push("", c.bold("Rules"));
  for (const r of meta.ofType("Rule")) out.push(`  ${r.key.padEnd(34)} ${c.dim(r.modality.padEnd(10))} ${r.plainLanguage.split(". ")[0].slice(0, 70)}`);
  return out.join("\n");
}

export function tree(ont: Ontology, withInstances = false): string {
  const out: string[] = [];
  const printed = new Set<string>();
  const walk = (id: string, depth: number, parent?: string) => {
    const n = ont.require(id);
    const others = ont.parents(id).filter((p) => p !== parent);
    const tags = [n.type === "Class" && n.abstract ? "abstract" : "", others.length ? `also under ${others.map((o) => ont.label(o)).join(", ")}` : ""].filter(Boolean);
    const pad = "  ".repeat(depth);
    if (printed.has(id)) {
      out.push(`${pad}${depth ? "└ " : ""}${ont.label(id)} ${c.dim("(see above)")}`);
      return;
    }
    printed.add(id);
    out.push(`${pad}${depth ? "└ " : ""}${c.bold(ont.label(id))}${tags.length ? c.dim(` (${tags.join("; ")})`) : ""}`);
    if (withInstances) {
      for (const i of ont.sources(id, "INSTANCE_OF")) out.push(`${pad}  ${c.cyan("• " + ont.label(i))}`);
    }
    for (const k of ont.children(id).sort((a, b) => ont.label(a).localeCompare(ont.label(b)))) walk(k, depth + 1, id);
  };
  const roots = ont.roots().sort((a, b) => ont.label(a).localeCompare(ont.label(b)));
  for (const r of roots) walk(r, 0);
  const cyclic = ont.ofType("Class").filter((x) => !printed.has(x.id));
  if (cyclic.length) out.push("", c.red(`Not reachable from any top-level class (probably a cycle): ${cyclic.map((x) => x.name).join(", ")}`));
  if (!out.length) out.push(c.dim("(no classes yet: okb class add <Name>)"));
  return out.join("\n");
}

function fmtFacets(ont: Ontology, slotId: string, classes: Iterable<string> = []): string {
  const n = ont.get(slotId);
  const s: Partial<SlotNode> = n?.type === "Slot" ? n : {};
  const f = ont.effectiveFacets(slotId, classes);
  const parts = [f.valueType ?? c.red("no type")];
  if (f.allowedValues) parts.push(`{${f.allowedValues.join(", ")}}`);
  if (f.range.length) {
    const spec = ont.rel.spec(slotId);
    parts.push(`→ ${f.range.map((r) => ont.label(r)).join(" | ")}${spec ? c.dim(spec.reverse ? ` (reads :${spec.type} backwards)` : ` (:${spec.type})`) : ""}`);
  }
  parts.push(s.cardinality ?? c.yellow("cardinality?"));
  if (f.min) parts.push(`min ${f.min}`);
  if (f.max !== null && !(s.cardinality === "single" && f.max === 1)) parts.push(`max ${f.max}`);
  if (s.default !== undefined) parts.push(`default ${JSON.stringify(s.default)}`);
  const inv = ont.inverses(slotId);
  if (inv.length) parts.push(`inverse of ${inv.map((i) => ont.label(i)).join(", ")}`);
  return parts.join(", ");
}

/** A value for display; relationship values show their edge properties: SegmentedControl {condition: "2 to 7 options"} */
function fmtVal(ont: Ontology, ownerId: string, slotId: string, v: unknown): string {
  const e = typeof v === "string" ? ont.rel.edge(ownerId, slotId, v) : undefined;
  const props = e ? Object.entries(edgeProps(e)).map(([k, x]) => `${k}: ${JSON.stringify(x)}`).join(", ") : "";
  return ont.label(String(v)) + (props ? c.dim(` {${props}}`) : "");
}

export function show(ont: Ontology, n: OkbNode): string {
  const out: string[] = [];
  const line = (k: string, v: string) => out.push(`  ${c.dim(k.padEnd(14))} ${v}`);
  out.push(`${c.bold(nodeLabel(n))}  ${c.dim(`${n.type} · ${n.id}`)}`);
  if ("description" in n && n.description) out.push(indent(n.description, "  "));
  if (n.createdAt) line("created", n.createdAt);
  if (n.updatedAt) line("updated", n.updatedAt);
  if (n.type === "Class") {
    line("parents", ont.parents(n.id).map((p) => ont.label(p)).join(", ") || "(top level)");
    line("subclasses", ont.children(n.id).map((p) => ont.label(p)).join(", ") || "—");
    if (n.synonyms?.length) line("synonyms", n.synonyms.join(", "));
    const flags = [n.abstract && "abstract", n.terminological && "terminological"].filter(Boolean);
    if (flags.length) line("flags", flags.join(", "));
    const dis = [...ont.targets(n.id, "DISJOINT_WITH"), ...ont.sources(n.id, "DISJOINT_WITH")];
    if (dis.length) line("disjoint with", dis.map((d) => ont.label(d)).join(", "));
    const ctx = [...ont.up(n.id)];
    out.push("", c.bold("  Slots") + c.dim("  (properties hold values; relationships → link to other things)"));
    const own = ont.ownSlots(n.id);
    const all = ont.applicableSlots(n.id);
    if (!all.length) out.push(c.dim("    (none yet)"));
    for (const sid of all) {
      const from = own.includes(sid) ? "" : c.dim(` (from ${ont.domain(sid).filter((d) => ont.ancestors(n.id).has(d)).map((d) => ont.label(d)).join(", ")})`);
      out.push(`    ${ont.label(sid).padEnd(18)} ${fmtFacets(ont, sid, ctx)}${from}`);
      const fixed = ont.statedValues(n.id, sid);
      if (fixed.length) out.push(`    ${"".padEnd(18)} ${c.cyan("fixed = ")}${fixed.map((v) => fmtVal(ont, n.id, sid, v)).join(", ")}`);
      else {
        const inh = ont.inheritedFixed(sid, ont.ancestors(n.id));
        if (inh) out.push(`    ${"".padEnd(18)} ${c.cyan(`fixed = ${inh.values.map((v) => ont.label(String(v))).join(", ")}`)}${c.dim(` (by ${ont.label(inh.cls)})`)}`);
      }
      if (n.defaults?.[sid] !== undefined) out.push(`    ${"".padEnd(18)} default here = ${JSON.stringify(n.defaults[sid])}`);
    }
    const inst = ont.sources(n.id, "INSTANCE_OF");
    if (inst.length) line("instances", inst.map((i) => ont.label(i)).join(", "));
  } else if (n.type === "Slot") {
    line("kind", n.valueType === "Instance" ? "relationship (links to other things)" : "property (holds a value)");
    line("facets", fmtFacets(ont, n.id));
    const primary = ont.get(ont.rel.primary(n.id));
    const decls = (primary?.type === "Slot" && primary.edgeProperties) || [];
    if (decls.length) line("edge props", decls.map((d) => `${d.name} (${d.valueType}${d.allowedValues ? ` {${d.allowedValues.join(", ")}}` : ""}${d.required ? ", required" : ""})`).join(", ") + c.dim(" + rule"));
    line("attached to", [...ont.domain(n.id).map((d) => ont.label(d)), ...(n.appliesToRules ? ["every rule"] : [])].join(", ") || c.yellow("(no class yet)"));
    const users = ont.ofType("Class").filter((x) => x.facetOverrides?.[n.id]);
    if (users.length) line("restricted by", users.map((u) => u.name).join(", "));
  } else if (n.type === "Instance") {
    line("instance of", ont.targets(n.id, "INSTANCE_OF").map((x) => ont.label(x)).join(", "));
    out.push("", c.bold("  Values"));
    const ctx = ont.instanceClasses(n.id);
    for (const sid of ont.applicableSlots(n.id)) {
      const vals = ont.statedValues(n.id, sid);
      const inh = vals.length ? null : ont.inheritedFixed(sid, ctx);
      const shown = vals.length ? vals.map((v) => fmtVal(ont, n.id, sid, v)).join(", ") : inh ? c.cyan(inh.values.map((v) => ont.label(String(v))).join(", ") + ` (fixed by ${ont.label(inh.cls)})`) : c.dim("—");
      out.push(`    ${ont.label(sid).padEnd(18)} ${shown}`);
    }
  } else {
    for (const [k, v] of Object.entries(n)) if (!["id", "type", "name", "values", "authored", "createdAt", "updatedAt"].includes(k)) line(k, typeof v === "string" ? v : JSON.stringify(v));
    if (n.type === "Rule") {
      if (n.authored) line("authored", "yes (written by the ontology's owner)");
      for (const sid of ont.applicableSlots(n.id)) {
        const vals = ont.statedValues(n.id, sid);
        if (vals.length) line(ont.label(sid), vals.join(", "));
      }
    }
    const outs = ont.edges.filter((e) => e.from === n.id);
    for (const e of outs) line(e.type, ont.label(e.to) + (e.adds ? c.dim(` (adds: ${e.adds})`) : ""));
    if (n.type === "Rule") {
      for (const [type, label] of Object.entries({ REFINES: "refined by", FULFILLS: "fulfilled by" })) {
        const by = ont.sources(n.id, type).map((x) => ont.label(x));
        if (by.length) line(label, by.join(", "));
      }
    }
  }
  const decisions = ont.sources(n.id, "ABOUT");
  if (decisions.length) {
    out.push("", c.bold("  Design decisions"));
    for (const d of decisions) {
      const dn = ont.get(d);
      out.push(indent(`${d}: ${dn?.type === "DesignDecision" ? `${dn.title}. ${dn.decision}` : ont.label(d)}`, "    "));
    }
  }
  return out.join("\n");
}

export function mermaid(ont: Ontology): string {
  const id = (x: string) => naming.convert(ont.label(x), "PascalCase").replace(/[^A-Za-z0-9]/g, "") || x.replace(/[^A-Za-z0-9]/g, "_");
  // accTitle and accDescr become the SVG's <title> and <desc> for screen readers. Mermaid reads each to
  // the end of its line, so they stay on one line and keep clear of braces.
  const oneLine = (t: string) => t.replace(/[\r\n{}]+/g, " ").trim();
  const classes = ont.ofType("Class").length;
  const links = ont.ofType("Slot").filter((s) => s.valueType === "Instance").length;
  const out = [
    "```mermaid",
    "classDiagram",
    `  accTitle: ${oneLine(`${ont.manifest.name} classes`)}`,
    `  accDescr: ${oneLine(`Class diagram of the ${ont.manifest.name} ontology: ${classes} ${classes === 1 ? "class" : "classes"}, arrows from each class to its parent, and ${links} ${links === 1 ? "relationship" : "relationships"} between classes.`)}`,
  ];
  for (const cl of ont.ofType("Class")) {
    const lines = ont.ownSlots(cl.id)
      .map((s) => ont.get(s))
      .filter((sn): sn is SlotNode => sn?.type === "Slot" && sn.valueType !== "Instance")
      .map((sn) => {
        const t = sn.valueType === "Enumerated" && sn.allowedValues ? `${sn.allowedValues.join("|")}` : sn.valueType ?? "?";
        return `    ${t.replace(/[{}]/g, "")} ${sn.name}${sn.cardinality === "multiple" ? "[]" : ""}`;
      });
    const label = cl.name !== id(cl.id) ? `["${cl.name}"]` : "";
    out.push(`  class ${id(cl.id)}${label} {`);
    if (cl.abstract) out.push("    <<abstract>>");
    out.push(...lines, "  }");
  }
  for (const e of ont.edgesOf("IS_A")) out.push(`  ${id(e.to)} <|-- ${id(e.from)}`);
  for (const s of ont.ofType("Slot").filter((s) => s.valueType === "Instance")) {
    for (const d of ont.domain(s.id)) for (const r of ont.range(s.id)) out.push(`  ${id(d)} --> ${id(r)} : ${s.name}`);
  }
  out.push("```");
  const disj = ont.edgesOf("DISJOINT_WITH").map((e) => `${ont.label(e.from)} ⟂ ${ont.label(e.to)}`);
  if (disj.length) out.push("", `Disjoint: ${disj.join(" · ")}`);
  return out.join("\n");
}

/** The `okb check` summary: one line per check, the problems under the ones that failed, and a verdict. */
export function formatCheck(report: CheckReport, name: string): string {
  const out = [c.bold(`okb check: ${name}`) + c.dim(`  (okb ${report.installed}${report.pinned ? `, KB pins ${report.pinned}` : ""})`), ""];
  const mark = { pass: SYMBOL.ok, warn: SYMBOL.warning, fail: SYMBOL.error };
  for (const s of report.steps) {
    out.push(`${mark[s.status]} ${c.bold(s.title)}: ${s.summary}`);
    for (const p of s.problems) out.push(`    ${SYMBOL.error} ${p}`);
  }
  const failed = report.steps.filter((s) => s.status === "fail").length;
  const warned = report.steps.filter((s) => s.status === "warn").length;
  const safe = warned ? `no check failed, but ${warned} warned (marked ${SYMBOL.warning} above).` : "every check passed.";
  out.push("", report.ok ? `${SYMBOL.ok} Safe to merge: ${safe}` : `${SYMBOL.error} Not safe to merge: ${failed} of ${report.steps.length} checks failed.`);
  return out.join("\n");
}

// ---- Terminal output for the command records (src/commands/). Each returns lines; the runner prints them. ----

/** A note that teaches rather than reports is shown dimmed. */
const TIP = /^(Tip|Add a|Attach|Decide|Say which|List the)/;

export function formatNotes(notes: readonly string[]): string[] {
  return notes.map((n) => (TIP.test(n) ? c.dim("  " + n) : n));
}

export function renderInit(name: string, root: string, folder: string, guide: string): string[] {
  return [`${SYMBOL.ok} Created ontology '${name}' in ${root}\n`, guide, c.dim(`\nNext: cd ${folder} && okb scope --domain "..." --purpose "..." --users "..."`)];
}

export function renderScope(m: Ontology["meta"]): string[] {
  const row = (k: string, val: unknown) => `  ${c.dim(k.padEnd(13))} ${Array.isArray(val) ? val.join(", ") || c.yellow("—") : val || c.yellow("—")}`;
  return [c.bold(m.name), row("domain", m.domain), row("purpose", m.purpose), row("users", m.users), row("maintainers", m.maintainers), row("out of scope", m.outOfScope), row("kind", m.kind)];
}

export function renderConvention(ont: Ontology): string {
  const cv = ont.conventions!;
  return `Naming convention: classes ${cv.classCase} (${cv.classNumber}) · slots ${cv.slotCase}${cv.slotAffix !== "none" ? ` (${cv.slotAffix})` : ""} · instances ${cv.instanceCase ?? "free text"}`;
}

export function renderQuestions(ont: Ontology, qs: readonly CompetencyQuestionNode[]): string[] {
  if (!qs.length) return [c.dim('No competency questions yet. okb cq add "..."')];
  const out: string[] = [];
  for (const q of qs) {
    const needs = ont.targets(q.id, "NEEDS").map((n) => ont.label(n));
    const num = ont.displayNumber(q);
    out.push(`${c.bold(String(num).padEnd(3))} ${q.text} ${c.dim(`[${q.status ?? "draft"}]`)}`);
    out.push(c.dim(`       needs: ${needs.length ? needs.join(", ") : "(not linked yet: okb cq link " + num + " <Class|slot>...)"}`));
  }
  return out;
}

export function renderTerms(ont: Ontology): string[] {
  const ts = ont.ofType("Term");
  const groups = new Map<string, string[]>();
  for (const t of ts) {
    const d = t.disposition ?? "undecided";
    const became = ont.targets(t.id, "BECAME").map((x) => ont.label(x));
    groups.set(d, [...(groups.get(d) ?? []), t.text + (became.length ? c.dim(` → ${became.join(", ")}`) : "")]);
  }
  const out = [...groups].map(([d, items]) => `${c.bold(d.padEnd(13))} ${items.join(" · ")}`);
  if (!ts.length) out.push(c.dim("No terms yet. okb term add wine grape winery ..."));
  return out;
}

export function renderReuse(ont: Ontology): string[] {
  const rs = ont.ofType("ReusedOntology");
  const out = rs.map((r) => `${c.bold(r.name)} ${c.dim(`[${r.decision}]`)} ${r.url ?? ""} ${r.notes ? "\n  " + r.notes : ""}`);
  if (!rs.length) out.push(c.dim(ont.meta.reuseReviewed ? "Reviewed: nothing reused." : "Not reviewed yet."));
  return out;
}

export function renderDecisions(ont: Ontology, ds: readonly DesignDecisionNode[]): string[] {
  const out: string[] = [];
  for (const d of ds) {
    out.push(`${c.bold(String(ont.displayNumber(d)).padEnd(3))} ${d.title}`);
    out.push(`   ${d.decision}${d.rationale ? c.dim(" · why: " + d.rationale) : ""}`);
    const about = ont.targets(d.id, "ABOUT").map((x) => ont.label(x));
    if (about.length || d.metaRules) out.push(c.dim(`   about: ${about.join(", ") || "—"}${d.metaRules ? " · explains: " + d.metaRules.join(", ") : ""}`));
  }
  if (!ds.length) out.push(c.dim("No design decisions recorded yet."));
  return out;
}

export function renderFindings(findings: Finding[], hiddenLater: number, ont: Ontology, opts: { all?: boolean; verbose?: boolean }): string[] {
  const out = [formatFindings(findings, ont, opts)];
  if (hiddenLater) out.push(c.dim(`(${hiddenLater} warning(s)/hint(s) from later steps are hidden until you get there; okb validate --all shows them. Errors are never hidden.)`));
  return out;
}

export function renderStatus(ont: Ontology, findings: Finding[], st: Status): string[] {
  const meta = MetaKB.get();
  const shown = findings.filter((f) => !f.explainedBy && (f.severity === "error" || (meta.rule(f.rule).fromStep ?? 1) <= ont.step));
  const count = (sev: string) => shown.filter((f) => f.severity === sev).length;
  const out = [c.bold(ont.meta.name) + c.dim(`  · ${ont.ofType("Class").length} classes · ${ont.ofType("Slot").length} slots · ${ont.ofType("Instance").length} instances · ${ont.ofType("CompetencyQuestion").length} questions`), ""];
  for (const s of st.steps) {
    const here = s.order === ont.step ? c.cyan(" ◀ you are here") : "";
    const mark = s.complete ? SYMBOL.ok : s.order === ont.step ? c.cyan("▶") : SYMBOL.todo;
    out.push(`${mark} ${c.bold(`${s.order}. ${s.name}`)}${here}`);
    if (s.order === ont.step || (!s.complete && s.order < ont.step)) {
      for (const it of s.items) out.push(`     ${it.done === null ? SYMBOL.ask : it.done ? SYMBOL.ok : SYMBOL.todo} ${it.text}`);
    }
  }
  out.push("");
  out.push(`Validator (steps 1–${ont.step}): ${SYMBOL.error} ${count("error")}  ${SYMBOL.warning} ${count("warning")}  ${SYMBOL.info} ${count("info")}   ${c.dim("okb validate for details")}`);
  const cur = st.steps.find((s) => s.order === ont.step)!;
  if (cur.complete && ont.step < st.steps.length) out.push(c.green(`\nStep ${ont.step} looks done. When you're happy with it: okb step next`));
  else if (st.suggested < ont.step) out.push(c.yellow(`\nStep ${st.suggested} still has open items. It's fine to go back: okb step ${st.suggested}`));
  else out.push(c.dim(`\nSee the guide for this step: okb step`));
  return out;
}

/** What `okb step <n>` prints after moving: a warning if the step you left isn't finished, then the new step's guide. */
export function renderStepMove(target: number, leaving: { order: number; complete: boolean; items: { done: boolean | null; text: string }[] }): string[] {
  const out: string[] = [];
  if (target > leaving.order && !leaving.complete) {
    out.push(c.yellow(`Moving on with step ${leaving.order} unfinished (${leaving.items.filter((i) => i.done === false).map((i) => i.text).join("; ")}). That's allowed; the method is iterative.`));
  }
  out.push(c.cyan(`Now on step ${target}.`) + c.dim(` (To read a step's guide without moving: okb explain ${target})`) + "\n");
  out.push(stepGuide(MetaKB.get().step(target)!));
  return out;
}

export function renderExplainHits(hits: readonly Explainable[], q: string): string[] {
  if (!hits.length) return [`Nothing called '${q}'. Try: okb explain --search ${q}`];
  const out = [explain(hits[0])];
  if (hits.length > 1) out.push(c.dim(`\nAlso matches: ${hits.slice(1, 6).map(explainName).join(", ")}`));
  return out;
}

export function renderSearchHits(hits: readonly Explainable[], query: string): string[] {
  if (!hits.length) return [`Nothing mentions '${query}'.`];
  return hits.map((h) => `${(h.type === "Rule" ? h.key : h.id).padEnd(40)} ${c.dim(h.type)}  ${h.type === "Rule" ? h.statement.slice(0, 60) : h.name}`);
}

/** `okb review` lists this many prompts per rule in the terminal; --json has them all. */
const REVIEW_PROMPTS_SHOWN = 12;

export function renderReview(ont: Ontology, items: ReviewItem[], all: boolean): string[] {
  const out = [c.bold(all ? "Review: what only a person can judge (all rules)" : `Review: what only a person can judge (step ${ont.step} and anything already visible)`) + "\n"];
  for (const it of items) {
    out.push(`${SYMBOL.ask} ${c.bold(it.rule)} ${c.dim(`(${it.modality.replace("_", " ")})`)}  ${it.question}`);
    for (const f of it.flags) out.push(`   ${SYMBOL.warning} ${f}`);
    for (const x of it.prompts.slice(0, REVIEW_PROMPTS_SHOWN)) out.push(`   · ${x}`);
    if (it.prompts.length > REVIEW_PROMPTS_SHOWN) out.push(c.dim(`   · ...and ${it.prompts.length - REVIEW_PROMPTS_SHOWN} more (okb review --json)`));
    if (it.source) out.push(c.dim(`   ${it.source}`));
    out.push("");
  }
  out.push(c.dim("Record answers that needed thought (or that someone might question later): okb decision add ..."));
  return out;
}

export function renderSources(ont: Ontology): string[] {
  const out = ont.ofType("Source").map((s) => `${c.bold(s.id)}  ${s.title} ${c.dim(`(${s.format ?? "?"}, ${ont.sources(s.id, "PART_OF").length} quotes)`)}  ${c.dim(s.localPath ?? s.url ?? "")}`);
  if (!out.length) out.push(c.dim("No sources yet. okb source add <file>"));
  return out;
}

export function renderOutline(src: SourceNode, doc: MdDoc, blocks: MdDoc["blocks"], quoted: ReadonlyMap<number, unknown>, onlyProblems: boolean): string[] {
  const out = [c.bold(`${doc.title ?? src.id}`) + c.dim(`  ${src.localPath} · ${doc.blocks.length} blocks, ${doc.blocks.filter((b) => b.quotable).length} quotable`)];
  if (doc.problems.length) {
    out.push(c.yellow(`\n${doc.problems.length} problem(s) in the document:`));
    for (const pr of doc.problems) out.push(c.yellow(`  line ${pr.line}: ${pr.message}`));
  }
  if (onlyProblems) return out;
  let lastPath = "";
  for (const b of blocks) {
    const pth = b.headingPath.join(" > ");
    if (pth !== lastPath) {
      out.push("\n" + c.bold(pth || "(top)"));
      lastPath = pth;
    }
    const mark = !b.quotable ? c.dim("·") : quoted.has(b.startLine) ? SYMBOL.ok : SYMBOL.todo;
    const where = `L${b.startLine}${b.endLine > b.startLine ? `-${b.endLine}` : ""}`.padEnd(9);
    const label = b.kind === "code" ? c.dim(`code (${b.lang || "text"}), not quotable`) : b.kind === "comment" ? c.dim("comment") : b.kind === "frontmatter" ? c.dim("frontmatter") : (b.calloutType ? c.cyan(`[${b.calloutType}] `) : "") + b.text.slice(0, 110) + (b.text.length > 110 ? "…" : "");
    out.push(`  ${mark} ${c.dim(where)} ${c.dim(b.kind.padEnd(10))} ${label}${b.note?.startsWith("malformed") ? c.yellow("  ⚠ " + b.note) : ""}`);
  }
  out.push(c.dim(`\n${SYMBOL.ok} quoted   ${SYMBOL.todo} not quoted yet   · not quotable   ·   okb quote add ${src.id} "..."`));
  return out;
}

export function renderQuotes(ont: Ontology, locs: readonly SourceLocationNode[]): string[] {
  return locs.map((l) => {
    const by = ont.sources(l.id, "CITES").map((x) => ont.label(x));
    return `${c.bold(l.id)} ${c.dim(`${l.locator}${l.lines ? `, line ${l.lines}` : ""}`)}\n   "${l.quote}"${by.length ? c.dim(`\n   cited by: ${by.join(", ")}`) : ""}`;
  });
}

export function renderRules(ont: Ontology): string[] {
  return ont.ofType("Rule").map((r) => {
    const st = r.verification?.status ?? "unverified";
    return `${c.bold(r.id)} ${c.dim(`[${r.modality} · ${r.authored ? "authored · " : ""}${st}${r.extractionConfidence ? " · " + r.extractionConfidence : ""}]`)}\n   ${r.statement}${c.dim(`\n   governs: ${ont.targets(r.id, "GOVERNS").map((x) => ont.label(x)).join(", ") || "—"} · cites: ${ont.targets(r.id, "CITES").join(", ")}`)}`;
  });
}

export function renderDrift(hits: readonly { message: string }[]): string[] {
  if (!hits.length) return [`${SYMBOL.ok} No near-duplicate quotes across different sources.`];
  return hits.map((h) => `${SYMBOL.info} ${h.message}`);
}

export function renderReleaseVerify(r: { ok: boolean; id: string; version: string; checked: number; problems: string[] }): string[] {
  if (r.ok) return [`${SYMBOL.ok} ${r.id} ${r.version} matches its manifest (${r.checked} files).`];
  return [
    `${SYMBOL.error} ${r.id} ${r.version} doesn't match its manifest:`,
    ...r.problems.map((pr) => `  - ${pr}`),
    c.dim("  If the changes are intended, cut a new release: okb release <version>. If not, restore the files (git checkout)."),
  ];
}

export function renderPin(version: string): string {
  return `${SYMBOL.ok} Pinned okb ${version} in okb.json. okb check warns anyone with an older okb, and the CI workflow installs this version.`;
}

export function renderSkillsInstall(dir: string, lines: readonly string[]): string[] {
  return [`${SYMBOL.ok} Skills in ${dir}`, ...lines.map((l) => `  ${l}`), c.dim("\n  Start a new Claude Code or Cursor session to load them.")];
}

export function renderSkillsStatus(dir: string, metaVersion: string, skills: readonly { name: string; state: SkillState; detail: string }[]): string[] {
  const good = (s: SkillState) => s === "current";
  const out = [c.bold(`Skills in ${dir}`) + c.dim(`  (okb meta-KB ${metaVersion})`)];
  for (const s of skills) out.push(`  ${good(s.state) ? SYMBOL.ok : s.state === "missing" ? SYMBOL.todo : SYMBOL.warning} ${s.name.padEnd(26)} ${s.detail}`);
  if (!skills.every((s) => good(s.state))) out.push(c.dim("\n  Fix it with: okb skills install"));
  return out;
}

export function renderWrote(out: string, what: string, hint: string): string {
  return `${SYMBOL.ok} Wrote ${what} to ${out}${hint}.`;
}

export function renderStepGuide(order: number): string {
  return stepGuide(MetaKB.get().step(order)!);
}

export function renderDiagramWritten(out: string): string {
  return `Wrote ${out}. Open it in GitHub, VS Code (Markdown preview), or mermaid.live.`;
}

export function renderExportWritten(out: string, g: { nodes: unknown[]; relationships: unknown[]; notes: string[] }, fmt: string): string[] {
  return [`Wrote ${out}: ${g.nodes.length} nodes, ${g.relationships.length} relationships (${fmt}).`, ...g.notes.map((n) => c.dim("  " + n))];
}
