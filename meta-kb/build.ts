/**
 * Compile the meta-KB from meta-kb/src/*.yaml into meta-kb/data/{nodes,edges,manifest}.json.
 *
 *   npm run build:meta
 *   node meta-kb/build.ts --pdf src.o101=path/to/ontology101.pdf --pdf src.g93=path/to/gruber.pdf
 *       ...also re-verifies every quote, word for word, against the PDFs (npm run verify:quotes)
 *
 * Only people editing the meta-KB run this; the compiled JSON is committed, so okb
 * itself has no dependencies. The build fails (exit 1) if anything is inconsistent:
 *   - a cited location, concept, rule, decision or step doesn't exist
 *   - a sourced rule or concept cites nothing, or a modality/basis/check value is invalid
 *   - a judgment rule has no `review` prompt, or a severity override has no reason
 *   - a mechanical/heuristic rule has no check in src/checks.ts (or a check has no rule)
 *   - a step's doneWhen check isn't implemented in src/status.ts
 *   - (with --pdf) a quote isn't found verbatim, or is on a different page than declared
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { parse } from "yaml";
import { CHECKS } from "../src/checks.ts";
import { findQuote, loadPages } from "../src/quotes.ts";
import { STEP_CHECKS } from "../src/status.ts";
import type { GraphEdge, GraphNode } from "../src/types.ts";

export const VERSION = "2.2.0";
const HERE = dirname(fileURLToPath(import.meta.url));
const MODALITIES = ["MUST", "MUST_NOT", "SHOULD", "SHOULD_NOT", "MAY"];
const BASES = ["direct", "interpretive", "operational"];
const CHECK_KINDS = ["mechanical", "heuristic", "judgment"];
const SEVERITIES = ["error", "warning", "info"];
const DEFAULT_SEVERITY: Record<string, string> = { MUST: "error", MUST_NOT: "error", SHOULD: "warning", SHOULD_NOT: "warning", MAY: "info" };

const load = (name: string): any => parse(readFileSync(join(HERE, "src", name), "utf8"));
const pageRange = (p: string | number) => {
  const [a, b] = String(p).split("-").map(Number);
  return Array.from({ length: (b ?? a) - a + 1 }, (_, i) => a + i);
};

async function main() {
  const { values: args } = parseArgs({ options: { pdf: { type: "string", multiple: true } } });
  const errors: string[] = [];
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const node = (n: Record<string, any>) => {
    nodes.push(Object.fromEntries(Object.entries(n).filter(([, v]) => v !== undefined && v !== null)) as GraphNode);
    return n.id as string;
  };
  const edge = (from: string, type: string, to: string) => edges.push({ from, type, to });

  const src = load("sources.yaml");
  const principles = load("principles.yaml").principles;
  const concepts = load("concepts.yaml").concepts;
  const rules = load("rules.yaml").rules;
  const steps = load("steps.yaml").steps;
  const decisions = load("decisions.yaml").decisions;
  const fmt = load("format.yaml");

  node({
    type: "MetaKB", id: "metakb", version: VERSION, formatVersion: fmt.version,
    description: "Rules, method and vocabulary for building ontologies, derived from Ontology 101 (Noy & McGuinness 2001) and Gruber (1993).",
  });

  // ---------------------------------------------------------- sources & locations
  const sources = new Map<string, any>(src.sources.map((s: any) => [s.id, s]));
  for (const s of src.sources) node({ type: "Source", ...s });
  const locIds = new Map<string, string>();
  for (const [sid, locs] of Object.entries<any>(src.locations)) {
    if (!sources.has(sid)) {
      errors.push(`locations for unknown source ${sid}`);
      continue;
    }
    for (const [key, loc] of Object.entries<any>(locs)) {
      const lid = `loc.${sid.split(".")[1]}.${key}`;
      const url = sources.get(sid).url;
      node({
        type: "SourceLocation", id: lid, section: loc.section, page: loc.page, quote: loc.quote,
        deepLink: url ? `${url}#page=${pageRange(loc.page)[0]}` : undefined,
      });
      edge(lid, "PART_OF", sid);
      locIds.set(`${sid}/${key}`, lid);
    }
  }
  const cite = (from: string, keys: string[] | undefined, type = "CITES") => {
    for (const k of keys ?? []) {
      const lid = locIds.get(k);
      if (!lid) errors.push(`${from}: cites unknown location '${k}'`);
      else edge(from, type, lid);
    }
  };

  // ---------------------------------------------------------- quote verification
  let quotesVerified = false;
  if (args.pdf?.length) {
    const pdfs = new Map(args.pdf.map((p) => p.split("=", 2) as [string, string]));
    for (const [sid, path] of pdfs) {
      if (!existsSync(path)) {
        errors.push(`--pdf ${sid}: file not found: ${path}`);
        continue;
      }
      const pages = await loadPages(path);
      for (const [key, loc] of Object.entries<any>(src.locations[sid] ?? {})) {
        const r = findQuote(loc.quote, pages);
        const declared = pageRange(loc.page);
        if (!r.found) errors.push(`QUOTE NOT FOUND: ${sid}/${key}: "${String(loc.quote).slice(0, 70)}..."`);
        else if (JSON.stringify(r.pages) !== JSON.stringify(declared)) {
          errors.push(`PAGE MISMATCH: ${sid}/${key}: declared ${loc.page}, found on ${r.pages.join("-")}`);
        }
      }
    }
    quotesVerified = Object.keys(src.locations).every((s) => pdfs.has(s));
  }

  // ---------------------------------------------------------- principles & concepts
  for (const p of principles) {
    node({ type: "Principle", id: p.id, name: p.name, statement: p.statement, plainLanguage: p.plainLanguage });
    cite(p.id, p.cites);
  }
  const conceptIds = new Set<string>();
  for (const c of concepts) {
    conceptIds.add(c.id);
    node({
      type: "Concept", id: c.id, name: c.name, aliases: c.aliases, definition: c.definition,
      plainLanguage: c.plainLanguage, example: c.example, inThisToolkit: c.inThisToolkit, origin: c.origin ?? "source",
    });
    if (c.origin !== "operational" && !c.cites?.length) errors.push(`${c.id}: sourced concept cites nothing`);
    cite(c.id, c.cites, "DEFINED_IN");
  }

  // ---------------------------------------------------------- rules
  const ruleKeys = new Set<string>();
  for (const r of rules) {
    const rid = `rule.${r.id}`;
    if (ruleKeys.has(r.id)) errors.push(`duplicate rule id ${r.id}`);
    ruleKeys.add(r.id);
    if (!MODALITIES.includes(r.modality)) errors.push(`${rid}: modality ${r.modality} not in ${MODALITIES}`);
    if (!BASES.includes(r.basis)) errors.push(`${rid}: basis ${r.basis} not in ${BASES}`);
    if (!CHECK_KINDS.includes(r.check)) errors.push(`${rid}: check ${r.check} not in ${CHECK_KINDS}`);
    const severity = r.severity ?? DEFAULT_SEVERITY[r.modality];
    if (!SEVERITIES.includes(severity)) errors.push(`${rid}: bad severity ${severity}`);
    if (r.severity && !r.severityReason) errors.push(`${rid}: severity override without severityReason`);
    if (r.basis !== "operational" && !r.cites?.length) errors.push(`${rid}: basis=${r.basis} but cites nothing`);
    if (r.check === "judgment" && !r.review) errors.push(`${rid}: judgment rule needs a 'review' prompt`);
    node({
      type: "Rule", id: rid, key: r.id, modality: r.modality, basis: r.basis, check: r.check, severity,
      severityReason: r.severityReason, fromStep: r.fromStep ?? 1, statement: r.statement,
      plainLanguage: r.plainLanguage, review: r.review, fix: r.fix,
    });
    const rat = `rat.${r.id}`;
    node({ type: "Rationale", id: rat, explanation: r.rationale });
    edge(rid, "JUSTIFIED_BY", rat);
    cite(rat, r.cites);
    for (const c of r.governs ?? []) {
      if (!conceptIds.has(c)) errors.push(`${rid}: governs unknown concept ${c}`);
      edge(rid, "GOVERNS", c);
    }
  }

  // ---------------------------------------------------------- decisions
  const decisionIds = new Set<string>();
  for (const d of decisions) {
    decisionIds.add(d.id);
    node({ type: "Decision", id: d.id, name: d.name, whenYouFaceIt: d.whenYouFaceIt, tests: d.tests, note: d.note, wine: d.wine });
    cite(d.id, d.cites);
  }

  // ---------------------------------------------------------- steps
  let prev: string | undefined;
  for (const s of [...steps].sort((a: any, b: any) => a.order - b.order)) {
    node({
      type: "Step", id: s.id, order: s.order, name: s.name, goal: s.goal, whyItMatters: s.whyItMatters,
      guidingQuestions: s.guidingQuestions, outputs: s.outputs, doneWhen: s.doneWhen, tips: s.tips,
      wine: s.wine, commands: s.commands,
    });
    for (const dw of s.doneWhen) {
      if (dw.check && !(dw.check in STEP_CHECKS)) errors.push(`${s.id}: doneWhen check '${dw.check}' not implemented in src/status.ts`);
    }
    if (prev) edge(prev, "PRECEDES", s.id);
    prev = s.id;
    cite(s.id, s.cites);
    for (const r of s.rules ?? []) {
      if (!ruleKeys.has(r)) errors.push(`${s.id}: unknown rule ${r}`);
      edge(s.id, "APPLIES", `rule.${r}`);
    }
    for (const c of s.concepts ?? []) {
      if (!conceptIds.has(c)) errors.push(`${s.id}: unknown concept ${c}`);
      edge(s.id, "INTRODUCES", c);
    }
    for (const d of s.decisions ?? []) {
      if (!decisionIds.has(d)) errors.push(`${s.id}: unknown decision ${d}`);
      edge(s.id, "USES", d);
    }
  }

  // ---------------------------------------------------------- format registry
  for (const nt of fmt.nodeTypes) {
    const id = `nodetype.${nt.name}`;
    node({ type: "NodeType", id, name: nt.name, origin: nt.origin, required: nt.required, description: nt.description });
    edge(id, "MODELS", nt.models);
  }
  for (const et of fmt.edgeTypes) {
    const id = `edgetype.${et.name}`;
    node({ type: "EdgeType", id, name: et.name, origin: et.origin, fromTypes: et.from, toTypes: et.to, props: et.props ?? [], description: et.description });
    edge(id, "MODELS", et.models);
  }

  // ---------------------------------------------------------- validator <-> rules
  const automated = new Set(rules.filter((r: any) => r.check !== "judgment").map((r: any) => r.id));
  for (const k of automated as Set<string>) if (!(k in CHECKS)) errors.push(`rule ${k} is mechanical/heuristic but src/checks.ts has no check for it`);
  for (const k of Object.keys(CHECKS)) if (!automated.has(k)) errors.push(`src/checks.ts implements '${k}' but no mechanical/heuristic rule has that id`);

  // ---------------------------------------------------------- referential integrity
  const ids = nodes.map((n) => n.id);
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dup.length) errors.push(`duplicate node ids: ${[...new Set(dup)].join(", ")}`);
  const idSet = new Set(ids);
  for (const e of edges) {
    if (!idSet.has(e.from)) errors.push(`edge ${e.from} -${e.type}-> ${e.to}: missing 'from' node`);
    if (!idSet.has(e.to)) errors.push(`edge ${e.from} -${e.type}-> ${e.to}: missing 'to' node`);
  }

  if (errors.length) {
    console.error(`meta-KB build FAILED (${errors.length} problem(s)):`);
    for (const e of errors) console.error("  ✗", e);
    process.exit(1);
  }

  const out = join(HERE, "data");
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "nodes.json"), JSON.stringify(nodes, null, 2) + "\n");
  writeFileSync(join(out, "edges.json"), JSON.stringify(edges, null, 2) + "\n");
  const counts: Record<string, number> = {};
  for (const n of nodes) counts[n.type] = (counts[n.type] ?? 0) + 1;
  const manifestPath = join(out, "manifest.json");
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};
  Object.assign(manifest, { version: VERSION, formatVersion: fmt.version, nodeCounts: counts, edgeCount: edges.length });
  if (args.pdf?.length) manifest.quotesVerified = quotesVerified;
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`meta-KB ${VERSION} built: ${nodes.length} nodes, ${edges.length} edges`);
  console.log("  " + Object.entries(counts).sort().map(([k, v]) => `${k}: ${v}`).join(", "));
  if (args.pdf?.length) console.log(`  quotes verified against PDF: ${quotesVerified ? "all sources" : "partial"}`);
}

await main();
