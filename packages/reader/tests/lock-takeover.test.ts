/**
 * Takeover of a stale lock by several contenders (issue #142).
 *
 * The takeover calls `testSeam.at(step)` at the steps where another command could act. This test uses that to run the
 * other contenders at those exact points, nested inside the paused one, and explores every such schedule (a small
 * model checker), so no result depends on timing. Each contender that gets the lock keeps it until the schedule ends,
 * so a second holder shows up as a failed assertion at the moment it acquires.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { hostname, tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { OkbError } from "../src/errors.ts";
import { LOCK_FILE, acquireLock, testSeam } from "../src/lock.ts";

const DEAD_PID = 999_999;
const realSeam = { ...testSeam };
let dir: string;
let clock: number;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "okb-takeover-"));
  clock = Date.now();
  testSeam.now = () => clock;
  testSeam.sleep = (ms) => { clock += ms; }; // no real waiting: time moves only when a contender sleeps
});
afterEach(() => {
  Object.assign(testSeam, realSeam);
  rmSync(dir, { recursive: true, force: true });
});

const lockPath = () => join(dir, LOCK_FILE);
const writeStale = (token = "stale") =>
  writeFileSync(lockPath(), JSON.stringify({ pid: DEAD_PID, host: hostname(), token }));
const leftovers = () => readdirSync(dir).filter((f) => f.includes(".claim-") || f.includes(".stale-"));

/**
 * Run `contenders` commands against one stale lock under one schedule. `choices[i]` answers the i-th decision point: 0
 * lets the running contender go on, k > 0 first runs the k-th contender that hasn't started yet, to completion. Returns
 * how many options each decision had, so the caller can try the others.
 */
function runSchedule(contenders: number, choices: number[]): { options: number[]; holders: number[]; violations: string[] } {
  const violations: string[] = [];
  const options: number[] = [];
  const holders: number[] = [];
  const pending: number[] = Array.from({ length: contenders }, (_, i) => i);
  let decision = 0;

  const start = (id: number): void => {
    pending.splice(pending.indexOf(id), 1);
    try {
      acquireLock(dir, 60);
    } catch (e) {
      if (e instanceof OkbError) return; // timed out behind another holder: fine, safety is all that matters here
      throw e;
    }
    // Recorded, not thrown: the takeover code under test has its own try/catch around the seam.
    if (holders.length) violations.push(`contender ${id} got the lock while ${holders.join(",")} still held it`);
    holders.push(id);
  };

  testSeam.at = () => {
    const mine = pending.slice(); // what could run now
    options[decision] = mine.length + 1;
    const pick = choices[decision++] ?? 0;
    if (pick > 0) {
      const saved = clock; // the paused contender doesn't age while the others run
      start(mine[pick - 1]);
      clock = saved;
    }
  };
  // The first contender starts outside any hook; the others only ever run nested inside a hook.
  start(0);
  testSeam.at = () => {};
  return { options, holders, violations };
}

/** Depth-first over every schedule: every point where any contender could be paused, with every other one running. */
function explore(contenders: number): number {
  const work: number[][] = [[]];
  let runs = 0;
  while (work.length) {
    const path = work.pop()!;
    rmSync(dir, { recursive: true, force: true });
    dir = mkdtempSync(join(tmpdir(), "okb-takeover-"));
    clock = Date.now();
    writeStale();
    const { options, holders, violations } = runSchedule(contenders, path);
    runs++;
    assert.deepEqual(violations, [], `schedule ${JSON.stringify(path)}`);
    assert.equal(holders.length, 1, `schedule ${JSON.stringify(path)}: nobody got the lock`);
    assert.deepEqual(leftovers(), [], `schedule ${JSON.stringify(path)}: claim or stale files left behind`);
    for (let i = path.length; i < options.length; i++) {
      for (let k = 1; k < options[i]; k++) {
        work.push([...path, ...Array(i - path.length).fill(0), k]);
      }
    }
  }
  return runs;
}

