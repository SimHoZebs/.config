---
name: agents-md-improver
description: Audit and improve AGENTS.md files in projects. Use when asked to check, audit, update, improve, or fix AGENTS.md files. Scans for all AGENTS.md files, evaluates quality, produces a quality report, then makes targeted updates. Also use when user mentions "agent instructions maintenance" or "project memory optimization".
---

# AGENTS.md Improver

Audit, evaluate, and improve AGENTS.md files to ensure the agent has optimal project context.

This skill can write to AGENTS.md files. After presenting a quality report and getting user approval, it updates AGENTS.md files with targeted improvements.

## Phase 1: Discovery

Find all AGENTS.md files in the project and global config:
- Project root `AGENTS.md`
- `.opencode/AGENTS.md` if it exists
- Global `~/.config/opencode/AGENTS.md`

## Phase 2: Quality Assessment

For each file, evaluate against these criteria:

| Criterion | Check |
|---|---|
| Commands documented | Are build/test/dev/run commands present? |
| Architecture clarity | Can the agent understand the codebase structure? |
| Non-obvious patterns | Are gotchas and quirks documented? |
| Conciseness | No verbose explanations or obvious info |
| Currency | Does it reflect current codebase state? |
| Actionability | Can the agent act on the instructions? |

## Phase 3: Quality Report

Output a quality report BEFORE making any updates. Include:
- Which files were found
- Quality score per file
- Specific issues found
- Proposed improvements (as diffs or quoted blocks)

## Phase 4: Targeted Updates

After user approval, apply changes. Guidelines:

**Add only:**
- Commands or workflows discovered during analysis
- Gotchas or non-obvious patterns found in code
- Testing approaches that work
- Configuration quirks

**Avoid:**
- Restating what's obvious from the code
- Generic best practices already covered
- One-off fixes unlikely to recur
- Verbose explanations when a one-liner suffices

**Show diffs**: For each change, show which file, the specific addition, and why it helps future sessions.

## Phase 5: Apply

After user approval, apply changes using the Edit tool. Preserve existing content structure.
