/**
 * Re-sync a KB after its source documents change (`okb source refresh --all`).
 *
 * Two questions, answered together:
 *   1. Which quotes are gone, and which moved? Each gone quote is reported with the nodes that cite it.
 *   2. Which quotable blocks of a document are new, changed or removed since the KB last looked at it?
 *      That list is the worklist for re-extraction (see RESYNC_SCHEMA for its shape).
 *
 * "Since the KB last looked" is the baseline stored on the Source node: one record per quotable block
 * (`Source.blocks`), written by `okb source add` and by `refresh --all --record`. A block's hash is the SHA-256
 * (the same algorithm `okb release` uses for files) of its plain text with layout, case and punctuation
 * folded away, so reflowing a paragraph or moving it under another heading changes nothing, and
 * changing a word does. Hashes are per block, not per source, because "this file changed" doesn't say
 * what to extract again.
 */
import { createHash } from "node:crypto";
import type { Ontology, SourceBlock, SourceLocationNode } from "@ontology-kit/format";
import { locate, type MdDoc } from "./markdown.ts";
import { locFields } from "./provenance.ts";
import { findQuote, normalize } from "./quotes.ts";

/** Which block a baseline or current record describes, plus its hash. */
export type BlockRecord = SourceBlock;

export const RESYNC_SCHEMA = "okb-resync/1";
const PREVIEW_CHARS = 120;
/** Two blocks with this share of their preview words in common count as the same block, edited. */
const SAME_BLOCK_SIMILARITY = 0.3;
/** Across different headings (a renamed or moved-and-edited block), ask for more. */
const MOVED_BLOCK_SIMILARITY = 0.6;

export const hashText = (text: string): string => createHash("sha256").update(normalize(text)).digest("hex");

/** The records for a document's quotable blocks, in document order. */
export function blockRecords(doc: MdDoc): BlockRecord[] {
  return doc.blocks
    .filter((b) => b.quotable)
    .map((b) => ({
      hash: hashText(b.text),
      kind: b.kind,
      headingPath: b.headingPath,
      ...(b.row ? { rowKey: b.row.key } : {}),
      preview: b.text.slice(0, PREVIEW_CHARS),
    }));
}

export type Change = "new" | "changed" | "removed";

export interface WorklistItem {
  /** Stable across runs while the block's text is unchanged: `<source id>:<first 12 hex of the hash>`. */
  id: string;
  source: string;
  change: Change;
  headingPath: string[];
  blockKind: string;
  /** Line range in the current document; null for a removed block. */
  lines: [number, number] | null;
  /** Hash of the current text; null for a removed block. */
  hash: string | null;
  /** Hash of the text the baseline recorded; null for a new block. */
  oldHash: string | null;
  preview: string | null;
  oldPreview: string | null;
}

const wordCache = new Map<string, Set<string>>();
const words = (s: string): Set<string> => {
  let w = wordCache.get(s);
  if (!w) wordCache.set(s, (w = new Set(s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((x) => x.length > 2))));
  return w;
};
function similarity(a: string, b: string): number {
  const x = words(a), y = words(b);
  if (!x.size || !y.size) return 0;
  let both = 0;
  for (const w of x) if (y.has(w)) both++;
  return both / (x.size + y.size - both);
}
const keyOf = (b: BlockRecord) => JSON.stringify([b.headingPath, b.kind, b.rowKey ?? null]);

export interface BlockDiff {
  change: Change;
  old?: BlockRecord;
  /** The index into the current list. */
  current?: number;
}

/**
 * Compare a baseline with the current blocks. Pure. A block whose hash is still present is unchanged, wherever it
 * moved. What's left is paired up as "changed" (same place, similar text), and the rest is "new" or "removed".
 */
