#!/usr/bin/env node
/** okb: command-line interface. Run `okb help` for usage. */
import { OkbError } from "@ontology-kit/reader";
import { COMMANDS } from "./commands.ts";
import { isParseError, leadingGlobals } from "./command-table.ts";
import { runCommand } from "./runner.ts";
import { SYMBOL } from "./render.ts";

async function main(argv: string[]) {
  // Global options (-C, --json) may come before the command; they also work after it.
  const { globals, rest } = leadingGlobals(argv);
  const words = rest.length === 0 || rest.includes("--help") || rest.includes("-h") ? ["help"] : rest;
  await runCommand(COMMANDS, words, globals);
}

try {
  await main(process.argv.slice(2));
} catch (e) {
  if (e instanceof OkbError || isParseError(e)) {
    console.error(`${SYMBOL.error} ${(e as Error).message}`);
    process.exitCode = 2;
  } else throw e;
}
