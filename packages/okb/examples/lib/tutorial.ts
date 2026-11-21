/**
 * The tutorial engine. A tutorial is a folder of markdown sources, `examples/<name>/tutorial-src/N-slug.md`:
 * plain prose, plus code blocks tagged `okb` that hold only commands. The engine runs every command, in
 * file order, with the real CLI, and writes:
 *
 *   examples/<name>/tutorial/N-slug.md       each source with every `okb` block replaced by a `bash` block of the
 *                                            commands and a `text` block of the output okb printed, so a reader
 *                                            can copy the commands alone (a "generated, don't edit" header on top)
 *   examples/<name>/tutorial/graph/step-N.json   the ontology's nodes and edges after step N's page
 *   examples/<name>/TRANSCRIPT.md            every command and its output together (`$ okb ...`), for readers on GitHub
 *
 * With `pages: false` the engine still runs every command and writes the graph snapshots and the transcript,
 * but writes no `tutorial/N-slug.md` pages, so a tutorial that isn't on the site yet leaves no pages behind.
 *
 * The ontology files themselves (okb.json, nodes.json, ...) are whatever the commands make. The sources
 * are the only hand-written files in the folder; everything else is rebuilt (and deleted first) each run.
 *
 * A block tagged `okb` holds one command per line (a trailing `\` continues a line). The first word is
 * `okb` and is dropped. A block tagged `okb fails` holds commands that must exit with an error; the error
 * text becomes the output. Any other failure stops the build and names the file and command.
 *
 * A block tagged `include` holds a file name. It is replaced by that file's contents, so a page can show
 * what an earlier command wrote (the diagram's Mermaid block, for example).
 *
 * `okb init <folder>` runs from the example's parent folder (so the folder name is the example's name);
 * every other command runs inside the example folder.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const CLI = join(ROOT, "src", "cli.ts");

export const SRC_DIR = "tutorial-src";
export const OUT_DIR = "tutorial";

export interface TutorialConfig {
  /** The example's folder, for example `<repo>/examples/wine`. */
  dir: string;
  /** The date okb records, YYYY-MM-DD. Every run on every day gives the same files. */
  date: string;
  /** Write the tutorial pages (`tutorial/N-slug.md`). Defaults to true; false keeps the graph snapshots and the transcript only. */
  pages?: boolean;
  /** The heading and opening paragraphs of TRANSCRIPT.md. */
  transcript: { title: string; intro: string[] };
}

export interface BuiltPage {
  /** The source file name, for example `1-scope.md`. */
  file: string;
  /** The number in the file name; 0 is the introduction. */
  number: number;
  /** The page's level-1 heading. */
  title: string;
  /** Every command block on the page, with its output. */
  blocks: string[];
}

/** Splits a command line into arguments the way a shell would: spaces separate, quotes group, `\` escapes. */
export function splitArgs(line: string): string[] {
  const args: string[] = [];
  let cur = "";
  let inArg = false;
  let quote: string | undefined;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      if (ch === quote) quote = undefined;
      else if (ch === "\\" && quote === '"' && /["\\]/.test(line[i + 1] ?? "")) cur += line[++i];
      else cur += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      inArg = true;
    } else if (ch === "\\" && i + 1 < line.length) {
      cur += line[++i];
      inArg = true;
    } else if (/\s/.test(ch)) {
      if (inArg) args.push(cur);
      cur = "";
      inArg = false;
    } else {
      cur += ch;
      inArg = true;
    }
  }
  if (quote) throw new Error(`unclosed ${quote} in: ${line}`);
  if (inArg) args.push(cur);
  return args;
}

/** The commands in a block's lines: a trailing backslash joins a line to the next. `shown` keeps the lines as written. */
function commandLines(lines: string[]): { text: string; shown: string }[] {
  const out: { text: string; shown: string }[] = [];
  let pending = "";
  let written: string[] = [];
  for (const raw of lines) {
    const line = raw.trimEnd();
    written.push(line);
    if (line.endsWith("\\")) {
      pending += line.slice(0, -1) + " ";
      continue;
    }
    const text = (pending + line).trim();
    if (text) out.push({ text, shown: written.join("\n") });
    pending = "";
    written = [];
  }
  if (pending.trim()) out.push({ text: pending.trim(), shown: written.join("\n") });
  return out;
}

function sourceFiles(dir: string): string[] {
  const src = join(dir, SRC_DIR);
  if (!existsSync(src)) throw new Error(`${src} not found: a tutorial needs a ${SRC_DIR}/ folder`);
  const files = readdirSync(src).filter((f) => f.endsWith(".md"));
  for (const f of files) if (!/^\d+-[a-z0-9-]+\.md$/.test(f)) throw new Error(`${SRC_DIR}/${f}: tutorial pages are named N-slug.md, like 1-scope.md`);
  return files.sort((a, b) => parseInt(a) - parseInt(b));
}

