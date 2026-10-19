---
name: parallel-optimization-audit
description: Find codebase optimizations with scoped parallel subagents plus dedupe. Use when user asks for optimizations, improvements, audit for cuts, LOC reduction, or minimal clean architecture.
---

# Parallel Optimization Audit

Launch scoped read-only audits in parallel. Then dedupe. Do not run one umbrella prompt.

Lens homes: state ownership in `frontend-state`, component plus visual boundaries in `frontend-state` and `frontend-domain`, type safety in `contracts-types`, duplicated mechanisms in `contracts-types`, file placement in `deploy-build-test`, render performance in `frontend-state`, verification in Rules plus Phase 2, test infra plus deps plus error handling plus CSS plus config sprawl plus a11y plus security plus bundle in `deploy-build-test`.

## Phase 1 — Launch 6 scoped subagents in parallel

Use `subagent` with `agent: explore` or `agent: general`. Run all 6 in one parallel block. Each gets only its reference file. Each stays read-only. No edits, no commits.

1. `references/backend-domain.md`
2. `references/backend-api-persist.md`
3. `references/frontend-state.md`
4. `references/frontend-domain.md`
5. `references/contracts-types.md`
6. `references/deploy-build-test.md`

Each scope returns: user-observable behavior, `file:line`, code terms used, ordered steps the code takes today, maintenance cost, smallest correction, verification check.

## Phase 2 — Dedupe with one vocabulary

Build an alias table first. Group every finding by concept, not by term. Different code names for one behavior become one row. Pick one user term per concept. Use the repo glossary or intent docs when they exist. Else use UI labels the user clicks or sees.

Rewrite all findings to the picked term. Use the same words and the same phrasing wherever the thing or the step is identical. Change words only where the thing or the step differs. Never let two terms for one thing survive into the final output. List retired aliases in one table so the user sees what got merged.

Assume the user never read code. They know the app only from clicks and results on screen.

## Output format — user first, step-diff second

For each finding use this order:

1. What you see or do. One paragraph. Plain words. No file names.
2. What the code does today. Numbered steps. Start each step with you or the system action.
3. Simpler version. Numbered steps. Copy today wording word-for-word for every identical step. Change only the steps that differ.
4. Label: `Shortening` when the end result stays the same with fewer steps, or `Re-targeting` when the end state changes. State the end state in one line.
5. Then: `file:line`, lines saved, risk, verification.

Example shape:

Today, 5 steps to same X:
1. You open X. 2. System builds key. 3. System checks table. 4. System runs math. 5. Screen shows X.

Proposed, 2 steps to same X:
1. You open X. 2. System runs math. 3. Screen shows X.

Label: `Shortening`. End state: same X. Steps 2-3 deleted. Wording of kept steps matches today exactly.

## Rules

- Inspect real code. Cite `file:line`.
- Treat history as context, not gospel. User statements set intent. Code plus tests plus logs set behavior. Quantitative claims need measures.
- One term per concept in final output. Aliases live only in the alias table.
- Run a check only when docs show it is local and non-mutating. Stop when the check would write files. Report the side effect.
- Stop a scope when more scans cannot change its findings.
