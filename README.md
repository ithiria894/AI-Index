# AI Index

> Navigation infrastructure for coding agents.

[繁體中文](README.zh-TW.md)

Most AI coding failures are not reasoning failures.

They are navigation failures.

The model can read code, but it still has to figure out:

- where to start
- which files belong to the same change surface
- which conventions do not show up in imports
- what else must change before the edit is actually complete

That is the problem this repo is trying to solve.

## Thesis

Traditional documentation is optimized for humans.

An AI coding agent does not need a prose explanation of what every feature does. It can read the code. What it usually lacks is a reliable map:

- which domain file to open first
- which layers belong together
- which configs, jobs, tests, schemas, or migrations are easy to forget
- which repo-specific rules change the blast radius of an edit

An `AI Index` is that map.

It is not a generated symbol dump.
It is not a call graph.
It is not a human knowledge base.

It is an AI-maintained repository graph for change-complete navigation.

## What This Repo Contains

This repo packages the methodology in a Claude Code-friendly shape:

- an AI Index spec
- a minimal template
- skills for `use`, `generate`, and `sync`

Main files:

- [`docs/AI_INDEX_SPEC.md`](docs/AI_INDEX_SPEC.md)
- [`templates/AI_INDEX_TEMPLATE.md`](templates/AI_INDEX_TEMPLATE.md)
- [`skills/ai-index/SKILL.md`](skills/ai-index/SKILL.md)
- [`skills/use-ai-index/SKILL.md`](skills/use-ai-index/SKILL.md)
- [`skills/generate-graph/SKILL.md`](skills/generate-graph/SKILL.md)
- [`skills/sync-graph/SKILL.md`](skills/sync-graph/SKILL.md)

## The Core Idea

The AI Index sits between raw code search and traditional documentation.

Raw code search is strong at local truth:

- what this file does
- what this function calls
- where this symbol is defined

But raw search is weak at repo-level completeness:

- which sibling layers must also be inspected
- which ownership boundary a task belongs to
- which conventions are real even when the imports do not show them

Traditional docs or knowledge graphs are strong at narrative context:

- what the subsystem is for
- how people talk about it
- what the high-level flow looks like

But they are usually weak at edit completeness:

- they often do not cover enough live code surface
- they go stale
- they are expensive to maintain
- they still leave the agent to rediscover the real touch points

The AI Index is designed for the middle:

- more structure than prose docs
- more repo-awareness than a flat index
- less duplication than a human documentation system

## Data Structure: Tree vs Graph

This is the most important design difference.

### Traditional Knowledge Graph / Documentation Tree

Typical shape:

```text
index
  -> feature doc
    -> deeper doc
      -> code pointers
```

This is still mostly a document tree.

It helps answer:

- "What is this feature?"
- "How does this system work?"
- "What should a human read next?"

It is good for onboarding and architecture tours.

### AI Index Graph

Typical shape:

```text
AI_INDEX.md
  -> domain file
    -> change surfaces
    -> must_check rules
    -> critical nodes
    -> verified edges
```

This is a traversal graph.

It helps answer:

- "Which domain should I open first?"
- "If I change this route or service, what else should I inspect?"
- "Which files belong to the same change surface?"

It is good for implementation, debugging, impact analysis, and keeping edits complete.

## The Methodology

The workflow has four parts.

### 1. Use

When a repo already has an AI Index:

- read `AI_INDEX.md`
- pick the smallest relevant set of domains
- open only those domain files
- inspect the listed change surfaces
- follow `must_check` before editing

This prevents the agent from starting blind and wandering through the repo.

### 2. Generate

When a repo does not have an AI Index yet:

- inspect repo structure
- identify real domains
- map the major change surfaces for each domain
- record only high-value nodes and verified edges
- keep human prose out

The point is not to inventory every function.

The point is to create a graph that makes future changes more complete.

### 3. Sync

After meaningful edits:

- look at the changed files
- map them back to affected domains
- update the domain file
- update root rules only if the change affects repo-wide behavior
- re-check paths and links

This keeps the graph useful without rebuilding everything.

### 4. Validate

Before trusting the index:

- confirm paths still exist
- confirm `[[wikilink]]` references still resolve
- confirm domains still match real repo boundaries
- confirm the graph still reflects current change surfaces

## Why AI Builds the Index

This repo used to lean more heavily on a generator script.

That turned out to be the wrong center of gravity.

A script is good at syntax extraction.

It is not good at deciding:

- what the real domain boundary is
- which edges matter for change completeness
- which conventions are invisible from imports
- which nodes are worth keeping
- which `must_check` rules are the difference between a correct edit and a partial edit

For a first-pass graph, AI judgment is usually worth more than deterministic coverage.

## Benchmark Summary

The public benchmark write-up that motivated this work is here:

https://dev.to/ithiria894/the-bottleneck-for-ai-coding-assistants-isnt-intelligence-its-navigation-2p30

Across eight benchmark tasks, the pattern was consistent:

