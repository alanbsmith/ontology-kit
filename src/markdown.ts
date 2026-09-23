/**
 * A small, dependency-light reader for documentation markdown (CommonMark + GFM
 * tables + YAML frontmatter). It isn't a full renderer; it splits a doc into
 * *quotable blocks*, each with:
 *
 *   - the heading path it sits under ("Accessibility > Touch Target Size")
 *   - its line range in the file (for GitHub deep links)
 *   - its plain text as a reader sees it: link and image text kept, URLs dropped,
 *     emphasis and code ticks removed, HTML tags and comments removed
 *   - whether it's quotable. Code examples and HTML comments aren't: an example
 *     shows usage, it doesn't state a rule.
 *
 * Tables are split into one block per row, with the column headers kept, so a prop
 * can be cited on its own ("Component API > PrimaryButton > Props > row: size").
 * Rows whose cell count doesn't match the header are flagged, because they usually
 * mean an unescaped "|" inside a type union (`"start" | "end"`).
 */
import { parse as parseYaml } from "yaml";
import { normalize } from "./quotes.ts";

export type BlockKind = "frontmatter" | "paragraph" | "list-item" | "callout" | "table-row" | "code" | "comment" | "image" | "html";

export interface MdBlock {
  index: number;
  kind: BlockKind;
  headingPath: string[];
  startLine: number; // 1-based, inclusive
  endLine: number;
  raw: string;
  text: string; // plain text
  quotable: boolean;
  note?: string; // why it's not quotable, or a problem found
  calloutType?: string; // Caution, Note, Warning...
  lang?: string; // code fence language
  row?: { columns: string[]; cells: string[]; key: string };
}

export interface MdDoc {
  frontmatter: Record<string, unknown> | null;
  title?: string;
  headings: { level: number; text: string; line: number; path: string[] }[];
  blocks: MdBlock[];
  lines: string[];
  problems: { line: number; message: string }[];
}

// ------------------------------------------------------------------ inline → plain text
export function inlineToText(s: string): string {
  const codes: string[] = [];
  let t = s.replace(/`+([^`]*?)`+/g, (_m, c) => {
    codes.push(c);
    return `\u0000${codes.length - 1}\u0000`;
  });
  t = t
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1") // images → alt text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links → link text
    .replace(/\[([^\]]*)\]\[[^\]]*\]/g, "$1") // reference links
    .replace(/<(https?:[^>]+)>/g, "$1") // autolinks
    .replace(/\{@link\s+([^}\s]+)\s*\}/g, "$1") // JSDoc {@link x}
    .replace(/<\/?[A-Za-z][^>]*>/g, "") // HTML / JSX tags
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/(^|[^\w*])[*_]([^*_\n]+)[*_](?=[^\w*]|$)/g, "$1$2")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/\\([\\`*_{}[\]()#+\-.!|])/g, "$1");
  t = t.replace(/\u0000(\d+)\u0000/g, (_m, i) => codes[Number(i)]);
  return t.replace(/[ \t]+/g, " ").trim();
}

