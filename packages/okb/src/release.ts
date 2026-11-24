/**
 * `okb release <version>` and `okb release verify`: versioned releases of a knowledge base that
 * consumers (an MCP server, an eval run) can pin. A release writes, inside the KB folder:
 *
 *   manifest.json            the pin: id, version, and the SHA-256 of every file (the latest release)
 *   RELEASES.md              every release's change log, newest first
 *   releases/<version>/      manifest.json, okb.json, nodes.jsonl, edges.jsonl as released,
 *                            CHANGES.md and changes.json: what changed since the release before it
 *
 * The change log is `okb diff` between the previous release's snapshot and the working folder, so a
 * release needs no git. The last release is the `version` in `manifest.json`. Output is a function of
 * the files and `SOURCE_DATE_EPOCH` (the date in a change log heading), so cutting the same release
 * twice gives the same bytes. The manifest's shape is the Canvas KB's; docs/FORMAT.md ("Releases")
 * says where it differs.
 */
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { OkbError, Ontology, slug } from "@ontology-kit/reader";
import { today } from "./clock.ts";
import { diffMarkdown, diffOntologies, isEmpty, type OntologyDiff } from "./diff.ts";
import { sourcePath } from "./provenance.ts";
import type { Finding } from "./types.ts";
import type { Notes } from "./ops.ts";

export const MANIFEST_FILE = "manifest.json";
export const RELEASES_DIR = "releases";
const ONTOLOGY_FILES = ["okb.json", "nodes.jsonl", "edges.jsonl"];

/** A dataset in a manifest: a folder (relative to the manifest) and the SHA-256 of the files pinned in it. */
export interface Dataset {
  path: string;
  description?: string;
  files: Record<string, string>;
}

export interface ReleaseManifest {
  id: string;
  version: string;
  title?: string;
  description?: string;
  datasets: { docs?: Dataset; ontology?: Dataset };
  provenance?: Record<string, unknown>;
}

const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;

/** <0 if a is older than b, 0 if equal, >0 if newer. Semver precedence; a version with a pre-release tag is older than the plain one. */
export function compareVersions(a: string, b: string): number {
  const x = SEMVER.exec(a)!;
  const y = SEMVER.exec(b)!;
  for (let i = 1; i <= 3; i++) if (Number(x[i]) !== Number(y[i])) return Number(x[i]) - Number(y[i]);
  if (x[4] === y[4]) return 0;
  if (x[4] === undefined) return 1;
  if (y[4] === undefined) return -1;
  const pa = x[4].split(".");
  const pb = y[4].split(".");
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if (pa[i] === undefined) return -1;
    if (pb[i] === undefined) return 1;
    if (pa[i] === pb[i]) continue;
    const na = /^\d+$/.test(pa[i]);
    const nb = /^\d+$/.test(pb[i]);
    if (na && nb) return Number(pa[i]) - Number(pb[i]);
    if (na !== nb) return na ? -1 : 1;
    return pa[i] < pb[i] ? -1 : 1;
  }
  return 0;
}

export const isVersion = (v: string): boolean => SEMVER.test(v);

const sha256 = (file: string): string => createHash("sha256").update(readFileSync(file)).digest("hex");
const posix = (p: string): string => p.split(sep).join("/");
const sortedRecord = (o: Record<string, string>): Record<string, string> => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
const json = (v: unknown): string => JSON.stringify(v, null, 2) + "\n";

/** Read and check the shape of a manifest.json. Throws OkbError naming the problem. */
export function readReleaseManifest(file: string): ReleaseManifest {
  let raw: any;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    throw new OkbError(`Can't read ${file}: ${(e as Error).message}`);
  }
  const bad = (why: string): never => {
    throw new OkbError(`${file} isn't a valid release manifest: ${why}`);
  };
  if (!raw || typeof raw !== "object") return bad("it should be a JSON object.");
  if (typeof raw.id !== "string" || !raw.id) bad("it has no id.");
  if (typeof raw.version !== "string" || !raw.version) bad("it has no version.");
  if (!raw.datasets || typeof raw.datasets !== "object") bad("it has no datasets.");
  for (const [name, d] of Object.entries<any>(raw.datasets)) {
    if (!d || typeof d.path !== "string" || !d.files || typeof d.files !== "object") bad(`dataset ${name} needs a path and files.`);
    for (const [f, h] of Object.entries(d.files)) if (typeof h !== "string" || !/^[0-9a-f]{64}$/.test(h)) bad(`dataset ${name}: ${f} has no SHA-256 (64 lowercase hex digits).`);
  }
  return raw as ReleaseManifest;
}

