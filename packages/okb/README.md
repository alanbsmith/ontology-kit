# @ontology-kit/okb

The `okb` command-line tool from [Ontology Kit](https://ontology-kit.dev), a toolkit for building knowledge graphs with guardrails. You keep your knowledge in plain files you own, and okb checks them as you work: a checked file format, rules from a meta-KB, provenance down to verbatim quotes, and skills that let Claude drive it.

It's for a team that keeps a knowledge base and wants every fact to point back to its source. It's also for someone building their first: the Ontology 101 method (Noy & McGuinness, 2001), the Learn course and the tutorials walk you through it step by step.

The package ships the `okb` command, the meta-KB (a knowledge base about building knowledge bases, which holds the method and its rules), and skills that let Claude coach you, review your work, and extract a knowledge base from documents. Other tools can read and write the file format through `@ontology-kit/okb/format`.

## Install

Needs **Node.js 24+**.

```bash
npm install --global @ontology-kit/okb
okb skills install    # adds the Claude skills; Claude Code and Cursor load them
okb init my-ontology
```

To update, run `npm update --global @ontology-kit/okb` and `okb skills install` again. You can also run it without installing, with `npx @ontology-kit/okb version`, or install it with pnpm (`pnpm add --global @ontology-kit/okb`). The unscoped [`ontology-kit`](https://www.npmjs.com/package/ontology-kit) package installs the same `okb` command.

## Documentation

**Docs: [ontology-kit.dev](https://ontology-kit.dev)**. Start with the [introduction](https://ontology-kit.dev/getting-started/) and the [installation guide](https://ontology-kit.dev/getting-started/installation/). The source is at [github.com/alanbsmith/ontology-kit](https://github.com/alanbsmith/ontology-kit).

## License

[MIT](LICENSE)
