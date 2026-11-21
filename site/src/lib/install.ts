/**
 * The install command, defined once. `docs/getting-started/installation.md` shows it and a test
 * checks that it does; the landing page imports it too. Issue #52 replaces it once the npm
 * package ships.
 */
export const INSTALL_COMMAND = `git clone https://github.com/alanbsmith/ontology-kit
cd ontology-kit
pnpm install
pnpm add --global link:./packages/okb`;
