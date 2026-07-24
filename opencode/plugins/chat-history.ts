import { type Plugin, tool } from "@opencode-ai/plugin"
import {
  ChatHistory,
  formatSearchResults,
  formatTranscript,
  parseSince,
  type Role,
} from "../lib/history-store"

const roleSchema = tool.schema.enum(["user", "assistant"]).optional()

export const ChatHistoryPlugin: Plugin = async ({ project }) => ({
  tool: {
    chat_history_current: tool({
      description:
        "Read or search the current OpenCode chat transcript. Use to recover earlier details from this session without guessing its session ID.",
      args: {
        query: tool.schema.string().optional().describe("Optional text to search within the current session"),
        limit: tool.schema.number().int().min(1).max(100).default(20),
        role: roleSchema,
        includeTools: tool.schema.boolean().default(false),
      },
      async execute(args, context) {
        return withHistory((history) => {
          if (args.query) {
            return formatSearchResults(
              history.search({
                query: args.query,
                sessionID: context.sessionID,
                limit: args.limit,
                role: args.role as Role | undefined,
                includeTools: args.includeTools,
              }),
            )
          }
          const transcript = history.getTranscript({
            sessionID: context.sessionID,
            limit: args.limit,
            role: args.role as Role | undefined,
            includeTools: args.includeTools,
          })
          return transcript ? formatTranscript(transcript) : "Current session was not found in history."
        })
      },
    }),

    chat_history_search: tool({
      description:
        "Search OpenCode chat history by text. Defaults to the current project; widen to all sessions only when the user asks for global history.",
      args: {
        query: tool.schema.string().min(1),
        scope: tool.schema.enum(["current", "project", "all"]).default("project"),
        limit: tool.schema.number().int().min(1).max(100).default(20),
        role: roleSchema,
        since: tool.schema.string().optional().describe("Date or timestamp accepted by JavaScript Date.parse"),
        includeTools: tool.schema.boolean().default(false),
      },
      async execute(args, context) {
        return withHistory((history) =>
          formatSearchResults(
            history.search({
              query: args.query,
              sessionID: args.scope === "current" ? context.sessionID : undefined,
              projectID: args.scope === "project" ? project.id : undefined,
              limit: args.limit,
              role: args.role as Role | undefined,
              since: parseSince(args.since),
              includeTools: args.includeTools,
            }),
          ),
        )
      },
    }),

    chat_history_get: tool({
      description:
        "Retrieve recent messages from a specific OpenCode session selected from history search results.",
      args: {
        sessionID: tool.schema.string().min(1),
        limit: tool.schema.number().int().min(1).max(100).default(20),
        role: roleSchema,
        includeTools: tool.schema.boolean().default(false),
      },
      async execute(args) {
        return withHistory((history) => {
          const transcript = history.getTranscript({
            sessionID: args.sessionID,
            limit: args.limit,
            role: args.role as Role | undefined,
            includeTools: args.includeTools,
          })
          return transcript ? formatTranscript(transcript) : `Session not found: ${args.sessionID}`
        })
      },
    }),
  },
})

function withHistory<T>(operation: (history: ChatHistory) => T) {
  const history = new ChatHistory()
  try {
    return operation(history)
  } finally {
    history.close()
  }
}
