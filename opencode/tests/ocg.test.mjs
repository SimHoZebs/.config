import assert from "node:assert/strict"
import { spawn, spawnSync } from "node:child_process"
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { basename, dirname, join, resolve } from "node:path"
import { DatabaseSync } from "node:sqlite"
import test, { afterEach } from "node:test"

const script = resolve(new URL("../bin/ocg", import.meta.url).pathname)
const realSqlite = spawnSync("sh", ["-c", "command -v sqlite3"], { encoding: "utf8" }).stdout.trim()
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
    CREATE TABLE session (id TEXT PRIMARY KEY, project_id TEXT, directory TEXT, title TEXT, time_updated INTEGER);
    CREATE TABLE message (id TEXT PRIMARY KEY, session_id TEXT, time_created INTEGER, data TEXT);
    CREATE TABLE part (id TEXT PRIMARY KEY, session_id TEXT, message_id TEXT, time_created INTEGER, data TEXT);
  `)
  database.prepare("INSERT INTO project VALUES (?, ?)").run("p1", "Demo")
  database.prepare("INSERT INTO session VALUES (?, ?, ?, ?, ?)").run("s1", "p1", project, "Test session", 2000)
  addMessage(database, "m1", 1000, "hello history")
  database.close()

  writeExecutable(join(bin, "fzf"), `#!/bin/bash
input=$(cat)
if [ -z "$input" ] && [ -n "\${FZF_DEFAULT_COMMAND:-}" ]; then input=$(eval "$FZF_DEFAULT_COMMAND"); fi
line=$(printf '%s\n' "$input" | sed -n '1p')
printf '\n%s\n' "$line"
`)
  writeExecutable(join(bin, "rg"), "#!/bin/bash\ncat\n")
  writeExecutable(join(bin, "opencode"), `#!/bin/bash
printf '%s\t%s\n' "$PWD" "$*" >> "$OCG_CAPTURE"
`)

  const capture = join(root, "capture")
  const env = {
    ...process.env,
    HOME: home,
    XDG_DATA_HOME: data,
    XDG_CACHE_HOME: cache,
    OCG_CAPTURE: capture,
    PATH: `${bin}:${process.env.PATH}`,
  }
  return { root, data, cache, home, project, bin, databasePath, capture, env }
}

function addMessage(database, id, time, text) {
  database.prepare("INSERT INTO message VALUES (?, 's1', ?, ?)").run(id, time, JSON.stringify({ role: "assistant" }))
  database.prepare("INSERT INTO part VALUES (?, 's1', ?, ?, ?)").run(
    `part-${id}`,
    id,
    time,
    JSON.stringify({ type: "text", text }),
  )
}

function writeExecutable(path, content) {
  writeFileSync(path, content)
  chmodSync(path, 0o755)
}

function run(args, env) {
  return spawnSync(script, args, { env, encoding: "utf8" })
}

test("uses XDG paths, private cache modes, and resumes the selected session", () => {
  const fixture = setup()
  const databaseBefore = readFileSync(fixture.databasePath)
  const build = run(["__buildcache"], fixture.env)
  assert.equal(build.status, 0, build.stderr)
  const cachePath = build.stdout.trim()
  assert.ok(cachePath.startsWith(fixture.cache))
  assert.equal(statSync(dirname(dirname(cachePath))).mode & 0o777, 0o700)
  assert.equal(statSync(dirname(cachePath)).mode & 0o777, 0o700)
  assert.equal(statSync(cachePath).mode & 0o777, 0o600)
  assert.equal(statSync(join(dirname(cachePath), "messages.stamp")).mode & 0o777, 0o600)
  assert.deepEqual(readFileSync(fixture.databasePath), databaseBefore)

  const selection = run(["--sessions", "Test"], fixture.env)
  assert.equal(selection.status, 0, selection.stderr)
  const [cwd, argumentsText] = readFileSync(fixture.capture, "utf8").trim().split("\t")
  assert.equal(cwd, fixture.project)
  assert.equal(argumentsText, "--session s1")
  assert.equal(statSync(script).mode & 0o111, 0o111)
})

test("retries when the database changes after the first query snapshot", () => {
  const fixture = setup()
  const log = join(fixture.root, "sqlite.log")
  const once = join(fixture.root, "mutated")
  writeExecutable(join(fixture.bin, "sqlite3"), `#!/bin/bash
