/**
 * Every `okb` command, as records (see `command-table.ts`): the one place a command is described,
 * routed and run. `help.ts` and `clidocs.ts` render the help text and docs/CLI.md from this list.
 * To add a command or a form, add a record to the file for its group in `src/commands/`.
 */
import type { Command } from "./command-table.ts";
import { documents } from "./commands/documents.ts";
import { gettingStarted } from "./commands/getting-started.ts";
import { housekeeping } from "./commands/housekeeping.ts";
import { modeling } from "./commands/modeling.ts";
import { planning } from "./commands/planning.ts";
import { reviewing } from "./commands/reviewing.ts";
import { skills } from "./commands/skills.ts";

/** In the order the reference shows them: each group's commands stay together. */
export const COMMANDS: Command[] = [...gettingStarted, ...planning, ...modeling, ...reviewing, ...documents, ...skills, ...housekeeping];

/** Commands and forms that appear in the help text and docs/CLI.md. */
export const documented = (commands: readonly Command[] = COMMANDS) => commands.filter((c) => !c.hidden);

/** The cards on docs/CLI-CHEAT-SHEET.md: the forms that have a `cheat`, in record order. */
export function cheatSheet(commands: readonly Command[] = COMMANDS): { example: string; description: string; command: Command }[] {
  return commands.flatMap((command) => command.forms.flatMap((f) => (f.cheat ? [{ ...f.cheat, command }] : [])));
}
