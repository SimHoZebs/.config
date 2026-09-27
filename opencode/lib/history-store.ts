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
  return process.env.OPENCODE_DB ?? process.env.OPENCODE_DB_PATH ?? join(dataHome, "opencode", "opencode.db")
}

export function parseSince(value: string | undefined) {
  if (!value) return undefined
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) throw new Error(`Invalid date: ${value}`)
  return timestamp
}

type ListSessionsOptions = {
  limit?: number
  directory?: string
  search?: string
  includeArchived?: boolean
}

type SearchOptions = {
  query: string
  limit?: number
  directory?: string
  projectID?: string
  sessionID?: string
  role?: Role
  since?: number
  includeTools?: boolean
}

type TranscriptOptions = {
  sessionID: string
  limit?: number
  role?: Role
  includeTools?: boolean
}

export class ChatHistory {
  private readonly database: Database
  private hasLegacySchema = false
  private hasV2Schema = false
  readonly path: string

  constructor(path = defaultDatabasePath()) {
    this.path = path
    if (!existsSync(path)) throw new Error(`OpenCode database not found: ${path}`)
    this.database = new Database(path, { readonly: true, strict: true })
    this.database.run("PRAGMA query_only = ON")
    this.assertSchema()
  }

  close() {
    this.database.close()
  }

  listSessions(options: ListSessionsOptions = {}): SessionSummary[] {
    const limit = normalizeLimit(options.limit)
    const sessions = [
      ...(this.hasV2Schema ? this.listSessionsFrom("session_v2", options, limit) : []),
      ...(this.hasLegacySchema ? this.listSessionsFrom("session", options, limit) : []),
    ]
    return sessions.sort((left, right) => right.updated - left.updated).slice(0, limit)
  }

  getProjectID(sessionID: string): string | null {
    if (this.hasV2Schema) {
      const row = this.database
        .query<{ project_id: string }, [string]>(
          "SELECT project_id FROM session_v2 WHERE id = ?",
        )
        .get(sessionID)
      if (row) return row.project_id
    }
    if (this.hasLegacySchema) {
      return this.database
        .query<{ project_id: string }, [string]>(
          "SELECT project_id FROM session WHERE id = ?",
        )
        .get(sessionID)?.project_id ?? null
    }
    return null
  }

  getAgent(sessionID: string): string | null {
    if (this.hasV2Schema) {
      const row = this.database
        .query<{ agent: string | null }, [string]>(
          "SELECT agent FROM session_v2 WHERE id = ?",
        )
        .get(sessionID)
      if (row) return row.agent
    }
    if (this.hasLegacySchema) {
      return this.database
        .query<{ agent: string | null }, [string]>(
          "SELECT agent FROM session WHERE id = ?",
        )
        .get(sessionID)?.agent ?? null
    }
    return null
  }

  private listSessionsFrom(
    table: "session" | "session_v2",
    options: ListSessionsOptions,
    limit: number,
  ): SessionSummary[] {
    const clauses = [] as string[]
    const params = [] as Array<string | number>

    if (!options.includeArchived) clauses.push("time_archived IS NULL")
    if (table === "session" && this.hasV2Schema) {
      clauses.push("NOT EXISTS (SELECT 1 FROM session_v2 v2 WHERE v2.id = session.id)")
    }
    if (options.directory) {
      clauses.push("directory = ?")
      params.push(options.directory)
    }
    if (options.search) {
      clauses.push("instr(lower(title), lower(?)) > 0")
      params.push(options.search)
    }

    params.push(limit)
    return this.database
      .query<SessionRow, Array<string | number>>(
        `SELECT id, COALESCE(title, '') AS title, directory, parent_id, time_created, time_updated
         FROM ${table}
         ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
         ORDER BY time_updated DESC
         LIMIT ?`,
      )
      .all(...params)
      .map(toSessionSummary)
  }

  search(options: SearchOptions): SearchMatch[] {
    const query = options.query.trim()
    if (!query) throw new Error("Search query cannot be empty")
    const limit = normalizeLimit(options.limit)
    const matches = [
      ...(this.hasV2Schema ? this.searchV2(options, query, limit) : []),
      ...(this.hasLegacySchema ? this.searchLegacy(options, query, limit) : []),
    ]
    return matches.sort((left, right) => right.updated - left.updated).slice(0, limit)
  }

