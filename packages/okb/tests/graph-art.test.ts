// The docs site's banner art (site/src/lib/graph-art.ts) must be stable and always a connected graph.
import { test } from "node:test";
import assert from "node:assert/strict";
import { graphArt } from "../../../site/src/lib/graph-art.ts";
import { PAGES } from "../../../site/src/nav.ts";

const sizes = [{}, { width: 800 }];
const seeds = [
  ...PAGES.map((p) => p.route),
  ...Array.from({ length: 200 }, (_, i) => `/seed-${i}/`),
];

test("graph-art: the same seed gives identical output, and different routes differ", () => {
  assert.deepEqual(graphArt("/rules/"), graphArt("/rules/"));
  const images = new Set(PAGES.map((p) => JSON.stringify(graphArt(p.route))));
  assert.equal(images.size, PAGES.length);
});

test("graph-art: every node, ring included, lies inside the viewBox", () => {
  for (const seed of seeds) {
    for (const size of sizes) {
      const art = graphArt(seed, size);
      assert.ok(art.nodes.length >= 2, seed);
      for (const { cx, cy, r } of art.nodes) {
        assert.ok(
          cx - r >= 0 &&
            cx + r <= art.width &&
            cy - r >= 0 &&
            cy + r <= art.height,
          `${seed}: node at ${cx},${cy}`,
        );
      }
    }
  }
});

test("graph-art: the graph is connected", () => {
  for (const seed of seeds) {
    for (const size of sizes) {
      const { nodes, links } = graphArt(seed, size);
      const seen = new Set([0]);
      for (let grew = true; grew;) {
        grew = false;
        for (const [a, b] of links) {
          if (seen.has(a) !== seen.has(b)) {
            seen.add(a).add(b);
            grew = true;
          }
        }
      }
      assert.equal(seen.size, nodes.length, `${seed} is split into pieces`);
    }
  }
});

test("graph-art: colors are only var(--color-art-1..6) indexes, and both node kinds appear", () => {
  const kinds = new Set<string>();
  for (const seed of seeds) {
    const art = graphArt(seed);
    for (const { art: i } of [...art.edges, ...art.nodes])
      assert.ok(Number.isInteger(i) && i >= 1 && i <= 6, `${seed}: ${i}`);
    for (const node of art.nodes) kinds.add(node.kind);
  }
  assert.deepEqual([...kinds].sort(), ["class", "instance"]);
});
