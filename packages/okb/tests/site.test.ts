// The docs site (site/) lists its pages in site/src/nav.ts. These tests keep that list honest, so
// a new doc page can't be left out of the site, and check the plugin that rewrites the docs' links.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { INSTALL_COMMAND } from "../../../site/src/lib/install.ts";
import { graphNames, loadGraph } from "../../../site/src/graph/data.ts";
import { buildGraph, defaultTypes, findNode } from "../../../site/src/graph/model.ts";
import { LEARN_CHAPTERS, PAGES, defaultOpen, sectionKey, neighbors, sequence, sequenceOf, sidebar, type MetaNode, type NavLink } from "../../../site/src/nav.ts";

// PKG is packages/okb; ROOT is the repo root (docs/, CONTRIBUTING.md and site/ live there).
const PKG = dirname(dirname(fileURLToPath(import.meta.url)));
const ROOT = dirname(dirname(PKG));
const nodes: MetaNode[] = JSON.parse(readFileSync(join(PKG, "meta-kb/data/nodes.json"), "utf8"));

/** A link's href and every href nested under it. */
const withChildren = (l: NavLink): string[] => [...(l.href === undefined ? [] : [l.href]), ...(l.children ?? []).flatMap(withChildren)];

test("site: every page's source file exists", () => {
  for (const p of PAGES) assert.ok(existsSync(join(ROOT, p.source)), `${p.route} → ${p.source} is missing`);
});

// Markdown files under docs/ that deliberately have no page.
const UNROUTED_DOCS: string[] = [];

function markdownFiles(dir: string): string[] {
  return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? markdownFiles(`${dir}/${e.name}`) : e.name.endsWith(".md") ? [`${dir}/${e.name}`] : [],
  );
}

test("site: every docs/**/*.md file has a page", () => {
  const sources = new Set(PAGES.map((p) => p.source));
  for (const f of markdownFiles("docs")) {
    assert.ok(sources.has(f) || UNROUTED_DOCS.includes(f), `${f} isn't in site/src/nav.ts`);
  }
  if (existsSync(join(ROOT, "CONTRIBUTING.md"))) assert.ok(sources.has("CONTRIBUTING.md"), "CONTRIBUTING.md isn't in site/src/nav.ts");
});

test("site: routes are unique and every page is in the sidebar", () => {
  assert.equal(new Set(PAGES.map((p) => p.route)).size, PAGES.length);
  const hrefs = sidebar(nodes).flatMap((g) => g.links.flatMap(withChildren));
  for (const p of PAGES) assert.ok(hrefs.includes(p.route), `${p.route} isn't in the sidebar`);
});

test("site: every generated tutorial page has a route, in step order after the introduction", () => {
  const tutorials = readdirSync(join(PKG, "examples")).filter((e) => existsSync(join(PKG, "examples", e, "tutorial-src")));
  assert.ok(tutorials.includes("wine"));
  for (const t of tutorials) {
    const sources = new Set(PAGES.map((p) => p.source));
    for (const f of readdirSync(join(PKG, "examples", t, "tutorial")).filter((f) => f.endsWith(".md"))) {
      assert.ok(sources.has(`packages/okb/examples/${t}/tutorial/${f}`), `packages/okb/examples/${t}/tutorial/${f} isn't in site/src/nav.ts`);
    }
  }
  const route = (n: number) => PAGES.find((p) => p.source.startsWith(`packages/okb/examples/wine/tutorial/${n}-`))!.route;
  assert.equal(route(0), "/getting-started/tutorial/wine-ontology/");
  const seq = sequence(nodes).map((l) => l.href);
  for (let n = 1; n <= 8; n++) assert.equal(seq.indexOf(route(n)), seq.indexOf(route(n - 1)) + 1, `step ${n} follows step ${n - 1}`);
  assert.ok(!PAGES.some((p) => p.source.endsWith("TRANSCRIPT.md")), "the transcript is for GitHub readers, not the site");
});