/** The registered sources as a dataset: the folder they share and each file's hash. Throws if a source file is missing. */
function sourcesDataset(ont: Ontology): Dataset | undefined {
  const files = new Map<string, string>();
  const missing: string[] = [];
  for (const s of ont.ofType("Source")) {
    if (!s.localPath) continue;
    const abs = resolve(sourcePath(ont, s));
    if (!existsSync(abs) || !statSync(abs).isFile()) missing.push(`${s.title || s.id} (${s.localPath})`);
    else files.set(abs, sha256(abs));
  }
  if (missing.length) throw new OkbError(`Can't release: ${missing.length} source file(s) are missing, so their hashes can't be pinned: ${missing.join(", ")}. Restore them or remove the source nodes.`);
  if (!files.size) return undefined;
  const segs = [...files.keys()].map((f) => dirname(f).split(sep));
  let common = segs[0];
  for (const s of segs) {
    let i = 0;
    while (i < common.length && i < s.length && common[i] === s[i]) i++;
    common = common.slice(0, i);
  }
  const base = common.join(sep) || sep;
  const rel = posix(relative(ont.root, base)) || ".";
  return {
    path: rel,
    description: `${files.size} source file${files.size === 1 ? "" : "s"} that quotes in the ontology cite.`,
    files: sortedRecord(Object.fromEntries([...files].map(([abs, h]) => [posix(relative(base, abs)), h]))),
  };
}

interface SourceChanges {
  added: string[];
  removed: string[];
  changed: string[];
}

function sourceChanges(before: Dataset | undefined, after: Dataset | undefined): SourceChanges {
  const a = before?.files ?? {};
  const b = after?.files ?? {};
  const out: SourceChanges = { added: [], removed: [], changed: [] };
  for (const f of Object.keys(b).sort()) {
    if (!(f in a)) out.added.push(f);
    else if (a[f] !== b[f]) out.changed.push(f);
  }
  for (const f of Object.keys(a).sort()) if (!(f in b)) out.removed.push(f);
  return out;
}

const noSourceChanges = (s: SourceChanges): boolean => !s.added.length && !s.removed.length && !s.changed.length;

function countsLine(ont: Ontology): string {
  const n = (t: "Class" | "Slot" | "Instance" | "Source") => ont.ofType(t).length;
  return `${n("Class")} classes, ${n("Slot")} slots, ${n("Instance")} instances and ${n("Source")} sources.`;
}

/** Whether okb.json differs from the released copy in anything but its version (`okb pin` changes okbVersion alone, and that is pinned too). */
function manifestChanged(snap: string, ont: Ontology): boolean {
  try {
    const was = JSON.parse(readFileSync(join(snap, "okb.json"), "utf8"));
    const strip = (m: Record<string, unknown>) => JSON.stringify(Object.entries(m).filter(([k]) => k !== "version").sort(([a], [b]) => (a < b ? -1 : 1)));
    return strip(was) !== strip(ont.manifest as unknown as Record<string, unknown>);
  } catch {
    return false;
  }
}

