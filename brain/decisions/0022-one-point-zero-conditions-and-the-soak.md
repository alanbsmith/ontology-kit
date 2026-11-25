---
summary: Three of the four 1.0 conditions block 1.0, the outside-tool one is reworded, and the CLI soaks for two minors.
status: proposed
decided-by: owner, on a recommendation
date: 2026-11-24
updated: 2026-11-25
links: ["CONTRIBUTING.md#what-0x-means", "#129", "milestones/road-to-1-0.md"]
---

# 0022: Which 1.0 conditions block, and the soak

**Decision:** these block 1.0, from [What 0.x means](../../CONTRIBUTING.md#what-0x-means):

- **A stable CLI.** Two minor releases in a row with no breaking change to command or flag names, exit codes or `--json` shapes, and the docs and skills describing all of them. After the last feature milestone.
- **A format upgrade path.** Documented, and `okb-lpg/3` files load without changes.
- **An outside tool on the reader.** Reworded: `@ontology-kit/mcp` (or another tool) depends only on the published `@ontology-kit/reader` exports and needs no breaking reader change. An independent outside user is welcome but not required.

"A few clean releases" is not a separate blocker. The soak releases will be clean ones anyway.

Before 1.0, the project can ship a prerelease (such as a release candidate) whenever it wants. The infrastructure for that (#129) comes with the first milestone after 0.2.0, and a release candidate itself is optional.

**Why:** the owner picked the first three as blockers and left the fourth out. The prerelease infrastructure is wanted for the time after 1.0, to test changes without breaking users.

**Consequences:** CONTRIBUTING.md still lists four conditions and the old wording of the third. It needs a matching edit when the plan is carried out. The okb-mcp server moves into this repo in #94, which is why the third condition is reworded.
