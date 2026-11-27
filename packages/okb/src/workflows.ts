/**
 * The multi-step work behind a few commands, kept out of their records so `run` stays a few lines:
 * the data an output shows (`--json`), and the steps that load, compute and write more than one thing.
 * Nothing here prints; `render.ts` does.
 */
import { resolve } from "node:path";
import { OkbError, Ontology, type OkbNode } from "@ontology-kit/reader";
import { duplicateQuotes, loadSourcePages, runChecks } from "./checks.ts";
import { MetaKB, type Explainable } from "./metakb.ts";
import { exportGraph, toCypher } from "./export.ts";
import { diffOntologies } from "./diff.ts";
import { installSkills, skillsStatus } from "./skills.ts";
import * as ops from "./ops.ts";
import * as prov from "./provenance.ts";
import { computeStatus } from "./status.ts";
import { kbDocs, writeChangedPages, writeKbDocs, writePages } from "./kbdocs.ts";
import { changedPageSet, changesPage, contextPage } from "./reviewdocs.ts";
import { loadSide } from "./ontology-ref.ts";
import { resync, type ResyncReport } from "./resync.ts";
import { runCheck } from "./check.ts";
import { cutRelease, verifyRelease } from "./release.ts";
import { PACKAGE_VERSION } from "./version.ts";
import { stepGuide } from "./render.ts";
import type { ReviewItem } from "./review.ts";

/** `okb init`: create the folder and stamp the meta-KB version. */
export function initOntology(folder: string, name: string): { ont: Ontology; guide: string } {
  const ont = ops.createOntology(folder, name);
  ont.manifest.metaKbVersion = MetaKB.get().version;
  ont.save();
  return { ont, guide: stepGuide(MetaKB.get().step(1)!) };
}

/** `okb show`: the node and the edges on both sides of it. */
export function showData(ont: Ontology, n: OkbNode) {
  return { node: n, out: ont.edges.filter((e) => e.from === n.id), in: ont.edges.filter((e) => e.to === n.id) };
}

/** `okb validate`: run the checks and say whether the command should fail. */
export async function validate(ont: Ontology, o: { all?: boolean; rule?: string[]; strict?: boolean }) {
  const { findings, hiddenLater } = runChecks(ont, { all: o.all, only: o.rule }, { pages: await loadSourcePages(ont) });
  const open = findings.filter((f) => !f.explainedBy);
  const fail = open.some((f) => f.severity === "error") || (!!o.strict && open.some((f) => f.severity === "warning"));
  return { findings, hiddenLater, fail, data: { step: ont.step, metaKbVersion: MetaKB.get().version, hiddenLater, findings } };
}

/** `okb status`: every finding (not just this step's) and the step progress. */
export async function status(ont: Ontology) {
  const { findings } = runChecks(ont, { all: true }, { pages: await loadSourcePages(ont) });
  const st = computeStatus(ont, findings);
  return { findings, st, data: { currentStep: ont.step, ...st } };
}

/** `okb step <n|next|prev>`: move to the step, saving under the lock. */
export function moveToStep(dir: string, which: string) {
  const meta = MetaKB.get();
  return Ontology.edit(dir, (ont) => {
    const target = which === "next" ? ont.step + 1 : which === "prev" ? ont.step - 1 : Number(which);
    if (!meta.step(target)) throw new OkbError(`There is no step ${which}. Steps are 1–${meta.steps.length}.`);
    const leaving = computeStatus(ont).steps.find((s) => s.order === ont.step)!;
    ont.manifest.currentStep = target;
    ont.save();
    return { target, leaving };
  });
}

/** The step to show a guide for: the folder's, or step 1 when there is no ontology here. */
export function currentStep(dir: string): number {
  try {
    return Ontology.load(dir).step;
  } catch {
    return 1;
  }
}

/** `okb review --json`: the scope, the judgment prompts, every class and the decisions. */
export function reviewData(ont: Ontology, items: ReviewItem[]) {
  const classes = ont.ofType("Class").map((cl) => ({
    id: cl.id, name: cl.name, description: cl.description, parents: ont.parents(cl.id).map((x) => ont.label(x)),
    children: ont.children(cl.id).map((x) => ont.label(x)), ownSlots: ont.ownSlots(cl.id).map((s) => ont.label(s)),
    abstract: cl.abstract, terminological: cl.terminological, instances: ont.sources(cl.id, "INSTANCE_OF").length,
  }));
  return { step: ont.step, scope: ont.meta, judgmentRules: items, classes, decisions: ont.ofType("DesignDecision") };
}

