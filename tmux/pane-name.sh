#!/bin/bash

# Builds a tmux window name from its panes' titles, width-aware so the status
# line fills — but never overflows — the client. Invoked from
# automatic-rename-format with the window id as $1.
#
# tmux calls this once per window. To allocate space globally (so a window with
# short names doesn't hoard width a long-named window needs), every invocation
# looks at ALL windows in the session, water-fills the total usable width across
# every pane by need, and then prints only the slice for $1. All invocations see
# the same state, so they agree on the split.

MIN_SEG=6     # never truncate a single pane's name below this many chars
MARGIN=4      # slack for tmux's own padding/separators
DECOR=5       # per-window decoration catppuccin adds (index + separators + spaces)
JOIN=3        # width of the " | " separator between two panes in one window
FALLBACK=40   # per-pane budget when the screen can't be measured

# Strip a leading status glyph (Claude Code prefixes its OSC title with
# "✳ " when idle or a braille spinner when working) and trailing space.
clean_title() {
  printf '%s' "$1" | sed -E 's/^[^[:alnum:][:space:]]+[[:space:]]+//; s/[[:space:]]+$//'
}

resolve_name() {
  local cmd="$1" title="$2" clean
  clean=$(clean_title "$title")
  # A Claude pane runs `claude` directly, or had a glyph stripped above.
  if [ "$cmd" = "claude" ] || [ "$clean" != "$title" ]; then
    [ -n "$clean" ] && echo "$clean" || echo "claude"
    return
  fi
  echo "$cmd"
}

# truncate <string> <max-chars> -> string, with a trailing … if cut.
truncate() {
  local s="$1" max="$2"
  [ "$max" -lt 1 ] && max=1
  if [ "${#s}" -le "$max" ]; then printf '%s' "$s"; else printf '%s…' "${s:0:max-1}"; fi
}

# Strip #[...] style directives AND raw terminal escapes to measure visible width.
visible_len() {
  local v
  v=$(printf '%s' "$1" | sed -E 's/#\[[^]]*\]//g; s/\x1b\[[0-9;]*m//g')
  echo "${#v}"
}

# Rendered visible width of status-left/right. tmux's #{E:...} does NOT execute
# #(shell) substitutions, so gitmux in status-left would measure as 0. Run the
# command ourselves. gitmux follows the SESSION-active pane (the path the bar
# renders), so $2 must be that path.
side_width() {
  local raw rendered
  raw=$(tmux show -gv "$1" 2>/dev/null)
  case "$raw" in
    *'#(gitmux'*) rendered=$(gitmux -cfg "$HOME/.config/gitmux.conf" "$2" 2>/dev/null) ;;
    *)            rendered=$(tmux display-message -p -t "$3" "#{E:$1}" 2>/dev/null) ;;
  esac
  visible_len "$rendered"
}

# water_fill <pool> <need0> <need1> ... -> populates global CAPS[].
# Hands each item up to its need; leftover from satisfied items is shared among
# those still wanting more, so space is allocated by need with nothing wasted.
water_fill() {
  local pool="$1"; shift
  local needs=("$@") n=${#needs[@]} i
  CAPS=(); for ((i=0; i<n; i++)); do CAPS[i]=0; done
  local remaining=$pool active=0
  for ((i=0; i<n; i++)); do [ "${needs[i]}" -gt 0 ] && active=$(( active + 1 )); done
  while [ "$remaining" -gt 0 ] && [ "$active" -gt 0 ]; do
    local share=$(( remaining / active )); [ "$share" -lt 1 ] && share=1
    local progressed=0
    for ((i=0; i<n; i++)); do
      local need=$(( ${needs[i]} - ${CAPS[i]} ))
      [ "$need" -le 0 ] && continue
      local grant=$share
      [ "$grant" -gt "$need" ] && grant=$need
      [ "$grant" -gt "$remaining" ] && grant=$remaining
      CAPS[i]=$(( ${CAPS[i]} + grant )); remaining=$(( remaining - grant )); progressed=1
      [ "$remaining" -le 0 ] && break
    done
    active=0
    for ((i=0; i<n; i++)); do [ "${CAPS[i]}" -lt "${needs[i]}" ] && active=$(( active + 1 )); done
    [ "$progressed" -eq 0 ] && break
  done
}

window_id="$1"
sep=$'\x1f'

justify=$(tmux show -gv status-justify 2>/dev/null)
cw=$(tmux display-message -p -t "$window_id" '#{client_width}' 2>/dev/null)
sess=$(tmux display-message -p -t "$window_id" '#{session_id}' 2>/dev/null)
cpath=$(tmux display-message -p -t "$sess" '#{pane_current_path}' 2>/dev/null)

# 1. Gather every pane in the session (one call): window_id, command, title.
fwin=(); fname=()
while IFS="$sep" read -r wid cmd title; do
  [ -z "$wid" ] && continue
  fwin+=("$wid"); fname+=("$(resolve_name "$cmd" "$title")")
done < <(tmux list-panes -s -t "$sess" -F "#{window_id}${sep}#{pane_current_command}${sep}#{pane_title}" 2>/dev/null)

ntotal=${#fname[@]}
[ "$ntotal" -eq 0 ] && exit 0

# 2. Decide the per-pane character caps.
caps_ready=0
if [ -n "$cw" ] && [ "$cw" -gt 0 ] 2>/dev/null; then
  sl=$(side_width status-left  "$cpath" "$window_id")
  sr=$(side_width status-right "$cpath" "$window_id")

  # absolute-centre grows symmetrically from mid-screen → limit is cw-2*max.
  if [ "$justify" = "absolute-centre" ]; then
    [ "$sl" -ge "$sr" ] && side=$sl || side=$sr
    usable=$(( cw - 2 * side - MARGIN ))
  else
    usable=$(( cw - sl - sr - MARGIN ))
  fi

  # distinct windows = nwin; joins = one fewer than panes within each window.
  nwin=$(printf '%s\n' "${fwin[@]}" | sort -u | wc -l)
  joins=$(( ntotal - nwin )); [ "$joins" -lt 0 ] && joins=0
  name_pool=$(( usable - nwin * DECOR - joins * JOIN ))
  [ "$name_pool" -lt $(( ntotal * MIN_SEG )) ] && name_pool=$(( ntotal * MIN_SEG ))

  lens=(); for nm in "${fname[@]}"; do lens+=("${#nm}"); done
  water_fill "$name_pool" "${lens[@]}"
  caps_ready=1
fi

# 3. Emit only the target window's panes, joined, each truncated to its cap.
result=""
for ((i=0; i<ntotal; i++)); do
  [ "${fwin[i]}" = "$window_id" ] || continue
  if [ "$caps_ready" -eq 1 ]; then
    cap=${CAPS[i]}; [ "$cap" -lt "$MIN_SEG" ] && cap=$MIN_SEG
  else
    cap=$FALLBACK
  fi
  piece=$(truncate "${fname[i]}" "$cap")
  if [ -z "$result" ]; then result="$piece"; else result="$result | $piece"; fi
done

echo "$result"
