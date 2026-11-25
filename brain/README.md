---
summary: Start here. What the brain holds, where everything else lives, and how to keep it current.
updated: 2026-11-25
---

# The brain

The brain holds the **why** behind Ontology Kit: why it's built this way, why the work is in this order, and what's still undecided. It's for a session that needs to plan or discuss the project, not change code. Read this page, then open only the files you need. Don't grep the repo first.

## Where things live

| You need                                 | Look in                                                                                                                                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| What we're building, goals and non-goals | [Discussion #105](https://github.com/alanbsmith/ontology-kit/discussions/105), the pinned vision post                                                                                |
| What's planned, in progress or done      | The [Ontology Kit project board](https://github.com/users/alanbsmith/projects/4) and the [milestones](https://github.com/alanbsmith/ontology-kit/milestones) (read them live, below) |
| How to change the code, commands, layout | [CLAUDE.md](../CLAUDE.md) and [CONTRIBUTING.md](../CONTRIBUTING.md)                                                                                                                  |
| How to write an issue, a commit or a PR  | [CONTRIBUTING.md, "Issues"](../CONTRIBUTING.md#issues) and ["Commits and pull requests"](../CONTRIBUTING.md#commits-and-pull-requests)                                               |
| What shipped in each release             | [docs/CHANGELOG.md](../docs/CHANGELOG.md)                                                                                                                                            |
| What 0.x and 1.0 promise                 | [CONTRIBUTING.md, "What 0.x means"](../CONTRIBUTING.md#what-0x-means)                                                                                                                |
| Why something is the way it is           | [decisions/](decisions/) in this folder                                                                                                                                              |
| What's undecided or deferred             | [open-questions.md](open-questions.md)                                                                                                                                               |
| Where things stand right now             | [now.md](now.md)                                                                                                                                                                     |
| Other projects, and what's private       | [related-projects.md](related-projects.md)                                                                                                                                           |
| The project's own jargon                 | [glossary.md](glossary.md)                                                                                                                                                           |
| Why a milestone exists and its lessons   | [milestones/](milestones/)                                                                                                                                                           |

`docs/DECISIONS.md` is something else: the meta-KB's generated decision guides for people building an ontology.

## Reading GitHub live

The brain never copies statuses from GitHub, so they can't go stale here. Read them with the GitHub CLI, signed in as the repo owner:

```bash
gh project item-list 4 --owner alanbsmith --format json --limit 200   # the board
gh api repos/alanbsmith/ontology-kit/milestones --jq '.[] | "\(.number) \(.title): \(.open_issues) open, \(.closed_issues) closed"'
gh issue list --repo alanbsmith/ontology-kit --milestone "<title>" --state all
gh issue list --repo alanbsmith/ontology-kit --label epic --state all     # each milestone's epic (tracker)
gh api graphql -f query='{repository(owner:"alanbsmith",name:"ontology-kit"){discussion(number:105){title body}}}' --jq '.data.repository.discussion'
```

## Files

| File                                       | Holds                                                                                                                                               |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| [now.md](now.md)                           | The current focus and why it's the focus. Rewritten often, so it can lag: if its `updated:` date is older than the last merged PR, check the board. |
| [open-questions.md](open-questions.md)     | Undecided and deferred questions, each with what would reopen it.                                                                                   |
| [decisions/](decisions/)                   | One file per decision: what was chosen, what else was weighed, and why.                                                                             |
| [milestones/](milestones/)                 | One file per active milestone: why it exists, why now, lessons so far.                                                                              |
| [related-projects.md](related-projects.md) | The projects around this one, which are private, and what's fine to say about each in public.                                                       |
| [glossary.md](glossary.md)                 | The project's jargon: rule packs, epics, the soak and so on.                                                                                        |

To see every decision in one go, read each one's summary and status instead of the files (a superseded decision names its replacement):

```bash
grep -H -E '^(summary|status|superseded-by):' brain/decisions/*.md
```

## Keeping it current

- **A decision's text is never edited.** Record a change of mind as a new decision with `supersedes:`. Two things on the old file may change: typo fixes, and its front matter, where you set `status: superseded` and add `superseded-by:` so a reader of the old file (or the `grep` below) can see it was replaced. Never reword its decision, reason or consequences.
- **Every other file is rewritten in place.** Update its `updated:` date. Git history is its record of changes.
- **Undecided goes in open-questions.md.** When a question is settled, write the decision and remove the entry.
- **At the end of a session**, update `now.md` if the focus moved, add a line to the milestone's log, and write any decision you made.
- **Keep files short.** Link to the issue, PR or doc that has the detail instead of repeating it.
- **This repo is public.** Write nothing here you wouldn't put in a PR description. Check [related-projects.md](related-projects.md) before you describe a private project.

### Front matter

Every file starts with `summary:` (one line, so a session can choose without opening it) and `updated:`. A decision also has `status:` (`accepted`, `superseded`, or `proposed` while it sits in an open PR; set it to `accepted` when the PR merges, and the drift check warns about a `proposed` decision already on `main`), `date:` (when it was decided), `decided-by:` (`owner` when the owner chose and gave the reason, or `owner, on a recommendation` when the owner accepted a recommendation and its reason) and, where they apply, `supersedes:`, `superseded-by:` and `links:`.
