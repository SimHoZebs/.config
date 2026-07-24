---
name: opencode-chat-history
description: Search, retrieve, and inspect OpenCode chat logs and prior sessions. Use when the user asks what happened earlier, wants to recover pre-compaction details, find previous decisions or implementations, search conversation history, inspect another session, or access OpenCode chat logs.
---

# OpenCode Chat History

Use the dedicated history tools instead of guessing from compacted context or querying OpenCode's database with ad hoc SQL.

## Workflow

1. For details earlier in the current conversation, call `chat_history_current` with a narrow query.
2. For a prior conversation, call `chat_history_search`. Keep its default `project` scope unless the user explicitly asks to search globally.
3. Use `role: user` to find what the user requested and `role: assistant` to find earlier conclusions or explanations.
4. Call `chat_history_get` only after selecting a relevant session from search results.
5. Start with 10-20 results or messages. Increase the limit only if the first retrieval is insufficient.
6. Leave `includeTools` false unless the task specifically needs commands, file paths, patches, tool failures, or tool output.

## Guardrails

- Treat transcripts as sensitive local data. Do not share, upload, or persist retrieved content without an explicit request.
- Do not expose hidden reasoning. The tools intentionally omit it.
- Quote only the minimal history needed for the current task.
- Distinguish retrieved historical statements from verified current repository or system state.
- Prefer current files, tests, logs, and APIs when checking whether an old implementation detail is still true.
- Never modify `opencode.db` directly.
