---
description: Safe-ship current git work to its feature branch without touching trunk
---

Safe-ship per $ARGUMENTS (staged scope if empty).

!`git branch --show-current 2>&1; echo ---; git status -sb 2>&1 | head -20; echo ---; git log --oneline -5 2>&1; echo ---; if test -e "$(git rev-parse --git-path rebase-merge 2>/dev/null)"; then echo REBASE-MERGE-PRESENT; elif test -e "$(git rev-parse --git-path rebase-apply 2>/dev/null)"; then echo REBASE-APPLY-PRESENT; else echo no-rebase-state; fi`

Stop with no writes if output shows "not a git repository", REBASE-MERGE-PRESENT, or REBASE-APPLY-PRESENT.

- Never merge to, push, force-push, or amend others' commits on trunk. On trunk, cut a feature branch first; commit on trunk only on explicit user order via pathspec, and leave its push to the user.
- Split semantic commits. Gate each on verification-before-completion plus code-change-reviewer sign-off. Block on actionable findings.
- Push the feature branch only. Trunk merge stays with the parent or user. Do not ask about commit/merge/push/rebase unless $ARGUMENTS overrides.

Report: branch, HEAD vs origin, status -sb, pushed hashes, pending trunk merge (flag any trunk-exception commit).