- the graph usually reduced tool calls
- the graph usually reduced token burn on cross-surface tasks
- the graph improved change completeness most clearly when the task touched multiple layers

### Benchmark Table

| Test | Graph | Comparison | What changed |
|---|---:|---:|---|
| 1 | `14K` tokens / `10` tool calls | `14K` / `12` | same token cost, fewer steps, better cascade awareness |
| 2 | `5K` / `4` | `5.1K` / `5` | slightly cheaper, fewer steps |
| 3 | `11K` / `10` | `14K` / `14` | lower cost, cleaner traversal |
| 4 | `5K` / `5` | `6K` / `8` | lower cost, fewer tool calls |
| 5 | `16K` / `12` | `22K` / `18` | lower cost and higher edit completeness |
| 6 | `48K` / `14` | `72K` / `26` | large-repo navigation win |
| 7 | `55K` / `18` | `82K` / `33` | large-repo navigation win |
| 8 | `61K` / `17` | docs: `64K` / `35`, no-map: `47K` / `30` | graph used more tokens than a narrow no-map run, but still cut tool churn and beat prose-doc flow |

### What the numbers say

- Median token savings versus the no-map baseline: about `21%`
- Average tool-call reduction versus the no-map baseline: about `34%`
- Biggest gains showed up when a task crossed routers, services, schemas, tests, configs, jobs, or migrations

The important nuance:

The AI Index is not guaranteed to be the absolute lowest-token path on every tiny task.

If the task is narrow, local, and already obvious, jumping straight into code can be cheaper.

But as soon as the task becomes "change this without missing anything related," the graph starts to pay for itself.

## Why We Say It Can Cover About 95% Of What Teams Actually Used Knowledge Graphs For

This is a practical claim, not a philosophical one.

In day-to-day coding work, the questions people actually ask are usually:

- where do I start
- what else is related
- which files move together
- what will I forget if I only follow imports
- what tests or config surfaces should I inspect

That is exactly what the AI Index is built to answer.

For those practical workflows, it can usually replace roughly `95%` of the value people were getting from a traditional knowledge graph.

What remains in the missing `5%`:

- rich onboarding narrative
- historical design rationale
- architecture storytelling for humans
- communication material you want to forward to people who are not in the code

Those things can still matter.

They are just not the highest-leverage format for a coding agent trying to make a correct edit.

## When AI Index Works Best

Use an AI Index when:

- the repo is medium or large
- tasks often cross multiple layers
- agents frequently miss related edits
- repo conventions matter as much as imports
- you care about blast-radius analysis and change completeness

It is especially good for:

- bug fixes with hidden side effects
- feature work that touches route, service, schema, config, and tests together
- large repos with many entry points
- review workflows where you want to check what else should have changed

## When Traditional Documentation Still Helps

Traditional docs still help when:

- a new engineer needs the story before touching code
- the system has difficult business context that is not visible in code
- you need architecture communication for humans, not just navigation for AI
- the repo is tiny and the codebase is already easy to sweep directly

This repo is not arguing that human documentation has zero value.

It is arguing that human documentation is often the wrong primary artifact for AI-assisted coding work.

## Pros

- faster orientation on non-trivial repos
- fewer wasted tool calls
- better blast-radius analysis
- better odds of complete edits
- lower duplication than prose-heavy doc systems
- easier to keep operational than a full knowledge graph

## Cons

- still requires disciplined maintenance
- can drift if updates are skipped
- not a replacement for reading source
- weaker than human docs for onboarding narrative
- can be overkill for very small repos
- depends on good domain boundaries; bad boundaries make the graph noisy

## Why The Folder Usually Ends Up Smaller Than Traditional Docs

The AI Index keeps only what code search misses:

- domain boundaries
- change surfaces
- non-obvious coupling
- must-check rules
- a small number of anchor nodes

It deliberately avoids:

- long feature summaries
- repeated explanations of code behavior
- exhaustive function-by-function prose
- mirrored inverse relationships that can be derived from search

That usually means:

- fewer words
- less repetition
- smaller doc footprint
- higher ratio of operational signal to maintenance cost

## Default Layout

```text
AI_INDEX.md
AI_INDEX/
  domain-a.md
  domain-b.md
  domain-c.md
```

Root file:

- read order
- repo-wide rules
- domain index

Domain file:

- scope
- change surfaces
- must-check rules
- critical nodes

## Quick Start

Install as a Claude Code plugin:

```bash
/plugin add-marketplace https://github.com/ithiria894/AI-Index
/plugin install codebase-navigator
```

Then start with:

```text
/ai-index
```

Common modes:

- `/use-ai-index` when the repo already has an index
- `/generate-graph` when starting from zero
- `/sync-graph` after meaningful code changes

## Bottom Line

If your problem is "the AI does not understand the feature," write docs.

If your problem is "the AI changes one file and misses five related ones," build an AI Index.

That is the whole bet behind this repo.
