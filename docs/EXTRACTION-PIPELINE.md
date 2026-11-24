# Extraction & verification pipeline

How to turn existing documentation (component docs, a spec, a style guide) into an okb ontology without inventing claims the documents don't make. The **build-domain-kb-from-docs** skill runs this pipeline; this page is the reference behind it.

It's the document-driven route into the same method. You still need a scope and competency questions (Step 1) before extracting, because they decide what's worth extracting.

## Why a pipeline and not one pass

An earlier single-pass extraction produced two errors that looked perfectly reasonable:

- a touch-target rule said **44px, WCAG 2.5.5** when the quoted doc said **24px**;
- a rule said a toggle **must not** be used when the doc only said to **consider** alternatives when needed.

Both are mechanical errors (a wrong number and a strengthened modality). A separate verification pass that sees only `{quote, statement}` catches them easily. The pass that wrote the claim tends to miss them, because it's grading its own work.

## Markdown sources

Most sources will be plain markdown, like component docs converted from MDX. okb reads them itself (`packages/okb/src/markdown.ts`):

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

| The quote describes...          | Command                                                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| a kind of thing                 | `okb class add ...`, then `okb quote add ... --cites <Class>`                                                            |
| a property, option or prop      | `okb property add ...` with facets; options become `--values`                                                            |
| a link between things           | `okb relationship add <name> --from <Class> --to <Class>`                                                                |
| a styling-only variant          | use the [class-or-value decision guide](DECISIONS.md#decision-class-or-value). Usually an enumerated value, not a class. |
| a requirement or recommendation | `okb rule add --statement "..." --modality SHOULD --governs <Class> --cites <quote id>`                                  |

Rules for the draft:

- A quote that several nodes share (a list lead-in, say) is added once. Attach it to the other nodes with `okb cite <node> <quote id>`.
- Rules the owner writes (not extracted) use `okb rule add --authored`; they cite a quote from an owner-written Source and are verified like any other. Descriptive facts (what one implementation does) are Instances, linked to the rules they meet with `okb fulfills`; a component rule that narrows a broader one uses `okb rule refines`. See [FORMAT.md](FORMAT.md#rules).
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

Say why an OVERREACH or UNSUPPORTED result came out that way, so a reviewer sees more than the verdict. Add `--note "<one sentence>"` that names the word or number (`narrowed MUST to SHOULD`, `the quote gives no 24px minimum`), without restating the verdict. Add `--ref <url>` (an `http` or `https` link to the PR comment, issue or review thread) when the reasoning happened in a conversation. A note helps most on an OVERREACH or UNSUPPORTED result and on an approval that depends on a discussion; a SUPPORTED result rarely needs one. Nothing is required. When you correct a statement without a note, okb prints a suggested note, built from what changed between `_originalDraft` and the correction (a changed MUST, SHOULD or MAY, a changed number, or a few words), plus the command that stores it. It stores nothing itself. If the difference can't be named that way, or for UNSUPPORTED, okb prints a tip about what a useful note says. `--approve` keeps the earlier note and `ref` unless you pass new ones. Names, emails and dates stay out of the graph; git and the PR keep who and when.

If the corrected statement of a rule uses a different MUST, SHOULD or MAY (one capitalized keyword), okb changes the rule's `modality` to match and says so, so approving the correction can't publish a SHOULD statement as a MUST rule. A statement with no keyword, or with two different ones, leaves `modality` as it was: check it by hand.

Anything extracted but not yet verified, and every OVERREACH correction, **blocks** `okb validate` until it's resolved. A person checks each correction and signs it off with `okb verify <node> --approve`.

`okb export` follows the same line: only SUPPORTED rules (including approved corrections) leave the toolkit, along with the quotes they cite. Unverified rules, and links whose `rule` points at one, stay out unless you pass `--include-unverified` (see [Export](build/export.md)).

### 4. Tag confidence

`extractionConfidence`: `verbatim`, `paraphrased` (the default for SUPPORTED) or `corrected` (set automatically for OVERREACH). Reviewers should give `corrected` items a second look.

### 5. Validate, and keep citations current

```bash
okb validate --all
okb source refresh src.button     # after the doc changes: re-locates every quote, updates lines and links
```

### When the docs change: the worklist

`okb source refresh --all` is the re-sync step for a whole KB. It re-locates every quote in every source and prints one report:

- **gone**: quotes no longer in the text, each with the nodes that cite it (rules, facts, classes). The command exits with code 1 so a script or CI notices. A quote it can't find is never modified.
- **moved**: quotes that only changed lines or heading. They're updated in place (`--dry-run` skips every write).
- **worklist**: the quotable blocks that are `new`, `changed` or `removed` since the KB last recorded the document.

The worklist rests on a baseline: `okb source add` stores a SHA-256 of each quotable block's text (`blocks` on the Source node). The hash ignores markup, line wrapping, case and punctuation, so changing the line breaks in a paragraph or moving it under another heading isn't a change, and changing a word is. It's per block because "the file changed" doesn't say what to extract again. A KB from before hashes has no baseline, and the report says so; `okb source refresh --all --record` stores one. Run it again after you've dealt with the worklist, not before, so the next run lists only what changes later. `--json` prints the report in the `okb-resync/1` shape, one item per block with `id`, `source`, `change`, `headingPath`, `lines`, `hash`, `oldHash`, `preview` and `oldPreview`, so a ledger can record an outcome per block. The skill's "When the docs change" path starts from it.

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
