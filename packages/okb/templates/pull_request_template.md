<!-- Copy this file to .github/pull_request_template.md in your knowledge base's repository. -->

## What changed in the knowledge

<!-- One or two sentences. Paste the okb diff comment from CI, or run `okb diff main`. -->

## Checklist

- [ ] `okb check` says "Safe to merge" (the okb check workflow ran it).
- [ ] I read `okb diff main` and every change in it is meant.
- [ ] Each new or changed rule, class or fact cites a quote from a source.
- [ ] I ran `okb source refresh` for every source document I changed, and no quote is missing.
- [ ] A person other than the author ran `okb verify <id> --approve` on every corrected item.
- [ ] I used `okb rename` (not remove and add) for every renamed class, slot or instance.
- [ ] I ran `okb pin` if I upgraded okb.
- [ ] I ran `okb release <version>` and committed the result, if this change is part of a release.
