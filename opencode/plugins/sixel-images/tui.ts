import { execFileSync } from "node:child_process"
import { ImageRenderable } from "@opentui/core"

/**
 * OpenCode creates transcript and prompt image renderables with
 * `protocol: "auto"`. OpenTUI's auto policy always returns `blocks` inside
 * tmux, and OpenTUI 0.8.2 ignores `OPENTUI_IMAGE_PROTOCOL` when resolving the
 * native draw protocol. The image output therefore stays Unicode blocks even
 * though the terminal advertises sixel.
 *
 * Force sixel in the native draw call. Do this only when the user asked for
 * sixel, the TUI runs inside tmux, and the attached tmux client advertises
 * sixel. The public `protocol` getter still reports `auto`; that value does not
 * control the native draw.
 */

function clientSupportsSixel(): boolean {
  try {
    const features = execFileSync(
      "tmux",
      ["display-message", "-p", "#{client_termfeatures}"],
      { encoding: "utf8", timeout: 1_000 },
    )
    return features.split(",").includes("sixel")
  } catch {
    return false
  }
}

export default {
  id: "local.sixel-images",
  setup: () => {
    if (!process.env.TMUX) return
    if (process.env.OPENTUI_IMAGE_PROTOCOL?.toLowerCase() !== "sixel") return
    if (!clientSupportsSixel()) return

    const prototype = ImageRenderable.prototype as unknown as {
      __sixelImagesPatched?: true
      renderSelf: (this: { _protocol: string }, buffer: unknown) => void
    }
    if (prototype.__sixelImagesPatched) return
    if (typeof prototype.renderSelf !== "function") return

    const renderSelf = prototype.renderSelf
    prototype.renderSelf = function (buffer) {
      const requested = this._protocol
      if (requested !== "auto") {
        renderSelf.call(this, buffer)
        return
      }
      this._protocol = "sixel"
      try {
        renderSelf.call(this, buffer)
      } finally {
        this._protocol = requested
      }
    }
    prototype.__sixelImagesPatched = true
  },
}
