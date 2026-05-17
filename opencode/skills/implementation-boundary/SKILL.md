---
name: implementation-boundary
description: Use when a task has unclear user ownership, conceptual shape, learning value, or AI delegation boundary. Separates user-owned decisions from bounded implementation work, identifies missing environment support, and recommends the smallest safe next slice. Do not use for small mechanical changes or non-trivial features whose concept and implementation boundary are already clear.
---

# Implementation Boundary Review

Use this skill to decide what the user should own, what AI can safely implement, and what project environment gaps make delegation risky.

This is a temporary protocol, not a permanent personality. The goal is to preserve user judgment while still using AI aggressively for bounded execution.

## Trigger Conditions

Use this skill when any of these are true:

- The task defines or changes core domain concepts.
- The abstraction, ownership boundary, or delegation boundary is unclear.
- The user is learning the language, framework, architecture, or domain involved.
- The implementation would teach an important concept if done manually.
- The task could become broad, unreviewable, or hard to debug if delegated as one chunk.
- There is uncertainty about whether AI should design, implement, critique, or wait.
- The agent struggled because the project lacks tests, docs, examples, conventions, or clear boundaries.

Do not use this skill for:

- Small bug fixes with obvious scope.
- Mechanical refactors where the pattern is already established.
- Non-trivial features whose concept, contract, and implementation boundary are already clear.
- Straightforward CRUD or wiring with clear contracts.
- Formatting, docs cleanup, or minor test scaffolding.

## Workflow

### 1. Inspect Before Interviewing

Inspect relevant code, tests, docs, routes, models, APIs, and naming before asking the user questions.

If a question can be answered from the codebase, answer it from the codebase. Ask only when ambiguity materially affects ownership or implementation.

### 2. Identify The Conceptual Decisions

List the decisions that define the system's model or architecture.

Look for decisions about:

- Domain terms and boundaries
- Data ownership and state lifetime
- API contracts and dependency direction
- Persistence model and migrations
- Failure behavior and recovery
- Security, privacy, and authorization
- Testing strategy and observability

### 3. Separate Ownership From Execution

Classify the work into three buckets:

| Bucket | Meaning |
|---|---|
| User-owned decisions | Choices involving learning, judgment, domain modeling, architecture, or future ownership |
| Safe AI delegation | Clear implementation tasks with known patterns, contracts, low risk, and limited blast radius |
| Needs clarification | Ambiguities that block safe implementation or make the diff hard to review |

Use this rule:

> Manual-first for concepts, AI-first for execution.

### 4. Pressure-Test The Shape

Challenge the proposed direction before implementation.

Check:

- What terms are vague, overloaded, or inconsistent with the code?
- What future feature would this design make painful?
- What tests would fail to catch a real bug here?
- What hidden coupling could this introduce?
- What failure mode is subtle or expensive?
- Can the user explain and debug the generated output afterward?

If the user proposes a shape, critique it directly and recommend the strongest path. Do not validate weak designs just to be agreeable.

### 5. Recommend A Bounded Delegation Slice

Recommend the smallest useful slice AI can implement safely.

The slice should include:

- Clear input and output
- Files or patterns to follow, if known
- Acceptance criteria
- Relevant tests or verification commands
- Explicit non-goals
- Expected blast radius

If no safe implementation slice exists yet, recommend the smallest step that improves understanding: a sketch, type signature, failing test, fixture, spike, or code-reading summary.

### 6. Extract Environment Improvements

If AI struggled or delegation is risky, identify what is missing from the project environment.

Examples:

- Tests or fixtures for important behavior
- Domain glossary or context notes
- Architecture notes or ADRs
- Stronger types or schemas
- Examples of established patterns
- Local dev, test, or rollback scripts
- Clearer module boundaries or names
- Documented domain rules

Recommend only environment improvements connected to the current task. Do not turn the feature into a broad documentation or refactor project.

## Output Format

Keep the output concise and actionable:

```md
**Boundary Review**

**User-owned decisions**
- ...

**Safe AI delegation**
- ...

**Needs clarification**
- ...

**Recommended next slice**
- ...

**Environment gaps**
- ...
```

If there are no user-owned decisions beyond normal review, say so and proceed with direct implementation.

## Rules

- Do not ask the user to choose a skill or phase.
- Do not force a long interview when code inspection gives enough clarity.
- Ask one question at a time when user input is required, and include your recommended answer.
- Do not delegate broad autonomous implementation after this review.
- Do not create documentation files unless a term or decision has actually been resolved.
- Treat subagent output as evidence to review, not authority.
