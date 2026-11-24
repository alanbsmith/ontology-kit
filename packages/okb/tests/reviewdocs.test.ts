// okb docs --changed and --context (issue #133): review views for changes and for rules in source context.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";
import { Ontology, type GraphEdge, type OkbNode } from "@ontology-kit/format";
import { kbDocs } from "../src/kbdocs.ts";
import { parseMarkdown, type MdDoc } from "../src/markdown.ts";
import { changedPageSet, contextPage, diffPages, expandHops } from "../src/reviewdocs.ts";

const CLI = join(dirname(dirname(fileURLToPath(import.meta.url))), "src", "cli.ts");

const GUIDE = `# Button guide

## States

Disable a button when its action is not available.
Exception: do not disable destructive actions. Hide them, so nobody wonders why they are grey.

Buttons show a spinner while they work.

## Sizes

Buttons come in small and large.
`;

/** Drink > Latte, and an unrelated Food. A rule on Drink is inherited by Latte, not by Food. */
function fixture(rules: { statement?: string; extra?: boolean } = {}): Ontology {
  const nodes = [
    { id: "ontology", type: "Ontology", name: "Cafe", domain: "coffee", purpose: "Know the menu.", users: [], maintainers: [], outOfScope: [], kind: "application", reuseReviewed: true },
    { id: "c.drink", type: "Class", name: "Drink" },
    { id: "c.latte", type: "Class", name: "Latte" },
    { id: "c.food", type: "Class", name: "Food" },
    { id: "src.guide", type: "Source", title: "Guide", localPath: "guide.md", format: "markdown" },
    { id: "loc.a", type: "SourceLocation", quote: "Disable a button when its action is not available.", locator: "Button guide > States", lines: "5", startLine: 5, endLine: 5 },
    { id: "loc.b", type: "SourceLocation", quote: "Buttons show a spinner while they work.", locator: "Button guide > States", lines: "8", startLine: 8, endLine: 8 },
    { id: "loc.c", type: "SourceLocation", quote: "Buttons come in small and large.", locator: "Button guide > Sizes", lines: "12", startLine: 12, endLine: 12 },
    // Overreach: the quote says to disable; the line after it carves out destructive actions.
    { id: "rule.disable", type: "Rule", name: "Disable when unavailable", modality: "MUST", statement: rules.statement ?? "A Drink MUST be disabled when it is not available.", verification: { status: "OVERREACH", note: "Quote says disable; statement says always." }, _originalDraft: "Every control MUST be disabled when unavailable.", extractionConfidence: "corrected" },
    { id: "rule.spinner", type: "Rule", name: "Spinner", modality: "SHOULD", statement: "A Drink SHOULD show a spinner.", verification: { status: "SUPPORTED" } },
    { id: "rule.sizes", type: "Rule", name: "Sizes", modality: "MAY", statement: "A Food MAY come in two sizes.", verification: { status: "UNSUPPORTED" } },
    { id: "rule.loose", type: "Rule", name: "Loose", modality: "MAY", statement: "A Food MAY be free." },
    { id: "rule.zeta", type: "Rule", name: "Zeta checked", modality: "SHOULD", statement: "A Food SHOULD be fresh.", verification: { status: "SUPPORTED", note: "Fine." } },
    ...(rules.extra ? [{ id: "rule.extra", type: "Rule", name: "Extra", modality: "MAY", statement: "A Drink MAY be cold.", verification: { status: "SUPPORTED" } }] : []),
  ] as OkbNode[];
  const e = (from: string, type: string, to: string): GraphEdge => ({ from, type, to });
  const edges = [
    e("c.latte", "IS_A", "c.drink"),
    ...["loc.a", "loc.b", "loc.c"].map((l) => e(l, "PART_OF", "src.guide")),
    e("rule.disable", "GOVERNS", "c.drink"), e("rule.disable", "CITES", "loc.a"),
    e("rule.spinner", "GOVERNS", "c.drink"), e("rule.spinner", "CITES", "loc.b"),
    e("rule.sizes", "GOVERNS", "c.food"), e("rule.sizes", "CITES", "loc.c"),
    e("rule.loose", "GOVERNS", "c.food"),
    e("rule.zeta", "GOVERNS", "c.food"), e("rule.zeta", "CITES", "loc.c"),
    ...(rules.extra ? [e("rule.extra", "GOVERNS", "c.drink"), e("rule.extra", "CITES", "loc.b")] : []),
  ];
  return Ontology.fromData(nodes, edges, { name: "Cafe" });
}

