# @ontology-kit/okb

The `okb` command-line tool from [Ontology Kit](https://ontology-kit.dev): a toolkit that walks you through building your first ontology, a precise, shared vocabulary for one subject. It follows the method in **Ontology Development 101** (Noy & McGuinness, 2001).

It ships the `okb` command, the meta-KB (a knowledge base about building knowledge bases, which holds the method and its checks), and skills that let Claude coach you.

## Install

Needs **Node.js 24+**.

```bash
npm install --global @ontology-kit/okb
okb skills install    # adds the Claude skills; Claude Code and Cursor load them
okb init my-ontology
```

You can also run it without installing, with `npx @ontology-kit/okb version`, or install it with pnpm (`pnpm add --global @ontology-kit/okb`). The unscoped [`ontology-kit`](https://www.npmjs.com/package/ontology-kit) package installs the same `okb` command.

## Documentation

**Docs: [ontology-kit.dev](https://ontology-kit.dev)**. Start with the [introduction](https://ontology-kit.dev/getting-started/) and the [installation guide](https://ontology-kit.dev/getting-started/installation/). The source is at [github.com/alanbsmith/ontology-kit](https://github.com/alanbsmith/ontology-kit).

## License

[MIT](LICENSE)
