/**
 * Generates the reference docs in docs/ from the meta-KB, so the docs can never
 * disagree with what okb enforces. Run: npm run docs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MetaKB } from "./metakb.ts";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const meta = MetaKB.get();
const HEADER = (title: string) => [`# ${title}`, "", `> Generated from the meta-KB (v${meta.version}) by \`npm run docs\`. Don't edit by hand: change \`meta-kb/src/*.yaml\` and regenerate.`, ""];

function sources(id: string): string[] {
  return meta.citations(id).map((l) => `> “${l.quote}”  \n> — ${meta.citeLine(l)}`);
}

// ------------------------------------------------------------------ METHOD
const method = HEADER("The method: eight steps");
method.push(
  "Ontology 101 (Noy & McGuinness, 2001) describes seven steps. The toolkit adds an eighth, **Review and iterate**, which makes explicit the paper's instruction to stand back, test the ontology against its competency questions, and revise it.",
  "",
  "## Principles to keep in mind throughout",
  "",
);
for (const p of meta.ofType("Principle")) method.push(`- **${p.name}.** ${p.plainLanguage}`);
method.push("");
for (const s of meta.steps) {
  method.push(`## Step ${s.order}: ${s.name}`, "", `**Goal:** ${s.goal}`, "", `**Why it matters:** ${s.whyItMatters}`, "", "**Questions to answer**", "");
  for (const q of s.guidingQuestions) method.push(`- ${q}`);
  method.push("", "**You're done when**", "");
  for (const d of s.doneWhen) method.push(`- [ ] ${d.text}${d.check ? "" : " *(your judgment)*"}`);
  if (s.tips?.length) {
    method.push("", "**Tips**", "");
    for (const t of s.tips) method.push(`- ${t}`);
  }
  if (s.wine) method.push("", `**Wine example:** ${s.wine}`);
  const decisions = meta.targets(s.id, "USES").map((d) => meta.node(d, "Decision"));
  if (decisions.length) method.push("", `**Decision guides:** ${decisions.map((d) => `[${d.name}](DECISIONS.md#${d.id.replace(".", "")})`).join(" · ")}`);
  const rules = meta.targets(s.id, "APPLIES").map((r) => meta.node(r, "Rule").key);
  if (rules.length) method.push("", `**Rules checked from this step:** ${rules.map((r) => `[\`${r}\`](RULES.md#${r})`).join(", ")}`);
  if (s.commands?.length) method.push("", `**Commands:** ${s.commands.map((x) => `\`${x}\``).join(", ")}`);
  method.push("", "<details><summary>Source passages</summary>", "", ...sources(s.id).flatMap((x) => [x, ""]), "</details>", "");
}

// ------------------------------------------------------------------ GLOSSARY
const glossary = HEADER("Glossary");
glossary.push("Every term a beginner meets while building an ontology, in plain language first. `okb explain <term>` shows the same entry in the terminal.", "");
const concepts = [...meta.ofType("Concept")].sort((a, b) => a.name.localeCompare(b.name));
glossary.push(concepts.map((c) => `[${c.name}](#${anchor(c.name)})`).join(" · "), "");
for (const c of concepts) {
  glossary.push(`## ${c.name}`, "");
  if (c.aliases?.length) glossary.push(`*Also called:* ${c.aliases.join(", ")}`, "");
  glossary.push(c.plainLanguage, "", `**Definition.** ${c.definition}`, "");
  if (c.example) glossary.push(`**Example.** ${c.example}`, "");
  if (c.inThisToolkit) glossary.push(`**In okb.** ${c.inThisToolkit}`, "");
  if (c.origin === "operational") glossary.push("*A toolkit concept (not from the sources).*", "");
  glossary.push(...sources(c.id).flatMap((x) => [x, ""]));
}

// ------------------------------------------------------------------ RULES
const rules = HEADER("Rules");
rules.push(
  "What `okb validate` checks, and what the ontology-review skill asks about. Each rule's **modality** comes from the wording of the passage it cites (see *Modality* in the [glossary](GLOSSARY.md)):",
  "",
  "| Modality | Severity | Meaning |",
  "|---|---|---|",
  "| MUST / MUST NOT | error | Fix it. A design decision can't waive it. |",
  "| SHOULD / SHOULD NOT | warning | Fix it, or record a design decision that explains why not (`okb decision add --waives <rule>`). |",
  "| MAY | info | A hint worth considering. |",
  "",
  "**Basis:** *direct* = the source states the rule · *interpretive* = follows from a source definition (the gap is explained) · *operational* = a toolkit convention with no source.  ",
  "**Check:** *mechanical* = okb checks it exactly · *heuristic* = okb flags likely cases (false positives possible) · *judgment* = a person decides (the review skill asks the question shown).",
  "",
  "| Rule | Modality | Severity | Check | Basis | From step |",
  "|---|---|---|---|---|---|",
);
const allRules = meta.ofType("Rule");
for (const r of allRules) rules.push(`| [\`${r.key}\`](#${r.key}) | ${r.modality.replace("_", " ")} | ${r.severity} | ${r.check} | ${r.basis} | ${r.fromStep} |`);
rules.push("");
for (const r of allRules) {
  rules.push(`## ${r.key}`, "", `**${r.modality.replace("_", " ")}** · ${r.severity} · ${r.check} · basis: ${r.basis} · from step ${r.fromStep}`, "", r.statement, "", `*In plain words:* ${r.plainLanguage}`, "", `*Why:* ${meta.rationale(r)}`, "");
  if (r.severityReason) rules.push(`*Severity note:* ${r.severityReason}`, "");
  if (r.review) rules.push(`*Ask yourself:* ${r.review}`, "");
  if (r.fix) rules.push(`*Fix:* ${r.fix}`, "");
  rules.push(...sources(r.id).flatMap((x) => [x, ""]));
}

// ------------------------------------------------------------------ DECISIONS
const decisions = HEADER("Decision guides");
decisions.push("The recurring \"which way do I model this?\" questions, as short yes/no walkthroughs. Remember there's no single right answer; record what you chose with `okb decision add`.", "");
for (const d of meta.ofType("Decision")) {
  decisions.push(`<a id="${d.id.replace(".", "")}"></a>`, `## ${d.name}`, "", `*When:* ${d.whenYouFaceIt}`, "");
  (d.tests as any[]).forEach((t, i) => {
    const yes = t.ifYes === "continue" ? "go to the next question" : t.ifYes;
    const no = t.ifNo === "continue" ? "go to the next question" : t.ifNo;
    decisions.push(`${i + 1}. **${t.ask}**  `, `   Yes → ${yes}  `, `   No → ${no}`, "");
  });
  if (d.note) decisions.push(d.note, "");
  if (d.wine) decisions.push(`**Wine example:** ${d.wine}`, "");
  decisions.push(...sources(d.id).flatMap((x) => [x, ""]));
}

function anchor(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9 -]/g, "").trim().replace(/ /g, "-");
}

const out: [string, string[]][] = [["METHOD.md", method], ["GLOSSARY.md", glossary], ["RULES.md", rules], ["DECISIONS.md", decisions]];
for (const [f, lines] of out) writeFileSync(join(ROOT, "docs", f), lines.join("\n") + "\n");
console.log(`Wrote ${out.map(([f]) => "docs/" + f).join(", ")}`);
