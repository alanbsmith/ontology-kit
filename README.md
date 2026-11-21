# Ontology Kit

A toolkit that walks you through building your first ontology: a precise, shared vocabulary for one subject ([what that means](https://ontology-kit.dev/learn/ontologies/)). It follows the method in **Ontology Development 101** (Noy & McGuinness, 2001).

It has three parts:

- An `okb` command-line tool that guides and checks your work.
- A meta-KB, a knowledge base about building knowledge bases, that holds the method and its checks ([what that means](https://ontology-kit.dev/learn/meta-kb/)).
- Skills that let Claude coach you.

**Docs: [ontology-kit.dev](https://ontology-kit.dev)**

## Install

Needs **Node.js 24+** and [pnpm](https://pnpm.io/installation) (`npm i -g pnpm`).

```bash
git clone https://github.com/alanbsmith/ontology-kit
cd ontology-kit
pnpm install
pnpm add --global link:./packages/okb
```

Then `okb init my-ontology` starts one. See the [introduction](https://ontology-kit.dev/getting-started/) and the [installation guide](https://ontology-kit.dev/getting-started/installation/), and [CONTRIBUTING.md](CONTRIBUTING.md) to work on the kit itself.

## License

[MIT](LICENSE)
