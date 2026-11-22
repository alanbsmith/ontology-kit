// okb verify: suggested notes and --ref (issue #138).
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";
import { Ontology, OkbError, type GraphEdge, type OkbNode } from "@ontology-kit/format";
import { verify } from "../src/provenance.ts";
import { suggestNote } from "../src/verifynote.ts";

const CLI = join(dirname(dirname(fileURLToPath(import.meta.url))), "src", "cli.ts");

function fixture(statement = "A Button MUST be at least 44px tall."): Ontology {
  const nodes = [
    { id: "c.button", type: "Class", name: "Button" },
    { id: "loc.a", type: "SourceLocation", quote: "Buttons should be at least 24px tall.", locator: "Guide", lines: "1" },
    { id: "rule.size", type: "Rule", name: "Size", modality: "MUST", statement },
  ] as OkbNode[];
  const edges: GraphEdge[] = [{ from: "rule.size", type: "GOVERNS", to: "c.button" }, { from: "rule.size", type: "CITES", to: "loc.a" }];
  return Ontology.fromData(nodes, edges, { name: "T" });
}

describe("suggestNote", () => {
  it("names a narrowed modality", () => assert.equal(suggestNote("A Button MUST be big.", "A Button SHOULD be big."), "narrowed MUST to SHOULD"));
  it("says 'changed', not 'narrowed', when a modality flips polarity", () => {
    assert.equal(suggestNote("A Button MUST NOT be big.", "A Button MUST be big."), "changed MUST NOT to MUST");
    assert.equal(suggestNote("A Button MUST NOT be big.", "A Button SHOULD NOT be big."), "narrowed MUST NOT to SHOULD NOT");
  });
  it("names a strengthened modality", () => assert.equal(suggestNote("A Button MAY be big.", "A Button SHOULD be big."), "strengthened MAY to SHOULD"));
  it("names a changed number", () => assert.equal(suggestNote("Buttons are 44px tall.", "Buttons are 24px tall."), "changed 44 to 24"));
  it("names a modality and a number together", () => assert.equal(suggestNote("A Button MUST be 44px tall.", "A Button SHOULD be 24px tall."), "narrowed MUST to SHOULD; changed 44 to 24"));
  it("names removed and added words", () => {
    assert.equal(suggestNote("A Button MUST always be grey.", "A Button MUST be grey."), 'removed "always"');
    assert.equal(suggestNote("A Button MUST be grey.", "A Button MUST be grey in dark mode."), 'added "in", "dark", "mode"');
  });
  it("gives up on a rewording it can't name", () => {
    assert.equal(suggestNote("A Button MUST be grey.", "Buttons ought to avoid any particular color whatsoever unless branded."), null);
    assert.equal(suggestNote("A Button MUST be grey.", "A Button MUST be grey."), null);
  });
  it("is deterministic", () => assert.equal(suggestNote("A MUST 5", "A SHOULD 3"), suggestNote("A MUST 5", "A SHOULD 3")));
});

