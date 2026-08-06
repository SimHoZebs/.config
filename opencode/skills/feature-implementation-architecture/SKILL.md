---
name: feature-implementation-architecture
description: Architecture check protocol to run before implementing non-trivial features, including pattern inspection, refactor triggers, future sibling simulation, and implementation rules.
---

# Feature Implementation Architecture Protocol

Before implementing any non-trivial feature, perform an architecture check.

## Step 1: Inspect Existing Patterns

Find:
- similar existing features,
- files/classes/modules that own the relevant behavior,
- where state is stored,
- where presentation is handled,
- where persistence/configuration is handled,
- current extension mechanisms, if any.

## Step 2: Classify The Feature

Classify the task as:
- variant addition,
- rule change,
- new system,
- presentation change,
- integration/glue change,
- persistence change,
- bug fix,
- refactor-only.

## Step 3: Check Refactor Triggers

A preparatory refactor is required if direct implementation would cause any of these:

1. Adding a new variant by expanding a central conditional/switch/enum branch.
2. Touching the same conceptual rule in 3 or more places.
3. Adding significant code to a file over 300 lines where inspection reveals mixed responsibilities, or any code to a file over 500 lines without a clear justification.
4. Adding new shared/persistent state without a clear owner.
5. Requiring callers to remember a specific sequence of method calls.
6. Mixing presentation, domain, persistence, or integration responsibilities.
7. Copy-pasting logic from a similar feature.
8. Adding another responsibility to an already broad Manager, Controller, Service, Helper, Utils, or Main module.
9. Making the next similar feature require edits to multiple unrelated files.
10. Adding special-case logic instead of modeling the missing concept.

## Step 4: Decide

Return a Refactor Decision:
- Direct implementation is acceptable,
- Minor refactor first, or
- Major refactor may be worthwhile, but requires explicit user permission before deeper investigation or implementation.

If a minor refactor is needed, describe the smallest behavior-preserving refactor that makes the feature easy to add.

If a major refactor may be worthwhile, do not fully design it or implement it without permission. Briefly present the tradeoff instead:

"I looked at this and it could be done directly, with a small cleanup first, or with a more polished major refactor. I have not investigated the major refactor in detail yet. If you want that path, I can look into it and describe what it would involve."

Continue with the direct or minor-refactor path unless the user asks to investigate the major refactor.

## Step 5: Future Feature Simulation

Name two likely future sibling features.

Explain how they would be added after this change.

If future sibling features would require copy-paste, central conditionals, duplicated state, or unrelated file edits, improve the design before implementing.

## Step 6: Implementation Rules

- Keep preparatory refactors separate from feature behavior where possible.
- Do not investigate or perform major refactors without explicit user permission.
- Do not do unrelated cleanup.
- Preserve behavior during refactors.
- Add or update tests/checks.
- If the plan becomes invalid during implementation, stop and revise the plan.
