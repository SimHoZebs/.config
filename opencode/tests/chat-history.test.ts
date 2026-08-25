import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { Database } from "bun:sqlite"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  ChatHistory,
  formatSearchResults,
  formatTranscript,
} from "../lib/history-store"

let directory: string
let path: string

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "opencode-chat-history-"))
  path = join(directory, "opencode.db")
  const database = new Database(path)
  database.run(`CREATE TABLE session (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL, parent_id TEXT, slug TEXT NOT NULL,
    directory TEXT NOT NULL, title TEXT NOT NULL, version TEXT NOT NULL,
    time_created INTEGER NOT NULL, time_updated INTEGER NOT NULL, time_archived INTEGER
  )`)
  database.run(`CREATE TABLE message (
    id TEXT PRIMARY KEY, session_id TEXT NOT NULL, time_created INTEGER NOT NULL,
    time_updated INTEGER NOT NULL, data TEXT NOT NULL
  )`)
  database.run(`CREATE TABLE part (
    id TEXT PRIMARY KEY, message_id TEXT NOT NULL, session_id TEXT NOT NULL,
    time_created INTEGER NOT NULL, time_updated INTEGER NOT NULL, data TEXT NOT NULL
  )`)

  database.run(
    "INSERT INTO session VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ["ses_current", "project", null, "current", "/repo", "Authentication decision", "1", 1000, 4000, null],
  )
  database.run(
    "INSERT INTO session VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ["ses_other", "project", null, "other", "/other", "Unrelated work", "1", 1000, 2000, null],
  )
  database.run(
    "INSERT INTO message VALUES (?, ?, ?, ?, ?)",
    ["msg_user", "ses_current", 1100, 1100, JSON.stringify({ role: "user" })],
  )
  database.run(
    "INSERT INTO message VALUES (?, ?, ?, ?, ?)",
    ["msg_assistant", "ses_current", 1200, 1200, JSON.stringify({ role: "assistant" })],
  )
  database.run(
    "INSERT INTO part VALUES (?, ?, ?, ?, ?, ?)",
    ["prt_user", "msg_user", "ses_current", 1100, 1100, JSON.stringify({ type: "text", text: "Use signed cookies for authentication" })],
  )
  database.run(
    "INSERT INTO part VALUES (?, ?, ?, ?, ?, ?)",
    ["prt_assistant", "msg_assistant", "ses_current", 1200, 1200, JSON.stringify({ type: "text", text: "The decision is to use signed cookies." })],
  )
  database.run(
    "INSERT INTO part VALUES (?, ?, ?, ?, ?, ?)",
    ["prt_tool", "msg_assistant", "ses_current", 1300, 1300, JSON.stringify({ type: "tool", tool: "bash", state: { status: "completed", input: { command: "secret command" }, output: `tool output${"x".repeat(10_000)}` } })],
  )
  database.run(
    "INSERT INTO part VALUES (?, ?, ?, ?, ?, ?)",
    ["prt_reasoning", "msg_assistant", "ses_current", 1250, 1250, JSON.stringify({ type: "reasoning", text: "private chain of thought" })],
  )
  database.run(
    "INSERT INTO message VALUES (?, ?, ?, ?, ?)",
    ["msg_reasoning_only", "ses_current", 1400, 1400, JSON.stringify({ role: "assistant" })],
  )
  database.run(
    "INSERT INTO part VALUES (?, ?, ?, ?, ?, ?)",
    ["prt_reasoning_only", "msg_reasoning_only", "ses_current", 1400, 1400, JSON.stringify({ type: "reasoning", text: "newest private thought" })],
  )
  database.close()
})

afterEach(() => rmSync(directory, { recursive: true, force: true }))

describe("ChatHistory", () => {
  test("lists and filters sessions", () => {
    const history = new ChatHistory(path)
    expect(history.listSessions({ directory: "/repo" })).toEqual([
      expect.objectContaining({ id: "ses_current", title: "Authentication decision" }),
    ])
    history.close()
  })

  test("searches text by role without exposing tool data by default", () => {
    const history = new ChatHistory(path)
    const matches = history.search({ query: "signed cookies", role: "assistant" })
    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({ id: "ses_current", role: "assistant", matchType: "text" })
    expect(formatSearchResults(matches)).toContain("decision is to use signed cookies")
    expect(history.search({ query: "secret command" })).toEqual([])
    expect(history.search({ query: "secret command", includeTools: true })[0].matchType).toBe("tool")
    expect(history.search({ query: "signed cookies", projectID: "other-project" })).toEqual([])
    expect(history.search({ query: "signed cookies", since: 1150 })).toEqual([
      expect.objectContaining({ role: "assistant" }),
    ])
    history.close()
  })

  test("retrieves bounded transcripts and omits reasoning and tools by default", () => {
    const history = new ChatHistory(path)
    const transcript = history.getTranscript({ sessionID: "ses_current", limit: 1 })
    expect(transcript).not.toBeNull()
    const formatted = formatTranscript(transcript!)
    expect(formatted).toContain("decision is to use signed cookies")
    expect(formatted).not.toContain("secret command")
    expect(formatted).not.toContain("private chain of thought")

    const withTools = history.getTranscript({ sessionID: "ses_current", includeTools: true })
    expect(formatTranscript(withTools!)).toContain("secret command")
    const toolPart = withTools!.messages.flatMap((message) => message.parts).find((part) => part.type === "tool")
    expect(toolPart!.content.length).toBeLessThanOrEqual(2_020)
    history.close()
  })
})
