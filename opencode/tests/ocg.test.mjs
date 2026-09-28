import assert from "node:assert/strict"
import { spawn, spawnSync } from "node:child_process"
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { DatabaseSync } from "node:sqlite"
import test, { afterEach } from "node:test"

const script = resolve(new URL("../bin/ocg", import.meta.url).pathname)
const temporaryRoots = []

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { force: true, recursive: true })
})

function setup() {
  const root = mkdtempSync(join(tmpdir(), "ocg-"))
  temporaryRoots.push(root)
  const data = join(root, "data")
  const cache = join(root, "cache")
  const home = join(root, "home")
  const project = join(root, "project")
  const bin = join(root, "bin")
  for (const path of [join(data, "opencode"), cache, home, project, bin]) mkdirSync(path, { recursive: true })
  const databasePath = join(data, "opencode", "opencode.db")
  const database = new DatabaseSync(databasePath)
  database.exec(`
    CREATE TABLE project (id TEXT PRIMARY KEY, name TEXT);
    CREATE TABLE session_v2 (
      id TEXT PRIMARY KEY, project_id TEXT, parent_id TEXT, directory TEXT, title TEXT,
      time_updated INTEGER, time_archived INTEGER
    );
    CREATE TABLE session_message (
      id TEXT PRIMARY KEY, session_id TEXT, type TEXT, seq INTEGER,
      time_created INTEGER, time_updated INTEGER, data TEXT
    );
  `)
  database.prepare("INSERT INTO project VALUES (?, ?)").run("p1", "Demo")
  database.close()

  writeExecutable(join(bin, "fzf"), `#!/bin/bash
printf '%s\\n' "$@" > "$OCG_FZF_ARGS"
IFS= read -r line || exit 1
printf '\\n%s\\n' "$line"
`)
  writeExecutable(join(bin, "opencode"), `#!/bin/bash
printf '%s\\t%s\\n' "$PWD" "$*" >> "$OCG_CAPTURE"
`)

  const env = {
    ...process.env,
    HOME: home,
    XDG_DATA_HOME: data,
    XDG_CACHE_HOME: cache,
    OCG_CAPTURE: join(root, "capture"),
    OCG_FZF_ARGS: join(root, "fzf-args"),
    OCG_PAUSE: "0",
    PATH: `${bin}:${process.env.PATH}`,
  }
  return { root, cache, project, databasePath, capture: env.OCG_CAPTURE, env }
}

function write(fixture, statements) {
  const database = new DatabaseSync(fixture.databasePath)
  statements(database)
  database.close()
}

function addSession(database, id, { parent = null, directory, title = id, archived = null } = {}) {
  database.prepare("INSERT INTO session_v2 VALUES (?, 'p1', ?, ?, ?, 1, ?)").run(id, parent, directory, title, archived)
}

function addMessage(database, sessionID, seq, time, type, data) {
  database.prepare("INSERT INTO session_message VALUES (?, ?, ?, ?, ?, ?, ?)").run(
    `${sessionID}-${seq}`, sessionID, type, seq, time, time, JSON.stringify(data),
  )
}

function assistant(...texts) {
  return { content: texts.map((text) => ({ type: "text", text })) }
}

function writeExecutable(path, content) {
  writeFileSync(path, content)
  chmodSync(path, 0o755)
}

function run(args, env) {
  return spawnSync(script, args, { env, encoding: "utf8" })
}

function stream(env) {
  const result = run(["__stream"], env)
  assert.equal(result.status, 0, result.stderr)
  return result.stdout.trim().split("\n").filter(Boolean).map((line) => line.split("\t"))
}

function cacheDirectory(fixture) {
  const [databaseKey] = readdirSync(join(fixture.cache, "opencode-search"))
  return join(fixture.cache, "opencode-search", databaseKey, "sessions")
}

