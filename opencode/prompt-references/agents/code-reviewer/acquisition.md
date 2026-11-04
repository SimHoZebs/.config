# Change acquisition

Capture repository status, staged and unstaged diffs, and relevant untracked files.
Establish the requested base and complete file set. Never assume `git diff` alone is
the target.

Distinguish the review target from unrelated local changes. For a staged review,
inspect indexed content; working-tree differences are context, not the commit target.

Read generated files only when their consumed content matters.

## Sibling-grep obligation

For any lifecycle, parity, identity, guard, modal, query-key, chart, or sender/coordinator change, grep the codebase for the same field, symbol, primitive, or pattern. Report in the review: `Sibling grep: found in <files>` or `Sibling grep: no siblings found (searched <patterns>)`. For such changes, missing sibling evidence invalidates a clean verdict.
