/**
 * Generates the reference docs in docs/ from the meta-KB, so the docs can never
 * disagree with what okb enforces. Run: pnpm run docs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MetaKB } from "./metakb.ts";
import { anchorId } from "./site.ts";
import { renderCheatSheet, renderCliDocs } from "./clidocs.ts";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const meta = MetaKB.get();
// Anchor ids (`concept.class` → `concept-class`) come from src/site.ts. Links use these, never heading slugs.
const anchorTag = (id: string) => `<a id="${anchorId(id)}"></a>`;
const HEADER = (title: string) => [`# ${title}`, "", `<!-- Generated from the meta-KB (v${meta.version}) by \`pnpm run docs\`. Don't edit by hand: change \`meta-kb/src/*.yaml\` and regenerate. -->`, ""];

function sources(id: string): string[] {
  return meta.citations(id).map((l) => `> “${l.quote}”  \n> — ${meta.citeLine(l)}`);
}

/** An empty placeholder the docs site fills with a page-level filter box. GitHub shows nothing. */
const filterBox = (label: string) => `<div class="entry-filter" data-label="${label}"></div>`;

/** Text like "<child>" would be read as an HTML tag inside a card, so escape `<` outside code spans. */
const escapeAngles = (text: string) => text.split("`").map((part, i) => (i % 2 ? part : part.replace(/</g, "&lt;"))).join("`");

type CardRow = [label: string, markdown: string | undefined, tone?: "muted"];
/**
 * One reference entry as a card: a heading, labeled rows, and the source quotes folded away at the
 * bottom. It is plain HTML around markdown, so it reads fine on GitHub too and the docs site
 * styles `.entry`, `.row` and `.label`. Rows with no text are left out.
 */
function card(c: {
  id: string;
  title: string;
  level?: 2 | 3;
  chips?: [text: string, tone?: string][];
  rows: CardRow[];
  sources: string[];
}): string[] {
  const chips = (c.chips ?? []).map(([text, tone]) => `<span class="chip${tone ? ` ${tone}` : ""}">${text}</span>`).join(" ");
  const out = ['<section class="entry">', "", '<div class="head">', "", anchorTag(c.id), `${"#".repeat(c.level ?? 2)} ${c.title}`, ""];
  if (chips) out.push(`<p class="chips">${chips}</p>`, "");
  out.push("</div>", "");
  for (const [label, text, tone] of c.rows) {
    if (!text) continue;
    out.push(`<div class="row${tone ? ` ${tone}` : ""}">`, `<span class="label">${label}</span>`, "", escapeAngles(text), "", "</div>", "");
  }
  if (c.sources.length) {
    const n = c.sources.length;
    out.push(`<details class="sources"><summary>${n === 1 ? "Source" : `Sources (${n})`}</summary>`, "", ...c.sources.flatMap((x) => [x, ""]), "</details>", "");
  }
  out.push("</section>", "");
  return out;
}

/** A bold label that sits above a block (a paragraph or a list). The docs site tightens the gap below it; GitHub shows plain bold. */
const blockLabel = (text: string) => `<p class="block-label"><strong>${text}</strong></p>`;

// METHOD.md
const method = HEADER("The method: eight steps");
method.push(
  "Ontology 101 (Noy & McGuinness, 2001) describes seven steps. The toolkit adds an eighth, **Review and iterate**, which makes explicit Ontology 101's instruction to stand back, test the ontology against its competency questions, and revise it.",
  "",
  "## Principles to keep in mind throughout",
  "",
);
for (const p of meta.ofType("Principle")) method.push(`### ${p.name}`, "", p.plainLanguage, "");
for (const s of meta.steps) {
  method.push(anchorTag(s.id), `## Step ${s.order}: ${s.name}`, "", blockLabel("Goal"), "", s.goal, "", blockLabel("Why it matters"), "", s.whyItMatters, "", blockLabel("Questions to answer"), "");
  for (const q of s.guidingQuestions) method.push(`- ${q}`);
  method.push("", blockLabel("You're done when"), "");
  for (const d of s.doneWhen) method.push(`- [ ] ${d.text}${d.check ? "" : " *(your judgment)*"}`);
  if (s.tips?.length) {
    method.push("", blockLabel("Tips"), "");
    for (const t of s.tips) method.push(`- ${t}`);
  }
  if (s.wine) {
    // One line is a sentence; several lines are a list. A callout, like the "Good to know" notes on the decision guides.
    const lines = s.wine.split("\n");
    method.push("", `> ${blockLabel("In the wine example")}`, ">", ...(lines.length > 1 ? lines.map((l) => `> - ${l}`) : [`> ${lines[0]}`]));
  }
  const decisions = meta.targets(s.id, "USES").map((d) => meta.node(d, "Decision"));
  if (decisions.length) method.push("", blockLabel("Decision guides"), "", ...decisions.map((d) => `- [${d.name}](DECISIONS.md#${anchorId(d.id)})`));
  method.push("", "<details><summary>Source passages</summary>", "", ...sources(s.id).flatMap((x) => [x, ""]), "</details>", "");
}

