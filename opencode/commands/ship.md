---
description: Commit, merge to trunk, and push the current work
---

Ship per $ARGUMENTS (staged scope if empty).

Check git state yourself first with read-only commands. Stop with no writes outside a git repo or on a mid-rebase tree.

- Commit what the user pointed at — staged scope, or this session's own uncommitted work when they say ship. Never sweep in other sessions' files; when in doubt, ask. Split semantic commits.
- Fetch origin and fold the trunk branch into the work (merge, never rebase pushed commits). Resolve trunk via origin/HEAD, never assume main. Resolve your own merge conflicts into one correct result — keep both sides only when independently additive — then re-run the gate. Stop only for another session's live operation (check every worktree for rebase/merge state first) or a genuine product call, naming the stop cause.
- Merge to trunk and push. Push plainly; on rejection stop and report instead of forcing. Never use --force, never amend commits you do not own.
- Do not ask about commit/merge/push/rebase unless $ARGUMENTS overrides. Reply briefly in your own words.
