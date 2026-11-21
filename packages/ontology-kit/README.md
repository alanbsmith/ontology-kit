# ontology-kit

[Ontology Kit](https://ontology-kit.dev) is a toolkit for building knowledge graphs with guardrails: a checked file format, rules from a meta-KB, provenance down to verbatim quotes, and skills that let Claude drive it. It serves a team that keeps a knowledge base and someone building their first.

This package installs its `okb` command. It only depends on [`@ontology-kit/okb`](https://www.npmjs.com/package/@ontology-kit/okb), which holds the code, and the packages are released together with the same version (with a third, [`@ontology-kit/format`](https://www.npmjs.com/package/@ontology-kit/format), which reads the file format).

Needs **Node.js 24+**.

```bash
npx ontology-kit version
npm install --global ontology-kit
okb skills install    # adds the Claude skills; Claude Code and Cursor load them
okb init my-ontology
```

**Docs: [ontology-kit.dev](https://ontology-kit.dev)**. The source is at [github.com/alanbsmith/ontology-kit](https://github.com/alanbsmith/ontology-kit).

## License

[MIT](LICENSE)