  private searchLegacy(options: SearchOptions, query: string, limit: number): SearchMatch[] {
    const sessionClauses = ["s.time_archived IS NULL"]
    const sessionParams = [] as Array<string | number>
    if (this.hasV2Schema) {
      sessionClauses.push("NOT EXISTS (SELECT 1 FROM session_v2 v2 WHERE v2.id = s.id)")
    }
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
    const partTypes = options.includeTools ? "'text', 'tool', 'file', 'patch'" : "'text'"
    const roleClause = options.role ? "AND json_extract(m.data, '$.role') = ?" : ""
    const titleSinceClause = options.since !== undefined ? "AND s.time_updated >= ?" : ""
    const contentSinceClause = options.since !== undefined ? "AND m.time_created >= ?" : ""
    const titleQuery = `
      SELECT s.id, s.title, s.directory, s.parent_id, s.time_created, s.time_updated,
             NULL AS message_id, NULL AS part_id, NULL AS role, 'title' AS match_type,
             s.title AS content
      FROM session s
      WHERE ${sessionClauses.join(" AND ")}
        ${titleSinceClause}
        AND ${options.role ? "0" : "instr(lower(s.title), lower(?)) > 0"}`

    const contentExpression = searchableContentExpression()
    const params = [
      ...sessionParams,
      ...(options.since !== undefined ? [options.since] : []),
      ...(!options.role ? [query] : []),
      ...sessionParams,
      ...(options.role ? [options.role] : []),
      ...(options.since !== undefined ? [options.since] : []),
      query,
      limit,
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
             ${contentSinceClause}
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

  private searchV2(options: SearchOptions, query: string, limit: number): SearchMatch[] {
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

    const partTypes = options.includeTools ? "'text', 'tool', 'file', 'patch'" : "'text'"
    const titleSinceClause = options.since !== undefined ? "AND s.time_updated >= ?" : ""
    const contentSinceClause = options.since !== undefined ? "AND sm.time_created >= ?" : ""
    const userRoleClause = options.role === "assistant" ? "AND 0" : ""
    const assistantRoleClause = options.role === "user" ? "AND 0" : ""
    const contentExpression = searchableV2ContentExpression("c.value")
    const params = [
      ...sessionParams,
      ...(options.since !== undefined ? [options.since] : []),
      ...(!options.role ? [query] : []),
      ...sessionParams,
      ...(options.since !== undefined ? [options.since] : []),
      query,
      ...sessionParams,
      ...(options.since !== undefined ? [options.since] : []),
      query,
      limit,
    ]

    const rows = this.database
      .query<SearchRow, Array<string | number>>(
        `WITH matches AS (
           SELECT s.id, COALESCE(s.title, '') AS title, s.directory, s.parent_id,
                  s.time_created, s.time_updated, NULL AS message_id, NULL AS part_id,
                  NULL AS role, 'title' AS match_type, COALESCE(s.title, '') AS content
           FROM session_v2 s
           WHERE ${sessionClauses.join(" AND ")}
             ${titleSinceClause}
             AND ${options.role ? "0" : "instr(lower(COALESCE(s.title, '')), lower(?)) > 0"}
           UNION ALL
           SELECT s.id, COALESCE(s.title, '') AS title, s.directory, s.parent_id,
                  s.time_created, s.time_updated, sm.id AS message_id,
                  sm.id || ':text' AS part_id, 'user' AS role, 'text' AS match_type,
                  COALESCE(json_extract(sm.data, '$.text'), '') AS content
           FROM session_v2 s
           JOIN session_message sm ON sm.session_id = s.id
           WHERE ${sessionClauses.join(" AND ")}
             AND sm.type = 'user'
             ${userRoleClause}
             ${contentSinceClause}
             AND instr(lower(COALESCE(json_extract(sm.data, '$.text'), '')), lower(?)) > 0
           UNION ALL
           SELECT s.id, COALESCE(s.title, '') AS title, s.directory, s.parent_id,
                  s.time_created, s.time_updated, sm.id AS message_id,
                  COALESCE(json_extract(c.value, '$.id'), sm.id || ':' || c.key) AS part_id,
                  'assistant' AS role, json_extract(c.value, '$.type') AS match_type,
                  ${contentExpression} AS content
           FROM session_v2 s
           JOIN session_message sm ON sm.session_id = s.id
           JOIN json_each(sm.data, '$.content') c
           WHERE ${sessionClauses.join(" AND ")}
             AND sm.type = 'assistant'
             ${assistantRoleClause}
             ${contentSinceClause}
             AND json_extract(c.value, '$.type') IN (${partTypes})
             AND COALESCE(json_extract(c.value, '$.synthetic'), 0) = 0
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

  getTranscript(options: TranscriptOptions): SessionTranscript | null {
    this.database.run("BEGIN")
    try {
      if (this.hasV2Schema) {
        const transcript = this.getV2TranscriptSnapshot(options)
        if (transcript) return transcript
      }
      return this.hasLegacySchema ? this.getLegacyTranscriptSnapshot(options) : null
    } finally {
      this.database.run("ROLLBACK")
    }
  }

  private getLegacyTranscriptSnapshot(options: TranscriptOptions): SessionTranscript | null {
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

  private getV2TranscriptSnapshot(options: TranscriptOptions): SessionTranscript | null {
    const sessionRow = this.database
      .query<SessionRow, [string]>(
        `SELECT id, COALESCE(title, '') AS title, directory, parent_id, time_created, time_updated
         FROM session_v2 WHERE id = ?`,
      )
      .get(options.sessionID)
    if (!sessionRow) return null

    const roleClause = options.role ? "AND sm.type = ?" : ""
    const types = options.includeTools ? "'text', 'tool', 'file', 'patch'" : "'text'"
    const params = [
      options.sessionID,
      ...(options.role ? [options.role] : []),
      normalizeLimit(options.limit),
    ]
    const messages = this.database
      .query<V2MessageRow, Array<string | number>>(
        `SELECT id, type AS role, time_created, data
         FROM (
           SELECT sm.id, sm.type, sm.time_created, sm.data
           FROM session_message sm
           WHERE sm.session_id = ?
             AND sm.type IN ('user', 'assistant')
             ${roleClause}
             AND (
               (sm.type = 'user' AND json_type(sm.data, '$.text') = 'text')
               OR
               (sm.type = 'assistant' AND EXISTS (
                 SELECT 1 FROM json_each(sm.data, '$.content') candidate
                 WHERE json_extract(candidate.value, '$.type') IN (${types})
                   AND COALESCE(json_extract(candidate.value, '$.synthetic'), 0) = 0
               ))
             )
           ORDER BY sm.time_created DESC
           LIMIT ?
         )
         ORDER BY time_created ASC`,
      )
      .all(...params)

    return {
      session: toSessionSummary(sessionRow),
      messages: messages.map((message) => ({
        id: message.id,
        role: message.role,
        created: message.time_created,
        parts: v2MessageParts(message, options.includeTools ?? false),
      })),
    }
  }

  private assertSchema() {
    const rows = this.database
      .query<{ name: string }, []>(
        `SELECT name FROM sqlite_master
         WHERE type = 'table'
           AND name IN ('session', 'message', 'part', 'session_v2', 'session_message')`,
      )
      .all()
    const names = new Set(rows.map((row) => row.name))
    this.hasLegacySchema = ["session", "message", "part"].every((name) => names.has(name))
    this.hasV2Schema = ["session_v2", "session_message"].every((name) => names.has(name))
    if (!this.hasLegacySchema && !this.hasV2Schema) {
      throw new Error("Unsupported OpenCode database schema")
    }
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

function searchableV2ContentExpression(value: string) {
  return `CASE json_extract(${value}, '$.type')
    WHEN 'text' THEN COALESCE(json_extract(${value}, '$.text'), '')
    WHEN 'tool' THEN COALESCE(json_extract(${value}, '$.name'), '') || ' ' ||
      COALESCE(json_extract(${value}, '$.state.input'), '') || ' ' ||
      COALESCE(json_extract(${value}, '$.state.metadata.output'), '') || ' ' ||
      COALESCE(json_extract(${value}, '$.state.error'), '') || ' ' ||
      COALESCE((
        SELECT group_concat(COALESCE(json_extract(output_part.value, '$.text'), ''), ' ')
        FROM json_each(${value}, '$.state.content') output_part
        WHERE json_extract(output_part.value, '$.type') = 'text'
      ), '')
    WHEN 'file' THEN COALESCE(json_extract(${value}, '$.filename'), '')
    WHEN 'patch' THEN COALESCE(json_extract(${value}, '$.hash'), '') || ' ' ||
      COALESCE(json_extract(${value}, '$.files'), '')
    ELSE '' END`
}

function v2MessageParts(message: V2MessageRow, includeTools: boolean): TranscriptMessage["parts"] {
  const data = parseObject(message.data)
  if (message.role === "user") {
    const text = typeof data.text === "string" ? data.text : ""
    return text
      ? [{ id: `${message.id}:text`, type: "text", content: truncate(text, PART_LENGTH) }]
      : []
  }

  if (!Array.isArray(data.content)) return []
  const allowed = new Set(includeTools ? ["text", "tool", "file", "patch"] : ["text"])
  const parts = [] as TranscriptMessage["parts"]
  data.content.forEach((candidate, index) => {
    const part = asObject(candidate)
    const type = part.type
    if (typeof type !== "string" || !allowed.has(type) || part.synthetic) return
    const state = asObject(part.state)
    const metadata = asObject(state.metadata)
    const outputParts = Array.isArray(state.content)
      ? state.content
          .map(asObject)
          .filter((output) => output.type === "text" && typeof output.text === "string")
          .map((output) => output.text as string)
      : []
    const row: PartRow = {
      id: typeof part.id === "string" ? part.id : `${message.id}:${index}`,
      message_id: message.id,
      type: type as PartRow["type"],
      text: typeof part.text === "string" ? part.text : "",
      tool: typeof part.name === "string" ? part.name : null,
      status: typeof state.status === "string" ? state.status : null,
      input: displayValue(state.input),
      output: outputParts.join("\n") || displayValue(metadata.output ?? state.output),
      error: displayValue(state.error),
      filename: typeof part.filename === "string" ? part.filename : null,
      files: displayValue(part.files),
    }
    const content = displayPart(row)
    if (content) parts.push({ id: row.id, type: row.type, content })
  })
  return parts
}

function parseObject(value: string) {
  try {
    return asObject(JSON.parse(value))
  } catch {
    return {} as Record<string, unknown>
  }
}

function asObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function displayValue(value: unknown) {
  if (typeof value === "string") return value
  if (value === undefined || value === null) return ""
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
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

type V2MessageRow = MessageRow & {
  data: string
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
