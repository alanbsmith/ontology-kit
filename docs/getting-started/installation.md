# Installation

okb needs **Node.js 24 or newer**. It runs its TypeScript source directly, so there's no build step. Install from source with [pnpm](https://pnpm.io/installation) (`npm i -g pnpm`; Node 26 doesn't bundle Corepack).

```bash
git clone https://github.com/alanbsmith/ontology-kit
cd ontology-kit
pnpm install
pnpm link --global
```

`pnpm install` fetches one runtime dependency (`yaml`, for markdown frontmatter); the rest are development tools. `pnpm link --global` puts `okb` on your PATH (or skip it and run `node src/cli.ts ...`). To check the install, run the test suite, which builds the wine example end to end:

```bash
pnpm test
```

`pdftotext` (`brew install poppler`) is optional: okb uses it to check quotes against PDFs, and falls back to the optional `pdfjs-dist` package without it.

## Skills

To use the ontology-coach skill with Claude, link it from the kit folder:

```bash
mkdir -p ~/.claude/skills
ln -s "$PWD/skills/ontology-coach" ~/.claude/skills/ontology-coach
```

Claude Code and Cursor both load skills from `~/.claude/skills/`, and the link keeps the skill current when you update the repo. Start it by asking `coach me through building an ontology`, or with `/ontology-coach`. The other skills in `skills/` install the same way.

## Updating

Check which version you have:

```bash
okb version          # okb 1.0.0 · meta-KB 2.4.1
```

The [meta-KB](../learn/meta-kb.md) version tracks changes to the method and rules; the [changelog](../CHANGELOG.md) lists what changed in each one. Each ontology's `okb.json` records the version it started with (`metaKbVersion`).

To update:

```bash
cd ontology-kit
git pull
pnpm install         # dependencies can change between versions
okb version
```

You don't need to run `pnpm link --global` again. It points at this folder, so `okb` runs the new code right away. Link again only if you switch Node versions or move the folder.

Skills you linked into `~/.claude/skills/` update with the repo. If you copied or uploaded them instead, replace the old copies with the new ones from `skills/`. Either way, start a new Claude session so it loads the new version.

Existing ontologies keep working: okb converts older file formats when it loads them, and new rules only add findings.

Next: build your first ontology with the [wine tutorial](../../examples/wine/tutorial/0-intro.md).
