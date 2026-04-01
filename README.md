# Claude Code Best Practices

[繁體中文](README.zh-TW.md)

You ask Claude about a function. It gives you a confident, detailed explanation.

You build on it for an hour. Then you find out it was wrong.

---

Or this one: you change a function, Claude helps you finish it, tests pass, you ship. Three days later in code review someone says "hey, four other places call this function — they're all broken." Claude never mentioned them. You didn't know to ask.

This happens all the time on real projects. Same root cause every time: **Claude doesn't have a way to navigate your codebase.** It reads too little and guesses, or reads too much and burns your tokens before getting to the actual work.

Here's how to fix it.

---

## The core idea

**Turn your entire repo into a graph. Use BFS + LSP to search and traverse it.**

That's the whole thing. The bottleneck for AI coding assistants isn't intelligence — it's navigation. Claude can reason well once it has the right information. The problem is it wastes most of its capacity *finding* that information.

```
/generate-graph          → build the graph (deterministic script + Claude refine)
        ↓
    AI_INDEX.md          → the graph itself (adjacency list — nodes are domains, edges are connections)
        ↓
/investigate-module      → read a specific node (grounded, with sources)
/trace-impact            → BFS along the edges (find everything a change affects)
```

Drop a bug or a feature request anywhere on this graph, and the system traces every connected path to find what's affected — before you write a single line of code.

---

## What actually happens without this

Ask Claude to "add an export feature" on a repo it hasn't seen. Here's what it does internally:

```
1. grep "export" src/
   → 200 results. JS has "export" on every file.
   → Refine: grep "export.*function" → still 50 results.

2. Guess which file to open. server.mjs? Maybe. scanner.mjs? Who knows.
   → Opens server.mjs (600 lines) → reads 200 lines → nothing yet
   → Reads 200 more → finds /api/export endpoint

3. Now it knows the entry point, but not what's downstream:
   → grep "api/export" → finds frontend caller
   → grep "exportSession" → finds a helper
   → Read the helper → it imports scanner
   → ...each step is grep → read → grep → read

4. Midway it opens history.mjs because the name sounds relevant.
   → Dead end. 500 tokens wasted. Can't un-read it.
```

~45% of tokens go to wrong files. Indirect dependencies get randomly missed. There's no signal for when it's "found enough."

**Same task, with the graph:**

```
1. Read AI_INDEX.md (400 tokens):
   → Server → Routes: POST /api/export ← found it
   → Connects to: Scanner, Mover, Tokenizer

2. /trace-impact POST /api/export:
   → Level 1: server.mjs (handler) → scanner.mjs (data source)
   → Level 2: app.js (frontend caller)
   → Tests: dashboard.spec.mjs
   → Cross-domain: Tokenizer (might affect budget calc)

3. Done. No backtracking. No guessing.
```

**~600 tokens vs ~4000 tokens.** Same result, except the graph version doesn't miss the tokenizer dependency.

The graph doesn't limit Claude — it still has full freedom to grep and explore beyond the map. It just doesn't start from zero every time. A subway map has never limited anyone's legs. It just keeps you off the wrong train.

### The graph is a priority route, not the only route

The worst thing you can do with a map is treat it as the complete truth. Codebases have hidden connections the graph won't capture — plugin registries, decorator-based wiring, config-driven routing, event emitters. Grep can't find these. Static import analysis can't either.

So the system has a built-in fallback: if Claude finds signals that the graph is incomplete, it breaks free and explores on its own:

**Fallback triggers** — go beyond the graph when:
- Code references a module the graph doesn't list
- There's a registry/router/config pattern but no `Connects to` edge for it
- A test failure points to an area the graph didn't cover
- An import chain leads somewhere the graph has no node for

