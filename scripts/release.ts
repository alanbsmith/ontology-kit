/**
 * Release helpers, used by .github/workflows/release.yml and tested in packages/okb/tests/release.test.ts.
 *
 *   node scripts/release.ts check [vX.Y.Z]   All three packages have the same version (and it matches the tag, if given),
 *                                            and docs/CHANGELOG.md has a dated entry for it.
 *   node scripts/release.ts notes <vX.Y.Z>   Prints that changelog entry (without its heading), for the release notes.
 *   node scripts/release.ts version          Prints the package version.
 *
 * Versions are read from the package.json files, so nothing here is typed by hand.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
// In publish order: okb depends on format, and the ontology-kit wrapper depends on okb.
export const PACKAGES = ["packages/format", "packages/okb", "packages/ontology-kit"];

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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [cmd, arg] = process.argv.slice(2);
  try {
    if (cmd === "check") console.log(`OK: ${check(arg)}`);
    else if (cmd === "notes") {
      if (!arg) throw new Error("Usage: release.ts notes vX.Y.Z");
      const version = arg.replace(/^v/, "");
      if (arg !== `v${version}`) throw new Error(`Expected a tag like v${version}`);
      console.log(changelogEntry(version).notes);
    } else if (cmd === "version") console.log(releaseVersion());
    else throw new Error("Usage: release.ts check [vX.Y.Z] | notes vX.Y.Z | version");
  } catch (e) {
    console.error(`::error::${(e as Error).message}`);
    process.exit(1);
  }
}
