#!/usr/bin/env node
// In a source checkout (src/ exists) this runs the TypeScript sources, which Node runs by stripping
// types, so a stale dist/ is never used while developing. The published package ships dist/ and not
// src/, so an installed okb runs the compiled CLI.
import { existsSync } from "node:fs";

const sources = new URL("../src/cli.ts", import.meta.url);
await import(existsSync(sources) ? sources.href : new URL("../dist/cli.js", import.meta.url).href);
