import assert from "node:assert/strict"
import test from "node:test"
import { createTmuxStatusPlugin, deriveStatus } from "../plugins/tmux-status/tui.ts"

test("reports a prompt only when an open tab owns its root session", () => {
  const roots = { root: "root", child: "root", other: "other" }
  const root = (sessionID) => roots[sessionID] ?? sessionID
  assert.equal(deriveStatus([{ sessionID: "root", busy: true }], new Set(["child"]), root), "waiting")
  assert.equal(deriveStatus([{ sessionID: "root", busy: true }], new Set(["other"]), root), null)
  assert.equal(deriveStatus([], new Set(["root"])), null)
})

test("publishes waiting on a permission request and clears it when answered", () => {
  const published = []
  let listener
  const tabs = [{ sessionID: "root", busy: true }]
  const plugin = createTmuxStatusPlugin({
    env: { TMUX: "socket", TMUX_PANE: "%1" },
    publish: (status, pane) => published.push([status, pane]),
    setInterval: () => 1,
    clearInterval: () => {},
  })
  const stop = plugin.setup({
    ui: { tabs: { list: () => tabs } },
    data: {
      session: { root: (sessionID) => (sessionID === "child" ? "root" : sessionID) },
      listen: (callback) => {
        listener = callback
        return () => {}
      },
    },
  })

  listener({ details: { type: "permission.asked", data: { sessionID: "child" } } })
  listener({ details: { type: "permission.replied", data: { sessionID: "child" } } })
  stop()
  assert.deepEqual(published, [["clear", "%1"], ["waiting", "%1"], ["clear", "%1"]])
})

test("does nothing outside tmux", () => {
  const plugin = createTmuxStatusPlugin({
    env: {},
    publish: () => assert.fail("published outside tmux"),
    setInterval: () => assert.fail("started a sweep outside tmux"),
    clearInterval: () => {},
  })
  assert.equal(plugin.setup({}), undefined)
})
