/**
 * Deterministic generative art for the docs pages' header bands: a small graph of clusters (nodes
 * and edges), seeded by a string. It is the docs-site counterpart of the Truchet tiles on the owner's
 * blog (~/Projects/writing/src/lib/truchet.ts).
 *
 * Same route in, same image out. Seed it with the page's route (`/rules/`), never its title, so
 * retitling a page doesn't change the art.
 *
 * The nodes are the toolkit's two kinds of thing: a class is a ring, an instance a smaller dot.
 * Colors are not baked in. Every stroke and fill points at --color-art-1..6 (see tokens.css), so
 * the art follows the theme, high contrast and the color-vision setting with no variants here.
 *
 * Plain, erasable TypeScript with no Astro imports, so tests/graph-art.test.ts can import it.
 *
 * GENERATOR VERSION 4 (10–13 clusters, each larger, instead of 6–8; version 3 replaced the jittered
 * grid with clusters).
 * Changing anything below (hash, PRNG, order of rand() calls, grid, edge rules, palette rules)
 * changes every image. Treat edits as a deliberate redesign.
 */

/** Hash a string into a 32-bit seed (cyrb53-style mix). Copied from the blog's truchet.ts. */
function hashString(str: string): number {
	let h1 = 0xdeadbeef ^ str.length;
	let h2 = 0x41c6ce57 ^ str.length;
	for (let i = 0; i < str.length; i++) {
		const c = str.charCodeAt(i);
		h1 = Math.imul(h1 ^ c, 2654435761);
		h2 = Math.imul(h2 ^ c, 1597334677);
	}
	h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
	return h1 >>> 0;
}

/** Seeded PRNG so every route gets a stable random sequence. Copied from the blog's truchet.ts. */
function mulberry32(seed: number) {
	return () => {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const PALETTE_SIZE = 6; // --color-art-1 .. --color-art-6

export type NodeKind = 'class' | 'instance';

export interface GraphArtNode {
	/** The 1-based --color-art-N index. */
	art: number;
	cx: number;
	cy: number;
	r: number;
	/** A class draws as a ring filled with the page color; an instance as a filled dot. */
	kind: NodeKind;
}

export interface GraphArt {
	width: number;
	height: number;
	strokeWidth: number;
	/** One path of straight segments per stroke color. `art` is the 1-based --color-art-N index. */
	edges: { art: number; d: string }[];
	nodes: GraphArtNode[];
	/** Which nodes each edge joins (indexes into `nodes`), for tests. */
	links: [number, number][];
}

const n = (v: number) => +v.toFixed(2);

/**
 * Shaped like an ontology: a few class hubs (rings), each with instance dots around it and
 * sometimes subclass rings with dots of their own. Hubs are joined to each other by a spanning
 * tree plus one extra link, so the whole graph is always connected.
 */
export function graphArt(seed: string, { width = 2000, height = 400 } = {}): GraphArt {
	const rand = mulberry32(hashString(seed));
	const between = (lo: number, hi: number) => lo + rand() * (hi - lo);

	// Three neighboring hues on the palette ring: analogous, so every page looks related.
	const base = Math.floor(rand() * PALETTE_SIZE);
	const ring = [base, (base + 1) % PALETTE_SIZE, (base + PALETTE_SIZE - 1) % PALETTE_SIZE];
	const hue = () => ring[Math.floor(rand() * ring.length)] + 1;

	const strokeWidth = n(between(2.2, 2.8));
	const pad = strokeWidth * 2;

	const nodes: GraphArtNode[] = [];
	const links: [number, number][] = [];
	const add = (kind: NodeKind, art: number, x: number, y: number, r: number) => {
		// Keep the whole node (ring stroke included) inside the viewBox.
		const cx = Math.min(width - r - pad, Math.max(r + pad, x));
		const cy = Math.min(height - r - pad, Math.max(r + pad, y));
		nodes.push({ art, cx: n(cx), cy: n(cy), r: n(r), kind });
		return nodes.length - 1;
	};

	// Place a ring of dots around a node, each joined to it, and a link or two between neighbors.
	const orbit = (parent: number, count: number, near: number, far: number, art: number) => {
		const { cx, cy } = nodes[parent];
		const start = rand() * Math.PI * 2;
		const kids: number[] = [];
		for (let i = 0; i < count; i++) {
			const angle = start + ((i + rand() * 0.7) / count) * Math.PI * 2;
			const dist = between(near, far);
			const kid = add('instance', rand() < 0.25 ? hue() : art, cx + Math.cos(angle) * dist * 1.25, cy + Math.sin(angle) * dist * 0.8, between(4, 6.5));
			links.push([parent, kid]);
			kids.push(kid);
		}
		for (let i = 0; i + 1 < kids.length; i++) if (rand() < 0.3) links.push([kids[i], kids[i + 1]]);
	};

	// 1. Hub positions: spread out by rejection sampling (keeps the best of a few tries).
	const count = 10 + Math.floor(rand() * 4);
	const hubs: number[] = [];
	for (let i = 0; i < count; i++) {
		let best = { x: 0, y: 0, gap: -1 };
		for (let t = 0; t < 20; t++) {
			const x = between(80, width - 80);
			const y = between(70, height - 70);
			const gap = Math.min(Infinity, ...hubs.map((h) => Math.hypot(nodes[h].cx - x, (nodes[h].cy - y) * 1.3)));
			if (gap > best.gap) best = { x, y, gap };
		}
		const art = hue();
		const hub = add('class', art, best.x, best.y, between(13, 18));
		hubs.push(hub);

		// 2. Around each hub: instances, and sometimes subclass rings with instances of their own.
		orbit(hub, 5 + Math.floor(rand() * 6), 40, 90, art);
		const subs = 1 + Math.floor(rand() * 3);
		for (let k = 0; k < subs; k++) {
			const angle = rand() * Math.PI * 2;
			const dist = between(85, 130);
			const sub = add('class', art, best.x + Math.cos(angle) * dist * 1.3, best.y + Math.sin(angle) * dist * 0.7, between(8, 10.5));
			links.push([hub, sub]);
			orbit(sub, 3 + Math.floor(rand() * 4), 30, 65, art);
		}
	}

	// 3. Join the hubs: a minimum spanning tree (Prim), then one extra link for a cycle.
	const gap = (a: number, b: number) => Math.hypot(nodes[a].cx - nodes[b].cx, nodes[a].cy - nodes[b].cy);
	const inTree = new Set([hubs[0]]);
	const bridges: [number, number][] = [];
	while (inTree.size < hubs.length) {
		let best: [number, number] | undefined;
		for (const a of inTree) for (const b of hubs) if (!inTree.has(b) && (!best || gap(a, b) < gap(...best))) best = [a, b];
		bridges.push(best!);
		inTree.add(best![1]);
	}
	const spare = hubs.flatMap((a) => hubs.filter((b) => b > a).map((b): [number, number] => [a, b])).filter(([a, b]) => !bridges.some(([x, y]) => (x === a && y === b) || (x === b && y === a)));
	if (spare.length) bridges.push(spare[Math.floor(rand() * spare.length)]);
	links.push(...bridges);

	// An edge takes the color of its second end, so each cluster's spokes match its dots.
	const d = new Map<number, string>();
	for (const [a, b] of links) {
		const art = nodes[b].art;
		d.set(art, (d.get(art) ?? '') + `M${nodes[a].cx} ${nodes[a].cy}L${nodes[b].cx} ${nodes[b].cy}`);
	}

	return {
		width,
		height,
		strokeWidth,
		edges: [...d].map(([art, path]) => ({ art, d: path })),
		nodes,
		links,
	};
}
