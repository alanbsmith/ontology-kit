/**
 * Renders docs/CLI.md from the `okb help` text (src/help.ts), so the command reference
 * can't drift from the CLI. The help is free text, so this reads each `okb <command> ...`
 * usage from it and groups the usages by command.
 */

/** Commands the help text doesn't list, with what to say about them. Shown after the listed ones. */
export const UNLISTED: Record<string, { usage: string; desc: string }[]> = {
  help: [{ usage: "okb help", desc: "show the command summary (also `okb --help` or `okb -h`)" }],
  version: [{ usage: "okb version", desc: "print the okb version (also `okb --version`)" }],
};

interface Usage {
  usage: string;
  desc?: string;
  group: string;
}

/** A stable anchor for a command's section: `cmd-class`. */
export const cmdAnchor = (cmd: string) => `cmd-${cmd}`;

/** Every `okb <command>` usage in the help text, in order, with the help group it appeared under. */
export function parseHelp(help: string): Usage[] {
  const out: Usage[] = [];
  let group = "";
  for (const line of help.split("\n")) {
    const at = line.search(/(^|\s)okb [a-z]/);
    if (at < 0) continue;
    const first = at + (line[at] === " " ? 1 : 0);
    const label = line.slice(0, first).trim();
    if (label && !label.startsWith("(")) group = label.replace(/:$/, "");
    for (const piece of line.slice(first).split(/\s+·\s+|\s{3,}(?=okb [a-z])/)) {
      const [usage, ...rest] = piece.trim().split(/\s{2,}/);
      if (!usage.startsWith("okb ")) continue;
      out.push({ usage, ...(rest.length ? { desc: rest.join(" ") } : {}), group: group || "Getting started" });
    }
  }
  return out;
}

/** The commands the help lists, in first-seen order. */
export function listedCommands(help: string): string[] {
  return [...new Set(parseHelp(help).map((u) => u.usage.split(" ")[1]))];
}

export function renderCliDocs(help: string): string {
  const usages = parseHelp(help);
  const cmds = listedCommands(help);
  const notes = help.split("\n").filter((l) => /^(Names|Global options):/.test(l));
  const lines = [
    "# CLI commands",
    "",
    `> Generated from the \`okb help\` text by \`npm run docs\`. Don't edit by hand: change \`HELP\` in \`src/help.ts\` and regenerate.`,
    "",
    "Run `okb help` for the same summary in your terminal. Each section below is one command, with every form the help lists for it.",
    "",
    ...notes.map((n) => `- ${n.replace(/^([^:]+):/, "**$1:**").replace(/-C <folder>|--json|class:Genre|slot:genre/g, "`$&`")}`),
    "",
    cmds.map((c) => `[\`${c}\`](#${cmdAnchor(c)})`).concat(Object.keys(UNLISTED).filter((c) => !cmds.includes(c)).map((c) => `[\`${c}\`](#${cmdAnchor(c)})`)).join(" · "),
    "",
  ];
  const section = (cmd: string, items: { usage: string; desc?: string }[], groups: string[]) => {
    lines.push(`<a id="${cmdAnchor(cmd)}"></a>`, `## okb ${cmd}`, "");
    if (groups.length) lines.push(`*Listed under:* ${groups.join(", ")}`, "");
    lines.push("```text", ...items.map((i) => i.usage), "```", "");
    const described = items.filter((i) => i.desc);
    for (const i of described) lines.push(`- \`${i.usage}\`: ${i.desc}`);
    if (described.length) lines.push("");
  };
  for (const cmd of cmds) {
    const mine = usages.filter((u) => u.usage.split(" ")[1] === cmd);
    section(cmd, mine, [...new Set(mine.map((u) => u.group))]);
  }
  for (const [cmd, items] of Object.entries(UNLISTED)) if (!cmds.includes(cmd)) section(cmd, items, []);
  return lines.join("\n");
}
