/**
 * Mechanical drift check for ontology-kit's hand-written docs.
 *
 *   node .claude/skills/okb-docs-drift/scripts/check-docs.ts [--json] [files...]
 *
 * Reads the docs (default: every hand-written markdown file) and reports anything
 * that names something that doesn't exist:
 *   - okb commands/subcommands and their --flags, checked against src/cli.ts
 *   - `npm run <script>`, checked against package.json
 *   - repo paths (src/..., docs/..., meta-kb/..., tests/..., examples/..., skills/...)
 *   - rule ids (hier-*, slot-*, naming-*, ...), checked against the compiled meta-KB
 *   - node and edge types in docs/FORMAT.md tables, checked against meta-kb/src/format.yaml
 *   - meta-KB counts ("55 rules", "34 glossary concepts") and versions ("meta-KB 2.3.0"),
 *     checked against meta-kb/data/manifest.json
 * Exit code 1 if anything is found. It can't judge prose; the skill covers that.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const DEFAULT_DOCS = [
  "README.md", "CLAUDE.md", "docs/FORMAT.md", "docs/EXTRACTION-PIPELINE.md", "meta-kb/README.md", "sources/README.md",
  "skills/ontology-coach/SKILL.md", "skills/ontology-review/SKILL.md", "skills/build-domain-kb-from-docs/SKILL.md",
];
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

interface Problem {
  file: string;
  line: number;
  kind: "command" | "flag" | "npm-script" | "path" | "rule" | "format-type" | "count" | "version";
  message: string;
}

/** okb command -> its subcommands and flags, from the `case "x":` blocks in src/cli.ts. */
function cliSurface(): Map<string, { subs: Set<string>; flags: Set<string> }> {
  const src = read("src/cli.ts");
  const out = new Map<string, { subs: Set<string>; flags: Set<string> }>();
  const global = ["C", "json", "help", "h"];
  const optionKeys = (text: string) =>
    [...text.matchAll(/(?:"([a-z][a-z-]*)"|\b([a-z][a-zA-Z]*)): (?:str|strs|bool)\b/g)].map((m) => m[1] ?? m[2]);
  const shared = optionKeys(src.slice(src.indexOf("const slotOpts"), src.indexOf("const toOpts")));
  const blocks = src.split(/\n\s*case "/).slice(1);
  let pending: string[] = [];
  for (const block of blocks) {
    const name = block.slice(0, block.indexOf('"'));
    pending.push(name);
    if (/^[^\n]*":\s*$/.test(block.split("\n")[0]) && block.split("\n").length < 3) continue; // fallthrough case label
    const subs = new Set([...block.matchAll(/sub === "([a-z-]+)"/g)].map((m) => m[1]));
    const flags = new Set([...global, ...optionKeys(block), ...(block.includes("slotOpts") ? shared : [])]);
    for (const n of pending) out.set(n, { subs, flags });
    pending = [];
  }
  // Everyday aliases rewritten before dispatch (see main() in cli.ts).
  const slot = out.get("slot");
  if (slot) {
    out.set("property", slot);
    out.set("relationship", { subs: new Set([...slot.subs, "property"]), flags: new Set([...slot.flags, "from", "to", ...(out.get("edgeprop")?.flags ?? [])]) });
  }
  return out;
}

function ruleKeys(): Set<string> {
  const nodes = JSON.parse(read("meta-kb/data/nodes.json")) as { type: string; key?: string }[];
  return new Set(nodes.filter((n) => n.type === "Rule" && n.key).map((n) => n.key!));
}

function formatTypes(): { nodes: Set<string>; edges: Set<string> } {
  const fmt = parseYaml(read("meta-kb/src/format.yaml")) as { nodeTypes: { name: string }[]; edgeTypes: { name: string }[] };
  return { nodes: new Set(fmt.nodeTypes.map((t) => t.name)), edges: new Set(fmt.edgeTypes.map((t) => t.name)) };
}

/** Meta-KB node counts by the words docs use for them. */
function metaCounts(): Map<string, number> {
  const { nodeCounts } = JSON.parse(read("meta-kb/data/manifest.json")) as { nodeCounts: Record<string, number> };
  return new Map([
    ["rules", nodeCounts.Rule], ["glossary concepts", nodeCounts.Concept], ["concepts", nodeCounts.Concept],
    ["principles", nodeCounts.Principle], ["decision guides", nodeCounts.Decision], ["steps", nodeCounts.Step],
  ]);
}
const COUNTS = metaCounts();
const META_VERSION = (JSON.parse(read("meta-kb/data/manifest.json")) as { version: string }).version;

const RULE_ID = /`((?:struct|hier|inst|slot|disjoint|naming|scope|doc|reuse|terms|prov)-[a-z0-9-]+)`/g;
const REPO_PATH = /(?<![\w./-])((?:src|docs|meta-kb|tests|examples|skills|bin|sources)\/[\w./*-]*[\w*])/g;

function checkFile(file: string, cli: ReturnType<typeof cliSurface>, rules: Set<string>, fmt: ReturnType<typeof formatTypes>, scripts: Set<string>): Problem[] {
  const problems: Problem[] = [];
  const lines = read(file).split("\n");
  let inFence = false;
  lines.forEach((text, i) => {
    const line = i + 1;
    if (/^\s*```/.test(text)) {
      inFence = !inFence;
      return;
    }
    // Only code is checked for commands: a fenced line, or each `inline span`. Prose ("okb falls back...") isn't.
    const code = inFence ? [text.replace(/\s#.*$/, "")] : [...text.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
    // A command starts the span or line, or follows && / ; / · / | / "cd x &&" (not prose like "the typed okb file format").
    for (const span of code) for (const m of span.matchAll(/(?:^\s*(?:\$\s*)?|&&\s*|[;·|]\s*)okb ((?:[a-z][\w-]*)(?: [a-z][\w-]*)?)([^|·;&]*)/g)) {
      const [cmd, maybeSub] = m[1].split(" ");
      const spec = cli.get(cmd);
      if (!spec) {
        problems.push({ file, line, kind: "command", message: `'okb ${cmd}' isn't a command in src/cli.ts.` });
        continue;
      }
      // class/slot/instance (and their aliases) always take a subcommand; the others can take
      // a positional instead (okb quote <source>, okb cq), so only common subcommand words count there.
      const subRequired = ["class", "slot", "instance", "property", "relationship"].includes(cmd);
      const subWord = ["add", "set", "remove", "list", "link", "unlink", "none", "outline", "refresh", "fix", "default", "restrict", "disjoint", "inverse", "property", "show", "delete", "update", "rename"];
      if (maybeSub && /^[a-z]+$/.test(maybeSub) && !spec.subs.has(maybeSub) && (subRequired || subWord.includes(maybeSub))) {
        problems.push({ file, line, kind: "command", message: `'okb ${cmd} ${maybeSub}': ${cmd} has no '${maybeSub}' subcommand (has: ${[...spec.subs].join(", ") || "none"}).` });
      }
      for (const f of m[2].matchAll(/(?<![\w-])--([a-z][a-z-]*)/g)) {
        if (!spec.flags.has(f[1])) problems.push({ file, line, kind: "flag", message: `'okb ${cmd}' has no --${f[1]} option.` });
      }
    }
    if (/meta-KB|method|knowledge base/i.test(text)) {
      for (const m of text.matchAll(/\b(\d+) (glossary concepts|decision guides|concepts|principles|rules|steps)\b/g)) {
        const actual = COUNTS.get(m[2]);
        if (actual !== undefined && Number(m[1]) !== actual) problems.push({ file, line, kind: "count", message: `Says ${m[1]} ${m[2]}; the meta-KB has ${actual}.` });
      }
    }
    for (const m of text.matchAll(/meta-KB (\d+\.\d+\.\d+)/g)) {
      if (m[1] !== META_VERSION) problems.push({ file, line, kind: "version", message: `Says meta-KB ${m[1]}; it's ${META_VERSION}.` });
    }
    for (const m of text.matchAll(/npm run ([\w:-]+)/g)) {
      if (!scripts.has(m[1])) problems.push({ file, line, kind: "npm-script", message: `package.json has no '${m[1]}' script.` });
    }
    for (const m of text.matchAll(RULE_ID)) {
      if (!rules.has(m[1])) problems.push({ file, line, kind: "rule", message: `No meta-KB rule '${m[1]}'.` });
    }
    const okbArgs = new Set(code.filter((c) => /(?<![\w/-])okb /.test(c)).flatMap((c) => [...c.matchAll(REPO_PATH)].map((m) => m[1])));
    for (const m of text.matchAll(REPO_PATH)) {
      const p = m[1].replace(/[.,:)]+$/, "");
      if (okbArgs.has(m[1])) continue; // an argument to okb: a file in the user's own project
      if (p.includes("*") || p.includes("<") || /\/$/.test(p) || text[(m.index ?? 0) + m[1].length] === "|") continue; // globs, placeholders, docs/A|B|C
      const fromFile = join(dirname(file), p);
      if (!existsSync(join(ROOT, p)) && !existsSync(join(ROOT, fromFile)) && !isGenerated(p)) {
        problems.push({ file, line, kind: "path", message: `'${p}' doesn't exist.` });
      }
    }
    // FORMAT.md tables: the first cell of rows under "Node types" / "Edge types" must be a registered type.
    if (file === "docs/FORMAT.md" && !inFence) {
      const cell = text.match(/^\| `([A-Za-z_]+)` \|/)?.[1];
      const section = lines.slice(0, i).reverse().find((l) => l.startsWith("## "));
      if (cell && section === "## Node types" && !fmt.nodes.has(cell)) problems.push({ file, line, kind: "format-type", message: `Node type '${cell}' isn't in meta-kb/src/format.yaml.` });
      if (cell && section === "## Edge types" && !fmt.edges.has(cell)) problems.push({ file, line, kind: "format-type", message: `Edge type '${cell}' isn't in meta-kb/src/format.yaml.` });
    }
  });
  // Shipped skills state the version they were written for, so an agent can check it against okb version.
  if (/^skills\/[^/]+\/SKILL\.md$/.test(file)) {
    const stated = read(file).match(/\*\*Version (\d+\.\d+\.\d+)\.\*\*/)?.[1];
    if (!stated) problems.push({ file, line: 0, kind: "version", message: `No "**Version X.Y.Z.**" line; add one matching meta-KB ${META_VERSION}.` });
    else if (stated !== META_VERSION) problems.push({ file, line: 0, kind: "version", message: `Skill says version ${stated}; the meta-KB is ${META_VERSION}. Update the skill's version line.` });
  }
  if (file === "docs/FORMAT.md") {
    const doc = read(file);
    for (const t of fmt.nodes) if (!doc.includes("`" + t + "`")) problems.push({ file, line: 0, kind: "format-type", message: `Registered node type '${t}' isn't documented.` });
    for (const t of fmt.edges) if (!doc.includes("`" + t + "`")) problems.push({ file, line: 0, kind: "format-type", message: `Registered edge type '${t}' isn't documented.` });
  }
  return problems;
}

/** Paths that only exist after a command runs (PDFs are gitignored, examples are built). */
function isGenerated(p: string): boolean {
  return /^sources\/.*\.pdf$/.test(p) || /^examples\/wine\//.test(p);
}

// Main
const args = process.argv.slice(2);
const json = args.includes("--json");
const files = args.filter((a) => !a.startsWith("--")).map((f) => relative(ROOT, resolve(f)));
const cli = cliSurface();
const rules = ruleKeys();
const fmt = formatTypes();
const scripts = new Set(Object.keys((JSON.parse(read("package.json")) as { scripts: Record<string, string> }).scripts));
const problems = (files.length ? files : DEFAULT_DOCS).filter((f) => existsSync(join(ROOT, f))).flatMap((f) => checkFile(f, cli, rules, fmt, scripts));

if (json) console.log(JSON.stringify(problems, null, 2));
else if (!problems.length) console.log("No drift found in the checked docs.");
else for (const p of problems) console.log(`${p.file}:${p.line}  [${p.kind}] ${p.message}`);
process.exitCode = problems.length ? 1 : 0;