printf 'query\n' >> "$SQLITE_LOG"
"$REAL_SQLITE" "$@"
status=$?
if mkdir "$MUTATE_ONCE" 2>/dev/null; then
  "$REAL_SQLITE" "$MUTATE_DB" "INSERT INTO message VALUES ('m2','s1',1500,json_object('role','assistant')); INSERT INTO part VALUES ('part-m2','s1','m2',1500,json_object('type','text','text','concurrent message'));"
fi
exit $status
`)
  const env = {
    ...fixture.env,
    REAL_SQLITE: realSqlite,
    SQLITE_LOG: log,
    MUTATE_ONCE: once,
    MUTATE_DB: fixture.databasePath,
  }
  const result = run(["__buildcache"], env)
  assert.equal(result.status, 0, result.stderr)
  assert.equal(readFileSync(log, "utf8").trim().split("\n").length, 2)
  assert.match(readFileSync(result.stdout.trim(), "utf8"), /concurrent message/)
})

test("serializes concurrent ordinary searches through the advisory lock", async () => {
  const fixture = setup()
  const log = join(fixture.root, "sqlite.log")
  const once = join(fixture.root, "delayed")
  writeExecutable(join(fixture.bin, "sqlite3"), `#!/bin/bash
printf 'query\n' >> "$SQLITE_LOG"
if mkdir "$DELAY_ONCE" 2>/dev/null; then sleep 0.5; fi
exec "$REAL_SQLITE" "$@"
`)
  const env = {
    ...fixture.env,
    REAL_SQLITE: realSqlite,
    SQLITE_LOG: log,
    DELAY_ONCE: once,
  }
  const runAsync = () => new Promise((resolveRun) => {
    const child = spawn(script, [], { env, stdio: "ignore" })
    child.on("close", (status) => resolveRun(status))
  })
  assert.deepEqual(await Promise.all([runAsync(), runAsync()]), [0, 0])
  assert.equal(readFileSync(log, "utf8").trim().split("\n").length, 1)
  assert.equal(readFileSync(fixture.capture, "utf8").trim().split("\n").length, 2)
})

test("invalidates a cache when the process stops between cache and stamp commits", () => {
  const fixture = setup()
  const initial = run(["__buildcache"], fixture.env)
  assert.equal(initial.status, 0, initial.stderr)
  const database = new DatabaseSync(fixture.databasePath)
  addMessage(database, "m3", 1700, "post-crash message")
  database.close()

  const failed = run(["__buildcache"], { ...fixture.env, OCG_TEST_FAIL_AFTER_CACHE_COMMIT: "1" })
  assert.equal(failed.status, 75)
  const recovered = run(["__buildcache"], fixture.env)
  assert.equal(recovered.status, 0, recovered.stderr)
  assert.match(readFileSync(recovered.stdout.trim(), "utf8"), /post-crash message/)
})

test("releases the advisory lock after uncatchable process termination", async () => {
  const fixture = setup()
  const entered = join(fixture.root, "sqlite-entered")
  writeExecutable(join(fixture.bin, "sqlite3"), `#!/bin/bash
touch "$SQLITE_ENTERED"
sleep 30
`)
  const child = spawn(script, ["__buildcache"], {
    detached: true,
    env: { ...fixture.env, SQLITE_ENTERED: entered },
    stdio: "ignore",
  })
  for (let attempt = 0; attempt < 100 && !existsSync(entered); attempt++) {
    await new Promise((resolveWait) => setTimeout(resolveWait, 20))
  }
  assert.equal(existsSync(entered), true)
  process.kill(-child.pid, "SIGKILL")
  await new Promise((resolveClose) => child.on("close", resolveClose))

  writeExecutable(join(fixture.bin, "sqlite3"), `#!/bin/bash
exec ${JSON.stringify(realSqlite)} "$@"
`)
  const recovered = run(["__buildcache"], fixture.env)
  assert.equal(recovered.status, 0, recovered.stderr)
})

test("rejects forged private-builder descriptors", () => {
  const fixture = setup()
  const stdoutFd = spawnSync("bash", ["-c", `OCG_CACHE_LOCK_FD=1 ${JSON.stringify(script)} __ensure_cache_locked`], {
    env: fixture.env,
    encoding: "utf8",
  })
  assert.notEqual(stdoutFd.status, 0)

  const fake = join(fixture.root, "fake.lock")
  const fakeFd = spawnSync("bash", ["-c", `exec 9>${JSON.stringify(fake)}; OCG_CACHE_LOCK_FD=9 ${JSON.stringify(script)} __ensure_cache_locked`], {
    env: fixture.env,
    encoding: "utf8",
  })
  assert.notEqual(fakeFd.status, 0)
})