test("streams newest sessions first and attributes subagent text to the session to resume", () => {
  const fixture = setup()
  write(fixture, (database) => {
    addSession(database, "ses_old", { directory: fixture.project, title: "Old work" })
    addSession(database, "ses_new", { directory: fixture.project, title: "New work" })
    addSession(database, "ses_child", { parent: "ses_new", directory: "/elsewhere", title: "Child task" })
    addMessage(database, "ses_old", 1, 1000, "user", { text: "old question" })
    addMessage(database, "ses_new", 1, 2000, "user", { text: "new question" })
    addMessage(database, "ses_child", 1, 3000, "assistant", assistant("child finding"))
  })

  const lines = stream(fixture.env)
  assert.deepEqual(lines.map((fields) => fields[4]), ["child finding", "new question", "old question"])
  assert.deepEqual(lines[0].slice(0, 3), ["ses_new", fixture.project, "ses_child"])
  assert.match(lines[0][3], /Demo · New work › Child task/)
})

test("excludes archived sessions and non-text, synthetic, and non-chat messages", () => {
  const fixture = setup()
  write(fixture, (database) => {
    addSession(database, "ses_live", { directory: fixture.project })
    addSession(database, "ses_archived", { directory: fixture.project, archived: 5 })
    addMessage(database, "ses_live", 1, 1000, "assistant", {
      content: [
        { type: "reasoning", text: "private reasoning" },
        { type: "tool", name: "shell", state: { input: { command: "tool command" } } },
        { type: "text", text: "synthetic note", synthetic: true },
        { type: "text", text: "visible answer" },
      ],
    })
    addMessage(database, "ses_live", 2, 1100, "system", { text: "system prompt" })
    addMessage(database, "ses_archived", 1, 2000, "user", { text: "archived text" })
  })

  assert.deepEqual(stream(fixture.env).map((fields) => fields[4]), ["visible answer"])
})

test("keeps a private per-session cache and re-reads only sessions whose messages changed", () => {
  const fixture = setup()
  write(fixture, (database) => {
    addSession(database, "ses_a", { directory: fixture.project })
    addSession(database, "ses_b", { directory: fixture.project })
    addMessage(database, "ses_a", 1, 1000, "user", { text: "first a" })
    addMessage(database, "ses_b", 1, 2000, "user", { text: "first b" })
  })
  const databaseBefore = readFileSync(fixture.databasePath)
  stream(fixture.env)
  assert.deepEqual(readFileSync(fixture.databasePath), databaseBefore)

  const directory = cacheDirectory(fixture)
  assert.equal(statSync(join(fixture.cache, "opencode-search")).mode & 0o777, 0o700)
  assert.equal(statSync(directory).mode & 0o777, 0o700)
  const files = readdirSync(directory)
  assert.equal(files.length, 2)
  for (const file of files) assert.equal(statSync(join(directory, file)).mode & 0o777, 0o600)
  const cachedA = files.find((file) => file.startsWith("ses_a."))
  const inodeA = statSync(join(directory, cachedA)).ino
  writeFileSync(join(directory, cachedA), "served from cache\n")

  write(fixture, (database) => addMessage(database, "ses_b", 2, 3000, "user", { text: "second b" }))
  const texts = stream(fixture.env).map((fields) => fields[4])
  assert.deepEqual(texts, ["first b", "second b", "served from cache"])

  const after = readdirSync(directory)
  assert.equal(after.length, 2)
  assert.equal(statSync(join(directory, cachedA)).ino, inodeA)
  assert.equal(after.some((file) => files.includes(file) && file.startsWith("ses_b.")), false)
})

test("pauses between batches once the eager window is loaded", () => {
  const fixture = setup()
  write(fixture, (database) => {
    for (let index = 0; index < 4; index++) {
      addSession(database, `ses_${index}`, { directory: fixture.project })
      addMessage(database, `ses_${index}`, 1, 1000 + index, "user", { text: `text ${index}` })
    }
  })
  const started = Date.now()
  const lines = stream({ ...fixture.env, OCG_EAGER: "1", OCG_BATCH: "1", OCG_PAUSE: "0.3" })
  assert.equal(lines.length, 4)
  assert.ok(Date.now() - started >= 900, `expected three 0.3s pauses, took ${Date.now() - started}ms`)
})

