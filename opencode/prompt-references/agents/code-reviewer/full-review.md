# Full code review

At targeted depth, apply these checks only to the named risk. At standard depth,
skip the zero-change and alternative-design checks. At adversarial depth, apply all
relevant checks.

1. Establish the requested outcome and, at adversarial depth, the material
   consequence of making no change.
2. Make each changed behavior, abstraction, dependency, contract, compatibility
   branch, test, configuration entry, and unrelated hunk earn its place.
3. Read every changed region and enough callers, consumers, schemas, state
   transitions, persistence, permissions, and rollback paths to judge it.
4. Search for the repository's established extension points and existing mechanisms
   for the same responsibility. Flag a parallel implementation only when reuse was
   available and divergence, ownership ambiguity, or incompatible behavior is a
   concrete consequence.
5. Test responsibility boundaries against ownership, state, lifecycle, and reasons
   to change. Do not infer a single-responsibility violation from file length or from
   multiple helpers that share one owner and lifecycle.
6. Treat duplication as a finding only when repeated policy or behavior can drift.
   Do not require abstraction for coincidentally similar syntax or one-off code whose
   extraction adds indirection without a shared contract.
7. Treat tests as executable contracts. Check that they fail for the regression they
   claim to prevent and that changed tests do not weaken existing behavior.
8. Reconcile the description, stated intent, and human replies with the code.
9. Construct concrete applicable failure scenarios around errors, concurrency,
   lifetime, data integrity, authorization, compatibility, and rollback.
10. Separate introduced or newly exposed defects from unrelated pre-existing issues.

When a change narrows accepted input, enumerate every producer of the newly invalid
input across packages, fixtures, tests, and infrastructure. Record the search scope
and classify each producer as intended rejection, migration required, or coordinated
change required.

## Change-relevant audit coverage

Apply the audit lenses yourself in this session. Read their reference files directly;
do not invoke the `parallel-optimization-audit` skill or launch its parallel workflow.
The shared reference directory is:
`~/.config/opencode/prompt-references/code-audit/`.

Select every lens relevant to the diff and its affected behavior:

| Changed or affected area | Reference |
| --- | --- |
| Computation, rules, resolvers, versioned pipelines, history, snapshots, claims | `backend-domain.md` |
| Endpoints, streaming, caches, auth, origin handling, store ownership, sync, migrations | `backend-api-persist.md` |
| Stores, remote queries, adapters, client schemas, streams, render cost | `frontend-state.md` |
| Client domain logic, shared components, visual ownership, layout, interaction | `frontend-domain.md` |
| Shared contracts, dates, parsing, external data, worker messages, types, duplicated mechanisms | `contracts-types.md` |
| File placement, deployment, build, tests, fixtures, dependencies, errors, CSS, accessibility, security, bundles | `deploy-build-test.md` |
| Documentation, decision logs, API contracts, generated specs, claims about changed behavior | `doc-audit-reference.md` |

Follow changed behavior to its producers, consumers, alternate entry points, and
documented contracts. Unchanged files supply evidence, not independent audit targets.
Do not scan unrelated areas to complete the table.

Depth and phase still control coverage. At targeted depth, use only checks that
settle the named risk. For delta review, inspect accepted corrections and their
effects, not previously cleared surface. At every depth, keep the requested change
boundary; adversarial depth expands the questions, not the repository scope.

Treat reference prompts to flag, merge, or delete as investigation leads, not
automatic findings or permission to edit. Require a concrete failure, maintenance
cost, or drift risk tied to the change. A high prop count, one implementation,
optional chaining, or a bundle threshold alone does not establish a defect.
Preserve intended extension paths and useful ownership or test boundaries.

Use the references' verification checks where applicable. Report unavailable
runtime, screenshot, measurement, or documentation checks as verification gaps.
Keep all checks subject to the agent's read-only verification rules.

## Finding bar

A defect includes severity, confidence, `file:line` when possible, triggering input
or state, evidence, impact, and smallest correction. A context request identifies
the unsupported claim, decision affected, and acceptable evidence. A nit must cite
a local inconsistency or concrete maintenance cost.

Do not report personal preference, generic hardening, speculative requirements,
abstract DRY or SRP slogans, unrelated pre-existing issues, test requests without
named behavior, or a broad refactor when a local fix suffices.
