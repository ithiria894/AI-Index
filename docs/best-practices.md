# AI Index Best Practices

> Keep the graph thin, keep code as truth, and optimize for complete changes instead of pretty docs.

## What This Doc Is For

This file is the short operational companion to the main spec.

Use it when you want the practical version of the methodology:

- what the graph should optimize for
- what should and should not be written down
- when to generate, use, sync, or validate
- how the six skills fit together

If you want the full format, read [AI_INDEX_SPEC.md](AI_INDEX_SPEC.md).

## The Design In One Screen

AI Index works best when five rules stay true:

1. Keep it navigation-first.
2. Keep code as the single source of truth.
3. Only hand-write rules AI cannot reliably infer from code.
4. Sync the graph after meaningful traversal-shape changes.
5. Use pattern audit or full sweep as backup when you need broader confidence.

One-line version:

`AI Index is not another documentation system. It is a repo traversal system for AI.`

## What The Graph Should Actually Do

The graph is there to answer four practical questions fast:

- where should the agent start
- which files belong to the same change surface
- what else must be checked before the edit is done
- which repo rules will not show up from imports alone

That is why the graph should bias toward:

- domain boundaries
- change surfaces
- must-check rules
- a small set of critical nodes

It should not try to be a prose explanation layer.

## What To Keep

Keep the parts that improve change completeness:

- `AI_INDEX.md` with read order, global rules, and domain index
- `AI_INDEX/<domain>.md` with `owns`, `change_surfaces`, `must_check`, and critical nodes
- verified edges that help an agent move through the repo
- test surfaces worth checking during bug fixes and feature work
- config or migration hints that are easy to miss from code alone

## What Not To Keep

Do not turn the graph into a second documentation system.

Avoid:

- long prose summaries of how code works
- function-by-function explanations
- duplicated information that grep or symbol search can recover quickly
- inverse edges that are easy to derive from direct edges
- stale story-like architecture notes inside the graph itself

If the agent wants to know what a function does, it should open the function.

## What Good Domains Look Like

A good domain groups code that usually changes together.

Think in terms of change ownership, not folder count.

Good domains often map to:

- a feature slice
- a subsystem
- a platform area
- a cross-cutting integration area

Bad domains usually happen when:

- you make one domain per tiny folder
- you split routers, services, and models even though they always move together
- you create one giant catch-all area that hides real blast radius

The test is simple:

`If I change this capability, would I naturally inspect these surfaces together?`

If yes, they probably belong in the same domain.

## Generate Vs Use Vs Sync Vs Validate

### Generate

Use `generate-graph` when:

- the repo has no `AI_INDEX.md`
- the old graph format is being replaced
- a major restructure made the old graph unreliable

The goal is not to document everything.

The goal is to build a graph that makes future edits harder to miss.

### Use

Use `use-ai-index` for ordinary work when the graph already exists.

That means:

- bug investigation
- feature work
- impact analysis
- code review
- tracing which layers move together

Always read `AI_INDEX.md` first, then open the smallest useful set of domain files.

### Sync

Use `sync-graph` after meaningful code changes.

Sync when traversal shape changed, for example:

- a new route
- a new service area
- a new job or worker
- a new config coupling
- a renamed or removed critical node
- a new must-check rule

Do not churn the graph for tiny internal logic edits.

### Validate

Before trusting the graph, validate the boring things:

- paths still exist
- wikilinks still resolve
- domain rows still point to real files
- tests still point to real surfaces
- domain boundaries still make sense

## The Six Skills And What They Are For

The repo ships six skills, but they are not all the same kind of thing.

### Core graph workflow

- `/use-ai-index`
- `/generate-graph`
- `/sync-graph`

These three are the real backbone.

Without them, the methodology is incomplete.

### Default router

- `/ai-index`

This is the front door.

It decides whether the repo needs:

- use mode
- generate mode
- sync mode

It is not strictly required, but it makes the workflow much easier to adopt.

### Applied work skills

- `/debug`
- `/new-feature`

These are where the graph becomes useful in real work.

They show how AI Index should affect:

- bug fixing
- feature work
- pattern sweep
- impact tracing
- post-change sync

## Pattern Sweep Still Matters

AI Index improves navigation.

It does not magically guarantee full coverage on every repeated bug pattern.

That is why pattern audit and full sweep still matter.

Use them when:

- the same bug pattern may repeat in multiple files
- the file is large and easy to miss things in
- the repo has a history of copy-paste patterns
- the cost of a partial fix is high

The graph narrows the search area.

The sweep gives you broader confidence inside that area.

## Why AI Builds The Graph Instead Of A Script

Scripts are good at parsing syntax.

They are much worse at judgment.

The hard part of AI Index is not extracting symbols.

The hard part is deciding:

- where domains really begin and end
- which coupling matters in practice
- which rules are invisible from imports
- which nodes are worth keeping

That is why the current design is AI-first.

The graph is built by AI once, then maintained by AI after meaningful changes.

## Packaging Reality

The current public release is:

- a Claude Code plugin
- a set of skills
- the spec
- the template
- the supporting docs

It is **not** a standalone MCP server.

That may happen later, but it is not what this repo currently ships.

## When AI Index Is The Wrong Tool

AI Index is not always the best answer.

It is probably overkill when:

- the repo is tiny
- the correct file is obvious
- the task is one-file local
- the main problem is human onboarding narrative, not AI navigation

In those cases, direct code reading or lightweight docs may be enough.

## Bottom Line

If your problem is:

`The agent does not understand what this feature is.`

Then architecture docs may help more.

If your problem is:

`The agent changed one file and forgot the other five.`

That is exactly the kind of problem AI Index is meant to solve.
