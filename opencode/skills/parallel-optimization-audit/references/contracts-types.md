# Contracts plus types plus DRY

Scope: origin validation, date math across runtimes, config DSLs, dual caches, dual ingest paths. Plus type safety: assertions, non-null or unchecked-cast operators, dynamic or `any` types, external parsing, worker messages, duplicated runtime checks.

Inspect for: origin checks in several places, date helpers in 2 runtimes, several parsers for one input kind, client cache plus server cache table, import binary plus store import plus seed. Isolate casts at IO or platform bounds. Validate external data once. Keep untyped values out of domain code.

Return: user-observable behavior, `file:line`, code terms used, ordered steps the code takes today, maintenance cost, smallest correction, verification check. Group by contract, not by file.
