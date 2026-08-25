import assert from "node:assert/strict"
import test from "node:test"
import TmuxStatus from "../plugins/tmux-status.js"

test("public plugin wrapper tracks concurrent sessions and prompts", async () => {
  const states = []
  const hooks = await TmuxStatus({}, {
    env: { TMUX: "socket", TMUX_PANE: "%1" },
    report: async (state) => states.push(state),
  })

  await hooks["chat.message"]({ sessionID: "root" })
  await hooks["chat.message"]({ sessionID: "child" })
  await hooks.event({ event: { type: "session.idle", properties: { sessionID: "child" } } })
  await hooks.event({ event: { type: "question.asked", properties: { sessionID: "root", id: "q1" } } })
  await hooks["chat.message"]({ sessionID: "child" })
  await hooks.event({ event: { type: "permission.asked", properties: { sessionID: "child", id: "p1" } } })
  await hooks.event({ event: { type: "question.replied", properties: { sessionID: "root", requestID: "q1" } } })
  await hooks.event({ event: { type: "permission.replied", properties: { sessionID: "child", requestID: "p1" } } })
  await hooks.event({ event: { type: "session.idle", properties: { sessionID: "child" } } })
  await hooks.event({ event: { type: "session.idle", properties: { sessionID: "root" } } })
  await hooks.event({ event: { type: "session.compacted", properties: { sessionID: "root" } } })
  await hooks.event({ event: { type: "session.deleted", properties: { info: { id: "root" } } } })

  assert.deepEqual(states, ["working", "waiting", "working", "done", "working", "done"])
})

test("returns no hooks outside tmux", async () => {
  assert.deepEqual(await TmuxStatus({}, { env: {} }), {})
})
