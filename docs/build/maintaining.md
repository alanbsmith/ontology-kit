# Maintain a KB with a team

Someone builds a knowledge base once. After that, many people change it: a doc gets updated, a rule is added, a class gets a better name. This guide is for those people. It shows how to make each common change safely, what checks it, and who signs off.

If you haven't built a KB, start with [Ways to build](index.md). If you want the checks to run on their own, set up [the pull request workflow](check-in-ci.md) first. This guide assumes it exists, but every command here also runs on your own machine.

## How a change goes

Every change follows the same five steps:

1. **Branch.** Make a git branch from `main`, as you would for code.
2. **Change the KB with `okb` commands.** Don't edit `nodes.jsonl` or `edges.jsonl` by hand. The commands keep ids, links and provenance (where a fact came from) consistent. Each node and edge is one line in those files, so two branches that change different things merge cleanly in git.
3. **Read what changed.** `okb diff main` lists the changes in knowledge terms: added classes, renamed slots, new rules. It doesn't list changed lines.
4. **Run `okb check`.** It says "Safe to merge" or tells you what to fix. See [Check a KB before you merge](check-in-ci.md).
5. **Open a pull request.** The workflow runs the same two commands and posts the result. A reviewer reads the `okb diff` comment, not the raw files.

The examples below use a copy of the [wine example](../../packages/okb/examples/wine/) as a team's KB, kept in git with `main` as its main branch. The wine example has no source documents, so the source changes use a tiny Markdown file called `serving.md` that the guide creates in a `sources` folder. Your outputs show your own names and ids.

Run `okb pin` once and commit `okb.json`, so everyone and the CI job use the same okb version:

```bash
okb pin
```

## A class, slot or instance changes

Say the team now sells sparkling wine. Add the class on a branch, then read the change and check it:

```bash
git switch -c add-sparkling
okb class add SparklingWine --parent Wine --desc "A wine with bubbles."
okb diff main
okb check
```

`okb diff main` reports one added class and one new link (`SparklingWine is a Wine`). `okb check` passes. Commit, push and open the pull request.

Other commands work the same way: `okb property add`, `okb relationship add`, `okb instance add`, `okb class set` and `okb slot set`. `okb show <name>` shows what a node looks like now.

## A name changes

Rename with `okb rename`. Never remove a class and add a new one. The new class gets a new id, so everything that pointed to the old one loses the link: instances, rules and other people's branches.

```bash
git switch -c rename-winery
okb rename Winery Producer
okb diff main
okb check
```

