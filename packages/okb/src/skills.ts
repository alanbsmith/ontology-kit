/**
 * `okb skills install` and `okb skills status`: put the skills that ship in this package where Claude
 * Code and Cursor load them from (`~/.claude/skills/`), so they always match the okb that installed them.
 * Nothing here touches an ontology, so it is not one of the `ops`.
 */
import { cpSync, lstatSync, existsSync, mkdirSync, readdirSync, readFileSync, readlinkSync, realpathSync, renameSync, rmSync, symlinkSync, type Stats } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { OkbError } from "./errors.ts";

/** The skills in this package. From src/ and from dist/ the package root is one folder up. */
export const PACKAGED_SKILLS_DIR = join(dirname(dirname(fileURLToPath(import.meta.url))), "skills");

/** Where skills go when `--dir` is not given: `$OKB_SKILLS_DIR`, else `~/.claude/skills` (Cursor reads that folder too). */
export function defaultSkillsDir(env: NodeJS.ProcessEnv = process.env): string {
  return env.OKB_SKILLS_DIR || join(homedir(), ".claude", "skills");
}

/**
 * - `current`: installed, and the version matches this okb.
 * - `stale`: an okb skill of another version (a copy, or a link into an older or different okb).
 * - `modified`: a copy at this version whose files differ from the packaged ones.
 * - `other-install`: a link to a skill folder outside this package.
 * - `broken-link`: a link to a folder that no longer exists, usually after an update moved the package.
 * - `foreign`: something that is not an okb skill; install leaves it alone unless told to `--force`.
 * - `missing`: not installed.
 */
export type SkillState = "current" | "stale" | "modified" | "other-install" | "broken-link" | "foreign" | "missing";

export interface SkillReport {
  name: string;
  path: string;
  state: SkillState;
  /** How it is installed, when it is. */
  how?: "link" | "copy";
  /** The version line of the installed skill, when it has one. */
  version?: string;
  /** Where a link points. */
  linkTo?: string;
  /** One sentence for people. */
  detail: string;
}

export interface SkillsOptions {
  dir?: string;
  /** The meta-KB version the installed skills must state. */
  metaVersion: string;
}

/** The skill's name and the version it says it is, read from its SKILL.md; undefined when there is no readable SKILL.md. */
function readSkill(dir: string): { name?: string; version?: string } | undefined {
  let text: string;
  try {
    text = readFileSync(join(dir, "SKILL.md"), "utf8");
  } catch {
    return undefined;
  }
  return { name: /^---\n(?:.*\n)*?name:\s*(\S+)/.exec(text)?.[1], version: /^\*\*Version ([^\s*]+?)\.\*\*/m.exec(text)?.[1] };
}

function files(dir: string, base = ""): string[] {
  return readdirSync(join(dir, base), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(dir, join(base, e.name)) : [join(base, e.name)])).sort();
}

function sameTree(a: string, b: string): boolean {
  const fa = files(a);
  const fb = files(b);
  return fa.length === fb.length && fa.every((f, i) => f === fb[i] && readFileSync(join(a, f)).equals(readFileSync(join(b, f))));
}

/** The names of the skills this package carries. */
export function packagedSkills(): string[] {
  if (!existsSync(PACKAGED_SKILLS_DIR)) throw new OkbError(`This okb has no skills folder (looked in ${PACKAGED_SKILLS_DIR}). Reinstall @ontology-kit/okb.`);
  return readdirSync(PACKAGED_SKILLS_DIR, { withFileTypes: true }).filter((e) => e.isDirectory() && existsSync(join(PACKAGED_SKILLS_DIR, e.name, "SKILL.md"))).map((e) => e.name).sort();
}

function lstatOrUndefined(path: string): Stats | undefined {
  try {
    return lstatSync(path);
  } catch {
    return undefined;
  }
}

