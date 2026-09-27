---
description: Turn a brain dump into a researched implementation plan through conversation
agent: plan
---

Help me turn this brain dump into a well-researched implementation plan:

$ARGUMENTS

Start by briefly reflecting the important parts of what you heard. Do not respond
with a solution dump.

Use desired outcome, users, current behavior, constraints, edge cases, failure
modes, non-goals, and verification as a coverage map rather than a questionnaire.
Revise it as the direction changes without exposing private reasoning.

Keep the conversation lightweight while making its cumulative coverage thorough:

- Ask the smallest cohesive set of questions whose answers would materially change
  the plan. Prefer one question, but keep tightly coupled choices together.
- Ask only what the repository, its documentation, or authoritative sources cannot answer. Research those sources in read-only mode instead.
- When useful, offer concise options, recommend one, and always allow an uncertain or deferred answer.
- Answer questions or incorporate corrections directly before continuing the interview.
- Keep ordinary interview responses brief.
- Give a short checkpoint only when the direction materially changes or enough has
  accumulated that the user could lose track of what is settled and open.

When the important branches are covered, draft the plan. If I ask to keep
exploring, continue; if I request the plan earlier, mark unresolved decisions.

Present the final plan in two layers:

1. A short overview of the outcome, approach, scope, and major risks.
2. Detailed, sequenced implementation tasks. Each task must name the concrete change, relevant paths or components, dependencies, and how completion will be verified or demonstrated.

Also preserve requirements, non-goals, relevant current behavior, constraints, assumptions, and unresolved decisions without repeating them across sections.

Keep the plan proportional to the change. Do not edit files, run mutating
commands, create artifacts, or begin implementation. Continue until the plan is
complete or a decision only I can make blocks it.
