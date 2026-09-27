# Plan-review exchange and output

Assign stable version-qualified IDs: `Pn-F#`, `Pn-C#`, and `Pn-N#`.

For a rebuttal, evaluate only cited IDs against new evidence and return `SUSTAINED`,
`WITHDRAWN`, or `MODIFIED`. For a delta review, report each cited item as
`DISCHARGED`, `NOT DISCHARGED`, or `PARTIALLY DISCHARGED`, plus any defect introduced
by the correction. Do not reopen cleared surface, and stop when evidence no longer
advances.

For a full review, return findings first, then required context, in-scope nits, and
one recommendation:

- `READY`: no unresolved item remains for the active depth.
- `REVISE`: the primary can correct the plan or provide evidence.
- `NO CHANGE`: adversarial evidence shows the outcome is already met or no material
  consequence exists.
- `NEEDS DECISION`: a user-owned product, domain, or risk choice is missing.

At targeted depth, return `CONFIRMED`, `REFUTED`, or `INDETERMINATE` for the named
risk with the evidence needed to settle it. Do not assess unrelated surface.
