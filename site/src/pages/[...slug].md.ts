// A `.md` version of every page in nav.ts: /learn/facets/ is also served as /learn/facets.md,
// for AI agents. The landing page (/) is left out. See ../lib/llms.ts.
import type { APIRoute } from 'astro';
import { resolve } from 'node:path';
import { loadLlms } from '../lib/llms.ts';
import { metaNodes } from '../lib/meta.ts';
import { PAGES } from '../nav.ts';

const root = resolve(process.cwd(), '..');

export function getStaticPaths() {
	return PAGES.map((page) => ({ params: { slug: page.route.replace(/^\/|\/$/g, '') }, props: { route: page.route } }));
}

export const GET: APIRoute = ({ props }) =>
	new Response(loadLlms(root, metaNodes).pages.get(props.route)!.markdown, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
