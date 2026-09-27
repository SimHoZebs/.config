# Types, performance, and verification

For type safety, inspect assertions, non-null operators, `any`, external parsing,
worker messages, and duplicated runtime checks. Isolate unavoidable casts at IO or
platform boundaries, validate external data once, and keep untyped values out of
domain and rendering code. A low cast count concentrated at boundaries is healthy.

For render performance, look for measured or structurally evident costs:

- expensive derivation during render;
- broad subscriptions to frequently changing child-only state;
- unstable values defeating an existing memoization boundary;
- effects that mirror props or derive state and therefore add a render; and
- manual memoization with no supported benefit or with stale-data risk.

Prefer framework/compiler behavior, focused subscriptions, selectors, and direct
derivation before caching or virtualization. Recommend profiling when the cost is
not established.

Verification findings must name the behavior a check protects. Relevant checks
include typecheck after API or import changes, behavioral tests instead of snapshot
updates alone, build checks for routes and workers, old-path searches after moves,
and `git diff --check` plus status inspection for unrelated artifacts or secrets.
