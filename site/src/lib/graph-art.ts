/**
 * Deterministic generative art for the docs pages' header bands: a small graph of nodes and
 * edges, seeded by a string. It is the docs-site counterpart of the Truchet tiles on the owner's
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
 * GENERATOR VERSION 5 (the version 2 grid network again, after the cluster layouts of versions 3 and 4
 * were dropped; thinner lines, and the columns scale with the width, 20 at the default 2000).
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

// Node sizes, as fractions of the shorter cell side.
const INSTANCE_R = [0.05, 0.065];
const CLASS_R = [0.09, 0.11];
const HUB_R = 0.15;
/** Nodes stay this far (plus their radius) inside their cell, so neighbors never touch. */
const CELL_MARGIN = 0.12;
/** An edge passes no closer than this to any node it doesn't join (times the cell side). */
const CLEARANCE = 0.12;

/** Distance from point (px, py) to the segment a→b. */
function segmentDistance(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
	const dx = bx - ax;
	const dy = by - ay;
	const len2 = dx * dx + dy * dy;
	const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
	return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Union-find over node indexes, for the spanning pass and the connectivity check. */
function components(count: number) {
	const parent = Array.from({ length: count }, (_, i) => i);
	const root = (i: number): number => (parent[i] === i ? i : (parent[i] = root(parent[i])));
	return {
		root,
		join(a: number, b: number) {
			const ra = root(a);
			const rb = root(b);
			if (ra === rb) return false;
			parent[ra] = rb;
			return true;
		},
	};
}

export function graphArt(seed: string, { width = 2000, height = 400, cols = Math.round(width / 100), rows = 6 } = {}): GraphArt {
	const rand = mulberry32(hashString(seed));
	const cw = width / cols;
	const ch = height / rows;
	const unit = Math.min(cw, ch);

	// Three neighboring hues on the palette ring: analogous, so every page looks related.
	const base = Math.floor(rand() * PALETTE_SIZE);
	const ring = [base, (base + 1) % PALETTE_SIZE, (base + PALETTE_SIZE - 1) % PALETTE_SIZE];

	const strokeWidth = n(unit * (0.013 + rand() * 0.006));

	// 1. A jittered grid: one candidate node per cell, nudged inside it but clear of its edges.
	const keep = HUB_R + CELL_MARGIN;
	const cells = Array.from({ length: cols * rows }, (_, i) => {
		const x = i % cols;
		const y = Math.floor(i / cols);
		return {
			x,
			y,
			cx: (x + keep + rand() * (1 - 2 * keep)) * cw,
			cy: (y + keep + rand() * (1 - 2 * keep)) * ch,
		};
	});

	// Edge candidates between present cells: the next present cell to the right and below (one
	// gap may be skipped), and the diagonals down-left and down-right. A candidate that would pass
	// over a node it doesn't join is dropped, using the largest radius any node can have.
	const present = new Set(cells.map((_, i) => i));
	const at = (x: number, y: number) => (x >= 0 && x < cols && y >= 0 && y < rows ? y * cols + x : -1);
	const clear = (a: number, b: number) =>
		[...present].every(
			(k) =>
				k === a ||
				k === b ||
				segmentDistance(cells[k].cx, cells[k].cy, cells[a].cx, cells[a].cy, cells[b].cx, cells[b].cy) >=
					(HUB_R + CLEARANCE) * unit,
		);
	const candidates = (): [number, number][] => {
		const out: [number, number][] = [];
		for (const i of present) {
			const { x, y } = cells[i];
			for (const [dx, dy] of [
				[1, 0],
				[0, 1],
			]) {
				let j = at(x + dx, y + dy);
				if (j >= 0 && !present.has(j)) j = at(x + 2 * dx, y + 2 * dy);
				if (j >= 0 && present.has(j)) out.push([i, j]);
			}
			for (const dx of [-1, 1]) {
				const j = at(x + dx, y + 1);
				if (j >= 0 && present.has(j)) out.push([i, j]);
			}
		}
		return out.filter(([a, b]) => clear(a, b));
	};
	const connected = () => {
		const uf = components(cells.length);
		for (const [a, b] of candidates()) uf.join(a, b);
		const roots = new Set([...present].map((i) => uf.root(i)));
		return roots.size === 1;
	};

	// 2. Skip some cells so the grid doesn't read as a lattice, but never one whose loss would
	// split the graph.
	for (let i = 0; i < cells.length; i++) {
		if (rand() >= 0.22) continue;
		present.delete(i);
		if (!connected()) present.add(i);
	}

	// 3. Edges: a random spanning tree first, so the graph is always connected, then a few of the
	// remaining candidates for some cycles.
	const pool = candidates()
		.map((pair) => ({ pair, w: rand() }))
		.sort((a, b) => a.w - b.w);
	const uf = components(cells.length);
	const chosen: [number, number][] = [];
	const extra: [number, number][] = [];
	for (const { pair } of pool) (uf.join(...pair) ? chosen : extra).push(pair);
	for (const pair of extra) if (rand() < 0.3) chosen.push(pair);

	// 4. Nodes: the best-connected few become hubs (large classes); the rest are classes or
	// instances at random. Each takes a hue from the ring.
	const order = [...present];
	const index = new Map(order.map((cell, i) => [cell, i]));
	const degree = new Map(order.map((cell) => [cell, 0]));
	for (const [a, b] of chosen) {
		degree.set(a, degree.get(a)! + 1);
		degree.set(b, degree.get(b)! + 1);
	}
	const hubs = new Set(
		[...order]
			.sort((a, b) => degree.get(b)! - degree.get(a)! || a - b)
			.slice(0, 1 + Math.floor(rand() * 3)),
	);
	const nodes: GraphArtNode[] = order.map((cell) => {
		const art = ring[Math.floor(rand() * ring.length)] + 1;
		const isClass = hubs.has(cell) || rand() < 0.35;
		const [lo, hi] = isClass ? CLASS_R : INSTANCE_R;
		const r = hubs.has(cell) ? HUB_R : lo + rand() * (hi - lo);
		return { art, cx: n(cells[cell].cx), cy: n(cells[cell].cy), r: n(r * unit), kind: isClass ? 'class' : 'instance' };
	});

	// Each edge takes the color of one of its ends, so color runs along the graph.
	const links = chosen.map(([a, b]): [number, number] => [index.get(a)!, index.get(b)!]);
	const d = new Map<number, string>();
	for (const [a, b] of links) {
		const art = nodes[rand() < 0.5 ? a : b].art;
		d.set(art, (d.get(art) ?? '') + `M${nodes[a].cx} ${nodes[a].cy}L${nodes[b].cx} ${nodes[b].cy}`);
	}

	return {
		width,
		height,
		strokeWidth,
		edges: ring.map((i) => ({ art: i + 1, d: d.get(i + 1) ?? '' })).filter((e) => e.d),
		nodes,
		links,
	};
}
