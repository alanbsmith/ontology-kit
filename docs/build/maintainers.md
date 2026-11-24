# Maintain a KB: the whole workflow

A knowledge base (KB) that people rely on keeps changing. A document gets updated, someone spots a wrong rule, a kind gets a better name. This page is the map. It says who does what and which tool to reach for at each point. It also gives the order a change takes from a source edit to a release.

The how-to details live on other pages. This page links to each one.

## Who does what

Four jobs matter. One person can hold more than one, except that nobody should check their own work.

| Role                      | What they do                                                                               | Where to start                                |
| ------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------- |
| **Maintainer**            | Makes the changes: re-syncs a changed document, adds a rule, renames a kind, opens the PR. | [Maintain a KB with a team](maintaining.md)   |
| **Reviewer**              | Reads the pull request (PR): what changed, whether the check passed, what needs a person.  | [Sign off on a KB](sign-off.md)               |
| **Subject-matter expert** | Knows the topic. Decides whether a rule is true and whether the source supports it.        | [Sign off on a KB](sign-off.md)               |
| **Release owner**         | Cuts a numbered version of the KB from `main` when the team wants one.                     | [Cut a release](maintaining.md#cut-a-release) |

The reviewer and the subject-matter expert often are the same person. What matters is that someone other than the author reads each corrected rule before it merges.

## Which tool when

Every command and skill below is real. The last column links to the page that teaches it.

| When you need to...                                    | Use                                                                                             | Taught on                                                                |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Know if a branch is safe to merge                      | [`okb check`](../CLI.md#cmd-check)                                                              | [Check a KB before you merge](check-in-ci.md)                            |
| Make everyone (and CI) use the same okb version        | [`okb pin`](../CLI.md#cmd-pin)                                                                  | [Pin the okb version](check-in-ci.md#pin-the-okb-version)                |
| See what a branch changed, in words                    | [`okb diff`](../CLI.md#cmd-diff)                                                                | [How a change goes](maintaining.md#how-a-change-goes)                    |
| Find quotes that moved or vanished after a doc changed | [`okb source refresh`](../CLI.md#cmd-source-refresh)                                            | [A source document changed](maintaining.md#a-source-document-changed)    |
| Record that a rule matches its quote, or correct it    | [`okb verify`](../CLI.md#cmd-verify)                                                            | [A rule is added](maintaining.md#a-rule-is-added)                        |
| Leave a note and a link with a verdict                 | [`okb verify --note --ref`](../CLI.md#cmd-verify)                                               | [Leave a note and a link](sign-off.md#leave-a-note-and-a-link)           |
| Approve a corrected rule after reading it              | [`okb verify --approve`](../CLI.md#cmd-verify)                                                  | [Approve a corrected item](maintaining.md#approve-a-corrected-item)      |
| Give a reader only the pages a change touched          | [`okb docs --changed`](../CLI.md#cmd-docs---changed)                                            | [Review aids](maintaining.md#review-aids)                                |
| Show each rule beside its source, problems first       | [`okb docs --context`](../CLI.md#cmd-docs---context)                                            | [Read the problem cases first](sign-off.md#read-the-problem-cases-first) |
| Cut a numbered version, and check it later             | [`okb release`](../CLI.md#cmd-release) and [`okb release verify`](../CLI.md#cmd-release-verify) | [Cut a release](maintaining.md#cut-a-release)                            |
| Have Claude do the routine upkeep for you              | The [ontology-maintainer](../reference/skills.md#ontology-maintainer) skill                     | [Maintain a KB with a team](maintaining.md)                              |
| Walk an expert through a review, one rule at a time    | The [ontology-signoff](../reference/skills.md#ontology-signoff) skill                           | [Sign off on a KB](sign-off.md)                                          |

Two older tools join in at the same points. [`okb review`](review.md) asks the questions a script can't judge, and [`okb validate`](../CLI.md#cmd-validate) is the rule check that `okb check` runs first.

## The usual order

A change normally goes through these steps. The maintainer owns 1 to 4, the reviewer and the expert own 5 and 6, and the release owner owns 7.

1. **Edit the source.** Someone changes a document, or a rule is stated in a meeting. That is the trigger.
2. **Re-sync.** `okb source refresh --all` finds quotes that moved or are gone, and lists the new and changed blocks of each document. The maintainer fixes what it reports. The [ontology-maintainer](../reference/skills.md#ontology-maintainer) skill runs this flow for you.
3. **Change the KB.** Use `okb` commands, never the files. A new rule needs a quote first, then an independent `okb verify`.
4. **Read and check.** `okb diff main` says what changed. `okb check` says if it is safe to merge. The maintainer opens the PR once both look right.
5. **Review.** CI posts the `okb diff` and `okb check` result on the PR. The reviewer writes the review pages with `okb docs --changed` and `okb docs --context`.
6. **Sign off.** The expert reads each rule that needs a person, beside its quote, and decides. A person runs `okb verify --approve` on each corrected rule they accept. The [sign-off page](sign-off.md) shows how.
7. **Merge, then release.** After merge, the release owner runs `okb check`, `okb release <version>` and `okb release verify` from `main`.

If a step fails, go back to the step before it. A failed check in step 4 means the maintainer isn't done. A rejected rule in step 6 goes back to step 3 as a follow-up for the maintainer.

## Try it on a copy first

Every page in this section uses the [wine example](../../packages/okb/examples/wine/). Copy it into a new git repository and follow along:

```bash
mkdir my-kb
cp packages/okb/examples/wine/{okb.json,nodes.jsonl,edges.jsonl} my-kb/
cd my-kb
git init -b main && git add -A && git commit -m "Start"
okb check
```

## What to read next

- [Maintain a KB with a team](maintaining.md) is the guide for the maintainer, change by change.
- [Sign off on a KB](sign-off.md) is for the expert and the reviewer.
- [Check a KB before you merge](check-in-ci.md) sets up the workflow that runs the check on every PR.