test("site: the sidebar lists every step and decision guide from the meta-KB, by stable anchor", () => {
  const hrefs = sidebar(nodes).flatMap((g) => g.links.flatMap(withChildren));
  for (const n of nodes.filter((n) => n.type === "Step")) assert.ok(hrefs.includes(`/reference/method/#${n.id.replace(/\./g, "-")}`), n.id);
  for (const n of nodes.filter((n) => n.type === "Decision")) assert.ok(hrefs.includes(`/reference/decisions/#${n.id.replace(/\./g, "-")}`), n.id);
  // The anchors exist in the generated pages.
  const method = readFileSync(join(ROOT, "docs/METHOD.md"), "utf8");
  for (const n of nodes.filter((n) => n.type === "Step")) assert.ok(method.includes(`<a id="${n.id.replace(/\./g, "-")}"></a>`), n.id);
});

test("site: the sidebar has only non-empty groups, in order, with every page once", () => {
  const groups = sidebar(nodes);
  assert.deepEqual(groups.map((g) => g.label), ["Getting started", "Learn", "Build", "Reference", "Contributing"]);
  for (const g of groups) assert.ok(g.links.length > 0, g.label);
});

test("site: previous/next follows the sidebar order, and only the ends lack a link", () => {
  const seq = sequence(nodes);
  const expected = sidebar(nodes).flatMap((g) => g.links.flatMap(withChildren));
  assert.deepEqual(seq.map((l) => l.href), expected);
  assert.equal(new Set(expected).size, expected.length, "sequence has duplicates");
  const first = PAGES[0].route;
  assert.equal(seq[0].href, first);
  for (const p of PAGES) {
    const i = seq.findIndex((l) => l.href === p.route);
    assert.ok(i >= 0, p.route);
    assert.equal(i > 0, p.route !== first, `${p.route} previous`);
    assert.equal(i < seq.length - 1, p.route !== PAGES[PAGES.length - 1].route, `${p.route} next`);
  }
});

test("site: the README has no page, and installation.md shows the install command", () => {
  assert.ok(!PAGES.some((p) => p.source === "README.md"));
  assert.ok(readFileSync(join(ROOT, "docs/getting-started/installation.md"), "utf8").includes(INSTALL_COMMAND));
});

test("site: links are rewritten to routes or GitHub, and a link to an unrouted .md fails", async () => {
  const plugin = pathToFileURL(join(ROOT, "site/src/plugins/remark-repo-links.mjs")).href;
  const { remarkRepoLinks } = await import(plugin);
  const run = remarkRepoLinks({ root: ROOT });
  const rewrite = (url: string, from = "docs/FORMAT.md") => {
    const link = { type: "link", url, children: [] };
    run({ type: "root", children: [link] }, { path: join(ROOT, from) });
    return link.url;
  };
  assert.equal(rewrite("METHOD.md#step-2-reuse"), "/reference/method/#step-2-reuse");
  assert.equal(rewrite("../../../../../docs/DECISIONS.md", "packages/okb/examples/wine/tutorial/0-intro.md"), "/reference/decisions/");
  assert.equal(rewrite("packages/okb/meta-kb/README.md", "CONTRIBUTING.md"), "/contributing/meta-kb/");
  assert.equal(rewrite("../README.md"), "https://github.com/alanbsmith/ontology-kit/blob/main/README.md");
  assert.equal(rewrite("../packages/okb/src/checks.ts"), "https://github.com/alanbsmith/ontology-kit/blob/main/packages/okb/src/checks.ts");
  assert.equal(rewrite("../packages/okb/skills"), "https://github.com/alanbsmith/ontology-kit/tree/main/packages/okb/skills");
  assert.equal(rewrite("#node-types"), "#node-types");
  assert.equal(rewrite("https://example.com/a.md"), "https://example.com/a.md");
  assert.throws(() => rewrite("../sources/README.md"), /no route/);
});

test("site: every Mermaid diagram on a page has accTitle and accDescr", () => {
  let found = 0;
  for (const p of PAGES) {
    const blocks = readFileSync(join(ROOT, p.source), "utf8").matchAll(/^```mermaid\n([\s\S]*?)^```/gm);
    for (const [, body] of blocks) {
      found++;
      assert.match(body, /^\s*accTitle:\s*\S/m, `a Mermaid block in ${p.source} has no accTitle`);
      assert.match(body, /^\s*accDescr:\s*\S/m, `a Mermaid block in ${p.source} has no accDescr`);
    }
  }
  assert.ok(found > 0, "found no Mermaid blocks to check");
});

