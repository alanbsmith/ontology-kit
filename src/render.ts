/** Human-readable output: findings, explanations, trees, node details, Mermaid diagrams. */
import { MetaKB, type Explainable, type MetaStep } from "./metakb.ts";
import { edgeProps, nodeLabel, type Ontology } from "./model.ts";
import * as naming from "./naming.ts";
import type { Finding, OkbNode } from "./types.ts";

// ------------------------------------------------------------------ styling
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

// ------------------------------------------------------------------ findings
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

// ------------------------------------------------------------------ explain
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
      out.push(c.dim(`  When: ${node.whenYouFaceIt}`), "");
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
    for (const t of step.tips) out.push(indent(`• ${t}`, "  "));
  }
  if (step.wine) out.push("", c.bold("In the paper's wine example"), indent(step.wine, "  "));
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

// ------------------------------------------------------------------ tree
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

// ------------------------------------------------------------------ show
function fmtFacets(ont: Ontology, slotId: string, classes: Iterable<string> = []): string {
  const s = ont.require(slotId, "Slot");
  const f = ont.effectiveFacets(slotId, classes);
  const parts = [f.valueType ?? c.red("no type")];
  if (f.allowedValues) parts.push(`{${f.allowedValues.join(", ")}}`);
  if (f.range.length) {
    const spec = ont.linkSpec(slotId);
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
  const e = typeof v === "string" ? ont.linkEdge(ownerId, slotId, v) : undefined;
  const props = e ? Object.entries(edgeProps(e)).map(([k, x]) => `${k}: ${JSON.stringify(x)}`).join(", ") : "";
  return ont.label(String(v)) + (props ? c.dim(` {${props}}`) : "");
}

export function show(ont: Ontology, n: OkbNode): string {
  const out: string[] = [];
  const line = (k: string, v: string) => out.push(`  ${c.dim(k.padEnd(14))} ${v}`);
  out.push(`${c.bold(nodeLabel(n))}  ${c.dim(`${n.type} · ${n.id}`)}`);
  if ("description" in n && n.description) out.push(indent(n.description, "  "));
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
    const primary = ont.get(ont.primarySlot(n.id));
    const decls = (primary?.type === "Slot" && primary.edgeProperties) || [];
    if (decls.length) line("edge props", decls.map((d) => `${d.name} (${d.valueType}${d.allowedValues ? ` {${d.allowedValues.join(", ")}}` : ""}${d.required ? ", required" : ""})`).join(", ") + c.dim(" + rule"));
    line("attached to", ont.domain(n.id).map((d) => ont.label(d)).join(", ") || c.yellow("(no class yet)"));
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
    for (const [k, v] of Object.entries(n)) if (!["id", "type", "name"].includes(k)) line(k, typeof v === "string" ? v : JSON.stringify(v));
    const outs = ont.edges.filter((e) => e.from === n.id);
    for (const e of outs) line(e.type, ont.label(e.to));
  }
  const decisions = ont.sources(n.id, "ABOUT");
  if (decisions.length) {
    out.push("", c.bold("  Design decisions"));
    for (const d of decisions) {
      const dn = ont.require(d, "DesignDecision");
      out.push(indent(`${d}: ${dn.title}. ${dn.decision}`, "    "));
    }
  }
  return out.join("\n");
}

// ------------------------------------------------------------------ mermaid
export function mermaid(ont: Ontology): string {
  const id = (x: string) => naming.convert(ont.label(x), "PascalCase").replace(/[^A-Za-z0-9]/g, "") || x.replace(/[^A-Za-z0-9]/g, "_");
  const out = ["```mermaid", "classDiagram"];
  for (const cl of ont.ofType("Class")) {
    const lines = ont.ownSlots(cl.id)
      .map((s) => ont.require(s, "Slot"))
      .filter((sn) => sn.valueType !== "Instance")
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
