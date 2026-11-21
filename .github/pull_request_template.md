<!--
The title is a Conventional Commit, like `feat(format): Add a reader for okb-lpg/3`: a type, an optional scope, then a subject that starts with a capital. It becomes the line for this PR in the changelog. CONTRIBUTING.md ("Commits and pull requests") lists the types and scopes.
-->

## Summary

<!-- What changed and why. Link the issue it fixes: "Fixes #123". -->

## Release Category

<!--
Write one of these below this comment. The changelog groups PRs under it.
CLI, Format, Method, Skills, Documentation, Infrastructure, Dependencies
-->

## Release Notes

<!--
What someone using okb or @ontology-kit/format should know: what's new or fixed, and how to use it. This text goes into the changelog and the GitHub release notes, under the PR's title.
Required for feat, fix and perf PRs. For anything else, write "None".
-->

## Breaking Changes

<!--
Only for a breaking change, which also needs a `!` after the type or scope in the title (`feat(okb)!: ...`). Say what breaks and how to upgrade. Delete this section if nothing breaks.
-->

## Checklist

- [ ] `pnpm tsc` and `pnpm test` pass
- [ ] `pnpm lint:docs` and the docs drift check pass, if docs, commands, flags or rules changed
- [ ] `docs/CHANGELOG.md` has a meta-KB entry, if a rule's meaning or a skill's instructions changed
