# Ontology Kit

A toolkit for building knowledge graphs with guardrails. You keep your knowledge in plain files you own, and okb checks them as you work: a checked file format, rules from a meta-KB, provenance down to verbatim quotes, and skills that let Claude drive it.

It's for a team that keeps a knowledge base and wants every fact to point back to its source. It's also for someone building their first: the Ontology 101 method (Noy & McGuinness, 2001), the [Learn course](https://ontology-kit.dev/learn/) and the tutorials walk you through it step by step. A knowledge graph here is an [ontology](https://ontology-kit.dev/learn/ontologies/) (a precise, shared vocabulary for one subject) plus the facts that use it.

It has three parts:

- An `okb` command-line tool that creates, checks and exports your knowledge base, and records where each fact came from.
- A meta-KB, a knowledge base about building knowledge bases, that holds the method and its rules ([what that means](https://ontology-kit.dev/learn/meta-kb/)).
- Skills that let Claude coach you, review your work, and extract a knowledge base from documents.

**Docs: [ontology-kit.dev](https://ontology-kit.dev)**

## Install

Needs **Node.js 24+**.

```bash
npm install --global @ontology-kit/okb
okb skills install
```

`okb skills install` adds the Claude skills (Claude Code and Cursor both load them), and `okb init my-ontology` starts an ontology. See the [introduction](https://ontology-kit.dev/getting-started/) and the [installation guide](https://ontology-kit.dev/getting-started/installation/), and [CONTRIBUTING.md](CONTRIBUTING.md) to work on the kit itself.

## License

[MIT](LICENSE)
