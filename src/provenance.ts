/**
 * Provenance: registering source documents, adding verbatim quotes (located
 * automatically in markdown by heading and line), extracted domain Rules, and the
 * verification results from the extraction pipeline (docs/EXTRACTION-PIPELINE.md).
 */
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { deepLinks, locate, parseMarkdown, type MdDoc, type QuoteHit } from "./markdown.ts";
import { OkbError, nameOrText, type Ontology } from "./model.ts";
import * as naming from "./naming.ts";
import type { Notes } from "./ops.ts";
import { findQuote, loadPages } from "./quotes.ts";
import {
  MODALITIES, VERIFICATION_STATUSES as STATUSES, isOneOf,
  type SourceLocationNode, type SourceNode,
} from "./types.ts";
/** Suggest the closest block for a failed quote only if it shares at least this share of the quote's words. */
const MIN_CLOSEST_WORD_OVERLAP = 0.4;

export const isMarkdown = (p: string) => /\.(md|markdown)$/i.test(p);

export function sourcePath(ont: Ontology, src: SourceNode): string {
  const p = src.localPath;
  if (!p) throw new OkbError(`Source ${src.id} has no local file (localPath), so okb can't read it. Register the file with okb source add.`);
  return isAbsolute(p) ? p : join(ont.root, p);
}

export function readMarkdownSource(ont: Ontology, src: SourceNode): MdDoc {
  const p = sourcePath(ont, src);
  if (!existsSync(p)) throw new OkbError(`Source file not found: ${p}`);
  return parseMarkdown(readFileSync(p, "utf8"));
}

// ------------------------------------------------------------------ sources
export function addSource(ont: Ontology, file: string, o: { title?: string; url?: string; repoUrl?: string; id?: string }): Notes {
  const abs = resolve(file);
  if (!existsSync(abs)) throw new OkbError(`File not found: ${file}`);
  const localPath = relative(ont.root, abs) || abs;
  const existing = ont.ofType("Source").find((s) => s.localPath && resolve(sourcePath(ont, s)) === abs);
  if (existing) throw new OkbError(`That file is already registered as ${existing.id} (${existing.title}).`);
  const notes: Notes = [];
  const node: SourceNode = { type: "Source", id: "", title: o.title ?? "", localPath, url: o.url, repoUrl: o.repoUrl };
  if (isMarkdown(abs)) {
    const doc = parseMarkdown(readFileSync(abs, "utf8"));
    node.format = "markdown";
    node.title ||= doc.title ?? file;
    if (doc.frontmatter) node.meta = doc.frontmatter;
    const quotable = doc.blocks.filter((b) => b.quotable).length;
    notes.push(`Read ${doc.blocks.length} blocks (${quotable} quotable) under ${doc.headings.length} headings.`);
    for (const p of doc.problems) notes.push(`Warning (line ${p.line}): ${p.message}`);
  } else {
    node.format = abs.toLowerCase().endsWith(".pdf") ? "pdf" : "text";
    node.title ||= file;
  }
  node.id = o.id ?? ont.newId("Source", node.title);
  ont.addNode(Object.fromEntries(Object.entries(node).filter(([, v]) => v !== undefined)) as SourceNode);
  notes.unshift(`Registered source ${node.id}: ${node.title}`);
  if (node.format === "markdown" && !o.repoUrl) notes.push("Tip: add --repo-url <GitHub URL of this file> so quotes get links to the exact lines.");
  notes.push(`Next: okb source outline ${node.id}   (the list of quotable blocks to work through)`);
  return notes;
}

// ------------------------------------------------------------------ quotes
export interface AddQuoteOpts {
  line?: number;
  cites?: string[];
  allowCode?: boolean;
}

