---
name: generate-graph
description: Build an AI-only repository graph (AI_INDEX.md + AI_INDEX/*.md) for any repo. AI inspects the repo, defines domains, records change surfaces, adds critical nodes, and validates the result. No script generation.
---

# Generate Graph

Build the repo's AI Index from scratch.

This is an AI-first workflow. Do not use a generator script. The agent should inspect the real repo structure, decide domain boundaries, and write the graph directly.
Use whichever search, filesystem, and code-navigation tools are available in the current environment.

---

## Goal

Produce an AI Index that is:

- useful for traversal
- useful for blast-radius analysis
- light on prose
- complete at the change-surface level

The output should default to:

```text
AI_INDEX.md
AI_INDEX/<domain>.md
```

---

## Rules

- Do not generate a human guide.
- Do not write explanations of code behavior.
- Do not try to make every function a node.
- Build by repo structure and change ownership, not by package names alone.
- Prefer verified edges. Use inferred edges sparingly.
- If a rule matters for change completeness but is not obvious from imports, record it under `Global Rules` or `must_check`.

---

## Phase 1 — Inspect the repo shape

Read only enough to establish the repo's traversal model:

1. Repo root structure
2. AGENTS / CLAUDE / repo rules if present
3. README / package metadata if needed
4. Main code directories
5. Major test directories
6. Any clear architectural convention files

Look for:

- entry points
- layer conventions
- feature boundaries
- background jobs / workers / ETL
- schema / model layout
- config files that must change with code

Do not start writing the graph before you understand the repo's major layers.

---

## Phase 2 — Define domains

Partition the repo into domains by **change ownership**, not by folder count.

A good domain groups code that tends to change together.

Examples:

- a feature slice
- a utility subsystem
- a platform layer
- a cross-cutting integration area

Avoid:

- one domain per tiny folder
- one giant domain covering unrelated systems
- splitting domains only because routers and services live in different directories

The test:

> If I change this capability, would I naturally inspect these surfaces together?

If yes, they belong in one domain.

---

## Phase 3 — Create the root index

Write `AI_INDEX.md` first.

It must contain:

1. `Read Order`
2. `Global Rules`
3. `Domain Index`
4. `Repository root` if the AI Index lives outside the repo

### Root quality bar

- Root file should be readable in one pass.
- `Global Rules` must contain only repo-wide or multi-domain rules.
- `Domain Index` should let an AI decide which domain files to open next.

Domain Index columns:

| Column | Meaning |
|--------|---------|
| `Domain` | display name |
| `File` | `AI_INDEX/<domain>.md` |
| `Owns` | short category hint |
| `Open When` | task triggers |

---

## Phase 4 — Build each domain file

For every domain, write `AI_INDEX/<domain>.md`.

### Required sections

#### `## Scope`

Must contain:

- `owns`
- `open_when`
- `change_surfaces`

`change_surfaces` should include only the keys that exist in the repo:

- `routes`
- `services`
- `model_utils`
- `models`
- `api_schemas`
- `core_schemas`
- `graphql`
- `jobs_or_etl`
- `tests`
- `configs`
- `migration_search`
- `scripts`

#### `must_check`

Add this whenever related work could be missed by import tracing alone.

Examples:

- config sync after route changes
- migration checks after model changes
- scope enforcement rules
- external contract or payload coupling

#### `## Nodes`

Add only critical traversal anchors:

- main routers
- core services
- important model utils / repositories
- hot query / orchestration paths
- major config or job entry points

Do not create nodes for every helper.

---

## Node format

```markdown
### NodeName
- kind: router|service|model_utils|model|schema|graphql|job|config|module|class|function
- at: `relative/path.py`
- search: term 1, term 2, term 3
- uses: [[NodeA]] (verified), [[NodeB]] (inferred)
- tests: `tests/path/`
- hot: true
```

Field rules:

- `kind`, `at`, `search` are the default core.
- `uses` is optional but strongly recommended for important traversal edges.
- `tests` is optional.
- `hot` is optional and should stay sparse.
- Do not add `names`, `used_by`, or prose descriptions.

---

## Phase 5 — Validate before finishing

Before you consider the build done, verify:

- Every domain in `AI_INDEX.md` has a real file under `AI_INDEX/`
- Every `AI_INDEX/<domain>.md` is listed in the root index
- Every `at` path exists
- Every `tests` path exists
- Every `[[wikilink]]` resolves to one node in the same domain file or an explicitly prefixed node in another domain file
- Every important repo surface belongs to a domain
- `Global Rules` and `must_check` cover the non-obvious repo conventions

---

## Definition of done

The build is done when:

- the repo has a root AI index
- every important domain has a domain file
- all major change surfaces are covered
- critical traversal anchors exist as nodes
- the graph is concise enough for AI to use quickly

Done does **not** require exhaustive symbol coverage.

---

## When to use this skill

Use this skill when:

- the repo has no AI Index yet
- the existing graph format is being replaced
- a major restructure invalidated the old graph

For day-to-day maintenance after code changes, use the `sync-graph` skill.
