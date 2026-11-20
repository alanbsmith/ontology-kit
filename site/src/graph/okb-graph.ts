/**
 * <okb-graph src="/data/espresso.json" focus="Milk drink, Drink" highlight="Latte" show="Slot">
 *
 * An explore-only graph in the site's ring-and-dot art language: drag a node, drag the background to
 * pan, zoom, and select a node to read about it in the inspector. Plain SVG with our own pointer
 * events; `d3-force` only places the nodes. `lazy.ts` loads this file when the element scrolls near
 * the screen. What is inside the element in the markdown is its text fallback: all GitHub shows, and
 * the text alternative here (it moves into a "Text version" disclosure).
 *
 *   src        the data (`/data/<name>.json`, see data.ts)
 *   focus      names or ids to show with what they touch and the kinds above them (comma separated)
 *   highlight  names or ids to draw larger, with a dashed halo and a bold label
 *   show       extra node types to include beyond the default view (comma separated)
 *   label      the graph's accessible name
 *
 * Touch: the graph starts inert ("Tap to explore") so scrolling past never drags a node. Wheel zoom
 * works only once the graph is active (clicked or focused) or with Ctrl or Cmd held.
 * Keyboard: Tab moves between nodes, Enter inspects, arrow keys nudge, Escape clears.
 * Reduced motion: the layout settles before first paint and nothing animates afterward.
 */
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, type Simulation, type SimulationLinkDatum, type SimulationNodeDatum } from 'd3-force';
import './okb-graph.css';
import { buildGraph, defaultTypes, findNode, focusGraph, linksOf, neighborhood, typeLabel, typesIn, type RawGraph, type ViewEdge, type ViewGraph, type ViewNode } from './model.ts';

const SVG = 'http://www.w3.org/2000/svg';
const NUDGE = 14;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
/** Node types with a single node (the ontology itself, the source) are not worth a filter. */
const FILTER_MIN = 2;

interface SimNode extends SimulationNodeDatum, ViewNode {
	el?: SVGGElement;
}
interface SimLink extends SimulationLinkDatum<SimNode> {
	edge: ViewEdge;
	line?: SVGLineElement;
	text?: SVGTextElement;
}

const list = (v: string | null) => (v ?? '').split(',').map((s) => s.trim()).filter(Boolean);

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
	const el = document.createElementNS(SVG, tag);
	for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
	return el;
}

function html<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<{ className: string; text: string }> = {}, ...kids: (Node | string)[]): HTMLElementTagNameMap[K] {
	const el = document.createElement(tag);
	if (props.className) el.className = props.className;
	if (props.text) el.textContent = props.text;
	el.append(...kids);
	return el;
}

/** The shape for a node: a ring (kind of thing) or a dot (example), colored by type. */
function shapeFor(n: ViewNode, r: number): SVGCircleElement {
	const circle = svg('circle', { r, class: `og-shape ${n.shape === 'ring' ? 'og-ring' : ''}` });
	circle.style.stroke = `var(--color-art-${n.art})`;
	if (n.shape === 'dot') circle.style.fill = `var(--color-art-${n.art})`;
	return circle;
}

class OkbGraph extends HTMLElement {
	private raw!: RawGraph;
	private types = new Set<string>();
	private view: ViewGraph = { nodes: [], edges: [] };
	private nodes: SimNode[] = [];
	private links: SimLink[] = [];
	private sim?: Simulation<SimNode, SimLink>;
	private frame = 0;
	private selected: string | null = null;
	private highlight = new Set<string>();
	private pinned = new Set<string>();
	private zoom = { k: 1, x: 0, y: 0 };
	private size = { w: 640, h: 420 };
	private active = false;
	private ready = false;
	private still = matchMedia('(prefers-reduced-motion: reduce)');
	private touch = matchMedia('(hover: none) and (pointer: coarse)');

	private fallback?: HTMLDetailsElement;
	private frameEl!: HTMLDivElement;
	private svgEl!: SVGSVGElement;
	private world!: SVGGElement;
	private tap?: HTMLButtonElement;
	private done?: HTMLButtonElement;
	private filters!: HTMLDivElement;
	private inspector!: HTMLDivElement;

