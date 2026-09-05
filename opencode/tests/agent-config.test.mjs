import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

function agent(name) {
  return readFileSync(new URL(`../agents/${name}.md`, import.meta.url), "utf8")
}

function field(source, name) {
  return new RegExp(`^${name}: (.+)$`, "m").exec(source)?.[1]
}

test("preserves reviewer models, modes, and step budgets", () => {
  for (const [name, steps] of [
    ["plan-reviewer", "28"],
    ["code-change-reviewer", "40"],
    ["understanding-reviewer", "32"],
  ]) {
    const source = agent(name)
    assert.equal(field(source, "model"), "opencode/x-preview-f-free", name)
    assert.equal(field(source, "mode"), "subagent", name)
    assert.equal(field(source, "steps"), steps, name)
  }
})

test("wires the understanding reviewer into architect without narrowing global task access", () => {
  assert.match(agent("architect"), /^    understanding-reviewer: allow$/m)
  const config = JSON.parse(readFileSync(new URL("../opencode.json", import.meta.url), "utf8"))
  assert.deepEqual(config.permission.task, { "*": "allow" })
  assert.equal(config.small_model, "opencode/x-preview-f-free")
})