export async function addQuote(ont: Ontology, sourceRef: string, quote: string, o: AddQuoteOpts = {}): Promise<Notes> {
  const src = ont.find(sourceRef, "Source");
  if (!src.localPath) throw new OkbError(`Source ${src.id} has no localPath, so the quote can't be checked. Register the file with okb source add.`);
  const notes: Notes = [];
  const loc: SourceLocationNode = { type: "SourceLocation", id: nextLocId(ont, src), quote };

  if (src.format === "markdown") {
    const doc = readMarkdownSource(ont, src);
    let hits = locate(doc, quote);
    if (!hits.length) throw new OkbError(`Not found in ${src.localPath}. Quotes must be word-for-word (markdown syntax, line wraps and punctuation are ignored).${closest(doc, quote)}`);
    if (o.line !== undefined) hits = hits.filter((h) => h.startLine <= o.line! && o.line! <= h.endLine);
    if (!o.allowCode && hits.length && hits.every((h) => !h.quotable)) {
      const why = hits[0].blocks.find((b) => !b.quotable)?.note ?? "not quotable";
      throw new OkbError(`That text is only in ${hits[0].blocks.map((b) => b.kind).join("/")} block(s) (${why}). Add --allow-code if you really mean to cite it.`);
    }
    if (!o.allowCode) hits = hits.filter((h) => h.quotable);
    if (hits.length > 1) {
      throw new OkbError(`That text appears ${hits.length} times. Pick one with --line:\n${hits.map((h) => `  --line ${h.startLine}   ${h.locator}`).join("\n")}`);
    }
    if (!hits.length) throw new OkbError(`The quote isn't on line ${o.line}.`);
    const hit = hits[0];
    if (!hit.quotable && !o.allowCode) {
      const why = hit.blocks.find((b) => !b.quotable)?.note ?? "not quotable";
      throw new OkbError(`That text is in a ${hit.blocks.map((b) => b.kind).join("/")} block (${why}). Add --allow-code if you really mean to cite it.`);
    }
    Object.assign(loc, locFields(hit, src));
    const bad = hit.blocks.find((b) => b.note?.startsWith("malformed"));
    if (bad) notes.push(`Warning: line ${bad.startLine} is a ${bad.note}. Check the columns before drafting from it.`);
  } else {
    const pages = await loadPages(sourcePath(ont, src));
    const r = findQuote(quote, pages);
    if (!r.found) throw new OkbError(`Not found in ${src.localPath}.`);
    loc.page = r.pages.length > 1 ? `${r.pages[0]}-${r.pages[r.pages.length - 1]}` : r.pages[0];
    loc.locator = `p.${loc.page}`;
    if (src.url) loc.pageLink = `${src.url}#page=${r.pages[0]}`;
  }
  ont.addNode(loc);
  ont.addEdge(loc.id, "PART_OF", src.id);
  notes.unshift(`Added ${loc.id} at ${loc.locator}${loc.startLine ? `, line ${loc.lines}` : ""}.`);
  for (const c of o.cites ?? []) {
    const n = ont.find(c, ["Class", "Slot", "Instance", "Rule", "DesignDecision"]);
    ont.addEdge(n.id, "CITES", loc.id);
    n.extracted = true;
    notes.push(`${n.type} ${nameOrText(n) ?? n.id} now cites it.`);
  }
  return notes;
}

function locFields(hit: QuoteHit, src: SourceNode): Partial<SourceLocationNode> {
  const links = deepLinks(hit, src.repoUrl, src.url);
  return Object.fromEntries(Object.entries({
    locator: hit.locator,
    headingPath: hit.headingPath,
    startLine: hit.startLine,
    endLine: hit.endLine,
    lines: hit.startLine === hit.endLine ? String(hit.startLine) : `${hit.startLine}-${hit.endLine}`,
    blockKind: hit.blocks.map((b) => b.kind).join("+"),
    sourceLink: links.sourceLink,
    pageLink: links.pageLink,
  }).filter(([, v]) => v !== undefined));
}

function nextLocId(ont: Ontology, src: SourceNode): string {
  const base = `loc.${naming.slug(src.title ?? src.id).slice(0, 30)}`;
  let i = 1;
  while (ont.get(`${base}.${i}`)) i++;
  return `${base}.${i}`;
}

/** Suggest the block that shares the most words with a failed quote. */
function closest(doc: MdDoc, quote: string): string {
  const words = new Set(normalizeWords(quote));
  let best: { score: number; b: (typeof doc.blocks)[number] } | null = null;
  for (const b of doc.blocks) {
    if (!b.quotable) continue;
    const ws = normalizeWords(b.text);
    const score = ws.filter((w) => words.has(w)).length / Math.max(words.size, 1);
    if (!best || score > best.score) best = { score, b };
  }
  if (!best || best.score < MIN_CLOSEST_WORD_OVERLAP) return "";
  return `\nClosest text (line ${best.b.startLine}, ${best.b.headingPath.join(" > ")}):\n  "${best.b.text.slice(0, 200)}"`;
}
const normalizeWords = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);

/** Re-locate every quote of a markdown source after the file changed; updates lines and links. */
export function refreshSource(ont: Ontology, sourceRef: string): Notes {
  const src = ont.find(sourceRef, "Source");
  if (src.format !== "markdown") throw new OkbError("refresh only applies to markdown sources.");
  const doc = readMarkdownSource(ont, src);
  const notes: Notes = [];
  let moved = 0;
  let missing = 0;
  for (const id of ont.sources(src.id, "PART_OF")) {
    const loc = ont.require(id, "SourceLocation");
    const hits = locate(doc, loc.quote);
    if (!hits.length) {
      missing++;
      notes.push(`✗ ${loc.id} is gone: "${String(loc.quote).slice(0, 70)}…" (was ${loc.locator}, line ${loc.lines})`);
      continue;
    }
    const hit = hits.reduce((a, b) => (Math.abs(b.startLine - (loc.startLine ?? 0)) < Math.abs(a.startLine - (loc.startLine ?? 0)) ? b : a));
    if (hit.startLine !== loc.startLine || hit.locator !== loc.locator) {
      moved++;
      notes.push(`  ${loc.id}: line ${loc.lines} → ${hit.startLine}${hit.locator !== loc.locator ? ` (now under ${hit.locator})` : ""}`);
      Object.assign(loc, locFields(hit, src));
    }
  }
  notes.unshift(`${src.id}: ${moved} quote(s) moved, ${missing} missing.${missing ? " Missing quotes are errors in okb validate (prov-quote-current); re-extract them from the current text." : ""}`);
  return notes;
}