export function diffBlocks(baseline: BlockRecord[], current: BlockRecord[]): BlockDiff[] {
  const left = new Map<string, number[]>(); // hash -> unmatched baseline indexes
  baseline.forEach((b, i) => left.set(b.hash, [...(left.get(b.hash) ?? []), i]));
  const newOnes: number[] = [];
  current.forEach((b, j) => {
    const idxs = left.get(b.hash);
    if (idxs?.length) idxs.shift();
    else newOnes.push(j);
  });
  const oldOnes = new Set([...left.values()].flat());

  const out: BlockDiff[] = [];
  const oldKeys = baseline.map(keyOf);
  const newKeys = current.map(keyOf);
  // How many unmatched blocks share each place (heading path, kind, row key), on each side. A block that is
  // alone in its place on both sides is the same block, edited. Counted once, not per comparison.
  const placeCount = (idxs: Iterable<number>, keys: string[]) => {
    const m = new Map<string, number>();
    for (const i of idxs) m.set(keys[i], (m.get(keys[i]) ?? 0) + 1);
    return m;
  };
  const pair = (minScore: number, sameKey: boolean) => {
    const oldPlaces = placeCount(oldOnes, oldKeys);
    const newPlaces = placeCount(newOnes, newKeys);
    for (const j of [...newOnes]) {
      const c = current[j];
      const place = newKeys[j];
      const alone = sameKey && oldPlaces.get(place) === 1 && newPlaces.get(place) === 1;
      let best: { i: number; score: number } | null = null;
      for (const i of oldOnes) {
        const o = baseline[i];
        if (sameKey !== (oldKeys[i] === place)) continue;
        const score = alone ? 1 : similarity(o.preview, c.preview);
        if (score >= minScore && (!best || score > best.score)) best = { i, score };
      }
      if (best) {
        oldPlaces.set(oldKeys[best.i], (oldPlaces.get(oldKeys[best.i]) ?? 1) - 1);
        newPlaces.set(place, (newPlaces.get(place) ?? 1) - 1);
        oldOnes.delete(best.i);
        newOnes.splice(newOnes.indexOf(j), 1);
        out.push({ change: "changed", old: baseline[best.i], current: j });
      }
    }
  };
  pair(SAME_BLOCK_SIMILARITY, true);
  pair(MOVED_BLOCK_SIMILARITY, false);
  for (const j of newOnes) out.push({ change: "new", current: j });
  for (const i of oldOnes) out.push({ change: "removed", old: baseline[i] });
  return out;
}

export interface Citer {
  id: string;
  type: string;
  label: string;
}

export interface QuoteIssue {
  source: string;
  /** The SourceLocation id. */
  quote: string;
  text: string;
  was: { locator?: string; lines?: string };
  /** Nodes that cite the quote: rules, facts, classes. */
  citedBy: Citer[];
}

export interface MovedQuote extends QuoteIssue {
  now: { locator?: string; lines?: string };
}

export interface SourceStatus {
  id: string;
  path: string | null;
  format: string | null;
  /** "checked", or why the source couldn't be (no local file, file missing). */
  state: "checked" | "unreadable";
  problem?: string;
  /** Whether the Source has baseline hashes to compare against. Only markdown sources do. */
  baseline: boolean;
  quotes: number;
  moved: number;
  gone: number;
}

export interface ResyncReport {
  schema: typeof RESYNC_SCHEMA;
  /** False when a quote is gone or a source can't be read: the KB no longer matches its documents. */
  ok: boolean;
  /** True when the current blocks were stored as the new baseline (`--record`). */
  recorded: boolean;
  sources: SourceStatus[];
  gone: QuoteIssue[];
  moved: MovedQuote[];
  worklist: WorklistItem[];
}

export interface ResyncOptions {
  /** Update moved quotes in `ont` (the quote's own lines and links). Never touches a quote that can't be found. */
  write: boolean;
  /** Also store the current blocks as the baseline. Implies `write`. */
  record: boolean;
}

const citers = (ont: Ontology, locId: string): Citer[] =>
  ont.sources(locId, "CITES").map((id) => ont.get(id)).filter((n) => !!n).map((n) => ({ id: n.id, type: n.type, label: ont.label(n.id) }));

/**
 * Re-locate every quote in every source and compare each markdown source's blocks to its baseline. `pages` is
 * `loadSourcePages(ont)`. With `write` false nothing in `ont` changes.
 */
