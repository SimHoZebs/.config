import assert from "node:assert/strict"
import test from "node:test"
import PrimaryReviewGates from "../plugins/primary-review-gates.js"

const primaries = ["build", "plan", "architect", "home-server-discord"]

test("injects gates into every primary using the resolved message agent", async () => {
  const hooks = await PrimaryReviewGates()
  for (const agent of primaries) {
    const output = { message: { agent, system: "existing" }, parts: [] }
    await hooks["chat.message"]({ sessionID: "session" }, output)
    assert.match(output.message.system, /^existing\n\n## Independent Review Gates/m)
  }
})

test("does not inject gates into subagents", async () => {
  const hooks = await PrimaryReviewGates()
  for (const agent of ["plan-reviewer", "code-change-reviewer", "understanding-reviewer", "explore"]) {
    const output = { message: { agent, system: "existing" }, parts: [] }
    await hooks["chat.message"]({ agent: "build" }, output)
    assert.equal(output.message.system, "existing")
  }
})

test("preserves existing system text and injects the marker once", async () => {
  const hooks = await PrimaryReviewGates()
  const output = { message: { agent: "build", system: "existing" }, parts: [] }
  await hooks["chat.message"]({}, output)
  await hooks["chat.message"]({}, output)
  assert.equal(output.message.system.match(/## Independent Review Gates/g)?.length, 1)
  assert.ok(output.message.system.startsWith("existing\n\n"))
})
