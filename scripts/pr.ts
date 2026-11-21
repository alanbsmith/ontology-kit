/**
 * Pull request conventions: reads a PR's title and body, and checks the body's sections
 * (.github/pull_request_template.md). Used by .github/workflows/pr.yml and scripts/release-notes.ts,
 * and tested in packages/okb/tests/release-notes.test.ts.
 *
 *   node scripts/pr.ts check   Checks the PR in the GitHub event at $GITHUB_EVENT_PATH.
 *
 * The title itself is checked by commitlint (commitlint.config.js); this file only splits it.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { CATEGORY_NAMES, TYPES_NEEDING_NOTES, type Category } from "./conventions.ts";

export interface Title {
  type: string;
  scope?: string;
  breaking: boolean;
  subject: string;
}

/** Splits a Conventional Commit header, or returns undefined if it isn't one. */
export function parseTitle(title: string): Title | undefined {
  const m = /^(\w+)(?:\(([^)]+)\))?(!)?: (.+)$/.exec(title.trim());
  if (!m) return undefined;
  return { type: m[1], scope: m[2], breaking: m[3] === "!", subject: m[4] };
}

export interface Body {
  /** The text under each `## ` heading, without HTML comments, keyed by the heading. */
  sections: Map<string, string>;
  category?: string;
  notes: string;
  breaking: string;
}

const EMPTY = /^(none|n\/a|-)\.?$/i;

/** Reads the template's sections out of a PR body. Missing sections are absent from `sections`. */
export function parseBody(body: string | null | undefined): Body {
  const text = (body ?? "").replace(/\r\n/g, "\n").replace(/<!--[\s\S]*?-->/g, "");
  const sections = new Map<string, string>();
  let current: string | undefined;
  let lines: string[] = [];
  const flush = () => {
    if (current !== undefined) sections.set(current.toLowerCase(), lines.join("\n").trim());
  };
  for (const line of text.split("\n")) {
    const h = /^## +(.+?)\s*#*\s*$/.exec(line);
    if (h) {
      flush();
      current = h[1];
      lines = [];
    } else if (current !== undefined) {
      lines.push(line);
    }
  }
  flush();
  const value = (name: string) => {
    const v = sections.get(name) ?? "";
    return EMPTY.test(v) ? "" : v;
  };
  const firstLine = (sections.get("release category") ?? "").split("\n").find((l) => l.trim()) ?? "";
  const category = firstLine.replace(/^[-*]\s+/, "").replace(/[`*_]/g, "").trim() || undefined;
  return { sections, category, notes: value("release notes"), breaking: value("breaking changes") };
}

/** The category's canonical name, matched without regard to case, or undefined if it isn't one. */
export function normalizeCategory(raw: string | undefined): Category | undefined {
  if (!raw) return undefined;
  return CATEGORY_NAMES.find((c) => c.toLowerCase() === raw.toLowerCase());
}

/** Bots (Dependabot) open PRs without the template; their PRs are not checked. */
export function isBot(login: string | undefined): boolean {
  return !!login && (login.endsWith("[bot]") || login.startsWith("app/"));
}

/** What's wrong with a PR's body, as messages for the author. Empty when it's fine. */
export function checkPr(pr: { title: string; body: string | null | undefined; author?: string }): string[] {
  if (isBot(pr.author)) return [];
  const problems: string[] = [];
  const title = parseTitle(pr.title);
  const body = parseBody(pr.body);
  const choices = CATEGORY_NAMES.join(", ");

  if (!body.sections.has("release category")) {
    problems.push(`Add a "## Release Category" section with one of: ${choices}.`);
  } else if (!body.category) {
    problems.push(`The Release Category is empty. Write one of: ${choices}.`);
  } else if (!normalizeCategory(body.category)) {
    problems.push(`"${body.category}" is not a release category. Use one of: ${choices}.`);
  }

  const breaking = title?.breaking ?? false;
  if (!body.sections.has("release notes")) {
    problems.push(`Add a "## Release Notes" section. Write "None" in it if users won't notice the change.`);
  } else if (!body.notes && title && ((TYPES_NEEDING_NOTES as readonly string[]).includes(title.type) || breaking)) {
    problems.push(`A ${title.type}${breaking ? "!" : ""} PR needs release notes: say what users get and how to use it.`);
  }

  if (breaking && !body.breaking) {
    problems.push(`The title marks a breaking change (!). Add a "## Breaking Changes" section that says what breaks and how to upgrade.`);
  } else if (!breaking && body.breaking) {
    problems.push(`The Breaking Changes section isn't empty, so add a ! to the title (\`${title?.type ?? "feat"}${title?.scope ? `(${title.scope})` : ""}!: ...\`), or delete the section.`);
  }
  return problems;
}

function main(argv: string[]): number {
  if (argv[0] !== "check") {
    console.error("Usage: node scripts/pr.ts check   (reads the pull_request event at $GITHUB_EVENT_PATH)");
    return 2;
  }
  const path = process.env.GITHUB_EVENT_PATH;
  if (!path) {
    console.error("GITHUB_EVENT_PATH is not set.");
    return 2;
  }
  const event = JSON.parse(readFileSync(path, "utf8"));
  const pr = event.pull_request;
  if (!pr) {
    console.error("The event has no pull_request.");
    return 2;
  }
  const problems = checkPr({ title: pr.title, body: pr.body, author: pr.user?.login });
  for (const p of problems) console.log(`::error title=PR description::${p}`);
  if (problems.length === 0) console.log("The PR description follows the template.");
  return problems.length ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));
