import { spawn } from "node:child_process"
import { homedir } from "node:os"
import { join } from "node:path"

export default async function TmuxStatus(_input, options = {}) {
  const env = options.env ?? process.env
  const pane = env.TMUX_PANE
  if (!env.TMUX || !pane) return {}

  const report = options.report ?? createReporter(env, pane)
  const busy = new Set()
  const pendingPrompts = new Map()
  let currentState

  const addBusy = (id) => {
    if (id) busy.add(id)
  }
  const apply = async () => {
    const state = pendingPrompts.size ? "waiting" : busy.size ? "working" : "done"
    if (state === currentState) return
    currentState = state
    await report(state)
  }
  const addPrompt = (type, properties) => {
    const sessionID = properties.sessionID
    if (!sessionID) return
    const prompts = pendingPrompts.get(sessionID) ?? new Set()
    prompts.add(promptKey(type, properties))
    pendingPrompts.set(sessionID, prompts)
  }
  const removePrompt = (type, properties) => {
    const sessionID = properties.sessionID
    const prompts = pendingPrompts.get(sessionID)
    if (!prompts) return
    const id = properties.requestID ?? properties.questionID ?? properties.id
    if (id) prompts.delete(`${type}:${id}`)
    else prompts.clear()
    if (!prompts.size) pendingPrompts.delete(sessionID)
  }

  return {
    "chat.message": async (input) => {
      addBusy(input?.sessionID)
      await apply()
    },
    event: async ({ event }) => {
      const properties = event.properties ?? {}
      switch (event.type) {
        case "session.status": {
          const type = properties.status?.type
          if (type === "busy" || type === "retry") addBusy(properties.sessionID)
          else if (type === "idle") busy.delete(properties.sessionID)
          await apply()
          break
        }
        case "session.idle":
          busy.delete(properties.sessionID)
          await apply()
          break
        case "permission.asked":
          addPrompt("permission", properties)
          await apply()
          break
        case "question.asked":
          addPrompt("question", properties)
          await apply()
          break
        case "permission.replied":
          removePrompt("permission", properties)
          await apply()
          break
        case "question.replied":
        case "question.rejected":
          removePrompt("question", properties)
          await apply()
          break
        case "session.compacted":
          addBusy(properties.sessionID)
          await apply()
          break
        case "session.deleted":
          if (properties.info?.id) {
            busy.delete(properties.info.id)
            pendingPrompts.delete(properties.info.id)
          }
          await apply()
          break
      }
    },
  }
}

function promptKey(type, properties) {
  const id = properties.id ?? properties.requestID ?? properties.questionID
  return `${type}:${id ?? "session"}`
}

function createReporter(env, pane) {
  const hook = join(homedir(), ".config", "tmux", "opencode-status-hook.sh")
  return (state) =>
    new Promise((resolve) => {
      const child = spawn("bash", [hook, state, pane], { env, stdio: "ignore" })
      child.on("error", resolve)
      child.on("close", resolve)
    })
}
