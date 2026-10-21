# Contracts plus types plus DRY

Scope: origin validation, date math across runtimes, config DSLs, dual caches, dual ingest paths. Plus type safety: assertions, non-null or unchecked-cast operators, dynamic or `any` types, external parsing, worker messages, duplicated runtime checks.

Inspect for: origin checks in several places, date helpers in 2 runtimes, several parsers for one input kind, client cache plus server cache table, import binary plus store import plus seed. Isolate casts at IO or platform bounds. Validate external data once. Keep untyped values out of domain code. Require explicit null handling. Flag type casts, nullish coalescing, and optional chaining that hide missing-value branches instead of handling null explicitly.

Return concise findings using `reporting.md`: relevant background, the direct change, source evidence, and verification. Group by contract, not by file.
