# AI Index Specification v4

## What this is

An AI-only repository graph.

It is not documentation for humans. It is not a README. It is not a knowledge graph written in prose.

It is a structured, AI-maintained map that answers three questions fast:

1. Where should I look first?
2. If I change this, what else must I inspect?
3. Which files, layers, and rules belong to the same change surface?

The code remains the single source of truth. The AI Index is the traversal layer.

---

## What changed from v3

v3 was still too close to a human-readable routing manifest:

- one-file-first
- node-heavy
- script-assisted generation
- optimized for lookup by symbol name

For larger repos, that is not enough.

The new design is:

- **AI-only** — optimize for agent traversal, not human reading
- **split by default** — root index + per-domain files
- **surface-first** — capture change surfaces before leaf nodes
- **AI-built** — no script generation required
- **change-complete** — include non-obvious repo rules that imports alone will miss

---

## Core principles

1. **AI only.**
   Write for an agent that can read code, grep, and follow paths. Do not spend tokens on explanations humans would want.

2. **Code is the single source of truth.**
   Never restate code behavior in prose when a file path or edge is enough.
   If an agent needs to know what a function does, it should read the function.

3. **Surfaces before symbols.**
   For change completeness, `routes`, `services`, `models`, `model_utils`, `jobs`, `tests`, `configs`, and `migration search terms` matter more than exhaustive function lists.

4. **Split by default.**
   Any non-trivial repo should use a root index plus per-domain files. Do not force a monolith.

5. **Only duplicate what code search will miss.**
   Keep:
   - verified edges
   - change surfaces
   - non-obvious repo rules
   - must-check coupling

   Do not keep:
   - long descriptions
   - line-by-line summaries
   - inverse edges that can be grep-derived
   - fields that are expensive to keep fresh but easy to recompute

6. **AI maintains it.**
   The index is built by AI once, then updated by AI after meaningful code changes.

---

## Repository layout

Default layout:

```text
AI_INDEX.md
AI_INDEX/
  <domain>.md
  <domain>.md
  ...
```

Use this layout even for medium repos. Consistency is more valuable than squeezing everything into one file.

If the AI Index is stored outside the repository as a research artifact, keep the same layout and add a repository-root pointer in the root file.

Optional:

```text
AI_INDEX_NOTES/
  <domain>.md
```

Only create `AI_INDEX_NOTES/` if a repo has many non-obvious traps that would bloat the domain file. Prefer keeping everything in the domain file first.

---

## Completeness standard

An AI Index is complete when:

1. Every important code area belongs to exactly one domain.
2. Every important change surface is listed in that domain.
3. Every hot path or reusable anchor has a node.
4. Every non-obvious repo rule that affects change completeness appears either:
   - in `AI_INDEX.md` under global rules, or
   - in the relevant domain file under `must_check`.
5. Every `[[wikilink]]` resolves.
6. Every `at`, `tests`, and change-surface path exists.

Complete does **not** mean:

- every function is a node
- every file is described
- every import edge is written down

---

## Root file format

Path:

```text
{repo_root}/AI_INDEX.md
```

Purpose:

- repo-level read order
- repo-level change rules
- domain list

Format:

```markdown
# AI Index — {repo name}
<!-- Last updated: {ISO date} -->
<!-- Verified against: {commit hash or HEAD} -->
<!-- Domains: {count} -->
<!-- Repository root: {absolute path if AI Index lives outside the repo} -->

## Read Order
1. Read this file.
2. Pick domains from the index below.
3. Open only those domain files.
4. Resolve the repository root.
5. Read source at `at` paths relative to that root before making claims or edits.

## Global Rules
- After adding or moving API routes, update route-linked configs.
- If ORM shape changes, inspect migrations.
- External routes must source tenant identity from the approved dependency.
- ...

## Domain Index

| Domain | File | Owns | Open When |
|--------|------|------|-----------|
| Integrations | `AI_INDEX/integrations.md` | third-party connectors, tool catalogs | connector setup, effective tool resolution, integration behavior |
| Traffic Policy | `AI_INDEX/traffic-policy.md` | request inspection, policy enforcement | session logging, rule config, policy issues |
| ... | ... | ... | ... |
```

### Root file rules

