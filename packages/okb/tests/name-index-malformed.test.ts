/** A hand-edited file can hold a non-string where a name goes. It must still load, and the name index must skip the value. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Ontology, type OkbNode } from "@ontology-kit/reader";
import { runChecks } from "../src/checks.ts";

const root = { type: "Ontology", id: "ontology", name: "T", domain: "", purpose: "", users: [], maintainers: [], outOfScope: [], kind: "application", reuseReviewed: false };
const cls = (id: string, name: unknown, extra: Record<string, unknown> = {}) => ({ type: "Class", id, name, description: "", terminological: false, ...extra });
const BAD: unknown[] = [42, { a: 1 }, [1, 2], true, null];

function load(...nodes: Record<string, unknown>[]): Ontology {
  return Ontology.fromData([root, ...nodes] as unknown as OkbNode[], []);
}

describe("name index with non-string name-like values", () => {
  for (const bad of BAD) {
    for (const field of ["name", "text", "title", "quote"]) {
      it(`loads, finds and checks with ${field} = ${JSON.stringify(bad)}`, () => {
        const odd = { type: "Class", id: "c.odd", name: "Odd", description: "", terminological: false, [field]: bad };
        const ont = load(cls("c.good", "Good"), odd);
        assert.equal(ont.find("Good", ["Class"], false)?.id, "c.good");
        assert.equal(ont.find("c.good", undefined, false)?.id, "c.good");
        assert.doesNotThrow(() => runChecks(ont, { all: true }));
      });
    }
  }

  it("keeps valid lookups, skips the bad value, and the other checks still run", () => {
    const ont = load(cls("c.good", "Good"), cls("c.num", 42), cls("c.obj", { x: 1 }), cls("c.other", "Other", { name: "good" }));
    assert.equal(ont.find("Other", undefined, false), undefined, "its name is now 'good'");
    assert.throws(() => ont.find("good", ["Class"], false), /more than one/);
    assert.equal(ont.find("42", undefined, false), undefined);
    const f = runChecks(ont, { all: true }).findings;
    assert.ok(f.length > 0, "checks ran");
  });

  it("rename, touch and removeNode cope with a node whose name is not a string", () => {
    const ont = load(cls("c.good", "Good"), cls("c.num", 42));
    const num = ont.require("c.num", "Class");
    assert.doesNotThrow(() => ont.touch(num));
    // Fixing the hand edit in place makes the node findable, with no stale entry left over.
    (num as unknown as { name: unknown }).name = "Number";
    ont.touch(num);
    assert.equal(ont.find("Number", ["Class"], false), num);
    // And breaking it again drops the entry.
    (num as unknown as { name: unknown }).name = 7;
    ont.touch(num);
    assert.equal(ont.find("Number", ["Class"], false), undefined);
    assert.doesNotThrow(() => ont.removeNode("c.num"));
    assert.equal(ont.get("c.num"), undefined);
    assert.equal(ont.find("Good", ["Class"], false)?.id, "c.good");
  });
});
