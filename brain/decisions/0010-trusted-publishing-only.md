---
summary: Releases publish from a tag through GitHub Actions with npm trusted publishing; no npm token exists.
status: accepted
date: 2026-11-21
updated: 2026-11-22
links: [commits 9fd9b44 and a3856d3, "CONTRIBUTING.md#releases"]
---

# 0010: Publish only through trusted publishing, from a tag

**Decision:** a `v*` tag runs the release workflow. Only the publish job holds the identity token, and it checks out no code; it publishes tarballs built by a job with no publish rights. The `release` environment only accepts `v*` tags.

**Why:** a stored npm token can leak; a short-lived token tied to one workflow can't be reused. npm's trusted publisher doesn't check the branch or tag, so without the environment rule anyone who could push a branch could publish. Every version also gets provenance.
