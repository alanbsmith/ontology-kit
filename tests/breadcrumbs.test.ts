// The breadcrumb trail (site/src/lib/breadcrumbs.ts) is derived from the nav data, so these tests
// check it against the real pages and chapters.
import { test } from "node:test";
import assert from "node:assert/strict";
import { breadcrumbs } from "../site/src/lib/breadcrumbs.ts";
import { LEARN_CHAPTERS, LEARN_OVERVIEW, PAGES, pageAt } from "../site/src/nav.ts";

const learn = PAGES.filter((p) => p.route.startsWith("/learn/") && p.route !== LEARN_OVERVIEW);
const tutorial = PAGES.filter((p) => /^examples\/[^/]+\/tutorial\//.test(p.source));
const labels = (r: string) => breadcrumbs(r).map((c) => c.label);

test("breadcrumbs: every Learn and tutorial page ends with itself, and every link is a real route", () => {
  assert.ok(learn.length > 10 && tutorial.length === 18);
  for (const p of [...learn, ...tutorial]) {
    const trail = breadcrumbs(p.route);
    assert.ok(trail.length >= 2, `${p.route} has no trail`);
    const last = trail[trail.length - 1];
    assert.equal(last.href, undefined, `${p.route}: the last crumb is a link`);
    assert.ok(last.label.length > 0);
    for (const c of trail.slice(0, -1)) assert.ok(c.href && pageAt(c.href), `${p.route}: ${c.label} → ${c.href} is not a page`);
  }
});

test("breadcrumbs: Learn pages", () => {
  assert.deepEqual(labels("/learn/hierarchy/"), ["Learn", "Things and kinds", "Is a kind of"]);
  assert.equal(breadcrumbs("/learn/hierarchy/")[1].href, "/learn/things-and-kinds/");
  assert.deepEqual(breadcrumbs("/learn/things-and-kinds/"), [{ label: "Learn", href: "/learn/" }, { label: "Things and kinds" }]);
  assert.deepEqual(breadcrumbs("/learn/where-next/"), [{ label: "Learn", href: "/learn/" }, { label: "Where next" }]);
  assert.deepEqual(breadcrumbs("/learn/"), []);
});

test("breadcrumbs: tutorial pages", () => {
  assert.deepEqual(breadcrumbs("/getting-started/tutorial/wine-ontology/5-slots/"), [
    { label: "Getting started", href: "/getting-started/" },
    { label: "Wine ontology tutorial", href: "/getting-started/tutorial/wine-ontology/" },
    { label: "5. Slots" },
  ]);
  assert.deepEqual(breadcrumbs("/getting-started/tutorial/espresso-ontology/"), [
    { label: "Getting started", href: "/getting-started/" },
    { label: "Espresso ontology tutorial" },
  ]);
});

test("breadcrumbs: other pages have none", () => {
  for (const r of ["/getting-started/", "/getting-started/quickstart/", "/build/", "/build/export/", "/reference/rules/", "/contributing/", "/nope/"]) {
    assert.deepEqual(breadcrumbs(r), [], r);
  }
});

test("breadcrumbs: a chapter added to the chapter data gets a trail with no other change", () => {
  const extra = { title: "Extra", route: "/learn/extra/", pages: ["/learn/extra-page/"] };
  const idx = (LEARN_CHAPTERS as unknown as unknown[]).push(extra);
  const added = [
    { route: "/learn/extra/", source: "x", label: "Extra", summary: "" },
    { route: "/learn/extra-page/", source: "x", label: "An extra page", summary: "" },
  ];
  (PAGES as unknown as unknown[]).push(...added);
  try {
    assert.deepEqual(labels("/learn/extra-page/"), ["Learn", "Extra", "An extra page"]);
    assert.deepEqual(labels("/learn/extra/"), ["Learn", "Extra"]);
  } finally {
    (LEARN_CHAPTERS as unknown as unknown[]).splice(idx - 1, 1);
    (PAGES as unknown as unknown[]).splice(-added.length, added.length);
  }
});
