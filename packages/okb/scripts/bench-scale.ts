/**
 * Scale benchmark: build, validate and export an ontology of 1k, 10k and 50k nodes (an icon KB with tags
 * reaches about 10k). Not part of `pnpm test`; run it with `pnpm bench` (or `node packages/okb/scripts/bench-scale.ts 1000 10000`).
 * It builds in memory through the same ops the CLI uses, so it times what a real build does, including the name lookups.
 * Nothing is written to disk.
 */
import { Ontology } from "@ontology-kit/reader";
import { runChecks } from "../src/checks.ts";
import { exportGraph, toCypher } from "../src/export.ts";
import * as ops from "../src/ops.ts";

const SIZES = process.argv.slice(2).map(Number).filter((n) => n > 0);
const sizes = SIZES.length ? SIZES : [1_000, 10_000, 50_000];
// Pinned so the numbers don't depend on the clock or random id tags.
process.env.SOURCE_DATE_EPOCH ??= "1700000000";

function ms(t0: number): string {
  return `${((performance.now() - t0) / 1000).toFixed(2)} s`;
}

function build(total: number): Ontology {
  const ont = Ontology.fromData([
    { type: "Ontology", id: "ontology", name: "Bench", domain: "icons", purpose: "benchmark", users: [], maintainers: [], outOfScope: [], kind: "application", reuseReviewed: false },
  ], []);
  const classCount = Math.max(5, Math.round(total / 100));
  ops.addClass(ont, "Icon", { abstract: true });
  for (let c = 0; c < classCount; c++) ops.addClass(ont, `IconGroup${c}`, { parents: ["Icon"] });
  ops.addSlot(ont, "category", { on: ["Icon"], type: "String" });
  ops.addSlot(ont, "relatedTo", { on: ["Icon"], type: "Instance", range: ["Icon"], card: "multiple" });
  const instances = total - classCount - 4;
  for (let i = 0; i < instances; i++) {
    const links = i > 0 ? [`relatedTo=Icon ${i - 1}`] : [];
    ops.addInstance(ont, `Icon ${i}`, { of: [`IconGroup${i % classCount}`], assignments: [`category=tag${i % 50}`, ...links] });
  }
  return ont;
}

console.log(`node ${process.version}  SOURCE_DATE_EPOCH=${process.env.SOURCE_DATE_EPOCH}`);
console.log("nodes    build     validate  export    findings  edges");
for (const size of sizes) {
  let t = performance.now();
  const ont = build(size);
  const built = ms(t);
  t = performance.now();
  const report = runChecks(ont, { all: true });
  const validated = ms(t);
  t = performance.now();
  toCypher(exportGraph(ont));
  const exported = ms(t);
  console.log(`${String(ont.nodes.length).padEnd(8)} ${built.padEnd(9)} ${validated.padEnd(9)} ${exported.padEnd(9)} ${String(report.findings.length).padEnd(9)} ${ont.edges.length}`);
}
