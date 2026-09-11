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
  for (const [name, model, steps] of [
    ["plan-reviewer", "opencode/muse-spark-1.3-contributor-free", "28"],
    ["code-change-reviewer", "opencode/muse-spark-1.3-contributor-free", "40"],
    ["understanding-reviewer", "opencode/x-preview-f-free", "32"],
  ]) {
    const source = agent(name)
    assert.equal(field(source, "model"), model, name)
    assert.equal(field(source, "mode"), "subagent", name)
    assert.equal(field(source, "steps"), steps, name)
  }
})

test("wires the understanding reviewer into architect without narrowing global task access", () => {
  assert.match(agent("architect"), /^    understanding-reviewer: allow$/m)
  const config = JSON.parse(readFileSync(new URL("../opencode.json", import.meta.url), "utf8"))
  assert.deepEqual(config.permission.task, { "*": "allow" })
  assert.equal(config.small_model, "opencode/muse-spark-1.3-contributor-free")
})

test("runs the web-maintainer command through its dedicated read-only agent", () => {
  const source = agent("web-maintainer")
  const command = readFileSync(new URL("../commands/web-maintainer.md", import.meta.url), "utf8")

  assert.equal(field(source, "mode"), "subagent")
  assert.match(source, /^  edit: deny$/m)
  assert.match(source, /^  task:\n    "\*": deny\n    explore: allow$/m)
  assert.doesNotMatch(source, /^  task:\n    "\*": allow$/m)
  assert.match(source, /^## Pass 15: Bundle & Build Output$/m)
  assert.match(source, /^## Visual Primitive And Layout Ownership$/m)
  assert.match(command, /^agent: web-maintainer$/m)
  assert.doesNotMatch(command, /^# Mission$/m)
})
