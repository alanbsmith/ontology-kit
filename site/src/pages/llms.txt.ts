// /llms.txt: the llmstxt.org index of every page, grouped like the sidebar. See ../lib/llms.ts.
import type { APIRoute } from 'astro';
import { resolve } from 'node:path';
import { loadLlms } from '../lib/llms.ts';
import { metaNodes } from '../lib/meta.ts';

/** The repo root: Astro runs from site/, as the content collection's `base: '..'` also assumes. */
const root = resolve(process.cwd(), '..');

export const GET: APIRoute = () =>
	new Response(loadLlms(root, metaNodes).index, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
