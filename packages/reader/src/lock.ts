/**
 * A lock for one ontology folder, so two okb commands running at once can't lose a write (each
 * command loads the whole folder and saves it back). The lock is the file `.okb.lock`, created
 * exclusively and holding the owner's process id. Part of @ontology-kit/reader.
 */
import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { hostname } from "node:os";
import { join } from "node:path";
import { OkbError } from "./errors.ts";

export const LOCK_FILE = ".okb.lock";
const WAIT_MS = 10_000;
/** A lock this old is stale whatever its owner (another machine on a shared folder, a reused process id). */
const MAX_AGE_MS = 10 * 60_000;
/** How many abandoned claims on one stale lock a contender steps over before it gives up and waits. */
const MAX_CLAIMS = 20;

/**
 * Test seam (internal: not exported from the package index). `at` is called at the named steps of a takeover so a test
 * can run other contenders in between; `now` and `sleep` let it run without real waiting.
 */
export const testSeam = {
  at: (_step: string): void => {},
  now: (): number => Date.now(),
  sleep: (ms: number): void => { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); },
};

interface Owner { pid: number; host: string; token: string }

function sleep(ms: number): void {
  testSeam.sleep(ms);
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
    return testSeam.now() - statSync(path).mtimeMs > MAX_AGE_MS;
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
 * Take over the stale lock at `path`, whose contents were `seen`. Returns whether the stale lock is gone.
 *
 * A file can't be deleted "only if it is still this one": `unlink` and `rename` take whatever is at the path now. So
 * the takeover is made exclusive instead. The contender first creates, with `wx`, a claim file named after the stale
 * lock's contents (`.okb.lock.claim-<hash of seen>-<n>`). Only one contender can hold the claim for a given stale
 * lock. The holder reads the lock again and deletes it only if it still holds exactly `seen` and is still stale.
 * Nothing else can replace a stale lock in that window: a create (`wx`) fails while the file exists, a dead
 * owner can't release it, and every other contender is shut out by the claim. So the delete can never hit another
 * command's fresh lock, and no moment exists with the spot empty and a lock being put back. The holder never creates
 * the real lock here; the caller does, with the same `wx` as everyone else, so exactly one contender wins it.
 *
 * A claim can be abandoned by a crash. It is judged like a lock (owner gone, or older than ten minutes), but never
 * deleted by someone else, since that would be the same race again. A contender that finds a stale claim moves on to
 * the next number (`-1`, `-2`, ...), which only one contender can create. The winner removes its own claim and the ones
 * it superseded once the stale lock is gone, and a lock token never comes back, so a claim for it can't matter again.
 *
 * What remains: a lock judged stale by age alone (another machine on a shared folder, or an owner no one can check) has
 * an owner that may still be running. If that owner releases its lock in the instant between the check and the delete,
 * and a third command creates a new lock in that instant, the delete removes the new lock. The same goes for two
 * contenders who both judge a long-held claim stale by age. Both need an owner on another machine that was silent for
 * ten minutes and then acts within microseconds of the takeover; a plain filesystem has no compare-and-delete to close
 * that. For a command on this machine, the owner's process id decides, and the race is closed.
 */
function takeOver(path: string, seen: string, me: Owner): boolean {
  const id = createHash("sha1").update(seen).digest("hex").slice(0, 16);
  const superseded: string[] = [];
  let claim: string | undefined;
  for (let n = 0; n < MAX_CLAIMS && !claim; n++) {
    const candidate = `${path}.claim-${id}-${n}`;
    try {
      writeFileSync(candidate, JSON.stringify(me), { flag: "wx" });
      claim = candidate;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
      if (!isStale(candidate)) return false; // another contender is taking this lock over right now
      superseded.push(candidate);
    }
  }
  if (!claim) return false;
  try {
    testSeam.at("claimed");
    const now = readOwner(path);
    if (now.unreadable) return false;
    if (now.raw === seen && isStale(path)) {
      testSeam.at("verified");
      try {
        unlinkSync(path);
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "ENOENT") {
          throw new OkbError(`Can't remove the stale lock ${path}: ${(e as Error).message}. If no okb command is running, delete it yourself.`);
        }
      }
      testSeam.at("unlinked");
    } else if (existsSync(path) && now.raw === seen) {
      return false; // not stale after all
    }
    // The stale lock is gone (by us, or replaced by a newer one). Claims named after it are done.
    for (const old of superseded) try { unlinkSync(old); } catch { /* gone */ }
    return true;
  } finally {
    try { unlinkSync(claim); } catch { /* gone */ }
  }
}

/** Wait (up to a few seconds) until no command holds the lock. Used by readers, who don't take it. */
export function waitUnlocked(root: string, ms = 2000): void {
  const path = join(root, LOCK_FILE);
  const end = testSeam.now() + ms;
  while (existsSync(path) && !isStale(path) && testSeam.now() < end) sleep(25);
}

/** Take the folder's lock, waiting briefly if another command has it. Returns the function that releases it. */
export function acquireLock(root: string, waitMs = Number(process.env.OKB_LOCK_WAIT_MS) || WAIT_MS): () => void {
  const path = join(root, LOCK_FILE);
  const token = randomBytes(8).toString("hex");
  const mine: Owner = { pid: process.pid, host: hostname(), token };
  const end = testSeam.now() + waitMs;
  for (;;) {
    testSeam.at("create");
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
      testSeam.at("judged");
      if (takeOver(path, seen, mine) && testSeam.now() < end) continue;
    }
    if (testSeam.now() >= end) {
      const { owner } = readOwner(path);
      throw new OkbError(
        `Another okb command${owner?.pid ? ` (process ${owner.pid})` : ""} has been writing in ${root} for more than ${Math.max(1, Math.round(waitMs / 1000))} second(s). ` +
        `Try again in a moment. If no okb command is running, delete ${path}.`,
      );
    }
    sleep(25 + Math.floor(Math.random() * 50));
  }
}