// GLOSSARY.md
// The glossary page opens with a tip, not the generated-file notice or an A–Z index: readers
// arrive from a link to one term. The notice stays as an HTML comment for people editing the file.
const glossary = [
  "# Glossary",
  "",
  `<!-- Generated from the meta-KB (v${meta.version}) by \`pnpm run docs\`. Don't edit by hand: change \`meta-kb/src/*.yaml\` and regenerate. -->`,
  "",
  "> **Tip:** You can read any entry in your terminal too. Run `okb explain <term>` (for example `okb explain class`) while you work.",
  "",
];
const concepts = [...meta.ofType("Concept")].sort((a, b) => a.name.localeCompare(b.name));
glossary.push(filterBox("Filter terms"), "");
for (const c of concepts) {
  glossary.push(
    ...card({
      id: c.id,
      title: c.name,
      rows: [
        ["Definition", c.definition],
        ["In plain words", c.plainLanguage],
        ["Example", c.example],
        ["Also called", c.aliases?.join(", ")],
        ["In okb", c.inThisToolkit, "muted"],
        ["Origin", c.origin === "operational" ? "A toolkit concept, not from the sources." : undefined, "muted"],
      ],
      sources: sources(c.id),
    }),
  );
}

// RULES.md
const rules = HEADER("Rules");
rules.push(
  "A rule is one thing okb checks about your ontology, such as \"a class can't be its own ancestor\" or \"every slot says what kind of value it holds\". `okb validate` runs them and reports the ones your ontology breaks. The ontology-review skill asks about the ones only a person can judge.",
  "",
  "Most rules come from *Ontology 101* (Noy & McGuinness, 2001), the paper the [method](METHOD.md) is based on. When a rule says it comes \"from the source\", it means that paper, and the quotes in each rule's Sources section are its own words.",
  "",
  "<details><summary>How to read a rule</summary>",
  "",
  "Each rule is a card. The title is the rule's name, which is what `okb validate` prints. The small tags under it say how strict the rule is, how it is checked, where it comes from, and when it starts to matter. The rows give the details:",
  "",
  "| Row | What it tells you |",
  "|---|---|",
  "| Rule | What must hold, stated exactly. |",
  "| In plain words | The same thing, said simply. |",
  "| Why | The reason the rule exists. |",
  "| Ask yourself | A question to put to your own ontology. Shown only on rules a person has to judge. |",
  "| How to fix | What to change when the rule is broken. |",
  "| Severity | Why okb treats a rule more strictly or more loosely than its wording suggests. Shown only when it does. |",
  "| Sources | The passages the rule is based on, folded away at the bottom of the card. |",
  "",
  "**How strict: modality and severity**",
  "",
  "The first tag combines the rule's **modality** with its **severity**. The modality comes from the wording of the passage the rule cites: MUST, SHOULD or MAY (see *Modality* in the [glossary](GLOSSARY.md)). The severity is what `okb validate` reports.",
  "",
  "| Modality | Severity | Meaning |",
  "|---|---|---|",
  "| MUST / MUST NOT | error | Fix it. A design decision can't waive it. |",
  "| SHOULD / SHOULD NOT | warning | Fix it, or record a design decision that explains why not (`okb decision add --waives <rule>`). |",
  "| MAY | info | A hint worth considering. |",
  "",
  "**How it is checked, and where it comes from**",
  "",
  "- **Automatic check:** okb checks it exactly.",
  "- **Likely-case check:** okb flags likely cases, so it can be wrong.",
  "- **You decide:** only a person can judge it. The review skill asks the question shown under *Ask yourself*.",
  "- **From the source:** the source states the rule.",
  "- **Follows from the source:** it follows from a source definition, and the gap is explained under *Why*.",
  "- **Toolkit convention:** okb's own rule, with no source.",
  "- **From step N:** `okb validate` hides the rule until you reach step N of the [method](METHOD.md), unless it's an error.",
  "",
  "</details>",
  "",
  "## All rules",
  "",
  filterBox("Filter rules (try “error”, “slot” or “naming”)"),
  "",
);
const CHECK_LABEL = { mechanical: "Automatic check", heuristic: "Likely-case check", judgment: "You decide" } as Record<string, string>;
const BASIS_LABEL = { direct: "From the source", interpretive: "Follows from the source", operational: "Toolkit convention" } as Record<string, string>;
const RULE_GROUPS: [name: string, prefixes: string[]][] = [
  ["Class hierarchy", ["hier"]],
  ["Instances", ["inst"]],
  ["Slots and facets", ["slot"]],
  ["Disjoint classes", ["disjoint"]],
  ["Naming", ["naming"]],
  ["Scope and documentation", ["scope", "doc", "reuse", "terms"]],
  ["File structure", ["struct"]],
  ["Provenance", ["prov"]],
];
const allRules = meta.ofType("Rule");
const groupOf = (key: string) => RULE_GROUPS.findIndex(([, p]) => p.includes(key.split("-")[0]));
const ungrouped = allRules.filter((r) => groupOf(r.key) < 0);
if (ungrouped.length) throw new Error(`Rules with no group in gendocs.ts: ${ungrouped.map((r) => r.key).join(", ")}`);
const tone = (sev: string) => (sev === "error" ? "error" : sev === "warning" ? "warning" : "info");
RULE_GROUPS.forEach(([name], g) => {
  const inGroup = allRules.filter((r) => groupOf(r.key) === g);
  if (!inGroup.length) return;
  rules.push(`## ${name}`, "");
  for (const r of inGroup) {
    rules.push(
      ...card({
        id: r.id,
        title: `\`${r.key}\``,
        level: 3,
        chips: [
          [`${r.modality.replace("_", " ")} · ${r.severity}`, tone(r.severity)],
          [CHECK_LABEL[r.check] ?? r.check],
          [BASIS_LABEL[r.basis] ?? r.basis],
          [`From step ${r.fromStep}`],
        ],
        rows: [
          ["Rule", r.statement],
          ["In plain words", r.plainLanguage],
          ["Why", meta.rationale(r)],
          ["Ask yourself", r.review],
          ["How to fix", r.fix],
          ["Severity", r.severityReason, "muted"],
        ],
        sources: sources(r.id),
      }),
    );
  }
});

