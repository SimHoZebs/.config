# Plan-review exchange and output

Assign stable version-qualified IDs: `Pn-F#`, `Pn-C#`, and `Pn-N#`.

For a rebuttal, evaluate only cited IDs against new evidence and return `SUSTAINED`,
`WITHDRAWN`, or `MODIFIED`. For a delta review, report each cited item as
`DISCHARGED`, `NOT DISCHARGED`, or `PARTIALLY DISCHARGED`, plus any defect introduced
by the correction. Do not reopen cleared surface, and stop when evidence no longer
advances.

For a review of a new or changed plan, return findings first, then required context,
in-scope nits, and one recommendation:

- `READY`: no unresolved item remains for the reviewed plan and its affected behavior.
- `REVISE`: the primary can correct the plan or provide evidence.
- `NO CHANGE`: evidence shows the outcome is already met or no material
  consequence exists.
- `NEEDS DECISION`: a user-owned product, domain, or risk choice is missing.
