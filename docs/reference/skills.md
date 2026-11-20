# Skills

A skill is a folder with a `SKILL.md` file that teaches Claude how to do one job. ontology-kit ships three, in the `skills/` folder. Each one drives the `okb` command, so it does the typing while you make the decisions.

| Skill                                                   | Use it to                                                         | Page                                            |
| ------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------- |
| [ontology-coach](#ontology-coach)                       | Build an ontology from a blank page.                              | [Build with Claude](../build/with-claude.md)    |
| [ontology-review](#ontology-review)                     | Get a second opinion on an ontology you've built.                 | [Review and iterate](../build/review.md)        |
| [build-domain-kb-from-docs](#build-domain-kb-from-docs) | Extract an ontology from documentation, with every claim checked. | [From existing docs](../EXTRACTION-PIPELINE.md) |

## ontology-coach

Coaches someone who has never built an ontology through the eight steps of the [method](../METHOD.md). It asks at most two questions at a time, explains each idea just before it's needed, runs the commands, and records your choices as design decisions. It leaves you with an ontology that passes `okb validate` and a record of why it looks the way it does.

Start it by asking `coach me through building an ontology`, or type `/ontology-coach`. See [Build with Claude](../build/with-claude.md) for what a session looks like.

## ontology-review

Reviews an ontology against the rules a script can't check, such as whether an is-a link is true and whether siblings are equally general. It also double-checks the validator's heuristic findings and reports in plain language, with the rule, its source and the exact `okb` commands that fix it. It changes nothing unless you ask.

Start it by asking `review my ontology`. See [Review and iterate](../build/review.md).

## build-domain-kb-from-docs

Turns documentation, usually markdown, into an ontology. It quotes the document word for word, drafts one claim per quote, then has an independent pass check each claim against its quote. It never auto-merges a claim it can't verify, and it stops for a person wherever the pipeline can't decide. It needs an ontology with a scope and at least three competency questions first, so build that with the coach.

See [From existing docs](../EXTRACTION-PIPELINE.md) for the pipeline.

## Install a skill

okb has no command that installs skills yet. To install a skill, link its folder into `~/.claude/skills/`, which Claude Code loads skills from. Run this from your `ontology-kit` folder:

```bash
mkdir -p ~/.claude/skills
ln -s "$PWD/skills/ontology-coach" ~/.claude/skills/ontology-coach
ln -s "$PWD/skills/ontology-review" ~/.claude/skills/ontology-review
ln -s "$PWD/skills/build-domain-kb-from-docs" ~/.claude/skills/build-domain-kb-from-docs
ls ~/.claude/skills
```

```text
build-domain-kb-from-docs
ontology-coach
ontology-review
```

Link only the ones you want. A link keeps the skill current when you `git pull` the repo. If you copy a folder instead, replace it when you update. Start a new Claude session after you install or update a skill, so it loads the new version. The [Installation](../getting-started/installation.md) page has the rest of the update steps.

## Check the version

Near the top of each `SKILL.md`, under its title, a line says which version it is:

```text
**Version 2.4.0.** It should match the meta-KB version that `okb version` prints.
```

All three skills share the meta-KB's version number, and `okb version` prints it:

```bash
okb version
```

```text
okb 1.0.0 · meta-KB 2.4.0
```

Each skill checks the two numbers when it starts. If they differ, it tells you the skill or okb is out of date before it goes on. A new meta-KB version means a rule's meaning changed, or a skill's instructions did. The [changelog](../CHANGELOG.md) lists what changed in each one.
