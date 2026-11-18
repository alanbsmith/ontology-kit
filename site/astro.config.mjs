// @ts-check
// Adapted from the owner's blog (~/Projects/writing/astro.config.mjs): same markdown pipeline,
// code themes and fonts, plus the docs' own link and title plugins.
import { fileURLToPath } from 'node:url';
import { defineConfig, fontProviders } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import { remarkMermaid } from './src/plugins/remark-mermaid.mjs';
import { remarkPageTitle } from './src/plugins/remark-page-title.mjs';
import { remarkRepoLinks } from './src/plugins/remark-repo-links.mjs';
import { rehypeAnchorIds } from './src/plugins/rehype-anchor-ids.mjs';
import { rehypeHeadingAnchors } from './src/plugins/rehype-heading-anchors.mjs';

/** The repo root: the docs are read from here, in place. */
const root = fileURLToPath(new URL('..', import.meta.url));

// https://astro.build/config
export default defineConfig({
	// The production domain, for canonical links. The site is served from the root: no base path.
	site: 'https://ontology-kit.dev',
	trailingSlash: 'ignore',
	markdown: {
		processor: unified({
			remarkPlugins: [remarkPageTitle, [remarkRepoLinks, { root }], remarkMermaid],
			rehypePlugins: [rehypeAnchorIds, rehypeHeadingAnchors],
		}),
		shikiConfig: {
			// Emits --shiki-light / --shiki-dark custom properties per token;
			// global.css picks between them with light-dark().
			themes: { light: 'night-owl-light', dark: 'night-owl' },
			defaultColor: false,
		},
	},
	vite: {
		// The pages and the meta-KB live outside site/.
		server: { fs: { allow: [root] } },
	},
	// Self-hosted at build time: files are downloaded, hashed, preloaded, and get
	// metric-adjusted fallbacks so text barely shifts when the real font arrives.
	fonts: [
		{
			name: 'Inter',
			cssVariable: '--font-inter',
			provider: fontProviders.fontsource(),
			weights: [400, 600, 700],
			styles: ['normal', 'italic'],
			subsets: ['latin'],
			fallbacks: ['system-ui', 'sans-serif'],
		},
		{
			name: 'Monaspace Neon',
			cssVariable: '--font-monaspace',
			provider: fontProviders.fontsource(),
			weights: [400, 700],
			styles: ['normal'],
			subsets: ['latin'],
			fallbacks: ['ui-monospace', 'monospace'],
		},
		// Reading-setting fonts. Declared but not preloaded: the browser only downloads a face
		// once a rule using it actually applies, so nobody pays for these unless they pick one.
		{
			name: 'Literata',
			cssVariable: '--font-literata',
			provider: fontProviders.fontsource(),
			weights: [400, 700],
			styles: ['normal', 'italic'],
			subsets: ['latin'],
			fallbacks: ['Georgia', 'serif'],
		},
		{
			name: 'OpenDyslexic',
			cssVariable: '--font-opendyslexic',
			provider: fontProviders.fontsource(),
			weights: [400, 700],
			styles: ['normal', 'italic'],
			subsets: ['latin'],
			fallbacks: ['system-ui', 'sans-serif'],
		},
	],
});
