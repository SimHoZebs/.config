#!/bin/bash

# Re-evaluate all window names after a focus change.
#
# pane-name.sh returns just the index for the active window, so switching
# windows requires ALL windows to re-evaluate: the newly-active window
# collapses to its index, and the previously-active window expands back to
# its full name. Other windows also re-compute their truncation caps since
# the freed space is redistributed by the water-fill.
#
# tmux caches #() output, so toggling automatic-rename alone may return
# stale cached results. Instead, directly compute each window's name via
# pane-name.sh and set it with rename-window — bypassing the cache entirely.
# Then, after the #() cache has expired (~1s), re-enable automatic-rename
# so non-focus events (pane title changes) still trigger dynamic renaming.
#
# A trailing-edge debounce collapses bursts of focus events (e.g. rapid
# window switching) into a single refresh.

stamp=/tmp/tmux-focus-refresh.stamp
quiet=0.15     # debounce: wait for focus events to stop before refreshing
cache_wait=1.3 # must exceed tmux's ~1s #() cache so phase2 gets fresh output

mine="$$.$(date +%s%N 2>/dev/null)"
echo "$mine" > "$stamp"
sleep "$quiet"
[ "$(cat "$stamp" 2>/dev/null)" = "$mine" ] || exit 0

# phase1: directly set each window's name, bypassing the #() cache.
for w in $(tmux list-windows -a -F '#{window_id}' 2>/dev/null); do
  name=$(~/.config/tmux/pane-name.sh "$w" 2>/dev/null)
  [ -n "$name" ] && tmux rename-window -t "$w" "$name" 2>/dev/null
done

# phase2: after the #() cache expires, re-enable automatic-rename so future
# non-focus events (pane title changes) trigger dynamic renaming.
sleep "$cache_wait"
for w in $(tmux list-windows -a -F '#{window_id}' 2>/dev/null); do
  tmux set -w -t "$w" automatic-rename on 2>/dev/null
done
