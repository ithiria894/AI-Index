# AI Index — {repo name}
<!-- Last updated: {YYYY-MM-DD} -->
<!-- Verified against: {HEAD|commit hash} -->
<!-- Domains: {count} -->
<!-- Repository root: {absolute path if AI Index lives outside the repo} -->

## Read Order
1. Read this file.
2. Pick domains from the index below.
3. Open only those domain files.
4. Resolve the repository root.
5. Read source at `at` paths relative to that root before making claims or edits.

## Global Rules
- Add repo-wide change rules here.
- Keep them operational and terse.
- Only include rules that affect multiple domains or the whole repo.

## Domain Index

| Domain | File | Owns | Open When |
|--------|------|------|-----------|
| {Domain Name} | `AI_INDEX/{domain}.md` | short category hint | task triggers that mean "open this domain" |
| {Domain Name} | `AI_INDEX/{domain}.md` | short category hint | task triggers that mean "open this domain" |

---

# Domain — {Domain Name}
<!-- Nodes: {count} | Hot: {count} -->

## Scope
- owns: `path/a`, `path/b`
- open_when: short operational triggers
- change_surfaces:
  - routes: `...`
  - services: `...`
  - model_utils: `...`
  - models: `...`
  - api_schemas: `...`
  - core_schemas: `...`
  - graphql: `...`
  - jobs_or_etl: `...`
  - tests: `...`
  - configs: `...`
  - migration_search: `keyword1`, `keyword2`
- must_check:
  - `path/or/system` when X changes
  - `path/or/system` when Y changes

## Nodes

### {NodeName}
- kind: {router|service|model_utils|model|schema|graphql|job|config|module|class|function}
- at: `relative/path.py`
- search: term 1, term 2, term 3
- uses: [[NodeA]] (verified), [[NodeB]] (inferred)
- tests: `tests/path/`
- hot: true

### {NodeName}
- kind: {router|service|model_utils|model|schema|graphql|job|config|module|class|function}
- at: `relative/path.py`
- search: term 1, term 2, term 3
- uses: [[NodeC]] (verified)

---

## Template Rules

- Root file lives at `{repo_root}/AI_INDEX.md`.
- Domain files live under `{repo_root}/AI_INDEX/`.
- `Repository root` is optional when the index lives inside the repo; include it when the index lives elsewhere.
- Build by AI, not by script.
- Change surfaces are mandatory.
- Nodes are selective, not exhaustive.
- Do not write human-oriented explanations.
- Do not add `used_by`; derive inverse edges from `uses`.
