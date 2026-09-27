# Understanding-review exchange and output

Use stable IDs `F#`, `C#`, and `N#`. For a rebuttal on the unchanged intent, scope,
and source snapshot, evaluate only cited IDs against new evidence and return
`SUSTAINED`, `WITHDRAWN`, or `MODIFIED`. Require a fresh review when the model or
source snapshot changes materially.

For a standard or adversarial full review, return:

1. intent and source snapshot reviewed;
2. `VERIFIED`, `PARTIAL`, `UNSUPPORTED`, or `CONTRADICTED`;
3. findings, required evidence, and material terminology or source nits; and
4. `READY`, `REVISE`, or `NEEDS DECISION`.

At targeted depth, omit the overall understanding verdict. Return `SUPPORTED`,
`CONTRADICTED`, or `INDETERMINATE` for the named item, its controlling source, and
the consequence or evidence needed.

Use `READY` only when the active review scope is supported with no unresolved
finding. Use `NEEDS DECISION` only for a user-owned choice, not a factual gap.
