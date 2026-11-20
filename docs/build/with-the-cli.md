# Build with the CLI

The `okb` command guides you through the eight steps of the method. You run each command, okb refuses common mistakes as you make them, and `okb validate` checks the result against the rules. Use this path if you like a terminal and want to see every change as you make it.

## What you need

Install okb first. The [Installation](../getting-started/installation.md) page has the steps, and `okb version` confirms it works.

## Pick a way in

- **[Quickstart](../getting-started/quickstart.md).** Five minutes, a tiny coffee menu, one rule broken on purpose. Start here if you want to feel the loop before you commit to a subject.
- **[Wine tutorial](../../examples/wine/tutorial/0-intro.md).** Eight pages that build the wine ontology from _Ontology Development 101_, with every command and its real output.
- **[Espresso tutorial](../../examples/espresso/tutorial/0-intro.md).** The same eight steps on a café menu, where you decide whether something is a class or an instance.

After one of those, build your own subject with the same commands.

## The loop

Every step works the same way. Ask okb where you are, do the step, check it, then move on:

```bash
okb status
okb step
okb validate
okb step next
```

- [`okb status`](../CLI.md#cmd-status) shows your step and what's left in it.
- [`okb step`](../CLI.md#cmd-step) prints the guide for the current step: its goal, its questions and a wine example.
- [`okb validate`](../CLI.md#cmd-validate) lists errors (fix them), warnings (fix them or record why not) and hints. Add `--all` to see the findings for later steps too.
- [`okb step next`](../CLI.md#cmd-step) moves on when you're ready.

When a finding isn't clear, `okb explain <rule-id>` gives it in plain words with the source quote. See [How do I read and fix a finding?](../learn/rules-and-findings.md).

## The commands, by step

| Step                                          | You do                                         | Main commands                                                  |
| --------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------- |
| [1. Scope](../METHOD.md#step-1-scope)         | State the purpose and the questions to answer. | `okb scope`, `okb cq add`                                      |
| [2. Reuse](../METHOD.md#step-2-reuse)         | Check for a vocabulary you could use.          | `okb reuse add`, `okb reuse none`                              |
| [3. Terms](../METHOD.md#step-3-terms)         | List the words your subject uses.              | `okb term add`                                                 |
| [4. Classes](../METHOD.md#step-4-classes)     | Name the kinds of things and how they nest.    | `okb class add`, `okb class disjoint`, `okb tree`              |
| [5. Slots](../METHOD.md#step-5-slots)         | Say what you can state about each kind.        | `okb property add`, `okb relationship add`                     |
| [6. Facets](../METHOD.md#step-6-facets)       | Limit the values.                              | `okb slot set`, `okb class fix`, `okb relationship inverse`    |
| [7. Instances](../METHOD.md#step-7-instances) | Add real examples.                             | `okb instance add`, `okb instance set`                         |
| [8. Review](../METHOD.md#step-8-review)       | Check it against your questions.               | `okb cq link`, `okb validate --all`, [`okb review`](review.md) |

Every command and flag is in the [CLI reference](../CLI.md), and the [cheat sheet](../CLI-CHEAT-SHEET.md) fits on one page. Add `--json` to most commands for machine-readable output.

## Next

Run [the review](review.md) when you reach step 8, and [export](export.md) when you want the data in a graph database.
