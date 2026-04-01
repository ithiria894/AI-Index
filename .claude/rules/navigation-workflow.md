## Settings

### Codex pattern sweep

When Claude finds a bug, the same pattern often exists in other places. The Codex sweep step hands off to Codex CLI to scan the entire file/directory for every instance.

**Enabled (default):**
- After finding root cause, Codex scans for the same pattern everywhere
- ~$0.02 per scan (Codex uses cheaper models for brute-force work)
- In our benchmarks, a 3-line bug fix actually had 16 affected locations — Claude found 5, Codex found all 16
- You fix once, ship clean. No "oh wait there's another one" in code review

**Disabled:**
- Claude still checks nearby code for similar patterns, but won't do an exhaustive scan
- Faster, zero extra cost
- Risk: you fix the reported bug but miss 2-3 identical bugs in the same file that surface later

Most of the time, leaving it on is worth it — $0.02 to guarantee you didn't miss anything.

To disable:
```json
{ "env": { "CODEX_SWEEP": "false" } }
```

---

## When to use the navigation skills

These rules apply whenever this repo's skills are installed.

### When fixing a bug

Run `/debug` — it orchestrates the full workflow: locate entry point → read docs → find root cause → check if it's our code → pattern sweep → fix → sync graph.

Triggers:
- User reports a bug, error, or broken behavior
- User shares an error message, log link, or screenshot
- Something that used to work doesn't work anymore

### When adding a new feature

Run `/new-feature` — it orchestrates: find existing pattern → read docs → trace impact on touch points → implement → sync graph.

Triggers:
- User asks to add a new capability, endpoint, category, or UI panel
- User asks to implement something that doesn't exist yet

### Before any other non-trivial code change

Run `/debug` or `/new-feature` depending on the task. For pure refactors, follow `/debug` Phase 2 (trace the stack) to understand the blast radius before changing anything.

### After completing a feature or bug fix

Run `/sync-graph` — before `/clear` or ending the session.

Triggers:
- You added new files or modules
- You added new imports between domains
- You added new HTTP routes
- You changed which modules connect to which

Skip if: the change was internal to one module (no new exports, no new cross-domain imports).

### On a new repo or after major restructuring

Run `/generate-graph` — to build or rebuild the full graph.

Triggers:
- First time working with a repo that has no AI_INDEX.md
- After a major refactor that changes module boundaries
- After merging a large feature branch that restructured src/

This is a full rebuild. For incremental updates, use `/sync-graph` instead.
