export function buildHistorySearch(options) {
  const sessionClauses = ["s.time_archived IS NULL"]
  const sessionParams = []
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
  const contentExpression = searchableContentExpression()
  const titleQuery = `
    SELECT s.id, s.title, s.directory, s.parent_id, s.time_created, s.time_updated,
           NULL AS message_id, NULL AS part_id, NULL AS role, 'title' AS match_type,
           s.title AS content
    FROM session s
    WHERE ${sessionClauses.join(" AND ")}
      ${titleSinceClause}
      AND ${options.role ? "0" : "instr(lower(s.title), lower(?)) > 0"}`

  const params = [
    ...sessionParams,
    ...(options.since !== undefined ? [options.since] : []),
    ...(!options.role ? [options.query] : []),
    ...sessionParams,
    ...(options.role ? [options.role] : []),
    ...(options.since !== undefined ? [options.since] : []),
    options.query,
    options.limit,
  ]

  return {
    sql: `WITH matches AS (
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
    params,
  }
}

export function searchableContentExpression() {
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
