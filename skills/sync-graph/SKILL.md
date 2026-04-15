---
name: sync-graph
description: Update the AI Index after code changes. AI inspects changed files, maps them to domains, updates only affected root/domain entries, and preserves change completeness.
---

# Sync Graph

Update the AI Index after finishing code changes.

This is a surgical sync. Do not rebuild the entire graph unless the repo structure changed enough to justify the `generate-graph` skill.

---

## Goal

Keep the graph accurate with minimal churn.

The sync should preserve:

- correct domain boundaries
- correct change surfaces
- correct important edges
- correct repo rules / must-check rules

---

## Rules

- Update only affected files in `AI_INDEX.md` and `AI_INDEX/<domain>.md`.
- If no traversal shape changed, do not churn the graph.
- If a change introduced a new non-obvious repo rule, record it.
- If a change removed a surface or node, remove it from the graph.
- Do not turn sync into documentation writing.

---

## Step 1 — Identify changed files

Use session context first. If needed, confirm with:

```bash
git diff --name-only
git diff --name-only --cached
```

Group changed files by domain candidate.

Also note if any changed file affects:

- repo entry points
- route config sync
- migration needs
- queue / ETL wiring
- schema shape
- tests
- global repo rules

---

## Step 2 — Decide whether the graph must change

The graph should change if the session added, removed, or changed any of these:

- a domain boundary
- a major owned path
- a public entry point
- a critical node
- a cross-domain edge worth following
- a config that must change with code
- a must-check rule
- a test surface worth keeping in the graph

The graph usually should **not** change if:

- logic changed inside an existing node without altering traversal shape
- only tests changed and they do not change the owned test surface
- a private helper changed

---

## Step 3 — Update the root index if needed

Update `AI_INDEX.md` when:

- a new domain was added
- a domain was removed or renamed
- `Owns` or `Open When` changed materially
- a new repo-wide rule became necessary
- a repo-wide rule is no longer true

Do not rewrite unaffected domain rows.

---

## Step 4 — Update affected domain files

For each affected domain:

1. Update `owns` if the owned area changed
2. Update `change_surfaces` if new paths or categories were added/removed
3. Update `must_check` if the change introduced or removed non-obvious coupling
4. Update `## Nodes` only if traversal anchors changed

Examples of node updates:

- new router/service/job/model_utils added
- important edge added or removed
- hot path changed
- node renamed or deleted

Examples of change-surface updates:

- new route directory
- new schema package
- new GraphQL service area
- new migration keyword family
- new test directory that now owns the domain's regression surface

---

## Step 5 — Special cases

### Route changes

If routes changed, check whether:

- route-linked config files must also be updated
- auth/rate-limit/permission metadata belongs in `must_check`
- the root `Global Rules` already cover this, or need refinement

### Model/schema changes

If ORM or transport shape changed, check whether:

- migration search terms changed
- a new schema/model path belongs in the change surface
- `must_check` should mention downstream consumers

### Background job / ETL changes

If a queue, worker, cron, or ETL entry changed, update:

- `jobs_or_etl`
- relevant configs
- the hot nodes if request or processing flow changed

---

## Step 6 — Validate

Before finishing:

- Every edited path exists
- Every edited `tests` path exists
- Every added `[[wikilink]]` resolves
- The root index still matches the domain files
- No deleted node is still referenced
- No new non-obvious coupling was forgotten

---

## Output summary

After syncing, summarize:

- domains updated
- domains added
- domains removed
- whether root rules changed

---

## When to use this skill

Use this skill after:

- feature work
- bug fixes
- refactors that change traversal shape
- new routes, jobs, configs, or schema/model surfaces

Skip it for tiny internal edits that do not affect how an AI should navigate the repo.
