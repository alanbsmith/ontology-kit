// A file layout that merges cleanly in git, a lock for concurrent commands, and the post-merge check (issue #92, okb-lpg/3).
import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { hostname, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { Ontology, OkbError, type OkbNode } from "@ontology-kit/format";
import { runChecks } from "../src/checks.ts";

const CLI = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "cli.ts");
const tmp = (p: string) => mkdtempSync(join(tmpdir(), p));

function okb(dir: string, args: string[], env: Record<string, string> = {}) {
  const r = spawnSync(process.execPath, [CLI, "-C", dir, ...args], { encoding: "utf8", env: { ...process.env, ...env } });
  return { code: r.status, out: r.stdout + r.stderr };
}
const must = (dir: string, args: string[]) => {
  const r = okb(dir, args);
  assert.equal(r.code, 0, `okb ${args.join(" ")}\n${r.out}`);
  return r.out;
};
const git = (dir: string, ...args: string[]) =>
  execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", "-c", "commit.gpgsign=false", ...args], { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const lines = (path: string) => readFileSync(path, "utf8").split("\n").filter(Boolean);

function newOntology(): string {
  const dir = join(tmp("okb-team-"), "kb");
  const r = spawnSync(process.execPath, [CLI, "init", dir, "--name", "Team"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  return dir;
}

describe("the okb-lpg/3 layout", () => {
  it("saves one sorted node and one sorted edge per line, keys in a fixed order, and keeps unknown keys", () => {
    const dir = newOntology();
    must(dir, ["class", "add", "Wine", "--desc", "A drink"]);
    must(dir, ["class", "add", "Beer"]);
    must(dir, ["class", "add", "Ale", "--parent", "Beer"]);
    // A key okb doesn't know (a later version's field) passes through, in sorted position.
    const nodes = join(dir, "nodes.jsonl");
    writeFileSync(nodes, readFileSync(nodes, "utf8").replace('"id":"c.ale"', '"id":"c.ale","zzz":{"b":1,"a":2}'));
    must(dir, ["class", "add", "Cider"]);
    const text = lines(nodes);
    const ids = text.map((l) => JSON.parse(l).id as string);
    assert.deepEqual(ids, [...ids].sort(), "sorted by id");
    assert.ok(text.every((l) => l.startsWith('{"id":"') && /^\{"id":"[^"]+","type":"/.test(l)), "id then type first");
    const ale = text.find((l) => l.includes('"c.ale"'))!;
    assert.match(ale, /"zzz":\{"a":2,"b":1\}/, "unknown key kept, its keys sorted");
    assert.ok(lines(join(dir, "edges.jsonl")).every((l) => /^\{"from":"[^"]+","type":"[^"]+","to":"/.test(l)));
    assert.ok(!existsSync(join(dir, "nodes.json")), "the old files are gone");
    assert.equal(readFileSync(join(dir, ".gitignore"), "utf8").includes(".okb.lock"), true, "init keeps the lock file out of git");
  });

  it("sorts ids by number, so cq.2 comes before cq.10", () => {
    const o = Ontology.fromData([
      { type: "Ontology", id: "ontology", name: "T" }, { type: "CompetencyQuestion", id: "cq.10", text: "b?" }, { type: "CompetencyQuestion", id: "cq.2", text: "a?" },
    ] as OkbNode[], []);
    const dir = tmp("okb-sort-");
    writeFileSync(join(dir, "okb.json"), "{}");
    o.root = dir;
    o.save();
    assert.deepEqual(lines(join(dir, "nodes.jsonl")).map((l) => JSON.parse(l).id), ["cq.2", "cq.10", "ontology"]);
  });

  it("loads an old two-array folder and saves it in the new layout", () => {
    const dir = tmp("okb-old-");
    writeFileSync(join(dir, "okb.json"), JSON.stringify({ format: "okb-lpg/2", currentStep: 2 }));
    writeFileSync(join(dir, "nodes.json"), JSON.stringify([{ type: "Ontology", id: "ontology", name: "Old" }, { type: "Class", id: "c.a", name: "A" }], null, 2));
    writeFileSync(join(dir, "edges.json"), "[]");
    must(dir, ["class", "add", "B"]);
    assert.ok(existsSync(join(dir, "nodes.jsonl")) && !existsSync(join(dir, "nodes.json")) && !existsSync(join(dir, "edges.json")));
    assert.deepEqual(lines(join(dir, "nodes.jsonl")).map((l) => JSON.parse(l).id), ["c.a", "c.b", "ontology"]);
  });

  it("refuses unresolved conflict markers and a folder with both layouts, in words", () => {
    const dir = newOntology();
    const nodes = join(dir, "nodes.jsonl");
    const good = readFileSync(nodes, "utf8");
    writeFileSync(nodes, `<<<<<<< HEAD\n${good}=======\n${good}>>>>>>> other\n`);
    assert.throws(() => Ontology.load(dir), (e) => e instanceof OkbError && /merge conflict marker/.test(e.message));
    writeFileSync(nodes, good + "{not json\n");
    assert.throws(() => Ontology.load(dir), /line 2 isn't valid JSON/);
    writeFileSync(nodes, good);
    writeFileSync(join(dir, "nodes.json"), "[]");
    assert.throws(() => Ontology.load(dir), /Both nodes.jsonl and nodes.json exist/);
  });
});

describe("git merge", () => {
  it("merges a class on one branch and instances on another without a conflict, and the result validates", () => {
    const dir = newOntology();
    const repo = dirname(dir);
    must(dir, ["convention", "--class-case", "PascalCase"]);
    must(dir, ["class", "add", "Wine"]);
    must(dir, ["class", "add", "Grape"]);
    must(dir, ["slot", "add", "color", "--on", "Wine", "--type", "string"]);
    git(repo, "init", "-q", "-b", "main");
    git(repo, "add", "-A");
    git(repo, "commit", "-qm", "base");
    git(repo, "checkout", "-qb", "classes");
    must(dir, ["class", "add", "Region", "--desc", "Where it grows"]);
    must(dir, ["class", "add", "Producer"]);
    git(repo, "commit", "-qam", "classes");
    git(repo, "checkout", "-q", "main");
    git(repo, "checkout", "-qb", "instances");
    must(dir, ["instance", "add", "Margaux", "--of", "Wine", "color=red"]);
    must(dir, ["instance", "add", "Merlot", "--of", "Grape"]);
    must(dir, ["cq", "add", "Which wines are red?"]);
    git(repo, "commit", "-qam", "instances");
    git(repo, "checkout", "-q", "main");
    git(repo, "merge", "-q", "--no-edit", "classes");
    git(repo, "merge", "-q", "--no-edit", "instances"); // throws on a conflict
    const ont = Ontology.load(dir);
    assert.ok(ont.find("Region", "Class") && ont.find("Producer", "Class") && ont.find("Margaux", "Instance") && ont.find("Merlot", "Instance"));
    assert.equal(ont.ofType("CompetencyQuestion").length, 1);
    const errors = runChecks(ont).findings.filter((f) => f.severity === "error");
    assert.deepEqual(errors, []);
    assert.equal(okb(dir, ["validate"]).code, 0);
  });

  it("a branch that deletes a class while another adds an instance of it leaves a dangling edge that validate blames on the merge", () => {
    const dir = newOntology();
    const repo = dirname(dir);
    must(dir, ["class", "add", "Wine"]);
    must(dir, ["class", "add", "Grape"]);
    git(repo, "init", "-q", "-b", "main");
    git(repo, "add", "-A");
    git(repo, "commit", "-qm", "base");
    git(repo, "checkout", "-qb", "delete");
    must(dir, ["remove", "Grape"]);
    git(repo, "commit", "-qam", "delete");
    git(repo, "checkout", "-q", "main");
    must(dir, ["instance", "add", "Merlot", "--of", "Grape"]);
    git(repo, "commit", "-qam", "instance");
    git(repo, "merge", "-q", "--no-edit", "delete");
    const r = okb(dir, ["validate"]);
    assert.notEqual(r.code, 0);
    assert.match(r.out, /doesn't exist/);
    assert.match(r.out, /git merge/);
  });

  it("two branches that each add the same node line leave a duplicate id that validate blames on the merge", () => {
    const dir = newOntology();
    must(dir, ["class", "add", "Wine"]);
    const nodes = join(dir, "nodes.jsonl");
    const wine = lines(nodes).find((l) => l.includes('"c.wine"'))!;
    writeFileSync(nodes, readFileSync(nodes, "utf8") + wine.replace('"Wine"', '"Wine2"') + "\n");
    const r = okb(dir, ["validate"]);
    assert.notEqual(r.code, 0);
    assert.match(r.out, /share the id 'c.wine'.*git merge/s);
  });
});

describe("the lock", () => {
  it("never loses a write when many okb commands run at once on one folder", async () => {
    const dir = newOntology();
    const n = 12;
    const runs = Array.from({ length: n }, (_, i) => new Promise<{ code: number | null; out: string }>((res) => {
      const child = spawn(process.execPath, [CLI, "-C", dir, "class", "add", `Thing${i}`], { stdio: ["ignore", "pipe", "pipe"] });
      let out = "";
      child.stdout.on("data", (d) => (out += d));
      child.stderr.on("data", (d) => (out += d));
      child.on("close", (code) => res({ code, out }));
    }));
    const results = await Promise.all(runs);
    for (const r of results) assert.equal(r.code, 0, r.out);
    const ont = Ontology.load(dir);
    for (let i = 0; i < n; i++) assert.ok(ont.find(`Thing${i}`, "Class"), `Thing${i} survived`);
    assert.ok(!existsSync(join(dir, ".okb.lock")), "the lock is released");
  });

  it("takes over the lock of a command that crashed", () => {
    const dir = newOntology();
    const dead = spawnSync(process.execPath, ["-e", "process.stdout.write(String(process.pid))"], { encoding: "utf8" }).stdout;
    writeFileSync(join(dir, ".okb.lock"), JSON.stringify({ pid: Number(dead), host: hostname(), token: "x" }));
    must(dir, ["class", "add", "Wine"]);
    assert.ok(!existsSync(join(dir, ".okb.lock")));
  });

  it("fails with a clear error when a running command holds the lock for too long, and changes nothing", () => {
    const dir = newOntology();
    writeFileSync(join(dir, ".okb.lock"), JSON.stringify({ pid: process.pid, host: hostname(), token: "x" }));
    const before = readFileSync(join(dir, "nodes.jsonl"), "utf8");
    const r = okb(dir, ["class", "add", "Wine"], { OKB_LOCK_WAIT_MS: "300" });
    assert.notEqual(r.code, 0);
    assert.match(r.out, /Another okb command \(process \d+\) has been writing/);
    assert.match(r.out, /delete .*\.okb\.lock/);
    assert.equal(readFileSync(join(dir, "nodes.jsonl"), "utf8"), before);
    assert.ok(existsSync(join(dir, ".okb.lock")), "a lock that isn't ours stays");
  });
});

describe("short numbers follow creation order, not file order", () => {
  it("keeps earlier numbers when more questions are added, even though the file is sorted by id", () => {
    const dir = newOntology();
    const names = ["Alpha", "Bravo", "Charlie", "Delta", "Echo"];
    const order = () => (JSON.parse(okb(dir, ["cq", "list", "--json"]).out) as { text: string }[]).map((q) => q.text);
    // Stamps have one-second resolution; spread the adds across seconds the way a person would.
    const days = ["2026-01-01T00:00:01Z", "2026-01-01T00:00:02Z", "2026-01-01T00:00:03Z", "2026-01-01T00:00:04Z", "2026-01-01T00:00:05Z"];
    let before: string[] = [];
    names.forEach((n, i) => {
      must(dir, ["cq", "add", `${n}?`]);
      // Pin the stamp of the question just added (tests can't wait a real second per add).
      const f = join(dir, "nodes.jsonl");
      const ls = lines(f).map((l) => {
        const o = JSON.parse(l);
        return o.type === "CompetencyQuestion" && o.text === `${n}?` ? JSON.stringify({ ...o, createdAt: days[i] }) : l;
      });
      writeFileSync(f, ls.join("\n") + "\n");
      const now = order();
      assert.deepEqual(now.slice(0, before.length), before, "earlier numbers don't move");
      before = now;
    });
    assert.deepEqual(order(), names.map((n) => `${n}?`));
    const ont = Ontology.load(dir);
    assert.equal(ont.find("2", "CompetencyQuestion").text, "Bravo?");
    assert.equal(ont.displayNumber(ont.find("5", "CompetencyQuestion")), 5);
  });

  it("numbers legacy cq.2 and cq.10 in number order, before stamped questions, and an exact legacy id still works", () => {
    const dir = tmp("okb-legacy-");
    writeFileSync(join(dir, "okb.json"), JSON.stringify({ format: "okb-lpg/2", currentStep: 2 }));
    writeFileSync(join(dir, "nodes.json"), JSON.stringify([
      { type: "Ontology", id: "ontology", name: "L" },
      { type: "CompetencyQuestion", id: "cq.10", text: "Ten?" },
      { type: "CompetencyQuestion", id: "cq.2", text: "Two?" },
      { type: "CompetencyQuestion", id: "cq.zzzzzz", text: "New?", createdAt: "2026-02-01T00:00:00Z" },
    ]));
    const ont = Ontology.load(dir);
    assert.deepEqual(ont.numbered("CompetencyQuestion").map((q) => q.id), ["cq.2", "cq.10", "cq.zzzzzz"]);
    assert.equal(ont.find("2", "CompetencyQuestion").id, "cq.2", "the exact legacy id answers to its number");
    assert.equal(ont.displayNumber(ont.find("cq.10", "CompetencyQuestion")), 2);
    ont.save();
    assert.deepEqual(Ontology.load(dir).numbered("CompetencyQuestion").map((q) => q.id), ["cq.2", "cq.10", "cq.zzzzzz"], "a save doesn't renumber");
  });
});
