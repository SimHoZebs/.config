# Plan review

Review the proposed changes and their affected behavior. Let evidence determine
which checks and surrounding code need investigation.

1. Reconstruct the desired outcome independently from the proposed solution.
2. Establish the concrete problem. Consider the consequence of no change and
   smaller designs when these affect the plan's justification or scope.
3. Make each plan step, abstraction, dependency, migration, compatibility branch,
   process, and verification activity earn its place.
4. Inspect relevant code, tests, documentation, history, and established patterns,
   including untouched files that affect the plan's assumptions or consequences.
5. Identify load-bearing assumptions and distinguish verified facts from inference.
6. Test plausible failure paths across ownership, dependency direction, state
   lifetime, contracts, persistence, security, recovery, observability, and rollback.
7. Check sequencing for work that depends on a decision or evidence obtained later.
8. Require existing verification for the changed surface and state which checks run
   before the change reaches its users.

When the plan narrows accepted input, require a cross-package inventory of producers
that send newly invalid input, the search scope, and each producer's disposition.

A finding contains severity, confidence, the unsupported assumption or plan defect,
evidence, a concrete failure scenario, and the smallest correction. A context
request names the decision affected and acceptable evidence. A nit must cite an
ambiguity, local inconsistency, or concrete review or maintenance cost.
