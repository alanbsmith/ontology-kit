---
name: build-domain-kb-from-docs
description: Use when extracting design-system (or other) documentation, usually markdown, into an LPG-based domain knowledge base under the meta-KB's governance rules (ontology-kit / okb format, quote-first extraction with an independent verification pass).
---

# Build a domain KB from docs

Turns a documentation source (usually a markdown component doc, sometimes a PDF) into an okb ontology: Class, Slot and Instance nodes plus domain Rule nodes, each tied to a verbatim quote with its heading path and line numbers. It follows the meta-KB's rules in `ontology-kit/meta-kb/` (usually `~/Projects/ontology-kit`) and the pipeline in `ontology-kit/docs/EXTRACTION-PIPELINE.md`.

The point of this skill is to be deterministic where possible and to stop for human review everywhere else. Never auto-merge a finding this pipeline can't fully verify itself. Everything goes through okb commands; don't hand-edit nodes.json/edges.json.

## Step 0: Set up

1. Find okb: `okb version`, or `node <ontology-kit>/src/cli.ts` (Node 24+).
2. The target ontology must exist and have a **scope and at least three competency questions** (`okb status`). If it doesn't, stop and do Step 1 of the method first, or hand off to the **ontology-coach** skill. Competency questions decide what's worth extracting; without them, extraction turns into copying the docs.
3. Load the modeling rules: `okb explain` (list), and `okb explain <rule-id>` for any you're unsure of. Don't invent structural rules beyond the meta-KB. If a modeling question isn't answered by a meta-KB rule or decision guide, raise it as an open question in the output rather than deciding silently.
4. Register the document, from a local copy (the markdown source, not the rendered website):
   `okb source add <path/to/doc.md> --repo-url <GitHub URL of the file> [--url <rendered page URL>]`
   Report any document problems it prints (for example malformed table rows) in your output. They're documentation bugs worth fixing at the source.

## Step 1: Extract (quote first, nothing else)

1. `okb source outline <source> --quotable --json` gives the worklist: every quotable block with its heading path, lines, kind (paragraph, list item, callout, table row, frontmatter) and whether it's already quoted. Code examples and HTML comments are excluded on purpose: examples show usage but don't state rules.
2. Work through the blocks in the sections your competency questions care about. For each candidate class, property, relationship, allowed value or rule, quote the **literal** text: `okb quote add <source> "<verbatim text>" [--line N]`.
   - okb refuses text that isn't in the file (showing the closest real text) and asks for `--line` when the text appears in several places. Pick the occurrence in the section that's actually about the thing you're extracting (for example `DeleteButton > Props`, not `PrimaryButton > Props`).
   - Quote from the prose. For a prop table, quote the row's description (the row's locator is `… > Props > row: <prop>`).
   - Facts that exist only in code or generated output (types, defaults computed by code) must come from the component source, not from a code example in the doc.
3. If no single passage supports a candidate, create nothing for it. Dropping an unsupported candidate counts as success.

## Step 2: Draft (one claim per quote)

From each quote draft exactly one node, claiming no more than the quote supports, and link it with `--cites`:

- A kind of thing → `okb class add ...`, then `okb quote add ... --cites <Class>` (or add `--cites` when quoting).
- A property/prop/option → `okb property add` with facets; options become `--values`.
- A link between things (a component composes another, a token is used by a component) → `okb relationship add <name> --from <Class> --to <Class>`. Its values are stored as edges named after it (`composes` → `:COMPOSES`).
- A styling-only variant → work through `okb explain decision.class-or-value`. Usually an enumerated value, not a class.
- A requirement or recommendation → `okb rule add --statement "..." --modality <MUST|SHOULD|MAY|MUST_NOT|SHOULD_NOT> --governs <Class|slot> --cites <quote id>`.
- A conditional recommendation between two things ("use X instead of Y when …", typically under "When to Use Something Else") → the rule as above, **plus** a qualified link: declare the edge property once (`okb relationship property preferredOver condition --type String --required`), then `okb link X preferredOver Y condition="<the condition, in the quote's words>" --rule <rule id>`. The edge points at the rule rather than citing the quote again, so the fact has one citation chain and is verified through its rule.
- Permissive language ("consider", "can", "may") → SHOULD or MAY, never MUST / MUST NOT. okb warns when MUST is drafted from a quote without must/required/always/never.
- Every number, enum value or named entity in the draft must appear in the quote. Don't fill gaps from background knowledge, even when you're confident.
- One quote → one claim. Don't combine quotes at this step.

Note which meta-KB rule or decision guide drove any structural choice (for example in a design decision: `okb decision add ... --about <node>`).

## Step 3: Verify (a separate pass, not a self-check)

This step must not be skipped or merged into Step 2; `okb validate` blocks every extracted node that hasn't been verified. Use a **fresh context** (a separate subagent) given only the `{quote, statement}` pairs, from `okb rule list` and `okb quote list --json`. Don't give it the document or your Step 2 reasoning. Use exactly this prompt:

> You will be shown a QUOTE and a STATEMENT that claims to be derived from it. Do not use any outside knowledge of the subject matter. Judge only whether the STATEMENT follows from the QUOTE. Check specifically: (a) every number, enum value, or named entity in the STATEMENT appears in the QUOTE; (b) the modality (MUST/SHOULD/MAY/MUST NOT/SHOULD NOT) matches the QUOTE's actual strength of language; (c) the STATEMENT doesn't combine this quote with an assumption from elsewhere. Return SUPPORTED, OVERREACH (with a corrected statement), or UNSUPPORTED.

For Class and Slot nodes the "statement" is the node's `description` plus its facets (allowed values, cardinality, parent).

Record each result:

- `okb verify <node> --status SUPPORTED [--confidence verbatim|paraphrased]`
- `okb verify <node> --status OVERREACH --corrected "<narrower statement>"`: the original is kept in `_originalDraft`, and the node stays blocked until a person runs `okb verify <node> --approve`.
- `okb verify <node> --status UNSUPPORTED`, then `okb remove <node>`. It never ships.

## Step 4: Spot-check sources

For a random 10% of quotes (minimum 5), open their `sourceLink` (from `okb quote list --json`) and confirm the quote comes from the section it's about. This catches quotes taken from the wrong component's section, which Step 3 can't see.

## Step 5: Validate

```bash
okb validate --all
okb drift <this-ontology> <other-ontologies-from-the-same-doc-set>   # optional, cross-KB copy-paste check
```

Errors block the output, including `prov-verified` (unverified, UNSUPPORTED, or corrections not yet approved), `prov-cites-quote` and `prov-quote-current` (a quote no longer in the file). Warnings and hints aren't blocking, but they must be carried into the review diff, not silently dropped. When the source doc changes later, `okb source refresh <source>` re-locates every quote and reports the ones that are gone.

## Output

- The updated ontology folder.
- A review diff showing, for every new or changed node: `{quote, locator + sourceLink, statement/description, extractionConfidence, verification.status}` side by side, plus the validator's findings, document problems from `okb source add`, and any open modeling questions.
- Corrected items need a person's `okb verify --approve` before this goes into a PR. This pipeline's job is to make that review fast and well-informed, not to replace it. Then run the **ontology-review** skill for the judgment rules.

## What this doesn't cover

This catches drift between a quote and a statement (Step 3), structural errors the validator knows about (Step 5), and stale citations after a source is edited (`prov-quote-current`, `okb source refresh`). A quote taken from the wrong section is only partly covered: heading paths and `--line` disambiguation make it visible, and the Step 4 spot check samples for it, but neither is exhaustive. Facts that live only in code (types, computed defaults) are out of scope for doc extraction.