const pages = (): Map<string, string[] | MdDoc | Error> => new Map([["src.guide", parseMarkdown(GUIDE)]]);

describe("the changed-only view", () => {
  it("keeps only pages whose rendered text differs", () => {
    const d = diffPages(kbDocs(fixture()), kbDocs(fixture({ statement: "A Drink MUST be greyed out when it is not available." })));
    assert.deepEqual(d.changed, ["classes/c-drink.md", "classes/c-latte.md", "rules.md"]);
    assert.deepEqual([d.added, d.removed], [[], []]);
  });

  it("a change to an inherited rule includes the subclass pages, and not an unrelated class", () => {
    const { pages: p } = changedPageSet(kbDocs(fixture()), kbDocs(fixture({ extra: true })));
    assert.ok(p.includes("classes/c-drink.md"), "the class that is governed");
    assert.ok(p.includes("classes/c-latte.md"), "its subclass shows the inherited rule");
    assert.ok(!p.includes("classes/c-food.md"), "an unrelated class is left out");
    assert.match(kbDocs(fixture({ extra: true }))["classes/c-latte.md"], /Extra\]\(\.\.\/rules\.md#rule-extra\) \(inherited from/);
  });

  it("finds nothing when nothing changed, and is deterministic", () => {
    assert.deepEqual(changedPageSet(kbDocs(fixture()), kbDocs(fixture())).pages, []);
    const a = changedPageSet(kbDocs(fixture()), kbDocs(fixture({ extra: true })), 1);
    assert.deepEqual(a, changedPageSet(kbDocs(fixture()), kbDocs(fixture({ extra: true })), 1));
  });

  it("reports pages that were added or removed", () => {
    const small = fixture();
    const bigger = Ontology.fromData([...fixture().nodes, { id: "c.tea", type: "Class", name: "Tea" } as OkbNode], [...fixture().edges], { name: "Cafe" });
    assert.deepEqual(diffPages(kbDocs(small), kbDocs(bigger)).added, ["classes/c-tea.md"]);
    assert.deepEqual(diffPages(kbDocs(bigger), kbDocs(small)).removed, ["classes/c-tea.md"]);
  });

  it("--hops adds class pages that link to or from a changed one, never through the hub pages", () => {
    const files = kbDocs(fixture());
    // Latte links to Drink (Is a), and Drink to Latte (Subclasses). Food has no links to either.
    assert.deepEqual(expandHops(files, ["classes/c-latte.md"], 0), []);
    assert.deepEqual(expandHops(files, ["classes/c-latte.md"], 1), ["classes/c-drink.md"]);
    assert.deepEqual(expandHops(files, ["classes/c-food.md"], 3), [], "the index links every class, but hubs aren't walked");
    assert.deepEqual(expandHops(files, ["rules.md"], 2), []);
  });
});

describe("the rules-in-context view", () => {
  const text = contextPage(fixture(), pages());

  it("puts problem cases first: unsupported, overreach, unverified, then the rest by name", () => {
    const order = [...text.matchAll(/^### (.+)$/gm)].map((m) => m[1]);
    assert.deepEqual(order, ["Sizes", "Disable when unavailable", "Loose", "Spinner", "Zeta checked"]);
    assert.ok(text.indexOf("## Needs a person") < text.indexOf("### Sizes"));
    assert.ok(text.indexOf("### Loose") < text.indexOf("## Everything else"));
    assert.ok(text.indexOf("## Everything else") < text.indexOf("### Spinner"));
  });

  it("shows the verdict, the note, the original draft, the quote and the lines around it", () => {
    const block = text.slice(text.indexOf("### Disable when unavailable"), text.indexOf("### Loose"));
    assert.match(block, /Needs a person: OVERREACH/);
    assert.match(block, /Verification: overreach, confidence corrected/);
    assert.match(block, /Verifier's note: Quote says disable; statement says always\./);
    assert.match(block, /Original draft, before the correction: Every control MUST/);
    assert.match(block, /> Disable a button when its action is not available\./);
    assert.match(block, /^> 5 \| Disable a button/m, "the quoted line is marked");
    assert.match(block, /^ {2}6 \| Exception: do not disable destructive actions\./m, "the line that narrows the quote is shown, unmarked");
    assert.match(block, /^ {2}3 \| ## States/m, "lines above");
  });

  it("marks a rule whose quote is gone, and one with no quote", () => {
    const gone = contextPage(fixture(), new Map([["src.guide", parseMarkdown(GUIDE.replace("Buttons show a spinner while they work.", "Spinners are optional."))]]));
    assert.match(gone.slice(gone.indexOf("### Spinner")), /Needs a person: Its quote is no longer in the source/);
    assert.match(text.slice(text.indexOf("### Loose")), /Needs a person: Not verified yet/);
  });

  it("falls back to the quote alone when the source can't be shown", () => {
    const t = contextPage(fixture(), new Map());
    assert.match(t, /The source file wasn't loaded\./);
    assert.match(t, /> Buttons come in small and large\./);
  });

  it("is deterministic and has no dates", () => {
    assert.equal(text, contextPage(fixture(), pages()));
    assert.doesNotMatch(text, /\b20\d\d-\d\d-\d\d\b/);
  });

  it("uses a fence longer than any backticks in the source", () => {
    const doc = parseMarkdown("# T\n\nUse ```` to open.\n\nUse backtick blocks.\n");
    const o = fixture();
    const loc = o.get("loc.a") as any;
    loc.quote = "Use backtick blocks.";
    loc.startLine = 5;
    const t = contextPage(o, new Map([["src.guide", doc]]));
    assert.match(t, /^`````text$/m);
  });
});

describe("okb docs --changed and --context from the command line", () => {
  let repo = "";
  let outA = "";
  let locA = "";
  let locC = "";
  const git = (...args: string[]) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", "-c", "commit.gpgsign=false", ...args], { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const okb = (...args: string[]) => spawnSync("node", [CLI, ...args], { cwd: repo, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });
  const ok = (...args: string[]) => {
    const r = okb(...args);
    assert.equal(r.status, 0, `${args.join(" ")}\n${r.stderr}${r.stdout}`);
    return r.stdout;
  };
  const files = (dir: string) => readdirSync(dir, { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith(".md")).sort();

  before(() => {
    repo = mkdtempSync(join(tmpdir(), "okb-reviewdocs-"));
    outA = mkdtempSync(join(tmpdir(), "okb-reviewdocs-out-"));
    writeFileSync(join(repo, "guide.md"), GUIDE);
    git("init", "-q", "-b", "main");
    ok("init", ".", "--name", "Cafe");
    ok("class", "add", "Drink");
    ok("class", "add", "Latte", "--parent", "Drink");
    ok("class", "add", "Food");
    ok("source", "add", "guide.md", "--id", "src.guide");
    ok("quote", "add", "src.guide", "Disable a button when its action is not available");
    ok("quote", "add", "src.guide", "Buttons come in small and large");
    const locs = readFileSync(join(repo, "nodes.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((n) => n.type === "SourceLocation");
    locA = locs.find((l) => l.quote.startsWith("Disable")).id;
    locC = locs.find((l) => l.quote.startsWith("Buttons come")).id;
    ok("rule", "add", "--statement", "A Drink MUST be disabled when it is not available.", "--modality", "MUST", "--governs", "Drink", "--cites", locA, "--name", "disable");
    ok("verify", "disable", "--status", "OVERREACH", "--corrected", "A Drink SHOULD be disabled when it is not available.", "--note", "The next line allows an exception.");
    git("add", "-A");
    git("commit", "-q", "-m", "base");
    git("tag", "v1");
  });
  after(() => {
    rmSync(repo, { recursive: true, force: true });
    rmSync(outA, { recursive: true, force: true });
  });

  it("--changed v1 writes changes.md and nothing else when nothing changed", () => {
    const out = join(outA, "none");
    ok("docs", "--out", out, "--changed", "v1");
    assert.deepEqual(files(out), ["changes.md"]);
    assert.match(readFileSync(join(out, "changes.md"), "utf8"), /No page's text changed\./);
    assert.match(readFileSync(join(out, "changes.md"), "utf8"), /Nothing: every quote is still in its source/);
  });

  it("a new rule on a parent class writes the parent, its subclass and the rules page, but not an unrelated class", () => {
    ok("rule", "add", "--statement", "A Drink MAY come in two sizes.", "--modality", "MAY", "--governs", "Drink", "--cites", locC, "--name", "sizes");
    const out = join(outA, "inherited");
    ok("docs", "--out", out, "--changed", "v1");
    const written = files(out);
    assert.ok(written.some((f) => f.startsWith("classes/") && /drink/.test(f)));
    assert.ok(written.some((f) => f.startsWith("classes/") && /latte/.test(f)), `subclass page missing: ${written}`);
    assert.ok(!written.some((f) => /food/.test(f)), "unrelated class page written");
    assert.ok(written.includes("rules.md") && written.includes("changes.md"));
    assert.ok(written.includes("index.md"), "the index shows the rule count, so it changed too");
    // Pages are byte-identical to the full render.
    const full = join(outA, "full");
    ok("docs", "--out", full);
    for (const f of written.filter((w) => w !== "changes.md")) assert.equal(readFileSync(join(out, f), "utf8"), readFileSync(join(full, f), "utf8"));
    assert.ok(!files(full).every((f) => written.includes(f)), "the full render has pages the changed view leaves out");
  });

  it("--hops adds the neighbors, and the output is the same on a second run", () => {
    const a = join(outA, "hops-a");
    const b = join(outA, "hops-b");
    ok("docs", "--out", a, "--changed", "v1", "--hops", "1");
    ok("docs", "--out", b, "--changed", "v1", "--hops", "1");
    assert.deepEqual(files(a), files(b));
    for (const f of files(a)) assert.equal(readFileSync(join(a, f), "utf8"), readFileSync(join(b, f), "utf8"));
    assert.ok(files(a).some((f) => /food/.test(f)) === false, "Food doesn't link to a changed class");
  });

  it("lists a quote whose source changed but wasn't re-synced", () => {
    writeFileSync(join(repo, "guide.md"), GUIDE.replace("Disable a button when its action is not available.", "Greyed-out buttons are unavailable."));
    const out = join(outA, "stale");
    ok("docs", "--out", out, "--changed", "v1");
    const changes = readFileSync(join(out, "changes.md"), "utf8");
    assert.match(changes, /### Quotes that are gone \(1\)/);
    assert.ok(changes.includes(`\`${locA}\` in \`src.guide\``));
    assert.match(changes, /Cited by rule disable/);
    assert.match(changes, /### Blocks to extract or re-check/);
    assert.equal(git("status", "--porcelain").includes("nodes.jsonl"), true, "the ontology files hold the new rule from the previous test; nothing else wrote them");
    writeFileSync(join(repo, "guide.md"), GUIDE);
  });

  it("--context writes rules-in-context.md with the surrounding lines", () => {
    const out = join(outA, "ctx");
    ok("docs", "--out", out, "--context");
    assert.deepEqual(files(out), ["rules-in-context.md"]);
    const t = readFileSync(join(out, "rules-in-context.md"), "utf8");
    assert.match(t, /Needs a person: OVERREACH/);
    assert.match(t, /Verifier's note: The next line allows an exception\./);
    assert.match(t, /Exception: do not disable destructive actions\./);
  });

  it("rejects flag combinations that make no sense, and an unknown ref", () => {
    const out = join(outA, "bad");
    assert.equal(okb("docs", "--out", out, "--context", "--changed", "v1").status, 2);
    assert.equal(okb("docs", "--out", out, "--hops", "1").status, 2);
    assert.equal(okb("docs", "--out", out, "--changed", "nope").status, 2);
    assert.equal(okb("docs", "--out", out, "--changed", "v1", "--hops", "x").status, 2);
    assert.equal(existsSync(out), false);
  });
});
