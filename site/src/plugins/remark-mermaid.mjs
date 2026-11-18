// Turns ```mermaid fences into <pre class="mermaid"> so Shiki skips them.
// The browser renders them lazily (see the script in the post page).
const escapeHtml = (s) =>
	s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function walk(node, fn) {
	if (!node.children) return;
	node.children.forEach((child, i) => {
		if (child.type === 'code' && child.lang === 'mermaid') {
			node.children[i] = fn(child);
		} else {
			walk(child, fn);
		}
	});
}

export function remarkMermaid() {
	return (tree) =>
		walk(tree, (node) => ({
			type: 'html',
			value: `<pre class="mermaid">${escapeHtml(node.value)}</pre>`,
		}));
}
