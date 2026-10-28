---
name: verification-before-completion
description: Verify work before claiming a task is done. Use before declaring a task complete, before committing, or when asked "is it done?". Checks tests, builds, linting, and produces an honest completion report. Do not skip verification steps even if the user didn't ask for them explicitly.
---

# Verification Before Completion

Before declaring any task done, run through this verification checklist and report results honestly.

## Checklist

### 1. Tests
- [ ] Run the relevant test suite
- [ ] All tests pass (not just the ones added)
- [ ] New code paths have test coverage
- [ ] No tests were disabled or commented out

### 2. Build & Type Check
- [ ] Project builds without errors
- [ ] Type checking passes (if applicable)
- [ ] Linting passes without new warnings

### 3. Diff Review
- [ ] Only intended files were changed
- [ ] No debug code, console.logs, or TODO comments left behind
- [ ] No secrets or credentials in the diff
- [ ] Changes are consistent with project conventions

### 4. Completion Report

Report briefly in plain words: what you did, what you checked, what is left. No hashes, no template, no jargon unless asked.

## When to verify

- During work, run scoped checks only (single package, single test file, typecheck).
- Run full suite once at commit gate, when user says commit or push.
- If gate fails and fix is small and safe, fix it and re-run gate once.
- If gate fails and needs design change, stop. Report failure, diff, options. Wait for user.

## Rules

- Verify with **actual commands**, not assumptions. Run tests, build, lint.
- If verification is impossible (no test suite, no build step), state that explicitly.
- Do not skip verification even if the user didn't explicitly ask for it.
- If verification reveals issues, fix them before declaring completion.
- Do not run full suite per hunk.
- Be honest about what was and wasn't verified.
