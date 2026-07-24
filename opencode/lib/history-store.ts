import { Database } from "bun:sqlite"
import { existsSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100
const EXCERPT_LENGTH = 320
const PART_LENGTH = 2_000
const OUTPUT_LENGTH = 24_000

export type Role = "user" | "assistant"

export type SessionSummary = {
  id: string
  title: string
  directory: string
  parentID: string | null
  created: number
  updated: number
}

export type SearchMatch = SessionSummary & {
  messageID: string | null
  partID: string | null
  role: Role | null
  matchType: "title" | "text" | "tool" | "file" | "patch"
  excerpt: string
}

export type TranscriptMessage = {
  id: string
  role: Role
  created: number
  parts: Array<{
    id: string
    type: "text" | "tool" | "file" | "patch"
    content: string
  }>
}

export type SessionTranscript = {
  session: SessionSummary
  messages: TranscriptMessage[]
}

export function defaultDatabasePath() {
  const dataHome = process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share")
  return process.env.OPENCODE_DB_PATH ?? join(dataHome, "opencode", "opencode.db")
}

export function parseSince(value: string | undefined) {
  if (!value) return undefined
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) throw new Error(`Invalid date: ${value}`)
  return timestamp
}

export class ChatHistory {
  private readonly database: Database

  constructor(readonly path = defaultDatabasePath()) {
    if (!existsSync(path)) throw new Error(`OpenCode database not found: ${path}`)
    this.database = new Database(path, { readonly: true, strict: true })
    this.database.run("PRAGMA query_only = ON")
    this.assertSchema()
  }

  close() {
    this.database.close()
  }

  listSessions(options: {
    limit?: number
    directory?: string
    search?: string
    includeArchived?: boolean
  } = {}): SessionSummary[] {
    const clauses = [] as string[]
    const params = [] as Array<string | number>

    if (!options.includeArchived) clauses.push("time_archived IS NULL")
    if (options.directory) {
      clauses.push("directory = ?")
      params.push(options.directory)
    }
    if (options.search) {
      clauses.push("instr(lower(title), lower(?)) > 0")
      params.push(options.search)
    }

    params.push(normalizeLimit(options.limit))
    return this.database
      .query<SessionRow, Array<string | number>>(
        `SELECT id, title, directory, parent_id, time_created, time_updated
         FROM session
         ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
         ORDER BY time_updated DESC
         LIMIT ?`,
      )
      .all(...params)
      .map(toSessionSummary)
  }

  search(options: {
    query: string
    limit?: number
    directory?: string
    projectID?: string
    sessionID?: string
    role?: Role
    since?: number
    includeTools?: boolean
  }): SearchMatch[] {
    const query = options.query.trim()
    if (!query) throw new Error("Search query cannot be empty")

    const sessionClauses = ["s.time_archived IS NULL"]
    const sessionParams = [] as Array<string | number>
    if (options.directory) {
      sessionClauses.push("s.directory = ?")
      sessionParams.push(options.directory)
    }
    if (options.projectID) {
      sessionClauses.push("s.project_id = ?")
      sessionParams.push(options.projectID)
    }
    if (options.sessionID) {
      sessionClauses.push("s.id = ?")
      sessionParams.push(options.sessionID)
    }
    if (options.since !== undefined) {
      sessionClauses.push("s.time_updated >= ?")
      sessionParams.push(options.since)
    }

    const partTypes = options.includeTools ? "'text', 'tool', 'file', 'patch'" : "'text'"
    const roleClause = options.role ? "AND json_extract(m.data, '$.role') = ?" : ""
    const titleQuery = `
      SELECT s.id, s.title, s.directory, s.parent_id, s.time_created, s.time_updated,
             NULL AS message_id, NULL AS part_id, NULL AS role, 'title' AS match_type,
             s.title AS content
      FROM session s
      WHERE ${sessionClauses.join(" AND ")}
        AND ${options.role ? "0" : "instr(lower(s.title), lower(?)) > 0"}`

    const contentExpression = searchableContentExpression()
    const params = [
      ...sessionParams,
      ...(!options.role ? [query] : []),
      ...sessionParams,
      ...(options.role ? [options.role] : []),
      query,
      normalizeLimit(options.limit),
    ]

    const rows = this.database
      .query<SearchRow, Array<string | number>>(
        `WITH matches AS (
           ${titleQuery}
           UNION ALL
           SELECT s.id, s.title, s.directory, s.parent_id, s.time_created, s.time_updated,
                  m.id AS message_id, p.id AS part_id,
                  json_extract(m.data, '$.role') AS role,
                  json_extract(p.data, '$.type') AS match_type,
                  ${contentExpression} AS content
           FROM session s
           JOIN message m ON m.session_id = s.id
           JOIN part p ON p.message_id = m.id
           WHERE ${sessionClauses.join(" AND ")}
             ${roleClause}
             AND json_extract(p.data, '$.type') IN (${partTypes})
             AND COALESCE(json_extract(p.data, '$.synthetic'), 0) = 0
             AND instr(lower(${contentExpression}), lower(?)) > 0
         )
         SELECT * FROM matches
         ORDER BY time_updated DESC
         LIMIT ?`,
      )
      .all(...params)

    return rows.map((row) => ({
      ...toSessionSummary(row),
      messageID: row.message_id,
      partID: row.part_id,
      role: row.role,
      matchType: row.match_type,
      excerpt: excerpt(row.content, query),
    }))
  }

