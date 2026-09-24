# Code review: ontology-kit v1 (2026-09-23)

A review against the js-code-quality skill (Fowler's Refactoring, Clean Code, Ousterhout, Beck's Tidy First?, Effective TypeScript), written as a worklist for refactoring in Claude Code. It's a critique only; nothing below has been applied.

**Safety net:** `npm test` (77 tests, including an end-to-end build of the wine example and the Button markdown fixture) and `npx tsc`. Run both after every step. Make each item its own commit, and never mix a refactor with a behavior change.

**Before starting:** `git init && git add -A && git commit -m "v1"`.

Sizes: `checks.ts` 888 lines · `ops.ts` 668 · `cli.ts` 654 · `model.ts` 494 · `markdown.ts` 340 · `render.ts` 329 · everything else < 250.

---

## Issues found

### Quick tidyings (cheap, low-risk; Beck)

- **Delete dead code.** In `markdown.ts` `locate()`, `pos = -1;` at the end of the loop does nothing, and `let pos` can be `const`. `normalize` is imported but unused in `provenance.ts` (`tsc --noUnusedLocals` finds it). `slotKind` in `ops.ts` is exported but only used once. Either use it everywhere `valueType === "Instance"` is tested, or delete it (see Design #2).
- **Normalize symmetries.** "Strip accents" (`.normalize("NFKD").replace(/\p{M}/gu, "")`) is written out 5 times across `naming.ts` and `quotes.ts`. Make it one `stripAccents()` helper in `naming.ts`.
- **Explaining constants.** Several magic numbers encode rules or tuning: `12` (hier-too-many-children, from the paper), `3` (competency questions), `10` (terms), `0.9` (duplicate-quote similarity), `0.4` (closest-quote match), `12` (review prompts shown). Name them. The ones that come from the meta-KB (12, 3, 10) could become rule parameters in `rules.yaml` so the docs and the code can't disagree.
- **JSON output helper.** `if (v.json) return void console.log(JSON.stringify(x, null, 2));` appears about 10 times in `cli.ts`. Replace it with `output(v, data, () => humanText)`.
- **Enable `noUnusedLocals` / `noUnusedParameters`** in `tsconfig.json` so dead code stays out.

### Refactoring opportunities (Fowler)

- **Switch statements / long function: `cli.ts` `main()`.** One ~550-line `switch` in which every case repeats _parse options → load → call an op → save → print_. Adding a command means editing the switch, the help text and the option parsing separately (change amplification). → **Replace Conditional with a command table**: `{ name, sub?, options, usage, run(ctx) }` records, with the help text generated from the same table. The shared _load / mutate / save / print_ part becomes one runner, and each command becomes a few lines.
- **Large module / divergent change: `ops.ts`.** It holds naming checks, scope, conventions, competency questions and terms, classes, slots, value assignment, relationships, instances, decisions, rename and remove. The relationship-storage change in v2 had to touch `assign`, `inverse`, `updateSlot`, `rename`, `remove` and `addInstance`. → Split by reason-to-change (`ops/naming.ts`, `ops/classes.ts`, `ops/slots.ts`, `ops/values.ts`, `ops/admin.ts`), **but only after Design #1**, which removes most of the cross-cutting code.
- **Long function: `review.ts` `buildReview()` (~100 lines).** It's a `switch` over rule ids, while `checks.ts` models the same idea as a registry (`CHECKS: Record<ruleId, fn>`). → Use the same shape: `REVIEW_PROMPTS: Record<ruleId, (ont) => {prompts, flags}>` (Normalize Symmetries across the two files).
- **Long function: `markdown.ts` `parseMarkdown()` (~150 lines).** One loop with a sequential `if` block per block kind, each with its own scanning logic. → Extract `readFence`, `readTable`, `readList`, `readQuote` and `readParagraph`, each `(lines, i) => { block, next }`. Here extraction really does hide complexity (every branch has its own termination rules), so this isn't Extract Function for its own sake.
- **Duplicated code in `checks.ts`.** "For each class with ≥ 2 children…" appears 5 times (lines ~287, 366, 380, 557, 636), and slot × class loops repeat as well. → Small shared iterators (`parentsWithChildren(ont, min)`, `rangeLists(ont)`). Keep the checks themselves separate: the one-check-per-rule registry is a good, deep design.
- **Long function: `struct-well-formed` (64 lines).** It validates nodes, the Ontology singleton and edges. → Split it into `checkNodes`, `checkOntologyNode` and `checkEdges` inside the same rule.

### Clean code

- **Output argument / hidden channel: `runChecks()`** smuggles `hiddenLater` onto the returned array, and `cli.ts` reads it back with `(findings as any).hiddenLater`. It has already bitten once: a test's `deepEqual` saw the extra property. It's now non-enumerable as a stopgap. → Return `{ findings, hiddenLater }`. (It's also an Effective TS issue; see below.)
- **Flag-shaped strings: `status.ts`** decides which rules count as "hierarchy / slot / instance" rules with regexes over rule-id prefixes (`/^(struct-|hier-|inst-are-leaves|…)/`). Renaming a rule silently changes a step's "done" criteria. → Use the meta-KB's own step→rule links (`meta.stepRules(n)`), which already exist.
- **Boolean via side channel: `addLink()`** detects "was an edge added?" by comparing `edges.length` before and after `addEdge`. → Have `addEdge` return `{ edge, created }`.

### Design / complexity (Ousterhout)

1. **Information leakage: relationship storage.** Knowing that "a relationship slot's values are edges of type `relType`, stored once from the primary side of an inverse pair" is spread across `model.ts` (`linkSpec`, `linked`, `addLink`), `ops.ts` (`claimRelType`, retype on rename, promote on remove, merge on inverse, type change in `updateSlot`), `checks.ts` (`relationshipTypes` in struct checks), and `export.ts`. One conceptual change touched about 8 functions in 4 files. → **Pull it down into one deep module** (for example `model/relationships.ts`) with a small interface: `valuesOf`, `setValues`, `declareInverse`, `renameRelationship`, `dropRelationship`, `edgeTypes`. `ops.ts` then calls intents instead of manipulating edges.
2. **Shallow type model: `GraphNode` is `{ id; type; [prop: string]: any }`.** Every node property is `any`, so `tsc` can't catch a misspelled `valueType` or a missing `relType`, and `valueType === "Instance"` has to be re-tested everywhere (unknown unknowns). → See Effective TS below. This is the biggest single quality gain.
3. **Pass-through layer, minor: `mutate()` in `cli.ts`** (load → fn → save → print) is fine. But `provenance.addQuote` is async while every other op is sync, so the CLI special-cases it. Once markdown is the main source format, consider making PDF loading the only async path, behind `loadSourcePages`.

### Effective TypeScript

- **`any` as an escape hatch:** the `GraphNode`/`GraphEdge` index signatures, `(node.tests as any[])` in `render.ts` and `gendocs.ts`, `(findings as any)` in `cli.ts`, and `(e as any)?.code`. → Model the file format as a **discriminated union**: `type OkbNode = OntologyNode | ClassNode | SlotNode | InstanceNode | …` keyed on `type`, with `SlotNode` itself a union on `valueType` (`{ valueType: "Instance"; relType: string } | { valueType: "Enumerated"; allowedValues: string[] } | …`). `ofType("Slot")` then returns `SlotNode[]`, and most `?.`, `!` and `as` go away. Do the same for meta-KB nodes (`MetaRule`, `MetaStep`, `MetaDecision`) in `metakb.ts`.
- **Non-null assertions (`!`):** about 50 of them, many `ont.get(x)!` after a lookup that could miss on hand-edited files. → With typed getters, prefer `ont.require(id)` (throws an `OkbError` with a helpful message) over `!`.
- **`readonly`:** `Ontology.nodes` and `edges` are mutated from outside (`ont.edges.push`, direct `n.name = …`). → Make them `readonly` arrays and mutate only through `Ontology` methods, so the indexes can't go stale (see the performance note below).
- **Branded ids:** node ids, rule keys and slot ids are all `string`, and `find(ref)` accepts both names and ids. A `NodeId` brand would catch passing a name where an id is expected, which the lookup code currently handles with fallbacks.

### Other (bugs / risks, not style)

- **Performance: `addEdge()` / `addNode()` rebuild every index on each call** (`reindex()`), so bulk building is quadratic. Measured: 250 instances build in 0.3 s, 1,000 in 3.0 s (10× for 4× the data). At ~10k instances (the icon graph with tags) that's minutes. Validation itself is fast (0.1 s at 1,000). → Update the indexes incrementally in `addEdge`/`addNode`; keep `reindex()` for load and bulk removal. Behavior doesn't change and the existing tests cover it.
- **`disjointImplied()`** calls `edgesOf("DISJOINT_WITH")` and computes ancestor sets on every call, inside nested loops. That's fine now; memoize per validation run if the icon graph gets class-heavy.
- **Patch-by-string-replace in development:** v1 was edited with scripted string replacements, and one run emptied `cli.ts`. It's not in the code, but it's why this list recommends small commits.

---

## Suggested order

1. `git init`, commit v1.
2. Quick tidyings (one commit).
3. **Performance fix** (incremental indexes): a behavior-preserving change with a real payoff for the icon graph.
4. **Typed node model** (Effective TS / Design #2). This will surface real bugs; fix each as a separate commit.
5. **Relationship module** (Design #1), then split `ops.ts`.
6. **CLI command table.**
7. `review.ts` → registry, and `parseMarkdown` → per-block readers, when those files are next touched for a feature (Tidy First: no pressing need until then).

Per Beck, items 6–7 are "tidy when you're about to change it," not urgent. Items 3–5 pay off immediately, because the next features (relationship edge properties, multi-doc extraction, icon-scale data) all run through those areas.

---

## Status (2026-09-23)

Worked through on the `refactor/code-review-worklist` branch, one commit per item. After each step, `npx tsc` and `npm test` passed, and CLI output (human and `--json`) was compared against the previous commit on the wine example, a markdown source fixture and a deliberately malformed ontology.

| Item                                                                                        | Status                                                                                                                                                                                                                                                                   | Commit                          |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| Quick tidyings (dead code, `stripAccents`, named constants, `output()` helper, `noUnused*`) | Done                                                                                                                                                                                                                                                                     | `a8ef8e0`, `1acb523`, `f699caf` |
| Performance: incremental indexes                                                            | Done, plus memoized `naming.key()`, which was the larger cost. 4,000 instances build in 0.7 s (was 11.2 s). Name lookups are still linear scans, so a name index is the next step if the icon graph needs it.                                                            | `9ecd23f`                       |
| Typed node model (Effective TS, Design #2)                                                  | Done: `OkbNode` union, `ont.require()`, typed meta-KB. `any` 41 → 33, `!` 54 → 30.                                                                                                                                                                                       | `c2e8a99`, `1a89887`            |
| Bugs found by typing                                                                        | A markdown Source without `localPath` crashed `okb source outline` and `refresh`                                                                                                                                                                                         | `0abbf58`                       |
| Regressions found by `/code-review`                                                         | The typed-model commit made show, diagram, export, instance add and one check fail on a hand-edited HAS_SLOT to a non-slot. Fixed forward, with tests for malformed files.                                                                                               | `6e78219`                       |
| `readonly` nodes/edges                                                                      | Done                                                                                                                                                                                                                                                                     | `6d4b287`                       |
| Branded ids                                                                                 | Skipped. `find()` accepts names and ids on purpose, and ids arrive from JSON and edges, so a brand would need casts at every boundary for little gain.                                                                                                                   | —                               |
| Output argument: `hiddenLater`                                                              | Done: `runChecks()` returns `{ findings, hiddenLater }`                                                                                                                                                                                                                  | `652aef5`                       |
| Flag-shaped strings in `status.ts`                                                          | Done: uses `meta.stepRules()`. Two naming rules weren't linked to any step, which is now fixed in `steps.yaml`. One deliberate behavior change: `inst-are-leaves` no longer gates step 7's "no instance errors" item (it's a step-4 rule; it still gates steps 4 and 8). | `95c6a70`, `ffc2bc9`            |
| Boolean via side channel: `addLink()`                                                       | Already resolved before this pass: `addLink` checks `linkEdge()` instead of comparing edge counts                                                                                                                                                                        | —                               |
| Relationship module (Design #1)                                                             | Done: `src/relationships.ts`, reached as `ont.rel`                                                                                                                                                                                                                       | `c1b4e25`                       |
| Split `ops.ts`                                                                              | Done: `src/ops/`, re-exported by `src/ops.ts`                                                                                                                                                                                                                            | `43b7e68`                       |
| CLI command table                                                                           | Not done. Tidy when the CLI next changes (see the Beck note above).                                                                                                                                                                                                      | —                               |
| `review.ts` registry, `parseMarkdown` readers                                               | Not done, for the same reason                                                                                                                                                                                                                                            | —                               |
| Duplicated iterators in `checks.ts`, splitting `struct-well-formed`                         | Not done. Low value until those checks change.                                                                                                                                                                                                                           | —                               |
| Magic numbers as rule parameters in `rules.yaml`                                            | Not done. The constants are named, but 3 and 10 still appear in `steps.yaml` text and in the check keys `cq_min3` and `terms_min10`. Needs a parameter mechanism in the meta-KB schema.                                                                                  | —                               |

New observations from this pass:

- `ops.coerce()` (slot values) and `coerceEdgeValue()` (edge properties) parse the same value types separately, and they disagree: slot Booleans accept `y`/`n`, edge-property Booleans don't. Unifying them is a small behavior change.
- `an()` was defined in three places. Now it's defined once, in `naming.ts` (`0d2a446`).
