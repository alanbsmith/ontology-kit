---
name: ontology-signoff
description: Use when a subject-matter expert or a pull request reviewer has to confirm that the facts in an okb knowledge base are right, such as "review the KB", "sign off on these rules", "check the rules", "I'm the subject-matter expert", "I'm reviewing this PR", "approve the corrected rules", "I only have ten minutes". It shows each rule beside its quote and the source text around it, riskiest first, asks for a decision on each, records approvals the person names, and ends with a summary they can send or paste as a review comment. It talks in plain language and runs the commands for the person. It does not build a KB (ontology-coach), extract or verify (build-domain-kb-from-docs), judge modeling quality (ontology-review) or do routine updates (ontology-maintainer).
---

# Sign off on a KB

**Version 2.6.2.** It should match the meta-KB version that `okb version` prints.

For the person who knows the subject but may not know git, JSON or the `okb` command: a subject-matter expert (SME) whose documents an agent turned into rules, or a teammate reviewing a pull request that changes a KB. The job is to put each rule in front of them with the words it came from, get a decision, and keep a record. You run the commands. They answer questions.

This is a check on facts: is this rule true, and does the source say it? It is not a check on how the KB is modeled (is this really a kind of that?). That is **ontology-review**. The commands and their output are in the maintainer guide (<https://ontology-kit.dev/build/maintaining/>) and the CI guide (<https://ontology-kit.dev/build/check-in-ci/>).

## Hard rules

- **Approve only on the person's explicit yes for that named item.** `okb verify <id> --approve` marks one corrected rule as read and accepted. Run it only after showing that rule, and only after the person said yes to it by name ("yes, approve the white wine rule"). A "yes" to a list, "looks fine" or "approve everything" is not enough; go back and take the items one at a time. Print the exact command you ran, and which rule it was for. Never approve a batch the person hasn't read.
- **Never edit the graph to fix a comment.** If they say a rule is wrong, worded badly or missing, write it down as a follow-up with their words and the rule's id. Don't run `okb remove`, `okb verify --status` or any command that changes the KB. The maintainer acts on follow-ups.
- **Show the source before asking.** For every decision, show the rule, then the quote and the lines around it. Never ask "is this right?" about a rule without the text it came from.
- **Say what was not reviewed.** End every session with what the person did not see: items left, rules nobody read, sources that changed without a re-sync. Say it even when they stop early.
- Don't judge the rule for them. You may say what the checker found; the decision is theirs.
- Write in the person's language. Say "rule", "quote", "the document", not "node", "LPG" or "locator". Don't show JSON, ids or command output unless they ask. Keep an id in brackets after a rule's name so they can find it again.

## Step 0: Set up

1. Run `okb version`. Compare the meta-KB version with this skill's version (top of this file). If they differ, tell the person the skill or okb is out of date and offer `okb skills status`, then `okb skills install`, before going on.
2. Find the KB folder (the one with `okb.json`). Make sure you are in it and that the source documents are on disk beside it: the context views read them.
3. Pick a scratch folder for the review pages, outside the KB folder (for example a new folder under the system temp directory). Use the same one for the whole session. Never write review pages into the KB's own `docs` folder.
4. Ask what they are here to do, in one question: "Is this the first time you're reading what was pulled out of your documents, or are you reviewing a change someone made?" First time: Story 1. A change: Story 2. If they say they have little time, run the story and use Story 3's order.
5. Say what to expect, in two sentences: how many rules need a decision (from Step 1), and that nothing in the KB changes unless they approve a rule by name.

## Story 1: The first review of a freshly extracted KB

Scope: everything.

1. **Count what is open.**

   ```bash
   okb status
   okb check
   ```

   `okb check` lists what blocks a merge: rules with no check yet, rules the checker could not support, corrected rules waiting for a person, and quotes no longer in the source. Tell the person the counts in a sentence: "12 rules came out of your documents. 9 passed the check. 2 were reworded by the checker and wait for you. 1 the checker could not find in the quote." If `okb check` reports quotes missing from the source, say so now: the source changed after the extraction, and the maintainer must re-sync it first (see Hand-off below).

2. **Write the rules-in-context page** and read its top section. Problem cases come first on it:

   ```bash
   okb docs --out <scratch folder> --context
   ```

   `rules-in-context.md` lists, for each rule: the statement, how strong it is (MUST, SHOULD, MAY), the check result, the checker's note if there is one, the original wording of a corrected rule, the quote, and the source lines around the quote with the quoted lines marked.

3. **Walk the problem items, one at a time**, in this order: the checker could not support it (`UNSUPPORTED`), reworded by the checker and not yet approved (`OVERREACH`), not checked at all, no quote, quote missing from the source. For each item use the decision prompt below.

4. **Record the decision.** What "record" means depends on the item:
   - A reworded rule, the person says yes to the corrected wording: run the approval command for that one rule, print it, and say what it did. If the new wording uses a different MUST, SHOULD or MAY from the original, say so before asking: okb has already changed the rule's stored strength to match, and the original wording is shown beside it.

     ```bash
     okb verify <rule id> --approve
     ```

   - Anything else (they reject the rule, want other wording, are unsure, or the rule is unsupported and they want to keep it): don't change the KB. Add it to the follow-up list with their words. Say who acts next: the maintainer.
   - A rule with no check yet can't be approved here. It needs the independent check first (build-domain-kb-from-docs, Step 3). Put it on the follow-up list; the person can still say whether it reads right.

5. **After each decision, say how many are left** ("Approved. 2 more need you.") and offer to stop.

6. **The read-through.** Once the problem items are done, write the full reference pages and show the person the KB as a whole, so they read the rules as a set and not one by one:

   ```bash
   okb docs --out <scratch folder>
   ```

   Open the index (scope, the questions the KB answers, the class tree) and one class page at a time in plain words. Ask if anything is missing, or contradicts something else. Write every "this doesn't make sense as a whole" comment down as a follow-up. Don't edit anything.

7. **Close out.**

   ```bash
   okb check
   ```

   Report what is left and who must act (see "End of every session").

Done when every item that needs a person has a recorded decision, and `okb check` has nothing waiting for approval, or the items that remain are listed with who must decide.

## Story 2: Review a change

Scope: what the change touched, and what it reached: rules a class passes down to its subclasses, rules about a class whose slots changed, other rules that cite the same quote.

1. **Get the base.** Ask which branch or version the change is measured against, usually `main`. Don't guess if it's unclear.

2. **Say what changed, in words:**

   ```bash
   okb diff <base>
   ```

   Summarize it in plain language: what was added, removed, renamed, and which rules now say something different. A rule's old and new wording go side by side.

3. **Write the changed-only pages.** They hold only the pages that differ from the base, plus the subclass pages a changed inherited rule reaches, plus `changes.md`:

   ```bash
   okb docs --out <scratch folder> --changed <base>
   ```

   Read `changes.md` first. If a rule's effect is wider than the pages it sits on, add `--hops 1` to also write pages one link away.

4. **If a source document changed and the KB wasn't re-synced:** `changes.md` lists quotes that are gone or moved and blocks that are new or changed. When it does, stop. Tell the person that the document changed but nobody has updated the rules from it, so what they would sign off on is out of date, and that the maintainer has to run the re-sync first (**ontology-maintainer**, Flow 1). Don't ask for decisions on rules whose quotes are gone. Offer to continue with the rules that are unaffected, and say that the rest were not reviewed.

5. **Write the rules-in-context page** and go to each rule the change touched or reached:

   ```bash
   okb docs --out <scratch folder> --context
   ```

   That page lists every rule, so go only to the ones `okb diff` and `changes.md` named. Problem cases first, same order as Story 1 step 3, then the changed rules that passed the check.

6. **Decide and record,** exactly as in Story 1 step 4. A changed rule that passed the check needs a decision too: "Does this still hold?" Their "yes" is a recorded decision; no command is needed for it.

7. **Give them the summary to post.** Write it in plain language, ready to paste as a pull request review comment:
   - One line verdict: all decided and fine, or what is open.
   - The rules they approved (names, with the command you ran for each).
   - The rules they rejected or want reworded, in their words.
   - Questions about the whole.
   - What was not reviewed.

   Don't post it for them. They copy it, or ask you to save it as a file outside the KB folder.

Done when the reviewer has a decision on every changed rule they were shown, and a comment to post.

## Story 3: I only have a few minutes

Use either story, with this order, riskiest first:

1. `UNSUPPORTED` rules.
2. `OVERREACH` rules not yet approved.
3. Rules not yet checked, or with no quote.
4. Changed rules that passed the check (Story 2 only).
5. The rest, if time is left.

After every decision, say how many are left in each group, and ask "Keep going, or stop here?" When they stop, don't skip the close-out: say what is left, and list it so nobody has to start again.

## The decision prompt

For each item, show these in order, in this shape:

1. What the rule says now, in one sentence, and how strong it is ("The KB says: white wine **should** be chilled before serving").
2. What the checker found, in plain words:
   - `SUPPORTED`: "The checker agreed the quote says this."
   - `OVERREACH`: "The checker thought the rule said more than the quote. It proposed a narrower wording, shown below. The original is also shown."
   - `UNSUPPORTED`: "The checker could not find this rule in the quote."
   - Not checked: "Nobody has compared this to its quote yet."
   - Add the checker's note if there is one.
3. The quote, and the lines around it from the document, with the quoted lines marked. Name the document and the section it comes from.
4. The question, one at a time:
   - A reworded rule: "Does the new wording match what the document says? Say 'approve' with the rule's name, or tell me what's wrong."
   - A rule the checker could not support, or a changed rule: "Is this rule right, given this text? Keep it, reject it, or tell me the wording you'd want."
5. Their answer in one of four forms: **keep** (as it stands), **reject** (the rule should go), **reword** (they give the words), or **not sure** (leave it for someone else). Repeat it back in one line before you act on it. Treat "yes", "fine" and "OK" as a keep, never as approval of something they haven't been shown.

If the quote alone can't settle the question because the document says more elsewhere, say so and don't decide for them. "Not sure" is a valid answer, and it goes on the list.

## End of every session

Whether they finished or stopped, close with:

- **Decided**: each rule with their decision. For approvals, the exact command you ran.
- **Follow-ups for the maintainer**: each rule to reject, reword or add, with their words and the rule's id. Nothing in the KB was changed for these.
- **Not reviewed**: rules not shown, rules that passed the check and that nobody read, changed sources that haven't been re-synced, and whether `okb check` still has anything waiting. Say it plainly, even if the list is long.
- **Who acts next**: usually the maintainer, with the follow-up list, or the person themselves to approve the rest when they have time.

Run `okb check` once more, and tell them whether it says "Safe to merge" or what still blocks it.

## Hand-off

- A source changed, or quotes are missing: **ontology-maintainer**, Flow 1. Wait for it before asking for decisions that depend on the text.
- A rule needs an independent check before anyone can approve it: **build-domain-kb-from-docs**, Step 3.
- They say the structure is wrong ("these shouldn't be kinds of each other"): that is a modeling comment; capture it as a follow-up and point to **ontology-review**.

## What this skill doesn't do

- **Build** a KB (ontology-coach), **extract or verify** from documents (build-domain-kb-from-docs), **update** it routinely (ontology-maintainer), or **judge the model** (ontology-review).
- **Change the KB** other than `okb verify --approve` on a rule the person named. Rejecting, rewording and removing are follow-ups.
- **Decide who checks the rules the checker supported.** The pipeline (`docs/EXTRACTION-PIPELINE.md`) assigns a person only to corrected rules. A rule the checker marked `SUPPORTED` was read by a second pass and no one else, and nothing in the KB makes a human look at it. This skill shows them in the read-through and in a changed-rule review, but it can't make anyone responsible for them. If it matters, tell the owner this gap exists.
- **Post the review.** The person sends the summary.
