---
name: notion-task-management
description: >
  Manage Notion tasks — create, update, sync, extract, split, park, kill, and
  clean up. Use when the user says "update tasks", "create a task", "note this
  in notion", "sync to notion", "notion task", or when conversation content
  contains commitments, follow-ups, purchases, or "I should / I need to / I
  want to" language.
---

# Notion Task Management

## Description

Reusable skill for maintaining the user's task system without clutter or duplication.

Use this when:

- The user asks to create, update, sync, extract, split, park, kill, or clean up tasks.
- An SOP reaches an "extract actionables," "sync tasks," or "update task state" step.
- Content contains commitments, follow-ups, purchases, preparations, or "I should / I need to / I want to" language.
- A decision, clarification, or new context should update an existing task.

Do not use this to run a full backlog refinement conversation. Backlog Refinement owns the discussion and decision-making for stale or ambiguous backlog items; this skill owns the task-system write once the create/update/no-op decision is clear.

## Inputs

- Source content, source page, or existing task page.
- Any relevant Area, Project, Sprint, person, date, or deadline context.
- Existing task database conventions from the user's Tasks database before writing.
- Current decision or state to record, if this is coming from a refinement/coaching/review workflow.
- Any child tasks, parent tasks, or follow-ups that need to be linked.

## Task Database

- **Tasks - Personal**: database `278ee37b-d028-802f-b8fc-d23f998398d7`
  - Statuses: Doing, Done, Backlog, Dropped, etc.
  - Area relation links tasks to Areas (e.g. Home Server: `276ee37b-d028-801b-8e3c-f5b51f5c8435`)
- **Areas**: database `278ee37b-d028-8064-90ed-dff8f6548201`
- Use `notion_mcp_API-post-search` with `{filter: {property: "object", value: "page"}, query: "..."}` to find tasks across all accessible databases when you don't know the page ID.
- Use `notion_mcp_API-query-data-source` with `data_source_id` set to the database UUID to query/filter within a specific database (requires the database to be shared with the integration).

## MCP Operations Reference

| Step | Tool |
|------|------|
| 1. Load conventions | `retrieve-a-page`, `get-block-children` |
| 3. Search existing tasks | `post-search` (fallback: `query-data-source`) |
| 6. Create task | `post-page` |
| 6. Append session note | `patch-block-children` |
| 7. Update fields | `patch-page` |
| 7. Add body content | `patch-block-children` |
| 8. State notes | `patch-block-children` |

> **Note:** `create-a-comment` may fail (403) — prefer `patch-block-children` for appending notes.
> `post-page` parent uses `type: "database_id"`, not `"data_source_id"`.

## Procedure

### 1. Load task conventions

- Inspect the relevant task database and task page(s) before editing.
- Preserve existing workspace conventions for Status, Area, Project, Owner/Assignee, dates, priority, blocked/waiting state, parent/sub-task relations, and pinned state.
- Use actual Notion page mentions for related projects, areas, resources, people, and tasks when possible.
- Do not invent schemas, statuses, priorities, Areas, Projects, or relation conventions.

### 2. Extract candidate actionables

- Convert fuzzy intent into short concrete task candidates.
- Keep each task outcome-oriented and scoped to one action.
- Preserve important context, constraints, dates, dependencies, and source links.
- Distinguish between:
  - immediate commitments,
  - future/on-radar ideas,
  - waiting/blocked items,
  - parking conditions,
  - killed/no-longer-worth-doing items.

### 3. Search existing tasks

- Search known task databases before creating anything.
- Check active, backlog, waiting, and recently completed tasks.
- Prefer updating a related task over creating a near-duplicate.
- If a parent project or area already functions as the canonical backlog/order source, use that source instead of creating duplicate "prioritize this" tasks.

### 4. Classify each candidate

Classify every candidate as one of:

- **Covered** — an existing task already captures it; do nothing.
- **Update** — an existing task should receive new context, checklist items, links, dates, status, relations, or a compact state note.
- **Create** — no existing task matches closely enough.
- **Split** — a parent task needs child tasks or independent follow-ups.
- **Clarify** — ambiguity could create clutter or corrupt task meaning.

### 5. Preview unless already approved

If the user has not already said "implement," "apply," "go ahead," "create these," or similar, show a numbered preview before writing.

Use this format:

1. **[Create]** Task title — short note.
2. **[Update]** Existing task title — short note.
3. **[Covered]** Existing task title — no-op reason.
4. **[Clarify]** Question — short reason.

The user can approve with "all," "1 and 2," "approve 1, 3, 5," etc.

If invoked from a workflow where the user already gave global approval, execute the obvious creates/updates without per-task confirmation.

### 6. Create new tasks

When creating tasks:

- Use the best matching task database.
- Keep titles short, concrete, and action-oriented.
- Add concise source context to the body when it will help later.
- Set Area, Project, date, status, priority, owner, and relations only when clear from existing conventions.
- Do not create tasks for vague aspirations unless there is a concrete next action or preservation reason.
- Append a session note paragraph to the task body recording the date, what was done, and what's pending, so future sessions can pick up seamlessly.

### 7. Update existing tasks

When updating tasks:

- Update fields so the task is operational, not just described.
- Set or revise:
  - **Status** — e.g. Doing, Waiting, Done, Backlog, or workspace equivalent.
  - **Area** — where it belongs in life.
  - **Project** — if applicable.
  - **Owner / Assignee** — if the database uses it and the owner is clear.
  - **Start** — if active or scheduled.
  - **Due** — only when there is a real deadline.
  - **Blocked / Waiting** — when blocked by a person, date, dependency, or external response.
- Add the next action in the task body or the appropriate field.
- Link child tasks when follow-ups were split out.
- If the task is parked, state the reactivation condition.
- If killed, record the reason briefly and set the appropriate terminal status.

### 8. Record compact state notes when useful

When a task needs an audit trail, add a compact state note:

> `<mention-date start="YYYY-MM-DD"/>` State: one concise sentence about the task's current state, decision, or reactivation condition.

Prefer concise state notes over verbose headings.

Do not add a note that merely says the task is old or stale.

Do not invent rationale or commitments. Use only what the user actually decided or what the source clearly supports.

### 9. Split tasks when needed

Split when:

- There are multiple independent next actions.
- A task mixes decision-making and execution.
- Parallel follow-ups are needed.

Good split pattern:

- Parent task: the decision/outcome.
- Child tasks: concrete follow-ups such as emails, calls, purchases, detail gathering, or implementation steps.

After splitting, update the parent task so the relationship is clear.

## Guardrails

- Never create duplicate tasks when an update would work.
- Never change task state based only on age. A task update needs a real decision, new evidence, or explicit instruction.
- Never overwrite existing meaningful context unless the user clearly corrected it.
- Ask before changing a task if identity, project relation, or status ambiguity could corrupt the task system.
- Ask only when the write would be meaningfully wrong without clarification.
- Keep task pages operational and compact, not cluttered.

## Output

After execution, report:

- Created tasks (include Notion page URL).
- Updated tasks (include Notion page URL).
- Covered/no-op items.
- Split parent/child task links, if any.
- Open questions or unresolved ambiguity, if any.

## Maintenance

When the user corrects this skill, update it immediately so the correction persists.
