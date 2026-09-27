# State and component boundaries

Classify state before recommending movement: server/cache, persisted domain,
global session, URL/router, feature-scoped, component-local UI, form draft,
derived, or async lifecycle state.

Inspect for:

- raw or partially invalid form input stored globally;
- server data copied into a store without a concrete lifetime need;
- derived values duplicated and synchronized through effects;
- child-only UI state owned by a parent or broad store subscription;
- capability and user preference collapsed into one field;
- controlled props without matching change callbacks;
- one component combining unrelated sections with independent lifetimes;
- components constructing store-owned transitions or mutating fields in sequence;
- repeated selectors, formatters, or worker/request lifecycle mechanics; and
- abstractions that erase meaningful behavior differences through flags.

Prefer local form drafts, derived selectors, focused transition actions, and
orchestration roots that load data and compose cohesive children. Extract a shared
foundation only for an identical semantic contract; keep thin domain-specific
wrappers when their payload, naming, reset, or error behavior differs.

Verify ownership changes through focused store or component tests, typechecking,
and the interaction states whose lifetime changed.