/** One release's section of the change log (also the whole of CHANGES.md). */
function changesMarkdown(version: string, previous: string | undefined, date: string, diff: OntologyDiff | undefined, sources: SourceChanges, ont: Ontology, note?: string): string {
  const out: string[] = [`## ${version} (${date})`, ""];
  if (!previous) out.push(`The first release: ${countsLine(ont)}`, "");
  else out.push(`Changes since ${previous}.`, "");
  if (note) out.push(note, "");
  if (diff) {
    // the diff's own Markdown, one heading level down
    const body = diffMarkdown(diff).split("\n").slice(2).join("\n").replace(/^## /gm, "### ").trimEnd();
    out.push(body, "");
  }
  if (!noSourceChanges(sources) && previous) {
    out.push("### Source files", "");
    for (const f of sources.added) out.push(`- **Added** \`${f}\``);
    for (const f of sources.removed) out.push(`- **Removed** \`${f}\``);
    for (const f of sources.changed) out.push(`- **Changed** \`${f}\``);
    out.push("");
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

/** The versions that have a releases/<version>/ folder, newest first. */
function releasedVersions(root: string): string[] {
  const dir = join(root, RELEASES_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && isVersion(e.name) && existsSync(join(dir, e.name, "CHANGES.md")))
    .map((e) => e.name)
    .sort((a, b) => compareVersions(b, a));
}

function writeReleasesMd(root: string, name: string): void {
  const sections = releasedVersions(root).map((v) => readFileSync(join(root, RELEASES_DIR, v, "CHANGES.md"), "utf8").trimEnd());
  writeFileSync(join(root, "RELEASES.md"), `# Releases of ${name}\n\nEach release's changes, newest first. \`manifest.json\` pins the latest one; \`okb release verify\` checks the files against it.\n\n${sections.join("\n\n")}\n`);
}

export interface ReleaseResult {
  version: string;
  previous?: string;
  manifest: ReleaseManifest;
  notes: Notes;
}

/**
 * Cut release `version` of the folder `ont` was loaded from. Call it inside `Ontology.edit` (it saves
 * and writes files under the lock). `findings` are the validator's results; any open error stops the release.
 * Writes nothing when it refuses.
 */
export function cutRelease(ont: Ontology, version: string, findings: Finding[]): ReleaseResult {
  if (!isVersion(version)) throw new OkbError(`'${version}' isn't a version. Use semver: 1.0.0, 1.2.3 or 2.0.0-rc.1.`);
  const errors = findings.filter((f) => f.severity === "error" && !f.explainedBy);
  if (errors.length) {
    throw new OkbError(`Can't release: okb validate reports ${errors.length} error(s). Fix them first (okb validate shows them). The first: ${errors[0].message}`);
  }
  const root = ont.root;
  const lastFile = join(root, MANIFEST_FILE);
  const last = existsSync(lastFile) ? readReleaseManifest(lastFile) : undefined;
  if (last && isVersion(last.version) && compareVersions(version, last.version) <= 0) {
    throw new OkbError(`Version ${version} isn't newer than the last release, ${last.version}. Pick a higher version.`);
  }
  // The root manifest.json is what makes a release exist, and it is written last. So a releases/<version>/
  // folder for a version newer than the one it pins is what a release that stopped half-way leaves (even when
  // the folder's own manifest.json got written), and it is written over. A finished release is never newer
  // than the pinned one, so the check above already refuses to rewrite it.

  const docs = sourcesDataset(ont);
  let diff: OntologyDiff | undefined;
  let note: string | undefined;
  if (last) {
    const snap = join(root, RELEASES_DIR, last.version);
    if (existsSync(join(snap, "nodes.jsonl")) && existsSync(join(snap, "okb.json"))) {
      diff = diffOntologies(Ontology.load(snap), ont, last.version, version);
    } else note = `There's no snapshot of ${last.version} in ${RELEASES_DIR}/, so this release can't list what changed in the knowledge.`;
  }
  const sources = sourceChanges(last?.datasets.docs, docs);
  if (diff && isEmpty(diff) && !diff.summary.stampOnly && noSourceChanges(sources) && !manifestChanged(join(root, RELEASES_DIR, last!.version), ont)) {
    throw new OkbError(`Nothing has changed since ${last!.version}, so there is nothing to release.`);
  }

  const date = today(); // an invalid SOURCE_DATE_EPOCH stops here, before anything is written
  // Everything is checked; from here on it writes.
  ont.manifest.version = version;
  ont.save();
  const ontologyFiles = Object.fromEntries(ONTOLOGY_FILES.map((f) => [f, sha256(join(root, f))]));
  const manifest: ReleaseManifest = {
    id: last?.id ?? (slug(ont.meta.name || ont.manifest.name || "") || "ontology"),
    version,
    title: ont.meta.name || ont.manifest.name || last?.title,
    ...(last?.description ? { description: last.description } : {}),
    datasets: {
      ...(docs ? { docs } : {}),
      ontology: {
        path: ".",
        description: `okb graph (${ont.manifest.format}): ${ont.nodes.length} nodes and ${ont.edges.length} edges. Pinned files only; the folder also holds ${MANIFEST_FILE}, ${RELEASES_DIR}/ and RELEASES.md.`,
        files: sortedRecord(ontologyFiles),
      },
    },
    ...(last?.provenance ? { provenance: last.provenance } : {}),
  };
  const snap = join(root, RELEASES_DIR, version);
  mkdirSync(snap, { recursive: true });
  for (const f of ONTOLOGY_FILES) copyFileSync(join(root, f), join(snap, f));
  writeFileSync(join(snap, "changes.json"), json({ version, previous: last?.version ?? null, changes: diff ?? null, sources }));
  writeFileSync(join(snap, "CHANGES.md"), changesMarkdown(version, last?.version, date, diff, sources, ont, note));
  writeReleasesMd(root, manifest.title ?? manifest.id);
  // The manifests go last: they are what makes the release exist, so a failure above leaves nothing pinned.
  // Dataset paths are relative to the manifest, so the snapshot's copy points at the sources from its own folder.
  const snapManifest = { ...manifest, datasets: { ...manifest.datasets, ...(docs ? { docs: { ...docs, path: posix(relative(snap, resolve(root, docs.path))) || "." } } : {}) } };
  writeFileSync(join(snap, MANIFEST_FILE), json(snapManifest));
  writeFileSync(lastFile, json(manifest));

  const notes: Notes = [`Released ${version}${last ? ` (was ${last.version})` : ""}: ${countsLine(ont)}`];
  if (diff) {
    const s = diff.summary;
    notes.push(`Since ${last!.version}: ${s.nodesAdded} node(s) added, ${s.nodesRemoved} removed, ${s.nodesChanged} changed; ${diff.relationshipTypeRenames.length} edge type(s) renamed.`);
  }
  if (note) notes.push(note);
  notes.push(`Wrote ${MANIFEST_FILE}, RELEASES.md and ${join(RELEASES_DIR, version)}/. Commit them, and tag the commit if you want a git ref for ${version}.`);
  return { version, previous: last?.version, manifest, notes };
}

export interface VerifyResult {
  id: string;
  version: string;
  ok: boolean;
  checked: number;
  problems: string[];
}

/** Check the files in `root` against its manifest.json. Read-only. */
export function verifyRelease(root: string): VerifyResult {
  const file = join(root, MANIFEST_FILE);
  if (!existsSync(file)) throw new OkbError(`There is no ${MANIFEST_FILE} in ${resolve(root)}. Cut a release first: okb release <version>.`);
  const m = readReleaseManifest(file);
  const problems: string[] = [];
  let checked = 0;
  // The knowledge itself must be pinned: a manifest that leaves out the ontology files would verify anything.
  for (const f of ONTOLOGY_FILES) if (!m.datasets.ontology?.files[f]) problems.push(`ontology: ${f} isn't pinned in the manifest`);
  const inside = (base: string, p: string) => !relative(base, p).startsWith("..") && !isAbsolute(relative(base, p));
  for (const [name, d] of Object.entries(m.datasets) as [string, Dataset][]) {
    const dir = resolve(root, d.path);
    if (!existsSync(dir) || !statSync(dir).isDirectory()) {
      problems.push(`${name}: folder ${d.path} is missing`);
      continue;
    }
    for (const [f, expected] of Object.entries(d.files).sort(([p], [q]) => (p < q ? -1 : 1))) {
      checked++;
      const p = join(dir, f);
      if (!inside(dir, p)) problems.push(`${name}: ${f} points outside its folder`);
      else if (!existsSync(p) || !statSync(p).isFile()) problems.push(`${name}: ${f} is missing`);
      else {
        const got = sha256(p);
        if (got !== expected) problems.push(`${name}: ${f} differs from the release (SHA-256 ${got.slice(0, 12)}…, the manifest says ${expected.slice(0, 12)}…)`);
      }
    }
  }
  try {
    const v = JSON.parse(readFileSync(join(root, "okb.json"), "utf8")).version;
    if (v !== m.version) problems.push(`okb.json says version ${v ?? "(none)"}, the manifest says ${m.version}`);
  } catch {
    // an unreadable okb.json shows up above as a hash mismatch or a missing file
  }
  return { id: m.id, version: m.version, ok: problems.length === 0, checked, problems };
}
