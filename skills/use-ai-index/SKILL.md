---
name: use-ai-index
description: Use an existing AI Index to navigate a repo before investigating, implementing, or reviewing changes. Read AI_INDEX.md first, open only relevant domain files, follow source paths, respect must_check rules, and sync the graph after meaningful traversal-shape changes.
---

# Use AI Index

Use the repo's AI Index as the default starting point for real work.

This skill is for day-to-day execution, not graph creation.

---

## Goal

Start from the graph, move to source fast, and miss fewer related changes.

---

## When to use it

Use this skill when the repo already has:

- `AI_INDEX.md`
- `AI_INDEX/<domain>.md`

Typical cases:

- bug investigation
- feature work
- code review
- impact analysis
- tracing which files belong to the same change surface

Do not use it to build a new graph from scratch. Use the `generate-graph` skill for that.

---

## Workflow

### Step 1 — Read the root index first

Open `AI_INDEX.md` before broad searching.

Extract:

- repo root
- global rules
- relevant domains from `Open When`

Do not open every domain file.

### Step 2 — Open only relevant domain files

From the root index, choose the smallest set of domains that match the task.

In each domain file, look at:

- `owns`
- `change_surfaces`
- `must_check`
- `## Nodes`

The domain file tells you where related work is likely to live.

### Step 3 — Read source, not prose

After selecting the domain:

1. Open the `at` paths for the critical nodes
2. Follow `uses` edges when they help blast-radius analysis
3. Read the real code before making claims

The graph is the traversal layer. Code is still the source of truth.

If the AI Index lives outside the repo, use the `Repository root` metadata before opening any `at` path.

### Step 4 — Sweep the whole change surface

Before editing, check:

- entry points (`routes`, CLI, jobs)
- orchestration (`services`)
- persistence (`model_utils`, `models`)
- contracts (`api_schemas`, `core_schemas`, `graphql`)
- operational coupling (`configs`, `migration_search`)
- regression surface (`tests`)

If `must_check` exists, treat it as part of the required sweep.

### Step 5 — Sync only if traversal shape changed

After the task, update the AI Index only when the repo traversal shape changed.

Examples:

- new route or job
- new service area
- new config coupling
- new test surface worth keeping
- renamed or removed node
- new non-obvious rule in `must_check` or `Global Rules`

If not, leave the graph alone.

Use the `sync-graph` skill when the graph needs to change.

---

## Rules

- Read `AI_INDEX.md` before broad repo exploration.
- Prefer opening the smallest relevant set of domain files.
- Use `must_check` as a required part of impact analysis.
- Do not treat the graph as prose documentation.
- Do not sync the graph for tiny internal logic edits.
