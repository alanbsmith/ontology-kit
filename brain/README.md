---
summary: Start here. What the brain holds, where everything else lives, and how to keep it current.
updated: 2026-11-22
---

# The brain

The brain holds the **why** behind Ontology Kit: why it's built this way, why the work is in this order, and what's still undecided. It's for a session that needs to plan or discuss the project, not change code. Read this page, then open only the files you need. Don't grep the repo first.

## Where things live

| You need                                 | Look in                                                                                               |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| What we're building, goals and non-goals | [Discussion #105](https://github.com/alanbsmith/ontology-kit/discussions/105), the pinned vision post |
| What's planned, in progress or done      | The Ontology Kit project board and the milestones (read them live, below)                             |
| How to change the code, commands, layout | [CLAUDE.md](../CLAUDE.md) and [CONTRIBUTING.md](../CONTRIBUTING.md)                                   |
| What shipped in each release             | [docs/CHANGELOG.md](../docs/CHANGELOG.md)                                                             |
| What 0.x and 1.0 promise                 | [CONTRIBUTING.md, "What 0.x means"](../CONTRIBUTING.md#what-0x-means)                                 |
| Why something is the way it is           | [decisions/](decisions/) in this folder                                                               |
| What's undecided or deferred             | [open-questions.md](open-questions.md)                                                                |
| Where things stand right now             | [now.md](now.md)                                                                                      |
| Why a milestone exists and its lessons   | [milestones/](milestones/)                                                                            |

`docs/DECISIONS.md` is something else: the meta-KB's generated decision guides for people building an ontology.

## Reading GitHub live

The brain never copies statuses from GitHub, so they can't go stale here. Read them with the GitHub CLI, signed in as the repo owner:

```bash
gh project item-list 4 --owner alanbsmith --format json --limit 200   # the board
gh api repos/alanbsmith/ontology-kit/milestones --jq '.[] | "\(.number) \(.title): \(.open_issues) open, \(.closed_issues) closed"'
gh issue list --repo alanbsmith/ontology-kit --milestone "<title>" --state all
gh api graphql -f query='{repository(owner:"alanbsmith",name:"ontology-kit"){discussion(number:105){title body}}}' --jq '.data.repository.discussion'
```

## Files

| File                                   | Holds                                                                   |
| -------------------------------------- | ----------------------------------------------------------------------- |
| [now.md](now.md)                       | The current focus and why it's the focus. Rewritten often.              |
| [open-questions.md](open-questions.md) | Undecided and deferred questions, each with what would reopen it.       |
| [decisions/](decisions/)               | One file per decision: what was chosen, what else was weighed, and why. |
| [milestones/](milestones/)             | One file per active milestone: why it exists, why now, lessons so far.  |

To see every decision in one go, read the summaries instead of the files:

```bash
grep -H '^summary:' brain/decisions/*.md
```

## Keeping it current

- **Decisions are never edited.** Record a change of mind as a new decision with `supersedes:`, and set the old one's `status: superseded`. Fix typos freely.
- **Every other file is rewritten in place.** Update its `updated:` date. Git history is its record of changes.
- **Undecided goes in open-questions.md.** When a question is settled, write the decision and remove the entry.
- **At the end of a session**, update `now.md` if the focus moved, add a line to the milestone's log, and write any decision you made.
- **Keep files short.** Link to the issue, PR or doc that has the detail instead of repeating it.
- **This repo is public.** Write nothing here you wouldn't put in a PR description.

### Front matter

Every file starts with `summary:` (one line, so a session can choose without opening it) and `updated:`. A decision also has `status:` (`accepted`, `superseded`, or `proposed` while it sits in an open PR), `date:` (when it was decided) and, where they apply, `supersedes:`, `superseded-by:` and `links:`.
