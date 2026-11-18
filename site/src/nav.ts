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
  { route: "/", source: "README.md", label: "Home" },
  { route: "/examples/wine/", source: "examples/wine/TRANSCRIPT.md", label: "Wine walkthrough" },
  { route: "/method/", source: "docs/METHOD.md", label: "Overview" },
  { route: "/glossary/", source: "docs/GLOSSARY.md", label: "Glossary" },
  { route: "/rules/", source: "docs/RULES.md", label: "Rules" },
  { route: "/decisions/", source: "docs/DECISIONS.md", label: "Decision guides" },
  { route: "/format/", source: "docs/FORMAT.md", label: "File format" },
  { route: "/extraction-pipeline/", source: "docs/EXTRACTION-PIPELINE.md", label: "Extraction pipeline" },
  { route: "/meta-kb/", source: "meta-kb/README.md", label: "Meta-KB" },
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
 * The sidebar. Steps and decision guides come from the meta-KB, so new ones appear without a
 * change here.
 */
export function sidebar(nodes: readonly MetaNode[]): NavGroup[] {
  const steps = nodes
    .filter((n) => n.type === "Step")
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((s) => ({ label: `${s.order}. ${s.name}`, href: `/method/#${anchorId(s.id)}` }));
  const decisions = nodes
    .filter((n) => n.type === "Decision")
    .map((d) => ({ label: d.name ?? d.id, href: `/decisions/#${anchorId(d.id)}` }));
  return [
    { label: "Start", links: [link("/"), link("/examples/wine/")] },
    { label: "The method", links: [link("/method/"), ...steps] },
    {
      label: "Reference",
      links: [link("/glossary/"), link("/rules/"), link("/decisions/", decisions), link("/format/"), link("/extraction-pipeline/"), link("/meta-kb/")],
    },
    { label: "Contributing", links: [link("/contributing/code-review/")] },
  ];
}
