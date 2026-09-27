import {
  closeSync,
  constants,
  existsSync,
  fchmodSync,
  fsyncSync,
  fstatSync,
  lstatSync,
  openSync,
  readSync,
  realpathSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs"
import { homedir } from "node:os"
import { basename, dirname, join, resolve } from "node:path"

const MIN_BYTES = 2_000
const MAX_BYTES = 5_000_000
const MAX_DEPTH = 128

async function installPlugin(ctx) {
  await ctx.tool.hook("execute.after", async (event) => {
    try {
      if (event.status !== "completed" || !event.result) return
      event.result = processToolResult(event.result)
    } catch {
      // Formatting must not replace a successful tool result with an error.
    }
  })
}

export function processToolResult(result) {
  const paths = new Set()
  if (typeof result.metadata?.outputPath === "string") {
    paths.add(result.metadata.outputPath)
  } else {
    const match = /Full output saved to:\s*(\S+)/.exec(toolResultTexts(result).join("\n"))
    if (match) paths.add(match[1].replace(/[.,;:)\]]+$/, ""))
  }
  for (const path of paths) rewriteSpill(path)

  const next = { ...result }
  if (typeof result.output === "string") {
    next.output = reflowInline(result.output) ?? result.output
  } else if (typeof result.output?.output === "string") {
    const formatted = reflowInline(result.output.output)
    if (formatted) next.output = { ...result.output, output: formatted }
  }
  if (Array.isArray(result.content)) {
    next.content = result.content.map((item) => {
      if (item?.type !== "text" || typeof item.text !== "string") return item
      const formatted = reflowInline(item.text)
      return formatted ? { ...item, text: formatted } : item
    })
  }
  return next
}

function toolResultTexts(result) {
  const texts = []
  if (typeof result.output === "string") texts.push(result.output)
  if (typeof result.output?.output === "string") texts.push(result.output.output)
  if (Array.isArray(result.content)) {
    for (const item of result.content) if (item?.type === "text" && typeof item.text === "string") texts.push(item.text)
  }
  return texts
}

function reflowInline(source) {
  if (encodedLength(source, "utf8") < MIN_BYTES) return null
  const newline = source.indexOf("\n")
  if (newline !== -1 && newline !== source.length - 1) return null
  return reflow(source, "utf8")
}

function spillRoot(path) {
  const dataHome = process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share")
  const name = basename(path)
  if (name.startsWith("tool_")) return resolve(join(dataHome, "opencode", "tool-output"))
  if (name.startsWith("sh_")) return resolve(join(dataHome, "opencode", "shell"))
  return null
}

function rewriteSpill(path) {
  const absolute = resolve(path)
  const root = spillRoot(absolute)
  if (!root) return
  if (!absolute.startsWith(root + "/") || !existsSync(root) || !existsSync(absolute)) return

  const rootReal = realpathSync(root)
  const initialPath = lstatSync(absolute)
  if (!initialPath.isFile() || initialPath.isSymbolicLink() || initialPath.nlink !== 1) return
  const targetReal = realpathSync(absolute)
  if (!targetReal.startsWith(rootReal + "/")) return

  let sourceFd
  let tempFd
  let tempPath
  try {
    sourceFd = openSync(absolute, constants.O_RDONLY | noFollowFlag())
    const sourceInfo = fstatSync(sourceFd)
    if (!sourceInfo.isFile() || sourceInfo.nlink !== 1) return
    if (sourceInfo.size < MIN_BYTES || sourceInfo.size > MAX_BYTES) return

    const source = readDescriptor(sourceFd, sourceInfo.size)
    const formatted = reflowContent(source, "latin1")
    if (!formatted || maxLineLength(formatted) >= maxLineLength(source)) return

    tempPath = join(dirname(absolute), `.${basename(absolute)}.pretty-json-${process.pid}-${randomToken()}`)
    tempFd = openSync(
      tempPath,
      constants.O_CREAT | constants.O_EXCL | constants.O_RDWR | noFollowFlag(),
      sourceInfo.mode & 0o777,
    )
    fchmodSync(tempFd, sourceInfo.mode & 0o777)
    const bytes = Buffer.from(formatted, "latin1")
    writeFileSync(tempFd, bytes)
    fsyncSync(tempFd)
    const verified = Buffer.alloc(bytes.length)
    if (readSync(tempFd, verified, 0, bytes.length, 0) !== bytes.length || !verified.equals(bytes)) return

    const currentPath = lstatSync(absolute)
    if (
      !currentPath.isFile() ||
      currentPath.isSymbolicLink() ||
      currentPath.nlink !== 1 ||
      currentPath.dev !== sourceInfo.dev ||
      currentPath.ino !== sourceInfo.ino ||
      !realpathSync(absolute).startsWith(rootReal + "/")
    ) return

    closeSync(tempFd)
    tempFd = undefined
    renameSync(tempPath, absolute)
    tempPath = undefined
    const directoryFd = openSync(dirname(absolute), constants.O_RDONLY)
    try {
      fsyncSync(directoryFd)
    } finally {
      closeSync(directoryFd)
    }
  } finally {
    if (tempFd !== undefined) closeSync(tempFd)
    if (sourceFd !== undefined) closeSync(sourceFd)
    if (tempPath && existsSync(tempPath)) unlinkSync(tempPath)
  }
}

