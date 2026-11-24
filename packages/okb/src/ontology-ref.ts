/**
 * Load an ontology from a folder or from a git ref (`main`, `HEAD~3`, a tag, a sha) without touching
 * the working tree: the ref's okb files are read with `git show` into a temp folder, loaded, and deleted.
 * Read-only: it never takes the write lock.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { OkbError, Ontology, findRoot, MANIFEST } from "@ontology-kit/format";

const FILES = [MANIFEST, "nodes.jsonl", "edges.jsonl", "nodes.json", "edges.json"];

function git(cwd: string, args: string[]): string {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 30 });
  } catch (e) {
    const err = e as { stderr?: string; code?: string };
    if (err.code === "ENOENT") throw new OkbError("okb diff with a git ref needs git, and it isn't installed.");
    throw new OkbError(`git ${args[0]} failed: ${(err.stderr ?? String(e)).trim()}`);
  }
}

/** Where the working ontology sits inside its git repository, and the repository's top folder. */
export function locateInRepo(folder: string): { top: string; path: string } {
  const root = findRoot(folder);
  if (!root) throw new OkbError(`No ontology found in ${resolve(folder)} or its parents, so there is nothing to read from a git ref. Run okb diff from an ontology folder, or pass -C <folder>.`);
  let top: string;
  try {
    top = git(root, ["rev-parse", "--show-toplevel"]).trim();
  } catch {
    throw new OkbError(`${root} isn't inside a git repository, so '${folder}' can't be read as a git ref. Give two folders instead.`);
  }
  // realpath-safe: compare through git's own view of the folder
  const prefix = git(root, ["rev-parse", "--show-prefix"]).trim().replace(/\/$/, "");
  return { top, path: prefix || relative(top, root) || "." };
}

/** Load the ontology as it was at `ref`. `where` is from `locateInRepo`. */
export function loadAtRef(ref: string, where: { top: string; path: string }): Ontology {
  if (ref.startsWith("-")) throw new OkbError(`'${ref}' isn't a folder or a git ref.`);
  try {
    git(where.top, ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]);
  } catch {
    throw new OkbError(`'${ref}' isn't a folder or a git ref in ${where.top}.`);
  }
  const at = where.path === "." ? "" : where.path + "/";
  const tmp = mkdtempSync(join(tmpdir(), "okb-diff-"));
  try {
    let found = false;
    for (const f of FILES) {
      const spec = `${ref}:${at}${f}`;
      try {
        git(where.top, ["cat-file", "-e", spec]);
      } catch {
        continue;
      }
      const body = execFileSync("git", ["show", spec], { cwd: where.top, maxBuffer: 1 << 30, stdio: ["ignore", "pipe", "pipe"] });
      mkdirSync(dirname(join(tmp, f)), { recursive: true });
      writeFileSync(join(tmp, f), body);
      if (f === MANIFEST) found = true;
    }
    if (!found) throw new OkbError(`There is no ontology at ${ref}:${at || "."} (no ${MANIFEST} there). Check the ref, or pass the folder it was in.`);
    return Ontology.load(tmp);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/** The unambiguous spelling of a ref (`refs/heads/main`, `refs/tags/v1`, or the full sha), or null if `name` isn't a ref there. */
function fullRef(top: string, name: string): string | null {
  if (name.startsWith("-")) return null;
  try {
    const sha = git(top, ["rev-parse", "--verify", "--quiet", `${name}^{commit}`]).trim();
    return git(top, ["rev-parse", "--symbolic-full-name", name]).trim().split("\n")[0] || sha;
  } catch {
    return null;
  }
}

/**
 * Resolve one side of `okb diff`: an existing folder is read as it is; anything else is a git ref,
 * looked up in the repository around `context` (the working ontology folder). A name that is both
 * (like `git diff`'s "both revision and filename") is an error that gives both spellings.
 */
export function loadSide(arg: string, context: string): { ont: Ontology; name: string } {
  if (existsSync(arg) && statSync(arg).isDirectory()) {
    let ref: string | null = null;
    try {
      ref = fullRef(locateInRepo(context).top, arg);
    } catch {
      // not in a repository (or no ontology around `context`): it can only be the folder
    }
    if (ref) {
      const folder = isAbsolute(arg) || arg.startsWith("./") || arg.startsWith("../") ? arg : `./${arg}`;
      throw new OkbError(`'${arg}' is both a folder and a git ref. Say which you mean:\n  the folder:  ${folder}\n  the ref:     ${ref}`);
    }
    return { ont: Ontology.load(arg), name: arg };
  }
  return { ont: loadAtRef(arg, locateInRepo(context)), name: arg };
}
