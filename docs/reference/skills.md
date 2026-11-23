# Skills

A skill is a folder with a `SKILL.md` file that teaches Claude how to do one job. ontology-kit ships five, in the `packages/okb/skills/` folder. Each one drives the `okb` command, so it does the typing while you make the decisions.

| Skill                                                   | Use it to                                                              | Page                                                 |
| ------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------- |
| [ontology-coach](#ontology-coach)                       | Build an ontology from a blank page.                                   | [Build with Claude](../build/with-claude.md)         |
| [ontology-review](#ontology-review)                     | Get a second opinion on an ontology you've built.                      | [Review and iterate](../build/review.md)             |
| [build-domain-kb-from-docs](#build-domain-kb-from-docs) | Extract an ontology from documentation, with every claim checked.      | [From existing docs](../EXTRACTION-PIPELINE.md)      |
| [ontology-maintainer](#ontology-maintainer)             | Keep an existing KB current: docs changed, a fix, a rename, a release. | [Maintain a KB with a team](../build/maintaining.md) |
| [ontology-signoff](#ontology-signoff)                   | Confirm that a KB's rules are right: a first review, or a change.      | [Sign off on a KB](../build/sign-off.md)             |

## ontology-coach

Coaches someone who has never built an ontology through the eight steps of the [method](../METHOD.md). It asks at most two questions at a time, explains each idea just before it's needed, runs the commands, and records your choices as design decisions. It leaves you with an ontology that passes `okb validate` and a record of why it looks the way it does.

Start it by asking `coach me through building an ontology`, or type `/ontology-coach`. See [Build with Claude](../build/with-claude.md) for what a session looks like.

## ontology-review

Reviews an ontology against the rules a script can't check, such as whether an is-a link is true and whether siblings are equally general. It also double-checks the validator's heuristic findings and reports in plain language, with the rule, its source and the exact `okb` commands that fix it. It changes nothing unless you ask.

Start it by asking `review my ontology`. See [Review and iterate](../build/review.md).

## build-domain-kb-from-docs

Turns documentation, usually markdown, into an ontology. It quotes the document word for word, drafts one claim per quote, then has an independent pass check each claim against its quote. It never auto-merges a claim it can't verify, and it stops for a person wherever the pipeline can't decide. It needs an ontology with a scope and at least three competency questions first, so build that with the coach.

See [From existing docs](../EXTRACTION-PIPELINE.md) for the pipeline.

## ontology-maintainer

Looks after a KB that is already built and kept in git. It starts from what the KB says is open (`okb status`, `okb check`, `okb source refresh --all --json`), picks one of six flows, and finishes with text for a pull request: the source documents changed, a reviewer or CI asked for a fix, a new rule or source, a rename, a PR for a reviewer, and a release. It hands extraction and verification to build-domain-kb-from-docs and modeling questions to ontology-review. It stops for a person wherever one must decide, and it never runs `okb verify --approve`: a person does that after reading the quote.

Start it by asking `the docs changed, update the KB`. See [Maintain a KB with a team](../build/maintaining.md) for the commands it runs.

## ontology-signoff

Walks a subject-matter expert or a pull request reviewer through confirming that a KB's rules are right. It shows each rule beside its quote and the source text around it, riskiest first (rules the checker could not support, then corrected rules waiting for approval, then rules not yet checked), asks for one decision at a time in plain language, and ends with a summary the person can paste as a review comment. It covers a first review of a freshly extracted KB, the review of a change (using `okb diff` and `okb docs --changed`), and a short session that stops early with what is left listed. The only thing it writes is `okb verify --approve`, and only after the person says yes to that rule by name; it prints the command it ran. Everything else they say (reject, reword, "this doesn't fit together") goes on a follow-up list for the maintainer. It says what was not reviewed, and sends the maintainer to ontology-maintainer when a source changed without a re-sync.

Start it by asking `I'm the subject-matter expert, help me review the KB`. See [Sign off on a KB](../build/sign-off.md) for what it asks and records, and [Maintain a KB with a team](../build/maintaining.md) for the commands it runs.

## Install the skills

The skills come in the same package as `okb`, so one command installs them all at the version that matches your okb:

```bash
okb skills install
```

```text
✓ Skills in /Users/you/.claude/skills
  build-domain-kb-from-docs: linked
  ontology-coach: linked
  ontology-review: linked
  ontology-maintainer: linked
  ontology-signoff: linked

  Start a new Claude Code or Cursor session to load them.
```

Claude Code loads skills from `~/.claude/skills/`, and Cursor reads that folder too. By default each skill is a link to the folder inside your okb install, so it stays current when okb updates. Add `--copy` to copy the folders instead (run the command again after you update okb), or `--dir <folder>` to use another skills folder, such as `~/.cursor/skills`. The `OKB_SKILLS_DIR` environment variable sets the folder as well.

Installing again is safe. It replaces a link to an older okb, a broken link or an older copy. It refuses to touch a folder in that place that isn't one of okb's skills, and says what it found and that nothing changed. If you want okb to delete it and take its place, run `okb skills install --force`.

To see what's installed and whether it matches your okb, run `okb skills status`. It exits with code 1 when a skill is missing or out of date:

```bash
okb skills status
```

```text
Skills in /Users/you/.claude/skills  (okb meta-KB 2.6.2)
  ✓ build-domain-kb-from-docs  linked to this okb, version 2.6.1
  ✓ ontology-coach             linked to this okb, version 2.6.1
  ✓ ontology-maintainer        linked to this okb, version 2.6.1
  ✓ ontology-review            linked to this okb, version 2.6.1
  ✓ ontology-signoff           linked to this okb, version 2.6.1
```

Start a new Claude session after you install or update the skills, so it loads the new version. The [Installation](../getting-started/installation.md) page has the rest of the update steps.

## Check the version

Near the top of each `SKILL.md`, under its title, a line says which version it is:

```text
**Version 2.6.1.** It should match the meta-KB version that `okb version` prints.
```

All five skills share the meta-KB's version number, and `okb version` prints it:

```bash
okb version
```

```text
okb 0.1.0 · meta-KB 2.6.2
```

Each skill checks the two numbers when it starts, and `okb skills status` checks them for you. If they differ, run `okb skills install` to refresh the skills. A skill that finds a mismatch tells you the skill or okb is out of date before it goes on. A new meta-KB version means a rule's meaning changed, or a skill's instructions did. The [changelog](../CHANGELOG.md) lists what changed in each one.
