import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { CATEGORY_NAMES, SCOPES } from "../../../scripts/conventions.ts";
import { releaseNotes } from "../../../scripts/release.ts";
import { checkPr, normalizeCategory, parseBody, parseTitle } from "../../../scripts/pr.ts";
import { categoryOf, insertEntry, renderPrs, type MergedPr } from "../../../scripts/changelog.ts";

const REPO = dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url)))));

const body = (category: string, notes: string, breaking?: string) =>
  `## Summary\n\nWhy.\n\n## Release Category\n\n<!-- pick one -->\n${category}\n\n## Release Notes\n\n${notes}\n\n${breaking === undefined ? "" : `## Breaking Changes\n\n${breaking}\n`}`;

describe("PR titles and bodies", () => {
  it("splits a conventional title", () => {
    assert.deepEqual(parseTitle("feat(reader): Add better formatting"), { type: "feat", scope: "reader", breaking: false, subject: "Add better formatting" });
    assert.equal(parseTitle("fix(okb)!: Drop a flag")?.breaking, true);
    assert.equal(parseTitle("docs: Fix a link")?.scope, undefined);
    assert.equal(parseTitle("Add better formatting"), undefined);
  });

  it("reads the sections and ignores HTML comments", () => {
    const b = parseBody(body("CLI", "Adds `okb foo`."));
    assert.equal(b.category, "CLI");
    assert.equal(b.notes, "Adds `okb foo`.");
    assert.equal(parseBody(body("CLI", "None")).notes, "", "None means no notes");
    assert.equal(parseBody("").category, undefined);
  });

  it("matches categories without regard to case", () => {
    assert.equal(normalizeCategory("documentation"), "Documentation");
    assert.equal(normalizeCategory("Docs"), undefined);
  });

  it("accepts a well-formed PR", () => {
    assert.deepEqual(checkPr({ title: "feat(reader): Add better formatting", body: body("Format", "Reads `okb-lpg/3`.") }), []);
    assert.deepEqual(checkPr({ title: "ci: Pin the actions", body: body("Infrastructure", "None") }), []);
  });

  it("flags a missing or unknown category", () => {
    assert.match(checkPr({ title: "ci: Pin", body: "## Release Notes\n\nNone" })[0], /Release Category/);
    assert.match(checkPr({ title: "ci: Pin", body: body("Misc", "None") })[0], /"Misc" is not a release category/);
    assert.match(checkPr({ title: "ci: Pin", body: body("", "None") })[0], /empty/);
  });

  it("requires release notes for feat, fix and perf", () => {
    assert.match(checkPr({ title: "fix(okb): Stop crashing", body: body("CLI", "None") })[0], /needs release notes/);
    assert.match(checkPr({ title: "feat: Add x", body: "## Release Category\n\nCLI" })[0], /Release Notes/);
    assert.deepEqual(checkPr({ title: "refactor(okb): Split a file", body: body("Infrastructure", "None") }), []);
  });

  it("ties the ! in the title to the Breaking Changes section", () => {
    assert.match(checkPr({ title: "feat(okb)!: Rename a flag", body: body("CLI", "Renamed.") })[0], /Breaking Changes/);
    assert.deepEqual(checkPr({ title: "feat(okb)!: Rename a flag", body: body("CLI", "Renamed.", "`--old` is now `--new`.") }), []);
    assert.match(checkPr({ title: "feat(okb): Rename a flag", body: body("CLI", "Renamed.", "`--old` is now `--new`.") })[0], /add a !/);
  });

  it("skips bots", () => {
    assert.deepEqual(checkPr({ title: "chore(deps): Bump x", body: "Bumps x.", author: "dependabot[bot]" }), []);
  });
});

describe("the PR template", () => {
  const template = readFileSync(join(REPO, ".github", "pull_request_template.md"), "utf8");

  it("has the sections the check reads", () => {
    for (const h of ["Release Category", "Release Notes", "Breaking Changes"]) assert.match(template, new RegExp(`^## ${h}$`, "m"));
  });

  it("lists exactly the categories in conventions.ts", () => {
    const listed = /^(CLI, [^\n]+)$/m.exec(template)?.[1].split(", ");
    assert.deepEqual(listed, [...CATEGORY_NAMES]);
  });

  it("is itself a valid starting point: its category is empty until the author fills it in", () => {
    assert.equal(parseBody(template).category, undefined);
  });
});

describe("commit scopes", () => {
  it("name every package folder", () => {
    for (const s of ["reader", "okb", "ontology-kit"]) assert.ok((SCOPES as readonly string[]).includes(s), `${s} is a scope`);
  });
});

const pr = (number: number, title: string, text: string | null, author = "alan"): MergedPr => ({ number, title, body: text, url: `https://github.com/o/r/pull/${number}`, author });

