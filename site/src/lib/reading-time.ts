/**
 * Estimated reading and hands-on time for a docs page. Plain TypeScript with no Astro imports, so
 * `tests/reading-time.test.ts` can import it, like `../nav.ts`.
 *
 * It starts from the owner's blog (`readingTime()` in ~/Projects/writing/src/lib/posts.ts): 230
 * words per minute, code blocks skipped, rounded up, at least 1 minute. This model adds what a
 * docs page has that a post doesn't: diagrams, graphs and commands. Every constant below is an
 * estimate chosen by judgment, not measured. Check them against real timings from the usability
 * test (#46) and adjust here, nowhere else.
 */

import { LEARN_CHAPTERS, PAGES } from "../nav.ts";

// ---- Constants (seconds unless the name says otherwise) ----

/** The blog's reading speed for prose. */
export const WORDS_PER_MINUTE = 230;

/** A Mermaid diagram is glanced at and read for its shape, not word by word. */
export const SECONDS_PER_DIAGRAM = 10;

/** An `<okb-graph>` with a `focus` shows a handful of nodes: look, then read the labels. */
export const SECONDS_PER_GRAPH = 20;

/** A graph with no `focus` ("Explore it all") invites poking around, so it gets longer. */
export const SECONDS_PER_UNFOCUSED_GRAPH = 60;

/** On a reading page an `okb` command in an "In okb" block is read, not run. */
export const SECONDS_PER_COMMAND_READ = 20;

/** On a tutorial page the reader copies a command, runs it and glances at the output. */
export const SECONDS_PER_COMMAND_RUN = 30;

/** Tutorial and chapter totals are shown to the nearest 5 minutes, since the inputs are rough. */
export const TOTAL_ROUNDING_MINUTES = 5;

// ---- The model ----

export type PageKind = "reading" | "tutorial";

/** The parts of an estimate, in seconds, so a test or tooltip can explain the number. */
export interface Estimate {
  reading: number;
  visuals: number;
  commands: number;
  /** The three parts added, unrounded. Sum these across pages, then round once. */
  seconds: number;
}

