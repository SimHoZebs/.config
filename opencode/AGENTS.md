Do not run sudo commands or any commands that require root privileges. Instead, request the user to run them manually.

# Verify, Don't Ask

Verify state with read-only tools before you ask the user or claim a result.

- Check system state with logs and tool output, not guesses.
- Search the web for infrastructure and third-party limits before you change config.
- Treat the user as supervisor, not debugger. Find answers yourself when tools permit.

# Parallel Sessions

Work with other agents instead of routing around them through the user. Resolve mechanical conflicts yourself: merge and re-verify, restore foreign state byte-identical, and escalate only genuine product decisions.

# Explain Options With Weight Before You Ask

Do not call `question` until text before it states all of these in the same turn:

- Findings from code, logs, or docs. Cause. Impact.
- Why the choice matters now.
- What each option entails: scope, files touched, run cost, future cost, reversibility.
- Weight: strong take, weak lean, or true toss-up. Never show equal buttons for unequal evidence. State 80/20 when it is 80/20.
- One recommendation with reasons tied to evidence.
- What stays fixed regardless of the pick.
- If you cannot state weight, investigate first. Do not ask to explore.

Bad, do not do this:

> Fit is clear. I will propose a location and exact rule text.
> [question with 3 equal buttons]
> Findings, options, and weight follow. I will ask after the summary.

Good:

> Findings: X. Impact: Y. Option A touches 2 files, runs on every edit, costs N sec, reverses by delete. Option B touches docs only, runs on demand. Weight: strong take for B because [evidence]. Fixed regardless: Z.
> [question with 2-3 options, descriptions self-sufficient]

`question` option descriptions may exceed 25 words when needed to carry entailment. The 25-word limit does not apply to pre-question context.

# Writing and Communication

- State facts directly. State the mechanism, not the negation.
- Use concrete examples and diagrams where it fits.
- Describe the system as it is, not how you learned it. Avoid NOTE, actually, and similar asides.
- Lead with the answer. Keep only context that changes decision or action.
- Define a new term at first use.

# Commits

One semantic chunk is the complete set of changes intended to go together. Keep each semantic chunk in one commit.

- Group changes by purpose, not by file or timing.
- Keep a feature and fixes found during its development or review in the same commit.
- Include the tests, documentation, and configuration needed for that complete change.
- Split commits only for independent changes with separate purposes, not for intermediate fixes within one feature.
- A change is independent only if it functions as intended in production as-is, even if all later work stops indefinitely.

## Required code review

- Agent prompt, instruction-only, or visual changes that is already reviewed by a human do not require code review.
- For every other commit, require `code-change-reviewer` for the exact staged diff and its affected behavior. In mixed commits, review the non-prompt changes.
- Be concise. The review agent already knows its responsibilities and what its input means. You only need to communicate intent of the change.
- Fix accepted findings. Reject unsupported findings with cited evidence.
- Block the commit if actionable findings remain unresolved or the review is incomplete.
- Reuse an existing review only when it covers the exact staged content.
- For accepted corrections, request delta review in the same reviewer session. For other scope changes, require a new review.
- Review supplements the checks in `verification-before-completion`. It does not replace deterministic lints for stack, native-first, perf, and god-file rules in the repo where such lints exist.

## Scratch workspace

- Never use /tmp or /tmp/opencode as a working directory.
- Use ~/.local/share/opencode/scratch/ (mode 700) for run logs, extracts, label sets, and other non-repo working files. Create per-task subdirectories.
- Shared read-only inputs (eval dataset caches, downloaded corpora) stay where the harness expects them; do not relocate another session's files. Delete only your own abandoned temp dirs, and only after confirming no live process uses them.