/** `okb source outline`: the document's blocks and which lines already have a quote. */
export function outline(ont: Ontology, sourceRef: string, o: { quotable?: boolean }) {
  const src = ont.find(sourceRef, "Source");
  if (src.format !== "markdown") throw new OkbError("outline works on markdown sources.");
  const doc = prov.readMarkdownSource(ont, src);
  const quoted = new Map<number, string[]>();
  for (const id of ont.sources(src.id, "PART_OF")) {
    const l = ont.get(id);
    if (l?.type !== "SourceLocation" || l.startLine === undefined) continue;
    const { startLine, endLine } = l;
    for (let n = startLine; n <= (endLine ?? startLine); n++) quoted.set(n, [...(quoted.get(n) ?? []), id]);
  }
  const blocks = doc.blocks.filter((b) => !o.quotable || b.quotable);
  const data = () => ({
    source: src.id, title: doc.title, frontmatter: doc.frontmatter, problems: doc.problems,
    blocks: blocks.map((b) => ({ index: b.index, kind: b.kind, headingPath: b.headingPath, lines: [b.startLine, b.endLine], quotable: b.quotable, note: b.note, calloutType: b.calloutType, row: b.row, text: b.kind === "code" ? undefined : b.text, alreadyQuoted: [...new Set(Array.from({ length: b.endLine - b.startLine + 1 }, (_, k) => quoted.get(b.startLine + k) ?? []).flat())] })),
  });
  return { src, doc, blocks, quoted, data };
}

/** `okb source refresh --all`: re-check every quote against its document, and write only when something moved. */
export async function refreshAll(dir: string, o: { dryRun?: boolean; record?: boolean }): Promise<{ report: ResyncReport; write: boolean }> {
  const ont = Ontology.load(dir);
  const pages = await loadSourcePages(ont);
  const w = { write: !o.dryRun, record: !!o.record && !o.dryRun };
  let report = resync(ont, pages, { write: false, record: false });
  // Take the lock only when something has to be written.
  if (w.write && (report.moved.length || w.record)) {
    report = Ontology.edit(dir, (locked) => {
      const r = locked.tick(() => resync(locked, pages, w));
      locked.save();
      return r;
    });
  }
  return { report, write: w.write };
}

/** `okb drift`: near-duplicate quotes across the ontologies in these folders. */
export function drift(folders: readonly string[]) {
  const onts = (folders.length ? folders : ["."]).map((d) => Ontology.load(d));
  const merged = Ontology.fromData(onts.flatMap((o) => o.nodes.filter((n) => n.type !== "Ontology")), onts.flatMap((o) => o.edges));
  return duplicateQuotes(merged);
}

/** `okb release <version>`: run the checks and cut the release under the lock. */
export function release(dir: string, version: string) {
  return Ontology.edit(dir, async (ont) => {
    const findings = runChecks(ont, { all: false }, { pages: await loadSourcePages(ont) }).findings;
    return cutRelease(ont, version, findings);
  });
}

/** `okb pin`: record the installed okb version in okb.json. */
export function pin(dir: string): string {
  Ontology.edit(dir, (ont) => {
    ont.manifest.okbVersion = PACKAGE_VERSION;
    ont.save();
  });
  return PACKAGE_VERSION;
}

/** `okb check`. */
export async function check(ont: Ontology) {
  return runCheck(ont, PACKAGE_VERSION);
}

/** What `okb docs` wrote, for the message and --json. */
export interface DocsResult {
  files: string[];
  what: string;
  hint: string;
  extra?: object;
}