describe("changelog entries", () => {
  const prs = [
    pr(12, "docs: Explain the format", body("Documentation", "None")),
    pr(10, "feat(reader): Add better formatting", body("Format", "Formatting is now stable.\n\nSee the format reference.")),
    pr(11, "feat(okb)!: Rename a flag", body("CLI", "`--old` is now `--new`.", "Scripts that pass `--old` must change.")),
    pr(13, "chore(deps): Bump yaml", "Bumps yaml.", "dependabot[bot]"),
  ];

  it("files a PR under its category, a bot's under Dependencies, an unlabeled one under Other", () => {
    assert.equal(categoryOf(prs[0]), "Documentation");
    assert.equal(categoryOf(prs[3]), "Dependencies");
    assert.equal(categoryOf(pr(14, "fix: Old PR", "no template")), "Other");
  });

  it("groups by category in the fixed order, with breaking changes first", () => {
    const out = renderPrs(prs);
    const headings = out.split("\n").filter((l) => l.startsWith("#### "));
    assert.deepEqual(headings, ["#### Breaking changes", "#### CLI", "#### Format", "#### Documentation", "#### Dependencies"]);
    assert.match(out, /^- feat\(reader\): Add better formatting \(\[#10\]\(https:\/\/github.com\/o\/r\/pull\/10\), \[@alan\]\(https:\/\/github.com\/alan\)\)\n {2}Formatting is now stable\.\n\n {2}See the format reference\.$/m);
    assert.match(out, /#### Breaking changes\n\n- feat\(okb\)!: Rename a flag \(\[#11\]\([^)]+\)\)\n {2}Scripts that pass `--old` must change\./);
    assert.match(out, /- docs: Explain the format \(\[#12\]\([^)]+\), \[@alan\]\([^)]+\)\)\n/);
    assert.match(out, /\[@dependabot\]\(https:\/\/github.com\/dependabot\)/);
  });

  const LOG = "# Changelog\n\nIntro.\n\n## Package releases\n\n### 0.1.0 (2030-01-01)\n\nFirst.\n\n#### Added\n\n- A thing.\n\n## Changes to the meta-KB\n\n### v2.1\n\nOld.\n";

  it("adds the entry above the newest one", () => {
    const out = insertEntry(LOG, "0.2.0", "2030-02-01", "#### CLI\n\n- feat: New");
    assert.match(out, /## Package releases\n\n### 0.2.0 \(2030-02-01\)\n\n#### CLI\n\n- feat: New\n\n### 0.1.0 \(2030-01-01\)/);
    assert.ok(out.includes("## Changes to the meta-KB\n\n### v2.1"), "the meta-KB section is untouched");
  });

  it("replaces an unreleased entry, with its #### subsections", () => {
    const log = LOG.replace("### 0.1.0 (2030-01-01)", "### 0.2.0 (unreleased)\n\nDraft.\n\n#### Added\n\n- Draft thing.\n\n### 0.1.0 (2030-01-01)");
    const out = insertEntry(log, "0.2.0", "2030-02-01", "#### CLI\n\n- feat: New");
    assert.ok(!out.includes("Draft"), "the draft is gone");
    assert.match(out, /### 0.2.0 \(2030-02-01\)\n\n#### CLI\n\n- feat: New\n\n### 0.1.0/);
  });

  it("won't overwrite a dated entry", () => {
    assert.throws(() => insertEntry(LOG, "0.1.0", "2030-02-01", "x"), /already has a dated entry for 0.1.0/);
  });
});

describe("GitHub release notes", () => {
  const entry = "#### CLI\n\n- feat(okb): Add x ([#1](https://github.com/o/r/pull/1), [@a](https://github.com/a))\n\nSee [the format](FORMAT.md#versions) and [site](https://example.com).\n\n```md\n#### not a heading\n```\n";

  it("promotes the sections, absolutizes relative links, and ends with the comparison", () => {
    const out = releaseNotes(entry, { tag: "v0.2.0", repo: "o/r", previousTag: "v0.1.0" });
    assert.match(out, /^### CLI\n/);
    assert.ok(out.includes("[the format](https://github.com/o/r/blob/v0.2.0/docs/FORMAT.md#versions)"));
    assert.ok(out.includes("[site](https://example.com)"), "absolute links stay");
    assert.ok(out.includes("```md\n#### not a heading\n```"), "code blocks are left alone");
    assert.ok(out.endsWith("**Full changelog**: https://github.com/o/r/compare/v0.1.0...v0.2.0\n"));
  });

  it("works without a repository or a previous tag", () => {
    assert.equal(releaseNotes("#### CLI\n\n- x", { tag: "v0.1.0" }), "### CLI\n\n- x\n");
  });
});
