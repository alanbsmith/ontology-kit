/**
 * The AI-readable copy of the docs: `/llms.txt`, `/llms-full.txt` and a `.md` version of every page.
 * Plain TypeScript with no Astro imports, so `tests/llms.test.ts` can run it against the repo.
 *
 * `pageMarkdown` turns one source file into text that still makes sense out of context. `loadLlms`
 * builds all three outputs from `nav.ts`, so a page added there shows up in each with no other change.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { PAGES, pageAt, routeFor, sequence, sidebar, type MetaNode, type NavGroup, type NavLink, type Page } from "../nav.ts";

export const SITE = "https://ontology-kit.dev";
const GITHUB = "https://github.com/alanbsmith/ontology-kit";

/** Root files that are for GitHub, not the site. Same exceptions as the remark-repo-links plugin. */
const NO_PAGE = new Set(["README.md", "CLAUDE.md"]);
const EXTERNAL = /^([a-z][a-z0-9+.-]*:|\/\/|#)/i;

/** What the link rewriter needs to know about the repo. */
export interface LinkContext {
  /** The repo-relative path of the markdown file being rewritten. */
  source: string;
  /** The route of a repo-relative markdown path, or undefined if it has none. */
  routeFor: (path: string) => string | undefined;
  /** Whether a repo-relative path is a folder. */
  isDirectory: (path: string) => boolean;
}

/** The URL of a page's `.md` version: `/learn/facets/` → `https://ontology-kit.dev/learn/facets.md`. */
export function mdUrl(route: string): string {
  return `${SITE}${route.replace(/\/$/, "")}.md`;
}

/** Rewrites one link target for reading out of context. External links pass through untouched. */
export function rewriteLink(url: string, ctx: LinkContext): string {
  if (EXTERNAL.test(url)) return url;
  if (url.startsWith("/")) return `${SITE}${url}`;
  const [path, fragment] = url.split("#", 2);
  const hash = fragment === undefined ? "" : `#${fragment}`;
  const target = posixJoin(dirname(ctx.source), decodeURI(path));
  if (target.startsWith("..")) return url;
  if (/\.md$/i.test(target) && !NO_PAGE.has(target)) {
    const route = ctx.routeFor(target);
    if (route) return mdUrl(route) + hash;
  }
  const kind = ctx.isDirectory(target) ? "tree" : "blob";
  return `${GITHUB}/${kind}/main/${target}${hash}`;
}

/** Resolves `rel` against `base`, both repo-relative and slash-separated. */
function posixJoin(base: string, rel: string): string {
  const out: string[] = [];
  for (const part of `${base}/${rel}`.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (out.length && out[out.length - 1] !== "..") out.pop();
      else out.push("..");
    } else out.push(part);
  }
  return out.join("/");
}