test("site: sidebar sections open for the page being read, and only those", () => {
  const groups = sidebar(nodes);
  const tutorial = "/getting-started/tutorial/wine-ontology/";
  const open = (route: string) => [...defaultOpen(groups, route)];

  // A child page opens its parent link and its group, and nothing else.
  assert.deepEqual(open(`${tutorial}3-terms/`).sort(), ["group:Getting started", `link:${tutorial}`].sort());
  // A link with children opens when it is the page itself; its siblings and other groups stay shut.
  assert.deepEqual(open("/reference/method/").sort(), ["group:Reference", "link:/reference/method/"].sort());
  // A page without children opens its group only.
  assert.deepEqual(open("/reference/glossary/"), ["group:Reference"]);
  // Routes outside the sidebar open nothing.
  assert.deepEqual(open("/nowhere/"), []);

  // Every group and every link with children has a distinct key.
  const keys = groups.flatMap((g) => [sectionKey(g), ...g.links.filter((l) => l.children).map(sectionKey)]);
  assert.equal(new Set(keys).size, keys.length);
});

test("site: every <okb-graph> has a text fallback and a src that has a data endpoint", () => {
  const names = new Set(graphNames(ROOT).map((n) => `/data/${n}.json`));
  let found = 0;
  for (const p of PAGES) {
    const text = readFileSync(join(ROOT, p.source), "utf8");
    for (const [, attrs, body] of text.matchAll(/<okb-graph\b([^>]*)>([\s\S]*?)<\/okb-graph>/g)) {
      found++;
      const src = /\bsrc="([^"]*)"/.exec(attrs)?.[1];
      assert.ok(src && names.has(src), `an <okb-graph> in ${p.source} has src="${src}", which no data endpoint serves`);
      // A focus or highlight name that matches no node would silently show the whole graph.
      const raw = loadGraph(ROOT, src.replace(/^\/data\/|\.json$/g, ""));
      const extra = (/\bshow="([^"]*)"/.exec(attrs)?.[1] ?? "").split(",").map((t) => t.trim()).filter(Boolean);
      const shown = buildGraph(raw, [...defaultTypes(raw), ...extra]);
      for (const attr of ["focus", "highlight"]) {
        const names = (new RegExp(`\\b${attr}="([^"]*)"`).exec(attrs)?.[1] ?? "").split(",").map((n) => n.trim()).filter(Boolean);
        for (const name of names) assert.ok(findNode(shown, name), `${p.source}: ${attr}="${name}" matches no node in ${src}`);
      }
      assert.ok(body.replace(/<[^>]*>/g, "").trim().length > 20, `an <okb-graph> in ${p.source} has an empty text fallback`);
      assert.ok(!/\n\s*\n/.test(body), `an <okb-graph> in ${p.source} has a blank line, which would end the HTML block`);
    }
    assert.equal(/<okb-graph\b/.test(text), text.includes("</okb-graph>"), `${p.source} has an unclosed <okb-graph>`);
  }
  assert.ok(found > 0, "found no <okb-graph> embeds to check");
});

