---
name: receiving-code-review
description: Use when receiving code review feedback, before implementing suggestions — especially if feedback seems unclear or technically questionable. Requires technical rigor and verification, not performative agreement or blind implementation.
---

# Code Review Reception

Code review requires technical evaluation, not emotional performance.

Core principle: Verify before implementing. Ask before assuming. Technical correctness over social comfort.

## The Response Pattern

When receiving code review feedback:

1. READ: Complete feedback without reacting
2. UNDERSTAND: Restate requirement in own words (or ask)
3. VERIFY: Check against codebase reality
4. EVALUATE: Technically sound for THIS codebase?
5. RESPOND: Technical acknowledgment or reasoned pushback
6. IMPLEMENT: One item at a time, test each

## Handling Unclear Feedback

If any item is unclear: STOP. Do not implement anything yet. Ask for clarification first.

Why: Items may be related. Partial understanding = wrong implementation.

## Source-Specific Handling

Before implementing:
1. Check: Technically correct for THIS codebase?
2. Check: Breaks existing functionality?
3. Check: Reason for current implementation?
4. Check: Works on all platforms/versions?
5. Check: Does reviewer understand full context?

If suggestion seems wrong: Push back with technical reasoning.

If you can't easily verify: State the limitation.

## YAGNI Check

If reviewer suggests "implementing properly", grep codebase for actual usage. If unused, ask "This endpoint isn't called. Remove it (YAGNI)?" If used, then implement properly.

## Implementation Order

For multi-item feedback:
1. Clarify anything unclear FIRST
2. Then implement in order:
   - Blocking issues (breaks, security)
   - Simple fixes (typos, imports)
   - Complex fixes (refactoring, logic)
3. Test each fix individually
4. Verify no regressions

## When To Push Back

Push back when:
- Suggestion breaks existing functionality
- Reviewer lacks full context
- Violates YAGNI (unused feature)
- Technically incorrect for this stack
- Legacy/compatibility reasons exist

How to push back: Use technical reasoning, not defensiveness. Ask specific questions. Reference working tests/code.

## Common Mistakes

| Mistake | Fix |
|---|---|
| Performative agreement | State requirement or just act |
| Blind implementation | Verify against codebase first |
| Batch without testing | One at a time, test each |
| Assuming reviewer is right | Check if breaks things |
| Avoiding pushback | Technical correctness > comfort |
| Partial implementation | Clarify all items first |
