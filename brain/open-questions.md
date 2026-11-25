---
summary: Questions that are undecided or deliberately deferred, why, and what would reopen each.
updated: 2026-11-22
---

# Open questions

One entry per question. When one is settled, write a decision in [decisions/](decisions/) and delete the entry here.

## What versions do the milestones map to, on the way to 1.0?

- **Why it's open:** CONTRIBUTING.md lists four conditions for 1.0 (a stable CLI, a format upgrade path, `@ontology-kit/format` used by an outside tool, several clean releases). #105 orders the milestones but names no versions.
- **Reopen when:** before the next minor release is planned.

## Where should the vision live: #105 or the brain?

- **Why it's open:** #105 is pinned and public. A file here would be versioned with the code and readable without GitHub. Two copies would drift.
- **Reopen when:** the next time #105 needs an edit.

## Team rule packs: declarative or code?

- **Why it's open:** listed as an open question in #105. See [#100](https://github.com/alanbsmith/ontology-kit/issues/100).
- **Reopen when:** the Team guardrails milestone starts.

## How far do plain files scale?

- **Why it's open:** listed in #105. The format is files in git by design ([decision 0001](decisions/0001-plain-files-in-git.md)), and nobody has measured where that stops working. See [#29](https://github.com/alanbsmith/ontology-kit/issues/29).
- **Reopen when:** a real KB gets slow to load, check or merge.

## Which hosts support skills served over MCP?

- **Why it's open:** listed in #105. It decides how much of the MCP skills extension is worth building.
- **Reopen when:** the Serving a KB milestone starts.
