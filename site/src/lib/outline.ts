/** A heading as Astro collects it from rendered markdown. */
export interface Heading {
	depth: number;
	slug: string;
	text: string;
}

/**
 * The headings an article outline lists: section and subsection headings only. The collected
 * text includes the "#" anchor link that rehype-heading-anchors appends, so it is dropped here.
 * Fewer than two entries is not worth an outline; callers check the length.
 */
export function outlineItems(headings: Heading[] = []): Heading[] {
	return headings
		.filter((h) => h.depth === 2 || h.depth === 3)
		.map((h) => ({ ...h, text: h.text.replace(/#$/, '').trim() }));
}