  getTranscript(options: {
    sessionID: string
    limit?: number
    role?: Role
    includeTools?: boolean
  }): SessionTranscript | null {
    this.database.run("BEGIN")
    try {
      return this.getTranscriptSnapshot(options)
    } finally {
      this.database.run("ROLLBACK")
    }
  }

  private getTranscriptSnapshot(options: {
    sessionID: string
    limit?: number
    role?: Role
    includeTools?: boolean
  }): SessionTranscript | null {
    const sessionRow = this.database
      .query<SessionRow, [string]>(
        `SELECT id, title, directory, parent_id, time_created, time_updated
         FROM session WHERE id = ?`,
      )
      .get(options.sessionID)
    if (!sessionRow) return null

    const roleClause = options.role ? "AND json_extract(m.data, '$.role') = ?" : ""
    const types = options.includeTools ? "'text', 'tool', 'file', 'patch'" : "'text'"
    const messageParams = [
      options.sessionID,
      ...(options.role ? [options.role] : []),
      normalizeLimit(options.limit),
    ]
    const messages = this.database
      .query<MessageRow, Array<string | number>>(
        `SELECT id, time_created, json_extract(data, '$.role') AS role
         FROM (
           SELECT m.id, m.time_created, m.data
           FROM message m
           WHERE m.session_id = ? ${roleClause}
             AND EXISTS (
               SELECT 1 FROM part candidate
               WHERE candidate.message_id = m.id
                 AND json_extract(candidate.data, '$.type') IN (${types})
                 AND COALESCE(json_extract(candidate.data, '$.synthetic'), 0) = 0
             )
           ORDER BY m.time_created DESC
           LIMIT ?
         )
         ORDER BY time_created ASC`,
      )
      .all(...messageParams)

    if (!messages.length) return { session: toSessionSummary(sessionRow), messages: [] }

    const messageIDs = messages.map((message) => message.id)
    const placeholders = messageIDs.map(() => "?").join(", ")
    const parts = this.database
      .query<PartRow, string[]>(
        `SELECT id, message_id, json_extract(data, '$.type') AS type,
                substr(COALESCE(json_extract(data, '$.text'), ''), 1, ${PART_LENGTH + 1}) AS text,
                json_extract(data, '$.tool') AS tool,
                json_extract(data, '$.state.status') AS status,
                substr(CAST(COALESCE(json_extract(data, '$.state.input'), '') AS TEXT), 1, ${PART_LENGTH + 1}) AS input,
                substr(CAST(COALESCE(json_extract(data, '$.state.output'), '') AS TEXT), 1, ${PART_LENGTH + 1}) AS output,
                substr(CAST(COALESCE(json_extract(data, '$.state.error'), '') AS TEXT), 1, ${PART_LENGTH + 1}) AS error,
                json_extract(data, '$.filename') AS filename,
                substr(CAST(COALESCE(json_extract(data, '$.files'), '') AS TEXT), 1, ${PART_LENGTH + 1}) AS files
         FROM part
         WHERE message_id IN (${placeholders})
           AND json_extract(data, '$.type') IN (${types})
           AND COALESCE(json_extract(data, '$.synthetic'), 0) = 0
         ORDER BY time_created ASC`,
      )
      .all(...messageIDs)

    const partsByMessage = new Map<string, TranscriptMessage["parts"]>()
    for (const part of parts) {
      const content = displayPart(part)
      if (!content) continue
      const bucket = partsByMessage.get(part.message_id) ?? []
      bucket.push({ id: part.id, type: part.type, content })
      partsByMessage.set(part.message_id, bucket)
    }

    return {
      session: toSessionSummary(sessionRow),
      messages: messages.map((message) => ({
        id: message.id,
        role: message.role,
        created: message.time_created,
        parts: partsByMessage.get(message.id) ?? [],
      })),
    }
  }

  private assertSchema() {
    const rows = this.database
      .query<{ name: string }, []>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('session', 'message', 'part')",
      )
      .all()
    if (rows.length !== 3) throw new Error("Unsupported OpenCode database schema")
  }
}

export function formatSessionList(sessions: SessionSummary[]) {
  if (!sessions.length) return "No sessions found."
  return truncate(sessions
    .map((session) =>
      [
        session.id,
        session.title,
        new Date(session.updated).toISOString(),
        session.directory,
      ].join("\t"),
    )
    .join("\n"), OUTPUT_LENGTH)
}

