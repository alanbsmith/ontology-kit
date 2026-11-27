/**
 * Release helpers, used by .github/workflows/release.yml and tested in packages/okb/tests/release.test.ts.
 *
 *   node scripts/release.ts check [vX.Y.Z]   All three packages have the same version (and it matches the tag, if given),
 *                                            and docs/CHANGELOG.md has a dated entry for it.
 *   node scripts/release.ts notes <vX.Y.Z>   Prints the GitHub release notes: that changelog entry, formatted for a release page.
 *   node scripts/release.ts version          Prints the package version.
 *   node scripts/release.ts alpha-version    Prints the alpha version for HEAD: the next minor after the newest stable tag, plus
 *                                            `-alpha.N`, N being the commits since that tag. Nothing is written.
 *   node scripts/release.ts set-version X    Writes X into the three package.json files (the alpha pack job does this, uncommitted).
 *
 * Versions are read from the package.json files, so nothing here is typed by hand.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, posix } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
// In publish order: okb depends on format, and the ontology-kit wrapper depends on okb.
export const PACKAGES = ["packages/reader", "packages/okb", "packages/ontology-kit"];

const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

export function packageVersions(root = ROOT): Record<string, string> {
  const out: Record<string, string> = {};
  for (const dir of PACKAGES) {
    const pkg = JSON.parse(readFileSync(join(root, dir, "package.json"), "utf8"));
    out[pkg.name] = pkg.version;
  }
  return out;
}

/** The release's version: every package's, which must agree. Throws if they don't. */
export function releaseVersion(root = ROOT): string {
  const versions = packageVersions(root);
  const distinct = [...new Set(Object.values(versions))];
  if (distinct.length !== 1) {
    throw new Error(`The packages must share one version, but they have: ${Object.entries(versions).map(([n, v]) => `${n} ${v}`).join(", ")}`);
  }
  if (!SEMVER.test(distinct[0])) throw new Error(`"${distinct[0]}" is not a semver version`);
  return distinct[0];
}