function inspect(name: string, dir: string, metaVersion: string): SkillReport {
  const path = join(dir, name);
  const source = join(PACKAGED_SKILLS_DIR, name);
  const st = lstatOrUndefined(path);
  if (!st) return { name, path, state: "missing", detail: "not installed" };
  const versionNote = (v: string | undefined) => (v ? `version ${v}, this okb is ${metaVersion}` : `no version line, this okb is ${metaVersion}`);

  if (st.isSymbolicLink()) {
    const linkTo = resolve(dir, readlinkSync(path));
    if (!existsSync(path)) return { name, path, state: "broken-link", how: "link", linkTo, detail: `a link to ${linkTo}, which no longer exists (an update moved the package?)` };
    const found = readSkill(path);
    if (realpathSync(path) === realpathSync(source)) {
      const ok = found?.version === metaVersion;
      return { name, path, state: ok ? "current" : "stale", how: "link", version: found?.version, linkTo, detail: ok ? `linked to this okb, version ${metaVersion}` : `linked to this okb, but ${versionNote(found?.version)}` };
    }
    if (found?.name !== name) return { name, path, state: "foreign", how: "link", linkTo, detail: `a link to ${linkTo}, which is not the ${name} skill` };
    return { name, path, state: "other-install", how: "link", version: found.version, linkTo, detail: `linked to a different okb at ${linkTo} (${versionNote(found.version)})` };
  }

  const found = st.isDirectory() ? readSkill(path) : undefined;
  if (!found || found.name !== name || !found.version) return { name, path, state: "foreign", detail: st.isDirectory() ? "a folder that is not an okb skill" : "a file, not an okb skill folder" };
  if (found.version !== metaVersion) return { name, path, state: "stale", how: "copy", version: found.version, detail: `a copy at ${versionNote(found.version)}` };
  if (!sameTree(path, source)) return { name, path, state: "modified", how: "copy", version: found.version, detail: `a copy at version ${found.version} whose files differ from this okb's` };
  return { name, path, state: "current", how: "copy", version: found.version, detail: `a copy of this okb's skill, version ${metaVersion}` };
}

/** What is installed in the skills folder, for each skill this package carries. */
export function skillsStatus(opts: SkillsOptions): { dir: string; skills: SkillReport[] } {
  const dir = resolve(opts.dir ?? defaultSkillsDir());
  return { dir, skills: packagedSkills().map((n) => inspect(n, dir, opts.metaVersion)) };
}

export interface InstallOptions extends SkillsOptions {
  /** Copy the folders instead of linking to them. */
  copy?: boolean;
  /** Replace things that are not okb skills. */
  force?: boolean;
}

export interface InstallResult {
  dir: string;
  /** What happened to each skill, one sentence each. */
  lines: string[];
}

/** Installs the packaged skills. Checks everything first, so a refusal changes nothing. */
export function installSkills(opts: InstallOptions): InstallResult {
  const dir = resolve(opts.dir ?? defaultSkillsDir());
  const want = opts.copy ? "copy" : "link";
  const before = packagedSkills().map((n) => inspect(n, dir, opts.metaVersion));

  const refused = before.filter((r) => (r.state === "foreign" || r.state === "modified") && !opts.force);
  if (refused.length) {
    const why = refused.map((r) => `  ${r.path}: ${r.detail}`).join("\n");
    throw new OkbError(`Not installing: ${refused.length === 1 ? "this is" : "these are"} not okb's to replace.\n${why}\nNothing was changed. Move ${refused.length === 1 ? "it" : "them"} away, or run okb skills install --force to delete ${refused.length === 1 ? "it" : "them"} and put the ${want === "copy" ? "copies" : "links"} in place.`);
  }

  mkdirSync(dir, { recursive: true });
  const lines: string[] = [];
  for (const r of before) {
    const source = join(PACKAGED_SKILLS_DIR, r.name);
    if (r.state === "current" && r.how === want) {
      lines.push(`${r.name}: already ${want === "copy" ? "copied" : "linked"}, version ${opts.metaVersion}`);
      continue;
    }
    const tmp = join(dir, `.${r.name}.okb-${process.pid}`);
    rmSync(tmp, { recursive: true, force: true });
    if (want === "copy") cpSync(source, tmp, { recursive: true });
    else symlinkSync(source, tmp, "junction");
    // rm on a link removes the link, never the folder it points to.
    if (lstatOrUndefined(r.path)) rmSync(r.path, { recursive: true, force: true });
    renameSync(tmp, r.path);
    const verb = want === "copy" ? "copied" : "linked";
    const replaced: Record<SkillState, string> = {
      missing: "", current: ` (was ${r.how === "link" ? "a link" : "a copy"})`, stale: ` (replaced ${r.how === "link" ? "an old link" : `a copy at version ${r.version}`})`,
      modified: " (replaced a modified copy)", "other-install": " (replaced a link to a different okb)", "broken-link": " (replaced a broken link)", foreign: " (replaced what was there, because of --force)",
    };
    lines.push(`${r.name}: ${verb}${replaced[r.state]}`);
  }
  return { dir, lines };
}
