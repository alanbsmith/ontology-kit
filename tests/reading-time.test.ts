// The reading-time model (site/src/lib/reading-time.ts): the function on small fixtures, and the
// site's pages checked against it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SECONDS_PER_COMMAND_READ, SECONDS_PER_COMMAND_RUN, SECONDS_PER_DIAGRAM, SECONDS_PER_GRAPH, SECONDS_PER_UNFOCUSED_GRAPH, WORDS_PER_MINUTE,
  countCommands, estimate, formatMinutes, pageMinutes, pageSeconds, timeLabel, totalMinutes,
} from "../site/src/lib/reading-time.ts";
import { LEARN_CHAPTERS, PAGES } from "../site/src/nav.ts";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const words = (n: number) => Array.from({ length: n }, () => "word").join(" ");
const md = (route: string) => readFileSync(join(ROOT, PAGES.find((p) => p.route === route)!.source), "utf8");

test("reading time: prose is words over 230 a minute", () => {
  const e = estimate(words(WORDS_PER_MINUTE * 2));
  assert.equal(e.reading, 120);
  assert.equal(e.visuals, 0);
  assert.equal(e.commands, 0);
});

test("reading time: fenced code, HTML comments and graph fallback text add nothing", () => {
  const text = `${words(230)}\n\n\`\`\`text\n${words(500)}\n\`\`\`\n\n<!-- ${words(500)} -->\n\n<okb-graph src="/data/x.json" focus="A">\n<p>${words(500)}</p>\n</okb-graph>\n`;
  assert.equal(estimate(text).reading, 60);
});

test("reading time: Mermaid and graphs are flat allowances, not character counts", () => {
  const short = "```mermaid\nflowchart LR\n  A --> B\n```";
  const long = `\`\`\`mermaid\nflowchart LR\n${Array.from({ length: 200 }, (_, i) => `  N${i} --> M${i}`).join("\n")}\n\`\`\``;
  assert.equal(estimate(short).visuals, SECONDS_PER_DIAGRAM);
  assert.equal(estimate(long).visuals, SECONDS_PER_DIAGRAM);
  assert.equal(estimate(long).reading, 0);
  assert.equal(estimate('<okb-graph src="/d.json" focus="A">\n<p>x</p>\n</okb-graph>').visuals, SECONDS_PER_GRAPH);
  assert.equal(estimate('<okb-graph src="/d.json">\n<p>x</p>\n</okb-graph>').visuals, SECONDS_PER_UNFOCUSED_GRAPH);
});

test("reading time: commands are lines starting okb, with backslash continuations joined", () => {
  const block = 'okb init\nokb class add Wine \\\n  --parent Drink \\\n  --note "x"\nnot okb here\nokb tree';
  assert.equal(countCommands(block), 3);
  const page = `\`\`\`bash\n${block}\n\`\`\`\n\n\`\`\`text\nokb init\nokb tree\n\`\`\``;
  assert.equal(estimate(page, "reading").commands, 3 * SECONDS_PER_COMMAND_READ);
  assert.equal(estimate(page, "tutorial").commands, 3 * SECONDS_PER_COMMAND_RUN);
});

test("reading time: rounding", () => {
  assert.equal(pageMinutes(0), 1);
  assert.equal(pageMinutes(60), 1);
  assert.equal(pageMinutes(61), 2);
  assert.equal(totalMinutes(72 * 60), 70);
  assert.equal(totalMinutes(73 * 60), 75);
  assert.equal(totalMinutes(60), 5);
  assert.equal(formatMinutes(70), "1 hr 10 min");
  assert.equal(formatMinutes(60), "1 hr");
  assert.equal(formatMinutes(45), "45 min");
});

const TIMED = ["/getting-started/", "/learn/", "/build/"];

test("reading time: every Learn, Build and Getting started page gets a time; the others get none", () => {
  for (const p of PAGES) {
    const label = timeLabel(p.route, md);
    if (TIMED.some((t) => p.route.startsWith(t))) assert.match(label ?? "", /\d+ min|\d hr/, p.route);
    else assert.equal(label, undefined, p.route);
  }
  assert.match(timeLabel("/getting-started/quickstart/", md)!, /^\d+ min read$/);
  assert.match(timeLabel("/getting-started/tutorial/wine-ontology/5-slots/", md)!, /^\d+ min · step 5 of 8$/);
  assert.match(timeLabel("/getting-started/tutorial/wine-ontology/", md)!, /^about .+ in total · 8 steps$/);
});

test("reading time: chapter and tutorial totals sum the unrounded page times", () => {
  const seconds = (routes: string[]) => routes.reduce((n, r) => n + pageSeconds(r, md(r)), 0);
  for (const c of LEARN_CHAPTERS) {
    const routes = [c.route!, ...c.pages];
    assert.equal(timeLabel(c.route!, md), `about ${formatMinutes(totalMinutes(seconds(routes)))} across ${routes.length} pages`);
  }
  for (const name of ["wine", "espresso"]) {
    const intro = `/getting-started/tutorial/${name}-ontology/`;
    const routes = PAGES.filter((p) => p.route.startsWith(intro)).map((p) => p.route);
    assert.equal(timeLabel(intro, md), `about ${formatMinutes(totalMinutes(seconds(routes)))} in total · ${routes.length - 1} steps`);
  }
});
