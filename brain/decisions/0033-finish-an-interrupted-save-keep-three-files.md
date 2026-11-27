---
summary: Spike #143 found that an interrupted save can leave a KB that passes `okb check`. Keep three files; a marker file lets the next load finish the save. One file is the fallback.
status: proposed
decided-by: owner, on a recommendation
date: 2026-11-26
updated: 2026-11-26
links: ["#143", "#140", "#142", "#92", "#94", "#162", "0012-one-node-or-edge-per-line.md", "packages/reader/src/layout.ts"]
---

# 0033: Finish an interrupted save, and keep three files

**Decision:** keep `okb.json`, `nodes.jsonl` and `edges.jsonl`, and make `writeGraph` finish what it started. After all three temp files are written and flushed, it writes a marker (`.okb.saving.tmp`, which every `.gitignore` that `okb init` wrote already covers), renames the three files, then deletes the marker. A load that finds a marker with no live lock takes the lock and renames the temp files that are left. This changes no file format and no `@ontology-kit/reader` export. One file per KB is not adopted now. It stays the fallback if a program outside okb reads a torn KB in practice (the MCP server in #94, or a loader written from the guide in #162).

**Why:** the problem is real but narrow, and the marker fixes the part that is okb's to fix.

- **How often.** The three renames take about 0.2 ms of a save of about 0.7 ms, on the 108-node espresso KB and the 73-node wine KB. A kill has to land inside that.
- **How it looks.** A crash after the second rename leaves new nodes and old edges. For an added class, `okb validate` exits 0, `okb check` prints "Safe to merge: every check passed", and every command loads it. The class has lost its parent and nothing says so. The next command saves that state as if it were whole. For a removed class the same crash leaves 7 edges to a missing node, which `validate` and `check` report as errors and a plain load refuses.
- **Why not one file.** One file does remove the window. It costs a format bump (`okb-lpg/4`), a per-key manifest to keep merges as clean as today, and changes to about ten source files, five JSON Schemas, 13 test files, the docs, the examples and release snapshots. It would also break the CI template that shipped, which reads `okb.json` directly. The marker is about 30 lines. What it can't cover is a power loss before the files reach the disk, which is a separate question (see the first follow-up).
- **Why waiting is cheap.** A layout change after 1.0 is an ordinary format bump that okb migrates on load, as `/2` to `/3` did, and the reader for `/3` is a few lines.

**Evidence:** from a throwaway copy of the espresso example, with a preload that kills `okb` with `SIGKILL` after N renames, and the real `okb validate`, `okb check` and `okb tree`.

| Real kill, command           | After renames | Files new | `validate` | `check` | Plain load                          |
| ---------------------------- | ------------- | --------- | ---------- | ------- | ----------------------------------- |
| `class add Probe --parent …` | 0 or 1        | none      | 0 errors   | passes  | loads                               |
| `class add Probe --parent …` | 2             | nodes     | 0 errors   | passes  | loads, `Probe` has no parent        |
| `remove Ristretto`           | 2             | nodes     | 7 errors   | fails   | fails (`c.ristretto` doesn't exist) |

Left behind: `.okb.lock` (judged stale by process id and taken over silently) and `edges.jsonl.tmp`. Both are git-ignored, so `git status` shows only `nodes.jsonl` modified.

The damage for every mix, from the same two commands. The crash itself only produces the first two rows of each block; the others come from a sync tool or a partial copy.

| Files new          | `class add` (node and edge)                              | `remove` (node and edges)                                                     |
| ------------------ | -------------------------------------------------------- | ----------------------------------------------------------------------------- |
| nodes only         | Silent. A class with no parent, no error.                | 7 dangling edges. Loud: `validate` and `check` fail, load refuses.            |
| nodes and manifest | Same as nodes only.                                      | Same as nodes only.                                                           |
| edges only         | 1 dangling edge. Loud.                                   | `slot-value-slot-applies` error: a node with values and no edges. Load works. |
| edges and manifest | Same as edges only.                                      | Same as edges only.                                                           |
| manifest only      | Nothing visible unless the manifest changed (`okb pin`). | Same.                                                                         |

Two more cases:

- **An interrupted migration** from `nodes.json` and `edges.json`, killed after the second rename, leaves both `nodes.jsonl` and `nodes.json`. That fails loudly, but the message says to delete the old `nodes.json`, which leaves new nodes and old edges.
- **A reader without the lock** (a loop that reads while another process saves in a tight loop, 6.7 thousand saves in 6 s) saw a node without its edge, or the reverse, in 5% of 20 thousand reads, and in 30% of 208 reads on a KB padded to 40 thousand records. `Ontology.load` avoids it by waiting for the lock and rereading; a loader that doesn't use the reader package doesn't.

Prototypes, none shipped:

- **One file.** A manifest line, sorted node lines, then sorted edge lines, written with one temp file and one rename. It converts to and from the current layout and back byte for byte. For merges, 14 real `okb` operations (adds, removals, descriptions, `pin`, `step prev`) were merged pairwise, 91 pairs, in both layouts. The naive one file conflicted in 10 pairs against 3, all at a boundary: the manifest line against the first node, the last node against the first edge, and `pin` against `step prev`, which are different lines of `okb.json` but one manifest line. With a section marker line between the three parts and one manifest line per key, it conflicted in 2 pairs against 2.
- **The marker.** Killed after 0, 1 and 2 renames, the next load finished the save every time and the files matched an uninterrupted save. Killed before the marker was written, the old files were untouched.

**Weighed:**

- **One file (`okb-lpg/4`).** The only layout that is safe for every reader by construction, and the better answer if serving a KB makes foreign readers common. Not chosen now for the cost above, and because the marker covers okb's own commands. Reopen it when a program outside okb reads a torn KB, or when #162 asks a loader to read three files in a safe order. The design to start from is the section-marker, per-key-manifest one above, with `okb.json` kept as a pin file so the CI template and `okb pin` keep working.
- **Swap the folder with one rename.** Not chosen: a non-empty directory can't be replaced by a rename on POSIX, so it takes two renames; it also drops the lock, the sources and anything else in the folder, and breaks a process whose working directory is the KB.
- **A hash of the other files in the manifest.** Not chosen: every pair of branches would conflict on it.
- **Reorder the renames.** Nodes then edges fails loudly for a removal and silently for an addition; edges then nodes does the reverse. No order wins both. Putting `okb.json` last is still right (reasoned, not tried): a crash then leaves an old `format` over new data, which the migration from `okb-lpg/1` can repeat, where the current order leaves the new `format` over old edges and loses relationships.
- **Document the limit only.** Cheapest, but `okb check` would keep calling a damaged KB safe to merge.

**Consequences:** the follow-ups are three issues, in this order:

1. **Finish an interrupted save** (reader). Marker, roll-forward under the lock, `okb.json` renamed last, a test with a kill after each rename, and a decision on flushing the temp files and the folder to disk. Today nothing is flushed, so a power loss could leave an empty file after a rename; that wasn't tested here.
2. **Report what an interrupted save leaves** (okb). `okb validate` and `okb check` warn about a leftover `okb.json.tmp`, `nodes.jsonl.tmp` or `edges.jsonl.tmp` or a marker, which also covers KBs last saved by an older okb, and the "Both … exist" message stops telling the user to delete the old file blindly.
3. **Say how to read a KB from another program** (docs, and part of the loader guide in #162): take the lock or reread until nothing changed, and treat a marker as a save in flight.

The lock from #142 stays: it stops two commands overwriting each other, which no layout changes. A merge that deletes a node on one branch and adds an edge to it on another still produces a dangling edge, which `struct-well-formed` already reports.