/** Split a GFM table row into cells, ignoring pipes inside code spans or escaped. */
export function splitRow(line: string): string[] {
  const s = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells: string[] = [];
  let cur = "";
  let tick = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "\\" && s[i + 1] === "|") {
      cur += "|";
      i++;
    } else if (ch === "`") {
      let n = 1;
      while (s[i + n] === "`") n++;
      tick = tick === 0 ? n : tick === n ? 0 : tick;
      cur += "`".repeat(n);
      i += n - 1;
    } else if (ch === "|" && tick === 0) {
      cells.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

const isTableSep = (l: string) => /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(l);
const isListItem = (l: string) => /^(\s{0,3})([-*+]|\d+[.)])\s+/.test(l);
const isHeading = (l: string) => /^#{1,6}\s+/.test(l);
const isFence = (l: string) => /^\s*(```|~~~)/.test(l);

export function slugHeading(text: string): string {
  return inlineToText(text).toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, "").trim().replace(/\s/g, "-");
}

// ------------------------------------------------------------------ block parser
export function parseMarkdown(src: string): MdDoc {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const blocks: MdBlock[] = [];
  const headings: MdDoc["headings"] = [];
  const problems: MdDoc["problems"] = [];
  const stack: { level: number; text: string }[] = [];
  const path = () => stack.map((h) => h.text);
  let frontmatter: Record<string, unknown> | null = null;
  const push = (b: Omit<MdBlock, "index" | "headingPath">) => blocks.push({ ...b, index: blocks.length, headingPath: path() });

  let i = 0;
  if (lines[0]?.trim() === "---") {
    const end = lines.findIndex((l, j) => j > 0 && l.trim() === "---");
    if (end > 0) {
      const raw = lines.slice(1, end).join("\n");
      try {
        frontmatter = (parseYaml(raw) as Record<string, unknown>) ?? {};
      } catch (e) {
        problems.push({ line: 1, message: `Frontmatter isn't valid YAML: ${(e as Error).message}` });
      }
      push({ kind: "frontmatter", startLine: 1, endLine: end + 1, raw, text: raw, quotable: true, note: "metadata" });
      i = end + 1;
    }
  }

  while (i < lines.length) {
    const line = lines[i];
    const ln = i + 1;
    if (!line.trim()) {
      i++;
      continue;
    }
    // headings
    const hm = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (hm) {
      const level = hm[1].length;
      const text = inlineToText(hm[2]);
      while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
      stack.push({ level, text });
      headings.push({ level, text, line: ln, path: path() });
      i++;
      continue;
    }
    // fenced code
    if (isFence(line)) {
      const fence = line.trim().slice(0, 3);
      const lang = line.trim().slice(3).trim();
      let j = i + 1;
      while (j < lines.length && !lines[j].trim().startsWith(fence)) j++;
      const raw = lines.slice(i, Math.min(j + 1, lines.length)).join("\n");
      push({ kind: "code", startLine: ln, endLine: Math.min(j + 1, lines.length), raw, text: lines.slice(i + 1, j).join("\n"), lang, quotable: false, note: "code example: shows usage but doesn't state a rule; cite the prose or the component source instead" });
      i = j + 1;
      continue;
    }
    // HTML comments
    if (line.trim().startsWith("<!--")) {
      let j = i;
      while (j < lines.length && !lines[j].includes("-->")) j++;
      push({ kind: "comment", startLine: ln, endLine: j + 1, raw: lines.slice(i, j + 1).join("\n"), text: "", quotable: false, note: "HTML comment (not shown to readers)" });
      i = j + 1;
      continue;
    }
    // tables
    if (line.trim().startsWith("|") && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const columns = splitRow(line).map(inlineToText);
      let j = i + 2;
      while (j < lines.length && lines[j].trim().startsWith("|")) {
        const cellsRaw = splitRow(lines[j]);
        const cells = cellsRaw.map(inlineToText);
        const key = cells[0] ?? "";
        const text = columns.map((c, k) => `${c}: ${cells[k] ?? ""}`).join("; ") + (cells.length > columns.length ? `; ${cells.slice(columns.length).join("; ")}` : "");
        const block: Omit<MdBlock, "index" | "headingPath"> = {
          kind: "table-row", startLine: j + 1, endLine: j + 1, raw: lines[j], text, quotable: true, row: { columns, cells, key },
        };
        if (cells.length !== columns.length) {
          block.note = `malformed row: ${cells.length} cells for ${columns.length} columns (often an unescaped "|" in a type union; write \\| inside the cell)`;
          problems.push({ line: j + 1, message: `Table row '${key}' has ${cells.length} cells for ${columns.length} columns.` });
        }
        push(block);
        j++;
      }
      i = j;
      continue;
    }
    // blockquotes / callouts
    if (line.trimStart().startsWith(">")) {
      let j = i;
      const body: string[] = [];
      while (j < lines.length && lines[j].trimStart().startsWith(">")) {
        body.push(lines[j].trimStart().replace(/^>\s?/, ""));
        j++;
      }
      const text = inlineToText(body.join(" "));
      const ct = text.match(/^(Caution|Note|Warning|Tip|Important|Info|Danger)\b:?/i);
      push({ kind: "callout", startLine: ln, endLine: j, raw: lines.slice(i, j).join("\n"), text, quotable: true, calloutType: ct?.[1] });
      i = j;
      continue;
    }
    // list items (each item is its own block; nested items too)
    if (isListItem(line)) {
      let j = i + 1;
      const indent = line.match(/^\s*/)![0].length;
      while (j < lines.length && lines[j].trim() && !isListItem(lines[j]) && !isHeading(lines[j]) && !isFence(lines[j]) && lines[j].match(/^\s*/)![0].length > indent) j++;
      const raw = lines.slice(i, j).join("\n");
      const body = lines.slice(i, j).map((l, k) => (k === 0 ? l.replace(/^\s*([-*+]|\d+[.)])\s+/, "") : l.trim())).join(" ");
      push({ kind: "list-item", startLine: ln, endLine: j, raw, text: inlineToText(body), quotable: true });
      i = j;
      continue;
    }
    // standalone image
    if (/^\s*!\[[^\]]*\]\([^)]*\)\s*$/.test(line)) {
      push({ kind: "image", startLine: ln, endLine: ln, raw: line, text: inlineToText(line), quotable: false, note: "image (only its alt text is available)" });
      i++;
      continue;
    }
    // paragraph (until blank line or a new block starts)
    let j = i + 1;
    while (j < lines.length && lines[j].trim() && !isHeading(lines[j]) && !isFence(lines[j]) && !isListItem(lines[j]) && !lines[j].trimStart().startsWith(">") && !lines[j].trim().startsWith("|")) j++;
    const raw = lines.slice(i, j).join("\n");
    const isHtml = /^\s*<[A-Za-z]/.test(line) && !inlineToText(raw);
    push({ kind: isHtml ? "html" : "paragraph", startLine: ln, endLine: j, raw, text: inlineToText(raw.replace(/\n/g, " ")), quotable: !isHtml });
    i = j;
  }
  const title = typeof frontmatter?.title === "string" ? frontmatter.title : headings.find((h) => h.level === 1)?.text;
  return { frontmatter, title, headings, blocks, lines, problems };
}