/** Prose with the parts a reader doesn't read as prose taken out. */
function prose(markdown: string): string {
  return markdown
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<okb-graph\b[^>]*>[\s\S]*?<\/okb-graph>/g, " ")
    .replace(/(^|\n)[ \t]*(```|~~~)[\s\S]*?(\n[ \t]*\2[^\n]*|$)/g, " ");
}

/** The fenced blocks: the info string (first word after the fence) and the body. */
function fences(markdown: string): { lang: string; body: string }[] {
  const out: { lang: string; body: string }[] = [];
  const re = /(?:^|\n)[ \t]*(```|~~~)[ \t]*([^\s`]*)[^\n]*\n([\s\S]*?)(?:\n[ \t]*\1[^\n]*|$)/g;
  for (const m of markdown.matchAll(re)) out.push({ lang: m[2].toLowerCase(), body: m[3] });
  return out;
}

/** The `okb` commands in a block: lines starting `okb`, a trailing `\` continuing the same one. */
export function countCommands(block: string): number {
  let count = 0;
  let continued = false;
  for (const line of block.split("\n")) {
    if (!continued && /^\s*okb(\s|$)/.test(line)) count++;
    continued = /\\\s*$/.test(line) && (continued || /^\s*okb(\s|$)/.test(line));
  }
  return count;
}

/** The time for a page's markdown, in parts. `kind` picks the per-command allowance. */
export function estimate(markdown: string, kind: PageKind = "reading"): Estimate {
  const words = prose(markdown).match(/\p{L}[\p{L}\p{N}'’-]*/gu)?.length ?? 0;
  const reading = (words / WORDS_PER_MINUTE) * 60;

  const blocks = fences(markdown);
  const diagrams = blocks.filter((b) => b.lang === "mermaid").length;
  const graphs = [...markdown.replace(/<!--[\s\S]*?-->/g, " ").matchAll(/<okb-graph\b([^>]*)>/g)].map((m) => m[1]);
  const focused = graphs.filter((attrs) => /\bfocus\s*=/.test(attrs)).length;
  const visuals = diagrams * SECONDS_PER_DIAGRAM + focused * SECONDS_PER_GRAPH + (graphs.length - focused) * SECONDS_PER_UNFOCUSED_GRAPH;

  const commandCount = blocks.filter((b) => b.lang === "bash").reduce((n, b) => n + countCommands(b.body), 0);
  const commands = commandCount * (kind === "tutorial" ? SECONDS_PER_COMMAND_RUN : SECONDS_PER_COMMAND_READ);

  return { reading, visuals, commands, seconds: reading + visuals + commands };
}

/** Whole minutes, rounded up, at least 1: the blog's rule, for one ordinary page or tutorial step. */
export function pageMinutes(seconds: number): number {
  return Math.max(1, Math.ceil(seconds / 60 - 1e-9));
}

/** A total in minutes, to the nearest 5 (never below 5), from the sum of unrounded seconds. */
export function totalMinutes(seconds: number): number {
  return Math.max(TOTAL_ROUNDING_MINUTES, Math.round(seconds / 60 / TOTAL_ROUNDING_MINUTES) * TOTAL_ROUNDING_MINUTES);
}

/** "5 min", "1 hr", "1 hr 10 min". */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

// ---- What a page's header says ----

export const readLabel = (seconds: number) => `${pageMinutes(seconds)} min read`;
export const stepLabel = (seconds: number, step: number, steps: number) => `${pageMinutes(seconds)} min · step ${step} of ${steps}`;
export const tutorialLabel = (seconds: number, steps: number) => `about ${formatMinutes(totalMinutes(seconds))} in total · ${steps} steps`;
export const chapterLabel = (seconds: number, pages: number) => `about ${formatMinutes(totalMinutes(seconds))} across ${pages} pages`;

const TUTORIAL_ROUTE = /^\/getting-started\/tutorial\/[^/]+\/$/;

/** The sections whose pages show a time. Reference, Contributing, the landing page and 404 show none. */
export const TIMED_PREFIXES = ["/getting-started/", "/learn/", "/build/"];

/** A tutorial's intro route, if the route is the intro or one of its steps. */
function tutorialOf(route: string): string | undefined {
  const m = route.match(/^(\/getting-started\/tutorial\/[^/]+\/)/);
  return m?.[1];
}

/** The unrounded seconds for one page's markdown, with the right per-command allowance. */
export function pageSeconds(route: string, markdown: string): number {
  return estimate(markdown, tutorialOf(route) ? "tutorial" : "reading").seconds;
}

/**
 * The header text for a route, or undefined if the page shows no time. `markdownOf` returns a
 * page's markdown by route. Totals add the pages' unrounded seconds, then round once.
 */
export function timeLabel(route: string, markdownOf: (route: string) => string): string | undefined {
  if (!TIMED_PREFIXES.some((p) => route.startsWith(p))) return undefined;
  const seconds = (r: string) => pageSeconds(r, markdownOf(r));

  if (TUTORIAL_ROUTE.test(route)) {
    const steps = PAGES.filter((p) => p.route.startsWith(route) && p.route !== route);
    return tutorialLabel([route, ...steps.map((p) => p.route)].reduce((n, r) => n + seconds(r), 0), steps.length);
  }
  const intro = tutorialOf(route);
  if (intro) {
    const steps = PAGES.filter((p) => p.route.startsWith(intro) && p.route !== intro);
    return stepLabel(seconds(route), steps.findIndex((p) => p.route === route) + 1, steps.length);
  }
  const chapter = LEARN_CHAPTERS.find((c) => c.route === route);
  if (chapter) {
    const routes = [route, ...chapter.pages];
    return chapterLabel(routes.reduce((n, r) => n + seconds(r), 0), routes.length);
  }
  return readLabel(seconds(route));
}
