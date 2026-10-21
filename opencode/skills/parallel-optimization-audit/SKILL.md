---
name: parallel-optimization-audit
description: Find codebase optimizations with scoped parallel subagents plus dedupe. Use when user asks for optimizations, improvements, audit for cuts, LOC reduction, or minimal clean architecture.
---

# Parallel Optimization Audit

Launch scoped read-only audits in parallel. Then dedupe. Do not run one umbrella prompt.

Lens homes: state ownership in `frontend-state`, component plus visual boundaries in `frontend-state` and `frontend-domain`, type safety in `contracts-types`, duplicated mechanisms in `contracts-types`, file placement in `deploy-build-test`, render performance in `frontend-state`, verification in `references/reporting.md` plus Rules, test infra plus deps plus error handling plus CSS plus config sprawl plus a11y plus security plus bundle in `deploy-build-test`, docs plus decision logs plus doc-code consistency in `doc-audit-reference`.

## Phase 1 — Launch 7 scoped subagents in parallel

Use `subagent` with `agent: explore` or `agent: general`. Run all 7 in one parallel block. Each agent reads its one scope reference and the shared explanation instructions in `references/reporting.md`. Do not give it the other scope references. Each stays read-only. No edits, no commits.

1. `references/backend-domain.md`
2. `references/backend-api-persist.md`
3. `references/frontend-state.md`
4. `references/frontend-domain.md`
5. `references/contracts-types.md`
6. `references/deploy-build-test.md`
7. `references/doc-audit-reference.md`

Each scope returns concise findings using `references/reporting.md`: relevant background, the direct change, source evidence, and verification. Investigation detail is not a mandatory field in the explanation.

## Phase 2 — Dedupe with one vocabulary

Build an alias table first. Group every finding by concept, not by term. Different code names for one behavior become one row. Pick one user term per concept. Use the repo glossary or intent docs when they exist. Else use UI labels the user clicks or sees.

Rewrite all findings to the picked term. Use one user term consistently instead of alternating between code aliases. List retired aliases in one short table so the user sees what got merged. This does not require repeating unchanged procedures.

Assume the user never read code. They know the app only from clicks and results on screen.

## Explain the finding directly

Read `references/reporting.md` before presenting findings or writing task files. Its explanation format applies to subagent reports, the final discussion, and task files.

Establish only the background needed to understand the recommendation, then state the actual action. If the recommendation is to merge two implementations, say so. Do not disguise implementation consolidation as a shorter runtime workflow.

Discuss one finding at a time unless the user asks for the full list. Do not create task files until requested. When documenting findings, use one file per independent finding, including documentation findings. Do not bundle several tasks into a category file.

Keep docs-only observations in a separate short section of the audit discussion. Keep the alias list short and plain-worded. Never ask permission-to-continue questions; proceed only on the user's go-ahead.

## Rules

- Inspect real code.
- Treat history as context, not gospel. User statements set intent. Code plus tests plus logs set behavior. Quantitative claims need measures.
- One term per concept in final output. Aliases live only in the alias table.
- Run a check only when docs show it is local and non-mutating. Stop when the check would write files. Report the side effect.
- Stop a scope when more scans cannot change its findings.