test("removes the previous single-file cache", () => {
  const fixture = setup()
  const legacy = join(fixture.cache, "opencode-search", "12345")
  mkdirSync(legacy, { recursive: true })
  for (const name of ["messages.tsv", "messages.stamp", "build.lock"]) writeFileSync(join(legacy, name), "old")
  writeFileSync(join(fixture.cache, "opencode-search", "messages.tsv"), "old")
  write(fixture, (database) => {
    addSession(database, "ses_a", { directory: fixture.project })
    addMessage(database, "ses_a", 1, 1000, "user", { text: "hello" })
  })
  stream(fixture.env)
  assert.equal(existsSync(legacy), false)
  assert.equal(existsSync(join(fixture.cache, "opencode-search", "messages.tsv")), false)
})

test("resumes the selected root session from its directory", () => {
  const fixture = setup()
  write(fixture, (database) => {
    addSession(database, "ses_root", { directory: fixture.project, title: "Root" })
    addSession(database, "ses_child", { parent: "ses_root", directory: "/elsewhere" })
    addMessage(database, "ses_child", 1, 1000, "assistant", assistant("child text"))
  })

  const content = run(["child"], fixture.env)
  assert.equal(content.status, 0, content.stderr)
  assert.deepEqual(readFileSync(fixture.capture, "utf8").trim().split("\t"), [fixture.project, "--session ses_root"])
  assert.match(readFileSync(fixture.env.OCG_FZF_ARGS, "utf8"), /^--exact$/m)

  rmSync(fixture.capture)
  const picker = run(["--sessions", "Root"], fixture.env)
  assert.equal(picker.status, 0, picker.stderr)
  assert.deepEqual(readFileSync(fixture.capture, "utf8").trim().split("\t"), [fixture.project, "--session ses_root"])
  assert.equal(statSync(script).mode & 0o111, 0o111)
})

test("stops the background loader when the picker exits early", async () => {
  const fixture = setup()
  write(fixture, (database) => {
    for (let index = 0; index < 20; index++) {
      addSession(database, `ses_${index}`, { directory: fixture.project })
      addMessage(database, `ses_${index}`, 1, 1000 + index, "user", { text: `text ${index}` })
    }
  })
  const env = { ...fixture.env, OCG_EAGER: "1", OCG_BATCH: "1", OCG_PAUSE: "30" }
  const started = Date.now()
  const status = await new Promise((resolveRun) => {
    const child = spawn(script, ["text"], { env, stdio: "ignore" })
    child.on("close", resolveRun)
  })
  assert.equal(status, 0)
  assert.ok(Date.now() - started < 8_000, `picker exit took ${Date.now() - started}ms`)
  assert.match(readFileSync(fixture.capture, "utf8"), /--session ses_19/)
})

test("prints a transcript and explains a database without V2 history", () => {
  const fixture = setup()
  write(fixture, (database) => {
    addSession(database, "ses_a", { directory: fixture.project })
    addMessage(database, "ses_a", 1, 1000, "user", { text: "question" })
    addMessage(database, "ses_a", 2, 1100, "assistant", assistant("answer"))
  })
  const transcript = run(["__transcript", "ses_a"], fixture.env)
  assert.equal(transcript.status, 0, transcript.stderr)
  assert.equal(transcript.stdout, "### user\nquestion\n\n### assistant\nanswer\n")

  const legacy = join(fixture.root, "legacy.db")
  const database = new DatabaseSync(legacy)
  database.exec("CREATE TABLE session (id TEXT PRIMARY KEY)")
  database.close()
  const refused = run(["__stream"], { ...fixture.env, OPENCODE_DB_PATH: legacy })
  assert.equal(refused.status, 1)
  assert.match(refused.stderr, /requires OpenCode V2/)
})
