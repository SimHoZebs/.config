#!/bin/bash

action="$1"
pane="${2:-${TMUX_PANE:-}}"

[ -n "$TMUX" ] || exit 0
case "$pane" in
  %*) ;;
  *) exit 0 ;;
esac

case "$action" in
  working|waiting|done)
    tmux set-option -p -t "$pane" @opencode_status "$action" 2>/dev/null
    ;;
  clear)
    tmux set-option -pu -t "$pane" @opencode_status 2>/dev/null
    ;;
  *) exit 0 ;;
esac

win=$(tmux display-message -p -t "$pane" '#{window_id}' 2>/dev/null)
[ -n "$win" ] || exit 0

tmux set-window-option -t "$win" automatic-rename on 2>/dev/null
tmux run-shell -b "sleep 1.3; tmux set-window-option -t $win automatic-rename on" 2>/dev/null
exit 0
