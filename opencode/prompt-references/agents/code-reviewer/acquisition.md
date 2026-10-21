# Change acquisition

Capture repository status, staged and unstaged diffs, and relevant untracked files.
Establish the requested base and complete file set. Never assume `git diff` alone is
the target.

Distinguish the review target from unrelated local changes. For a staged review,
inspect indexed content; working-tree differences are context, not the commit target.

Read generated files only when their consumed content matters.