	connectedCallback() {
		if (this.ready) return;
		this.ready = true;
		void this.start();
	}

	private async start() {
		const src = this.getAttribute('src');
		const fallback = [...this.childNodes];
		this.fallback = html('details', { className: 'og-text' }, html('summary', { text: 'Text version of this graph' }), ...fallback);
		try {
			if (!src) throw new Error('no src');
			const res = await fetch(src);
			if (!res.ok) throw new Error(`${res.status}`);
			this.raw = (await res.json()) as RawGraph;
		} catch {
			// Leave the fallback as it was: it is the content.
			this.replaceChildren(...fallback);
			return;
		}
		this.build();
	}

	/** The graph for the current type filter and focus. */
	private compute() {
		const full = buildGraph(this.raw, this.types);
		const focus = list(this.getAttribute('focus'));
		this.view = focus.length ? focusGraph(full, focus).graph : full;
		this.highlight = new Set(list(this.getAttribute('highlight')).flatMap((h) => { const n = findNode(this.view, h); return n ? [n.id] : []; }));
	}

	private build() {
		const extra = list(this.getAttribute('show'));
		this.types = new Set([...defaultTypes(this.raw), ...extra]);
		this.compute();

		this.frameEl = html('div', { className: 'og-frame' });
		this.svgEl = svg('svg', { role: 'group', 'aria-label': this.getAttribute('label') ?? 'Graph of the ontology. Tab moves between nodes, Enter inspects one, arrow keys move it, Escape clears.' });
		this.world = svg('g');
		this.svgEl.append(this.world);
		const tools = html('div', { className: 'og-tools' });
		const plus = this.button('+', 'Zoom in', () => this.zoomBy(1.4));
		const minus = this.button('−', 'Zoom out', () => this.zoomBy(1 / 1.4));
		plus.classList.add('og-icon');
		minus.classList.add('og-icon');
		tools.append(plus, minus, this.button('Reset', 'Reset the graph', () => this.reset()));
		this.frameEl.append(this.svgEl, tools);

		this.filters = html('div', { className: 'og-filters' });
		this.inspector = html('div', { className: 'og-inspector' });
		this.inspector.setAttribute('aria-live', 'polite');
		this.replaceChildren(this.frameEl);
		this.append(this.filters, this.inspector, this.legend(), this.fallback!);
		this.buildFilters();
		this.inspect();

		// Wheel and pointer events are our own: no d3-selection or d3-drag.
		this.svgEl.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
		this.svgEl.addEventListener('pointerdown', (e) => this.onBackgroundDown(e));
		this.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.clear(); });
		this.addEventListener('focusin', () => (this.active = true));
		document.addEventListener('pointerdown', (e) => { if (!this.contains(e.target as Node)) this.deactivate(); });
		new ResizeObserver(() => this.resize()).observe(this.frameEl);

		if (this.touch.matches) {
			this.classList.add('og-inert');
			this.tap = this.button('Tap to explore', 'Tap to explore the graph', () => this.activate());
			this.tap.className = 'og-tap';
			this.done = this.button('Done', 'Stop exploring and scroll past the graph', () => this.deactivate());
			this.done.hidden = true;
			tools.prepend(this.done);
			this.frameEl.append(this.tap);
		}

		this.resize();
		this.layout();
	}

	private button(text: string, label: string, onClick: () => void) {
		const b = html('button', { text });
		b.type = 'button';
		b.setAttribute('aria-label', label);
		b.addEventListener('click', onClick);
		return b;
	}

	private legend() {
		const items = [...new Map(this.view.nodes.map((n) => [n.type, n])).values()];
		const legend = html('div', { className: 'og-legend' });
		legend.setAttribute('aria-hidden', 'true');
		for (const n of items) {
			const icon = svg('svg', { viewBox: '-8 -8 16 16' });
			icon.append(shapeFor(n, 5));
			legend.append(html('span', {}, icon, `${typeLabel(n.type)} (${n.shape === 'ring' ? 'ring' : 'dot'})`));
		}
		return legend;
	}

	/** One checkbox per node type in the data, when the graph is not already focused. */
	private buildFilters() {
		this.filters.replaceChildren();
		if (this.getAttribute('focus')) return;
		const types = typesIn(this.raw).filter(([, count]) => count >= FILTER_MIN);
		if (types.length <= this.types.size) return;
		this.filters.setAttribute('role', 'group');
		this.filters.setAttribute('aria-label', 'Show node types');
		for (const [type, count] of types) {
			const box = html('input');
			box.type = 'checkbox';
			box.checked = this.types.has(type);
			box.addEventListener('change', () => {
				if (box.checked) this.types.add(type);
				else this.types.delete(type);
				this.selected = null;
				this.compute();
				this.layout();
				this.inspect();
			});
			this.filters.append(html('label', {}, box, `${typeLabel(type)} (${count})`));
		}
	}

	// ---- layout ----

	private layout() {
		cancelAnimationFrame(this.frame);
		this.sim?.stop();
		this.pinned.clear();
		this.world.replaceChildren();
		const count = this.view.nodes.length;
		this.classList.toggle('og-small', count <= 12);
		// Start on a spiral: the same input always settles to the same picture.
		this.nodes = this.view.nodes.map((n, i) => {
			const angle = i * 2.399963;
			const radius = 14 * Math.sqrt(i + 0.5);
			return { ...n, x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
		});
		const byId = new Map(this.nodes.map((n) => [n.id, n]));
		this.links = this.view.edges.map((edge) => ({ edge, source: byId.get(edge.from)!, target: byId.get(edge.to)! }));
		this.draw();

		const crowded = count > 60;
		this.sim = forceSimulation(this.nodes)
			.force('link', forceLink<SimNode, SimLink>(this.links).distance(crowded ? 48 : count <= 20 ? 110 : 80).strength(0.6))
			.force('charge', forceManyBody().strength(crowded ? -70 : count <= 20 ? -420 : -240).distanceMax(420))
			.force('center', forceCenter(0, 0))
			.force('collide', forceCollide<SimNode>((n) => this.radius(n) + 16))
			.stop();
		// Settle before the first paint. With reduced motion this is all the movement there ever is.
		this.sim.tick(this.still.matches ? 400 : 90);
		this.paint();
		this.fit();
		if (!this.still.matches) this.run();
	}

	private radius(n: ViewNode) {
		return (n.shape === 'ring' ? 12 : 7) + (this.highlight.has(n.id) ? 4 : 0);
	}

	private draw() {
		const edges = svg('g');
		const nodes = svg('g');
		for (const l of this.links) {
			l.line = svg('line', { class: 'og-edge' });
			l.text = svg('text', { class: 'og-edge-label' });
			l.text.textContent = l.edge.label;
			edges.append(l.line, l.text);
		}
		for (const n of this.nodes) {
			const r = this.radius(n);
			const g = svg('g', { class: `og-node${this.highlight.has(n.id) ? ' og-hl' : ''}`, tabindex: 0, role: 'button', 'aria-label': `${n.label}, ${n.type}${this.highlight.has(n.id) ? ', highlighted' : ''}` });
			g.setAttribute('aria-pressed', String(n.id === this.selected));
			const halo = svg('circle', { class: 'og-halo', r: r + 5 });
			const label = svg('text', { class: 'og-label', y: r + 14 });
			label.textContent = n.label;
			g.append(halo, shapeFor(n, r), label);
			g.addEventListener('pointerdown', (e) => this.onNodeDown(e, n));
			g.addEventListener('keydown', (e) => this.onNodeKey(e, n));
			n.el = g;
			nodes.append(g);
		}
		this.world.append(edges, nodes);
	}

	/** Move every element to where the simulation has put its node. */
	private paint() {
		for (const l of this.links) {
			const s = l.source as SimNode, t = l.target as SimNode;
			l.line!.setAttribute('x1', String(s.x));
			l.line!.setAttribute('y1', String(s.y));
			l.line!.setAttribute('x2', String(t.x));
			l.line!.setAttribute('y2', String(t.y));
			l.text!.setAttribute('x', String(((s.x ?? 0) + (t.x ?? 0)) / 2));
			l.text!.setAttribute('y', String(((s.y ?? 0) + (t.y ?? 0)) / 2));
		}
		for (const n of this.nodes) n.el!.setAttribute('transform', `translate(${n.x},${n.y})`);
	}

	/** Animate until the layout cools. Never called with reduced motion. */
	private run() {
		cancelAnimationFrame(this.frame);
		const step = () => {
			this.sim!.tick();
			this.paint();
			if (this.sim!.alpha() > this.sim!.alphaMin()) this.frame = requestAnimationFrame(step);
		};
		this.frame = requestAnimationFrame(step);
	}

	// ---- view ----

	private apply() {
		this.world.setAttribute('transform', `translate(${this.zoom.x},${this.zoom.y}) scale(${this.zoom.k})`);
	}

	private resize() {
		const { width, height } = this.frameEl.getBoundingClientRect();
		if (!width || !height) return;
		this.size = { w: width, h: height };
		this.svgEl.setAttribute('viewBox', `0 0 ${width} ${height}`);
		if (this.nodes.length && !this.zoomed) this.fit();
	}

	private zoomed = false;

	/** Scale and center the whole graph in the frame. */
	private fit() {
		this.zoomed = false;
		if (!this.nodes.length) return;
		const xs = this.nodes.map((n) => n.x ?? 0), ys = this.nodes.map((n) => n.y ?? 0);
		// Labels sit below and to the sides of their nodes, so the sides need more room.
		const w = Math.max(...xs) - Math.min(...xs) + 2 * 100, h = Math.max(...ys) - Math.min(...ys) + 2 * 50;
		const k = Math.min(1.3, this.size.w / w, this.size.h / h);
		const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
		this.zoom = { k, x: this.size.w / 2 - cx * k, y: this.size.h / 2 - cy * k };
		this.apply();
	}

	private zoomAt(factor: number, px: number, py: number) {
		const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, this.zoom.k * factor));
		const f = k / this.zoom.k;
		this.zoom = { k, x: px - (px - this.zoom.x) * f, y: py - (py - this.zoom.y) * f };
		this.zoomed = true;
		this.apply();
	}

	private zoomBy(factor: number) {
		this.zoomAt(factor, this.size.w / 2, this.size.h / 2);
	}

	/** Pointer position in the SVG's own pixels. */
	private local(e: { clientX: number; clientY: number }) {
		const box = this.svgEl.getBoundingClientRect();
		return { x: e.clientX - box.left, y: e.clientY - box.top };
	}

	private onWheel(e: WheelEvent) {
		// Without this check a wheel over the graph would trap the page scroll.
		if (!this.active && !e.ctrlKey && !e.metaKey) return;
		e.preventDefault();
		const p = this.local(e);
		this.zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), p.x, p.y);
	}

	private activate() {
		this.active = true;
		if (this.touch.matches) {
			this.classList.remove('og-inert');
			this.tap!.hidden = true;
			this.done!.hidden = false;
		}
	}

	private deactivate() {
		this.active = false;
		if (this.touch.matches && this.tap) {
			this.classList.add('og-inert');
			this.tap.hidden = false;
			this.done!.hidden = true;
		}
	}

	private reset() {
		this.clear();
		this.layout();
	}

	// ---- pointers ----

	private onBackgroundDown(e: PointerEvent) {
		if (e.target !== this.svgEl && !(e.target as Element).closest('.og-edge, .og-edge-label')) return;
		this.active = true;
		const start = this.local(e);
		const from = { ...this.zoom };
		let moved = false;
		this.svgEl.classList.add('og-panning');
		this.svgEl.setPointerCapture(e.pointerId);
		const move = (m: PointerEvent) => {
			const p = this.local(m);
			if (Math.hypot(p.x - start.x, p.y - start.y) > 3) moved = true;
			this.zoom = { ...from, x: from.x + p.x - start.x, y: from.y + p.y - start.y };
			this.zoomed = true;
			this.apply();
		};
		const up = () => {
			this.svgEl.classList.remove('og-panning');
			this.svgEl.removeEventListener('pointermove', move);
			this.svgEl.removeEventListener('pointerup', up);
			this.svgEl.removeEventListener('pointercancel', up);
			if (!moved) this.clear();
		};
		this.svgEl.addEventListener('pointermove', move);
		this.svgEl.addEventListener('pointerup', up);
		this.svgEl.addEventListener('pointercancel', up);
	}

	private onNodeDown(e: PointerEvent, n: SimNode) {
		e.preventDefault();
		this.active = true;
		const start = this.local(e);
		let moved = false;
		this.svgEl.setPointerCapture(e.pointerId);
		const move = (m: PointerEvent) => {
			const p = this.local(m);
			if (!moved && Math.hypot(p.x - start.x, p.y - start.y) <= 3) return;
			if (!moved) {
				moved = true;
				if (!this.still.matches) this.sim!.alphaTarget(0.25);
			}
			n.fx = (p.x - this.zoom.x) / this.zoom.k;
			n.fy = (p.y - this.zoom.y) / this.zoom.k;
			// With reduced motion only the dragged node moves; the rest of the layout stays put.
			n.x = n.fx;
			n.y = n.fy;
			this.paint();
			if (!this.still.matches) this.run();
		};
		const up = () => {
			this.svgEl.removeEventListener('pointermove', move);
			this.svgEl.removeEventListener('pointerup', up);
			this.svgEl.removeEventListener('pointercancel', up);
			if (!this.still.matches) this.sim!.alphaTarget(0);
			if (moved) { n.fx = null; n.fy = null; } else this.select(n.id);
			n.el!.focus({ preventScroll: true });
		};
		this.svgEl.addEventListener('pointermove', move);
		this.svgEl.addEventListener('pointerup', up);
		this.svgEl.addEventListener('pointercancel', up);
	}

	private onNodeKey(e: KeyboardEvent, n: SimNode) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			this.select(n.id);
			return;
		}
		const d = ({ ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] } as Record<string, [number, number]>)[e.key];
		if (!d) return;
		e.preventDefault();
		// A nudged node stays where it was put, so the next nudge starts there.
		n.x = (n.x ?? 0) + (d[0] * NUDGE) / this.zoom.k;
		n.y = (n.y ?? 0) + (d[1] * NUDGE) / this.zoom.k;
		n.fx = n.x;
		n.fy = n.y;
		this.pinned.add(n.id);
		this.paint();
		if (!this.still.matches) {
			this.sim!.alpha(0.3);
			this.run();
		}
	}

	// ---- selection and inspector ----

	private select(id: string) {
		this.selected = id;
		this.inspect();
	}

	private clear() {
		this.selected = null;
		this.inspect();
	}

	private inspect() {
		const sel = this.selected ? this.view.nodes.find((n) => n.id === this.selected) : undefined;
		const near = sel ? neighborhood(this.view, [sel.id], 1) : new Set<string>();
		this.classList.toggle('og-has-sel', !!sel);
		for (const n of this.nodes) {
			n.el?.classList.toggle('og-sel', n.id === sel?.id);
			n.el?.classList.toggle('og-near', near.has(n.id));
			n.el?.setAttribute('aria-pressed', String(n.id === sel?.id));
		}
		for (const l of this.links) {
			const touching = !!sel && (l.edge.from === sel.id || l.edge.to === sel.id);
			l.line?.classList.toggle('og-near', touching);
			l.text?.classList.toggle('og-near', touching);
		}
		this.inspector.replaceChildren(sel ? this.describe(sel) : html('p', { className: 'og-empty', text: 'Select a node to see what it is and how it connects. With a keyboard, Tab to a node and press Enter.' }));
	}

	private describe(n: ViewNode) {
		const box = html('div', {}, html('h3', {}, n.label, ' ', html('span', { className: 'og-type', text: typeLabel(n.type) })));
		if (n.about) box.append(html('p', { text: n.about }));
		if (n.facts.length) {
			const dl = html('dl');
			for (const [k, v] of n.facts) dl.append(html('dt', { text: k }), html('dd', { text: v }));
			box.append(dl);
		}
		const links = linksOf(this.view, n.id);
		if (links.length) {
			const ul = html('ul');
			ul.setAttribute('aria-label', `Connections of ${n.label}`);
			for (const l of links) {
				const b = html('button', { text: `${l.relation} ${l.label}` });
				b.type = 'button';
				b.addEventListener('click', () => this.select(l.id));
				ul.append(html('li', {}, b));
			}
			box.append(ul);
		}
		return box;
	}
}

if (!customElements.get('okb-graph')) customElements.define('okb-graph', OkbGraph);
