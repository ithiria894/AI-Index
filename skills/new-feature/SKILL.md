---
name: new-feature
description: Plan and implement a new feature. Finds existing patterns to copy, traces impact on all touch points, implements across layers, then syncs the graph. Use when adding a new feature, category, endpoint, or capability.
disable-model-invocation: true
---

# New Feature

Find an existing pattern, copy it across all layers, verify nothing breaks.

---

## Phase 0 — Understand the requirement

What exactly needs to be added? Extract:
- What's the new capability? (new category, new endpoint, new UI panel)
- What existing feature is most similar? (this is the pattern to copy)
- What data does it need? (new DB table? new fields? new API?)

---

## Phase 1 — Find the pattern to copy

### Step 1: Read AI_INDEX.md

Find the domain of the most similar existing feature. Note:
- Its entry file
- Its "Connects to" edges (which other domains it touches)
- Its test files
- `Docs:` field — if the domain has linked documentation, **read it first**. Domain docs contain business logic, caveats, data lifecycle rules, and design decisions you need to know before implementing.

### Step 2: Trace one existing feature end-to-end

Use `/investigate-module` on the similar feature. Trace it through every layer:

```
DB model / migration
  → data access (queries, model utils)
    → service / business logic
      → API endpoint (router)
        → frontend (UI component)
          → tests (unit + e2e)
```

For each layer, note:
- Which file handles this layer
- What the naming convention is
- What the data shape looks like

This is your template. The new feature should follow the same pattern.

---

## Phase 2 — Map all touch points

### Step 1: List every file that needs a change

Based on the pattern you traced in Phase 1:

```
Files to create:
- [new migration, model, service, router, test, etc.]

Files to modify:
- [existing files that need to know about the new feature — enums, registries, UI menus, etc.]
```

### Step 2: Trace impact on modified files

For each file you're MODIFYING (not creating), run `/trace-impact`:
- Will adding this break existing callers?
- Does a shared enum/registry need updating?
- Are there tests that assert on the current state?

---

## Phase 3 — Implement

Follow the layer order from your pattern trace. Common order:

1. **Data layer first** — migration, model, data access functions
2. **Service layer** — business logic
3. **API layer** — router / endpoint
4. **Frontend** — UI (if applicable)
5. **Tests** — unit + integration + e2e

At each layer, copy the pattern from the similar feature and adapt.

---

## Phase 4 — Verify and sync

1. Run tests — both existing (nothing broke) and new (feature works)
2. `/sync-graph` — update AI_INDEX.md with the new domain/connections
3. Note in PR: "Pattern copied from [existing feature]. New connections: [list]."

---

## Report format

After implementing, summarize:

```
Feature: [one-line description]
Pattern copied from: [existing feature name]
Files created: [list]
Files modified: [list]
New connections: [which domains now connect that didn't before]
Tests: [what's covered]
```