describe("verify notes and ref", () => {
  it("running OVERREACH again to add a note keeps the original wording", () => {
    const ont = fixture();
    verify(ont, "rule.size", { status: "OVERREACH", corrected: "A Button SHOULD be at least 24px tall." });
    const again = verify(ont, "rule.size", { status: "OVERREACH", corrected: "A Button SHOULD be at least 24px tall.", note: "narrowed MUST to SHOULD; changed 44 to 24" });
    const rule = ont.require("rule.size", "Rule");
    assert.equal(rule._originalDraft, "A Button MUST be at least 44px tall.");
    assert.equal(rule.statement, "A Button SHOULD be at least 24px tall.");
    assert.ok(!again.some((n) => n.startsWith("Suggested note")));
    // Running it again with only a link keeps the note already stored, and doesn't suggest one.
    const rerun = verify(ont, "rule.size", { status: "OVERREACH", corrected: "A Button SHOULD be at least 24px tall.", ref: "https://example.test/pr/1#c2" });
    assert.ok(!rerun.some((n) => n.startsWith("Suggested note")));
    assert.equal(rule.verification?.note, "narrowed MUST to SHOULD; changed 44 to 24");
    assert.equal(rule.verification?.ref, "https://example.test/pr/1#c2");
    assert.equal(rule._originalDraft, "A Button MUST be at least 44px tall.");
  });

  it("suggests a note after OVERREACH without --note, and stores nothing", () => {
    const ont = fixture();
    const notes = verify(ont, "rule.size", { status: "OVERREACH", corrected: "A Button SHOULD be at least 24px tall." });
    assert.ok(notes.includes("Suggested note: narrowed MUST to SHOULD; changed 44 to 24"));
    assert.ok(notes.some((n) => n.startsWith('To store it: okb verify rule.size --status OVERREACH --corrected "A Button SHOULD be at least 24px tall." --note "narrowed MUST to SHOULD; changed 44 to 24"')));
    assert.equal(ont.require("rule.size", "Rule").verification?.note, undefined);
  });
  it("falls back to the generic tip, and prints no tip when a note is given", () => {
    const reworded = verify(fixture(), "rule.size", { status: "OVERREACH", corrected: "Buttons ought to avoid any particular color whatsoever unless branded." });
    assert.ok(reworded.some((n) => n.startsWith("Tip: add a note")));
    const given = verify(fixture(), "rule.size", { status: "OVERREACH", corrected: "A Button SHOULD be 24px.", note: "narrowed MUST to SHOULD" });
    assert.ok(!given.some((n) => /note/i.test(n) && /Tip|Suggested/.test(n)));
  });
  it("tips what a note says for UNSUPPORTED, but not for SUPPORTED", () => {
    assert.ok(verify(fixture(), "rule.size", { status: "UNSUPPORTED" }).some((n) => n.includes("which part of the statement the quote doesn't support")));
    assert.ok(!verify(fixture(), "rule.size", { status: "SUPPORTED" }).some((n) => /Tip|Suggested/.test(n)));
  });
  it("stores --ref, and --approve keeps it and the note unless replaced", () => {
    const ont = fixture();
    verify(ont, "rule.size", { status: "OVERREACH", corrected: "A Button SHOULD be 24px.", note: "narrowed", ref: "https://github.com/o/r/pull/1#discussion_r2" });
    verify(ont, "rule.size", { approve: true });
    assert.deepEqual(ont.require("rule.size", "Rule").verification, { status: "SUPPORTED", checkedAgainst: ["loc.a"], note: "narrowed", ref: "https://github.com/o/r/pull/1#discussion_r2", approvedAfter: "OVERREACH" });
    verify(ont, "rule.size", { approve: true, ref: "http://example.com/x" });
    assert.equal(ont.require("rule.size", "Rule").verification?.ref, "http://example.com/x");
  });
  it("rejects a --ref that isn't an http(s) link, before changing anything", () => {
    for (const ref of ["ftp://x/y", "not a url", "file:///etc/passwd", "https://", "javascript:alert(1)"]) {
      const ont = fixture();
      assert.throws(() => verify(ont, "rule.size", { status: "OVERREACH", corrected: "A Button SHOULD be 24px.", ref }), (e: unknown) => e instanceof OkbError && /http:\/\/ or https:\/\//.test(e.message));
      assert.equal(ont.require("rule.size", "Rule").verification, undefined);
      assert.equal(ont.require("rule.size", "Rule").statement, "A Button MUST be at least 44px tall.");
    }
  });
});

describe("okb verify --ref on the command line", () => {
  let dir = "";
  const okb = (...args: string[]) => spawnSync("node", [CLI, ...args], { cwd: dir, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });
  before(() => {
    dir = mkdtempSync(join(tmpdir(), "okb-verify-notes-"));
    writeFileSync(join(dir, "g.md"), "# Guide\n\n## Size\n\nButtons should be at least 24px tall.\n");
    assert.equal(okb("init", ".", "--name", "T").status, 0);
    okb("class", "add", "Button");
    okb("source", "add", "g.md");
    const q = /loc\.[a-z0-9-]+/.exec(okb("quote", "add", "src.guide", "Buttons should be at least 24px tall.").stdout)?.[0];
    assert.ok(q);
    const rule = /rule\.[a-z0-9-]+/.exec(okb("rule", "add", "--statement", "A Button MUST be at least 44px tall.", "--modality", "MUST", "--governs", "Button", "--cites", q).stdout)?.[0];
    assert.ok(rule);
  });
  after(() => rmSync(dir, { recursive: true, force: true }));

  it("suggests, stores a ref, keeps it on approve, shows it in --context, and rejects a bad one", () => {
    const rule = Ontology.load(dir).ofType("Rule")[0].id;
    const bad = okb("verify", rule, "--status", "SUPPORTED", "--ref", "ftp://x");
    assert.equal(bad.status, 2);
    assert.match(bad.stdout + bad.stderr, /--ref must be an http:\/\/ or https:\/\//);
    const over = okb("verify", rule, "--status", "OVERREACH", "--corrected", "A Button SHOULD be at least 24px tall.", "--ref", "https://github.com/o/r/pull/1#r2");
    assert.equal(over.status, 0);
    assert.match(over.stdout, /Suggested note: narrowed MUST to SHOULD; changed 44 to 24/);
    assert.match(over.stdout, /--ref "https:\/\/github\.com\/o\/r\/pull\/1#r2"/);
    assert.equal(Ontology.load(dir).require(rule, "Rule").verification?.note, undefined);
    assert.equal(okb("verify", rule, "--approve", "--note", "narrowed").status, 0);
    assert.equal(Ontology.load(dir).require(rule, "Rule").verification?.ref, "https://github.com/o/r/pull/1#r2");
    const out = join(dir, "out");
    assert.equal(okb("docs", "--out", out, "--context").status, 0);
    assert.match(readFileSync(join(out, "rules-in-context.md"), "utf8"), /Verifier's note: narrowed <https:\/\/github\.com\/o\/r\/pull\/1#r2>/);
  });
});
