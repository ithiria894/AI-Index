---
name: trace-impact
description: Trace all files and functions affected by a change — for adding features or debugging. Uses LSP findReferences for BFS traversal. Use before implementing any non-trivial change.
disable-model-invocation: true
---

# Trace Impact

Find all files and functions affected by a proposed change, before implementing anything. Covers callers, dependents, cross-domain connections, and tests.

---

## Rules

- Do not implement anything during this skill.
- Do not answer from memory or AI_INDEX alone.
- Every claim must name the file/function it came from.
- If uncertain, say "uncertain" — do not guess.

---

## Step 1 — Identify the origin symbol

Name the exact function, class, type, or API endpoint being changed.

```
Origin: <symbol name> in <file path>
```

**If you already know the symbol** — go to Step 2.

**If you only have a keyword, error message, or feature description:**

1. Check AI_INDEX.md — find the relevant domain by keyword or route
2. Use LSP to locate the definition:
   ```
   LSP workspaceSymbol: <keyword>
   LSP goToDefinition: <file>:<line>
   ```
3. If LSP unavailable, fall back to grep:
   ```bash
   grep -rn "keyword" src/ --include="*.py" --include="*.ts" --include="*.mjs"
   ```
4. Once found, name it as the origin and continue

---

## Step 2 — Level 1: Direct callers (LSP preferred)

Use LSP findReferences for precision (20x fewer tokens than grep):
```
findReferences: <file>:<line> scope=<SymbolName>
```

If LSP unavailable, fall back to grep:
```bash
grep -r "function_name\|ClassName" src/ --include="*.py" -l
```

List all direct callers found. Read only their function signatures, not full bodies.

---

## Step 3 — Level 2: Indirect callers

For each Level 1 caller, run findReferences again.

Stop expanding when:
- You reach an external API boundary (this layer is not yours to change)
- You are 3+ hops from the origin (indirect impact — record but don't deep-read)
- You find a stable interface contract that does not change

---

## Step 4 — Cross-domain check

Check AI_INDEX.md "Connects to" section for the origin's domain.

For each connected domain:
- What is the interface between origin domain and connected domain?
- Does the proposed change affect that interface?
- If yes: read the entry point of the connected domain

Common cross-domain paths to check:
- Service → API route (does the API contract change?)
- Service → DB model (does the schema change?)
- Backend type → Frontend type (does the TypeScript type need updating?)
- Function → Tests (which test files cover this path?)

---

## Step 5 — Find affected tests

```bash
grep -r "function_name\|ClassName" tests/ --include="*.py" -l
```

List test files that cover the origin symbol or its direct callers.

---

## Step 6 — Report

Return exactly:

```
Origin:
- <symbol> in <file>:<line>
- Confidence: high (LSP) | lower (grep fallback)

Will break — depth 1 (direct callers):
- <file>:<function> — reason

May break — depth 2 (indirect callers):
- <file>:<function> — reason

Review — depth 3+ (transitive):
- <file>:<function> — reason

Tests to update/verify:
- <test file> — what it covers

Tests to add:
- <what's not covered> — why it needs a new test

Cross-domain impact:
- <domain> via <interface> — affected? yes/no

Uncertain (not checked):
- <anything you could not verify>
```

Do not propose implementation. Do not guess at anything not directly read.
