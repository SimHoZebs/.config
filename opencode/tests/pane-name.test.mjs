import assert from "node:assert/strict"
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { spawnSync } from "node:child_process"
import test, { afterEach } from "node:test"

const paneName = resolve(new URL("../../tmux/pane-name.sh", import.meta.url).pathname)
const separator = "\x1f"
const temporaryRoots = []

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { force: true, recursive: true })
})

function render(rows) {
  const directory = mkdtempSync(join(tmpdir(), "pane-name-"))
  temporaryRoots.push(directory)
  const tmux = join(directory, "tmux")
  writeFileSync(tmux, `#!/usr/bin/env node
const args = process.argv.slice(2)
if (args[0] === "show") process.stdout.write("left\\n")
else if (args[0] === "display-message" && args.at(-1) === "#{session_id}") process.stdout.write("$1\\n")
else if (args[0] === "display-message" && args.at(-1) === "#{pane_current_path}") process.stdout.write("/repo\\n")
else if (args[0] === "list-panes") process.stdout.write(process.env.FAKE_PANES || "")
`)
  chmodSync(tmux, 0o755)
  const result = spawnSync("bash", [paneName, "@1"], {
    env: { ...process.env, PATH: `${directory}:${process.env.PATH}`, FAKE_PANES: rows },
    encoding: "utf8",
  })
  assert.equal(result.status, 0, result.stderr)
  return result.stdout.trim()
}

function row(command, status, title, window = "@1") {
  return [window, command, status, "/repo", title].join(separator) + "\n"
}

test("renders every OpenCode state", () => {
  assert.equal(render(row("opencode", "working", "OC | Fix cache")), "🔄 oc: Fix cache")
  assert.equal(render(row("opencode", "waiting", "OC | Fix cache")), "🔔 oc: Fix cache")
  assert.equal(render(row("opencode", "done", "OC | Fix cache")), "✅ oc: Fix cache")
  assert.equal(render(row("opencode", "", "OC | Fix cache")), "oc: Fix cache")
})

test("preserves Claude, ordinary, and multipane naming", () => {
  assert.equal(render(row("claude", "", "✳ Task title")), "✅ Task title")
  assert.equal(render(row("zsh", "", "ignored")), "zsh")
  assert.equal(
    render(row("opencode", "working", "OC | Task") + row("zsh", "", "ignored")),
    "🔄 oc: Task | zsh",
  )
})
