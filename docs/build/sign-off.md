# Sign off on a KB

You know the subject. A document, a policy or a design guide was turned into rules, and now someone needs you to say whether the rules are right. This page is for you, and for a teammate who reviews a pull request (PR) that changes the KB. You don't need to know git or JSON.

## What you decide

You answer one question for each rule: **does this rule say what the document says?**

That is a check on facts. It isn't a check on how the KB is built. If you think "these two things shouldn't be kinds of each other", write that down as a comment for the maintainer. [Review and iterate](review.md) covers the modeling questions.

Each rule has already been through two steps:

1. A first pass pulled the rule out of a quote from the document.
2. A second, independent pass compared the rule to its quote. It gave one of three results.

| Result        | What it means                                                            | What happens next                                           |
| ------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------- |
| `SUPPORTED`   | The quote backs the rule.                                                | Nothing blocks the merge. Read these after the others.      |
| `OVERREACH`   | The rule said more than the quote. The checker wrote a narrower wording. | It stays blocked until a person approves the narrower rule. |
| `UNSUPPORTED` | The quote doesn't back the rule at all.                                  | The maintainer removes it or finds a better quote.          |

Your decision on a rule is one of four:

- **Keep** it.
- **Reject** it.
- **Reword** it. You give the words.
- **Not sure.** Someone else should look.

## Read the problem cases first

Ask the maintainer, or run this yourself, to write a page of every rule beside its source:

```bash
okb docs --out review --context
```

```text
✓ Wrote rules-in-context.md to review.
```

Open `review/rules-in-context.md`. It starts with a **Needs a person** section. Here is the one rule in a small test KB:

````markdown
### White wine MUST be chilled before

**MUST.** White wine SHOULD be chilled before serving.

- Needs a person: OVERREACH: corrected, and no person has approved the correction yet.
- Rule: `rule.white-wine-must-be-chilled-before`
- Governs: WhiteWine
- Verification: overreach, confidence corrected
- Verifier's note: narrowed MUST to SHOULD; the source gives no hard requirement <https://github.com/example/wine-kb/pull/7#discussion_r1>
- Original draft, before the correction: White wine MUST be chilled before serving.

**Quote** (Serving, Serving, line 3):

> Chill white wine before serving.

The source around it (the quoted lines are marked with `>`):

```text
  1 | # Serving
  2 |
> 3 | Chill white wine before serving.
  4 |
```
````

The page puts the risky rules first. The order is `UNSUPPORTED`, then `OVERREACH` that nobody approved, then rules not yet checked, then rules whose quote is gone from the document. Work down the list in that order.

For each rule, read the quote, then the lines around it. A neighboring sentence often narrows the quote ("except for sparkling wine"), and that is the most common way a correction turns out to be wrong. Then ask:

- Does the corrected wording match what the document means, not only what one sentence says?
- Is the strength right? MUST means required. SHOULD means advised. MAY means allowed.
- Is anything missing that the document says a few lines away?

If your time is short, stop after the problem cases. Say what you didn't read. A rule nobody read is a rule nobody checked.

## When a change is under review

If you are reviewing a PR and not a whole KB, you don't need every rule. Ask for only what the change touched:

```bash
okb docs --out review --changed main
```

```text
✓ Wrote 7 changed pages and changes.md (0 source changes not yet in the KB) to review (start at changes.md).
```

Read `review/changes.md` first. It lists the pages that changed, including the pages of subclasses that inherit a changed rule. It ends with a list of source changes that nobody has re-synced yet. If that list isn't empty, stop. A document changed after the rules were written, so what you would approve is out of date. Ask the maintainer to run `okb source refresh --all` first.

## Sign off with the skill

