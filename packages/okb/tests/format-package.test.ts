import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";

/**
 * Packs @ontology-kit/okb, installs the tarball offline and uses `@ontology-kit/okb/format` the way
 * another tool would: it imports the entry, reads the espresso example, and type-checks a small
 * TypeScript consumer against the shipped declarations (so the .d.ts files must ship and resolve).
 */
const PKG = dirname(dirname(fileURLToPath(import.meta.url)));
const SKIP = process.env.OKB_SKIP_PACKAGE_TEST ? "OKB_SKIP_PACKAGE_TEST is set" : false;
const require = createRequire(import.meta.url);

const run = (cmd: string, args: string[], cwd: string): string =>
  execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 });

const CONSUMER = `import { Ontology, STRUCTURAL_EDGE_TYPES, isRelationship } from "@ontology-kit/okb/format";
import type { ClassNode, GraphEdge, OkbNode, RelationshipSlot } from "@ontology-kit/okb/format";

const ont = Ontology.load("./espresso");
export const classes: ClassNode[] = ont.ofType("Class");
export const slots: RelationshipSlot[] = ont.ofType("Slot").filter(isRelationship);
export const first: OkbNode | undefined = ont.get("ontology");
export const values: string[] = ont.rel.values("i.vertex-cortado", "s.contains");
export const edge: GraphEdge | undefined = ont.rel.edge("i.vertex-cortado", "s.contains", "i.double-shot");
export const reserved: readonly string[] = STRUCTURAL_EDGE_TYPES;

// Writing is not part of the public API, so the declarations leave it out.
// @ts-expect-error addNode is internal
ont.addNode({ type: "Term", id: "t.x", text: "x" });
// @ts-expect-error save is internal
ont.save();
// @ts-expect-error relationship values are read-only here
ont.rel.link("i.a", "s.b", "i.c");
`;

describe("@ontology-kit/okb/format from the packed tarball", { skip: SKIP }, () => {
  let work = "";
  let install = "";

  before(() => {
    work = mkdtempSync(join(tmpdir(), "okb-format-package-"));
    const tarballs = join(work, "tarballs");
    mkdirSync(tarballs);
    run("pnpm", ["pack", "--pack-destination", tarballs], PKG);
    run("npm", ["pack", dirname(require.resolve("yaml/package.json")), "--pack-destination", tarballs], work);
    const names = readdirSync(tarballs);
    const find = (re: RegExp) => join(tarballs, names.find((n) => re.test(n)) as string);
    install = join(work, "install");
    mkdirSync(install);
    writeFileSync(join(install, "package.json"), '{"name":"format-consumer","private":true,"type":"module"}\n');
    run("npm", ["install", "--offline", "--omit=optional", "--no-audit", "--no-fund", "--loglevel=error",
      find(/^ontology-kit-okb-/), find(/^yaml-/)], install);
    cpSync(join(PKG, "examples", "espresso"), join(install, "espresso"), { recursive: true });
  });

  after(() => rmSync(work, { recursive: true, force: true }));

  it("ships the entry and its declarations, and the exports map has types", () => {
    const dir = join(install, "node_modules", "@ontology-kit", "okb");
    const exp = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")).exports["./format"];
    assert.equal(exp.types, "./dist/format.d.ts");
    for (const f of ["dist/format.js", "dist/format.d.ts", "dist/model.d.ts", "dist/types.d.ts"]) {
      assert.ok(readFileSync(join(dir, f), "utf8").length > 0, f);
    }
    assert.doesNotMatch(readFileSync(join(dir, "dist", "model.d.ts"), "utf8"), /from "\.\/[^"]*\.ts"/, "declarations import .js paths");
  });

  it("loads an ontology and reads edge types and relationship values", () => {
    const script = `import { Ontology, STRUCTURAL_EDGE_TYPES, PROVENANCE_EDGE_TYPES, isRelationship } from "@ontology-kit/okb/format";
      const ont = Ontology.load("./espresso");
      const values = ont.rel.values("i.vertex-cortado", "s.contains").map((id) => ont.label(id));
      console.log(JSON.stringify({ structural: STRUCTURAL_EDGE_TYPES, provenance: PROVENANCE_EDGE_TYPES,
        relationships: ont.ofType("Slot").filter(isRelationship).length, values, format: ont.manifest.format }));`;
    const out = JSON.parse(run(process.execPath, ["--input-type=module", "-e", script], install));
    for (const t of ["REFINES", "FULFILLS", "IS_A"]) assert.ok(out.structural.includes(t), t);
    assert.deepEqual([...out.provenance].sort(), ["CITES", "FULFILLS", "GOVERNS", "PART_OF", "REFINES"]);
    assert.ok(out.relationships >= 3);
    assert.ok(out.values.includes("Double shot"));
    assert.equal(out.format, "okb-lpg/2");
  });

  it("refuses paths outside the exports map", () => {
    const script = `await import("@ontology-kit/okb/dist/model.js").then(() => console.log("imported"), (e) => console.log(e.code));`;
    assert.equal(run(process.execPath, ["--input-type=module", "-e", script], install).trim(), "ERR_PACKAGE_PATH_NOT_EXPORTED");
  });

  it("type-checks a consumer against the shipped declarations", () => {
    writeFileSync(join(install, "consumer.ts"), CONSUMER);
    writeFileSync(join(install, "tsconfig.json"), JSON.stringify({
      compilerOptions: { target: "ES2023", module: "NodeNext", moduleResolution: "NodeNext", strict: true, noEmit: true, types: [], skipLibCheck: false },
      files: ["consumer.ts"],
    }));
    const tsc = require.resolve("typescript/lib/tsc.js");
    try {
      run(process.execPath, [tsc, "-p", "tsconfig.json"], install);
    } catch (e) {
      assert.fail(`tsc rejected the consumer:\n${(e as { stdout?: string }).stdout ?? e}`);
    }
  });
});