The class keeps its id (`c.winery`) and `okb` records `Winery` as a former name. `okb diff` shows `Winery → Producer` as a rename, not as one class removed and another added. A [release](#cut-a-release) uses the former names to build its change log.

## A source document changed

When a document that the KB quotes changes, the quotes that point into it may have moved or vanished. First, register the source and quote it. This is also how you add a source:

```bash
okb source add sources/serving.md
okb source outline src.serving-wine --quotable
okb quote add src.serving-wine "Chill white wine before serving." --cites WhiteWine
```

`okb source add` prints the source id (here `src.serving-wine`). Use `--repo-url` so each quote links to its exact lines on GitHub. `okb quote add` finds the text in the document and prints a quote id, such as `loc.serving-wine-1p2zzb`. The text must match the document word for word.

Now someone edits `serving.md`. After the edit, re-find every quote and check it:

```bash
okb source refresh src.serving-wine
okb check
```

`okb source refresh` re-locates each quote by its text. A quote that only moved to another line is updated. A quote whose text changed is reported as missing, and `okb check` fails on it until you fix it (see [A quote is wrong or missing](#a-quote-is-wrong-or-missing)).

<!-- TODO(#17): when the refresh-all command and its worklist of changed documents are merged, describe them here: refresh every source at once and work through what changed. -->

## A rule is added

A rule must cite a quote, so quote first, then add the rule. Use the quote id that `okb quote add` printed:

```bash
okb rule add --statement "White wine SHOULD be chilled before serving." --modality SHOULD --governs WhiteWine --cites loc.serving-wine-1p2zzb
okb check
```

The rule is new and unchecked, so `okb check` fails and lists the commands to run. Someone other than the author must check it. That can be a different person, or Claude in a new conversation with no context. They read the quote and the statement and record a verdict:

```bash
okb verify c.white-wine --status SUPPORTED
okb verify rule.white-wine-should-be-chilled-before --status OVERREACH --corrected "White wine SHOULD be chilled before serving, but the source doesn't say to what temperature."
```

`SUPPORTED` means the quote backs the statement. `OVERREACH` means the statement claims more than the quote says, so the verifier writes a corrected statement. `UNSUPPORTED` means the quote doesn't back it at all. See [From existing docs](../EXTRACTION-PIPELINE.md) for how verification works.

## Approve a corrected item

A corrected statement stays blocked until a person confirms the correction is right. `okb check` says so:

```text
✗ Rule 'White wine SHOULD be chilled before' was corrected after claiming more than its quote supports. A person must check it: okb verify rule.white-wine-should-be-chilled-before --approve
```

The reviewer reads the corrected statement next to the quote. If it holds, they run:

```bash
okb verify rule.white-wine-should-be-chilled-before --approve
okb check
```

`okb check` now passes. Approve only what you have read. A reviewer who runs `--approve` without reading the quote makes the check meaningless.

## A quote is wrong or missing

If a quote's text is no longer in its document, `okb check` names the quote and its old position. The fix is to quote the new text and move everything that cited the old quote to it. Edit the document first (here it now says "Chill white wine well before serving."), then:

```bash
okb quote add src.serving-wine "Chill white wine well before serving." --cites c.white-wine
okb cite rule.white-wine-should-be-chilled-before loc.serving-wine-7ve3kb
okb remove loc.serving-wine-1p2zzb
okb check
```

`okb quote add` prints the new quote id (`loc.serving-wine-7ve3kb` here). `okb cite` attaches it to the rule. `okb quote list` shows which nodes still cite the old quote, so you can move each one. Once nothing cites the old quote, `okb remove` deletes it. If the new wording changes what the quote supports, verify the cited nodes again, as in [A rule is added](#a-rule-is-added).

## Cut a release

A release is a numbered version of the KB that people and tools can pin to. Cut one from `main`, after the pull requests you want have merged:

```bash
okb check
okb release 1.0.0
okb release verify
```

`okb release 1.0.0` writes `manifest.json`, `RELEASES.md` (the change log) and a `releases/1.0.0/` folder. `okb release verify` checks that the files on disk still match the manifest. Commit the result and tag the commit if you want a git ref:

```bash
git add -A
git commit -m "Release 1.0.0"
git tag v1.0.0
```

<!-- TODO(#18): when the docs command is merged, add a sentence here (and a step in "How a change goes") about regenerating the KB's reference pages before a release. -->

## What review needs

A reviewer doesn't re-read the files. They need three things:

- **The `okb diff` comment.** It says what changed in the knowledge. Read every line and ask whether each change is meant.
- **A passing `okb check`.** Validation has no errors, every quote is still in its source, and every rule and extracted fact is verified. A failing check blocks the merge.
- **Approvals for corrected items.** A person other than the author runs `okb verify <id> --approve` for each corrected statement (see [Approve a corrected item](#approve-a-corrected-item)).

Judgment rules that a script can't check are the author's and reviewer's job. [Review and iterate](review.md) shows `okb review`, which turns them into questions.

## The pull request checklist

Copy `pull_request_template.md` from the okb package to `.github/pull_request_template.md` in your KB's repository. It's in `templates/` in `@ontology-kit/okb` (`node_modules/@ontology-kit/okb/templates/pull_request_template.md` once installed, or [on GitHub](https://github.com/alanbsmith/ontology-kit/blob/main/packages/okb/templates/pull_request_template.md)). GitHub then fills every new pull request with this:

```markdown
## What changed in the knowledge

<!-- One or two sentences. Paste the okb diff comment from CI, or run `okb diff main`. -->

## Checklist

- [ ] `okb check` says "Safe to merge" (the okb check workflow ran it).
- [ ] I read `okb diff main` and every change in it is meant.
- [ ] Each new or changed rule, class or fact cites a quote from a source.
- [ ] I ran `okb source refresh` for every source document I changed, and no quote is missing.
- [ ] A person other than the author ran `okb verify <id> --approve` on every corrected item.
- [ ] I used `okb rename` (not remove and add) for every renamed class, slot or instance.
- [ ] I ran `okb pin` if I upgraded okb.
- [ ] I ran `okb release <version>` and committed the result, if this change is part of a release.
```

## What to read next

- [Check a KB before you merge](check-in-ci.md) sets up the workflow that runs `okb check` and `okb diff` on every pull request.
- [File format](../FORMAT.md) explains the files and the compatibility policy, so you know what a change to them means.
- [From existing docs](../EXTRACTION-PIPELINE.md) covers quoting, drafting and verifying in full.
