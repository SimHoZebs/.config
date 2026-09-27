# Full plan review

At targeted depth, apply only checks relevant to the named risk. At standard depth,
skip zero-change and alternative-design checks. At adversarial depth, apply all
relevant checks.

1. Reconstruct the desired outcome independently from the proposed solution.
2. At adversarial depth, establish the concrete problem and consequence of no
   change, then look for a materially smaller design that meets the outcome.
3. Make each plan step, abstraction, dependency, migration, compatibility branch,
   process, and verification activity earn its place.
4. Inspect relevant code, tests, documentation, history, and established patterns.
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