/** The changelog entry for `version`: the text under its `### <version>` heading, and the heading line. */
export function changelogEntry(version: string, root = ROOT): { heading: string; notes: string } {
  const lines = readFileSync(join(root, "docs", "CHANGELOG.md"), "utf8").split("\n");
  const start = lines.findIndex((l) => l.startsWith("### ") && l.split(" ")[1] === version);
  if (start < 0) throw new Error(`docs/CHANGELOG.md has no "### ${version}" entry. Add one before tagging.`);
  let end = lines.findIndex((l, i) => i > start && /^#{1,3} /.test(l));
  if (end < 0) end = lines.length;
  const notes = lines.slice(start + 1, end).join("\n").trim();
  if (!notes) throw new Error(`The "### ${version}" entry in docs/CHANGELOG.md is empty.`);
  return { heading: lines[start], notes };
}

/**
 * The changelog entry as a GitHub release page shows it: the `####` sections become `###` (the release's own
 * title is the page heading), links relative to docs/ point at the files in the repository at that tag (a release page
 * has no folder to resolve them from), and a link to the full comparison with the previous release ends it.
 */
export function releaseNotes(notes: string, opts: { tag: string; repo?: string; previousTag?: string }): string {
  const { tag, repo, previousTag } = opts;
  let fenced = false;
  const lines = notes.split("\n").map((line) => {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    if (fenced) return line;
    if (line.startsWith("#### ")) return line.slice(1);
    if (!repo) return line;
    return line.replace(/\]\(((?!https?:|#|mailto:)[^)\s]+)\)/g, (_m, target: string) => {
      const [path, anchor] = target.split("#");
      const file = posix.normalize(posix.join("docs", path));
      return `](https://github.com/${repo}/blob/${tag}/${file}${anchor ? `#${anchor}` : ""})`;
    });
  });
  const out = lines.join("\n").trim();
  return repo && previousTag ? `${out}\n\n**Full changelog**: https://github.com/${repo}/compare/${previousTag}...${tag}\n` : `${out}\n`;
}

/** The newest stable `v*` tag before `tag` (alpha tags don't count), or undefined if there is none or the tags aren't fetched. */
function previousTagOf(tag: string): string | undefined {
  try {
    return execFileSync("git", ["describe", "--tags", "--abbrev=0", "--match", "v*", "--exclude", "v*-*", `${tag}^`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || undefined;
  } catch {
    return undefined;
  }
}

/** Throws unless the tag, the packages and the changelog agree. Returns the version. */
export function check(tag?: string, root = ROOT): string {
  const version = releaseVersion(root);
  if (tag !== undefined && tag !== `v${version}`) {
    throw new Error(`The tag is ${tag}, but the packages are at version ${version} (expected v${version}).`);
  }
  const { heading } = changelogEntry(version, root);
  if (/unreleased/i.test(heading)) throw new Error(`The changelog entry is still marked unreleased: "${heading}". Put the release date in its heading.`);
  return version;
}

/** `0.2.0` -> `0.3.0`: alphas are builds of the next minor. (Before 1.0 a minor is where breaking changes go.) */
export function nextMinor(version: string): string {
  const m = /^(\d+)\.(\d+)\.\d+$/.exec(version);
  if (!m) throw new Error(`"${version}" is not a stable X.Y.Z version`);
  return `${m[1]}.${Number(m[2]) + 1}.0`;
}

/**
 * The version an alpha build of HEAD publishes as, computed at publish time and never committed (a forward merge of a
 * stable release commit would conflict in the three package.json files if it were): the next minor after the newest
 * stable tag reachable from HEAD, then `-alpha.N`, N being the commits since that tag. It only grows while the branch
 * grows, and it sorts below the stable release it leads up to.
 */
export function alphaVersion(cwd = ROOT): string {
  const git = (args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  let tag: string;
  try {
    tag = git(["describe", "--tags", "--abbrev=0", "--match", "v*", "--exclude", "v*-*", "HEAD"]);
  } catch {
    throw new Error("No stable v* tag is reachable from HEAD, so there is no base for an alpha version. Fetch the tags (fetch-depth: 0).");
  }
  return `${nextMinor(tag.slice(1))}-alpha.${git(["rev-list", "--count", `${tag}..HEAD`])}`;
}

/** Writes `version` into every package's package.json, keeping each file's formatting. */
export function setVersion(version: string, root = ROOT): void {
  if (!SEMVER.test(version)) throw new Error(`"${version}" is not a semver version`);
  for (const dir of PACKAGES) {
    const file = join(root, dir, "package.json");
    const text = readFileSync(file, "utf8");
    const next = text.replace(/^(\s*"version":\s*)"[^"]*"/m, `$1"${version}"`);
    if (next === text && JSON.parse(text).version !== version) throw new Error(`Could not find the version in ${dir}/package.json`);
    writeFileSync(file, next);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [cmd, arg] = process.argv.slice(2);
  try {
    if (cmd === "check") console.log(`OK: ${check(arg)}`);
    else if (cmd === "notes") {
      if (!arg) throw new Error("Usage: release.ts notes vX.Y.Z");
      const version = arg.replace(/^v/, "");
      if (arg !== `v${version}`) throw new Error(`Expected a tag like v${version}`);
      process.stdout.write(releaseNotes(changelogEntry(version).notes, { tag: arg, repo: process.env.GITHUB_REPOSITORY, previousTag: previousTagOf(arg) }));
    } else if (cmd === "version") console.log(releaseVersion());
    else if (cmd === "alpha-version") {
      releaseVersion(); // the three packages must still agree
      console.log(alphaVersion());
    } else if (cmd === "set-version") {
      if (!arg) throw new Error("Usage: release.ts set-version X.Y.Z");
      setVersion(arg);
      console.log(`OK: ${releaseVersion()}`);
    } else throw new Error("Usage: release.ts check [vX.Y.Z] | notes vX.Y.Z | version | alpha-version | set-version X.Y.Z");
  } catch (e) {
    console.error(`::error::${(e as Error).message}`);
    process.exit(1);
  }
}
