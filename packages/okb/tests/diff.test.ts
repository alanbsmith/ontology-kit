// okb diff (issue #15): the knowledge changes between two versions, from folders or git refs.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";
import { Ontology, type GraphEdge, type OkbNode } from "@ontology-kit/format";
import { diffMarkdown, diffOntologies, isEmpty } from "../src/diff.ts";

const PKG = dirname(dirname(fileURLToPath(import.meta.url)));
const CLI = join(PKG, "src", "cli.ts");
const WINE = join(PKG, "examples", "wine");
const FILES = ["okb.json", "nodes.jsonl", "edges.jsonl"];

type Graph = { nodes: any[]; edges: any[] };
const readLines = (f: string): any[] => readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const writeLines = (f: string, rows: any[]) => writeFileSync(f, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");

/** Copy the wine example's files into a new folder. */
function wineCopy(parent: string, name: string): string {
  const dir = join(parent, name);
  mkdirSync(dir, { recursive: true });
  for (const f of FILES) copyFileSync(join(WINE, f), join(dir, f));
  return dir;
}

/** Change a folder's nodes and edges by hand, the way a merge or an editor would. */
function edit(dir: string, fn: (g: Graph) => void): void {
  const g = { nodes: readLines(join(dir, "nodes.jsonl")), edges: readLines(join(dir, "edges.jsonl")) };
  fn(g);
  writeLines(join(dir, "nodes.jsonl"), g.nodes);
  writeLines(join(dir, "edges.jsonl"), g.edges);
}
const node = (g: Graph, id: string) => g.nodes.find((n) => n.id === id)!;

/** What the wine example gets in both copies: a source, a quote, and a rule that cites it. */
function addRule(g: Graph): void {
  g.nodes.push(
    { id: "src.guide", type: "Source", title: "Wine guide" },
    { id: "loc.guide.ab12cd", type: "SourceLocation", quote: "Serve red wine at room temperature.", lines: "3-4", startLine: 3, endLine: 4, headingPath: ["Serving"] },
    { id: "loc.guide.ef34gh", type: "SourceLocation", quote: "Chill white wine before serving.", lines: "9", startLine: 9, endLine: 9 },
    { id: "rule.serve-red", type: "Rule", name: "serve-red", modality: "SHOULD", statement: "Serve red wine at room temperature.", verification: { status: "SUPPORTED" } },
  );
  g.edges.push(
    { from: "loc.guide.ab12cd", type: "PART_OF", to: "src.guide" },
    { from: "loc.guide.ef34gh", type: "PART_OF", to: "src.guide" },
    { from: "rule.serve-red", type: "CITES", to: "loc.guide.ab12cd" },
    { from: "rule.serve-red", type: "GOVERNS", to: "c.red-wine" },
  );
}

/** The changes, as `kind|text` lines, from the structured diff. */
function summarize(d: ReturnType<typeof diffOntologies>): string[] {
  const out: string[] = [];
  for (const [type, t] of Object.entries(d.types)) {
    for (const n of t.added) out.push(`add ${type} ${n.name}`);
    for (const n of t.removed) out.push(`remove ${type} ${n.name}`);
    for (const n of t.changed) {
      if (n.renamedFrom !== undefined) out.push(`rename ${type} ${n.renamedFrom} -> ${n.name}`);
      for (const f of n.fields) if (f.field !== "name") out.push(`change ${type} ${n.name}: ${f.field}`);
      if (n.note) out.push(`note ${type} ${n.name}: ${n.note}`);
    }
  }
  for (const r of d.relationshipTypeRenames) out.push(`retype ${r.from} -> ${r.to}`);
  for (const e of d.edges.added) out.push(`link+ ${e.text}`);
  for (const e of d.edges.removed) out.push(`link- ${e.text}`);
  for (const e of d.edges.changed) out.push(`link~ ${e.text}`);
  return out.sort();
}

let work = "";
before(() => {
  work = mkdtempSync(join(tmpdir(), "okb-diff-test-"));
});
after(() => rmSync(work, { recursive: true, force: true }));

/** Every change the wine test makes, written once so the folder test and the git test agree. */
function modifyWine(g: Graph): void {
  // classes: add one (with its parent), remove one (with its edge), change a description, rename one
  g.nodes.push({ id: "c.syrah", type: "Class", name: "Syrah", description: "Dark red wine." });
  g.edges.push({ from: "c.syrah", type: "IS_A", to: "c.red-wine" });
  g.nodes = g.nodes.filter((n) => n.id !== "c.margaux");
  g.edges = g.edges.filter((e) => e.from !== "c.margaux" && e.to !== "c.margaux");
  node(g, "c.merlot").description = "Soft, plummy red wine.";
  node(g, "c.bordeaux").name = "RedBordeaux";
  // slots: allowed values, a relationship renamed (its edge type changes with it), a slot added to a class
  node(g, "s.body").allowedValues = ["light", "medium", "full", "extra-full"];
  node(g, "s.maker").name = "producer";
  node(g, "s.maker").relType = "PRODUCER";
  for (const e of g.edges) if (e.type === "MAKER") e.type = "PRODUCER";
  g.edges.push({ from: "c.red-wine", type: "HAS_SLOT", to: "s.color" });
  // instances: a value changes, one is added, a relationship value moves
  node(g, "i.sterling-vineyards-merlot-8nm0jf").values["s.body"] = "full";
  g.nodes.push({ id: "i.new-wine-aaaaaa", type: "Instance", name: "New Wine", values: {} });
  g.edges.push({ from: "i.new-wine-aaaaaa", type: "INSTANCE_OF", to: "c.merlot" });
  // relationship values: one edge property changes, one pairing is added, one removed
  node(g, "i.chateau-morgon-beaujolais-ygb1b8");
  g.edges.find((e) => e.from === "c.red-wine" && e.type === "GOES_WELL_WITH")!.strength = "good";
  g.edges.push({ from: "c.white-wine", type: "GOES_WELL_WITH", to: "c.food" });
  g.edges = g.edges.filter((e) => !(e.from === "c.white-wine" && e.to === "c.seafood"));
  // a rule: new modality, new statement, a status that was approved down; a quote moves; another disappears
  node(g, "rule.serve-red").modality = "MUST";
  node(g, "rule.serve-red").statement = "Serve red wine at 16 to 18 °C.";
  node(g, "rule.serve-red").verification = { status: "OVERREACH" };
  Object.assign(node(g, "loc.guide.ab12cd"), { lines: "5-6", startLine: 5, endLine: 6 });
  g.nodes = g.nodes.filter((n) => n.id !== "loc.guide.ef34gh");
  g.edges = g.edges.filter((e) => e.from !== "loc.guide.ef34gh");
  // stamps alone never count
  for (const n of g.nodes) if (n.id === "c.food" || n.id === "s.color") n.updatedAt = "2030-01-01T00:00:00Z";
}

const EXPECTED = [
  "add Class Syrah",
  "add Instance New Wine",
  "remove Class Margaux",
  "rename Class Bordeaux -> RedBordeaux",
  "change Class Merlot: description",
  "change Slot body: allowedValues",
  "rename Slot maker -> producer",
  "change Slot producer: relType",
  "change Instance Sterling Vineyards Merlot: values.body",
  "change Rule serve-red: modality",
  "change Rule serve-red: statement",
  "change Rule serve-red: verification.status",
  "change SourceLocation \"Serve red wine at room temperature.\" (Wine guide): lines",
  "change SourceLocation \"Serve red wine at room temperature.\" (Wine guide): startLine",
  "change SourceLocation \"Serve red wine at room temperature.\" (Wine guide): endLine",
  "note SourceLocation \"Serve red wine at room temperature.\" (Wine guide): moved",
  "remove SourceLocation \"Chill white wine before serving.\" (Wine guide)",
  "retype MAKER -> PRODUCER",
  "link+ Syrah is a RedWine",
  "link+ New Wine is an instance of Merlot",
  "link+ RedWine has slot color",
  "link+ WhiteWine —goesWellWith→ Food",
  "link- Margaux is a Medoc",
  "link- WhiteWine —goesWellWith→ Seafood",
  "link- \"Chill white wine before serving.\" (Wine guide) is part of Wine guide",
  "link~ RedWine —goesWellWith→ RedMeat",
].sort();

describe("diff of the wine example", () => {
  let a = "";
  let b = "";
  before(() => {
    a = wineCopy(work, "wine-a");
    edit(a, (g) => addRule(g));
    b = wineCopy(work, "wine-b");
    edit(b, (g) => addRule(g));
    edit(b, (g) => modifyWine(g));
  });

  it("lists every change and nothing else", () => {
    const d = diffOntologies(Ontology.load(a), Ontology.load(b));
    assert.deepEqual(summarize(d), EXPECTED);
    // Slot rename: its edges aren't listed one by one.
    assert.equal(d.relationshipTypeRenames[0].edges, 2);
    assert.equal(d.summary.stampOnly, 2);
  });

  it("is empty for identical folders, and for a node whose only change is a stamp", () => {
    assert.ok(isEmpty(diffOntologies(Ontology.load(a), Ontology.load(a))));
    const c = wineCopy(work, "wine-c");
    edit(c, (g) => addRule(g));
    edit(c, (g) => { for (const n of g.nodes) n.updatedAt = "2031-02-03T04:05:06Z"; });
    const d = diffOntologies(Ontology.load(a), Ontology.load(c));
    assert.ok(isEmpty(d));
    assert.ok(d.summary.stampOnly > 20);
    assert.match(diffMarkdown(d), /No changes to the knowledge/);
  });

  it("matches by id, so a rename is a rename and not a remove and an add", () => {
    const d = diffOntologies(Ontology.load(a), Ontology.load(b));
    const t = d.types.Class;
    assert.ok(t.changed.some((c) => c.renamedFrom === "Bordeaux" && c.name === "RedBordeaux"));
    assert.ok(!t.removed.some((c) => c.name === "Bordeaux") && !t.added.some((c) => c.name === "RedBordeaux"));
  });

  it("writes rules with statement, modality and verification side by side", () => {
    const md = diffMarkdown(diffOntologies(Ontology.load(a), Ontology.load(b), "main", "working folder"));
    assert.match(md, /^# Ontology changes: main → working folder/);
    assert.match(md, /## Rules/);
    assert.match(md, /\| statement \| "Serve red wine at room temperature\." \| "Serve red wine at 16 to 18 °C\." \|/);
    assert.match(md, /\| modality \| "SHOULD" \| "MUST" \|/);
    assert.match(md, /\| verification \| "SUPPORTED" \| "OVERREACH" \|/);
    assert.match(md, /\*\*Renamed\*\* `Bordeaux` → `RedBordeaux`/);
    assert.match(md, /`:MAKER` → `:PRODUCER`/);
    assert.match(md, /\(moved\)/);
    assert.match(md, /\(the quote disappeared\)/);
  });

  it("reads an okb-lpg/2 folder (two JSON arrays) against a /3 folder", () => {
    const legacy = join(work, "wine-legacy");
    mkdirSync(legacy);
    writeFileSync(join(legacy, "okb.json"), JSON.stringify({ format: "okb-lpg/2", name: "Wine and Food", currentStep: 8 }));
    writeFileSync(join(legacy, "nodes.json"), JSON.stringify(readLines(join(a, "nodes.jsonl"))));
    writeFileSync(join(legacy, "edges.json"), JSON.stringify(readLines(join(a, "edges.jsonl"))));
    assert.ok(isEmpty(diffOntologies(Ontology.load(legacy), Ontology.load(a))));
    assert.equal(diffOntologies(Ontology.load(legacy), Ontology.load(b)).summary.nodesAdded, 2);
  });

  it("the CLI prints Markdown, or JSON with --json, and leaves both folders alone", () => {
    const before = FILES.map((f) => readFileSync(join(b, f), "utf8"));
    const md = spawnSync("node", [CLI, "diff", a, b], { encoding: "utf8" });
    assert.equal(md.status, 0, md.stderr);
    assert.match(md.stdout, /## Classes/);
    const js = spawnSync("node", [CLI, "diff", a, "--json", "-C", b], { encoding: "utf8" });
    assert.equal(js.status, 0, js.stderr);
    assert.equal(JSON.parse(js.stdout).summary.nodesAdded, 2);
    assert.deepEqual(FILES.map((f) => readFileSync(join(b, f), "utf8")), before);
    assert.ok(!existsSync(join(b, ".okb.lock")));
  });
});

describe("diff against a git ref", () => {
  const git = (cwd: string, ...args: string[]) =>
    execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", "-c", "commit.gpgsign=false", ...args], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const okb = (cwd: string, ...args: string[]) => spawnSync("node", [CLI, ...args], { cwd, encoding: "utf8" });
  let repo = "";

  before(() => {
    repo = join(work, "repo");
    mkdirSync(repo);
    git(repo, "init", "-q", "-b", "main");
    // The ontology lives in a subfolder, to prove the path inside the repo is found.
    const kb = wineCopy(repo, "kb");
    edit(kb, (g) => addRule(g));
    git(repo, "add", "-A");
    git(repo, "commit", "-q", "-m", "base");
    git(repo, "tag", "v1");
    edit(kb, (g) => modifyWine(g)); // uncommitted: the working folder differs from main
  });

  it("`okb diff main` compares the working folder with main, without touching the working tree", () => {
    const statusBefore = git(repo, "status", "--porcelain");
    const headBefore = git(repo, "rev-parse", "HEAD");
    const r = okb(join(repo, "kb"), "diff", "main", "--json");
    assert.equal(r.status, 0, r.stderr);
    const d = JSON.parse(r.stdout);
    assert.equal(d.old, "main");
    assert.equal(d.summary.nodesAdded, 2);
    assert.deepEqual(summarize(d).filter((l) => l.startsWith("rename")), ["rename Class Bordeaux -> RedBordeaux", "rename Slot maker -> producer"]);
    assert.equal(git(repo, "status", "--porcelain"), statusBefore);
    assert.equal(git(repo, "rev-parse", "HEAD"), headBefore);
    assert.equal(git(repo, "branch", "--show-current").trim(), "main");
    assert.ok(!existsSync(join(repo, "kb", ".okb.lock")));
  });

  it("gives the same answer as comparing two folders", () => {
    const viaRef = JSON.parse(okb(repo, "diff", "v1", "--json", "-C", "kb").stdout);
    const base = Ontology.load(join(work, "wine-a"));
    const viaFolders = diffOntologies(base, Ontology.load(join(repo, "kb")));
    assert.deepEqual(summarize(viaRef), summarize(viaFolders));
  });

  it("compares two refs", () => {
    git(repo, "add", "-A");
    git(repo, "commit", "-q", "-m", "change");
    const r = okb(repo, "diff", "v1", "main", "-C", "kb");
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /# Ontology changes: v1 → main/);
    assert.match(r.stdout, /\*\*Added\*\* `Syrah`/);
    assert.equal(okb(repo, "diff", "main", "main", "-C", "kb").stdout.includes("No changes"), true);
  });

  it("refuses a name that is both a folder and a ref, and gives both spellings", () => {
    const clash = join(repo, "kb", "v1"); // a folder named like the tag v1
    mkdirSync(clash);
    try {
      let r = okb(join(repo, "kb"), "diff", "v1");
      assert.equal(r.status, 2);
      assert.match(r.stderr, /'v1' is both a folder and a git ref/);
      assert.match(r.stderr, /the folder:\s+\.\/v1/);
      assert.match(r.stderr, /the ref:\s+refs\/tags\/v1/);
      // both spellings work
      r = okb(join(repo, "kb"), "diff", "refs/tags/v1", "--json");
      assert.equal(r.status, 0, r.stderr);
      assert.equal(JSON.parse(r.stdout).old, "refs/tags/v1");
    } finally {
      rmSync(clash, { recursive: true, force: true });
    }
  });

  it("says what is wrong when the ref doesn't exist, or has no ontology there", () => {
    let r = okb(join(repo, "kb"), "diff", "no-such-branch");
    assert.equal(r.status, 2);
    assert.match(r.stderr, /isn't a folder or a git ref/);
    git(repo, "checkout", "-q", "--orphan", "bare");
    git(repo, "rm", "-rq", "--cached", ".");
    git(repo, "commit", "-q", "--allow-empty", "-m", "empty");
    git(repo, "checkout", "-q", "-f", "main");
    r = okb(join(repo, "kb"), "diff", "bare");
    assert.equal(r.status, 2);
    assert.match(r.stderr, /no ontology at bare:kb/i);
    const outside = mkdtempSync(join(tmpdir(), "okb-diff-nogit-"));
    try {
      edit(wineCopy(outside, "kb"), () => {});
      r = okb(join(outside, "kb"), "diff", "main");
      assert.equal(r.status, 2);
      assert.match(r.stderr, /isn't inside a git repository/);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });
});

describe("diff speed", () => {
  it("compares ontologies of about 5,000 nodes in well under a few seconds", () => {
    const N = 5000;
    const make = (): { nodes: OkbNode[]; edges: GraphEdge[] } => {
      const nodes: any[] = [];
      const edges: any[] = [];
      const classes = 600;
      const slots = 400;
      for (let i = 0; i < classes; i++) {
        nodes.push({ id: `c.k${i}`, type: "Class", name: `Class${i}`, description: `Class number ${i}.` });
        if (i > 0) edges.push({ from: `c.k${i}`, type: "IS_A", to: `c.k${Math.floor(i / 3)}` });
      }
      for (let i = 0; i < slots; i++) {
        nodes.push({ id: `s.k${i}`, type: "Slot", name: `slot${i}`, valueType: i % 2 ? "Instance" : "String", ...(i % 2 ? { relType: `SLOT_${i}` } : {}) });
        edges.push({ from: `c.k${i % classes}`, type: "HAS_SLOT", to: `s.k${i}` });
      }
      for (let i = 0; i < N - classes - slots; i++) {
        nodes.push({ id: `i.k${i}`, type: "Instance", name: `Thing ${i}`, values: { [`s.k${(i * 2) % slots}`]: `v${i}` } });
        edges.push({ from: `i.k${i}`, type: "INSTANCE_OF", to: `c.k${i % classes}` });
        if (i > 0) edges.push({ from: `i.k${i}`, type: `SLOT_${1 + 2 * (i % (slots / 2))}`, to: `i.k${i - 1}` });
      }
      return { nodes, edges };
    };
    const oldG = make();
    const newG = make();
    // ~5% of everything changes
    newG.nodes.forEach((n: any, i) => {
      if (i % 20 === 0) n.name = `${n.name} v2`;
      if (i % 20 === 7) n.description = "changed";
    });
    newG.nodes.splice(100, 50);
    newG.edges.splice(200, 300);
    const a = Ontology.fromData(oldG.nodes, oldG.edges);
    const b = Ontology.fromData(newG.nodes, newG.edges);
    const t0 = performance.now();
    const d = diffOntologies(a, b);
    diffMarkdown(d);
    const ms = performance.now() - t0;
    console.log(`  diff of ${a.nodes.length} nodes and ${a.edges.length} edges, about 5% changed: ${ms.toFixed(0)} ms`);
    assert.ok(d.summary.nodesChanged > 400 && d.summary.nodesRemoved === 50);
    assert.ok(ms < 2000, `took ${ms} ms`);
  });
});
