# Build with Claude

The ontology-coach skill lets Claude walk you through the whole method. You answer small questions in plain words. Claude explains each idea just before you need it, runs every `okb` command, and shows you what came back. You end up with the same files you'd get by typing the commands yourself.

Use this path if you have Claude Code (or another tool that loads skills from `~/.claude/skills/`) and want a guide who knows the method. Use [With the CLI](with-the-cli.md) if you'd rather type the commands.

## Install okb and the skill

The coach drives the `okb` command, so install okb first with the steps on the [Installation](../getting-started/installation.md) page. Then link the skill into the folder your tool loads skills from:

```bash
mkdir -p ~/.claude/skills
ln -s "$PWD/skills/ontology-coach" ~/.claude/skills/ontology-coach
```

Run this from the `ontology-kit` folder you cloned. The link keeps the skill current when you `git pull`. okb has no command that installs skills yet, so linking (or copying) the folder is how it works today. [Skills](../reference/skills.md) lists all three skills and how to check their versions.

Start a new Claude session after you link it, so the session loads the skill.

## Start the coach

Ask Claude:

```text
coach me through building an ontology
```

You can also type `/ontology-coach`. Claude first checks that `okb` runs and that the skill's version matches the one `okb version` prints. If they differ, it tells you before it goes on.

## What to expect

The coach follows the eight steps in [Method](../METHOD.md), one at a time:

1. **It asks what you want to model**, and what you'll use it for. That's one question, then it creates the folder with `okb init`.
2. **It teaches just in time.** Before it asks you to choose between a class and a property, it explains both in a sentence or two, with an example from your subject.
3. **It does the typing.** Each command runs in your session and you see the relevant part of the output. You don't have to copy anything.
4. **It turns findings into lessons.** When okb refuses a command or `okb validate` reports something, Claude explains it in its own words, shows the rule, and fixes it with you.
5. **It records your choices.** When you pick between two reasonable options, or keep something the validator warns about, it records a [design decision](../GLOSSARY.md#concept-design-decision) with the reason, so you can see later why the model looks the way it does.
6. **It asks for at most two questions at a time**, and uses multiple choice where the answers are a short list.

It starts with scope and [competency questions](../GLOSSARY.md#concept-competency-question) (the questions the ontology must answer) before it touches classes. If you come back another day, it runs `okb status` and picks up where you stopped.

## What the coach won't do

- It won't add a class, property or instance you didn't agree to. It suggests, and you decide.
- It won't edit `nodes.json` or `edges.json` by hand. Every change goes through `okb`, which enforces the naming convention and keeps ids stable.
- It won't skip scope and competency questions. Every later decision leans on them.
- It won't pick a "right" model for you. There's rarely one, and it points you back to your competency questions to choose.

## At the end

In step 8, the coach links each competency question to what answers it, runs `okb validate --all`, and offers a review with [the ontology-review skill](review.md). If your data is headed for a graph database, it shows you [the export](export.md).

## If it doesn't work

- **Claude doesn't offer the coach.** Check that `~/.claude/skills/ontology-coach/SKILL.md` exists, and start a new session.
- **Claude can't find `okb`.** Run `okb version` in your own terminal. If that works, run `npm link` again in the kit folder. If Claude runs in a different environment, give it the path to the kit and it runs `node <kit>/src/cli.ts`.
- **You want to see what Claude did.** Everything it ran is a plain `okb` command. Read the history with `okb status`, `okb tree` and `okb decision list`.
