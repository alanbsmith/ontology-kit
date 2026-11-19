#!/bin/sh
# Runs Vale on the hand-written docs. Vale fails on a path that doesn't exist,
# and the beginner folders (docs/learn, docs/build, examples/*/tutorial-src)
# arrive over time, so skip any that aren't there yet.
set -e
paths=""
for p in README.md CLAUDE.md CONTRIBUTING.md docs/FORMAT.md docs/EXTRACTION-PIPELINE.md \
  docs/CODE-REVIEW.md docs/CHANGELOG.md docs/getting-started docs/learn docs/build \
  examples/*/tutorial-src meta-kb/README.md sources/README.md skills .claude/skills; do
  [ -e "$p" ] && paths="$paths $p"
done
# shellcheck disable=SC2086
exec vale --glob="*.md" $paths
