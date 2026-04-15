#!/usr/bin/env node

console.error(
  [
    "generate-ai-index.mjs is deprecated.",
    "",
    "AI Index generation is now AI-first.",
    "Use the /ai-index or /generate-graph skill to inspect the repo and build:",
    "  - AI_INDEX.md",
    "  - AI_INDEX/<domain>.md",
    "",
    "See docs/AI_INDEX_SPEC.md for the supported format.",
  ].join("\n"),
);

process.exit(1);
