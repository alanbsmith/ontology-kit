// The generated docs put explicit anchors before headings, on a line of their own, so links work
// the same on GitHub and here: `<a id="concept-class"></a>` then `## Class`. In HTML that line is
// an empty paragraph, which adds a gap and makes a link land above the heading's top margin. This
// moves those ids onto empty spans inside the heading itself and drops the paragraph.
//
// Raw HTML reaches rehype either parsed (an `a` element) or as `raw` nodes, where the markdown
// parser splits `<a id="x"></a>` into an opening and a closing tag.
const OPEN = /^<a id="([^"]+)">$/;
const idOf = (node) => {
	if (node.type === 'raw') return OPEN.exec(node.value.trim())?.[1];
	if (node.type === 'element' && node.tagName === 'a' && !node.properties?.href && node.children.length === 0) return node.properties?.id;
};
const isFiller = (node) =>
	(node.type === 'text' && !node.value.trim()) || (node.type === 'raw' && node.value.trim() === '</a>');
const isHeading = (node) => node?.type === 'element' && /^h[1-6]$/.test(node.tagName);

function visit(node) {
	const kids = node.children;
	if (!kids) return;
	for (let i = 0; i < kids.length; i++) {
		const p = kids[i];
		const ids = p.type === 'element' && p.tagName === 'p' ? p.children.map(idOf) : [];
		if (ids.some(Boolean) && p.children.every((c, k) => ids[k] || isFiller(c))) {
			let j = i + 1;
			while (j < kids.length && isFiller(kids[j])) j++;
			if (isHeading(kids[j])) {
				const spans = ids.filter(Boolean).map((id) => ({ type: 'element', tagName: 'span', properties: { id }, children: [] }));
				kids[j].children.unshift(...spans);
				kids.splice(i, 1);
				i--;
				continue;
			}
		}
		visit(p);
	}
}

export function rehypeAnchorIds() {
	return (tree) => visit(tree);
}
