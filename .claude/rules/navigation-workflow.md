## When to use the navigation skills

These rules apply whenever this repo's skills are installed.

### When fixing a bug

Run `/debug` — it orchestrates the full workflow: locate entry point → find root cause → pattern sweep → fix → sync graph.

Triggers:
- User reports a bug, error, or broken behavior
- User shares an error message, log link, or screenshot
- Something that used to work doesn't work anymore

### When adding a new feature

Run `/new-feature` — it orchestrates: find existing pattern → trace impact on touch points → implement → sync graph.

Triggers:
- User asks to add a new capability, endpoint, category, or UI panel
- User asks to implement something that doesn't exist yet

### Before any other non-trivial code change

Run `/trace-impact` FIRST — before writing any code.

Triggers:
- User asks to refactor something
- User asks to change a function/class/type that other code depends on
- You need to know the blast radius before making a change

Do NOT skip this step. The cost of missing an affected caller is much higher than the cost of running trace-impact.

Exception: pure documentation changes, config-only changes, or adding a new file that nothing imports yet.

### When you don't understand a module

Run `/investigate-module` — before making claims about how code works.

Triggers:
- You need to explain what a module does
- You need to understand a module before modifying it
- You're unsure which function handles a specific behavior

Never answer questions about code behavior from memory or from AI_INDEX.md alone. Read the source.

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