This is the difference between a **closed map** (follow these routes or nothing) and a **priority-first map** (start here, but explore further if the terrain doesn't match). The graph gives Claude the first 99% for free. The last 1% it earns through fallback exploration — and that's fine, because 1% exploration is cheap. 99% exploration is where you burn your whole session.

---

### 62 lines. That's the whole graph.

Here's what those 62 lines contain for a 10-file, 3000-line Node.js project:

| Content | Count | What it does |
|---------|:-----:|---|
| Domain entry files | 10 | Claude knows where to start reading |
| Search keywords | ~50 | Claude knows what to grep/LSP for |
| HTTP routes | 18 | **Things LSP can't find** |
| Cross-domain edges | ~15 | **This is what makes it a graph, not a file list** |
| Test mappings | ~5 | Know which tests to run after changes |

Reading the whole graph costs ~400 tokens. Then Claude knows the entire repo's topology.

Compare:

- **No graph** → Claude uses 5-10 grep calls to "discover" the same information = 2000+ tokens
- **Aider repo-map** → 238 lines of code snippets, but **zero edges** — no idea which domain connects to which

Small but correct > large but unstructured. A subway map is one sheet of paper, but it gets you across all of Tokyo.

---

## AI_INDEX.md — not a file list, a graph

There are dozens of AI_INDEX templates out there. Most look like this:

```
auth → src/auth/
api  → src/api/
db   → src/models/
```

That's a flat file list. Claude knows where to find things, but it has no idea that changing `auth` will break `api`. There's no structure connecting them. It's a phonebook, not a map.

Our AI_INDEX is a **graph data structure** — specifically an adjacency list:

```markdown
### Auth
- Entry: src/auth/middleware.py
- Search: verifyToken, AuthError
- Tests: tests/test_auth.py
- Connects to:
  - API layer — via requireAuth() in src/api/routes.py
  - DB layer — via UserModel.findById() in src/models/user.py

### API layer
- Entry: src/api/routes.py
- Search: router, handleRequest
- Tests: tests/test_routes.py
- Connects to:
  - Auth — via requireAuth middleware
  - Rule evaluation — via POST /api/evaluate
```

Every domain is a **node**. Every `Connects to` is an **edge**. That's what makes `/trace-impact` possible — it's a BFS traversal on this graph. Without edges, you have a directory listing. With them, you have a network that an algorithm can walk.

The edges come from real imports, not guessing. `/generate-graph` scans your actual import statements to build the graph. It doesn't infer — it reads.

One rule: keep it under 250 lines, pointers only. The moment it starts explaining *how* things work instead of *where* they are, Claude reasons from the index instead of reading source code. That's where the confident wrong answers come from.

**Keeping it fresh:** A stale graph is worse than no graph — Claude trusts it and follows dead paths. After structural changes (new modules, renamed files, new connections), re-run `/generate-graph`.

See [`templates/AI_INDEX_TEMPLATE.md`](templates/AI_INDEX_TEMPLATE.md).

---

## LSP — the search engine for the graph

BFS needs precise lookups at each node. grep can't do this — it's string matching, so `authenticate` matches comments, variable names, and unrelated files. 40 results, 15 noise, half your token budget gone.

LSP asks the language's type checker directly. Semantic, not string. Same query, 6 exact results.

| | grep | LSP findReferences |
|---|---|---|
| Speed | baseline | 900x faster |
| Token cost | high | 20x lower |
| Accuracy | string match, false positives | semantic, zero false positives |

Enable in `.claude/settings.json`:
```json
{ "env": { "ENABLE_LSP_TOOL": "1" } }
```

**VS Code**: language servers already running — just enable the flag. **Terminal**: install the server for your language first:

```bash
pip install python-lsp-server                         # Python
npm install -g typescript-language-server typescript  # TypeScript
go install golang.org/x/tools/gopls@latest            # Go
```

---

## The three skills

**`/generate-graph`** — build the graph automatically

Scans your imports, directory structure, and exported symbols. Outputs the full AI_INDEX.md with all `Connects to` edges filled in from actual import statements. Deterministic — 80% of the graph is built with zero tokens. Claude refines the last 20% (HTTP endpoints, frontend-backend connections the script can't see).

Run once on a new repo. Re-run when the structure changes.

---

**`/investigate-module`** — verification-first prompting

The key mechanism: **forces Claude to name the exact file and function it read before making any claim.** This eliminates the middle ground of confident fabrication — Claude either reads the source (and is accurate) or says "uncertain" (and you know to dig deeper).

Reads AI_INDEX to find the right node → grep/LSP to locate the exact symbol → reads only the relevant lines → reports what it read so you can verify.

---

**`/trace-impact`** — BFS traversal on the graph

This is where the graph pays off. Instead of hoping you remembered every caller, `/trace-impact` does a systematic breadth-first search on the AI_INDEX adjacency list.

In plain terms: you drop a pin on one station, and it expands outward one ring at a time.

```
Ring 0 (origin):     auth_service.py — the thing you're changing
Ring 1 (direct):     auth_routes.py, token_store.py, test_auth.py
Ring 2 (indirect):   app.py, middleware.py, test_auth_routes.py
Ring 3 (transitive): integration_tests/...
```

Why rings instead of searching the whole repo? Because the closest files are almost always the most affected. Ring 1 will break. Ring 2 might break. Ring 3 just needs a review. BFS gives you this naturally — you see all direct impact before going deeper.

The actual levels:

- **Level 0**: the function you're changing
- **Level 1 — will break**: direct callers (LSP findReferences — semantic, not grep)
- **Level 2 — may break**: callers of those callers
- **Level 3+ — review**: transitive callers, stop expanding
- **Cross-domain**: follows `Connects to` edges across module boundaries
- **Tests**: every test covering the affected set

Stops at API boundaries. Nothing slips through.

---

### How they work together

```
New repo:
  /generate-graph → builds the map with all connections

Fix a bug:
  1. /trace-impact rule_evaluator.py:evaluate_rule
     → know the full blast radius before touching anything
  2. /investigate-module for any part you need to understand
     → grounded facts with sources, not guesses
  3. Make the change
     → you already know what else needs updating
  4. /sync-graph → update the map while Claude still remembers what changed

Add a feature:
  1. /trace-impact on each touch point → map the blast radius first
  2. /investigate-module for domains you don't understand
  3. Implement the feature
  4. /sync-graph → surgical update to affected nodes (not a full rebuild)
```

---

## CLAUDE.md — XML tags, not markdown

Rules in CLAUDE.md get deprioritized under context pressure — Anthropic wraps them with *"this context may or may not be relevant."* XML tags survive this better:

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

**Instruction budget:** ~150–200 slots total. System prompt uses ~50. Every bullet in CLAUDE.md is one slot. Over budget = all rules degrade simultaneously. Keep it under 200 lines.

**Hard rules → `settings.json` deny**, not CLAUDE.md. CLAUDE.md can be overridden under pressure. Deny rules cannot:

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

---

## Autonomy — reversibility, not action type

**Never ask:** edit files, run tests, grep, git add, git commit on feature branch — all reversible.
**Always ask:** push to remote, publish, delete files, force operations — irreversible or visible to others.

Push is the line.

---

## Context management

- **`/clear` between unrelated tasks** — context residue degrades the next task
- **`/compact focus on X`** — directed compaction, not blind
- **Write state to `PLAN.md`** — survives `/clear`; conversation history doesn't
- **One major task per session** — fresh start = full performance

Full guide: [`docs/context-management.md`](docs/context-management.md)

---

## Does it actually work?

We ran four different tasks on clean Claude agents with zero prior context. Same codebase (10-file Node.js project), same model, different navigation aids: our graph vs no map at all. Every agent started fresh — no memory of previous conversations.

### Test setup

- **Agent A**: Gets AI_INDEX.md (our graph with domain connections, HTTP routes, search keywords) + workflow rules
- **Agent C**: Gets nothing. Pure grep from scratch.
- **Codebase**: Claude Code Organizer (10 src files, ~3000 lines)

### Task 0 — Bug fix: deleteItem() not updating .mcp.json

A real bug where deleting an MCP server entry didn't update the config file for project-scope servers nested in `.claude.json`.

| Metric | Agent A (graph) | Agent C (no map) |
|------|:---:|:---:|
| Found bug root cause? | ✅ | ✅ |
| Found UI layer restore bug? | ✅ | ❌ |
| Found server.mjs restore-mcp? | ✅ | ❌ |
| Proposed fix scope | 3 files | 1 file only |
| Tokens | 29K | 28K |
| Tool calls | 11 | 12 |

**What the graph caught:** Agent A found that fixing `deleteMcp()` alone isn't enough — the `/api/restore-mcp` undo endpoint and `doDelete()` in the UI both have the same bug. Ship the 1-file fix and the delete works, but undo restores to the wrong place.

### Task 1 — Bug fix: security rescan not clearing "changed" badge

After rescanning MCP servers, the "changed" badge persists even though baselines were updated on disk.

| Metric | Agent A (graph) | Agent C (no map) |
|------|:---:|:---:|
| Found root cause? | ✅ | ✅ |
| Identified UI re-apply bug? | ✅ | ✅ |
| Identified cache persistence bug? | ✅ | ✅ |
| Tokens | 29K | 30K |
| Tool calls | 12 | 12 |

Both found the root cause. For straightforward bugs with a clear entry point, the graph doesn't add much — grep gets you there too.

### Task 2 — New feature: add Plugin Inventory category

Plan how to add "plugins" as a new scanner category, reading `enabledPlugins` from settings.json across scopes.

| Metric | Agent A (graph) | Agent C (no map) |
|------|:---:|:---:|
| Found correct pattern to follow? | ✅ hooks pattern | ✅ hooks pattern |
| Files identified | 2 files | 4 files |
| Knew to skip server.mjs? | ✅ (graph showed no category-specific server logic) | ❌ (had to read it to confirm) |
| Tokens | 34K | **44K** |
| Tool calls | 20 | **31** |

**Graph saved 23% tokens and 35% fewer tool calls.** Agent C spent 11 extra tool calls exploring the codebase structure that Agent A already knew from the graph.

### Task 3 — Understanding: how does context budget work?

Trace the full flow from UI button click → API → tokenizer → render.

| Metric | Agent A (graph) | Agent C (no map) |
|------|:---:|:---:|
| Traced complete flow? | ✅ | ✅ |
| Files opened | 3 | 4 |
| Tokens | 29K | **35K** |
| Tool calls | 10 | **16** |

**Graph saved 17% tokens and 37% fewer tool calls.** Agent C had to read index.html and grep around to find entry points. Agent A knew the entry points from the graph's Search keywords.

### Summary across all tasks

| Task type | Token savings | Tool call savings | Quality difference |
|-----------|:---:|:---:|---|
| Bug fix (clear entry point) | ~0% | ~0% | **Graph finds cascade impact others miss** |
| Bug fix (UI flow) | ~3% | 0% | Comparable |
| New feature | **23%** | **35%** | Graph knows which files to skip |
| Understanding | **17%** | **37%** | Graph provides entry points directly |

**The graph's biggest value isn't saving tokens — it's preventing missed impact.** On a 10-file repo, token savings are 17-23% for exploration tasks. On larger repos, expect more. But finding the cascade bug in Task 0 (the restore/undo path that only the graph version caught) — that's a qualitative difference, not a quantitative one.

---

## Quick start

Install as a Claude Code plugin:

```bash
# Add the marketplace
/plugin add-marketplace https://github.com/ithiria894/claude-code-best-practices

# Install
/plugin install codebase-navigator
```

Once installed, the skills are available in any project:

```
/codebase-navigator:generate-graph    → build the graph for your repo
/codebase-navigator:investigate-module → verification-first code reading
/codebase-navigator:trace-impact       → BFS to find everything a change affects
/codebase-navigator:sync-graph         → update the graph after changes
```

Claude automatically knows when to use each skill — run `/codebase-navigator:generate-graph` on a new repo to get started.

**Manual install** (if you prefer copying files): see [manual setup guide](docs/manual-setup.md).

---

## Templates and config

| File | What it is |
|---|---|
| [`scripts/generate-ai-index.mjs`](scripts/generate-ai-index.mjs) | Deterministic AI_INDEX generator — scans imports, outputs routing manifest |
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
