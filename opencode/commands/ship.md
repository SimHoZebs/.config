---
description: Commit, merge to trunk, and push the current work
---

Ship per $ARGUMENTS (staged scope if empty).

!`git branch --show-current 2>&1; echo ---; git status -sb 2>&1 | head -20; echo ---; git log --oneline -5 2>&1; echo ---; if test -e "$(git rev-parse --git-path rebase-merge 2>/dev/null)"; then echo REBASE-MERGE-PRESENT; elif test -e "$(git rev-parse --git-path rebase-apply 2>/dev/null)"; then echo REBASE-APPLY-PRESENT; else echo no-rebase-state; fi`

Stop with no writes if output shows "not a git repository", REBASE-MERGE-PRESENT, or REBASE-APPLY-PRESENT.

- Commit only the agreed scope via pathspec; leave other changes alone. Split semantic commits. Gate each on verification-before-completion plus code-change-reviewer sign-off. Block on actionable findings.
- Fetch origin and fold the trunk branch into the work (merge, never rebase pushed commits). Resolve trunk via origin/HEAD, never assume main. Re-run the gate. Stop and report on any conflict.
- Merge to trunk and push. Push plainly; on rejection stop and report instead of forcing. Never use --force, never amend commits you do not own.
- Do not ask about commit/merge/push/rebase unless $ARGUMENTS overrides. Reply briefly in your own words.
