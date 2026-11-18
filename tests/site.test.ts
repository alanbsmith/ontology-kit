// The docs site (site/) lists its pages in site/src/nav.ts. These tests keep that list honest, so
// a new doc page can't be left out of the site, and check the plugin that rewrites the docs' links.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PAGES, sidebar, type MetaNode } from "../site/src/nav.ts";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const nodes: MetaNode[] = JSON.parse(readFileSync(join(ROOT, "meta-kb/data/nodes.json"), "utf8"));

test("site: every page's source file exists", () => {
  for (const p of PAGES) assert.ok(existsSync(join(ROOT, p.source)), `${p.route} → ${p.source} is missing`);
});

test("site: every docs/*.md file has a page", () => {
  const sources = new Set(PAGES.map((p) => p.source));
  for (const f of readdirSync(join(ROOT, "docs")).filter((f) => f.endsWith(".md"))) {
    assert.ok(sources.has(`docs/${f}`), `docs/${f} isn't in site/src/nav.ts`);
  }
});

test("site: routes are unique and every page is in the sidebar", () => {
  assert.equal(new Set(PAGES.map((p) => p.route)).size, PAGES.length);
  const hrefs = sidebar(nodes).flatMap((g) => g.links.map((l) => l.href));
  for (const p of PAGES) assert.ok(hrefs.includes(p.route), `${p.route} isn't in the sidebar`);
});

test("site: the sidebar lists every step and decision guide from the meta-KB, by stable anchor", () => {
  const hrefs = sidebar(nodes).flatMap((g) => g.links.flatMap((l) => [l.href, ...(l.children ?? []).map((c) => c.href)]));
  for (const n of nodes.filter((n) => n.type === "Step")) assert.ok(hrefs.includes(`/method/#${n.id.replace(/\./g, "-")}`), n.id);
  for (const n of nodes.filter((n) => n.type === "Decision")) assert.ok(hrefs.includes(`/decisions/#${n.id.replace(/\./g, "-")}`), n.id);
  // The anchors exist in the generated pages.
  const method = readFileSync(join(ROOT, "docs/METHOD.md"), "utf8");
  for (const n of nodes.filter((n) => n.type === "Step")) assert.ok(method.includes(`<a id="${n.id.replace(/\./g, "-")}"></a>`), n.id);
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
  assert.equal(rewrite("METHOD.md#step-2-reuse"), "/method/#step-2-reuse");
  assert.equal(rewrite("../../docs/DECISIONS.md", "examples/wine/TRANSCRIPT.md"), "/decisions/");
  assert.equal(rewrite("meta-kb/README.md", "README.md"), "/meta-kb/");
  assert.equal(rewrite("../src/checks.ts"), "https://github.com/alanbsmith/ontology-kit/blob/main/src/checks.ts");
  assert.equal(rewrite("../skills"), "https://github.com/alanbsmith/ontology-kit/tree/main/skills");
  assert.equal(rewrite("#node-types"), "#node-types");
  assert.equal(rewrite("https://example.com/a.md"), "https://example.com/a.md");
  assert.throws(() => rewrite("../sources/README.md"), /no route/);
});