function noFollowFlag() {
  return constants.O_NOFOLLOW ?? 0
}

function readDescriptor(fd, size) {
  const buffer = Buffer.alloc(size)
  let offset = 0
  while (offset < size) {
    const count = readSync(fd, buffer, offset, size - offset, offset)
    if (!count) break
    offset += count
  }
  return buffer.subarray(0, offset).toString("latin1")
}

function randomToken() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function reflowContent(raw, encoding) {
  if (encodedLength(raw, encoding) > MAX_BYTES) return null
  const whole = reflow(raw, encoding)
  if (whole) return whole
  const lines = raw.split("\n")
  let changed = false
  let length = 0
  const rebuilt = []
  for (const line of lines) {
    const formatted = reflow(line, encoding)
    if (formatted) changed = true
    const next = formatted ?? line
    length += encodedLength(next, encoding) + (rebuilt.length ? 1 : 0)
    if (length > MAX_BYTES) return null
    rebuilt.push(next)
  }
  return changed ? rebuilt.join("\n") : null
}

function reflow(source, encoding) {
  const trimmed = source.trim()
  if (!trimmed || (trimmed[0] !== "{" && trimmed[0] !== "[")) return null
  if (encodedLength(trimmed, encoding) > MAX_BYTES || nestingDepth(trimmed) > MAX_DEPTH) return null
  try {
    JSON.parse(trimmed)
  } catch {
    return null
  }

  let output = ""
  let depth = 0
  let inString = false
  let escaped = false
  let outputBytes = 0
  const pad = (amount) => "\n" + "  ".repeat(amount)
  const append = (value, bytes = value.length) => {
    if (outputBytes + bytes > MAX_BYTES) return false
    output += value
    outputBytes += bytes
    return true
  }

  for (let index = 0; index < trimmed.length; index++) {
    let character = trimmed[index]
    let characterBytes = 1
    if (encoding === "utf8") {
      const codePoint = trimmed.codePointAt(index)
      characterBytes = utf8CodePointLength(codePoint)
      if (codePoint > 0xffff) {
        character = trimmed.slice(index, index + 2)
        index++
      }
    }
    if (inString) {
      if (!append(character, characterBytes)) return null
      if (escaped) escaped = false
      else if (character === "\\") escaped = true
      else if (character === '"') inString = false
      continue
    }
    if (character === '"') {
      inString = true
      if (!append(character, characterBytes)) return null
    } else if (character === "{" || character === "[") {
      if (nextNonWhitespace(trimmed, index + 1) === (character === "{" ? "}" : "]")) {
        if (!append(character + (character === "{" ? "}" : "]"))) return null
        index = trimmed.indexOf(character === "{" ? "}" : "]", index + 1)
      } else {
        if (++depth > MAX_DEPTH || !append(character + pad(depth))) return null
      }
    } else if (character === "}" || character === "]") {
      if (!append(pad(--depth) + character)) return null
    } else if (character === ",") {
      if (!append(character + pad(depth))) return null
    } else if (character === ":") {
      if (!append(": ")) return null
    } else if (!" \t\n\r".includes(character)) {
      if (!append(character, characterBytes)) return null
    }
  }
  return output
}

function encodedLength(value, encoding) {
  return encoding === "latin1" ? value.length : Buffer.byteLength(value, "utf8")
}

function utf8CodePointLength(codePoint) {
  if (codePoint <= 0x7f) return 1
  if (codePoint <= 0x7ff) return 2
  if (codePoint <= 0xffff) return 3
  return 4
}

function nestingDepth(value) {
  let depth = 0
  let maximum = 0
  let inString = false
  let escaped = false
  for (const character of value) {
    if (inString) {
      if (escaped) escaped = false
      else if (character === "\\") escaped = true
      else if (character === '"') inString = false
      continue
    }
    if (character === '"') inString = true
    else if (character === "{" || character === "[") maximum = Math.max(maximum, ++depth)
    else if (character === "}" || character === "]") depth--
    if (maximum > MAX_DEPTH) return maximum
  }
  return maximum
}

function nextNonWhitespace(value, offset) {
  for (let index = offset; index < value.length; index++) {
    if (!" \t\n\r".includes(value[index])) return value[index]
  }
  return ""
}

function maxLineLength(value) {
  return value.split("\n").reduce((maximum, line) => Math.max(maximum, line.length), 0)
}

export default {
  id: "local.pretty-json",
  setup: installPlugin,
}
