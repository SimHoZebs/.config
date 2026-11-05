/**
 * Server half of the sixel-images plugin. It intentionally does nothing.
 *
 * A directory under plugins/ is only discovered when it has an index.ts. The
 * image protocol is TUI-local, so the behavior belongs entirely in tui.ts.
 */
export default {
  id: "local.sixel-images",
  setup: async () => {},
}
