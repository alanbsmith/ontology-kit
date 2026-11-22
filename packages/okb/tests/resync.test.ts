// okb source refresh --all (issue #17): gone and moved quotes, and the worklist of new and changed blocks.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";
import { blockRecords, diffBlocks, hashText } from "../src/resync.ts";
import { parseMarkdown } from "../src/markdown.ts";

const CLI = join(dirname(dirname(fileURLToPath(import.meta.url))), "src", "cli.ts");

const DOC = `# Guide

## Serving

Serve red wine at room temperature, around eighteen degrees.

Chill white wine for two hours before serving.

## Storing

Store bottles on their sides in a dark place.
`;

describe("diffBlocks", () => {
  const rec = (md: string) => blockRecords(parseMarkdown(md));
  it("ignores reflowing, formatting and moving a block under another heading", () => {
    const a = rec("# T\n\n## A\n\nServe *red* wine at room temperature.\n\n## B\n\nOther text here.\n");
    const b = rec("# T\n\n## B\n\nOther text here.\n\n## C\n\nServe red wine\nat room temperature!\n");
    assert.deepEqual(diffBlocks(a, b), []);
  });
  it("pairs an edited block with its old version and calls an added one new", () => {
    const a = rec(DOC);
    const b = rec(DOC.replace("around eighteen degrees", "around sixteen degrees") + "\nNever freeze opened bottles.\n");
    const d = diffBlocks(a, b);
    assert.deepEqual(d.map((x) => x.change).sort(), ["changed", "new"]);
    assert.match(d.find((x) => x.change === "changed")!.old!.preview, /eighteen/);
  });
  it("reports a deleted block as removed", () => {
    const d = diffBlocks(rec(DOC), rec(DOC.replace("Store bottles on their sides in a dark place.\n", "")));
    assert.deepEqual(d.map((x) => x.change), ["removed"]);
  });
  it("stays fast when many blocks under one heading all change", () => {
    const block = (p: string, i: number) => ({ hash: `${p}${i}`, kind: "paragraph", headingPath: ["Top"], preview: `${p} paragraph number ${i} words here` });
    const mk = (p: string) => Array.from({ length: 800 }, (_, i) => block(p, i));
    const t = Date.now();
    assert.equal(diffBlocks(mk("a"), mk("b")).length, 800);
    assert.ok(Date.now() - t < 5000, `took ${Date.now() - t} ms`);
  });
  it("hashes the normalized text with SHA-256", () => {
    assert.equal(hashText("Serve  *red* wine."), hashText("serve red WINE"));
    assert.match(hashText("x"), /^[0-9a-f]{64}$/);
  });
});

