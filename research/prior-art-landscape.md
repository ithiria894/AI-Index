# Prior-Art Landscape

> Notes collected while comparing AI Index against nearby tools, systems, and papers.
>
> Last consolidated: 2026-04-15

## Why this file exists

AI Index is not coming out of nowhere.

There are already several strong ideas in this space:

- repo maps
- code graphs
- structural retrieval
- impact analysis
- repository-level planning

This file keeps the most relevant prior art in one place and explains where AI Index is similar, where it differs, and what it should borrow.

## Short version

The closest existing ideas are:

- Aider repo map
- Sourcegraph code graph + context engine
- Codebase-Memory
- CodePlan
- RepoMaster
- CodeCompass
- Reliable Graph-RAG
- Repository Intelligence Graph (RIG)

No single one of them matches the whole AI Index workflow exactly.

The strongest difference in AI Index is not "we have a graph."

The strongest difference is the workflow contract:

- navigation-first
- code stays the source of truth
- only hand-write what AI cannot reliably infer from code
- sync the graph after meaningful code changes
- keep pattern sweep as a fallback instead of pretending the graph is perfect

## Comparison Table

| System | What it is strongest at | Where it is stronger than AI Index | Where AI Index is different |
|---|---|---|---|
| Aider repo map | lightweight repo summary for editing context | automatic map extraction, token-aware ranking | AI Index is more explicit about change surfaces and must-check rules |
| Sourcegraph code graph + context engine | production retrieval and ranking | strongest retrieval stack, multiple retrievers, mature search infra | AI Index is lighter, explicit, and workflow-driven rather than platform-driven |
| Codebase-Memory | structural graph backend for MCP agents | persistent graph, call tracing, impact analysis, auto-sync | AI Index is simpler, markdown-based, and easier to hand-maintain in normal coding workflows |
| RepoMaster | repository exploration for autonomous task solving | broad repo exploration + graph/tree planning for external repos | AI Index is focused on one repo's traversal correctness, not repo reuse at internet scale |
| CodePlan | repository-level planning | may-impact analysis and multi-step edit planning | AI Index is more about navigation and operational maintenance than plan synthesis |
| CodeCompass | evidence that navigation is the bottleneck | strong framing around hidden dependency tasks and navigation vs retrieval | AI Index turns that insight into a concrete day-to-day workflow |
| Reliable Graph-RAG | deterministic graph reliability | strong argument for AST-derived graphs over LLM-extracted knowledge graphs | AI Index agrees with code-as-truth, but keeps the artifact lightweight and human-editable |
| RIG | evidence-backed repository graphing | strong build, test, and coverage edges | AI Index should borrow more of this over time |

## System Notes

### Aider repo map

Reference:

- https://aider.chat/docs/repomap.html

What it contributes:

- a concise map of the repo
- token-aware ranking
- a practical "give the model a map" implementation

What it does well:

- helps the model orient fast
- reduces blind reading
- works well for editing context

Where it stops short for AI Index:

- it is still mostly a summary layer
- it does not model `change_surfaces`
- it does not encode `must_check` rules
- it does not define a sync workflow after edits

### Sourcegraph code graph + context engine

References:

- https://sourcegraph.com/docs/cody/core-concepts/code-graph
- https://sourcegraph.com/blog/lessons-from-building-ai-coding-assistants-context-retrieval-and-evaluation

What it contributes:

- code graph retrieval
- keyword retrieval
- embedding retrieval
- ranking under latency and token limits

What it does well:

- strongest production retrieval story
- excellent context selection at scale
- mature search and indexing stack

Where it differs from AI Index:

- Sourcegraph is a full platform
- AI Index is a lightweight repo-level workflow artifact
- Sourcegraph optimizes retrieval quality
- AI Index optimizes day-to-day traversal discipline

### Codebase-Memory

Reference:

- https://arxiv.org/abs/2603.27277

What it contributes:

- persistent Tree-Sitter graph
- call graph traversal
- impact analysis
- auto-sync behavior

What it does well:

- closest public system to a structural graph backend for agents
- very strong on graph-native queries
- strong impact-analysis tooling

Why AI Index still matters:

- Codebase-Memory is a backend
- AI Index is a workflow surface
- Codebase-Memory is great if you want graph tooling
- AI Index is great if you want a portable repo contract that agents can follow directly

### RepoMaster

Reference:

- https://arxiv.org/abs/2505.21577

What it contributes:

- function-call graph
- module-dependency graph
- hierarchical exploration
- repo-level task solving

What it does well:

- autonomous exploration of repositories
- broad planning over many possible repo assets

Where it differs:

- RepoMaster is more about making large sets of repos usable for autonomous tasks
- AI Index is more about not missing related work inside one repo you actively maintain

### CodePlan

Reference:

- https://arxiv.org/abs/2309.12499

What it contributes:

- repository-level planning
- incremental dependency analysis
- change may-impact analysis

What it does well:

- multi-step repo edits
- planning interdependent changes

What AI Index should borrow:

- better may-impact logic for future `sync-graph` workflows
- stronger explicit change planning over multiple touched files

### CodeCompass

Reference:

- https://arxiv.org/abs/2602.20048

What it contributes:

- the clearest framing of the navigation paradox
- evidence that graph navigation beats lexical retrieval on hidden-dependency tasks

Why it matters:

- it strongly supports the thesis behind AI Index
- it shows that tool availability alone is not enough
- agent behavior and workflow guidance matter

This is one of the strongest external validations of the AI Index direction.

### Reliable Graph-RAG

Reference:

- https://arxiv.org/abs/2601.08773

What it contributes:

- strong case for deterministic AST-derived graphs
- direct comparison against LLM-generated knowledge graphs

Why it matters:

- it supports the idea that code-derived structure is safer than prose-derived or LLM-generated "knowledge"
- that lines up closely with AI Index's single-source-of-truth principle

### Repository Intelligence Graph (RIG)

Reference:

- https://arxiv.org/abs/2601.10112

What it contributes:

- evidence-backed repository graphing
- richer operational edges, including build and validation signals

Why it matters:

- this is one of the best places for AI Index to borrow future ideas
- especially around validation, coverage, and stronger evidence trails

## Current Judgment

AI Index is not the strongest thing in the world at:

- retrieval infrastructure
- automatic graph extraction
- graph query power
- platform maturity

But that is also not its job.

AI Index is strongest when you need:

- a map before you code
- a lightweight artifact that stays close to the repo
- a workflow that tells agents where to start
- explicit change surfaces
- explicit must-check rules
- an operational sync habit after edits

## What AI Index Should Keep Borrowing

The three biggest upgrades worth borrowing from prior art are:

1. Better evidence and validation from RIG
2. Better retrieval and ranking ideas from Sourcegraph
3. Better change-planning / may-impact reasoning from CodePlan

## Bottom Line

The right way to think about AI Index is not:

`we invented graphs for code`

The more accurate statement is:

`we combined existing good ideas into a navigation-first workflow that is easier for coding agents to follow in practice`

That is why this research matters.

It keeps the project honest about what is new, what is borrowed, and what still needs to improve.
