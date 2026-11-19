/**
 * The docs site's pages and sidebar, in one place. Plain TypeScript with no Astro imports, so
 * `tests/site.test.ts` (run by `npm test` at the repo root) can check it against the repo.
 *
 * Each page is a markdown file read in place from the repo. Paths are relative to the repo root.
 */

export interface Page {
  /** The URL path, with leading and trailing slashes. */
  route: string;
  /** The markdown file it renders, relative to the repo root. */
  source: string;
  /** The sidebar label. The page's own title is its first `# ` heading. */
  label: string;
}

export const PAGES: readonly Page[] = [
  { route: "/getting-started/", source: "docs/getting-started/introduction.md", label: "Introduction" },
  { route: "/getting-started/installation/", source: "docs/getting-started/installation.md", label: "Installation" },
  { route: "/getting-started/tutorial/", source: "examples/wine/TRANSCRIPT.md", label: "Wine tutorial" },
  { route: "/build/methodology/", source: "docs/METHOD.md", label: "Methodology" },
  { route: "/build/from-docs/", source: "docs/EXTRACTION-PIPELINE.md", label: "From existing docs" },
  { route: "/reference/glossary/", source: "docs/GLOSSARY.md", label: "Glossary" },
  { route: "/reference/rules/", source: "docs/RULES.md", label: "Rules" },
  { route: "/reference/decisions/", source: "docs/DECISIONS.md", label: "Decision guides" },
  { route: "/reference/format/", source: "docs/FORMAT.md", label: "File format" },
  { route: "/reference/changelog/", source: "docs/CHANGELOG.md", label: "Changelog" },
  { route: "/contributing/", source: "CONTRIBUTING.md", label: "Contributing" },
  { route: "/contributing/meta-kb/", source: "meta-kb/README.md", label: "Meta-KB internals" },
  { route: "/contributing/code-review/", source: "docs/CODE-REVIEW.md", label: "Code review worklist" },
];

/** The route for a repo-relative markdown path, or undefined if it isn't a page. */
export function routeFor(source: string): string | undefined {
  return PAGES.find((p) => p.source === source)?.route;
}

/** The page at a route, or undefined. */
export function pageAt(route: string): Page | undefined {
  return PAGES.find((p) => p.route === route);
}

/** The few fields of a meta-KB node (`meta-kb/data/nodes.json`) the sidebar reads. */
export interface MetaNode {
  type: string;
  id: string;
  name?: string;
  order?: number;
}

export interface NavLink {
  label: string;
  href: string;
  children?: NavLink[];
}

export interface NavGroup {
  label: string;
  links: NavLink[];
}

/** The stable anchor `src/gendocs.ts` writes for a meta-KB id: `step.1-scope` → `step-1-scope`. */
export const anchorId = (id: string) => id.replace(/\./g, "-");

function link(route: string, children?: NavLink[]): NavLink {
  const page = pageAt(route);
  if (!page) throw new Error(`nav.ts: no page at ${route}`);
  return { label: page.label, href: route, ...(children?.length ? { children } : {}) };
}

/**
 * The sidebar, in five groups by what the reader is doing. A group with no pages yet is left out.
 * Steps and decision guides come from the meta-KB, so new ones appear without a change here.
 */
export function sidebar(nodes: readonly MetaNode[]): NavGroup[] {
  const steps = nodes
    .filter((n) => n.type === "Step")
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((s) => ({ label: `${s.order}. ${s.name}`, href: `/build/methodology/#${anchorId(s.id)}` }));
  const decisions = nodes
    .filter((n) => n.type === "Decision")
    .map((d) => ({ label: d.name ?? d.id, href: `/reference/decisions/#${anchorId(d.id)}` }));
  const groups: NavGroup[] = [
    { label: "Getting started", links: [link("/getting-started/"), link("/getting-started/installation/"), link("/getting-started/tutorial/")] },
    { label: "Learn", links: [] },
    { label: "Build", links: [link("/build/methodology/", steps), link("/build/from-docs/")] },
    {
      label: "Reference",
      links: [link("/reference/glossary/"), link("/reference/rules/"), link("/reference/decisions/", decisions), link("/reference/format/"), link("/reference/changelog/")],
    },
    { label: "Contributing", links: [link("/contributing/"), link("/contributing/meta-kb/"), link("/contributing/code-review/")] },
  ];
  return groups.filter((g) => g.links.length > 0);
}

/** Every sidebar entry in reading order: each page, then its children. Drives previous/next. */
export function sequence(nodes: readonly MetaNode[]): NavLink[] {
  return sidebar(nodes).flatMap((g) => g.links.flatMap((l) => [{ label: l.label, href: l.href }, ...(l.children ?? [])]));
}

/** The entries before and after a page in the sequence; either is undefined at the ends. */
export function neighbors(nodes: readonly MetaNode[], route: string): { prev?: NavLink; next?: NavLink } {
  const seq = sequence(nodes);
  const i = seq.findIndex((l) => l.href === route);
  return i < 0 ? {} : { prev: seq[i - 1], next: seq[i + 1] };
}
