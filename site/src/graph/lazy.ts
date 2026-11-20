// Loads the graph element the first time an `<okb-graph>` scrolls near the screen, the way Mermaid
// loads only on pages with a diagram. Until then the element shows its text fallback, and nothing
// else (no script, no data) has been fetched. Loaded by the base layout, so it is a few lines.
const graphs = document.querySelectorAll('okb-graph');

if (graphs.length && !customElements.get('okb-graph')) {
	const watcher = new IntersectionObserver(
		(entries) => {
			if (!entries.some((e) => e.isIntersecting)) return;
			watcher.disconnect();
			import('./okb-graph.ts');
		},
		{ rootMargin: '300px' },
	);
	graphs.forEach((g) => watcher.observe(g));
}
