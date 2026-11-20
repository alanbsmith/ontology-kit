// /llms-full.txt: every page's markdown in one file, in sidebar order. See ../lib/llms.ts.
import type { APIRoute } from 'astro';
import { resolve } from 'node:path';
import { loadLlms } from '../lib/llms.ts';
import { metaNodes } from '../lib/meta.ts';

const root = resolve(process.cwd(), '..');

export const GET: APIRoute = () =>
	new Response(loadLlms(root, metaNodes).full, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