export function formatSearchResults(matches: SearchMatch[]) {
  if (!matches.length) return "No history matches found."
  const output = matches
    .map((match) => {
      const source = [match.matchType, match.role, match.messageID].filter(Boolean).join(" / ")
      return `## ${match.title}\nSession: ${match.id}\nUpdated: ${new Date(match.updated).toISOString()}\nSource: ${source}\n${match.excerpt}`
    })
    .join("\n\n")
  return truncate(output, OUTPUT_LENGTH)
}

export function formatTranscript(transcript: SessionTranscript) {
  const header = `# ${transcript.session.title}\nSession: ${transcript.session.id}\nDirectory: ${transcript.session.directory}`
  const sections = transcript.messages
    .filter((message) => message.parts.length)
    .map((message) => {
      const content = message.parts.map((part) => part.content).join("\n\n")
      return `## ${message.role} · ${new Date(message.created).toISOString()}\n${content}`
    })
  if (!sections.length) return header

  const selected = [] as string[]
  let length = header.length
  for (let index = sections.length - 1; index >= 0; index--) {
    const section = sections[index]
    if (length + section.length + 2 > OUTPUT_LENGTH && selected.length) break
    selected.unshift(section)
    length += section.length + 2
  }
  const omitted = sections.length - selected.length
  const notice = omitted ? `\n\n...[${omitted} older message${omitted === 1 ? "" : "s"} omitted]` : ""
  return truncate(`${header}${notice}\n\n${selected.join("\n\n")}`, OUTPUT_LENGTH)
}

function normalizeLimit(limit = DEFAULT_LIMIT) {
  if (!Number.isFinite(limit) || limit < 1) throw new Error("Limit must be a positive number")
  return Math.min(Math.floor(limit), MAX_LIMIT)
}

function searchableContentExpression() {
  return `CASE json_extract(p.data, '$.type')
    WHEN 'text' THEN COALESCE(json_extract(p.data, '$.text'), '')
    WHEN 'tool' THEN COALESCE(json_extract(p.data, '$.tool'), '') || ' ' ||
      COALESCE(json_extract(p.data, '$.state.input'), '') || ' ' ||
      COALESCE(json_extract(p.data, '$.state.output'), '')
    WHEN 'file' THEN COALESCE(json_extract(p.data, '$.filename'), '')
    WHEN 'patch' THEN COALESCE(json_extract(p.data, '$.hash'), '') || ' ' ||
      COALESCE(json_extract(p.data, '$.files'), '')
    ELSE '' END`
}

function displayPart(part: PartRow) {
  if (part.type === "text") return truncate(part.text, PART_LENGTH)
  if (part.type === "file") return part.filename ? `[file: ${part.filename}]` : ""
  if (part.type === "patch") {
    return part.files ? `[patch: ${truncate(part.files, PART_LENGTH)}]` : "[patch]"
  }
  if (part.type === "tool") {
    const pieces = [`[tool: ${part.tool ?? "unknown"}${part.status ? ` · ${part.status}` : ""}]`]
    if (part.input) pieces.push(`input: ${part.input}`)
    if (part.output) pieces.push(`output: ${part.output}`)
    if (part.error) pieces.push(`error: ${part.error}`)
    return truncate(pieces.join("\n"), PART_LENGTH)
  }
  return ""
}

function excerpt(content: string, query: string) {
  const normalized = content.replace(/\s+/g, " ").trim()
  const index = normalized.toLocaleLowerCase().indexOf(query.toLocaleLowerCase())
  if (index < 0) return truncate(normalized, EXCERPT_LENGTH)
  const start = Math.max(0, index - Math.floor(EXCERPT_LENGTH / 3))
  const end = Math.min(normalized.length, start + EXCERPT_LENGTH)
  return `${start > 0 ? "..." : ""}${normalized.slice(start, end)}${end < normalized.length ? "..." : ""}`
}

function truncate(value: string, length: number) {
  return value.length > length ? `${value.slice(0, length)}\n...[truncated]` : value
}

function toSessionSummary(row: SessionRow): SessionSummary {
  return {
    id: row.id,
    title: row.title,
    directory: row.directory,
    parentID: row.parent_id,
    created: row.time_created,
    updated: row.time_updated,
  }
}

type SessionRow = {
  id: string
  title: string
  directory: string
  parent_id: string | null
  time_created: number
  time_updated: number
}

type SearchRow = SessionRow & {
  message_id: string | null
  part_id: string | null
  role: Role | null
  match_type: SearchMatch["matchType"]
  content: string
}

type MessageRow = {
  id: string
  role: Role
  time_created: number
}

type PartRow = {
  id: string
  message_id: string
  type: TranscriptMessage["parts"][number]["type"]
  text: string
  tool: string | null
  status: string | null
  input: string
  output: string
  error: string
  filename: string | null
  files: string
}
