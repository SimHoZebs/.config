import assert from "node:assert/strict"
import {
  chmodSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test, { afterEach } from "node:test"
import PrettyJson from "../plugins/pretty-json.js"

const temporaryRoots = []
afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { force: true, recursive: true })
})

function setup() {
  const root = mkdtempSync(join(tmpdir(), "pretty-json-"))
  temporaryRoots.push(root)
  const spill = join(root, "opencode", "tool-output")
  const shell = join(root, "opencode", "shell")
  mkdirSync(spill, { recursive: true })
  mkdirSync(shell, { recursive: true })
  process.env.XDG_DATA_HOME = root
  return { root, spill, shell }
}

async function afterHook() {
  let hook
  await PrettyJson.setup({
    tool: {
      hook: async (name, callback) => {
        assert.equal(name, "execute.after")
        hook = callback
      },
    },
  })
  return async (result, status = "completed") => {
    const event = { status, result }
    await hook(event)
    return event.result
  }
}

function text(value) {
  return [{ type: "text", text: value }]
}

function largeJson(token = "123456789012345678901234567890") {
  return `{"id":${token},"items":[${Array.from({ length: 120 }, (_, index) => `{"index":${index},"value":"${"x".repeat(20)}"}`).join(",")}]}`
}

test("atomically reflows a managed tool or shell spill without changing numeric text", async () => {
  const { spill, shell } = setup()
  const after = await afterHook()
  for (const path of [join(spill, "tool_large"), join(shell, "sh_large")]) {
    const source = largeJson()
    writeFileSync(path, source, { mode: 0o600 })
    await after({ content: text("preview"), metadata: { outputPath: path } })
    const result = readFileSync(path, "utf8")
    assert.match(result, /123456789012345678901234567890/)
    assert.equal(result.replace(/\s/g, ""), source)
    assert.ok(result.includes("\n"))
  }
})

test("supports managed notice discovery and rejects malformed or unmanaged notices", async () => {
  const { root, spill } = setup()
  const after = await afterHook()
  const managed = join(spill, "tool_notice")
  writeFileSync(managed, largeJson())
  await after({ content: text(`Full output saved to: ${managed}`), metadata: {} })
  assert.ok(readFileSync(managed, "utf8").includes("\n"))

  const unmanaged = join(root, "tool_unmanaged")
  writeFileSync(unmanaged, largeJson())
  await after({ content: text(`Full output saved to: ${unmanaged}`), metadata: {} })
  assert.equal(readFileSync(unmanaged, "utf8"), largeJson())

  const misplaced = join(spill, "sh_misplaced")
  writeFileSync(misplaced, largeJson())
  await after({ content: text("preview"), metadata: { outputPath: misplaced } })
  assert.equal(readFileSync(misplaced, "utf8"), largeJson())
  await assert.doesNotReject(() => after({ content: text("Full output saved to:"), metadata: {} }))
})

test("rejects unsafe file types, link aliases, bounds, and invalid JSON", async () => {
  const { root, spill } = setup()
  const after = await afterHook()
  const outside = join(root, "outside")
  writeFileSync(outside, largeJson())

  const symlink = join(spill, "tool_symlink")
  symlinkSync(outside, symlink)
  const hardlink = join(spill, "tool_hardlink")
  linkSync(outside, hardlink)
  const directory = join(spill, "tool_directory")
  mkdirSync(directory)
  const small = join(spill, "tool_small")
  writeFileSync(small, "{\"ok\":true}")
  const invalid = join(spill, "tool_invalid")
  writeFileSync(invalid, "{" + "x".repeat(2500))
  const large = join(spill, "tool_too_large")
  writeFileSync(large, `{"value":"${"x".repeat(5_000_001)}"}`)

  for (const path of [symlink, hardlink, directory, small, invalid, large]) {
    await assert.doesNotReject(() => after({ content: text("preview"), metadata: { outputPath: path } }))
  }
  assert.equal(readFileSync(outside, "utf8"), largeJson())
  assert.equal(readFileSync(small, "utf8"), "{\"ok\":true}")
  assert.equal(readFileSync(invalid, "utf8"), "{" + "x".repeat(2500))
  chmodSync(large, 0o600)
  assert.equal(readFileSync(large, "utf8").includes("\n"), false)
})

test("reflows single-line JSON content and output and leaves failures untouched", async () => {
  setup()
  const after = await afterHook()
  const source = largeJson()
  const result = await after({ content: text(source), output: { output: source }, metadata: {} })
  assert.ok(result.content[0].text.includes("\n"))
  assert.equal(result.content[0].text.replace(/\s/g, ""), source)
  assert.equal(result.output.output, result.content[0].text)

  const failed = { content: text(source) }
  assert.equal(await after(failed, "error"), failed)
  await assert.doesNotReject(() => after({ content: text("ok"), metadata: { outputPath: "/missing/tool_x" } }))
})

test("leaves multi-line output such as JSON Lines unchanged", async () => {
  setup()
  const after = await afterHook()
  const lines = `${largeJson()}\n${largeJson()}`
  const result = await after({ content: text(lines), metadata: {} })
  assert.equal(result.content[0].text, lines)
})

test("rejects excessive nesting and expansion beyond the byte bound", async () => {
  setup()
  const after = await afterHook()
  const nested = "[".repeat(1000) + "0" + "]".repeat(1000)
  assert.equal((await after({ content: text(nested) })).content[0].text, nested)

  const multibyte = `{"value":"${"é".repeat(2_550_001)}"}`
  assert.equal((await after({ content: text(multibyte) })).content[0].text, multibyte)
})

test("uses encoded bytes for the minimum inline threshold", async () => {
  setup()
  const after = await afterHook()
  const source = `{"value":"${"é".repeat(1000)}"}`
  assert.ok(source.length < 2_000)
  assert.ok(Buffer.byteLength(source, "utf8") >= 2_000)
  assert.ok((await after({ content: text(source) })).content[0].text.includes("\n"))
})