describe("stale-lock takeover with several contenders", () => {
  it("never has two holders, whatever the interleaving of three commands", () => {
    const runs = explore(3);
    assert.ok(runs > 50, `explored ${runs} schedules`);
  });

  it("never has two holders with four commands, one step deep", () => {
    // Four contenders explode the full search, so only the first decision of each is varied here.
    writeStale();
    for (const step of ["judged", "claimed", "verified", "unlinked", "create"]) {
      for (const order of [[1, 2, 3], [3, 2, 1], [2, 3, 1]]) {
        rmSync(dir, { recursive: true, force: true });
        dir = mkdtempSync(join(tmpdir(), "okb-takeover-"));
        writeStale();
        const holders: number[] = [];
        const violations: string[] = [];
        let fired = false;
        const run = (id: number) => {
          try { acquireLock(dir, 60); } catch (e) { if (e instanceof OkbError) return; throw e; }
          if (holders.length) violations.push(`${step} ${order}: contender ${id} overlapped ${holders}`);
          holders.push(id);
        };
        testSeam.at = (s) => {
          if (s !== step || fired) return;
          fired = true;
          const saved = clock;
          for (const id of order) run(id);
          clock = saved;
        };
        run(0);
        testSeam.at = () => {};
        assert.deepEqual(violations, []);
        assert.equal(holders.length, 1, `${step} ${order}`);
        assert.deepEqual(leftovers(), []);
      }
    }
  });

  it("does not delete a fresh lock a rival created after the stale one was judged", () => {
    // The race from #142: B replaces the stale lock before A acts on its old reading of it.
    writeStale();
    let fresh = "";
    testSeam.at = (s) => {
      if (s !== "judged" || fresh) return;
      testSeam.at = () => {};
      writeFileSync(lockPath(), JSON.stringify({ pid: process.pid, host: hostname(), token: "fresh" }));
      fresh = "fresh";
    };
    assert.throws(() => acquireLock(dir, 60), OkbError, "the fresh lock is alive, so A waits and times out");
    assert.equal(existsSync(lockPath()), true, "the rival's lock is still there");
    assert.match(readFileSync(lockPath(), "utf8"), /fresh/);
    assert.deepEqual(leftovers(), []);
  });

  it("steps over a claim abandoned by a crashed command", () => {
    writeStale();
    const raw = JSON.stringify({ pid: DEAD_PID, host: hostname(), token: "stale" });
    const id = createHash("sha1").update(raw).digest("hex").slice(0, 16);
    writeFileSync(join(dir, `${LOCK_FILE}.claim-${id}-0`), JSON.stringify({ pid: DEAD_PID, host: hostname(), token: "crashed" }));
    const release = acquireLock(dir, 200);
    assert.deepEqual(leftovers(), [], "the dead claim is cleaned up once the stale lock is gone");
    release();
    assert.equal(existsSync(lockPath()), false);
  });

  it("waits for a claim held by a command that is still running, and leaves it alone", () => {
    writeStale();
    const raw = JSON.stringify({ pid: DEAD_PID, host: hostname(), token: "stale" });
    const id = createHash("sha1").update(raw).digest("hex").slice(0, 16);
    const claim = join(dir, `${LOCK_FILE}.claim-${id}-0`);
    writeFileSync(claim, JSON.stringify({ pid: process.pid, host: hostname(), token: "busy" }));
    assert.throws(() => acquireLock(dir, 200), OkbError);
    assert.equal(existsSync(claim), true, "a live claim is never deleted by someone else");
    assert.equal(existsSync(lockPath()), true, "and the stale lock stays until its claim holder acts");
  });

  it("takes over an old lock from another machine, once, and releases cleanly", () => {
    writeFileSync(lockPath(), JSON.stringify({ pid: 1, host: "some-other-host", token: "far" }));
    const old = new Date(clock - 11 * 60_000);
    utimesSync(lockPath(), old, old);
    const release = acquireLock(dir, 200);
    assert.deepEqual(leftovers(), []);
    release();
    assert.equal(existsSync(lockPath()), false);
  });

  it("never takes over a lock whose owner is running here, however old", () => {
    writeFileSync(lockPath(), JSON.stringify({ pid: process.pid, host: hostname(), token: "mine" }));
    const old = new Date(clock - 60 * 60_000);
    utimesSync(lockPath(), old, old);
    assert.throws(() => acquireLock(dir, 100), OkbError);
    assert.deepEqual(leftovers(), []);
  });
});
