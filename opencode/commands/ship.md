---
description: Safe-ship current git work to its feature branch without touching trunk
---

Safe-ship the current work per $ARGUMENTS. If $ARGUMENTS is empty, ship the current staged scope as-is.

Current git state (read-only, captured at invocation):

!`git branch --show-current 2>&1; echo ---; git status -sb 2>&1 | head -20; echo ---; git log --oneline -5 2>&1; echo ---; if test -e "$(git rev-parse --git-path rebase-merge 2>/dev/null)"; then echo REBASE-MERGE-PRESENT; elif test -e "$(git rev-parse --git-path rebase-apply 2>/dev/null)"; then echo REBASE-APPLY-PRESENT; else echo no-rebase-state; fi`

Guard: if the output shows "not a git repository", stop and say so. Do nothing else. This command applies only inside a git repo. If the output shows `REBASE-MERGE-PRESENT` or `REBASE-APPLY-PRESENT`, stop and report; do not commit, rebase, reset, or switch branches.

Rules:

- Never merge to the trunk branch, never push trunk, never amend commits you do not own, never use `--force` on trunk.
- If the current branch is a trunk branch, stop and report instead of committing: cut a feature branch first, then ship from there. The only exception is an explicit user order to commit on trunk, in which case commit the ordered scope via pathspec, leave the push to the user, and flag it in the report.
- Split commits into semantic chunks. Verify at commit gate per the `verification-before-completion` skill. Require `code-change-reviewer` for the exact staged diff before each commit. Block on actionable findings.
- Push only the current feature branch when the gate passes. Never push trunk. The trunk merge stays with the parent or user.
- Do not ask "should I commit / merge / push / rebase?" Follow the default above unless $ARGUMENTS overrides it.

End with: branch, HEAD vs origin (ahead/behind), `status -sb`, pushed commit hashes, and what still needs a trunk merge.