// DECISIONS.md
const decisions = HEADER("Decision guides");
const allDecisions = meta.ofType("Decision");
decisions.push(
  "## What decision guides are",
  "",
  "Building an ontology means making choices. Is this a class or one particular thing? Should I split this class in two? Where does this property belong? There is rarely one right answer.",
  "",
  "Making decisions about your ontology can be hard, and that's why Ontology Kit provides guides to help you arrive at good decisions. Each one is a short series of yes or no questions that walks you to a sensible choice.",
  "",
  "## How to use a guide",
  "",
  "1. Find the guide that matches what you are deciding. The list on the right, under *The guides*, shows them all.",
  "2. Answer the first question. Each answer either gives you your choice or sends you to the next question.",
  "3. Read the guide as a flowchart or as a list of steps, whichever is easier for you. The toggle above each guide switches between them.",
  "",
  "## Record what you decided",
  "",
  "A guide helps you choose. It doesn't save your choice. When you have decided, write it down with `okb decision add`, along with why. That way you, and anyone who reads your ontology later, can see the reasoning. A recorded decision can also explain why you broke a SHOULD rule on purpose: add `--waives <rule>` and the warning is marked as explained. See [Rules](RULES.md) for which rules allow that, and [Design decision](GLOSSARY.md#concept-design-decision) in the glossary.",
  "",
  "## The guides",
  "",
);
for (const d of allDecisions) {
  const tests = d.tests as DecisionTest[];
  const steps = tests.flatMap((t, i) => {
    const yes = t.ifYes === "continue" ? "go to the next question" : t.ifYes;
    const no = t.ifNo === "continue" ? "go to the next question" : t.ifNo;
    return [`${i + 1}. **${t.ask}**`, `   - **Yes:** ${yes}`, `   - **No:** ${no}`];
  });
  decisions.push(
    '<section class="decision">',
    "",
    // The second anchor is the old dot-less id (`decisionclass-or-value`), kept so existing links still land.
    `${anchorTag(d.id)}<a id="${d.id.replace(".", "")}"></a>`,
    `### ${d.name}`,
    "",
    d.plainLanguage,
    "",
    // A plain blockquote is the site's callout (a rounded rule in the margin), and GitHub shows it too.
    ...(d.note ? [`> **Good to know.** ${d.note}`, ""] : []),
    // The docs site turns this into a chart/text toggle. With no script, or on GitHub, both show.
    '<div class="views">',
    "",
    '<div class="view" data-view="chart">',
    "",
    ...flowchart(d.name, tests),
    "",
    "</div>",
    "",
    '<div class="view" data-view="text">',
    "",
    ...steps,
    "",
    "</div>",
    "",
    "</div>",
    "",
  );
  decisions.push(`<details class="sources"><summary>${sources(d.id).length === 1 ? "Source" : `Sources (${sources(d.id).length})`}</summary>`, "", ...sources(d.id).flatMap((x) => [x, ""]), "</details>", "", "</section>", "");
}

