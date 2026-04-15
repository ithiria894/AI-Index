---
name: ai-index
description: Single entry skill for the AI Index workflow. Decide whether to use an existing AI Index, generate one from scratch, or sync it after meaningful code changes. Use when a repo adopts AI_INDEX.md and AI_INDEX/*.md and you want one default starting point.
---

# AI Index

Use this as the default entry skill when a repo follows the AI Index workflow.

This skill picks the right mode:

- use an existing graph
- generate a new graph
- sync the graph after meaningful code changes

---

## Goal

Start from the correct AI Index mode without guessing which specialized skill to invoke first.

---

## Decision flow

### Mode 1 — Generate

Choose generate mode when:

- the repo has no `AI_INDEX.md`
- the existing graph format is being replaced
- a major restructure made the old graph unreliable

In generate mode:

1. inspect the repo shape
2. define domains by change ownership
3. write `AI_INDEX.md`
4. write `AI_INDEX/<domain>.md`
5. validate paths, tests, and wikilinks

For the detailed build workflow, use the `generate-graph` skill.

### Mode 2 — Use

Choose use mode when:

- the repo already has an AI Index
- you are investigating, implementing, refactoring, reviewing, or tracing impact

In use mode:

1. read `AI_INDEX.md` first
2. resolve `Repository root` if the index is stored outside the repo
3. open only the smallest relevant set of domain files
4. read code at `at` paths
5. sweep `change_surfaces` and `must_check` before concluding scope

For the detailed day-to-day workflow, use the `use-ai-index` skill.

### Mode 3 — Sync

Choose sync mode when:

- meaningful code changes are already complete
- traversal shape may have changed
- new coupling, surfaces, or critical nodes were introduced or removed

In sync mode:

1. map changed files to domains
2. update only affected root or domain files
3. add or remove nodes, paths, and rules only where traversal shape changed
4. revalidate paths and wikilinks

For the detailed update workflow, use the `sync-graph` skill.

---

## Rules

- Code is the source of truth. The AI Index is the traversal layer.
- Prefer the smallest relevant surface over broad repo exploration.
- Keep the graph concise and operational.
- Do not turn the graph into prose documentation.
- If unsure which mode applies, start in use mode, then escalate to generate or sync only when needed.

