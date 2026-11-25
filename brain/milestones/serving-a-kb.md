---
summary: Serving a KB, planned as 0.3.0. Agents, apps and graph databases can use a KB.
updated: 2026-11-24
links: ["https://github.com/alanbsmith/ontology-kit/milestone/7", "Discussion #105"]
---

# Serving a KB (0.3.0)

## Why

Goals 4, 5 and 6 of [0021](../decisions/0021-one-point-zero-is-six-user-goals.md): a bulk-import-ready export with a guide to writing a loader, tools to query a KB in production, and a KB ready for an eval harness. #105 adds the MCP server as `@ontology-kit/mcp`, a `query-kb` skill and competency questions with expected answers that run as checks.

## Why now

Discussion #105 puts it after Maintaining a KB because a KB that agents depend on has to change safely, and ids and releases are what consumers pin. It also makes `@ontology-kit/mcp` the reader's first consumer, which the 1.0 condition needs ([0022](../decisions/0022-one-point-zero-conditions-and-the-soak.md)).

## Done when

The milestone's issues are merged, and 0.3.0 is released with:

- The MCP server in the workspace, depending only on the published reader exports.
- Competency questions with expected answers (okb cq answer and okb cq check), and a documented, stable export of them for an eval harness (new issue; not on the board yet).
- The Cypher export, bulk-loader CSVs and change sets (#111 to #113), and a guide to writing your own loader.
- Prerelease infrastructure (#129) and the CLI command-table refactor (#8), both proposed to move in.

## Log

- 2026-11-24: file written from the road-to-1-0 plan.
