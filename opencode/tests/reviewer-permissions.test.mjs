import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const source = readFileSync(new URL("../agents/code-change-reviewer.md", import.meta.url), "utf8")
const bashBlock = source.match(/^  bash:\n([\s\S]*?)^  task:/m)?.[1]
assert.ok(bashBlock, "code reviewer bash permissions not found")

const rules = bashBlock
  .split("\n")
  .map((line) => /^    ("(?:[^"\\]|\\.)*"): (allow|ask|deny)$/.exec(line))
  .filter(Boolean)
  .map((match) => ({ pattern: JSON.parse(match[1]), action: match[2] }))

function matches(value, pattern) {
  let escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".")
  if (escaped.endsWith(" .*")) escaped = escaped.slice(0, -3) + "( .*)?"
  return new RegExp(`^${escaped}$`, "s").test(value)
}

function permission(command) {
  return rules.findLast((rule) => matches(command, rule.pattern))?.action
}

test("allows only direct read-only git inspection", () => {
  for (const command of [
    "git status --short",
    "git diff",
    "git diff --stat HEAD",
    "git log -3",
    "git show HEAD",
    "git merge-base HEAD main",
    "git rev-parse HEAD",
  ]) assert.equal(permission(command), "allow", command)

  for (const command of [
    "git checkout main",
    "git reset --hard",
    "git clean -fd",
    "git -C /tmp/repo status",
    "git diff --no-index a b",
    "git diff --ext-diff HEAD",
    "git diff -u HEAD",
  ]) assert.equal(permission(command), "deny", command)
})

test("ask-gates verification and denies output or shell composition", () => {
  assert.equal(permission("npm test"), "ask")
  for (const command of [
    "npm test -- --update",
    "npm test -- --output report",
    "git status > out",
    "git status; rm file",
    "git status && echo done",
    "git status | cat",
    "git show $(git rev-parse HEAD)",
    "git show `git rev-parse HEAD`",
    "git status\ngit diff",
  ]) assert.equal(permission(command), "deny", command)
})

test("contains no broad git allow", () => {
  assert.equal(rules.some((rule) => rule.action === "allow" && ["git *", "git -C *"].includes(rule.pattern)), false)
})
