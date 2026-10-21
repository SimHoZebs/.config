# Backend domain

Scope: core computation kernel; rule, evaluation, or scoring engines; value-resolution frameworks; versioned data pipelines; history replay or event sourcing; checkpoint or snapshot mechanisms; claim, link, or dedup mechanisms.

Inspect for: duplicate rule or evaluation engines, nested simulators or branch simulations inside evaluators, unused resolver or provider verbs, pipelines that version small values, replay rules that derive storable state, claim or link mechanisms that fix double counts the split introduced. Before recommending deletion of a framework, check its extension trajectory: stated plugin or parity goals, recent commits extending it, user-mandated keeps. Deletion and extension are opposite goals. Name which one the evidence supports. Dead members, legacy columns, and unused verbs stay flaggable even when the framework itself is kept.

Return concise findings using `reporting.md`: relevant background, the direct change, source evidence, and verification. For framework findings, state deletion vs extension explicitly with the supporting evidence.
