// TypeScript rewrites `./x.ts` to `./x.js` in the compiled JavaScript but not in the .d.ts files it
// writes, so a consumer's compiler would look for a `./x.ts` that isn't shipped. Run after the build,
// from the package folder (each package's `build` script does): it rewrites ./dist there, or the
// folder named by the first argument.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const dist = resolve(process.cwd(), process.argv[2] ?? "dist");
let changed = 0;
for (const f of readdirSync(dist, { recursive: true, encoding: "utf8" })) {
  if (!f.endsWith(".d.ts")) continue;
  const path = join(dist, f);
  const before = readFileSync(path, "utf8");
  const after = before.replace(/(\bfrom\s+|\bimport\s*\(\s*)(["'])(\.{1,2}\/[^"']*)\.ts\2/g, "$1$2$3.js$2");
  if (after !== before) {
    writeFileSync(path, after);
    changed++;
  }
}
console.log(`rewrote .ts import paths in ${changed} declaration files`);