export function resync(ont: Ontology, pages: Map<string, string[] | MdDoc | Error>, o: ResyncOptions): ResyncReport {
  const write = o.write || o.record;
  const report: ResyncReport = { schema: RESYNC_SCHEMA, ok: true, recorded: false, sources: [], gone: [], moved: [], worklist: [] };
  for (const src of ont.ofType("Source")) {
    const locs = ont.sources(src.id, "PART_OF").map((i) => ont.get(i)).filter((n): n is SourceLocationNode => n?.type === "SourceLocation");
    const status: SourceStatus = { id: src.id, path: src.localPath ?? null, format: src.format ?? null, state: "checked", baseline: false, quotes: locs.length, moved: 0, gone: 0 };
    report.sources.push(status);
    const got = pages.get(src.id);
    if (!src.localPath || !got || got instanceof Error) {
      // A source with quotes that can't be read proves nothing, so it fails the report (as it does in okb check).
      if (locs.length || src.localPath) {
        status.state = "unreadable";
        status.problem = !src.localPath ? "no local file (localPath)" : got instanceof Error ? got.message : "not loaded";
        report.ok = false;
      }
      continue;
    }
    const issue = (loc: SourceLocationNode): QuoteIssue => ({ source: src.id, quote: loc.id, text: loc.quote, was: { locator: loc.locator, lines: loc.lines }, citedBy: citers(ont, loc.id) });
    if (Array.isArray(got)) {
      for (const loc of locs) if (!findQuote(loc.quote, got).found) { status.gone++; report.gone.push(issue(loc)); }
      continue;
    }
    for (const loc of locs) {
      const hits = locate(got, loc.quote);
      if (!hits.length) {
        status.gone++;
        report.gone.push(issue(loc));
        continue;
      }
      const near = hits.reduce((a, b) => (Math.abs(b.startLine - (loc.startLine ?? 0)) < Math.abs(a.startLine - (loc.startLine ?? 0)) ? b : a));
      if (near.startLine === loc.startLine && near.locator === loc.locator) continue;
      status.moved++;
      const was = issue(loc);
      if (write) {
        Object.assign(loc, locFields(near, src));
        ont.touch(loc);
      }
      report.moved.push({ ...was, now: { locator: near.locator, lines: near.startLine === near.endLine ? String(near.startLine) : `${near.startLine}-${near.endLine}` } });
    }
    const current = blockRecords(got);
    const quotable = got.blocks.filter((b) => b.quotable);
    if (src.blocks) {
      status.baseline = true;
      for (const d of diffBlocks(src.blocks, current)) {
        const cur = d.current === undefined ? undefined : current[d.current];
        const block = d.current === undefined ? undefined : quotable[d.current];
        const ref = cur ?? d.old!;
        report.worklist.push({
          id: `${src.id}:${(cur?.hash ?? d.old!.hash).slice(0, 12)}`,
          source: src.id,
          change: d.change,
          headingPath: ref.headingPath,
          blockKind: ref.kind,
          lines: block ? [block.startLine, block.endLine] : null,
          hash: cur?.hash ?? null,
          oldHash: d.old?.hash ?? null,
          preview: cur?.preview ?? null,
          oldPreview: d.old?.preview ?? null,
        });
      }
    }
    if (o.record) {
      src.blocks = current;
      ont.touch(src);
    }
  }
  if (report.gone.length) report.ok = false;
  report.recorded = o.record;
  // Document order for new and changed blocks, removed ones last.
  report.worklist.sort((a, b) => a.source.localeCompare(b.source) || (a.lines?.[0] ?? Infinity) - (b.lines?.[0] ?? Infinity));
  return report;
}

/** The human-readable report, as lines. */
export function renderResync(r: ResyncReport, o: { dryRun: boolean }): string[] {
  const out: string[] = [];
  const n = (k: number, w: string) => `${k} ${w}${k === 1 ? "" : "s"}`;
  for (const s of r.sources) {
    if (s.state === "unreadable") out.push(`✗ ${s.id}: can't read it (${s.problem}); its quotes weren't checked.`);
  }
  out.push(`${n(r.sources.filter((s) => s.state === "checked").length, "source")} checked: ${n(r.moved.length, "quote")} moved${o.dryRun || !r.moved.length ? "" : " (updated)"}, ${n(r.gone.length, "quote")} gone, ${n(r.worklist.length, "block")} on the worklist.`);
  if (r.gone.length) {
    out.push("", "Quotes that are gone (not changed; re-extract them from the current text):");
    for (const g of r.gone) {
      out.push(`  ✗ ${g.quote} (${g.source}, was ${g.was.locator ?? "?"}${g.was.lines ? `, line ${g.was.lines}` : ""}): "${g.text.slice(0, 70)}${g.text.length > 70 ? "…" : ""}"`);
      out.push(`      cited by ${g.citedBy.length ? g.citedBy.map((c) => `${c.type} ${c.label} (${c.id})`).join(", ") : "nothing"}`);
    }
  }
  if (r.moved.length) {
    out.push("", "Quotes that moved:");
    for (const m of r.moved) out.push(`    ${m.quote}: line ${m.was.lines} → ${m.now.lines}${m.now.locator !== m.was.locator ? ` (now under ${m.now.locator})` : ""}`);
  }
  if (r.worklist.length) {
    out.push("", "Worklist (blocks to extract or re-check):");
    for (const w of r.worklist) {
      const where = w.lines ? `L${w.lines[0]}${w.lines[1] > w.lines[0] ? `-${w.lines[1]}` : ""}` : "removed";
      out.push(`  ${w.change.padEnd(7)} ${w.source} ${where.padEnd(9)} ${w.headingPath.join(" > ") || "(top)"}  ${w.change === "removed" ? w.oldPreview : w.preview}`);
    }
  }
  const noBase = r.sources.filter((s) => s.format === "markdown" && s.state === "checked" && !s.baseline).map((s) => s.id);
  if (noBase.length) out.push("", `No baseline hashes yet for ${noBase.join(", ")}: there's nothing to compare, so no worklist. Run okb source refresh --all --record to record them.`);
  return out;
}
