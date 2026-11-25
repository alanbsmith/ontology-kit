---
summary: Questions that are undecided or deliberately deferred, why, and what would reopen each.
updated: 2026-11-24
---

# Open questions

One entry per question. When one is settled, write a decision in [decisions/](decisions/) and delete the entry here.

## Where should the vision live: #105 or the brain?

- **Why it's open:** #105 is pinned and public. A file here would be versioned with the code and readable without GitHub. Two copies would drift.
- **Reopen when:** the next time #105 needs an edit.

## Team rule packs: declarative or code?

- **Why it's open:** listed as an open question in #105. See [#100](https://github.com/alanbsmith/ontology-kit/issues/100).
- **Reopen when:** the Team guardrails milestone starts. Spike #100 is its first issue, and rule packs ship in 0.4.0 ([decision 0024](decisions/0024-team-rule-packs-before-one-point-zero.md)).

## How far do plain files scale?

- **Why it's open:** listed in #105. The format is files in git by design ([decision 0001](decisions/0001-plain-files-in-git.md)), and nobody has measured where that stops working. See [#29](https://github.com/alanbsmith/ontology-kit/issues/29).
- **Reopen when:** a real KB gets slow to load, check or merge.

## Which hosts support skills served over MCP?

- **Why it's open:** listed in #105. It decides how much of the MCP skills extension is worth building.
- **Reopen when:** the Serving a KB milestone starts.

## Should the project adopt a bundler or other build step before 1.0?

- **Why it's open:** development runs the TypeScript sources with Node's type stripping, and publishing compiles `src/` to `dist/` with `tsc`. No bundler was ever weighed ([decision 0009](decisions/0009-node-26-for-development-24-at-runtime.md)). It doesn't block 1.0 ([decision 0025](decisions/0025-bundler-after-one-point-zero.md)).
- **Reopen when:** someone names a concrete benefit to consumers (the published packages) or to maintainers. A change must keep the `exports` map and `bin` identical.

## How do humans query a KB in production?

- **Why it's open:** goal 5 of [decision 0021](decisions/0021-one-point-zero-is-six-user-goals.md) says "humans or agents". Agents get the MCP server and apps get the reader. #105 rules out a query language, so a human's tool would be a CLI command or the okb site browser. Not yet chosen.
- **Reopen when:** the Serving a KB milestone starts.

## What is the graph playground?

- **Why it's open:** the owner wants teams to see how things connect, perhaps in a playground or sandbox, and left it as a spike. The plan proposes folding it into spike #19 and okb site (#108), plus a local graph database recipe in the loading guide. A hosted sandbox would break a #105 non-goal.
- **Reopen when:** the Subject-matter experts milestone starts, or earlier if the loading guide is written first.

## What does the eval-harness export look like, and for which harness?

- **Why it's open:** goal 6 of [decision 0021](decisions/0021-one-point-zero-is-six-user-goals.md). The owner named an agent eval harness "like eval kit" as the example. The shape and the target harness are undecided, and no issue exists yet. Competency questions with expected answers (#97) are the seed.
- **Reopen when:** the Serving a KB milestone starts, because the export is format surface and needs settling before the freeze.

## Do the interrupted-save spike and the scale benchmark come before the format freeze?

- **Why it's open:** #143 asks whether interrupted saves can corrupt a KB and whether a KB should be one file. #29 measures scale. Either could change the format, which the plan wants frozen after 0.4.0. Neither is in a milestone before then.
- **Reopen when:** the Serving a KB milestone starts.
