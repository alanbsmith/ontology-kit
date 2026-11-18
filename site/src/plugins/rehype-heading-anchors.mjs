// Gives every heading an id and appends a "#" link to it.
const HEADINGS = new Set(['h2', 'h3', 'h4', 'h5', 'h6']);

const textOf = (node) =>
	node.type === 'text' ? node.value : (node.children ?? []).map(textOf).join('');

const slugify = (text) =>
	text
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s-]/gu, '')
		.trim()
		.replace(/\s+/g, '-');

function visit(node, fn) {
	fn(node);
	(node.children ?? []).forEach((child) => visit(child, fn));
}

export function rehypeHeadingAnchors() {
	return (tree) => {
		const seen = new Map();
		visit(tree, (node) => {
			if (node.type !== 'element' || !HEADINGS.has(node.tagName)) return;
			const base = slugify(textOf(node)) || 'section';
			const count = seen.get(base) ?? 0;
			seen.set(base, count + 1);
			const id = count ? `${base}-${count}` : base;
			node.properties = { ...node.properties, id };
			node.children.push({
				type: 'element',
				tagName: 'a',
				properties: {
					className: ['anchor'],
					href: `#${id}`,
					ariaLabel: `Link to section: ${textOf(node)}`,
					// Docs addition: keep the "#" out of Pagefind's search results.
					dataPagefindIgnore: '',
				},
				children: [{ type: 'text', value: '#' }],
			});
		});
	};
}
