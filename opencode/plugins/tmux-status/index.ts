/**
 * Server half of the tmux-status plugin. It intentionally does nothing.
 *
 * A directory under plugins/ is only discovered when it has an index.ts; a
 * lone tui.ts is never loaded (verified against beta-18743), and the pane
 * status is terminal-local so it belongs entirely in tui.ts.
 */
export default {
  id: "local.tmux-status",
  setup: async () => {},
}
