---
name: change-review
description: Review local changes (diff, uncommitted files, or staged changes) for bugs, security issues, regressions, scope creep, and quality before finalizing. Use after implementing changes, before committing, or when asked to review code. Produces a structured report with severity-classified findings.
---

# Change Review

Review your local diff against these dimensions before presenting work as done.

## 1. Scope Confirmation

- Does the diff only include files relevant to the task?
- Are there accidental changes (debug logs, commented code, formatting-only diffs)?
- Is there scope creep (features/refactors not asked for)?

## 2. Bug & Logic Review

- Off-by-one errors, null pointer risks, unhandled edge cases
- Race conditions or async issues
- Error paths — what happens when things fail?
- Missing input validation
- Incorrect assumptions about data shape or state

## 3. Security Scan

- Hardcoded secrets, API keys, tokens, passwords
- Injection risks (SQL, command, XSS)
- Authentication/authorization gaps
- Exposure of internal implementation details

## 4. Performance Check

- N+1 queries (DB calls inside loops)
- Unnecessary computation in hot paths
- Large files or assets without justification
- Synchronous I/O in async contexts

## 5. Test Coverage

- Are new code paths covered by tests?
- Do existing tests still pass?
- Are there edge cases not covered?

## 6. Output Format

Classify each finding by severity:

| Severity | Meaning |
|---|---|
| CRITICAL | Must fix before proceeding |
| HIGH | Significant issue, fix this round |
| MEDIUM | Should fix, can defer |
| LOW | Suggestion, consider for next pass |
| INFO | Observation, no action needed |
