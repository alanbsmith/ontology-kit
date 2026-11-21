#!/bin/sh
# Runs Vale on the hand-written docs. Vale fails on a path that doesn't exist,
# and the beginner folders (docs/learn, docs/build, packages/okb/examples/*/tutorial-src)
# arrive over time, so skip any that aren't there yet.
set -e
# The Google and write-good style packages are gitignored, so a fresh checkout or worktree
# doesn't have them. Download them on first use (needs network once per checkout).
if [ ! -d .vale/styles/Google ] || [ ! -d .vale/styles/write-good ]; then
  vale sync
fi
paths=""
for p in README.md CLAUDE.md CONTRIBUTING.md docs/FORMAT.md docs/EXTRACTION-PIPELINE.md \
  docs/CODE-REVIEW.md docs/CHANGELOG.md docs/getting-started docs/learn docs/build \
  packages/okb/examples/*/tutorial-src packages/okb/meta-kb/README.md sources/README.md packages/okb/skills .claude/skills; do
  [ -e "$p" ] && paths="$paths $p"
done
# shellcheck disable=SC2086
exec vale --glob="*.md" $paths
