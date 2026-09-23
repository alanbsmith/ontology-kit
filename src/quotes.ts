/**
 * Verbatim-quote checking.
 *
 * A SourceLocation's `quote` must appear, word for word, in its source document.
 * PDF text extraction is messy (line breaks, split words like "t o", curly quotes,
 * soft hyphens, running page numbers), so both sides are normalized before
 * comparing: everything except letters and digits is dropped and case is folded.
 * That is strict about *words* and lenient about *layout*.
 *
 * An ellipsis ("..." or "…") inside a quote marks an intentional gap: each piece
 * must appear, in order.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const ELLIPSIS = /\.\.\.|…/;

export function normalize(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^0-9a-z]/g, "");
}

function hasPdftotext(): boolean {
  try {
    execFileSync("pdftotext", ["-v"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Return page texts (index 0 = page 1). Supports .pdf (via the `pdftotext`
 * command, or the optional pdfjs-dist package) and text/markdown files
 * (form-feed characters are page breaks; otherwise the file is one page).
 */
export async function loadPages(path: string): Promise<string[]> {
  if (!existsSync(path)) throw new Error(`File not found: ${path}`);
  if (!path.toLowerCase().endsWith(".pdf")) {
    return readFileSync(path, "utf8").split("\f");
  }
  if (hasPdftotext()) {
    const out = execFileSync("pdftotext", [path, "-"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    return out.split("\f");
  }
  let pdfjs: any;
  try {
    pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs" as string);
  } catch {
    throw new Error(
      "Reading PDFs needs either the `pdftotext` command (brew install poppler) or the pdfjs-dist package (npm install).",
    );
  }
  const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(path)), verbosity: 0 }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    pages.push(content.items.map((it: any) => ("str" in it ? it.str : "") + (it.hasEOL ? "\n" : " ")).join(""));
  }
  return pages;
}

/** Drop lines that are only a page number (running headers/footers). */
function stripPageNumbers(page: string): string {
  return page
    .split(/\r?\n/)
    .filter((l) => !/^\s*\d{1,3}\s*$/.test(l))
    .join("\n");
}

/** Find a quote. Returns the 1-based pages it was found on (empty if not found). */
export function findQuote(quote: string, pages: string[]): { found: boolean; pages: number[] } {
  const pieces = quote.split(ELLIPSIS).map(normalize).filter(Boolean);
  if (pieces.length === 0) return { found: false, pages: [] };
  const norm = pages.map((p) => normalize(stripPageNumbers(p)));
  const offsets: number[] = [];
  let joined = "";
  for (const p of norm) {
    offsets.push(joined.length);
    joined += p;
  }
  const pageAt = (i: number) => {
    let page = 1;
    offsets.forEach((off, idx) => {
      if (off <= i) page = idx + 1;
    });
    return page;
  };
  let start = 0;
  const hit = new Set<number>();
  for (const piece of pieces) {
    const i = joined.indexOf(piece, start);
    if (i < 0) return { found: false, pages: [] };
    hit.add(pageAt(i));
    hit.add(pageAt(i + piece.length - 1));
    start = i + piece.length;
  }
  return { found: true, pages: [...hit].sort((a, b) => a - b) };
}
