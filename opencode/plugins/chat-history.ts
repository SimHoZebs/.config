import {
  ChatHistory,
  formatSearchResults,
  formatTranscript,
  parseSince,
  type Role,
} from "../lib/history-store.ts"

const commonProperties = {
  limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
  role: { type: "string", enum: ["user", "assistant"] },
  includeTools: { type: "boolean", default: false },
}

type HistoryArgs = {
  query?: string
  scope?: "current" | "project" | "all"
  sessionID?: string
  limit?: number
  role?: Role
  since?: string
  includeTools?: boolean
}

async function installPlugin(ctx: any) {
  await ctx.tool.transform((tools: any) => {
    tools.add({
      name: "chat_history_current",
      options: { codemode: false },
      description:
        "Read or search the current OpenCode chat transcript. Use to recover earlier details from this session without guessing its session ID.",
      input: {
        type: "object",
        properties: {
          query: { type: "string", description: "Optional text to search within the current session" },
          ...commonProperties,
        },
        additionalProperties: false,
      },
      execute: async (args: HistoryArgs, toolContext: { sessionID: string }) => ({
        content: currentHistory(args, toolContext.sessionID),
      }),
    })

    tools.add({
      name: "chat_history_search",
      options: { codemode: false },
      description:
        "Search OpenCode chat history by text. Defaults to the current project; widen to all sessions only when the user asks for global history.",
      input: {
        type: "object",
        properties: {
          query: { type: "string", minLength: 1 },
          scope: { type: "string", enum: ["current", "project", "all"], default: "project" },
          since: { type: "string", description: "Date or timestamp accepted by JavaScript Date.parse" },
          ...commonProperties,
        },
        required: ["query"],
        additionalProperties: false,
      },
      execute: async (args: HistoryArgs, toolContext: { sessionID: string }) => ({
        content: searchHistory(args, toolContext.sessionID),
      }),
    })

    tools.add({
      name: "chat_history_get",
      options: { codemode: false },
      description: "Retrieve recent messages from a specific OpenCode session selected from history search results.",
      input: {
        type: "object",
        properties: {
          sessionID: { type: "string", minLength: 1 },
          ...commonProperties,
        },
        required: ["sessionID"],
        additionalProperties: false,
      },
      execute: async (args: HistoryArgs) => ({
        content: getHistory(args),
      }),
    })
  })
}

function currentHistory(args: HistoryArgs, sessionID: string) {
  return withHistory((history) => {
    if (args.query) {
      return formatSearchResults(history.search({
        query: args.query,
        sessionID,
        limit: args.limit ?? 20,
        role: args.role,
        includeTools: args.includeTools ?? false,
      }))
    }
    const transcript = history.getTranscript({
      sessionID,
      limit: args.limit ?? 20,
      role: args.role,
      includeTools: args.includeTools ?? false,
    })
    return transcript ? formatTranscript(transcript) : "Current session was not found in history."
  })
}

function searchHistory(args: HistoryArgs, currentSessionID: string) {
  if (!args.query) throw new Error("Search query cannot be empty")
  return withHistory((history) => {
    const scope = args.scope ?? "project"
    const projectID = scope === "project" ? history.getProjectID(currentSessionID) : undefined
    if (scope === "project" && !projectID) {
      throw new Error("Cannot resolve the current project for project-scoped history search")
    }
    return formatSearchResults(history.search({
      query: args.query!,
      sessionID: scope === "current" ? currentSessionID : undefined,
      projectID: projectID ?? undefined,
      limit: args.limit ?? 20,
      role: args.role,
      since: parseSince(args.since),
      includeTools: args.includeTools ?? false,
    }))
  })
}

function getHistory(args: HistoryArgs) {
  if (!args.sessionID) throw new Error("sessionID is required")
  return withHistory((history) => {
    const transcript = history.getTranscript({
      sessionID: args.sessionID!,
      limit: args.limit ?? 20,
      role: args.role,
      includeTools: args.includeTools ?? false,
    })
    return transcript ? formatTranscript(transcript) : `Session not found: ${args.sessionID}`
  })
}

function withHistory<T>(operation: (history: ChatHistory) => T) {
  const history = new ChatHistory()
  try {
    return operation(history)
  } finally {
    history.close()
  }
}

export default {
  id: "local.chat-history",
  setup: installPlugin,
}
