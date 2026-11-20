// The docs site (site/) lists its pages in site/src/nav.ts. These tests keep that list honest, so
// a new doc page can't be left out of the site, and check the plugin that rewrites the docs' links.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { INSTALL_COMMAND } from "../site/src/lib/install.ts";
import { PAGES, sequence, sidebar, type MetaNode, type NavLink } from "../site/src/nav.ts";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const nodes: MetaNode[] = JSON.parse(readFileSync(join(ROOT, "meta-kb/data/nodes.json"), "utf8"));

/** A link's href and every href nested under it. */
const withChildren = (l: NavLink): string[] => [l.href, ...(l.children ?? []).flatMap(withChildren)];

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
  const tutorials = readdirSync(join(ROOT, "examples")).filter((e) => existsSync(join(ROOT, "examples", e, "tutorial-src")));
  assert.ok(tutorials.includes("wine"));
  for (const t of tutorials) {
    const sources = new Set(PAGES.map((p) => p.source));
    for (const f of readdirSync(join(ROOT, "examples", t, "tutorial")).filter((f) => f.endsWith(".md"))) {
      assert.ok(sources.has(`examples/${t}/tutorial/${f}`), `examples/${t}/tutorial/${f} isn't in site/src/nav.ts`);
    }
  }
  const route = (n: number) => PAGES.find((p) => p.source.startsWith(`examples/wine/tutorial/${n}-`))!.route;
  assert.equal(route(0), "/getting-started/tutorial/wine-ontology/");
  const seq = sequence(nodes).map((l) => l.href);
  for (let n = 1; n <= 8; n++) assert.equal(seq.indexOf(route(n)), seq.indexOf(route(n - 1)) + 1, `step ${n} follows step ${n - 1}`);
  assert.ok(!PAGES.some((p) => p.source.endsWith("TRANSCRIPT.md")), "the transcript is for GitHub readers, not the site");
});

test("site: the sidebar lists every step and decision guide from the meta-KB, by stable anchor", () => {
  const hrefs = sidebar(nodes).flatMap((g) => g.links.flatMap(withChildren));
  for (const n of nodes.filter((n) => n.type === "Step")) assert.ok(hrefs.includes(`/build/methodology/#${n.id.replace(/\./g, "-")}`), n.id);
  for (const n of nodes.filter((n) => n.type === "Decision")) assert.ok(hrefs.includes(`/reference/decisions/#${n.id.replace(/\./g, "-")}`), n.id);
  // The anchors exist in the generated pages.
  const method = readFileSync(join(ROOT, "docs/METHOD.md"), "utf8");
  for (const n of nodes.filter((n) => n.type === "Step")) assert.ok(method.includes(`<a id="${n.id.replace(/\./g, "-")}"></a>`), n.id);
});

test("site: the sidebar has only non-empty groups, in order, with every page once", () => {
  const groups = sidebar(nodes);
  assert.deepEqual(groups.map((g) => g.label), ["Getting started", "Build", "Reference", "Contributing"]);
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
  assert.equal(rewrite("METHOD.md#step-2-reuse"), "/build/methodology/#step-2-reuse");
  assert.equal(rewrite("../../../docs/DECISIONS.md", "examples/wine/tutorial/0-intro.md"), "/reference/decisions/");
  assert.equal(rewrite("meta-kb/README.md", "CONTRIBUTING.md"), "/contributing/meta-kb/");
  assert.equal(rewrite("../README.md"), "https://github.com/alanbsmith/ontology-kit/blob/main/README.md");
  assert.equal(rewrite("../src/checks.ts"), "https://github.com/alanbsmith/ontology-kit/blob/main/src/checks.ts");
  assert.equal(rewrite("../skills"), "https://github.com/alanbsmith/ontology-kit/tree/main/skills");
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