describe("okb source refresh --all", () => {
  let work = "";
  const run = (args: string[]) => spawnSync("node", [CLI, ...args], { cwd: work, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });
  const refresh = (...extra: string[]) => {
    const r = run(["source", "refresh", "--all", "--json", ...extra]);
    return { status: r.status, report: JSON.parse(r.stdout), stderr: r.stderr };
  };
  const doc = () => join(work, "guide.md");
  const nodesFile = () => readFileSync(join(work, "nodes.jsonl"), "utf8");

  before(() => {
    work = mkdtempSync(join(tmpdir(), "okb-resync-"));
    writeFileSync(doc(), DOC);
    for (const args of [
      ["init", ".", "--name", "Wine"],
      ["source", "add", "guide.md", "--id", "src.guide"],
      ["quote", "add", "src.guide", "Serve red wine at room temperature"],
      ["quote", "add", "src.guide", "Store bottles on their sides in a dark place"],
    ]) assert.equal(run(args).status, 0, args.join(" "));
    // Two rules cite the quotes; the ids of the quotes come from the file.
    const locs = nodesFile().split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((n) => n.type === "SourceLocation");
    assert.equal(locs.length, 2);
    const by = (text: string) => locs.find((l) => l.quote.startsWith(text)).id;
    assert.equal(run(["rule", "add", "--statement", "Serve red wine at room temperature.", "--modality", "SHOULD", "--cites", by("Serve red"), "--name", "serve-red"]).status, 0);
    assert.equal(run(["rule", "add", "--statement", "Store bottles on their sides.", "--modality", "SHOULD", "--cites", by("Store bottles"), "--name", "store-sides"]).status, 0);
  });
  after(() => rmSync(work, { recursive: true, force: true }));

  it("records a baseline when a markdown source is added", () => {
    const src = nodesFile().split("\n").filter(Boolean).map((l) => JSON.parse(l)).find((n) => n.id === "src.guide");
    assert.equal(src.blocks.length, 3);
    assert.match(src.blocks[0].hash, /^[0-9a-f]{64}$/);
  });

  it("is quiet when nothing changed", () => {
    const { status, report } = refresh();
    assert.equal(status, 0);
    assert.equal(report.schema, "okb-resync/1");
    assert.deepEqual([report.ok, report.gone, report.moved, report.worklist], [true, [], [], []]);
  });

  it("a block that moved unchanged is updated but isn't on the worklist", () => {
    const before = nodesFile();
    writeFileSync(doc(), "# Guide\n\nA new intro paragraph pushes everything down.\n\n" + DOC.replace("# Guide\n\n", ""));
    // The intro is new; the two quoted blocks only moved down, so they aren't listed.
    const dry = refresh("--dry-run");
    assert.equal(dry.report.moved.length, 2);
    assert.equal(nodesFile(), before, "--dry-run writes nothing");
    assert.deepEqual(dry.report.worklist.map((w: any) => w.change), ["new"]);
    const real = refresh();
    assert.equal(real.report.moved.length, 2);
    assert.notEqual(nodesFile(), before, "moved quotes are rewritten");
    assert.equal(refresh().report.moved.length, 0);
    writeFileSync(doc(), DOC);
    refresh(); // moves them back
  });

  it("one edited paragraph and one added paragraph give exactly two worklist items", () => {
    const edited = DOC.replace("around eighteen degrees", "around sixteen degrees") + "\nNever freeze opened bottles.\n";
    writeFileSync(doc(), edited);
    const { status, report } = refresh();
    assert.equal(report.worklist.length, 2);
    const [changed, added] = report.worklist;
    assert.equal(changed.change, "changed");
    assert.deepEqual(changed.headingPath, ["Guide", "Serving"]);
    assert.match(changed.oldPreview, /eighteen/);
    assert.match(changed.preview, /sixteen/);
    assert.notEqual(changed.hash, changed.oldHash);
    assert.equal(added.change, "new");
    assert.equal(added.oldHash, null);
    assert.match(added.preview, /Never freeze/);
    assert.match(changed.id, /^src\.guide:[0-9a-f]{12}$/);
    // The quoted words are still there ("Serve red wine at room temperature"), so no quote is gone.
    assert.deepEqual(report.gone, []);
    assert.equal(status, 0);
    // Re-running without --record repeats the worklist; --record stores it as the new baseline.
    assert.equal(refresh().report.worklist.length, 2);
    assert.equal(refresh("--record").report.recorded, true);
    assert.deepEqual(refresh().report.worklist, []);
  });

  it("an edited quote is reported gone with the rule that cites it, and exits non-zero", () => {
    writeFileSync(doc(), readFileSync(doc(), "utf8").replace("Serve red wine at room temperature", "Serve red wine slightly cool"));
    const before = nodesFile();
    const { status, report } = refresh();
    assert.equal(status, 1);
    assert.equal(report.ok, false);
    assert.equal(report.gone.length, 1);
    assert.match(report.gone[0].text, /room temperature/);
    assert.deepEqual(report.gone[0].citedBy.map((c: any) => [c.type, c.label]), [["Rule", "serve-red"]]);
    assert.equal(report.worklist.length, 1);
    assert.equal(report.worklist[0].change, "changed");
    assert.equal(nodesFile(), before, "a quote that can't be found is not modified");
    const human = run(["source", "refresh", "--all"]);
    assert.equal(human.status, 1);
    assert.match(human.stdout, /gone/);
    assert.match(human.stdout, /Rule serve-red/);
  });

  it("a deleted block with a citing rule is reported gone and removed", () => {
    writeFileSync(doc(), readFileSync(doc(), "utf8").replace(/## Storing[\s\S]*?place\.\n/, ""));
    const { status, report } = refresh();
    assert.equal(status, 1);
    assert.ok(report.gone.some((g: any) => g.citedBy.some((c: any) => c.label === "store-sides")));
    assert.ok(report.worklist.some((w: any) => w.change === "removed" && /Store bottles/.test(w.oldPreview)));
    assert.equal(report.worklist.find((w: any) => w.change === "removed").lines, null);
  });

  it("--strict also fails on a non-empty worklist", () => {
    writeFileSync(doc(), DOC);
    assert.equal(refresh().status, 0);
    writeFileSync(doc(), DOC + "\nOne more paragraph.\n");
    assert.equal(refresh().status, 0);
    assert.equal(refresh("--strict").status, 1);
  });

  it("takes no lock for a read-only run, and works on a KB without baseline hashes", () => {
    writeFileSync(doc(), DOC);
    const lines = nodesFile().split("\n").filter(Boolean).map((l) => JSON.parse(l));
    for (const n of lines) if (n.type === "Source") delete n.blocks;
    writeFileSync(join(work, "nodes.jsonl"), lines.map((n) => JSON.stringify(n)).join("\n") + "\n");
    const { status, report } = refresh();
    assert.equal(status, 0);
    assert.deepEqual(report.worklist, []);
    assert.equal(report.sources[0].baseline, false);
    assert.match(run(["source", "refresh", "--all"]).stdout, /No baseline hashes yet for src\.guide/);
    assert.ok(!existsSync(join(work, ".okb.lock")), "no lock file left behind");
    assert.equal(refresh("--record").report.recorded, true);
    assert.equal(refresh().report.sources[0].baseline, true);
  });
});
