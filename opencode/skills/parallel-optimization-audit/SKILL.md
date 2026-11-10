---
name: parallel-optimization-audit
description: Find codebase optimizations with scoped parallel subagents plus dedupe. Use when user asks for optimizations, improvements, audit for cuts, LOC reduction, or minimal clean architecture.
---

# Parallel Optimization Audit

Launch scoped read-only audits in parallel. Then dedupe. Do not run one umbrella prompt.

Shared reference directory: `~/.config/opencode/prompt-references/code-audit/`.
Resolve the reference filenames below from this directory.

Lens homes: state ownership and render performance in `frontend-state`, client domain logic in `frontend-domain`, design vocabulary plus visual ownership plus composition plus layout plus responsive behavior plus interaction plus accessibility in `ui-ux`, type safety and duplicated mechanisms in `contracts-types`, file placement plus test infra plus deps plus error handling plus config sprawl plus security plus bundles in `deploy-build-test`, verification in `reporting.md` plus Rules, docs plus decision logs plus doc-code consistency in `doc-audit-reference`.

## Phase 1 — Launch scoped subagents in parallel

Use one `subagent` with `agent: explore` or `agent: general` per scope reference below. Run them in one parallel block. Each agent reads its one scope reference and the shared explanation instructions in `reporting.md`. Do not give it the other scope references. Each stays read-only. No edits, no commits.

Apply the shared checks across each assigned area, including existing issues. A diff can provide context but does not limit this audit to new or changed code.

1. `backend-domain.md`
2. `backend-api-persist.md`
3. `frontend-state.md`
4. `frontend-domain.md`
5. `ui-ux.md`
6. `contracts-types.md`
7. `deploy-build-test.md`
8. `doc-audit-reference.md`

Each scope returns concise findings using `reporting.md`: relevant background, the direct change, source evidence, and verification. Investigation detail is not a mandatory field in the explanation.

## Phase 2 — Dedupe with one vocabulary

Build an alias table first. Group every finding by concept, not by term. Different code names for one behavior become one row. Pick one user term per concept. Use the repo glossary or intent docs when they exist. Else use UI labels the user clicks or sees.

Rewrite all findings to the picked term. Use one user term consistently instead of alternating between code aliases. List retired aliases in one short table so the user sees what got merged. This does not require repeating unchanged procedures.

Assume the user never read code. They know the app only from clicks and results on screen.

Write the findings directory in the audited project root:

- `audit-findings/README.md` — index table with one row per finding: ID, title, scope, status. Put the retired aliases table here too.
- `audit-findings/NNN-short-slug.md` — one file per independent finding, including documentation findings. Number files in presentation order. Do not bundle several findings into a category file.

Each finding file starts with:

```yaml
---
id: 001
title: <short finding title>
scope: <scope reference name>
status: needs-review
---
```

Status values: `needs-review`, `accepted`, `rejected`, `deferred`, `implemented`, `superseded`. Every finding starts at `needs-review`. The body follows `reporting.md`: background, direct change, references with paths and line numbers, verification.

## Phase 3 — Work through the findings

Present findings from the directory one at a time unless the user asks for the full list or a batch. When the user decides on a finding, update the record in the same turn:

- Change `status` in the finding file.
- Update the matching row in `audit-findings/README.md`.
- Add a `## Decision` section with the reason when the finding is rejected, deferred, or superseded. Do not add a decision note to accepted findings.
- Record the commit or verification result in an accepted finding when the change lands, then set it to `implemented`.

Never delete or renumber finding files during the session. A finding that no longer applies becomes `superseded`, with the replacement ID in its `## Decision` section.

## Explain the finding directly

Read `reporting.md` before presenting findings or writing finding files. Its explanation format applies to subagent reports, the final discussion, and finding files.

Establish only the background needed to understand the recommendation, then state the actual action. If the recommendation is to merge two implementations, say so. Do not disguise implementation consolidation as a shorter runtime workflow.

File docs-only observations as their own finding files, and keep a separate short section for them in the audit discussion. Keep the alias list short and plain-worded. Never ask permission-to-continue questions; proceed only on the user's go-ahead.

## Rules

- Inspect real code.
- Treat history as context, not gospel. User statements set intent. Code plus tests plus logs set behavior. Quantitative claims need measures.
- One term per concept in final output. Aliases live only in the alias table.
- Run a check only when docs show it is local and non-mutating. Stop when the check would write files. Report the side effect.
- Keep the findings directory and its README index in agreement after every status change.
- Stop a scope when more scans cannot change its findings.
