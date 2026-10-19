# Frontend state plus render performance

Scope: stores, remote hooks, adapters, contracts, clients, stream handling, client-persisted schemas, fingerprints, snapshots, double caches. Plus render cost: derivation during render, broad subscriptions to child-only state, unstable values that break memoization, effects that mirror props, manual memoization with no proof.

Inspect for: parallel model shapes, parallel persisted schemas, snapshots for recomputable data, client cache over server cache, mirrored adapter branches, store epochs that duplicate query state.

Return: user-observable behavior, `file:line`, code terms used, ordered steps the code takes today, maintenance cost, smallest correction, verification check. State which architectural directive constrains removal. Name the measured or structural render cost.
