# Installation

okb needs **Node.js 24 or newer** (check with `node --version`). It's an npm package, so you install it like any other command-line tool, and you don't need to clone anything.

```bash
npm install --global @ontology-kit/okb
okb skills install
```

The first command puts `okb` on your PATH. The second installs the Claude skills that come with okb, the ontology-coach skill among them. To check that it worked:

```bash
okb version
```

Prefer pnpm? `pnpm add --global @ontology-kit/okb` installs the same package. To try okb without installing it, put `npx ontology-kit` where you'd type `okb`, as in `npx ontology-kit version`. The unscoped `ontology-kit` package on npm installs the same `okb` command.

`okb` has one runtime dependency (`yaml`, for markdown frontmatter). `pdftotext` (`brew install poppler` on a Mac) is optional: okb uses it to check quotes against PDFs, and falls back to the optional `pdfjs-dist` package without it.

## Skills

`okb skills install` links the five skills into `~/.claude/skills/`, which Claude Code and Cursor both load skills from. The links point into your okb install, so the skills stay current when okb updates. Start the coach by asking `coach me through building an ontology`, or with `/ontology-coach`. `okb skills status` shows what's installed. The [skills reference](../reference/skills.md) has the options, such as `--copy` and `--dir`.

## Updating

Check which version you have:

```bash
okb version          # okb 0.1.0 · meta-KB 2.6.1
```

The [meta-KB](../learn/meta-kb.md) version tracks changes to the method and rules; the [changelog](../CHANGELOG.md) lists what changed in each package release and each meta-KB version. Each ontology's `okb.json` records the version it started with (`metaKbVersion`).

To update, upgrade the package, install the skills again, and check the version:

```bash
npm update --global @ontology-kit/okb
okb skills install
okb version
```

With pnpm, use `pnpm update --global @ontology-kit/okb`. Installing the skills again is safe, and it matters if you used `--copy`, because copies don't update on their own. `okb skills status` shows whether the skills match your okb. Then start a new Claude session so it loads the new version.

Existing ontologies keep working: okb converts older file formats when it loads them, and new rules only add findings.

Working on okb itself, or running it from a clone? See [CONTRIBUTING.md](../../CONTRIBUTING.md).

Next: build your first ontology with the [wine tutorial](../../packages/okb/examples/wine/tutorial/0-intro.md).
