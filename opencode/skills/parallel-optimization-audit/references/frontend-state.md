# Frontend state plus render performance

Scope: stores, remote hooks, adapters, contracts, clients, stream handling, client-persisted schemas, fingerprints, snapshots, double caches. Plus render cost: derivation during render, broad subscriptions to child-only state, unstable values that break memoization, effects that mirror props, manual memoization with no proof.

Inspect for: parallel model shapes, parallel persisted schemas, snapshots for recomputable data, client cache over server cache, mirrored adapter branches, store epochs that duplicate query state.

Return concise findings using `reporting.md`: relevant background, the direct change, source evidence, and verification. State an architectural directive when it constrains the proposed removal. Distinguish measured render cost from structural cost.
