---
description: Commit, merge to trunk, and push the current work
---

Ship per $ARGUMENTS (staged scope if empty).

Check git state yourself first with read-only commands. Stop with no writes outside a git repo or on a mid-rebase tree.

- Commit only the agreed scope via pathspec; leave other changes alone. Split semantic commits. Gate each on verification-before-completion plus code-change-reviewer sign-off. Block on actionable findings.
- Fetch origin and fold the trunk branch into the work (merge, never rebase pushed commits). Resolve trunk via origin/HEAD, never assume main. Re-run the gate. Stop and report on any conflict.
- Merge to trunk and push. Push plainly; on rejection stop and report instead of forcing. Never use --force, never amend commits you do not own.
- Do not ask about commit/merge/push/rebase unless $ARGUMENTS overrides. Reply briefly in your own words.
