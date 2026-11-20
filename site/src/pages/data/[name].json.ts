// The graphs the `<okb-graph>` element loads, written as static JSON at build time. The names and
// the files behind them are in ../../graph/data.ts.
import type { APIRoute } from 'astro';
import { resolve } from 'node:path';
import { graphNames, loadGraph } from '../../graph/data.ts';

/** The repo root: Astro runs from site/, as the content collection's `base: '..'` also assumes. */
const root = resolve(process.cwd(), '..');

export function getStaticPaths() {
	return graphNames(root).map((name) => ({ params: { name } }));
}

export const GET: APIRoute = ({ params }) =>
	new Response(JSON.stringify(loadGraph(root, params.name!)), { headers: { 'Content-Type': 'application/json' } });
