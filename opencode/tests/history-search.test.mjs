import assert from "node:assert/strict"
import { DatabaseSync } from "node:sqlite"
import test from "node:test"
import { buildHistorySearch } from "../lib/history-search.js"

function fixture() {
  const database = new DatabaseSync(":memory:")
  database.exec(`
    CREATE TABLE session (
      id TEXT PRIMARY KEY, project_id TEXT, parent_id TEXT, directory TEXT, title TEXT,
      time_created INTEGER, time_updated INTEGER, time_archived INTEGER
    );
    CREATE TABLE message (id TEXT PRIMARY KEY, session_id TEXT, time_created INTEGER, data TEXT);
    CREATE TABLE part (id TEXT PRIMARY KEY, message_id TEXT, time_created INTEGER, data TEXT);
  `)
  const session = database.prepare("INSERT INTO session VALUES (?, ?, NULL, ?, ?, ?, ?, ?)")
  session.run("s1", "p1", "/repo/a", "Signed cookies", 100, 2000, null)
  session.run("s2", "p2", "/repo/b", "Other session", 100, 3000, null)
  session.run("s3", "p1", "/repo/a", "Archived cookies", 100, 4000, 4100)
  session.run("s4", "p1", "/repo/a", "Old title needle", 100, 900, null)

  const message = database.prepare("INSERT INTO message VALUES (?, ?, ?, ?)")
  const part = database.prepare("INSERT INTO part VALUES (?, ?, ?, ?)")
  const add = (sessionID, id, time, role, type, data, synthetic = false) => {
    message.run(id, sessionID, time, JSON.stringify({ role }))
    part.run(`p-${id}`, id, time, JSON.stringify({ type, synthetic, ...data }))
  }
  add("s1", "old", 1000, "user", "text", { text: "message needle old" })
  add("s1", "new", 1500, "assistant", "text", { text: "message needle new" })
  add("s1", "tool", 1600, "assistant", "tool", { tool: "shell", state: { input: "secret command", output: "tool needle" } })
  add("s1", "file", 1700, "assistant", "file", { filename: "file-needle.txt" })
  add("s1", "patch", 1800, "assistant", "patch", { hash: "patch-needle", files: ["src/file.ts"] })
  add("s1", "synthetic", 1900, "assistant", "text", { text: "synthetic needle" }, true)
  add("s2", "other", 2500, "assistant", "text", { text: "project needle" })
  add("s3", "archived", 3500, "assistant", "text", { text: "archived needle" })
  return database
}

function search(database, options) {
  const statement = buildHistorySearch({ limit: 20, ...options })
  return database.prepare(statement.sql).all(...statement.params)
}

test("uses message creation time for content and session update time for titles", () => {
  const database = fixture()
  const content = search(database, { query: "message needle", since: 1150 })
  assert.deepEqual(content.map((row) => row.message_id), ["new"])
  assert.equal(search(database, { query: "Signed cookies", since: 1500 })[0].match_type, "title")
  assert.deepEqual(search(database, { query: "Old title needle", since: 1500 }), [])
  database.close()
})

test("preserves role, directory, project, session, and title suppression", () => {
  const database = fixture()
  assert.deepEqual(search(database, { query: "Signed cookies", role: "assistant" }), [])
  assert.deepEqual(search(database, { query: "message needle", role: "user" }).map((row) => row.message_id), ["old"])
  assert.deepEqual(search(database, { query: "project needle", projectID: "p1" }), [])
  assert.equal(search(database, { query: "project needle", projectID: "p2" })[0].id, "s2")
  assert.deepEqual(search(database, { query: "project needle", sessionID: "s1" }), [])
  assert.deepEqual(search(database, { query: "project needle", directory: "/repo/a" }), [])
  database.close()
})

test("preserves part-type, synthetic, archived, and limit behavior", () => {
  const database = fixture()
  assert.deepEqual(search(database, { query: "tool needle" }), [])
  assert.equal(search(database, { query: "tool needle", includeTools: true })[0].match_type, "tool")
  assert.equal(search(database, { query: "file-needle", includeTools: true })[0].match_type, "file")
  assert.equal(search(database, { query: "patch-needle", includeTools: true })[0].match_type, "patch")
  assert.deepEqual(search(database, { query: "synthetic needle" }), [])
  assert.deepEqual(search(database, { query: "archived" }), [])
  assert.equal(search(database, { query: "message needle", limit: 1 }).length, 1)
  database.close()
})
