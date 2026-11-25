---
summary: Maintaining a KB, done 2026-11-24 (#140). Making a KB safe for a team to change.
updated: 2026-11-25
links: ["https://github.com/alanbsmith/ontology-kit/milestone/2", "Discussion #105"]
---

# Maintaining a KB

## Why

Discussion #105's third goal: a KB should be safe for a team to change. Today it's built by one person; a team needs changes that merge cleanly in git, a diff that shows what changed in meaning, and a check that says a change is safe to merge.

## Why now

The kit is installable (0.1.0), so people can start keeping KBs. The format has to be safe to collaborate on before teams adopt it, and before tools depend on it in the Serving a KB milestone.

## Done when

Done: #140 merged on 2026-11-24, covering every item #105 lists for the milestone:

- **Team core:** ids two branches can't both create, one node or edge per line so git merges cleanly, a JSON Schema and compatibility policy for the format, `okb diff`, `okb check` with a copyable CI workflow, and `okb release` for pinned KB versions.
- **Then:** `okb source refresh` for re-syncing after a source changes, `okb docs` for generated reference pages, and the maintainer and sign-off skills.

## Log

- 2026-11-21: work started on the `maintaining` branch, format first (`okb-lpg/3`).
- 2026-11-22: PR #140 open; fixes for CodeRabbit review findings landed that afternoon.
- 2026-11-22: milestone file started with the brain.
- 2026-11-24: #140 merged; main at meta-KB 2.6.3.
- 2026-11-24: released in 0.2.0 (#148).
- 2026-11-25: tracker #87 and the GitHub milestone closed; #143 moved to Serving and #19 to Subject-matter experts.
