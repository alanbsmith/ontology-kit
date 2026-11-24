// Run as `prepublishOnly` in each published package. npm runs that script only when publishing a
// package folder, never when publishing a tarball. A folder publish would ship `workspace:*`
// dependency ranges and, for @ontology-kit/reader, `exports` that point at the TypeScript sources.
// The release workflow publishes the tarballs that `pnpm pack` makes, which rewrite both.
console.error(
  "::error::Don't publish a package folder: its package.json still has workspace:* ranges and source exports.\n" +
    "Run `pnpm pack`, then `npm publish` the tarball. CONTRIBUTING.md, \"Releases\", has the steps.",
);
process.exit(1);
