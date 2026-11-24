/**
 * Writes a release's changelog entry from the pull requests merged since the previous release, grouped by
 * each PR's `## Release Category` and listed with its `## Release Notes`. The entry goes into
 * docs/CHANGELOG.md, where you read it, fix it and commit it in the release PR; the release workflow then
 * publishes that entry as the GitHub release notes. Tested in packages/okb/tests/changelog.test.ts.
 *
 *   node scripts/changelog.ts [--write] [--from <ref>] [--to <ref>] [--date YYYY-MM-DD]
 *
 * Without `--write` it prints the entry. With it, the entry for the packages' version replaces an
 * `(unreleased)` entry or is added above the newest one; an entry that already has a date is left alone.
 * `--from` defaults to the newest `v*` tag before `--to`, and `--to` to HEAD. Needs the GitHub CLI (`gh`),
 * signed in or with GH_TOKEN set.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CATEGORY_NAMES } from "./conventions.ts";
import { releaseVersion } from "./release.ts";
import { isBot, normalizeCategory, parseBody, parseTitle } from "./pr.ts";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

export interface MergedPr {
  number: number;
  title: string;
  body: string | null;
  url: string;
  author: string;
}

const OTHER = "Other";

/** Which heading a PR sits under: its category, Dependencies for bots and `deps` scopes, else Other. */
export function categoryOf(pr: MergedPr): string {
  const fromBody = normalizeCategory(parseBody(pr.body).category);
  if (fromBody) return fromBody;
  if (isBot(pr.author) || parseTitle(pr.title)?.scope === "deps") return "Dependencies";
  return OTHER;
}

const indent = (text: string) =>
  text
    .split("\n")
    .map((l) => (l.trim() ? `  ${l}` : ""))
    .join("\n");

/** `- feat(reader): Add better formatting ([#12](url), [@alan](https://github.com/alan))`, then its notes. */
function entry(pr: MergedPr): string {
  const who = pr.author.replace(/^app\//, "").replace(/\[bot\]$/, "");
  const line = `- ${pr.title} ([#${pr.number}](${pr.url}), [@${who}](https://github.com/${who}))`;
  const notes = parseBody(pr.body).notes;
  return notes ? `${line}\n${indent(notes)}` : line;
}

/** The entry's body: a Breaking changes section, then one `####` section per category, in a fixed order. */
export function renderPrs(prs: MergedPr[]): string {
  const sorted = [...prs].sort((a, b) => a.number - b.number);
  const sections: string[] = [];

  const breaking = sorted.filter((pr) => parseTitle(pr.title)?.breaking || parseBody(pr.body).breaking);
  if (breaking.length) {
    const items = breaking.map((pr) => {
      const what = parseBody(pr.body).breaking;
      const line = `- ${pr.title} ([#${pr.number}](${pr.url}))`;
      return what ? `${line}\n${indent(what)}` : line;
    });
    sections.push(`#### Breaking changes\n\n${items.join("\n")}`);
  }

  for (const heading of [...CATEGORY_NAMES, OTHER]) {
    const inCategory = sorted.filter((pr) => categoryOf(pr) === heading);
    if (inCategory.length) sections.push(`#### ${heading}\n\n${inCategory.map(entry).join("\n")}`);
  }
  return sections.join("\n\n");
}

/**
 * Puts `### version (date)` and `body` into the changelog's `## Package releases` section: in place of
 * an `(unreleased)` entry for the version, or above the newest entry. Throws if the version already has a
 * dated entry, since that one may have been edited by hand.
 */
export function insertEntry(changelog: string, version: string, date: string, body: string): string {
  const lines = changelog.split("\n");
  const section = lines.findIndex((l) => /^## Package releases\s*$/.test(l));
  if (section < 0) throw new Error('docs/CHANGELOG.md has no "## Package releases" section.');
  const isHeading = (l: string) => /^#{1,3} /.test(l);
  const next = lines.findIndex((l, i) => i > section && /^## /.test(l));
  const sectionEnd = next < 0 ? lines.length : next;

  const existing = lines.findIndex((l, i) => i > section && i < sectionEnd && l.startsWith("### ") && l.split(" ")[1] === version);
  const block = [`### ${version} (${date})`, "", ...body.split("\n"), ""];
  if (existing >= 0) {
    if (!/unreleased/i.test(lines[existing])) {
      throw new Error(`docs/CHANGELOG.md already has a dated entry for ${version}. Edit it by hand, or delete it to generate it again.`);
    }
    let end = lines.findIndex((l, i) => i > existing && isHeading(l) && !l.startsWith("####"));
    if (end < 0 || end > sectionEnd) end = sectionEnd;
    lines.splice(existing, end - existing, ...block);
  } else {
    let at = lines.findIndex((l, i) => i > section && i < sectionEnd && l.startsWith("### "));
    if (at < 0) at = sectionEnd;
    lines.splice(at, 0, ...block);
  }
  return lines.join("\n");
}

function run(cmd: string, args: string[]): string {
  return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

/** The newest `v*` tag before `to`, or undefined if there is none (the first release). */
export function previousTag(to: string): string | undefined {
  try {
    return run("git", ["describe", "--tags", "--abbrev=0", "--match", "v*", `${to}^`]) || undefined;
  } catch {
    return undefined;
  }
}

/** The pull requests merged into the first-parent history in `from..to`, found through the GitHub API. */
export function mergedPrs(from: string, to: string): MergedPr[] {
  const shas = run("git", ["log", "--first-parent", "--format=%H", `${from}..${to}`]).split("\n").filter(Boolean);
  const byNumber = new Map<number, MergedPr>();
  for (const sha of shas) {
    const found = JSON.parse(run("gh", ["api", `repos/{owner}/{repo}/commits/${sha}/pulls`])) as {
      number: number;
      title: string;
      body: string | null;
      html_url: string;
      merged_at: string | null;
      user: { login: string };
    }[];
    for (const pr of found) {
      if (!pr.merged_at) continue;
      byNumber.set(pr.number, { number: pr.number, title: pr.title, body: pr.body, url: pr.html_url, author: pr.user.login });
    }
  }
  return [...byNumber.values()];
}

function main(argv: string[]): void {
  let to = "HEAD";
  let from: string | undefined;
  let date = new Date().toISOString().slice(0, 10);
  let write = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--write") write = true;
    else if (argv[i] === "--from") from = argv[++i];
    else if (argv[i] === "--to") to = argv[++i];
    else if (argv[i] === "--date") date = argv[++i];
    else throw new Error(`Unknown argument "${argv[i]}". Usage: changelog.ts [--write] [--from <ref>] [--to <ref>] [--date YYYY-MM-DD]`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`The date must look like 2030-01-31, not "${date}".`);
  from ??= previousTag(to);
  if (!from) throw new Error("There is no earlier v* tag, so there is nothing to generate. Write the first release's entry by hand.");
  const body = renderPrs(mergedPrs(from, to));
  if (!body) throw new Error(`No pull requests were merged between ${from} and ${to}.`);

  const version = releaseVersion();
  if (!write) {
    process.stdout.write(`### ${version} (${date})\n\n${body}\n`);
    return;
  }
  const file = join(ROOT, "docs", "CHANGELOG.md");
  writeFileSync(file, insertEntry(readFileSync(file, "utf8"), version, date, body));
  console.log(`Wrote the ${version} entry to docs/CHANGELOG.md, from ${from} to ${to}. Read it, fix it, and commit it.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (e) {
    console.error(`::error::${(e as Error).message}`);
    process.exit(1);
  }
}