export function buildTutorial(cfg: TutorialConfig): BuiltPage[] {
  const { dir } = cfg;
  const files = sourceFiles(dir);
  const env = { ...process.env, NO_COLOR: "1", SOURCE_DATE_EPOCH: String(Date.parse(`${cfg.date}T00:00:00Z`) / 1000) };
  // okb prints absolute paths (`Created ontology ... in /home/you/.../wine`). Show them relative to where the command ran.
  const hide = (text: string, cwd: string) => {
    for (const base of new Set([realpathSync(cwd), cwd])) text = text.split(`${base}/`).join("");
    return text;
  };

  // Rebuild from nothing: delete everything but the sources.
  mkdirSync(dir, { recursive: true });
  for (const entry of readdirSync(dir)) if (entry !== SRC_DIR) rmSync(join(dir, entry), { recursive: true, force: true });
  mkdirSync(join(dir, OUT_DIR, "graph"), { recursive: true });

  const pages: BuiltPage[] = [];
  for (const file of files) {
    const where = `${SRC_DIR}/${file}`;
    const lines = readFileSync(join(dir, SRC_DIR, file), "utf8").split("\n");
    const out: string[] = [];
    const blocks: string[] = [];
    let title = "";
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!title && /^# /.test(line)) title = line.slice(2).trim();
      const fence = /^```(\S*)\s*(.*)$/.exec(line);
      if (!fence) {
        out.push(line);
        continue;
      }
      // Find the closing fence, whatever the block is.
      let end = i + 1;
      while (end < lines.length && !/^```\s*$/.test(lines[end])) end++;
      if (end >= lines.length) throw new Error(`${where}:${i + 1}: code block is never closed`);
      const body = lines.slice(i + 1, end);
      if (fence[1] === "include") {
        // A file an earlier command wrote (a diagram, say), pasted in as it is.
        const name = body.join("\n").trim();
        const file = join(dir, name);
        if (!name || !file.startsWith(`${dir}/`) || !existsSync(file)) throw new Error(`${where}:${i + 1}: include: no file '${name}' in the example folder (an earlier command must write it)`);
        out.push(readFileSync(file, "utf8").trimEnd());
        i = end;
        continue;
      }
      if (fence[1] !== "okb") {
        out.push(...lines.slice(i, end + 1));
        i = end;
        continue;
      }
      const mustFail = fence[2].trim() === "fails";
      if (fence[2].trim() && !mustFail) throw new Error(`${where}:${i + 1}: unknown option '${fence[2].trim()}' after okb (the only one is 'fails')`);
      const asWrittenLines: string[] = [];
      const outputs: string[] = [];
      const transcript: string[] = [];
      for (const { text, shown: asWritten } of commandLines(body)) {
        const words = splitArgs(text);
        if (words[0] !== "okb") throw new Error(`${where}:${i + 1}: every command starts with 'okb': ${text}`);
        const args = words.slice(1);
        const cwd = args[0] === "init" ? dirname(dir) : dir;
        let output: string;
        let failed = false;
        try {
          output = execFileSync(process.execPath, [CLI, ...args], { cwd, encoding: "utf8", env, stdio: ["ignore", "pipe", "pipe"] });
        } catch (e: any) {
          failed = true;
          output = (e.stdout ?? "") + (e.stderr ?? "");
          if (!mustFail) throw new Error(`${where}:${i + 1}: command failed: ${text}\n${output}`);
        }
        if (mustFail && !failed) throw new Error(`${where}:${i + 1}: this command should have failed, but it worked: ${text}`);
        const printed = hide(output, cwd).trimEnd();
        asWrittenLines.push(asWritten);
        if (printed) outputs.push(printed);
        transcript.push(`$ ${asWritten}`, ...(printed ? [printed] : []));
      }
      // On a page the commands and their output are separate blocks, so a reader can copy the
      // commands alone. The transcript keeps them together, the way a terminal shows them.
      out.push(["```bash", ...asWrittenLines, "```"].join("\n"));
      if (outputs.length) out.push("", ["```text", outputs.join("\n\n"), "```"].join("\n"));
      blocks.push(["```console", ...transcript, "```"].join("\n"));
      i = end;
    }
    if (!title) throw new Error(`${where}: no level-1 heading`);
    const header = `<!-- Generated by \`pnpm example\` from ${SRC_DIR}/${file}. Don't edit this file: edit the source and rebuild. -->`;
    if (cfg.pages !== false) writeFileSync(join(dir, OUT_DIR, file), `${header}\n\n${out.join("\n").replace(/\s+$/, "")}\n`);
    const number = parseInt(file);
    pages.push({ file, number, title, blocks });
    // The graph as it stands after this step, for pages that draw it growing.
    if (number >= 1) {
      const graph = { step: number, nodes: JSON.parse(readFileSync(join(dir, "nodes.json"), "utf8")), edges: JSON.parse(readFileSync(join(dir, "edges.json"), "utf8")) };
      writeFileSync(join(dir, OUT_DIR, "graph", `step-${number}.json`), JSON.stringify(graph, null, 2) + "\n");
    }
  }

  const md = [`# ${cfg.transcript.title}`, "", ...cfg.transcript.intro.flatMap((p) => [p, ""])];
  for (const p of pages) md.push(`## ${p.title}`, "", ...p.blocks.flatMap((b) => [b, ""]));
  writeFileSync(join(dir, "TRANSCRIPT.md"), md.join("\n").replace(/\s+$/, "") + "\n");
  return pages;
}
