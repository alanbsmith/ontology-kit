---
summary: Serving a KB, planned as 0.3.0. Agents, apps, graph databases and eval-kit can use a KB.
updated: 2026-11-25
links: ["https://github.com/alanbsmith/ontology-kit/milestone/7", "Discussion #105"]
---

# Serving a KB (0.3.0)

## Why

Goals 4, 5 and 6 of [0021](../decisions/0021-one-point-zero-is-six-user-goals.md): a bulk-import-ready export with a guide to writing a loader, tools to query a KB in production, and a KB ready for eval-kit ([0030](../decisions/0030-eval-kit-is-the-eval-harness.md)). Discussion #105 adds the MCP server as `@ontology-kit/mcp`, a `query-kb` skill and competency questions with expected answers that run as checks.

## Why now

Discussion #105 puts it after Maintaining a KB because a KB that agents depend on has to change safely, and ids and releases are what consumers pin. It also makes `@ontology-kit/mcp` the reader's first consumer, which the 1.0 condition needs ([0022](../decisions/0022-one-point-zero-conditions-and-the-soak.md)).

## Done when

The milestone's issues are merged, and 0.3.0 is released with:

- First: the CLI command-table refactor (#8), prerelease infrastructure (#129), spike #143 and benchmark #29, since each can change the CLI or the format.
- The MCP server in the workspace, built in CI against the packed reader ([0026](../decisions/0026-road-to-one-point-zero-guardrails.md)).
- A spike on how humans and programs query a KB deterministically, beside MCP for agents ([open question](../open-questions.md)).
- Competency questions with expected answers (okb cq answer and okb cq check), and what eval-kit needs from okb ([open question](../open-questions.md)).
- The Cypher export, bulk-loader CSVs and change sets (#111 to #113), a guide to writing your own loader, and the local graph playground ([0029](../decisions/0029-graph-playground-is-a-local-database.md)).
- Snapshot tests that pin the `--json` shapes.

## Log

- 2026-11-24: file written from the road-to-1-0 plan.
- 2026-11-25: playground, eval-kit, query spike, #143 and #29 added.
