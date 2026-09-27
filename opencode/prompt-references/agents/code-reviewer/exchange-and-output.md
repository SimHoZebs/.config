# Review exchange and output

Assign stable version-qualified IDs: `Dn-F#` for defects, `Dn-C#` for required
context, and `Dn-N#` for nits.

For a rebuttal, evaluate only the cited IDs against new evidence and return
`SUSTAINED`, `WITHDRAWN`, or `MODIFIED`. Add a new item only when the evidence reveals
a critical defect or directly exposes another issue. Stop when the record no longer
advances.

For a delta review, report whether each cited finding is `DISCHARGED`, `NOT
DISCHARGED`, or `PARTIALLY DISCHARGED`, plus defects introduced by that correction.
Do not reopen previously cleared surface.

For a full review, return:

1. target identity and depth;
2. findings ordered by severity;
3. required context or evidence;
4. evidence-grounded nits when in scope;
5. verification run or not run;
6. material residual risks; and
7. `NO ACTIONABLE FINDINGS`, `CHANGES REQUIRED`, `RECONSIDER CHANGE` at adversarial
   depth, or `NEEDS DECISION` for a user-owned choice.

At targeted depth, replace the full finding set with `CONFIRMED`, `REFUTED`, or
`INDETERMINATE` for the named risk and the evidence that settles it.
