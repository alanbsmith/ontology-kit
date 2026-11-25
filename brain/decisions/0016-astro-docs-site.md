---
summary: The docs site at ontology-kit.dev is an Astro site, with its layout and reader features copied from the owner's blog.
status: accepted
date: 2026-11-18
updated: 2026-11-24
links: ["#6", "CONTRIBUTING.md", "https://docs.astro.build/en/concepts/why-astro/"]
---

# 0016: Build the docs site with Astro, from the owner's blog

**Decision:** the docs are published at [ontology-kit.dev](https://ontology-kit.dev) as an Astro site in `site/`. It reads the repo's markdown in place. Its layout, styles and reader features are copied from the owner's personal site.

**Why:** Astro is a simple, fast static site generator that is good at docs ([why Astro](https://docs.astro.build/en/concepts/why-astro/)). The personal site already had the readability and navigation features wanted here, and reusing it cut the number of choices to make.
