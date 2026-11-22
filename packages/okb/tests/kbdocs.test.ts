import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { Ontology, type GraphEdge, type OkbNode } from "@ontology-kit/format";
import { BANNER, kbDocs, writePages, type DocFiles } from "../src/kbdocs.ts";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const FOLDERS = ["wine", "espresso"];

/** A small ontology with a hierarchy, slots, an inherited rule with a quote, an instance and a decision. */
function fixture(): Ontology {
  const nodes = [
    { id: "ontology", type: "Ontology", name: "Cafe", domain: "coffee", purpose: "Know the menu.", users: ["baristas"], maintainers: [], outOfScope: [], kind: "application", reuseReviewed: true },
    { id: "cq.a", type: "CompetencyQuestion", text: "What is in a latte?" },
    { id: "c.drink", type: "Class", name: "Drink", description: "Something you order." },
    { id: "c.latte", type: "Class", name: "Latte" },
    { id: "s.size", type: "Slot", name: "size", valueType: "Enumerated", allowedValues: ["small", "large"], cardinality: "single" },
    { id: "i.mine", type: "Instance", name: "My latte", values: { "s.size": "large" } },
    { id: "d.one", type: "DesignDecision", title: "Sizes", decision: "Two sizes.", date: "2026-01-01" },
    { id: "src.guide", type: "Source", title: "House guide", localPath: "guide.md", format: "markdown" },
    { id: "loc.one", type: "SourceLocation", quote: "Every drink | has a size.", locator: "Guide > Drinks", lines: "4", startLine: 4, endLine: 4, sourceLink: "https://example.test/guide.md#L4" },
    { id: "rule.size", type: "Rule", name: "Drinks have sizes", modality: "MUST", statement: "A Drink MUST have a size.", verification: { status: "SUPPORTED" } },
    { id: "rule.bare", type: "Rule", name: "Bare rule", modality: "MAY", statement: "A Latte MAY be iced." },
  ] as OkbNode[];
  const e = (from: string, type: string, to: string): GraphEdge => ({ from, type, to });
  const edges = [
    e("c.latte", "IS_A", "c.drink"), e("c.drink", "HAS_SLOT", "s.size"), e("i.mine", "INSTANCE_OF", "c.latte"),
    e("d.one", "ABOUT", "c.drink"), e("loc.one", "PART_OF", "src.guide"),
    e("rule.size", "GOVERNS", "c.drink"), e("rule.size", "CITES", "loc.one"), e("rule.bare", "GOVERNS", "c.latte"),
  ];
  return Ontology.fromData(nodes, edges, { name: "Cafe" });
}

const anchors = (md: string) => new Set([...md.matchAll(/<a id="([^"]+)"><\/a>/g)].map((m) => m[1]));

/** Every relative link in every page must name a page that exists and an anchor that page defines. */
function brokenLinks(files: DocFiles): string[] {
  const broken: string[] = [];
  for (const [name, md] of Object.entries(files)) {
    for (const m of md.matchAll(/\]\(([^)\s]+)\)/g)) {
      const [path, hash] = m[1].split("#");
      if (/^https?:/.test(path)) continue;
      const target = normalize(join(dirname(name), path));
      if (!(target in files)) broken.push(`${name} → ${m[1]} (no such page)`);
      else if (hash && !anchors(files[target]).has(hash)) broken.push(`${name} → ${m[1]} (no such anchor)`);
    }
  }
  return broken;
}

