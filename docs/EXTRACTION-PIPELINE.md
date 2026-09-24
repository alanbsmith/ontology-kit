# Extraction & verification pipeline

How to turn existing documentation (component docs, a spec, a style guide) into an okb ontology without inventing claims the documents don't make. The **build-domain-kb-from-docs** skill runs this pipeline; this page is the reference behind it.

It's the document-driven route into the same method. You still need a scope and competency questions (Step 1) before extracting, because they decide what's worth extracting.

## Why a pipeline and not one pass

An earlier single-pass extraction produced two errors that looked perfectly reasonable:

- a touch-target rule said **44px, WCAG 2.5.5** when the quoted doc said **24px**;
- a rule said a toggle **must not** be used when the doc only said to **consider** alternatives when needed.

Both are mechanical errors (a wrong number and a strengthened modality). A separate verification pass that sees only `{quote, statement}` catches them easily. The pass that wrote the claim tends to miss them, because it's grading its own work.

## Markdown sources

Most sources will be plain markdown, like component docs converted from MDX. okb reads them itself (`src/markdown.ts`):

| In the file                                           | How okb treats it                                                                                                                                |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| YAML frontmatter                                      | parsed and stored on the Source as `meta`; quotable, with locator `frontmatter`                                                                  |
| headings                                              | give every block a **heading path**: `Accessibility > Touch Target Size`                                                                         |
| paragraphs, list items (one block each), `>` callouts | quotable; `> **Caution:** …` gets the locator `… > Caution callout`                                                                              |
| table rows                                            | one block per row, with the column names: `PrimaryButton > Props > row: size`                                                                    |
| links and images                                      | the link or alt text is kept and the URL dropped, so quotes match what readers see                                                               |
| fenced code, HTML comments                            | **not quotable.** Examples show usage; they don't state rules. Cite the prose or the component's source instead (`--allow-code` overrides this). |

Matching ignores markdown syntax, line wrapping and punctuation, but not words, so "24px" never matches "44px". Every quote records its **line range**, and with `--repo-url` gets a GitHub link to those exact lines (`…/button.md?plain=1#L655`).

`okb source add` also reports document problems, such as a table row with more cells than columns. That usually means a type union like `"start" | "end"` whose pipe wasn't escaped as `\|` during conversion.

## The five steps

### 1. Extract: quote first, nothing else

```bash
okb source add docs/button.md --repo-url https://github.com/<org>/<repo>/blob/main/docs/button.md
okb source outline src.button            # every block, grouped by heading, with line numbers
okb quote add src.button "All buttons meet the minimum 24px by 24px touch target size requirement for mobile accessibility."
```

Work through the outline block by block, in the sections your competency questions care about. `okb quote add` refuses text that isn't in the file, and shows the closest real text. It asks you to choose with `--line` when the text appears more than once, and refuses code examples. **Stop condition:** if no single passage supports a candidate, there's no quote, so it's dropped. Dropping an unsupported candidate counts as success.

### 2. Draft: one claim per quote, no stronger than the quote

| The quote describes...          | Command                                                                                                                 |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| a kind of thing                 | `okb class add ...`, then `okb quote add ... --cites <Class>`                                                           |
| a property, option or prop      | `okb property add ...` with facets; options become `--values`                                                           |
| a link between things           | `okb relationship add <name> --from <Class> --to <Class>`                                                               |
| a styling-only variant          | use the [class-or-value decision guide](DECISIONS.md#decisionclass-or-value). Usually an enumerated value, not a class. |
| a requirement or recommendation | `okb rule add --statement "..." --modality SHOULD --governs <Class> --cites <quote id>`                                 |

Rules for the draft:

- "consider", "can", "may", "should" in the quote → **SHOULD / MAY** in the draft, never MUST. `okb rule add` warns when MUST is drafted from a quote with no "must/required/always/never".
- Every number, enum value or named entity in the draft must appear in the quote. No filling gaps from general knowledge.
- One quote → one claim.

### 3. Verify: a separate pass, not a self-check

In a fresh context (a separate subagent, or at least a turn that doesn't carry the drafting reasoning), evaluate only `{quote, statement}` with this prompt:

> You will be shown a QUOTE and a STATEMENT that claims to be derived from it. Do not use any outside knowledge of the subject matter. Judge only whether the STATEMENT follows from the QUOTE. Check specifically: (a) every number, enum value, or named entity in the STATEMENT appears in the QUOTE; (b) the modality (MUST/SHOULD/MAY/MUST NOT/SHOULD NOT) matches the QUOTE's actual strength of language: a "consider" or "can" in the quote never becomes a MUST or MUST NOT in the statement; (c) the STATEMENT doesn't combine this quote with an assumption from elsewhere. Return SUPPORTED, OVERREACH (with a corrected statement), or UNSUPPORTED.

Record the result:

```bash
okb verify <node> --status SUPPORTED [--confidence verbatim|paraphrased]
okb verify <node> --status OVERREACH --corrected "<narrower statement>"   # original kept in _originalDraft
okb verify <node> --status UNSUPPORTED                                     # then: okb remove <node>
```

Anything extracted but not yet verified, and every OVERREACH correction, **blocks** `okb validate` until it's resolved. A person checks each correction and signs it off with `okb verify <node> --approve`.

### 4. Tag confidence

`extractionConfidence`: `verbatim`, `paraphrased` (the default for SUPPORTED) or `corrected` (set automatically for OVERREACH). Reviewers should give `corrected` items a second look.

### 5. Validate, and keep citations current

```bash
okb validate --all
okb source refresh src.button     # after the doc changes: re-locates every quote, updates lines and links
```

| Rule                                | What it catches                                                                                                             |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `prov-verified` (error)             | extracted nodes that were never verified, UNSUPPORTED results, and corrections not yet approved                             |
| `prov-cites-quote` (error)          | a Rule, or a node marked `extracted`, with no verbatim quote from a Source                                                  |
| `prov-quote-current` (error / hint) | a quote no longer in the file (error), or one that moved to different lines (hint: run `okb source refresh`)                |
| `prov-duplicate-quotes` (hint)      | near-identical quotes from different documents, often copy-pasted docs. `okb drift <folder>...` compares across ontologies. |

Where a value is mechanically checkable against code (a prop's allowed values, a default, a size), compare it to the implementation (types, Storybook args, tests) rather than trusting the prose. Docs drift from code.

## Where people come in

The PR diff a reviewer sees should show `{quote, statement, extractionConfidence, verification.status}` side by side. Anything `corrected` or not SUPPORTED blocks merge until a human resolves it.

## Known gaps

- **Wrong-section quotes.** A quote can support its statement but come from the wrong part of the document. Heading paths make this much easier to see (`DeleteButton > Props > row: size` vs `PrimaryButton > ...`), and `okb quote add` makes you pick when text appears in several places. The skill still spot-checks a random 10% of quotes (minimum 5) by opening their `sourceLink`.
- **Semantic drift in paraphrase.** The verifier checks entailment, not whether a paraphrase is the most useful wording.