/** The text inside an `<okb-graph>` embed as markdown: its `<p>` and `<li>` become paragraphs and bullets. */
function graphFallback(inner: string): string {
  return inner
    .replace(/<\/?(ul|ol)>/g, "")
    .replace(/<li>\s*([\s\S]*?)\s*<\/li>/g, "- $1\n")
    .replace(/<p>\s*([\s\S]*?)\s*<\/p>/g, "$1\n\n")
    .replace(/<\/?[a-z][^>]*>/gi, "")
    .replace(/^(- .*)\n\n(?=- )/gm, "$1\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Rewrites the links in one line of prose, leaving inline code alone. */
function rewriteLine(line: string, ctx: LinkContext): string {
  return line
    .split(/(`+[^`]*`+)/)
    .map((part, i) =>
      i % 2 === 1
        ? part
        : part
            // [text](url) and ![alt](url), with an optional "title"
            .replace(/(\]\()\s*(<[^>]*>|[^\s)]+)((?:\s+"[^"]*")?\s*\))/g, (_m, open: string, url: string, close: string) => `${open}${rewriteLink(url.replace(/^<|>$/g, ""), ctx)}${close}`)
            // [label]: url
            .replace(/^(\s{0,3}\[[^\]]+\]:\s*)(\S+)/, (_m, label: string, url: string) => `${label}${rewriteLink(url, ctx)}`),
    )
    .join("");
}

/**
 * One page's markdown for an AI agent: HTML comments dropped, `<okb-graph>` embeds replaced by their
 * fallback text, Mermaid and other code blocks kept as written, and relative links made absolute.
 * Links to pages go to the page's `.md` version; links to anything else in the repo go to GitHub.
 */
export function pageMarkdown(markdown: string, ctx: LinkContext): string {
  // Embeds and comments first, so a comment in a code block is the only thing they could touch:
  // none of the docs write one there, and the fences below are tracked line by line.
  const text = markdown
    .replace(/<okb-graph\b[^>]*>([\s\S]*?)<\/okb-graph>/g, (_m, inner: string) => graphFallback(inner))
    .replace(/<!--[\s\S]*?-->[ \t]*\n?/g, "");
  const out: string[] = [];
  let fence: string | undefined;
  for (const line of text.split("\n")) {
    const marker = /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
    if (fence === undefined && marker) fence = marker;
    else if (fence !== undefined && marker && marker[0] === fence[0] && marker.length >= fence.length) fence = undefined;
    else if (fence === undefined) {
      if (/^\s*<\/?div\b[^>]*>\s*$/.test(line)) continue; // layout wrappers, such as the cheat sheet's cards
      out.push(rewriteLine(line, ctx));
      continue;
    }
    out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

/** A page's title: the first level-1 heading outside code, or the label if it has none. */
export function titleOf(markdown: string, fallback: string): string {
  let fence = false;
  for (const line of markdown.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    else if (!fence && /^# /.test(line)) return line.slice(2).trim();
  }
  return fallback;
}

/** Every page in reading order, each once. The sidebar's method and decision entries share their page. */
export function orderedPages(nodes: readonly MetaNode[]): Page[] {
  const seen = new Set<string>();
  const pages: Page[] = [];
  for (const { href } of sequence(nodes)) {
    const page = pageAt(href.split("#")[0]);
    if (page && !seen.has(page.route)) {
      seen.add(page.route);
      pages.push(page);
    }
  }
  return pages;
}

/** The pages under a sidebar group, in order. */
function groupPages(group: NavGroup): Page[] {
  const hrefs = (l: NavLink): string[] => [...(l.href === undefined ? [] : [l.href.split("#")[0]]), ...(l.children ?? []).flatMap(hrefs)];
  const seen = new Set<string>();
  return group.links
    .flatMap(hrefs)
    .filter((r) => (seen.has(r) ? false : (seen.add(r), true)))
    .map((r) => pageAt(r)!);
}

export interface LlmsSite {
  /** `/llms.txt` */
  index: string;
  /** `/llms-full.txt` */
  full: string;
  /** The `.md` text of each page, by route. */
  pages: Map<string, { title: string; markdown: string }>;
}

const INTRO = [
  "# Ontology Kit",
  "",
  "> Ontology Kit (okb) is a command-line tool, a set of Claude skills and a knowledge base of method and rules that guide a beginner through building a checked ontology with the Ontology 101 method.",
  "",
  `Every page below is also a web page at ${SITE}. Each link goes to the page's markdown. [llms-full.txt](${SITE}/llms-full.txt) holds all of them in one file.`,
];

/**
 * Builds the three outputs. `read` returns a page's source text, so a test can run it on fixtures;
 * `loadLlms` reads the repo.
 */
export function buildLlms(nodes: readonly MetaNode[], read: (page: Page) => string, ctx: (page: Page) => LinkContext): LlmsSite {
  const pages = new Map<string, { title: string; markdown: string }>();
  for (const page of PAGES) {
    const source = read(page);
    pages.set(page.route, { title: titleOf(source, page.label), markdown: pageMarkdown(source, ctx(page)) });
  }
  // Two pages can share a title ("Step 1: Scope" in both tutorials): name the page they sit under.
  const titles = new Map<string, number>();
  for (const { title } of pages.values()) titles.set(title, (titles.get(title) ?? 0) + 1);
  const shown = (page: Page) => {
    const title = pages.get(page.route)!.title;
    if (titles.get(title)! < 2) return title;
    const parent = PAGES.filter((p) => p.route !== page.route && page.route.startsWith(p.route)).sort((a, b) => b.route.length - a.route.length)[0];
    return parent ? `${title} (${pages.get(parent.route)!.title})` : title;
  };
  const lines = [...INTRO];
  for (const group of sidebar(nodes)) {
    lines.push("", `## ${group.label}`, "");
    for (const page of groupPages(group)) lines.push(`- [${shown(page)}](${mdUrl(page.route)}): ${page.summary}`);
  }
  const full = [
    ...INTRO,
    ...orderedPages(nodes).flatMap((page) => ["", "-----", "", `# Page: ${page.route}`, `URL: ${SITE}${page.route}`, "", pages.get(page.route)!.markdown.trimEnd()]),
  ];
  return { index: lines.join("\n") + "\n", full: full.join("\n") + "\n", pages };
}

const loaded = new Map<string, LlmsSite>();

/** Builds the outputs from the repo at `root`. Kept for the run, since each endpoint asks for them. */
export function loadLlms(root: string, nodes: readonly MetaNode[]): LlmsSite {
  const hit = loaded.get(root);
  if (hit) return hit;
  const site = buildLlms(
    nodes,
    (page) => readFileSync(resolve(root, page.source), "utf8"),
    (page) => ({
      source: page.source,
      routeFor,
      isDirectory: (path) => existsSync(resolve(root, path)) && statSync(resolve(root, path)).isDirectory(),
    }),
  );
  loaded.set(root, site);
  return site;
}
