---
name: systematic-debugging
description: Structured approach for diagnosing and fixing bugs, failing tests, runtime errors, and unexpected behavior. Use when debugging code, investigating test failures, troubleshooting errors, or fixing broken functionality. Follows a reproduce-isolate-fix-verify workflow instead of guessing.
---

# Systematic Debugging

Follow this structured approach rather than jumping to fixes.

## Step 1: Reproduce

Identify exact conditions that trigger the problem:
- What input, state, or sequence causes the failure?
- Is it consistent or intermittent?
- What changed since it last worked?
- Check error messages, stack traces, logs

## Step 2: Isolate Root Cause

Find the root cause, not the symptom:
- Narrow the failing scope with binary search (comment out half, test, repeat)
- Check assumptions about inputs, state, dependencies
- Look at the actual values, not just the types
- Check recent commits or changes nearby
- Verify data flows end-to-end for the failing path

## Step 3: Fix Minimally

Make the smallest targeted fix that addresses the root cause:
- Fix one thing at a time
- Do not refactor unrelated code during debugging
- Do not add features or "improve" things
- Prefer local fixes over architectural changes

## Step 4: Add Regression Test

Before considering it done:
- Write a test that reproduces the bug (it should fail without the fix)
- Verify the fix makes the test pass
- Ensure existing tests still pass

## Step 5: Verify No Side Effects

- Run the full test suite for the affected area
- Check that the fix doesn't break edge cases
- Verify on relevant platforms/versions if applicable