// ------------------------------------------------------------------ locating quotes
export interface QuoteHit {
  blocks: MdBlock[];
  headingPath: string[];
  startLine: number;
  endLine: number;
  quotable: boolean;
  locator: string;
}

/**
 * Find a quote in a parsed doc. Matching is on normalized plain text (letters and
 * digits only), so it tolerates markdown syntax, line wrapping and punctuation, but
 * not changed words. "..." marks a gap. A quote may span consecutive blocks.
 * Returns every place it occurs.
 */
export function locate(doc: MdDoc, quote: string): QuoteHit[] {
  const pieces = quote.split(/\.\.\.|…/).map(normalize).filter(Boolean);
  if (!pieces.length) return [];
  // Search plain text first; fall back to raw text (for quotes copied with markup).
  for (const field of ["text", "raw"] as const) {
    let joined = "";
    const spans: { block: MdBlock; start: number; end: number }[] = [];
    for (const b of doc.blocks) {
      if (b.kind === "comment") continue;
      const n = normalize(b[field]);
      spans.push({ block: b, start: joined.length, end: joined.length + n.length });
      joined += n;
    }
    const hits: QuoteHit[] = [];
    let from = 0;
    for (;;) {
      let pos = joined.indexOf(pieces[0], from);
      if (pos < 0) break;
      const start = pos;
      let ok = true;
      let end = pos + pieces[0].length;
      for (const p of pieces.slice(1)) {
        const k = joined.indexOf(p, end);
        if (k < 0) {
          ok = false;
          break;
        }
        end = k + p.length;
      }
      if (!ok) break;
      const covered = spans.filter((s) => s.end > start && s.start < end).map((s) => s.block);
      hits.push(toHit(doc, covered, quote, field));
      from = start + 1;
      pos = -1;
    }
    if (hits.length) return dedupe(hits);
  }
  return [];
}

function dedupe(hits: QuoteHit[]): QuoteHit[] {
  const seen = new Set<string>();
  return hits.filter((h) => {
    const k = `${h.startLine}-${h.endLine}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Narrow the block range to the lines that actually contain the quote's start and end. */
function toHit(doc: MdDoc, blocks: MdBlock[], quote: string, field: "text" | "raw"): QuoteHit {
  const first = blocks[0];
  const last = blocks[blocks.length - 1];
  let startLine = first.startLine;
  let endLine = last.endLine;
  const q = normalize(quote.split(/\.\.\.|…/)[0]);
  const qEnd = normalize(quote.split(/\.\.\.|…/).pop()!);
  const lineNorm = (n: number) => normalize(field === "text" ? inlineToText(doc.lines[n - 1] ?? "") : doc.lines[n - 1] ?? "");
  const head = q.slice(0, 12);
  const tail = qEnd.slice(-12);
  for (let n = first.startLine; n <= first.endLine; n++) {
    if (head && lineNorm(n).includes(head)) {
      startLine = n;
      break;
    }
  }
  for (let n = last.endLine; n >= last.startLine; n--) {
    if (tail && lineNorm(n).includes(tail)) {
      endLine = n;
      break;
    }
  }
  if (endLine < startLine) endLine = startLine;
  const headingPath = first.headingPath;
  let locator = headingPath.join(" > ") || "(top of document)";
  if (first.kind === "table-row" && blocks.length === 1) locator += ` > row: ${first.row!.key}`;
  if (first.kind === "frontmatter") locator = "frontmatter";
  if (first.kind === "callout" && first.calloutType) locator += ` > ${first.calloutType} callout`;
  return { blocks, headingPath, startLine, endLine, quotable: blocks.every((b) => b.quotable), locator };
}

/** GitHub-style links for a quote: source lines (?plain=1#Lx-Ly) and rendered heading anchor. */
export function deepLinks(hit: QuoteHit, repoUrl?: string, pageUrl?: string): { sourceLink?: string; pageLink?: string } {
  const lines = hit.startLine === hit.endLine ? `L${hit.startLine}` : `L${hit.startLine}-L${hit.endLine}`;
  const heading = hit.headingPath[hit.headingPath.length - 1];
  return {
    sourceLink: repoUrl ? `${repoUrl}${repoUrl.includes("?") ? "&" : "?"}plain=1#${lines}` : undefined,
    pageLink: pageUrl ? (heading ? `${pageUrl}#${slugHeading(heading)}` : pageUrl) : undefined,
  };
}
