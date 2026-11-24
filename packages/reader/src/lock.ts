/**
 * A lock for one ontology folder, so two okb commands running at once can't lose a write (each
 * command loads the whole folder and saves it back). The lock is the file `.okb.lock`, created
 * exclusively and holding the owner's process id. Part of @ontology-kit/reader.
 */
import { randomBytes } from "node:crypto";
import { existsSync, linkSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { hostname } from "node:os";
import { join } from "node:path";
import { OkbError } from "./errors.ts";

export const LOCK_FILE = ".okb.lock";
const WAIT_MS = 10_000;
/** A lock this old is stale whatever its owner (another machine on a shared folder, a reused process id). */
const MAX_AGE_MS = 10 * 60_000;

interface Owner { pid: number; host: string; token: string }

function sleep(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** What the lock file says. `unreadable` is a read that failed for a reason other than the file being gone (EACCES, EIO). */
function readOwner(path: string): { raw: string; owner?: Owner; unreadable?: boolean } {
  try {
    const raw = readFileSync(path, "utf8");
    try {
      return { raw, owner: JSON.parse(raw) as Owner };
    } catch {
      return { raw };
    }
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "ENOENT" ? { raw: "" } : { raw: "", unreadable: true };
  }
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}

/**
 * The lock's owner is gone: a crashed command (same machine, process not running), or, when the owner can't be
 * checked (another machine on a shared folder, a lock no one can read), a lock older than ten minutes.
 * A command still running on this machine keeps its lock however long it takes.
 */
function isStale(path: string): boolean {
  const { owner, unreadable } = readOwner(path);
  if (unreadable) return false; // not knowing who holds it is no proof that nobody does
  const mine = Boolean(owner && owner.host === hostname() && Number.isInteger(owner.pid));
  if (mine) return !alive(owner!.pid);
  try {
    return Date.now() - statSync(path).mtimeMs > MAX_AGE_MS;
  } catch {
    return false; // released while we looked
  }
}

/** Whether a command holds the lock right now. */
export function isLocked(root: string): boolean {
  const path = join(root, LOCK_FILE);
  return existsSync(path) && !isStale(path);
}

/**
 * Remove the lock at `path` if it is still `seen`, the stale one that was judged. The lock is first moved aside with a
 * rename, which takes exactly one file and can't be undone by another command's create; only then is it read and, if it
 * is the stale one, deleted. If it turns out to be a newer lock, it is put back. (A command that creates a lock in the
 * instant between the move and the put-back leaves a rare, short overlap; the lock is advisory for commands that run
 * seconds apart, not a security boundary.)
 */
function removeStale(path: string, seen: string, token: string): void {
  const aside = `${path}.stale-${token}`;
  try {
    renameSync(path, aside);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return; // someone else took it away first
    throw new OkbError(`Can't remove the stale lock ${path}: ${(e as Error).message}. If no okb command is running, delete it yourself.`);
  }
  const moved = readOwner(aside);
  try {
    if (moved.unreadable || moved.raw !== seen) {
      // Not the lock we judged: a command made a fresh one in between. Put it back, unless yet another took the spot.
      try { linkSync(aside, path); } catch { /* the spot is taken again; the moved lock is already released or superseded */ }
    }
  } finally {
    try { unlinkSync(aside); } catch { /* gone */ }
  }
}

/** Wait (up to a few seconds) until no command holds the lock. Used by readers, who don't take it. */
export function waitUnlocked(root: string, ms = 2000): void {
  const path = join(root, LOCK_FILE);
  const end = Date.now() + ms;
  while (existsSync(path) && !isStale(path) && Date.now() < end) sleep(25);
}

/** Take the folder's lock, waiting briefly if another command has it. Returns the function that releases it. */
export function acquireLock(root: string, waitMs = Number(process.env.OKB_LOCK_WAIT_MS) || WAIT_MS): () => void {
  const path = join(root, LOCK_FILE);
  const token = randomBytes(8).toString("hex");
  const mine: Owner = { pid: process.pid, host: hostname(), token };
  const end = Date.now() + waitMs;
  for (;;) {
    try {
      writeFileSync(path, JSON.stringify(mine), { flag: "wx" });
      return () => {
        // Remove it only if it is still ours (it could have been judged stale and taken over).
        if (readOwner(path).owner?.token === token) {
          try { unlinkSync(path); } catch { /* already gone */ }
        }
      };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
    }
    // Read the lock before judging it, so the takeover can tell it from a fresh one that took its place.
    const seen = readOwner(path).raw;
    if (isStale(path)) {
      removeStale(path, seen, token);
      if (Date.now() < end) continue;
    }
    if (Date.now() >= end) {
      const { owner } = readOwner(path);
      throw new OkbError(
        `Another okb command${owner?.pid ? ` (process ${owner.pid})` : ""} has been writing in ${root} for more than ${Math.max(1, Math.round(waitMs / 1000))} second(s). ` +
        `Try again in a moment. If no okb command is running, delete ${path}.`,
      );
    }
    sleep(25 + Math.floor(Math.random() * 50));
  }
}