- `Owns` is a short category hint, not prose.
- `Open When` is operational: the situations that should make the AI open that domain file.
- `Global Rules` must only contain rules that affect multiple domains or the whole repo.
- `Repository root` is optional when the index lives inside the repo; include it when the index is stored elsewhere.
- Keep the root file short enough to read in one pass.
- The root file must never become a prose explanation of system behavior. It routes the agent to code; it does not replace code.

---

## Domain file format

Path:

```text
{repo_root}/AI_INDEX/{domain}.md
```

Purpose:

- define the domain boundary
- define the domain change surfaces
- record non-obvious coupling
- list critical nodes

Format:

```markdown
# Domain — {Domain Name}
<!-- Nodes: {count} | Hot: {count} -->

## Scope
- owns: `path/a`, `path/b`, `path/c`
- open_when: short operational triggers
- change_surfaces:
  - routes: `...`
  - services: `...`
  - model_utils: `...`
  - models: `...`
  - api_schemas: `...`
  - core_schemas: `...`
  - graphql: `...`
  - jobs_or_etl: `...`
  - tests: `...`
  - configs: `...`
  - migration_search: `keyword1`, `keyword2`
- must_check:
  - `path/or/system` when X changes
  - `path/or/system` when Y changes

## Nodes

### {NodeName}
- kind: {router|service|model_utils|model|schema|graphql|job|config|module|class|function}
- at: `relative/path.py`
- search: term 1, term 2, term 3
- uses: [[NodeA]] (verified), [[NodeB]] (inferred)
- tests: `tests/path/`
- hot: true
```

### Domain file rules

- `owns` should describe the code area, not every file in the area.
- `open_when` should be short and operational.
- `change_surfaces` is mandatory.
- Only include change-surface keys that actually exist in the repo.
- `must_check` is mandatory if imports alone would miss related work.
- `## Nodes` should contain only the anchors an agent is likely to traverse through.

---

## Change surface keys

These keys exist to prevent missed edits in large repos. Use only the ones that exist in the target repo.

| Key | Use it when the repo has... |
|-----|------------------------------|
| `routes` | HTTP, CLI, RPC, or webhook entry points |
| `services` | orchestration/business logic layer |
| `model_utils` | raw DB access helpers or repositories |
| `models` | ORM/data models |
| `api_schemas` | transport-layer request/response schemas |
| `core_schemas` | shared domain schemas/enums/exceptions |
| `graphql` | GraphQL schema/resolvers/services |
| `jobs_or_etl` | workers, queues, background jobs, ETL |
| `tests` | the most relevant test dirs/files for the domain |
| `configs` | configs that must change with code |
| `migration_search` | keywords to grep in migrations/history |
| `scripts` | important operational scripts owned by the domain |

Do not force a key into every repo. Use what exists.

---

## Node fields

### Required

| Field | Purpose |
|-------|---------|
| `kind` | structural category |
| `at` | source location |
| `search` | concept lookup terms |

### Optional

| Field | Use when... |
|-------|-------------|
| `uses` | the edge is worth following during impact analysis |
| `tests` | there is a clear, valuable test surface |
| `hot` | this node is on a critical path |

### Usually omit

| Field | Why omit it |
|-------|-------------|
| `names` | expensive to maintain; code grep already finds exact symbols |
| `parent` | rarely worth the upkeep in large repos |
| `used_by` | derive with grep from `uses` |
| `docs` | human-doc pointers are outside the scope of an AI-only graph |
| line numbers | churn too quickly |

---

## Edge confidence

`uses` edges may be tagged:

- `(verified)` — direct import/call/wiring observed in code
- `(inferred)` — coupling is real enough to follow, but not a direct import

Rules:

- Prefer verified edges.
- Use inferred edges only when they materially help blast-radius analysis.
- Do not spam runtime guesses.

---

## Wikilink format

Within one domain file:

```text
[[NodeName]]
```

Across domain files:

```text
[[domain-slug/NodeName]]
```

Examples:

- `[[catalog_router]]` — same domain file
- `[[platform-core/initialize_runtime]]` — another domain file

Rules:

- Each local node name must be unique within its domain file.
- Cross-domain links must use the domain file slug.
- Do not link to plain directories or docs with wikilinks. Use file paths for those.

---

## Deliberately excluded

The AI Index is **not**:

- a human onboarding guide
- a feature narrative
- a function-by-function explanation
- an exhaustive symbol inventory
- a script-generated static artifact

