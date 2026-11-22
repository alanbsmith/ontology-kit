/**
 * A lock for one ontology folder, so two okb commands running at once can't lose a write (each
 * command loads the whole folder and saves it back). The lock is the file `.okb.lock`, created
 * exclusively and holding the owner's process id. Part of @ontology-kit/format.
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
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

function readOwner(path: string): { raw: string; owner?: Owner } {
  try {
    const raw = readFileSync(path, "utf8");
    try {
      return { raw, owner: JSON.parse(raw) as Owner };
    } catch {
      return { raw };
    }
  } catch {
    return { raw: "" };
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

/** The lock's owner is gone: a crashed command (same machine, process not running) or a lock older than ten minutes. */
function isStale(path: string): boolean {
  const { owner } = readOwner(path);
  try {
    if (Date.now() - statSync(path).mtimeMs > MAX_AGE_MS) return true;
  } catch {
    return false; // released while we looked
  }
  return Boolean(owner && owner.host === hostname() && Number.isInteger(owner.pid) && !alive(owner.pid));
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
    if (isStale(path)) {
      // Remove it only if it is still the stale one we looked at.
      const seen = readOwner(path).raw;
      if (readOwner(path).raw === seen) try { unlinkSync(path); } catch { /* someone else removed it */ }
      continue;
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