/** `okb docs`: the reference pages, the changed-since-<ref> view, or the rules-in-context page. */
export async function docs(dir: string, outDir: string, o: { changed?: string; hops?: string; context?: boolean }): Promise<DocsResult> {
  const out = resolve(outDir);
  if (o.context && (o.changed !== undefined || o.hops !== undefined)) throw new OkbError("--context is its own view of every rule; it doesn't combine with --changed or --hops.");
  if (o.hops !== undefined && o.changed === undefined) throw new OkbError("--hops adds neighbors to a --changed view; give --changed <ref> too.");
  if (o.context) {
    const ont = Ontology.load(dir);
    return { files: writePages(out, { "rules-in-context.md": contextPage(ont, await loadSourcePages(ont)) }), what: "rules-in-context.md", hint: "" };
  }
  if (o.changed !== undefined) {
    if (o.hops !== undefined && !/^\d+$/.test(o.hops)) throw new OkbError("--hops needs a whole number (0 or more).");
    const hops = o.hops === undefined ? 0 : Number(o.hops);
    const ont = Ontology.load(dir);
    const old = loadSide(o.changed, dir);
    const { pages, changes } = changedPageSet(kbDocs(old.ont), kbDocs(ont), hops);
    const after = kbDocs(ont);
    const report = resync(ont, await loadSourcePages(ont), { write: false, record: false });
    const files = Object.fromEntries(pages.map((n) => [n, after[n]]));
    files["changes.md"] = changesPage({ against: o.changed, name: ont.meta.name, changes, hops, resync: report });
    const stale = report.gone.length + report.moved.length + report.worklist.length;
    return {
      files: writeChangedPages(out, files),
      what: `${pages.length} changed ${pages.length === 1 ? "page" : "pages"} and changes.md (${stale} source ${stale === 1 ? "change" : "changes"} not yet in the KB)`,
      hint: " (start at changes.md)",
      extra: changes,
    };
  }
  const files = writeKbDocs(Ontology.load(dir), out);
  return { files, what: `${files.length} pages`, hint: " (start at index.md)" };
}

/** `okb diff <old> [<new>]`: each side a folder or a git ref; with one, the new side is the folder itself. */
export function diff(dir: string, oldRef: string, newRef?: string) {
  const a = loadSide(oldRef, dir);
  const b = newRef ? loadSide(newRef, dir) : { ont: Ontology.load(dir), name: "working folder" };
  return diffOntologies(a.ont, b.ont, a.name, b.name);
}

/** `okb release verify`: check the folder against its manifest.json (read-only). */
export function releaseVerify(dir: string) {
  return verifyRelease(resolve(dir));
}

/** `okb export`: the graph, as text. The format follows --out's extension when --format is left out. */
export function exportOntology(ont: Ontology, o: { format?: string; out?: string; schema?: boolean; noInherited?: boolean; noRules?: boolean; includeUnverified?: boolean }) {
  const fmt = o.format ?? (o.out?.endsWith(".cypher") || o.out?.endsWith(".cql") ? "cypher" : "json");
  if (!["json", "cypher"].includes(fmt)) throw new OkbError("--format must be json or cypher.");
  const graph = exportGraph(ont, { inherited: !o.noInherited, schema: o.schema, rules: !o.noRules, unverified: o.includeUnverified });
  return { fmt, graph, text: fmt === "cypher" ? toCypher(graph) : JSON.stringify(graph, null, 2) + "\n" };
}

/** `okb instance set`: move to other classes, assign values, change the description, in that order. */
export function setInstance(ont: Ontology, name: string, o: { of?: string[]; desc?: string; assignments: string[] }) {
  const notes = [
    ...(o.of?.length ? ops.setInstanceClasses(ont, name, o.of) : []),
    ...(o.assignments.length ? ops.assign(ont, ont.find(name, "Instance").id, o.assignments) : []),
  ];
  if (o.desc !== undefined) notes.push(...ops.setInstanceDescription(ont, name, o.desc));
  return notes;
}

/** `okb quote list`: every quote, or the quotes from one source. */
export function quotes(ont: Ontology, sourceRef?: string) {
  const locs = ont.ofType("SourceLocation").filter((l) => !sourceRef || ont.targets(l.id, "PART_OF").includes(ont.find(sourceRef, "Source").id));
  return { locs, data: () => locs.map((l) => ({ ...l, citedBy: ont.sources(l.id, "CITES") })) };
}

/** `okb explain <topic>`: what matches, with the citations and rationale `--json` adds. */
export function explainData(hits: readonly Explainable[]) {
  const meta = MetaKB.get();
  return hits.map((h) => ({ ...h, citations: meta.citations(h.id), rationale: h.type === "Rule" ? meta.rationale(h) : undefined }));
}

/** `okb version`. */
export const versionLine = () => `okb ${PACKAGE_VERSION} · meta-KB ${MetaKB.get().version}`;

/** `okb skills install` and `okb skills status`, for the packaged skills and this meta-KB version. */
export function skillsInstallReport(o: { dir?: string; copy?: boolean; force?: boolean }) {
  return installSkills({ dir: o.dir, metaVersion: MetaKB.get().version, copy: o.copy, force: o.force });
}
export function skillsStatusReport(o: { dir?: string }) {
  const metaVersion = MetaKB.get().version;
  const { dir, skills } = skillsStatus({ dir: o.dir, metaVersion });
  return { dir, skills, metaVersion, allCurrent: skills.every((s) => s.state === "current") };
}
