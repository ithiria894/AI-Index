# Claude Code Best Practices

You ask Claude about a function. It explains it confidently and in detail.

You build on that explanation for an hour.

Then you find out it was wrong.

---

Or this one: you change a function, Claude helps you finish it, tests pass, you ship. Three days later someone in code review points out that four other places call that function — and they're all broken now. Claude never mentioned them. You didn't know to ask.

These aren't edge cases. They happen constantly on real codebases. And they share one root cause: **Claude doesn't have a reliable way to navigate your codebase.** It reads too little and guesses, or reads too much and burns all your tokens before getting to the actual work.

This repo fixes that.

---

## The fix: give Claude a navigation system

The core idea is simple: Claude doesn't just need your source code. It needs a navigation system — a way to know where to look, how to get there efficiently, and what connects to what.

Three things work together to build that:

---

### AI_INDEX.md — the map

**The problem without it:**

Every new session, you spend 10–15 minutes re-orienting Claude. "The auth logic is in... the API routes are in... the database models are..." Claude asks questions it shouldn't need to ask. It reads irrelevant files. It confidently explains code it hasn't actually opened.

**What it does:**

One file in your repo root. Claude reads it first, before anything else. It maps each domain: where it lives, what to search for, what tests cover it, and — critically — how it connects to other domains.

It's not a design document. It doesn't explain how the code works. It's airport signage: Gate 12 is this way. That's all.

```markdown
# AI_INDEX.md

## How to use this file
- Navigation only. Not source of truth.
- Read actual source files before making any claim.

### Rule evaluation
- Entry: src/rule_evaluator.py
- Search: evaluate_rule, ActionExecutor
- Tests: tests/test_rule_evaluator.py
- Connects to:
  - Content layer — via ActionExecutor.execute()
  - API layer — via POST /api/evaluate (src/api/routes.py)
```

The `Connects to` section is what makes cross-feature work possible. When you trace the impact of a change, these connections tell Claude which domains to check next — without reading every file in between.

**Keep it healthy:** under 250 lines, 4–8 lines per domain, file paths and grep terms only. The moment it starts containing prose explanations or words like "usually" and "roughly" — rewrite those entries as pointers. Claude will start reasoning from the index instead of the source, and that's exactly where the confident wrong answers come from.

See [`templates/AI_INDEX_TEMPLATE.md`](templates/AI_INDEX_TEMPLATE.md).

---

### LSP — required install

**The problem without it:**

You ask Claude to find every place a function is used. Claude uses grep. Grep is string matching — it finds the function name anywhere it appears: comments, unrelated variable names, files from a completely different part of the codebase. You get 40 results. 15 are noise. Claude reads them all. Half your token budget is gone before any real work starts.

**What it does:**

LSP (Language Server Protocol) asks the language's type checker directly. It understands what the symbol *is*, not just where the string appears. The result is semantically precise: these exact call sites, nothing else.

| | grep | LSP findReferences |
|---|---|---|
| Speed | baseline | 900x faster |
| Token cost | high | 20x lower |
| Accuracy | string match, false positives | semantic, zero false positives |

Enable in `.claude/settings.json`:
```json
{ "env": { "ENABLE_LSP_TOOL": "1" } }
```

Install for your stack:
```bash
pip install python-lsp-server                         # Python
npm install -g typescript-language-server typescript  # TypeScript
go install golang.org/x/tools/gopls@latest            # Go
```

---

### The two skills

**`/investigate-module`**

**The problem without it:**

You ask Claude about a module. It gives you a detailed explanation. It sounds completely right. Half of it is wrong — Claude filled the gaps from training data instead of reading your actual code. By the time you discover this, you've already built on top of the wrong assumption.

**What it does:**

Forces grounded investigation before any answer. Reads AI_INDEX to find the domain → uses grep/LSP to locate the exact file and function → reads only the relevant section (line ranges, not whole files) → names exactly what it read so you can verify. If it can't find something, it says uncertain instead of guessing.

Use it before making any claim about a module you haven't looked at in this session.

---

**`/trace-impact`**

**The problem without it:**

You change a function. You test it. It works. You ship it. Then you find out three other services called that function, a frontend type depended on its return shape, and a test mock was hardcoded to its old behavior. None of this was obvious. Claude didn't warn you because you didn't ask, and Claude doesn't know what it doesn't know.

**What it does:**

Before you touch anything, maps every place that will be affected. It uses a breadth-first search through your codebase:

1. **Level 0** — the symbol you're changing
2. **Level 1** — everything that directly calls it (via LSP findReferences — exact, not grep)
3. **Level 2** — everything that calls those callers
4. **Cross-domain** — follows AI_INDEX `Connects to` entries to catch paths that cross module boundaries
5. **Tests** — finds all tests that cover anything in the affected set

Why breadth-first? Because you want to see all the obvious direct impact before diving into second-order effects. It's systematic: nothing slips through because you happened to trace one path before another.

Stops at external API boundaries and domain edges — it doesn't follow every chain to infinity, just far enough to catch real breakage.

Result: a list of what must change, what might need updating, and what tests to verify — before you write a single line.

Use it before every non-trivial change.

---

### How they work together

```
Task: fix a bug in rule_evaluator.py

1. /trace-impact rule_evaluator.py:evaluate_rule
   → you now know the full blast radius before touching anything

2. /investigate-module for any part you need to understand
   → grounded facts, not guesses, with sources named

3. Make the change
   → you already know what else needs updating
```

