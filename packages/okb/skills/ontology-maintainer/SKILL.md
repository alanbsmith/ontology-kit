---
name: ontology-maintainer
description: Use when someone looks after an existing okb knowledge base that is already in git and a routine change comes up, such as "the docs changed", "update the KB", "CI says a quote is missing", a reviewer asks for a fix, "add this rule or source", "rename this class", "write the PR description", "cut a release". It picks the flow, runs the okb commands in order, stops where a person must decide or approve, and ends with a pull request a reviewer can read. It does not do a first build (use ontology-coach), the extraction itself (build-domain-kb-from-docs) or modeling judgment (ontology-review), and it never approves a correction.
---

# Maintain an existing KB

**Version 2.6.3.** It should match the meta-KB version that `okb version` prints.

For the person (or the agent working for them) who looks after a KB that was built once and is now kept in git with `okb check` in CI. It works out what is open, does the routine update, and finishes with the pull request text. It adds no commands of its own: everything goes through `okb`. The same sequences, with their output, are in the maintainer guide (<https://ontology-kit.dev/build/maintaining/>) and the CI guide (<https://ontology-kit.dev/build/check-in-ci/>); read those when a step here is not enough.

## Hard rules

- **Never run `okb verify <id> --approve`.** A person other than the author does that, after reading the quote and the corrected statement. When one is due, say which items and give them the command to run.
- **Never edit `nodes.jsonl` or `edges.jsonl` by hand.** Use `okb` commands, which keep ids, links and provenance consistent.
- **Never keep a citation to text that isn't in the source.** A rule or fact whose quote is gone is rewritten or removed, with the user's say-so.
- **Never write an uncited rule.** A rule comes from a quote. If there is no quote, say so and stop.
- **Say what was skipped.** Every worklist block you didn't extract, every item still waiting for a person, and every check you couldn't run goes in the PR text, with the reason.
- Don't fix more than was asked. Each change in the PR should be one `okb diff` can explain.

## Step 0: Set up and triage

1. Find okb with `okb version`. Compare the meta-KB version it prints with this skill's version. If they differ, tell the user the skill or okb is out of date and offer `okb skills status`, then `okb skills install`, before going on.
2. Make sure you're on a branch cut from the KB's main branch (`git fetch origin`, `git branch --show-current`, `git status --short`). Don't work on `main`.
3. Record what is already failing, before you touch anything, so the PR neither inherits nor hides it:

   ```bash
   okb status
   okb check
   ```

4. Pick the flow from the trigger. If the trigger is vague ("make the KB current"), start with Flow 1: let `okb check` and the refresh report choose. Say which flow you chose and why.

| Trigger                                                 | Flow |
| ------------------------------------------------------- | ---- |
| A source document changed, or CI shows missing quotes   | 1    |
| CI or a reviewer reported one specific problem          | 2    |
| A new source file, or a rule someone stated             | 3    |
| A class, slot or instance needs a better name or a move | 4    |
| The change is done and needs a pull request description | 5    |
| `main` has the changes and the team wants a numbered KB | 6    |

## Flow 1: The source documents changed

1. Get the worklist. `--dry-run` writes nothing, so use it first if you're unsure:

   ```bash
   okb source refresh --all --json --dry-run
   okb source refresh --all --json
   ```

   It reports `gone` (quotes no longer in the text, each with `citedBy`, the rules and facts that cite it), `moved` (updated for you) and `worklist` (new, changed and removed blocks). It exits with code 1 when a quote is gone. A source with no baseline yet has no worklist; run `okb source refresh --all --record` once for it, then carry on.

2. **Gone quotes first.** For each `gone` entry, `quote` is the old quote's id, `text` is what it said, and `citedBy` lists every node that cites it. Read the current text near `was.locator`.
   - Passage reworded: quote the new text, attach it to every node in `citedBy` (`--cites` takes one node; `okb cite` does the rest), then remove the old quote. `okb quote add` prints the new quote id. See "A quote is wrong or missing" in the maintainer guide.
   - Passage no longer exists: **stop and ask the user** whether to rewrite or remove each rule and fact in `citedBy`. Never keep the citation.

   ```bash
   okb quote add <source id> "<the new text, word for word>" --cites <first node in citedBy>
   okb cite <another node in citedBy> <new quote id>
   okb remove <old quote id>
   ```

3. **Then the worklist.** A `changed` block that holds a gone quote has had that quote handled in step 2; don't do the quote twice, but still read the rest of the block, since it can change something else. For every other `changed` block, compare `oldPreview` with `preview`: is a quote or fact drawn from the old text now wrong? For each `new` block that states a fact or a rule, hand off to **build-domain-kb-from-docs** (Steps 1 to 3: quote, draft, one claim per quote). `removed` blocks usually appear as gone quotes already. Skip blocks that state nothing the KB needs, and keep a list of what you skipped and why.
4. **Verify what changed.** `okb check` passes as soon as a citation points at text that exists; it can't tell that the new wording means something else. Every node you re-cited, and every new node, needs a fresh, separate verification pass (build-domain-kb-from-docs, Step 3), even if `okb check` is already green. Record each result with `okb verify <node> --status SUPPORTED`, or `--status OVERREACH --corrected "..." --note "..."`. Add a note to every OVERREACH and UNSUPPORTED result: It is one sentence that names the word or number, never restates the verdict ("narrowed MUST to SHOULD: the quote says \"should\"", not "overreach"). Add `--ref <url>` (a PR comment, issue or review thread, `http` or `https`) when the reasoning lives in a conversation. Never put a name, email or date in either: git and the PR keep who and when. okb prints a suggested note after OVERREACH; use it when it is right. **Stop for a person** on every OVERREACH item: tell them to read the quote and the corrected statement, then run `okb verify <node> --approve`. Do not run it.
5. Record the new baseline only after the worklist is handled, so the next refresh lists only what changes after this one:

   ```bash
   okb source refresh --all --record
   ```

6. Finish:

   ```bash
   okb validate --all
   okb check
   okb diff main
   ```

   Done when `okb check` says "Safe to merge" (or fails only on items waiting for a person, which you list), and `okb diff main` shows only the intended changes. Then Flow 5.

## Flow 2: A reviewer or CI asked for a fix

1. Read the failing line. `okb check` names the command to run for each failure. If it came as a comment, run `okb check` yourself to see the same failure.
2. Fix that one thing and nothing else:
   - A wrong or missing quote: `okb quote add`, `okb cite`, `okb remove` (see Flow 1, step 2). Then every node you re-cited needs the fresh verification pass of Flow 1, step 4, even though `okb check` is green: the new quote can support different wording.
   - A rule that claims more than its quote: `okb verify <node> --status OVERREACH --corrected "<narrower statement>"`.
   - A validation error: `okb explain <rule-id>` says what the rule means and how to fix it.
   - A modeling question ("is this really a kind of that?"): hand off to **ontology-review**.
3. Check that the fix held and the PR still changes only what it meant to:

   ```bash
   okb check
   okb diff main
   ```

   **Stop for a person** on any `--approve`, and on any fix that changes what a rule claims. Say what the rule said before and after.

## Flow 3: Add a rule or a source

1. A new source file:

   ```bash
   okb source add <path/to/doc.md> --repo-url <GitHub URL of the file>
   okb source outline <source id> --quotable
   ```

   Then hand off to **build-domain-kb-from-docs** for extraction and verification. Report any document problems `okb source add` prints.

2. A rule someone stated: it still needs a quote from a source. Find the passage with `okb source outline <source id> --quotable` and quote it with `okb quote add`. If no source says it, **say so and stop**. Offer two ways forward: add the source that states it, or have the owner write a rule that cites their own file (build-domain-kb-from-docs explains `--authored`). Don't write an uncited rule.
3. `okb check`, then Flow 5. A new rule is unverified until someone verifies it, so `okb check` fails until then; list the items.

## Flow 4: Rename or restructure

1. Rename with `okb rename`, never remove and add (the id would change and everything that pointed to it would lose the link):

   ```bash
   okb rename <old name> <new name>
   okb diff main
   ```

   `okb diff` must show a rename, not a removal plus an addition.

2. A restructure (move a subclass, change a slot's range): hand the modeling question to **ontology-review** first. After the user decides, apply it with `okb class set` or `okb slot set` (see `okb class set` and `okb slot set` in the command reference, `okb help`).
3. `okb check`, then Flow 5. Say in the PR that renaming a relationship changes its edge type (`:MAKER` becomes `:PRODUCER`), which breaks queries that use the old one.

## Flow 5: Hand the pull request to a reviewer

1. `okb diff main` (Markdown). A reviewer reads this, not the JSON lines.
2. Fill the PR checklist (`templates/pull_request_template.md` in the okb package; the maintainer guide shows it). It needs: what changed in the knowledge, the `okb check` result, which items need a person's approval, which sources were refreshed and which worklist blocks were skipped, with reasons.
3. Name the next human step ("`okb verify rule.x --approve` for the two corrected rules"). Don't claim the PR is approved or ready beyond what `okb check` says.

## Flow 6: Cut a release

1. The human decides the version number. Don't release a KB with failing checks or unapproved items.
2. From the main branch, after the pull requests you want have merged:

   ```bash
   okb check
   okb release <version>
   okb release verify
   ```

3. Commit what it wrote, and tag the commit only if asked. See "Cut a release" in the maintainer guide.

## What this skill doesn't do

- A first build or a blank page: use **ontology-coach**.
- Extraction and independent verification: **build-domain-kb-from-docs**. This skill decides when to call it and what to skip.
- Whether the model is sound: **ontology-review**.
- Reviewing a pull request someone else wrote: this skill prepares the PR for a reviewer, not the review.
- It can't approve its own work. Every `--approve` is a person's.
