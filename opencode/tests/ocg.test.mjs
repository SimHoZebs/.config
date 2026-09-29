import assert from "node:assert/strict"
import { spawn, spawnSync } from "node:child_process"
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { DatabaseSync } from "node:sqlite"
import test, { afterEach } from "node:test"

const script = resolve(new URL("../bin/ocg", import.meta.url).pathname)
const ANSI = /\x1b\[[0-9;]*m/g
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

  // Stands in for fzf: runs the start:reload search itself, like fzf --disabled
  // does, and picks the first result it returns.
  writeExecutable(join(bin, "fzf"), `#!/usr/bin/env python3
import os, subprocess, sys
args = sys.argv[1:]
if args[:1] == ["--version"]:
    print(os.environ.get("OCG_FAKE_FZF_VERSION", "0.74.0 (fake)"))
    sys.exit(0)
open(os.environ["OCG_FZF_ARGS"], "w").write("\\n".join(args) + "\\n")
query = args[args.index("--query") + 1] if "--query" in args else ""
start = next((a[len("start:reload("):-1] for a in args if a.startswith("start:reload(")), None)
if start:
    command = start.replace("{q}", "'" + query.replace("'", "'\\\\''") + "'")
    items = subprocess.run(["sh", "-c", command], stdout=subprocess.PIPE).stdout
else:
    items = sys.stdin.buffer.read()
first = next((item for item in items.split(b"\\0") if item), None)
if first is None:
    sys.exit(1)
sys.stdout.buffer.write(b"\\0" + first + b"\\0")
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

function load(env) {
  const result = run(["__load"], env)
  assert.equal(result.status, 0, result.stderr)
}

function search(env, query = "") {
  const result = run(["__search", query], env)
  assert.equal(result.status, 0, result.stderr)
  return result.stdout.split("\0").filter(Boolean).map((item) => {
    const [session, directory, seq, display] = item.split("\t")
    const [header, text] = display.split("\n")
    return { session, directory, seq, header: header.replace(ANSI, ""), text: text.replace(ANSI, ""), raw: text }
  })
}

function cacheDirectory(fixture) {
  const [databaseKey] = readdirSync(join(fixture.cache, "opencode-search"))
  return join(fixture.cache, "opencode-search", databaseKey, "sessions")
}

test("lists newest messages first without a query and leaves out subagent sessions", () => {
  const fixture = setup()
  write(fixture, (database) => {
    addSession(database, "ses_old", { directory: fixture.project, title: "Old work" })
    addSession(database, "ses_new", { directory: fixture.project, title: "New work" })
    addSession(database, "ses_child", { parent: "ses_new", directory: "/elsewhere", title: "Child task" })
    addMessage(database, "ses_old", 1, 1000, "user", { text: "old question" })
    addMessage(database, "ses_new", 1, 2000, "user", { text: "new question" })
    addMessage(database, "ses_new", 2, 2500, "assistant", assistant("new answer\nsecond line"))
    addMessage(database, "ses_child", 1, 3000, "user", { text: "task prompt" })
    addMessage(database, "ses_child", 2, 3100, "assistant", assistant("child finding"))
  })
  load(fixture.env)

  const items = search(fixture.env)
  assert.deepEqual(items.map((item) => item.text), ["new answer second line", "new question", "old question"])
  assert.deepEqual([items[0].session, items[0].directory, items[0].seq], ["ses_new", fixture.project, "2"])
  assert.match(items[0].header, /  assistant  · Demo · New work$/)
  assert.match(items[1].header, /  you  · Demo · New work$/)
  assert.deepEqual(search(fixture.env, "child"), [])
})

test("ranks by relevance first and recency second", () => {
  const fixture = setup()
  const filler = (word, count) => Array.from({ length: count }, () => word).join(" ")
  write(fixture, (database) => {
    for (let index = 0; index < 8; index++) {
      addSession(database, `ses_common_${index}`, { directory: fixture.project, title: `Common ${index} and more` })
      addMessage(database, `ses_common_${index}`, 1, 9000 + index, "user", { text: `the report ${filler("x", 20)}` })
    }
    addSession(database, "ses_once", { directory: fixture.project, title: "Once" })
    addSession(database, "ses_twice", { directory: fixture.project, title: "Twice" })
    addSession(database, "ses_phrase", { directory: fixture.project, title: "Phrase" })
    addSession(database, "ses_scattered", { directory: fixture.project, title: "Scattered" })
    addSession(database, "ses_tie_old", { directory: fixture.project, title: "Tie" })
    addSession(database, "ses_tie_new", { directory: fixture.project, title: "Tie" })
    addSession(database, "ses_rare", { directory: fixture.project, title: "Rare" })
    addSession(database, "ses_repeats", { directory: fixture.project, title: "Repeats" })
    addMessage(database, "ses_rare", 1, 800, "user", { text: `quokka quokka the ${filler("x", 20)}` })
    addMessage(database, "ses_repeats", 1, 900, "user", { text: `quokka the the the ${filler("x", 19)}` })
    addMessage(database, "ses_once", 1, 1000, "user", { text: `zebra report ${filler("x", 20)}` })
    addMessage(database, "ses_twice", 1, 1100, "user", { text: `zebra report zebra ${filler("x", 19)}` })
    addMessage(database, "ses_phrase", 1, 1200, "user", { text: `lifecycle validation ${filler("y", 20)}` })
    addMessage(database, "ses_scattered", 1, 1300, "user", { text: `validation ${filler("y", 10)} lifecycle ${filler("y", 9)}` })
    addMessage(database, "ses_tie_old", 1, 1400, "user", { text: `tieword ${filler("z", 20)}` })
    addMessage(database, "ses_tie_new", 1, 1500, "user", { text: `tieword ${filler("z", 20)}` })
  })
  load(fixture.env)

  assert.deepEqual(search(fixture.env, "zebra").map((item) => item.session), ["ses_twice", "ses_once"])
  const report = search(fixture.env, "zebra report").map((item) => item.session)
  assert.deepEqual(report, ["ses_twice", "ses_once"], "a rare word repeated outranks a single mention")
  const common = search(fixture.env, "report").map((item) => item.session)
  assert.equal(common.length, 10)
  assert.deepEqual(common.slice(0, 8), Array.from({ length: 8 }, (_, index) => `ses_common_${7 - index}`),
    "a word in most messages carries little weight, so recency decides among near-equal matches")
  assert.deepEqual(search(fixture.env, "lifecycle validation").map((item) => item.session), ["ses_phrase", "ses_scattered"])
  assert.deepEqual(search(fixture.env, "tieword").map((item) => item.session), ["ses_tie_new", "ses_tie_old"])
  assert.deepEqual(search(fixture.env, "quokka the").map((item) => item.session), ["ses_rare", "ses_repeats"],
    "extra mentions of a rare word outweigh extra mentions of a common one")

  const titled = search(fixture.env, "and report").map((item) => item.session)
  assert.equal(titled.length, 8, "'and' in a title satisfies the word for that session's messages")
  assert.deepEqual(titled.slice().sort(), Array.from({ length: 8 }, (_, index) => `ses_common_${index}`).sort())
  assert.deepEqual(titled, titled.slice().sort().reverse(), "common title words tie, so recency orders them")

  write(fixture, (database) => {
    addSession(database, "ses_plain_title", { directory: fixture.project, title: "Plain" })
    addSession(database, "ses_and_title", { directory: fixture.project, title: "Tea and biscuits" })
    addMessage(database, "ses_plain_title", 1, 5100, "user", { text: `walrus and ${filler("w", 20)}` })
    addMessage(database, "ses_and_title", 1, 5000, "user", { text: `walrus and ${filler("w", 20)}` })
  })
  load(fixture.env)
  assert.deepEqual(search(fixture.env, "walrus and").map((item) => item.session), ["ses_plain_title", "ses_and_title"],
    "a word in many titles adds no title score, so the newer message wins")
})

test("supports exact phrases, exclusions, and case-sensitive capitals, with highlighted excerpts", () => {
  const fixture = setup()
  const lead = Array.from({ length: 40 }, (_, index) => `word${index}`).join(" ")
  write(fixture, (database) => {
    addSession(database, "ses_a", { directory: fixture.project, title: "A" })
    addMessage(database, "ses_a", 1, 1000, "user", { text: `${lead} add beta and gamma validation` })
    addMessage(database, "ses_a", 2, 1100, "user", { text: "gamma then beta, not the phrase" })
    addMessage(database, "ses_a", 3, 1200, "user", { text: "RBA upper and rba lower" })
    addMessage(database, "ses_a", 4, 1300, "user", { text: "only rba lower" })
    addMessage(database, "ses_a", 5, 1400, "user", { text: `early beta mention ${lead} ${lead} ${lead} beta validation beta then validation` })
  })
  load(fixture.env)

  const phrase = search(fixture.env, '"beta and gamma"')
  assert.deepEqual(phrase.map((item) => item.seq), ["1"])
  assert.match(phrase[0].text, /^… .*word\d+ add beta and gamma validation$/)
  assert.doesNotMatch(phrase[0].text, /word0 /)
  assert.match(phrase[0].raw, /\x1b\[7mbeta and gamma\x1b\[27m/)

  assert.deepEqual(search(fixture.env, "beta gamma").map((item) => item.seq).sort(), ["1", "2"])
  const typed = search(fixture.env, "beta validation")
  assert.deepEqual(typed.map((item) => item.seq), ["5", "1"])
  assert.match(typed[0].text, /beta validation beta then validation$/, "the excerpt starts at the words as typed, not the first lone word")
  assert.doesNotMatch(typed[0].text, /early beta/)
  assert.deepEqual(search(fixture.env, "beta !phrase").map((item) => item.seq).sort(), ["1", "5"])
  assert.deepEqual(search(fixture.env, "RBA").map((item) => item.seq), ["3"])
  assert.deepEqual(search(fixture.env, "rba").map((item) => item.seq).sort(), ["3", "4"])
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
  load(fixture.env)
  assert.deepEqual(search(fixture.env).map((item) => item.text), ["visible answer"])
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
  load(fixture.env)
  assert.deepEqual(readFileSync(fixture.databasePath), databaseBefore)

  const directory = cacheDirectory(fixture)
  assert.equal(statSync(join(fixture.cache, "opencode-search")).mode & 0o777, 0o700)
  assert.equal(statSync(directory).mode & 0o777, 0o700)
  const files = readdirSync(directory)
  assert.equal(files.length, 2)
  for (const file of files) assert.equal(statSync(join(directory, file)).mode & 0o777, 0o600)
  const index = join(directory, "..", "index.tsv")
  assert.equal(statSync(index).mode & 0o777, 0o600)
  const cachedA = files.find((file) => file.startsWith("ses_a."))
  const inodeA = statSync(join(directory, cachedA)).ino
  writeFileSync(join(directory, cachedA), "1\t1000\tuser\tserved from cache\n")

  write(fixture, (database) => addMessage(database, "ses_b", 2, 3000, "user", { text: "second b" }))
  load(fixture.env)
  assert.deepEqual(search(fixture.env).map((item) => item.text), ["second b", "first b", "served from cache"])

  const after = readdirSync(directory)
  assert.equal(after.length, 2)
  assert.equal(statSync(join(directory, cachedA)).ino, inodeA)
  assert.equal(after.some((file) => files.includes(file) && file.startsWith("ses_b.")), false)
})

test("drops cached subagent sessions and lists only top-level sessions", () => {
  const fixture = setup()
  write(fixture, (database) => {
    addSession(database, "ses_top", { directory: fixture.project, title: "Top" })
    addMessage(database, "ses_top", 1, 1000, "user", { text: "top question" })
  })
  load(fixture.env)
  const cachedChild = join(cacheDirectory(fixture), "ses_child.3000-1.tsv")
  writeFileSync(cachedChild, "1\t3000\tassistant\tcached subagent text\n")
  write(fixture, (database) => {
    addSession(database, "ses_child", { parent: "ses_top", directory: fixture.project, title: "Child" })
    addMessage(database, "ses_child", 1, 3000, "assistant", assistant("cached subagent text"))
  })
  load(fixture.env)

  assert.deepEqual(search(fixture.env).map((item) => item.text), ["top question"])
  assert.equal(existsSync(cachedChild), false)

  const picker = run(["--sessions"], fixture.env)
  assert.equal(picker.status, 0, picker.stderr)
  assert.deepEqual(readFileSync(fixture.capture, "utf8").trim().split("\t"), [fixture.project, "--session ses_top"])
})

test("pauses before every background batch and reports loading progress", async () => {
  const fixture = setup()
  write(fixture, (database) => {
    for (let index = 0; index < 3; index++) {
      addSession(database, `ses_${index}`, { directory: fixture.project })
      addMessage(database, `ses_${index}`, 1, 1000 + index, "user", { text: `text ${index}` })
    }
  })
  const started = Date.now()
  load({ ...fixture.env, OCG_BATCH: "1", OCG_PAUSE: "0.3" })
  assert.ok(Date.now() - started >= 900, `expected three 0.3s pauses, took ${Date.now() - started}ms`)
  assert.doesNotMatch(run(["__status"], fixture.env).stdout, /loading/)

  write(fixture, (database) => {
    addSession(database, "ses_3", { directory: fixture.project })
    addMessage(database, "ses_3", 1, 2000, "user", { text: "not loaded yet" })
  })
  const loader = spawn(script, ["__load"], { env: { ...fixture.env, OCG_PAUSE: "30" }, stdio: "ignore" })
  const index = join(cacheDirectory(fixture), "..", "index.tsv")
  for (let attempt = 0; attempt < 100 && !readFileSync(index, "utf8").includes("ses_3"); attempt++) {
    await new Promise((resolveWait) => setTimeout(resolveWait, 20))
  }
  assert.match(run(["__status"], fixture.env).stdout, /1 older chat loading, Ctrl-R refreshes/)
  assert.deepEqual(search(fixture.env, "text").map((item) => item.session).sort(), ["ses_0", "ses_1", "ses_2"])
  loader.kill()
})

test("removes the previous cache formats", () => {
  const fixture = setup()
  const legacy = join(fixture.cache, "opencode-search", "12345")
  mkdirSync(legacy, { recursive: true })
  for (const name of ["messages.tsv", "messages.stamp", "build.lock"]) writeFileSync(join(legacy, name), "old")
  writeFileSync(join(fixture.cache, "opencode-search", "messages.tsv"), "old")
  write(fixture, (database) => {
    addSession(database, "ses_a", { directory: fixture.project })
    addMessage(database, "ses_a", 1, 1000, "user", { text: "hello" })
  })
  load(fixture.env)
  assert.equal(existsSync(legacy), false)
  assert.equal(existsSync(join(fixture.cache, "opencode-search", "messages.tsv")), false)

  const plainText = join(cacheDirectory(fixture), "ses_a.1000-1.txt")
  writeFileSync(plainText, "hello\n")
  load(fixture.env)
  assert.equal(existsSync(plainText), false)
})

test("caches the newest chats before the picker opens and resumes the selected session", () => {
  const fixture = setup()
  write(fixture, (database) => {
    addSession(database, "ses_top", { directory: fixture.project, title: "Top" })
    addMessage(database, "ses_top", 1, 1000, "assistant", assistant("top text"))
  })

  const content = run(["top"], fixture.env)
  assert.equal(content.status, 0, content.stderr)
  assert.deepEqual(readFileSync(fixture.capture, "utf8").trim().split("\t"), [fixture.project, "--session ses_top"])
  const fzfArgs = readFileSync(fixture.env.OCG_FZF_ARGS, "utf8")
  assert.match(fzfArgs, /^--disabled$/m)
  assert.match(fzfArgs, /^change:reload\(.* __search \{q\}\)$/m)
  assert.match(fzfArgs, /^ctrl-r:reload\(.* __search \{q\}\)$/m)

  rmSync(fixture.capture)
  const picker = run(["--sessions", "Top"], fixture.env)
  assert.equal(picker.status, 0, picker.stderr)
  assert.deepEqual(readFileSync(fixture.capture, "utf8").trim().split("\t"), [fixture.project, "--session ses_top"])
  assert.equal(statSync(script).mode & 0o111, 0o111)

  const outdated = run(["top"], { ...fixture.env, OCG_FAKE_FZF_VERSION: "0.44.1 (old)" })
  assert.equal(outdated.status, 1)
  assert.match(outdated.stderr, /fzf 0\.56 or newer is required; found 0\.44\.1/)
})

test("stops the background loader when the picker exits", async () => {
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

test("previews the conversation at the selected message, formatted as chat", () => {
  const fixture = setup()
  const long = Array.from({ length: 30 }, (_, index) => `filler line ${index}`).join("\n")
  write(fixture, (database) => {
    addSession(database, "ses_a", { directory: fixture.project, title: "Formatting" })
    addMessage(database, "ses_a", 1, 1000, "user", { text: "first question" })
    addMessage(database, "ses_a", 2, 1100, "assistant", assistant("## Summary\n- **bold** item with `code`\n```json\n{\"a\":1}\n```"))
    addMessage(database, "ses_a", 3, 1200, "user", { text: '{"stdout":{"ok":true}}' })
    addMessage(database, "ses_a", 4, 1300, "assistant", assistant(`${long}\nthe needle is here`))
  })

  const preview = (seq, query = "") => {
    const result = run(["__preview", "ses_a", seq, query], fixture.env)
    assert.equal(result.status, 0, result.stderr)
    return result.stdout
  }

  const formatted = preview("2").replace(ANSI, "")
  assert.match(formatted, /^Formatting\nDemo · /)
  assert.match(formatted, /  you  \d{4}-\d{2}-\d{2} \d{2}:\d{2}\n  first question/)
  assert.match(formatted, /▌ assistant  /)
  assert.match(formatted, /▌ Summary\n▌ • bold item with code\n/)
  assert.match(formatted, /▌ │ \{\n▌ │   "a": 1\n▌ │ \}/)
  assert.match(formatted, /  \{\n    "stdout": \{\n      "ok": true/)
  assert.doesNotMatch(formatted, /\*\*|```|## /)

  const focused = preview("4", "needle")
  assert.match(focused, /\x1b\[7mneedle\x1b\[27m/)
  const plain = focused.replace(ANSI, "")
  assert.match(plain, /··· 2 earlier messages/)
  assert.match(plain, /▌ ··· 28 lines before the match\n▌ filler line 28\n▌ filler line 29\n▌ the needle is here/)
  assert.doesNotMatch(plain, /filler line 0\n/)

  const legacy = join(fixture.root, "legacy.db")
  const database = new DatabaseSync(legacy)
  database.exec("CREATE TABLE session (id TEXT PRIMARY KEY)")
  database.close()
  const refused = run(["__load"], { ...fixture.env, OPENCODE_DB_PATH: legacy })
  assert.equal(refused.status, 1)
  assert.match(refused.stderr, /requires OpenCode V2/)
})