The easiest way is the **ontology-signoff** skill. You need Claude, and the skill must be installed (see [Skills](../reference/skills.md#install-the-skills)). Start it by saying:

```text
I'm the subject-matter expert, help me review the KB
```

The skill asks if this is a first read or a review of a change. Then it shows one rule at a time, in plain words, with the quote and the lines around it, riskiest first. It runs the `okb` commands for you. After each decision it says how many are left, and you can stop at any point.

It records a decision in only one case: you say yes to a corrected rule by name, such as "yes, approve the white wine rule". Then it runs `okb verify <rule> --approve` and prints the command. It never approves a batch you haven't read. A "yes" to a list, or "looks fine", isn't enough, so it goes back and takes the rules one at a time.

At the end it gives you a summary to paste as a review comment. It lists what you approved, what you want changed, what you weren't sure about and what you didn't see. It doesn't post it for you.

## Sign off by hand

If you prefer a terminal, or Claude isn't available, run the commands yourself. First see what is waiting:

```bash
okb check
```

```text
okb check: Wine and Food  (okb 0.1.0, KB pins 0.1.0)

✓ Validation (okb validate --all): no errors
✓ Quotes are still in their sources: every checked quote is still in its source
✗ Rules and extracted facts are verified: 1 problem: something unverified, not supported by its quote, or without a quote
    ✗ Rule 'White wine MUST be chilled before' was corrected after claiming more than its quote supports. A person must check it: okb verify rule.white-wine-must-be-chilled-before --approve
✓ okb version: installed 0.1.0, pinned 0.1.0

✗ Not safe to merge: 1 of 4 checks failed.
```

Each failing line names the rule and the command. Read that rule in `rules-in-context.md`. If the corrected wording is right, approve it:

```bash
okb verify rule.white-wine-must-be-chilled-before --approve
```

```text
rule.white-wine-must-be-chilled-before: approved by a person (was OVERREACH).
```

Run `okb check` again. When nothing is waiting, it says `Safe to merge`. Approve a rule only after you have read it. An approval you didn't earn makes the check mean nothing.

## Leave a note and a link

A verdict says what the checker decided. A note says why, so the next person doesn't have to work it out again. Add a link to the PR comment or review thread where the discussion happened.

After an `OVERREACH` correction, `okb verify` prints a suggested note and the command that stores it:

```text
rule.white-wine-must-be-chilled-before: OVERREACH.
Corrected statement: "White wine SHOULD be chilled before serving." (original kept in _originalDraft).
It stays blocked (prov-verified) until a person checks the correction: okb verify rule.white-wine-must-be-chilled-before --approve
Suggested note: narrowed MUST to SHOULD
To store it: okb verify rule.white-wine-must-be-chilled-before --status OVERREACH --corrected "White wine SHOULD be chilled before serving." --note "narrowed MUST to SHOULD"
```

Run the stored version, and add `--ref` if a thread explains the choice:

```bash
okb verify rule.white-wine-must-be-chilled-before --status OVERREACH --corrected "White wine SHOULD be chilled before serving." --note "narrowed MUST to SHOULD; the source gives no hard requirement" --ref https://github.com/example/wine-kb/pull/7#discussion_r1
```

A good note is one sentence. It names the word, number or claim that changed, and it doesn't repeat the verdict. `--ref` takes an `http` or `https` link. The note and link show up beside the rule in `rules-in-context.md`, as the example above shows.

For an `UNSUPPORTED` result, `okb verify` suggests naming the part of the statement the quote doesn't support.

## What is not yours to do

- **Approve what you haven't read.** Approval covers one rule you saw, beside its quote.
- **Fix the KB.** If a rule is wrong, badly worded or missing, say so with the rule's name and your words. The maintainer rejects, rewords or adds it, and then it comes back to you. Don't remove a rule or rewrite a verdict to make a problem go away.
- **Judge the structure.** Comments like "these shouldn't be kinds of each other" go to the maintainer as comments, or to a modeling review with [`okb review`](review.md).
- **Own the supported rules.** Nothing in the KB makes a person read a rule the checker marked `SUPPORTED`. If those matter to you, read them in `rules-in-context.md` too, and tell the KB's owner about the gap.

## What to read next

- [Maintain a KB: the whole workflow](maintainers.md) shows where sign-off fits.
- [Maintain a KB with a team](maintaining.md) shows what the maintainer does with your follow-ups.
- [Check a KB before you merge](check-in-ci.md) shows how the check runs on every PR.
