/** Skills: install the Claude skills that ship with okb. */
import { type Command, opt } from "../command-table.ts";
import { renderSkillsInstall, renderSkillsStatus } from "../render.ts";
import { skillsInstallReport, skillsStatusReport } from "../workflows.ts";

const { str, bool } = opt;

const SKILLS_USAGE = "Usage: okb skills install [--copy] [--dir <folder>] [--force]  ·  okb skills status [--dir <folder>]";

export const skills: Command[] = [
  {
    name: "skills",
    group: "Skills",
    summary: "install the Claude skills that ship with okb",
    description: "Puts the skills that come with okb where Claude Code and Cursor load them from, and checks that they match this okb.",
    usage: SKILLS_USAGE,
    forms: [
      {
        sub: "install",
        description: "Links the three skills into `~/.claude/skills/` (a link keeps them current when the package updates), or copies them. It replaces a link to an older okb, a broken link or an older copy. It refuses to touch a folder that is not one of okb's, and changes nothing if it refuses.",
        examples: ["okb skills install", "okb skills install --copy", "okb skills install --dir ~/.cursor/skills"],
        args: [
          ["--copy", "flag", "Copy the skill folders instead of linking to them. Run it again after you update okb."],
          ["--dir", "path", "The skills folder to use instead of `~/.claude/skills/`. The `OKB_SKILLS_DIR` environment variable sets it too."],
          ["--force", "flag", "Delete a folder or file that is not one of okb's skills (or a copy you edited) and put the skill in its place."],
        ],
        options: { copy: bool, dir: str, force: bool },
        usage: SKILLS_USAGE,
        max: 0,
        cheat: { example: "okb skills install", description: "Install the Claude skills that ship with okb" },
        run: (ctx) => {
          const { dir, lines } = skillsInstallReport({ dir: ctx.opts.dir, copy: ctx.opts.copy, force: ctx.opts.force });
          ctx.emit(() => ({ dir, lines }), () => renderSkillsInstall(dir, lines));
        },
      },
      {
        sub: "status",
        description: "Lists each skill with where it is installed and whether its version matches this okb. It exits with code 1 when any skill is missing or out of date.",
        examples: ["okb skills status", "okb skills status --dir ~/.cursor/skills"],
        args: [
          ["--dir", "path", "The skills folder to check instead of `~/.claude/skills/`."],
        ],
        options: { dir: str },
        usage: SKILLS_USAGE,
        max: 0,
        run: (ctx) => {
          const r = skillsStatusReport({ dir: ctx.opts.dir });
          ctx.emit(() => ({ dir: r.dir, metaKbVersion: r.metaVersion, skills: r.skills }), () => renderSkillsStatus(r.dir, r.metaVersion, r.skills));
          if (!r.allCurrent) ctx.exit(1);
        },
      },
    ],
  },
];
