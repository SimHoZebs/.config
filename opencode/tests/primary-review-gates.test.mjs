import assert from "node:assert/strict"
import test from "node:test"
import PrimaryReviewGates, { PRIMARY_REVIEW_POLICY } from "../plugins/primary-review-gates.js"

async function contextHook() {
  let hook
  await PrimaryReviewGates.setup({
    session: {
      hook: async (name, callback) => {
        assert.equal(name, "context")
        hook = callback
      },
    },
  })
  return hook
}

test("appends the review policy to every primary agent's model context", async () => {
  const hook = await contextHook()
  for (const agent of ["build", "plan", "architect", "home-server-discord"]) {
    const event = { agent, system: [{ type: "text", text: "existing" }] }
    await hook(event)
    assert.deepEqual(event.system, [
      { type: "text", text: "existing" },
      { type: "text", text: PRIMARY_REVIEW_POLICY },
    ])
  }
})

test("leaves subagent context unchanged", async () => {
  const hook = await contextHook()
  for (const agent of ["plan-reviewer", "code-change-reviewer", "understanding-reviewer", "explore"]) {
    const event = { agent, system: [{ type: "text", text: "existing" }] }
    await hook(event)
    assert.deepEqual(event.system, [{ type: "text", text: "existing" }])
  }
})