interface DecisionTest {
  ask: string;
  ifYes: string;
  ifNo: string;
}

/**
 * A Mermaid flowchart of a decision guide's questions. "continue" leads to the next question
 * (or to "Done" after the last one). The steps as text are generated beside it.
 */
function flowchart(name: string, tests: DecisionTest[]): string[] {
  // accTitle and accDescr become the SVG's <title> and <desc> for screen readers (one line each).
  const desc = `A flowchart of ${tests.length} yes or no questions, asked in order: ${tests.map((t, i) => `${i + 1}. ${t.ask}`).join(" ")} Each answer leads to an outcome or to the next question. The same steps are available as text.`;
  const lines = ["```mermaid", "flowchart TD", `  accTitle: ${accText(name)}`, `  accDescr: ${accText(desc)}`];
  let done = false;
  tests.forEach((t, i) => {
    const q = `Q${i + 1}`;
    // Questions are rounded boxes, not diamonds: a sentence in a diamond makes a huge shape.
    lines.push(`  ${q}("${mermaidText(t.ask)}")`);
    for (const [label, answer] of [["Yes", t.ifYes], ["No", t.ifNo]] as const) {
      let target: string;
      if (answer !== "continue") {
        target = `${q}${label[0]}`;
        lines.push(`  ${target}["${mermaidText(answer)}"]`);
      } else if (i + 1 < tests.length) {
        target = `Q${i + 2}`;
      } else {
        target = "Done";
        done = true;
      }
      lines.push(`  ${q} -->|${label}| ${target}`);
    }
  });
  if (done) lines.push(`  Done(["Done"])`);
  lines.push("```");
  return lines;
}

/** Mermaid reads accTitle and accDescr to the end of the line, so only line breaks and braces need care. */
function accText(s: string): string {
  return s.replace(/\s+/g, " ").replace(/[{}]/g, "").trim();
}

/** Escapes the characters Mermaid treats specially inside a quoted label, as Mermaid entity codes. */
function mermaidText(s: string): string {
  return s.replace(/[#"()[\]{}<>|`;]/g, (c) => `#${c.charCodeAt(0)};`);
}

const out: [string, string[]][] = [["METHOD.md", method], ["GLOSSARY.md", glossary], ["RULES.md", rules], ["DECISIONS.md", decisions], ["CLI.md", renderCliDocs().split("\n")], ["CLI-CHEAT-SHEET.md", renderCheatSheet().split("\n")]];
for (const [f, lines] of out) writeFileSync(join(ROOT, "docs", f), lines.join("\n") + "\n");
console.log(`Wrote ${out.map(([f]) => "docs/" + f).join(", ")}`);
