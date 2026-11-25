---
summary: Questions that are undecided or deliberately deferred, why, and what would reopen each.
updated: 2026-11-25
---

# Open questions

One entry per question. When one is settled, write a decision in [decisions/](decisions/) and delete the entry here.

## Where should the vision live: #105 or the brain?

- **Why it's open:** #105 is pinned and public. A file here would be versioned with the code and readable without GitHub. Two copies would drift.
- **Reopen when:** now. [Decision 0021](decisions/0021-one-point-zero-is-six-user-goals.md) defines 1.0 by six user goals, while #105's goals are shaped around features, so the two already disagree.

## Team rule packs: declarative or code?

- **Why it's open:** listed as an open question in #105. See [#100](https://github.com/alanbsmith/ontology-kit/issues/100).
- **Reopen when:** the Team guardrails milestone starts. Spike #100 is its first issue, and rule packs ship in 0.4.0 ([decision 0024](decisions/0024-team-rule-packs-before-one-point-zero.md)).

## How far do plain files scale?

- **Why it's open:** listed in #105. The format is files in git by design ([decision 0001](decisions/0001-plain-files-in-git.md)), and nobody has measured where that stops working. See [#29](https://github.com/alanbsmith/ontology-kit/issues/29).
- **Reopen when:** benchmark #29 reports, planned early in 0.3.0, or a real KB gets slow to load, check or merge.

## Which hosts support skills served over MCP?

- **Why it's open:** listed in #105. It decides how much of the MCP skills extension is worth building.
- **Reopen when:** the Serving a KB milestone starts.

## Should the project adopt a bundler or other build step before 1.0?

- **Why it's open:** development runs the TypeScript sources with Node's type stripping, and publishing compiles `src/` to `dist/` with `tsc`. No bundler was ever weighed ([decision 0009](decisions/0009-node-26-for-development-24-at-runtime.md)). It doesn't block 1.0 ([decision 0025](decisions/0025-bundler-after-one-point-zero.md)).
- **Reopen when:** someone names a concrete benefit to consumers (the published packages) or to maintainers. A change must keep the `exports` map and `bin` identical.

## How do humans and programs query a KB in production?

- **Why it's open:** the owner's starting point is MCP for agents and a standard API for deterministic queries, open to discussion. The reader library is the API today, and #105 rules out a query language. One option is a single set of read-only queries (`find`, `get`, `traverse`) in the reader that both the MCP server and a command call. A spike in 0.3.0 decides.
- **Reopen when:** the Serving a KB milestone starts.

## What does okb give an evaluation runner?

- **Why it's open:** [decision 0030](decisions/0030-an-evaluation-runner-for-goal-6.md) asks that a runner can connect a model, the eval questions and the KB. One option: okb writes eval cases from competency questions with expected answers, uses the nodes a question needs as the expected retrieval, and points the runner at `@ontology-kit/mcp` serving a released KB version. The runner's case format is young, so the writer may be better as an adapter outside okb's stable surface. See #165.
- **Reopen when:** the Serving a KB milestone starts, before the competency-question format is settled.

## Does the tokens KB need JSON or YAML citations before the freeze?

- **Why it's open:** design tokens usually live in JSON or YAML, and citing them by pointer (#26) adds to the provenance format. The plan puts the tokens spike (#23) in 0.5.0, after the format freezes. If the spike needs #26, #26 has to move to 0.3.0 or 0.4.0.
- **Reopen when:** the tokens spike is scoped, or before 0.4.0 ships at the latest.