describe("kbDocs", () => {
  it("writes an index, a page per class, a rules page and a sources page", () => {
    assert.deepEqual(Object.keys(kbDocs(fixture())).sort(), ["classes/c-drink.md", "classes/c-latte.md", "index.md", "rules.md", "sources.md"]);
  });

  it("gives the same pages for the same ontology", () => {
    assert.deepEqual(kbDocs(fixture()), kbDocs(fixture()));
  });

  it("links every page to pages and anchors that exist", () => {
    assert.deepEqual(brokenLinks(kbDocs(fixture())), []);
  });

  it("lists scope, questions, the class tree and decisions on the index", () => {
    const index = kbDocs(fixture())["index.md"];
    assert.match(index, /^# Cafe$/m);
    assert.match(index, /\*\*Users:\*\* baristas/);
    assert.match(index, /1\. What is in a latte\?/);
    assert.match(index, /- \[Drink\]\(classes\/c-drink\.md\)\n {2}- \[Latte\]\(classes\/c-latte\.md\)/);
    assert.match(index, /Sizes: Two sizes\. \(about \[Drink\]/);
  });

  it("shows own and inherited slots with their facets on a class page", () => {
    const files = kbDocs(fixture());
    assert.match(files["classes/c-drink.md"], /size \| property \| own \| Enumerated \| small, large \| 0\.\.1 \|/);
    assert.match(files["classes/c-latte.md"], /size \| property \| inherited from \[Drink\]\(c-drink\.md\) \|/);
    assert.match(files["classes/c-latte.md"], /\*\*My latte\*\* \(size: large\)/);
  });

  it("shows inherited and own rules with modality and quote on a class page", () => {
    const latte = kbDocs(fixture())["classes/c-latte.md"];
    assert.match(latte, /\[Bare rule\]\(\.\.\/rules\.md#rule-bare\) \(MAY\)/);
    assert.match(latte, /\[Drinks have sizes\]\(\.\.\/rules\.md#rule-size\) \(inherited from \[Drink\]\(c-drink\.md\), MUST\)/);
    assert.match(latte, /> Every drink \| has a size\./);
  });

  it("links every rule to its source location, or says it has none", () => {
    const files = kbDocs(fixture());
    const ont = fixture();
    const rulesPage = files["rules.md"];
    for (const rule of ont.ofType("Rule")) {
      const section = rulesPage.split("<a id=").find((s) => s.startsWith(`"rule-${rule.id.slice(5)}"`));
      assert.ok(section, `rule ${rule.id} has a section`);
      const locs = ont.targets(rule.id, "CITES");
      if (!locs.length) assert.match(section, /Source: none cited/);
      for (const loc of locs) {
        const anchor = loc.replace(/\./g, "-");
        assert.ok(section.includes(`(sources.md#${anchor})`), `${rule.id} links to ${anchor}`);
        assert.ok(anchors(files["sources.md"]).has(anchor), `sources page defines ${anchor}`);
      }
    }
    assert.match(rulesPage, /\[original\]\(https:\/\/example\.test\/guide\.md#L4\)/);
  });

  it("lists on the sources page what cites each quote", () => {
    assert.match(kbDocs(fixture())["sources.md"], /Cited by: rule \[Drinks have sizes\]\(rules\.md#rule-size\)/);
  });

  it("handles an ontology with no classes, rules or sources", () => {
    const empty = Ontology.fromData([{ id: "ontology", type: "Ontology", name: "Empty", domain: "", purpose: "", users: [], maintainers: [], outOfScope: [], kind: "application", reuseReviewed: false } as OkbNode], [], { name: "Empty" });
    const files = kbDocs(empty);
    assert.deepEqual(Object.keys(files).sort(), ["index.md", "rules.md", "sources.md"]);
    assert.match(files["rules.md"], /no rules yet/);
  });
});

describe("the committed example pages", () => {
  for (const name of FOLDERS) {
    const dir = join(ROOT, "examples", name);
    const fresh = kbDocs(Ontology.load(dir));
    it(`${name}: match what okb docs writes now (run pnpm example to refresh them)`, () => {
      for (const [file, text] of Object.entries(fresh)) {
        const path = join(dir, "docs", file);
        assert.ok(existsSync(path), `${path} is missing`);
        assert.equal(readFileSync(path, "utf8"), text, `${name}/docs/${file} is out of date`);
      }
    });
    it(`${name}: have no broken links`, () => {
      assert.deepEqual(brokenLinks(fresh), []);
    });
  }

  it("espresso: every rule links to the quote it rests on", () => {
    const dir = join(ROOT, "examples", "espresso");
    const ont = Ontology.load(dir);
    const files = kbDocs(ont);
    const rules = ont.ofType("Rule");
    assert.ok(rules.length >= 2);
    for (const rule of rules) {
      const loc = ont.targets(rule.id, "CITES")[0];
      assert.ok(loc, `${rule.id} cites a quote`);
      const anchor = loc.replace(/\./g, "-");
      assert.ok(files["rules.md"].includes(`(sources.md#${anchor})`));
      assert.ok(anchors(files["sources.md"]).has(anchor));
    }
  });
});

describe("writePages", () => {
  it("won't replace a file okb didn't write, and writes nothing then", () => {
    const dir = mkdtempSync(join(tmpdir(), "okb-pages-"));
    try {
      writeFileSync(join(dir, "index.md"), "# My own index\n");
      assert.throws(() => writePages(dir, { "a.md": `${BANNER}\n`, "index.md": `${BANNER}\n` }), /already has index\.md/);
      assert.equal(readFileSync(join(dir, "index.md"), "utf8"), "# My own index\n");
      assert.ok(!existsSync(join(dir, "a.md")), "nothing else was written");
      writeFileSync(join(dir, "index.md"), `${BANNER}\nold\n`);
      assert.deepEqual(writePages(dir, { "index.md": `${BANNER}\nnew\n` }), ["index.md"]);
      assert.match(readFileSync(join(dir, "index.md"), "utf8"), /new/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("writeChangedPages", () => {
  it("removes pages an earlier changed view wrote, keeps hand-written files and rules-in-context.md", async () => {
    const { writeChangedPages } = await import("../src/kbdocs.ts");
    const dir = mkdtempSync(join(tmpdir(), "okb-changed-"));
    try {
      writePages(dir, { "classes/c-old.md": `${BANNER}\nold\n`, "changes.md": `${BANNER}\nfirst\n`, "rules-in-context.md": `${BANNER}\nctx\n` });
      writeFileSync(join(dir, "notes.md"), "mine\n");
      writeChangedPages(dir, { "changes.md": `${BANNER}\nsecond\n` });
      assert.ok(!existsSync(join(dir, "classes/c-old.md")), "the old changed page is gone");
      assert.ok(existsSync(join(dir, "rules-in-context.md")));
      assert.equal(readFileSync(join(dir, "notes.md"), "utf8"), "mine\n");
      assert.match(readFileSync(join(dir, "changes.md"), "utf8"), /second/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
