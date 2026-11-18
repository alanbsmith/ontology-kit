import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { PAGES } from './nav.ts';

// The docs are read in place from the repo root, with no frontmatter. Each entry's id is its
// repo-relative path (`docs/METHOD.md`), which is how nav.ts names it.
const docs = defineCollection({
	loader: glob({
		pattern: PAGES.map((p) => p.source),
		base: '..',
		generateId: ({ entry }) => entry,
	}),
});

export const collections = { docs };