---

## CLAUDE.md configuration

### The problem: "be careful" doesn't work

You add a rule to CLAUDE.md: "Always verify against source code before answering." Claude ignores it two messages later. You bold it. Still ignored. You move it to the top. Better, but still inconsistent.

This isn't Claude being difficult. Anthropic wraps your CLAUDE.md with: *"this context may or may not be relevant."* Under context pressure, markdown headings get deprioritized. The rules are there, but they're losing the competition for Claude's attention.

**What works:** XML tags. They're a high-priority structure in Claude's training and survive context pressure far better than any markdown formatting.

```xml
<investigate_before_answering>
Never speculate about code you have not opened.
Check AI_INDEX.md first — navigation only, not source of truth.
grep/LSP to locate the exact file and function before reading.
Read only the relevant section — use line ranges, not whole files.
Name what you read: "Based on src/foo.py:bar()..."
If uncertain: say "uncertain" — do not guess.
Read each file once. No redundant reads.
</investigate_before_answering>
```

### The instruction budget

Claude has roughly 150–200 instruction slots total. The system prompt uses ~50. Every bullet point in your CLAUDE.md is one slot. When the budget fills up, all rules degrade simultaneously — not just the ones at the end.

Keep CLAUDE.md under 200 lines. Put the highest-ROI content first: specific pitfalls that prevent real bugs, not general guidance.

### Hard rules belong in settings.json

CLAUDE.md is advisory. Under enough pressure, Claude can override it. `settings.json` deny rules cannot be overridden:

```json
{
  "permissions": {
    "deny": [
      "Bash(git push --force*)",
      "Bash(rm -rf*)"
    ]
  }
}
```

If you're writing `NEVER do X` in CLAUDE.md, move it to `settings.json` deny instead.

---

## Autonomy rules

**The problem:**

Claude asks "should I proceed?" before editing a file. Before running a test. Before grep. You spend half your time confirming things that don't need confirming. But if you say "just do everything without asking," Claude will also push to remote, publish packages, and delete things without asking.

**The rule:** Judge by reversibility, not by action type.

**Never ask before:** editing files, running tests, grep, installing packages, git add, git commit on a feature branch. All reversible — if something goes wrong, you undo it.

**Always ask before:** push to remote, publish packages, delete files, force operations, sending messages externally. Irreversible, or visible to people outside this session.

On a feature branch, everything up to and including commit is reversible. Push is the line.

---

## Context management

**The problem:**

A session starts sharp. An hour in, Claude is making mistakes it wouldn't have made at the start — forgetting earlier constraints, skipping details, giving vaguer answers. The context window is filling up, and performance degrades as it fills.

Key practices:
- **`/clear` between unrelated tasks** — context residue from one task degrades the next
- **`/compact focus on X`** — compact with a hint, not blindly; the relevant parts are preserved
- **Write state to `PLAN.md`** — task progress survives a `/clear`; conversation history doesn't
- **One major task per session** — each fresh start is full performance

Full guide: [`docs/context-management.md`](docs/context-management.md)

---

## Quick start

Copy this prompt into Claude Code in your project:

```
Read these files from https://github.com/ithiria894/claude-code-best-practices:
- README.md
- .claude/skills/investigate-module/SKILL.md
- .claude/skills/trace-impact/SKILL.md
- templates/AI_INDEX_TEMPLATE.md
- CLAUDE.md

Then explain each component to me by starting with the pain point it solves —
what frustrating thing happens without it, why it happens, and how this fixes it.
Use plain language. Be specific. I should be able to say "yes that happens to me" before you explain the solution.

Explain these five:
1. /investigate-module — what goes wrong when Claude answers questions about code it hasn't actually read
2. /trace-impact — what goes wrong when you change something and don't know what else breaks
3. AI_INDEX.md — why Claude gets confused or slow on a codebase it hasn't seen, and what the index does about it
4. The <investigate_before_answering> CLAUDE.md rule — why telling Claude "be careful" doesn't work, and what does
5. LSP — why searching for code with grep wastes tokens and causes mistakes, and what LSP does differently

After explaining all five, ask me which ones I want to set up.
Install only what I confirm. Do not install anything before asking.
```

---

## Templates and config

| File | What it is |
|---|---|
| [`templates/AI_INDEX_TEMPLATE.md`](templates/AI_INDEX_TEMPLATE.md) | Full AI_INDEX format with Connects to |
| [`templates/MEMORY_INDEX_TEMPLATE.md`](templates/MEMORY_INDEX_TEMPLATE.md) | Memory file structure and frontmatter |
| [`CLAUDE.md`](CLAUDE.md) | CLAUDE.md template with XML verification rules |
| [`.claude/settings.json`](.claude/settings.json) | LSP + deny rules + hook scaffold |

---

## Further reading

- [`docs/context-management.md`](docs/context-management.md) — when to `/clear`, when to `/compact`, writing state to files
- [`docs/verification-prompting.md`](docs/verification-prompting.md) — specific phrases that force Claude to verify before answering
- [`docs/best-practices.md`](docs/best-practices.md) — full explanation with all research sources

---

## Contributing

This is a living document. New best practices added as they're validated in real use.

Rules:
- Every technique must cite a source or explain the first-principles reasoning
- No "just add this" without explaining why it works
- Failure cases are as valuable as success patterns