If a piece of information is only helpful to humans reading prose, exclude it.

If a piece of information is useful to AI impact analysis but not obvious from code search, include it.

---

## Operating model

The spec defines structure. The workflow defines how AI should use and maintain it.

Three operating modes are recommended:

1. **Use**
   Open `AI_INDEX.md`, choose only relevant domains, follow `at` paths into code, and sweep the listed `change_surfaces` plus `must_check` rules before concluding a task scope.

2. **Generate**
   For a repo without an AI Index, inspect the repo, define domains, write the root file, then write domain files with surfaces first and nodes second.

3. **Sync**
   After meaningful code changes, update only the affected domain files and the root index if domain boundaries or cross-domain rules changed.

Skills are a convenient packaging of these three modes, but the modes themselves are part of the AI Index workflow whether or not a skill system exists.

---

## Build guidance

Build the index with AI, not with a deterministic generator.

Why:

- every repo has different boundaries
- conventions matter as much as imports
- large repos need domain judgment
- the first build is infrequent, so AI effort is acceptable

The AI should:

1. inspect repo structure
2. read AGENTS/CLAUDE/README/package metadata as needed
3. identify domain boundaries by change ownership
4. record change surfaces first
5. add only the critical nodes
6. validate links and paths
7. stop when the graph is change-complete, not when every symbol has a node

---

## Sync guidance

After meaningful code changes, AI updates only the affected domain files and the root index if needed.

The AI should update the index when changes introduce or remove:

- domain boundaries
- public entry points
- cross-domain edges
- owned paths
- configs that must move with the code
- must-check rules

The AI should not churn the index for purely internal refactors with unchanged traversal shape.

During sync:

1. map changed files to existing domains
2. update `change_surfaces`, `must_check`, and nodes only where traversal shape changed
3. update root-level `Global Rules` or `Domain Index` only if repo-wide routing changed
4. revalidate paths and wikilinks before finishing

---

## Example

### Root file

```markdown
# AI Index — rule-processor
<!-- Last updated: 2026-04-15 -->
<!-- Verified against: HEAD -->
<!-- Domains: 4 -->
<!-- Repository root: /absolute/path/to/rule-processor -->

## Read Order
1. Read this file.
2. Pick domains from the index below.
3. Open only those domain files.
4. Resolve the repository root.
5. Read source at `at` paths relative to that root before making claims or edits.

## Global Rules
- If request/response payload shape changes, check transport schemas and tests.
- If rule execution order changes, check queued orchestration and fail-open behavior.

## Domain Index

| Domain | File | Owns | Open When |
|--------|------|------|-----------|
| Core | `AI_INDEX/core.md` | rule settings, action types | new rules, action schemas, enums |
| Worker | `AI_INDEX/worker.md` | rule implementations | guardrail execution logic |
| API | `AI_INDEX/api.md` | orchestration, executors | request pipeline, action execution |
| Utils | `AI_INDEX/utils.md` | shared integration types | tool schema or shared helper changes |
```

### Domain file

```markdown
# Domain — API
<!-- Nodes: 4 | Hot: 3 -->

## Scope
- owns: `packages/api/src/alltrue_rules/api/`
- open_when: request pipeline, action execution, orchestrator wiring
- change_surfaces:
  - services: `packages/api/src/alltrue_rules/api/execution/`
  - tests: `packages/api/tests/api/execution/`, `packages/api/tests/api/handlers/`
  - configs: `packages/api/src/alltrue_rules/api/utils/control/llm.py`
- must_check:
  - `packages/core/.../tool_definition/mcp.py` when tool payload shape changes

## Nodes

### McpQuarantineOrchestrator
- kind: class
- at: `packages/api/src/alltrue_rules/api/execution/orchestrator/_mcp_quarantine.py`
- search: quarantine pre-filter, run quarantine before rules, tool short circuit
- uses: [[McpQuarantineRuleImpl]] (verified), [[RuleType]] (verified)
- tests: `packages/api/tests/api/execution/test_mcp_quarantine_orchestrator.py`
- hot: true
```

---

## Summary

The sweet point is:

- **less prose than a knowledge graph**
- **more change-surface structure than a flat node list**
- **AI-built and AI-synced**
- **usable through a clear use / generate / sync workflow**
- **optimized for traversal and blast radius, not for human reading**
