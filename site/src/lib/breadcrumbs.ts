/**
 * The breadcrumb trail above a page's title, derived from the nav data in `../nav.ts`. Plain
 * TypeScript with no Astro imports, so `tests/breadcrumbs.test.ts` can run it.
 *
 * Two kinds of page sit in a series and get a trail: the Learn course (`LEARN_CHAPTERS`) and the
 * tutorials (a `0-intro.md` page with its steps below its route). Everything else gets none. To
 * give another group a trail, add a `case` to `breadcrumbs()`.
 */
import { LEARN_CHAPTERS, LEARN_OVERVIEW, PAGES, pageAt, type Page } from "../nav.ts";

/** One crumb. The last crumb of a trail is the page itself and has no `href`. */
export interface Crumb {
  label: string;
  href?: string;
}

const LEARN: Crumb = { label: "Learn", href: LEARN_OVERVIEW };
const GETTING_STARTED: Crumb = { label: "Getting started", href: "/getting-started/" };

/** A tutorial's intro page is its generated `0-intro.md`; the steps live below its route. */
const isTutorialIntro = (p: Page) => /^examples\/[^/]+\/tutorial\/0-intro\.md$/.test(p.source);

/** "Tutorial: Wine ontology" → "Wine ontology tutorial". */
const tutorialName = (p: Page) => `${p.label.replace(/^Tutorial:\s*/, "")} tutorial`;

/** The trail for a route (with its leading and trailing slashes), or `[]` when the page has none. */
export function breadcrumbs(route: string): Crumb[] {
  const page = pageAt(route);
  if (!page) return [];

  // Learn: Learn › chapter › page. An opener is Learn › chapter; the overview has no trail.
  if (route.startsWith("/learn/")) {
    if (route === LEARN_OVERVIEW) return [];
    for (const chapter of LEARN_CHAPTERS) {
      const name = (chapter.route && pageAt(chapter.route)?.label) || chapter.title;
      if (chapter.route === route) return [LEARN, { label: name }];
      if (chapter.pages.includes(route)) {
        return [LEARN, chapter.route ? { label: name, href: chapter.route } : { label: name }, { label: page.label }];
      }
    }
    return [LEARN, { label: page.label }];
  }

  // Tutorials: Getting started › tutorial › step. The intro is Getting started › tutorial.
  const intro = PAGES.find((p) => isTutorialIntro(p) && route.startsWith(p.route));
  if (intro) {
    if (intro.route === route) return [GETTING_STARTED, { label: tutorialName(intro) }];
    return [GETTING_STARTED, { label: tutorialName(intro), href: intro.route }, { label: page.label }];
  }

  return [];
}
