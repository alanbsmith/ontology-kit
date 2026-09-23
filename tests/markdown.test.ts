/** Markdown sources and the provenance commands, using a real component doc (tests/fixtures/button.md). */
import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { loadSourcePages, runChecks } from "../src/checks.ts";
import { deepLinks, inlineToText, locate, parseMarkdown, splitRow } from "../src/markdown.ts";
import { OkbError, Ontology } from "../src/model.ts";
import * as ops from "../src/ops.ts";
import * as prov from "../src/provenance.ts";

const FIXTURE = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "button.md");
const doc = parseMarkdown(readFileSync(FIXTURE, "utf8"));

describe("markdown reader", () => {
  it("reads frontmatter, headings and blocks", () => {
    assert.equal(doc.title, "Button");
    assert.equal((doc.frontmatter as any).componentMeta.package, "@workday/canvas-kit-react");
    assert.ok(doc.headings.some((h) => h.path.join(" > ") === "Accessibility > Touch Target Size"));
    const kinds = new Set(doc.blocks.map((b) => b.kind));
    for (const k of ["frontmatter", "paragraph", "list-item", "callout", "table-row", "code", "comment", "image"]) assert.ok(kinds.has(k as any), k);
  });
  it("turns inline markdown into what a reader sees", () => {
    assert.equal(inlineToText("Use accessible [tooltips](/design-system/components/tooltip) with **icon-only** `variants`."), "Use accessible tooltips with icon-only variants.");
    assert.equal(inlineToText("![Alt text](./a.png) and {@link createStyles } <br> x"), "Alt text and createStyles \n x");
  });
  it("splits table rows without breaking on escaped pipes", () => {
    assert.deepEqual(splitRow("| a | `x \\| y` | c |"), ["a", "`x | y`", "c"]);
  });
  it("flags table rows whose cell count doesn't match the header", () => {
    assert.equal(doc.problems.length, 4);
    assert.ok(doc.problems.every((p) => /iconPosition' has 5 cells for 4 columns/.test(p.message)));
  });
  it("marks code examples and HTML comments as not quotable", () => {
    assert.ok(doc.blocks.filter((b) => b.kind === "code").every((b) => !b.quotable));
    assert.ok(doc.blocks.filter((b) => b.kind === "comment").every((b) => !b.quotable));
  });
});

describe("locating quotes", () => {
  it("finds a list item by its rendered text, with heading path and line", () => {
    const [h] = locate(doc, "All buttons meet the minimum 24px by 24px touch target size requirement for mobile accessibility.");
    assert.equal(h.locator, "Accessibility > Touch Target Size");
    assert.equal(h.startLine, 655);
  });
  it("ignores link URLs and line wrapping", () => {
    const [h] = locate(doc, "Consider using checkbox, switch, or segmented control when a component is needed that can capture 2 togglable states.");
    assert.equal(h.locator, "Usage Guidance > When to Use Something Else");
    assert.deepEqual([h.startLine, h.endLine], [50, 53]);
  });
  it("finds callouts and table rows with useful locators", () => {
    assert.equal(locate(doc, "Setting --cnvs-brand-action** tokens at the :root CSS will override all PrimaryButton theme colors")[0].locator, "Examples > Theme Overrides > Caution callout");
    const rows = locate(doc, "There are four button sizes: extraSmall, small, medium, and large.");
    assert.equal(rows.length, 4);
    assert.equal(rows[0].locator, "PrimaryButton > Props > row: size");
  });
  it("doesn't find changed words (the 44px error from the first pipeline)", () => {
    assert.deepEqual(locate(doc, "All buttons meet the minimum 44px by 44px touch target size requirement"), []);
  });
  it("builds GitHub line links and heading anchors", () => {
    const [h] = locate(doc, "Disabled buttons use the disabled attribute, removing them from the tab order.");
    const links = deepLinks(h, "https://github.com/o/r/blob/main/button.md", "https://site/button");
    assert.equal(links.sourceLink, "https://github.com/o/r/blob/main/button.md?plain=1#L643");
    assert.equal(links.pageLink, "https://site/button#disabled-buttons");
  });
});

describe("extraction commands", () => {
  const setup = () => {
    const dir = mkdtempSync(join(tmpdir(), "okb-md-"));
    const ont = Ontology.create(dir, "Button KB");
    ops.setConventions(ont, {});
    ops.addClass(ont, "Button", { description: "A control that triggers an action." });
    mkdirSync(join(dir, "docs"));
    copyFileSync(FIXTURE, join(dir, "docs", "button.md"));
    prov.addSource(ont, join(dir, "docs", "button.md"), { repoUrl: "https://github.com/o/r/blob/main/button.md" });
    return { dir, ont, src: ont.ofType("Source")[0] };
  };

  it("adds quotes, refusing missing text, ambiguous text and code", async () => {
    const { ont, src } = setup();
    assert.equal(src.title, "Button");
    await assert.rejects(prov.addQuote(ont, src.id, "minimum 44px by 44px touch target"), /Not found[\s\S]*Closest text \(line 655/);
    await assert.rejects(prov.addQuote(ont, src.id, "Use sparingly for destructive actions"), /appears 2 times[\s\S]*--line 309/);
    await assert.rejects(prov.addQuote(ont, src.id, "import {DeleteButton} from '@workday/canvas-kit-react/button';"), /code/);
    const notes = await prov.addQuote(ont, src.id, "Use sparingly for destructive actions", { line: 762, cites: ["Button"] });
    assert.match(notes[0], /at DeleteButton, line 762/);
    const loc = ont.ofType("SourceLocation")[0];
    assert.equal(loc.sourceLink, "https://github.com/o/r/blob/main/button.md?plain=1#L762");
    assert.equal(ont.find("Button", "Class").extracted, true);
  });

  it("requires verification, and keeps corrected rules blocked until a person approves", async () => {
    const { ont, src } = setup();
    await prov.addQuote(ont, src.id, "All buttons meet the minimum 24px by 24px touch target size requirement for mobile accessibility.");
    const loc = ont.ofType("SourceLocation")[0].id;
    prov.addRule(ont, { statement: "Buttons MUST have a 44px touch target (WCAG 2.5.5).", modality: "MUST", governs: ["Button"], cites: [loc] });
    const rule = ont.ofType("Rule")[0].id;
    const blocking = () => runChecks(ont, { all: true, only: ["prov-verified"] }).map((f) => f.message).join("\n");
    assert.match(blocking(), /hasn't been verified/);
    prov.verify(ont, rule, { status: "OVERREACH", corrected: "All buttons meet the minimum 24px by 24px touch target size requirement." });
    assert.equal(ont.require(rule, "Rule")._originalDraft, "Buttons MUST have a 44px touch target (WCAG 2.5.5).");
    assert.match(blocking(), /--approve/);
    prov.verify(ont, rule, { approve: true });
    assert.equal(blocking(), "");
    assert.equal(ont.require(rule, "Rule").extractionConfidence, "corrected");
  });

  it("explains, rather than crashes, when a source has no local file", async () => {
    const { ont } = setup();
    ont.addNode({ type: "Source", id: "src.web", title: "Web page", format: "markdown", url: "https://site/button" });
    assert.throws(() => prov.refreshSource(ont, "src.web"), OkbError);
    assert.throws(() => prov.readMarkdownSource(ont, ont.require("src.web", "Source")), /no local file/);
    await assert.rejects(prov.addQuote(ont, "src.web", "anything"), OkbError);
  });

  it("notices when the document changes, and refresh re-links moved quotes", async () => {
    const { dir, ont, src } = setup();
    await prov.addQuote(ont, src.id, "Disabled buttons use the disabled attribute, removing them from the tab order.");
    await prov.addQuote(ont, src.id, "Button padding ensures adequate spacing between interactive elements to prevent accidental activation.");
    ont.save();
    const file = join(dir, "docs", "button.md");
    const edited = readFileSync(file, "utf8")
      .replace("## Anatomy", "## Overview\n\nA new intro paragraph.\n\n## Anatomy")
      .replace("- Button padding ensures adequate spacing between interactive elements to prevent accidental\n  activation.\n", "");
    writeFileSync(file, edited);
    const f = runChecks(ont, { all: true, only: ["prov-quote-current"] }, { pages: await loadSourcePages(ont) });
    assert.ok(f.some((x) => x.severity === "error" && /no longer appears/.test(x.message)));
    assert.ok(f.some((x) => x.severity === "info" && /moved \(was line 643, now line 647\)/.test(x.message)));
    const notes = prov.refreshSource(ont, src.id);
    assert.match(notes[0], /1 quote\(s\) moved, 1 missing/);
    assert.equal(ont.ofType("SourceLocation")[0].startLine, 647);
  });
});
