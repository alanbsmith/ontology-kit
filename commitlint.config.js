// Conventional Commits, checked on every commit and PR title by .github/workflows/pr.yml.
// The scopes live in scripts/conventions.ts; CONTRIBUTING.md ("Commits and pull requests") explains them.
import { SCOPES } from "./scripts/conventions.ts";

export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // `feat(format): Add a reader for okb-lpg/3`: the subject starts with a capital, like the rest of the history.
    "subject-case": [2, "always", "sentence-case"],
    "scope-enum": [2, "always", [...SCOPES]],
    // Commit bodies are prose paragraphs, unwrapped like the docs.
    "body-max-line-length": [0],
    "footer-max-line-length": [0],
  },
};
