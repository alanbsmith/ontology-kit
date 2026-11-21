# Installation

okb needs **Node.js 24 or newer**. It runs its TypeScript source directly, so there's no build step. Install from source with [pnpm](https://pnpm.io/installation) (`npm i -g pnpm`; Node 26 doesn't bundle Corepack).

```bash
git clone https://github.com/alanbsmith/ontology-kit
cd ontology-kit
pnpm install
pnpm add --global link:./packages/okb
```

`pnpm install` fetches one runtime dependency (`yaml`, for markdown frontmatter); the rest are development tools. `pnpm add --global link:./packages/okb` puts `okb` on your PATH (or skip it and run `node packages/okb/src/cli.ts ...`). To check the install, run the test suite, which builds the wine example end to end:

```bash
pnpm test
```

`pdftotext` (`brew install poppler`) is optional: okb uses it to check quotes against PDFs, and falls back to the optional `pdfjs-dist` package without it.

## Skills

Install the skills that come with okb, the ontology-coach skill among them:

```bash
okb skills install
```

This links them into `~/.claude/skills/`, which Claude Code and Cursor both load skills from, and the links keep the skills current when you update the repo. Start the coach by asking `coach me through building an ontology`, or with `/ontology-coach`. `okb skills status` shows what's installed. The [skills reference](../reference/skills.md) has the options, such as `--copy` and `--dir`.

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

You don't need to run `pnpm add --global link:./packages/okb` again. It points at this folder, so `okb` runs the new code right away. Link again only if you switch Node versions or move the folder.

Skills installed with `okb skills install` update with the repo. If they were copies (`--copy`), run `okb skills install --copy` again. Check with `okb skills status`, then start a new Claude session so it loads the new version.

Existing ontologies keep working: okb converts older file formats when it loads them, and new rules only add findings.

Next: build your first ontology with the [wine tutorial](../../packages/okb/examples/wine/tutorial/0-intro.md).
