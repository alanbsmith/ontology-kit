// The docs have no frontmatter: a page's title is its first `# ` heading. This takes that heading
// out of the body (the layout renders the title itself) and hands its text to the page as
// `remarkPluginFrontmatter.title`.
const textOf = (node) => (node.type === 'text' || node.type === 'inlineCode' ? node.value : (node.children ?? []).map(textOf).join(''));

export function remarkPageTitle() {
	return (tree, file) => {
		const i = tree.children.findIndex((n) => n.type === 'heading' && n.depth === 1);
		if (i === -1) return;
		const [h1] = tree.children.splice(i, 1);
		file.data.astro ??= {};
		file.data.astro.frontmatter ??= {};
		file.data.astro.frontmatter.title = textOf(h1);
	};
}
