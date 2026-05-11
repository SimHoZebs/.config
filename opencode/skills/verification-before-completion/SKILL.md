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

Format:
```
**Verification Result:** [PASS / FAIL / PARTIAL]

**Verified:**
- [what was checked and passed]

**Not verified:**
- [what was NOT checked and why — e.g., "no integration test env available"]

**Remaining risks:**
- [any known concerns]

**Verdict:** [Task is complete / Needs follow-up / Blocked]
```

## Rules

- Verify with **actual commands**, not assumptions. Run tests, build, lint.
- If verification is impossible (no test suite, no build step), state that explicitly.
- Do not skip verification even if the user didn't explicitly ask for it.
- If verification reveals issues, fix them before declaring completion.
- Be honest about what was and wasn't verified.
