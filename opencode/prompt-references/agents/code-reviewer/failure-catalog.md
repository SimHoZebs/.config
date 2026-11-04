# Failure catalog — historical escapes

Check each relevant class before assessing a new change. Attest in output:
`Failure-catalog classes checked: [...]`. Missing attestation invalidates a clean verdict.

1. Sync-owned / lifecycle writes — owner-edit path writing sync-owned lifecycle
   field (`pending`, `syncOwned`, participation gates). Require a state-transition
   matrix. Example: `UpdatePosting` hardcoding `pending = 0` silently settling
   pending charges (fixed 149570d class).
2. Cursor / history-ID establish — initial incremental scan must establish the
   cursor; truncated scans must not skip work. Example: INT-03 scan skip.
3. Trigger-heal on upgraded DBs — relink/update triggers must heal on upgrade,
   not only on fresh install. Example: INT-04 trigger never healed.
4. Guard deletion — nil-default, empty-ref, empty-workspace guards. Deletion
   requires guard-hit or branch evidence, not diff read. Removal broke balances
   and risked panic.
5. Parity / duplicate identity — amount parity, edge-ID identity, 422 dead
   path, query-key identity. Examples: GRP-03 amount parity, VIS-02 duplicate
   edge identity, bank-sync 422 dead code.
6. Dead-code / false rationale — "kept on purpose" and "for chart scales"
   claims require caller grep. Example: `useElementWidth` was dead code while
   main charts used TanStack.
7. Completeness direction — settled rows in -> actual flows out. Consistency
   tests alone are satisfied by $0. Example: money flows showed $0 actuals
   while settled rows existed.
8. Denial observability — 401/503 denials must log a reason and request ID,
   not status only. Example: silent permission 503s with no log line.
9. Stack consistency — one chart stack, native-first, one sender/coordinator,
   one review pipeline, one Sankey. A partial migration is incomplete, and
   local similarity to the deleted pattern is not reuse evidence.
10. N+1 / O(n²) join — per-row `MAX`, per-candidate scan, per-failure rebuild,
    `.find` in render memo. Require batching or index evidence.
11. God-file / mirrored-hook duplication — disjoint-slice reducer, `TODO: split
    god` debt, mirrored pipeline wiring (~120 lines). Split or justify with
    concrete drift risk.
12. State-named symbols — `New`/`Old`/`Temp` names must match visible action
    copy. Example: `NewTransactionEditor` renamed to `AddTransactionDialog` to
    match "Add planned transaction".

For each class that applies, state whether it was checked and what evidence
settled it. Mark non-applicable classes `N/A` with a one-line reason.
