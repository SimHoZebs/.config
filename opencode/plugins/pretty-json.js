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

export default async function PrettyJson() {
  return {
    "tool.execute.after": async (_input, output) => {
      try {
        if (Array.isArray(output.content)) {
          for (const item of output.content) {
            if (
              item?.type !== "text" ||
              typeof item.text !== "string" ||
              encodedLength(item.text, "utf8") < MIN_BYTES
            ) continue
            const formatted = reflowContent(item.text, "utf8")
            if (formatted) item.text = formatted
          }
        }

        const paths = new Set()
        if (typeof output.metadata?.outputPath === "string") {
          paths.add(output.metadata.outputPath)
        } else if (typeof output.output === "string") {
          const match = /Full output saved to:\s*(\S+)/.exec(output.output)
          if (match) paths.add(match[1].replace(/[.,;:)\]]+$/, ""))
        }
        for (const path of paths) rewriteSpill(path)

        if (typeof output.output === "string" && encodedLength(output.output, "utf8") >= MIN_BYTES) {
          const newline = output.output.indexOf("\n")
          if (newline === -1 || newline === output.output.length - 1) {
            const formatted = reflow(output.output, "utf8")
            if (formatted) output.output = formatted
          }
        }
      } catch {
        // Formatting must not replace a successful tool result with an error.
      }
    },
  }
}

function spillRoot() {
  const dataHome = process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share")
  return resolve(join(dataHome, "opencode", "tool-output"))
}

function rewriteSpill(path) {
  const root = spillRoot()
  const absolute = resolve(path)
  if (!basename(absolute).startsWith("tool_")) return
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
