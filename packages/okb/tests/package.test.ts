import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";

/**
 * Packs @ontology-kit/okb and the unscoped ontology-kit wrapper, installs the tarballs into a temp
 * folder and runs the installed `okb`, the way a user who never cloned the repo would. Nothing is
 * published and nothing is fetched: the yaml dependency is packed from this workspace's own copy.
 */
const PKG = dirname(dirname(fileURLToPath(import.meta.url)));
const WRAPPER = join(dirname(PKG), "ontology-kit");
const SKIP = process.env.OKB_SKIP_PACKAGE_TEST ? "OKB_SKIP_PACKAGE_TEST is set" : false;

const run = (cmd: string, args: string[], cwd: string, env: NodeJS.ProcessEnv = process.env): string =>
  execFileSync(cmd, args, { cwd, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 });

describe("published packages", { skip: SKIP }, () => {
  let work = "";
  let install = "";
  let okbFiles: string[] = [];
  let wrapperFiles: string[] = [];
  const okb = (...args: string[]): string => run(join(install, "node_modules", ".bin", "okb"), args, cwd);
  let cwd = "";

  before(() => {
    work = mkdtempSync(join(tmpdir(), "okb-package-test-"));
    const tarballs = join(work, "tarballs");
    mkdirSync(tarballs);
    // `pnpm pack` swaps the wrapper's workspace:* range for the real version; its prepack builds dist/.
    for (const dir of [PKG, WRAPPER]) run("pnpm", ["pack", "--pack-destination", tarballs], dir);
    const yamlDir = dirname(createRequire(import.meta.url).resolve("yaml/package.json"));
    run("npm", ["pack", yamlDir, "--pack-destination", tarballs], work);
    const names = readdirSync(tarballs);
    const find = (re: RegExp) => join(tarballs, names.find((n) => re.test(n)) as string);
    const files = (tgz: string) => run("tar", ["-tzf", tgz], work).split("\n").filter(Boolean).map((f) => f.replace(/^package\//, ""));
    okbFiles = files(find(/^ontology-kit-okb-/));
    wrapperFiles = files(find(/^ontology-kit-\d/));

    install = join(work, "install");
    cwd = install;
    mkdirSync(install);
    writeFileSync(join(install, "package.json"), '{"name":"install-test","private":true}\n');
    run("npm", ["install", "--offline", "--omit=optional", "--no-audit", "--no-fund", "--loglevel=error",
      find(/^ontology-kit-okb-/), find(/^ontology-kit-\d/), find(/^yaml-/)], install);
  });

  after(() => rmSync(work, { recursive: true, force: true }));

  it("ships dist, the compiled meta-KB, skills and bin, and nothing else", () => {
    for (const f of ["package.json", "README.md", "LICENSE", "bin/okb.js", "dist/cli.js", "dist/metakb.js", "dist/format.js", "dist/format.d.ts",
      "meta-kb/data/nodes.json", "meta-kb/data/edges.json", "skills/ontology-coach/SKILL.md"]) {
      assert.ok(okbFiles.includes(f), `${f} is in the tarball`);
    }
    for (const f of okbFiles) {
      assert.match(f, /^(package\.json|README\.md|LICENSE|bin\/|dist\/|meta-kb\/data\/|skills\/)/, `unexpected file ${f}`);
      assert.doesNotMatch(f, /(^|\/)(tests|examples|docs|site|sources)\/|\.ya?ml$|\.pdf$|(?<!\.d)\.ts$|\.map$/, `unwanted file ${f}`);
    }
    assert.ok(!okbFiles.includes("dist/gendocs.js"), "the docs generator stays out of the package");
  });

  it("ships the wrapper as a bin, README and LICENSE only, at the same version", () => {
    assert.deepEqual(wrapperFiles.sort(), ["LICENSE", "README.md", "bin/okb.js", "package.json"]);
    const read = (dir: string) => JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    assert.equal(read(WRAPPER).version, read(PKG).version);
    assert.equal(read(WRAPPER).dependencies["@ontology-kit/okb"], "workspace:*");
    const installed = JSON.parse(readFileSync(join(install, "node_modules", "ontology-kit", "package.json"), "utf8"));
    assert.equal(installed.dependencies["@ontology-kit/okb"], read(PKG).version);
    assert.equal(read(PKG).private, undefined, "okb is publishable");
    assert.equal(read(PKG).engines.node, ">=24");
    assert.equal(read(WRAPPER).engines.node, ">=24");
  });

  it("runs the installed okb: version, init, validate and export", () => {
    const pkgVersion = JSON.parse(readFileSync(join(PKG, "package.json"), "utf8")).version;
    assert.match(okb("version"), new RegExp(`^okb ${pkgVersion.replace(/\./g, "\\.")} · meta-KB \\d+\\.\\d+\\.\\d+`));
    okb("init", "my-ontology");
    const dir = join(install, "my-ontology");
    for (const f of ["okb.json", "nodes.json", "edges.json"]) assert.ok(existsSync(join(dir, f)), f);
    cwd = dir; // okb finds the ontology from the folder it runs in
    assert.match(okb("validate"), /./);
    const out = join(install, "export.json");
    okb("export", "--out", out);
    cwd = install;
    assert.equal(JSON.parse(readFileSync(out, "utf8")).format, "okb-export/2");
  });

  it("runs the same okb through the unscoped ontology-kit package", () => {
    const viaWrapper = run(join(install, "node_modules", ".bin", "okb"), ["version"], install);
    assert.equal(viaWrapper, okb("version"));
    // The wrapper's own bin file, run directly the way `npx ontology-kit` does.
    const bin = join(install, "node_modules", "ontology-kit", "bin", "okb.js");
    assert.equal(run(process.execPath, [bin, "version"], install), okb("version"));
  });

  it("runs the compiled sources, not the TypeScript ones", () => {
    const pkgDir = join(install, "node_modules", "@ontology-kit", "okb");
    assert.ok(existsSync(join(pkgDir, "dist", "cli.js")));
    assert.ok(!existsSync(join(pkgDir, "src")));
  });

  it("installs the packaged skills from the installed copy, linked or copied, at the installed version", () => {
    const pkgDir = join(install, "node_modules", "@ontology-kit", "okb");
    const meta = okb("version").match(/meta-KB (\S+)/)![1];
    const skillsDir = join(work, "skills");
    assert.match(okb("skills", "install", "--dir", skillsDir), /ontology-coach: linked/);
    assert.equal(realpathSync(join(skillsDir, "ontology-coach")), realpathSync(join(pkgDir, "skills", "ontology-coach")));
    assert.match(okb("skills", "status", "--dir", skillsDir), new RegExp(`ontology-review +linked to this okb, version ${meta.replace(/\./g, "\\.")}`));
    for (const n of ["ontology-coach", "ontology-review", "build-domain-kb-from-docs"]) {
      assert.match(readFileSync(join(skillsDir, n, "SKILL.md"), "utf8"), new RegExp(`^\\*\\*Version ${meta.replace(/\./g, "\\.")}\\.\\*\\*`, "m"));
    }
    const copies = join(work, "skill-copies");
    okb("skills", "install", "--copy", "--dir", copies);
    assert.match(okb("skills", "status", "--dir", copies), /a copy of this okb's skill/);
  });

  it("explains how to read a PDF when pdfjs-dist is not installed", () => {
    const pkgDir = join(install, "node_modules", "@ontology-kit", "okb");
    writeFileSync(join(install, "fake.pdf"), "not really a pdf");
    const script = `import { loadPages } from ${JSON.stringify(join(pkgDir, "dist", "quotes.js"))};
      await loadPages("fake.pdf").then(() => console.log("no error"), (e) => console.log(e.message));`;
    // A PATH holding only node, so there is no pdftotext either.
    const nodeOnly = join(work, "node-only");
    mkdirSync(nodeOnly);
    run("ln", ["-s", process.execPath, join(nodeOnly, "node")], work);
    const out = run(join(nodeOnly, "node"), ["--input-type=module", "-e", script], install, { ...process.env, PATH: nodeOnly });
    assert.match(out, /Reading PDFs needs either the `pdftotext` command/);
  });
});
