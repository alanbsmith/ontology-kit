/** The package version, read from package.json so it never drifts from what gets published. */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// src/ and dist/ both sit one level below the package root, as does an installed copy's dist/.
const PACKAGE_JSON = join(dirname(dirname(fileURLToPath(import.meta.url))), "package.json");

export const PACKAGE_VERSION: string = JSON.parse(readFileSync(PACKAGE_JSON, "utf8")).version;