// ------------------------------------------------------------------ domain rules & verification
export function addRule(ont: Ontology, o: { statement: string; modality: string; governs?: string[]; cites?: string[]; name?: string }): Notes {
  const modality = o.modality.toUpperCase().replace(/ /g, "_");
  if (!isOneOf(MODALITIES, modality)) throw new OkbError(`--modality must be one of ${MODALITIES.join(", ")}.`);
  if (!o.cites?.length) throw new OkbError("Quote first: a rule needs --cites <quote id> (add the quote with okb quote add).");
  const name = o.name ?? o.statement.split(/\s+/).slice(0, 6).join(" ");
  const id = ont.newId("Rule", name);
  ont.addNode({ type: "Rule", id, name, modality, statement: o.statement, extracted: true });
  for (const c of o.cites) {
    const loc = ont.find(c, "SourceLocation");
    ont.addEdge(id, "CITES", loc.id);
  }
  for (const g of o.governs ?? []) ont.addEdge(id, "GOVERNS", ont.find(g, ["Class", "Slot", "Instance"]).id);
  const notes = [`Added rule ${id} (${modality}): ${o.statement}`];
  const quotes = o.cites.map((c) => ont.find(c, "SourceLocation").quote as string);
  const q = quotes.join(" ").toLowerCase();
  if (/^MUST/.test(modality) && !/\b(must|requir\w*|always|never|shall|mandatory)\b/.test(q)) {
    notes.push(`Careful: ${modality} is strong, and the quote doesn't say "must", "required", "always", "never" or similar. Does it really support ${modality}? (The verification step will check.)`);
  }
  notes.push(`Next: verify it in a fresh context, then okb verify ${id} --status SUPPORTED|OVERREACH|UNSUPPORTED`);
  return notes;
}

export function verify(ont: Ontology, ref: string, o: { status?: string; corrected?: string; confidence?: string; note?: string; approve?: boolean }): Notes {
  const n = ont.find(ref, ["Rule", "Class", "Slot", "Instance"]);
  const cited = ont.targets(n.id, "CITES");
  if (!cited.length) throw new OkbError(`${n.id} doesn't cite a quote, so there's nothing to verify it against.`);
  const field = n.type === "Rule" ? "statement" : "description";
  if (o.approve) {
    // A person has looked at a corrected (or otherwise flagged) item and accepts it.
    if (!n.verification) throw new OkbError(`${n.id} hasn't been through verification yet.`);
    if (n.verification.status === "UNSUPPORTED") throw new OkbError("An UNSUPPORTED item can't be approved; remove it or re-extract from a quote that supports it.");
    n.verification = { ...n.verification, status: "SUPPORTED", approvedAfter: n.verification.status, ...(o.note ? { note: o.note } : {}) };
    return [`${n.id}: approved by a person (was ${n.verification.approvedAfter}).`];
  }
  const status = (o.status ?? "").toUpperCase();
  if (!isOneOf(STATUSES, status)) throw new OkbError(`--status must be one of ${STATUSES.join(", ")} (or use --approve after a human review).`);
  const notes: Notes = [];
  if (status === "OVERREACH") {
    if (!o.corrected) throw new OkbError('OVERREACH needs --corrected "<the narrower statement the quote does support>".');
    if (n.type === "Rule") {
      n._originalDraft = n.statement;
      n.statement = o.corrected;
    } else {
      n._originalDraft = n.description;
      n.description = o.corrected;
    }
    n.extractionConfidence = "corrected";
    notes.push(`Corrected ${field}: "${o.corrected}" (original kept in _originalDraft).`);
    notes.push(`It stays blocked (prov-verified) until a person checks the correction: okb verify ${n.id} --approve`);
  } else if (o.confidence) {
    if (!isOneOf(["verbatim", "paraphrased"], o.confidence)) throw new OkbError("--confidence must be verbatim or paraphrased.");
    n.extractionConfidence = o.confidence;
  } else n.extractionConfidence ??= "paraphrased";
  n.verification = { status, checkedAgainst: cited, ...(o.note ? { note: o.note } : {}) };
  if (status === "UNSUPPORTED") notes.push(`${n.id} is UNSUPPORTED and blocks okb validate (prov-verified). Remove it: okb remove ${n.id}`);
  notes.unshift(`${n.id}: ${status}.`);
  return notes;
}
