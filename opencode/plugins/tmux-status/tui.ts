import { execFile } from "node:child_process"
import { homedir } from "node:os"
import { join } from "node:path"

const HOOK = join(homedir(), ".config", "tmux", "opencode-status-hook.sh")

// Covers state changes carried by events this plugin does not enumerate; only a
// changed state spawns tmux, so an unchanged tick costs one array scan.
const SWEEP_MS = 1_000

export type Tab = { sessionID?: string; busy?: boolean }

type TmuxStatusDependencies = {
  env: NodeJS.ProcessEnv
  publish: (status: "waiting" | "clear", pane: string) => void
  setInterval: typeof setInterval
  clearInterval: typeof clearInterval
}

/**
 * Only a blocked prompt is reported. One pane can hold several sessions, so a
 * working-or-done aggregate would say nothing about which tab it refers to,
 * whereas "this window needs input" stays actionable — OpenCode's own tab strip
 * identifies the tab once you are in the window.
 *
 * Waiting comes from outstanding permission requests rather than the per-tab
 * `attention` flag, because `attention` also fires when a turn merely finishes.
 * Compare claude-status-hook.sh, which narrows its own signal the same way.
 */
export function deriveStatus(
  tabs: readonly Tab[] | null | undefined,
  pending: ReadonlySet<string> | null | undefined,
  root: (sessionID: string) => string = (sessionID) => sessionID,
): "waiting" | null {
  if (!Array.isArray(tabs) || !pending?.size) return null
  const waiting = new Set([...pending].map(root))
  for (const tab of tabs) if (tab?.sessionID && waiting.has(root(tab.sessionID))) return "waiting"
  return null
}

export function createTmuxStatusPlugin(dependencies: TmuxStatusDependencies) {
  return {
    id: "local.tmux-status",
    setup: (context: any) => {
      const pane = dependencies.env.TMUX_PANE
      if (!dependencies.env.TMUX || !pane) return

      let published: "waiting" | "clear" | null = null
      const pending = new Set<string>()

      const publish = (status: "waiting" | "clear") => {
        if (status === published) return
        published = status
        dependencies.publish(status, pane)
      }

      const refresh = () => {
        const tabs = context.ui.tabs?.list?.() as Tab[] | undefined
        const root = (sessionID: string) => context.data.session.root?.(sessionID) ?? sessionID
        // An answered prompt need not emit a reply this plugin sees, so drop any
        // request whose session has stopped running.
        if (pending.size && Array.isArray(tabs)) {
          const busy = new Set(
            tabs
              .filter((tab) => tab?.busy === true && tab.sessionID)
              .map((tab) => root(tab.sessionID!)),
          )
          for (const id of pending) if (!busy.has(root(id))) pending.delete(id)
        }
        // Clearing rather than holding the last value matters on startup, where a
        // pane killed mid-prompt can still carry that prompt's stale status.
        publish(deriveStatus(tabs, pending, root) ?? "clear")
      }

      const sweep = dependencies.setInterval(refresh, SWEEP_MS)
      const stop = context.data.listen((event: any) => {
        const details = event?.details ?? event
        const type = details?.type
        if (typeof type !== "string") return
        const sessionID = details?.data?.sessionID
        if (type === "permission.asked" && sessionID) pending.add(sessionID)
        else if (/^permission\.(replied|rejected)$/.test(type) && sessionID) pending.delete(sessionID)
        else if (!/^(session\.execution|session\.form)\./.test(type)) return
        refresh()
      })

      refresh()

      return () => {
        dependencies.clearInterval(sweep)
        stop?.()
        publish("clear")
      }
    },
  }
}

export default createTmuxStatusPlugin({
  env: process.env,
  publish: (status, pane) => execFile(HOOK, [status, pane], () => {}),
  setInterval,
  clearInterval,
})
