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
  mkdirSync(spill, { recursive: true })
  process.env.XDG_DATA_HOME = root
  return { root, spill }
}

function largeJson(token = "123456789012345678901234567890") {
  return `{"id":${token},"items":[${Array.from({ length: 120 }, (_, index) => `{"index":${index},"value":"${"x".repeat(20)}"}`).join(",")}]}`
}

test("public hook atomically reflows a managed spill without changing numeric text", async () => {
  const { spill } = setup()
  const path = join(spill, "tool_large")
  const source = largeJson()
  writeFileSync(path, source, { mode: 0o600 })
  const hooks = await PrettyJson()
  await hooks["tool.execute.after"]({}, { output: "preview", metadata: { outputPath: path } })
  const result = readFileSync(path, "utf8")
  assert.match(result, /123456789012345678901234567890/)
  assert.equal(result.replace(/\s/g, ""), source)
  assert.ok(result.includes("\n"))
})

test("supports managed notice discovery and rejects malformed or unmanaged notices", async () => {
  const { root, spill } = setup()
  const hooks = await PrettyJson()
  const managed = join(spill, "tool_notice")
  writeFileSync(managed, largeJson())
  await hooks["tool.execute.after"]({}, { output: `Full output saved to: ${managed}`, metadata: {} })
  assert.ok(readFileSync(managed, "utf8").includes("\n"))

  const unmanaged = join(root, "tool_unmanaged")
  writeFileSync(unmanaged, largeJson())
  await hooks["tool.execute.after"]({}, { output: `Full output saved to: ${unmanaged}`, metadata: {} })
  assert.equal(readFileSync(unmanaged, "utf8"), largeJson())
  await assert.doesNotReject(() => hooks["tool.execute.after"]({}, { output: "Full output saved to:", metadata: {} }))
})

test("rejects unsafe file types, link aliases, bounds, and invalid JSON", async () => {
  const { root, spill } = setup()
  const hooks = await PrettyJson()
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
    await assert.doesNotReject(() => hooks["tool.execute.after"]({}, { output: "preview", metadata: { outputPath: path } }))
  }
  assert.equal(readFileSync(outside, "utf8"), largeJson())
  assert.equal(readFileSync(small, "utf8"), "{\"ok\":true}")
  assert.equal(readFileSync(invalid, "utf8"), "{" + "x".repeat(2500))
  chmodSync(large, 0o600)
  assert.equal(readFileSync(large, "utf8").includes("\n"), false)
})

test("reflows an inline public tool output and fails open", async () => {
  setup()
  const hooks = await PrettyJson()
  const source = largeJson()
  const output = { output: source, metadata: {} }
  await hooks["tool.execute.after"]({}, output)
  assert.ok(output.output.includes("\n"))
  assert.equal(output.output.replace(/\s/g, ""), source)
  await assert.doesNotReject(() => hooks["tool.execute.after"]({}, { output: "ok", metadata: { outputPath: "/missing/tool_x" } }))
})

test("reflows pre-truncation MCP text content and rejects excessive expansion", async () => {
  setup()
  const hooks = await PrettyJson()
  const source = largeJson()
  const output = { content: [{ type: "text", text: source }], metadata: {} }
  await hooks["tool.execute.after"]({}, output)
  assert.ok(output.content[0].text.includes("\n"))
  assert.equal(output.content[0].text.replace(/\s/g, ""), source)

  const nested = "[".repeat(1000) + "0" + "]".repeat(1000)
  const bounded = { content: [{ type: "text", text: nested }], metadata: {} }
  await hooks["tool.execute.after"]({}, bounded)
  assert.equal(bounded.content[0].text, nested)

  const multibyte = `{"value":"${"é".repeat(2_550_001)}"}`
  const byteBounded = { content: [{ type: "text", text: multibyte }], metadata: {} }
  await hooks["tool.execute.after"]({}, byteBounded)
  assert.equal(Buffer.byteLength(byteBounded.content[0].text, "utf8"), Buffer.byteLength(multibyte, "utf8"))
  assert.equal(byteBounded.content[0].text, multibyte)
})

test("uses encoded bytes for the minimum inline and MCP thresholds", async () => {
  setup()
  const hooks = await PrettyJson()
  const source = `{"value":"${"é".repeat(1000)}"}`
  assert.ok(source.length < 2_000)
  assert.ok(Buffer.byteLength(source, "utf8") >= 2_000)

  const inline = { output: source, metadata: {} }
  await hooks["tool.execute.after"]({}, inline)
  assert.ok(inline.output.includes("\n"))

  const mcp = { content: [{ type: "text", text: source }], metadata: {} }
  await hooks["tool.execute.after"]({}, mcp)
  assert.ok(mcp.content[0].text.includes("\n"))
})
