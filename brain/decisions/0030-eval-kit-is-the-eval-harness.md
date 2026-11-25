---
summary: The eval-harness goal targets eval-kit; its runner gets the model, the eval questions and the KB.
status: proposed
date: 2026-11-25
updated: 2026-11-25
links: ["https://github.com/alanbsmith/eval-kit", "#97", "#98", "0021-one-point-zero-is-six-user-goals.md"]
---

# 0030: Eval-kit is the eval harness for goal 6

**Decision:** goal 6 of [0021](0021-one-point-zero-is-six-user-goals.md) targets [eval-kit](https://github.com/alanbsmith/eval-kit). Its runner should have everything it needs to test: a model, the eval questions and the knowledge base.

**Why:** the owner's goal for eval-kit.

**Consequences:** okb's part is open: see [open-questions.md](../open-questions.md). Eval-kit joins its tools by versioned file formats and reaches data through MCP servers, so its runner would reach the KB through `@ontology-kit/mcp`, and okb would write the questions.