test("every page opens with its H1, with no visible 'Generated' callout", () => {
  for (const p of PAGES) {
    const text = readFileSync(join(ROOT, p.source), "utf8").replace(/<!--[\s\S]*?-->/g, "");
    const lines = text.split("\n");
    const first = lines.find((l) => l.trim() !== "");
    assert.ok(first !== undefined && /^# \S/.test(first), `${p.source}: rule "a page starts with its # Title heading" is broken; the first content is ${JSON.stringify(first)}`);
    const h2 = lines.findIndex((l) => /^## /.test(l));
    const head = lines.slice(0, h2 === -1 ? lines.length : h2);
    const callout = head.find((l) => /^>\s*(\*\*)?Generated/i.test(l));
    assert.equal(callout, undefined, `${p.source}: rule "no visible 'Generated' callout" is broken; make it an HTML comment: ${callout}`);
  }
});

test("site: every internal link on the landing page is a real route, and the rule counts come from the meta-KB", async () => {
  const { LANDING_LINKS, ruleCounts } = await import("../../../site/src/lib/landing.ts");
  const routes = new Set(PAGES.map((p) => p.route));
  for (const [name, href] of Object.entries(LANDING_LINKS)) assert.ok(routes.has(href), `landing link ${name} → ${href} has no page`);

  const rules = ruleCounts(ROOT);
  assert.equal(rules.total, nodes.filter((n) => n.type === "Rule").length);
  assert.equal(rules.grounded + rules.conventions, rules.total);
  assert.equal(rules.errors + rules.warnings + rules.hints, rules.total);
});

test("site: the landing page has no hardcoded internal links", () => {
  const page = readFileSync(join(ROOT, "site/src/pages/index.astro"), "utf8");
  assert.ok(!/href="\//.test(page), "internal links come from LANDING_LINKS, which the test above checks");
});

const CHAPTERS: [string, string, string[]][] = [
  ["The big picture", "big-picture", ["knowledge-graphs", "ontologies", "competency-questions"]],
  ["Things and kinds", "things-and-kinds", ["classes-and-instances", "hierarchy", "disjoint-and-multiple-parents"]],
  ["Describing things", "describing-things", ["properties-and-relationships", "slot-inheritance", "facets", "inverse-relationships"]],
  ["Staying honest", "staying-honest", ["rules-and-findings", "meta-kb"]],
];
const learnRoute = (s: string) => `/learn/${s}/`;
const learnRoutes = () => PAGES.filter((p) => p.route.startsWith("/learn/")).map((p) => p.route);

test("site: the Learn group is the overview, four chapters that each open on a page, then the closing page", () => {
  const learn = sidebar(nodes).find((g) => g.label === "Learn")!;
  assert.deepEqual(learn.links.map((l) => l.label), ["Overview", ...CHAPTERS.map(([label]) => label), "Where next"]);
  assert.equal(learn.links[0].href, "/learn/");
  assert.equal(learn.links.at(-1)!.href, "/learn/where-next/");
  for (const [i, [, opener, slugs]] of CHAPTERS.entries()) {
    const chapter = learn.links[i + 1];
    assert.equal(chapter.href, learnRoute(opener), "a chapter heading links to its opener");
    assert.deepEqual((chapter.children ?? []).map((c) => c.href), slugs.map(learnRoute));
  }
  assert.equal(learnRoutes().length, 18);
});

test("site: every chapter has an opener page, and the openers are in the data", () => {
  for (const c of LEARN_CHAPTERS) {
    assert.ok(c.route, `chapter "${c.title}" has no opener route`);
    assert.ok(PAGES.some((p) => p.route === c.route), `${c.route} is not a page`);
  }
});

test("site: previous/next runs overview, each opener before its pages, then the closing page", () => {
  const seq = sequence(nodes);
  assert.ok(seq.every((l) => typeof l.href === "string" && l.href.startsWith("/")));
  const course = ["/learn/", ...CHAPTERS.flatMap(([, o, s]) => [learnRoute(o), ...s.map(learnRoute)]), "/learn/where-next/"];
  const hrefs = seq.map((l) => l.href);
  const start = hrefs.indexOf("/learn/");
  assert.deepEqual(hrefs.slice(start, start + course.length), course);
  assert.equal(neighbors(nodes, "/learn/competency-questions/").next?.href, "/learn/things-and-kinds/");
  assert.equal(neighbors(nodes, "/learn/classes-and-instances/").prev?.href, "/learn/things-and-kinds/");
  assert.equal(neighbors(nodes, "/learn/").prev?.href, "/getting-started/tutorial/espresso-ontology/8-review/");
  assert.equal(neighbors(nodes, "/learn/where-next/").prev?.href, "/learn/meta-kb/");
  assert.equal(neighbors(nodes, "/learn/where-next/").next?.href, "/build/");
});

test("site: a Learn chapter opens when it holds the page being read, and only then", () => {
  const groups = sidebar(nodes);
  const open = (route: string) => [...defaultOpen(groups, route)].sort();
  assert.deepEqual(open("/learn/facets/"), ["group:Learn", "link:/learn/describing-things/"].sort());
  assert.deepEqual(open("/learn/staying-honest/"), ["group:Learn", "link:/learn/staying-honest/"].sort());
  assert.deepEqual(open("/learn/meta-kb/"), ["group:Learn", "link:/learn/staying-honest/"].sort());
  assert.deepEqual(open("/learn/"), ["group:Learn"]);
  assert.deepEqual(open("/learn/where-next/"), ["group:Learn"]);
  // Section keys stay distinct, so one chapter's saved state can't open another.
  const learn = groups.find((g) => g.label === "Learn")!;
  const keys = learn.links.flatMap((l) => (l.children ? [sectionKey(l)] : []));
  assert.equal(keys.length, CHAPTERS.length);
  assert.equal(new Set(keys).size, keys.length);
});

test("site: every Learn page belongs to exactly one chapter, apart from the overview and the closing page", () => {
  const listed = LEARN_CHAPTERS.flatMap((c) => c.pages);
  assert.equal(new Set(listed).size, listed.length, "a page is in two chapters");
  const openers = LEARN_CHAPTERS.flatMap((c) => (c.route ? [c.route] : []));
  const loose = learnRoutes().filter((r) => !openers.includes(r) && r !== "/learn/" && r !== "/learn/where-next/");
  assert.deepEqual([...listed].sort(), loose.sort(), "a Learn page is in no chapter, or a chapter lists a page that doesn't exist");
});

test("site: every glossary anchor a Learn page links to exists", () => {
  const glossary = readFileSync(join(ROOT, "docs/GLOSSARY.md"), "utf8");
  const anchors = new Set([...glossary.matchAll(/<a id="([^"]+)">/g)].map((m) => m[1]));
  let found = 0;
  for (const route of learnRoutes()) {
    const source = PAGES.find((p) => p.route === route)!.source;
    for (const [, anchor] of readFileSync(join(ROOT, source), "utf8").matchAll(/GLOSSARY\.md#([\w-]+)/g)) {
      found++;
      assert.ok(anchors.has(anchor), `${source} links to GLOSSARY.md#${anchor}, which doesn't exist`);
    }
  }
  assert.ok(found > 0);
});

test("site: the Learn pages that link to the overview's graph guide point at a heading that exists", () => {
  const overview = readFileSync(join(ROOT, "docs/learn/index.md"), "utf8");
  assert.ok(/^## How to read the graphs$/m.test(overview));
  for (const route of learnRoutes()) {
    const text = readFileSync(join(ROOT, PAGES.find((p) => p.route === route)!.source), "utf8");
    if (text.includes("index.md#")) assert.ok(text.includes("index.md#how-to-read-the-graphs"), `${route} links to an overview anchor that isn't there`);
  }
});

test("site: a chapter with a page is a link before its children in previous/next, and one without is skipped", () => {
  const chapters: typeof LEARN_CHAPTERS = [
    { title: "Opened", route: "/learn/ontologies/", pages: ["/learn/facets/"] },
    { title: "Bare", pages: ["/learn/hierarchy/"] },
  ];
  const [opened, bare] = chapters.map((c) => {
    const children = c.pages.map((r) => ({ label: r, href: r }));
    return c.route ? { label: c.title, href: c.route, children } : { label: c.title, children };
  });
  const groups = [{ label: "Learn", links: [opened, bare] }];
  // The opener is its own entry and counts as the open chapter when read, as do its children.
  assert.deepEqual([...defaultOpen(groups, "/learn/ontologies/")].sort(), ["group:Learn", "link:/learn/ontologies/"]);
  assert.deepEqual([...defaultOpen(groups, "/learn/facets/")].sort(), ["group:Learn", "link:/learn/ontologies/"]);
  assert.deepEqual([...defaultOpen(groups, "/learn/hierarchy/")].sort(), ["group:Learn", "heading:Bare"]);
  assert.equal(sectionKey(bare), "heading:Bare");
  assert.deepEqual(sequenceOf(groups).map((l) => l.href), ["/learn/ontologies/", "/learn/facets/", "/learn/hierarchy/"]);
});
