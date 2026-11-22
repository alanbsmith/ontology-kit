# Check a KB before you merge

When a team edits a knowledge base on several branches, someone has to answer one question before each merge: is this safe? `okb check` answers it with one command, and a workflow template runs it on every pull request and posts what the pull request changes.

## Run the check

Run it from the ontology folder, or point at one with `-C`:

```bash
okb check
```

It runs four checks and prints one line for each:

| Check                                  | Fails when                                                                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Validation                             | `okb validate --all` finds an error. Warnings and hints are counted but don't block a merge.                                               |
| Quotes are still in their sources      | A quote is no longer in its source document, or the source file can't be read. A source with no `localPath` can't be checked and is noted. |
| Rules and extracted facts are verified | A rule or extracted node is unverified, `OVERREACH` or `UNSUPPORTED`, has no verbatim quote, or is waiting for `okb verify --approve`.     |
| okb version                            | Never. It warns when the installed okb is older than the version the KB pins.                                                              |

A failing check exits with 1, so a script or a CI job can gate on it. A folder that isn't an ontology exits with 2. Add `--json` for the same result as data: `ok`, the installed and pinned versions, and each check with its `status` (`pass`, `warn` or `fail`), a `summary` and its `problems`.

`okb check` only reads. It never changes the folder or takes the write lock, so it is safe to run while someone else edits.

It doesn't yet check competency questions or the ledger. They'll join the list when those features land.

## Pin the okb version

Different okb versions can read the same KB differently, so the KB records the version it was built with. Run this in the ontology folder and commit `okb.json`:

```bash
okb pin
```

It sets `okbVersion` in `okb.json` to the okb you're running. Run it again after you upgrade. `okb check` warns anyone whose okb is older, and the workflow below installs exactly that version.

## Run it on every pull request

Copy `okb-check.yml` from the okb package to `.github/workflows/okb-check.yml` in your KB's repository. It's in `templates/` in `@ontology-kit/okb` (`node_modules/@ontology-kit/okb/templates/okb-check.yml` once installed, or [on GitHub](https://github.com/alanbsmith/ontology-kit/blob/main/packages/okb/templates/okb-check.yml)). If the KB isn't at the repository root, change `KB_DIR` at the top.

On each pull request the workflow:

1. Installs the okb version in `okb.json`. With no pin it warns and installs the latest.
2. Runs `okb check` and fails the job if a check fails.
3. Runs `okb diff` against the base branch.
4. Posts the check result and the diff as one comment, and updates that comment on later pushes instead of adding another.

It needs no secrets. Its permissions are `contents: read` and `pull-requests: write` (for the comment), its actions are pinned to commit hashes, and it never puts text from the pull request into a shell script. A pull request from a fork has a read-only token, so there the result goes to the job summary and no comment is posted.

To block merges on a failing check, require the job `Check the knowledge base` in your branch protection settings.

## What to read next

- [Review and iterate](review.md) covers the judgment rules a script can't check.
- [Maintain a KB with a team](maintaining.md) is the guide for the people who change the KB, with the common changes, their commands and a pull request checklist.
- [Maintain a KB: the whole workflow](maintainers.md) shows where the check fits among the other tools.
- [Sign off on a KB](sign-off.md) is for the person who approves corrected rules.
- [File format](../FORMAT.md) describes `okb.json`.
