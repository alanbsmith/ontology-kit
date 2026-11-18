// Rewrites the docs' relative links, which are written for GitHub, to work on the site:
//   - a markdown page in nav.ts      -> its route, keeping the #fragment
//   - any other path in the repo     -> the file (blob) or folder (tree) on GitHub
// A relative link to a markdown file that has no route fails the build, so no doc is unreachable.
import { existsSync, statSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { routeFor } from '../nav.ts';

const GITHUB = 'https://github.com/alanbsmith/ontology-kit';
const EXTERNAL = /^([a-z][a-z0-9+.-]*:|\/\/|#|\/)/i;

function visit(node, fn) {
	fn(node);
	(node.children ?? []).forEach((child) => visit(child, fn));
}

/** @param {{ root: string }} options  The repo root, as an absolute path. */
export function remarkRepoLinks({ root }) {
	return (tree, file) => {
		const from = file.path ?? file.history?.[0];
		if (!from) return;
		const source = relative(root, from).split(sep).join('/');
		visit(tree, (node) => {
			if ((node.type !== 'link' && node.type !== 'definition') || EXTERNAL.test(node.url)) return;
			const [path, fragment] = node.url.split('#', 2);
			const hash = fragment === undefined ? '' : `#${fragment}`;
			const abs = resolve(dirname(from), decodeURI(path));
			const target = relative(root, abs).split(sep).join('/');
			if (target.startsWith('..')) throw new Error(`${source}: link "${node.url}" points outside the repo.`);
			if (/\.md$/i.test(target)) {
				const route = routeFor(target);
				if (!route) {
					throw new Error(`${source}: link "${node.url}" goes to ${target}, which has no route. Add it to site/src/nav.ts.`);
				}
				node.url = route + hash;
				return;
			}
			const kind = existsSync(abs) && statSync(abs).isDirectory() ? 'tree' : 'blob';
			node.url = `${GITHUB}/${kind}/main/${target}${hash}`;
		});
	};
}
