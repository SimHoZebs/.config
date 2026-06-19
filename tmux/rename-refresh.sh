#!/bin/bash

# Re-apply width-aware window names after a terminal/client resize.
#
# WHY THIS EXISTS: automatic-rename-format is re-evaluated on tmux *events*
# (pane title/command/focus/resize changes), NOT on a timer — so idle windows
# don't recompute on their own. Worse, the #() shell command it runs is CACHED
# by tmux for up to ~1s (tmux(1): "the previous result from running the same
# command is used"). So the first format eval after a resize emits the OLD
# width's name and merely schedules a fresh run; without a second eval after the
# cache expires, idle windows keep their stale (mis-truncated) names.
#
# This hook (bound to client-resized) nudges every window to re-evaluate twice,
# straddling the cache window, so names settle to the new screen width. A
# trailing-edge debounce collapses the burst of resize events from a drag into a
# single refresh that runs once the size stops changing.

stamp=/tmp/tmux-rename-refresh.stamp
quiet=0.4      # debounce: wait for resizes to stop before refreshing
cache_wait=1.3 # must exceed tmux's ~1s #() cache so the 2nd pass sees fresh output

# Trailing-edge debounce: stamp this invocation, wait out the quiet period, and
# bail if a newer resize superseded us — only the last resize does the work.
mine="$$.$(date +%s%N 2>/dev/null)"
echo "$mine" > "$stamp"
sleep "$quiet"
[ "$(cat "$stamp" 2>/dev/null)" = "$mine" ] || exit 0

nudge() {
  local w
  for w in $(tmux list-windows -a -F '#{window_id}' 2>/dev/null); do
    tmux set-window-option -t "$w" automatic-rename on 2>/dev/null
  done
}

nudge              # schedule a fresh run of pane-name.sh (this pass still cached)
sleep "$cache_wait"
nudge              # cache now refreshed → names re-applied at the new width
