#!/bin/bash

# Claude Code Stop-hook helper: promptly refresh THIS pane's window name so the
# "done" marker (see pane-name.sh) appears without waiting for an unrelated tmux
# event. Runs from settings.json hooks (Stop); inherits $TMUX / $TMUX_PANE from
# the Claude process launched inside tmux.
#
# WHY THE DOUBLE NUDGE: while Claude works, its title spinner rewrites pane_title
# many times a second, so tmux fires automatic-rename events continuously and the
# "working" marker self-refreshes. Going idle fires exactly ONE title change
# (→ "✳ …"), and tmux caches #() output for ~1s (see rename-refresh.sh) — so the
# first re-eval can still return the cached "working" name. We nudge now and again
# after the cache expires. The delayed pass runs under the tmux server via
# run-shell -b, so this hook returns to Claude immediately instead of sleeping.

[ -n "$TMUX" ] || exit 0
win=$(tmux display-message -p -t "${TMUX_PANE:-}" '#{window_id}' 2>/dev/null)
[ -n "$win" ] || exit 0

# window ids are @N (no shell-special chars), so embedding $win unquoted is safe.
tmux set-window-option -t "$win" automatic-rename on 2>/dev/null
tmux run-shell -b "sleep 1.3; tmux set-window-option -t $win automatic-rename on" 2>/dev/null
exit 0
