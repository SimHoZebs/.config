# Review exchange and output

Assign stable version-qualified IDs: `Dn-F#` for defects, `Dn-C#` for required
context, and `Dn-N#` for nits.

Use the shared explanation instructions in
`~/.config/opencode/prompt-references/code-audit/reporting.md`.
Explain the relevant background, direct correction, source evidence, and verification
concisely. Preserve the review's IDs, severity, confidence, triggering state, impact,
and source locations. Use one domain term per concept. Merge duplicate observations
of the same defect across lenses; keep independent corrections separate.

For a rebuttal, evaluate only the cited IDs against new evidence and return
`SUSTAINED`, `WITHDRAWN`, or `MODIFIED`. Add a new item only when the evidence reveals
a critical defect or directly exposes another issue. Stop when the record no longer
advances.

For a delta review, report whether each cited finding is `DISCHARGED`, `NOT
DISCHARGED`, or `PARTIALLY DISCHARGED`, plus defects introduced by that correction.
Do not reopen previously cleared surface.

For a review of a new or changed target, return:

1. target identity and affected behavior;
2. findings ordered by severity;
3. required context or evidence;
4. evidence-grounded nits when in scope;
5. verification run or not run, including material coverage gaps;
6. material residual risks; and
7. `NO ACTIONABLE FINDINGS`, `CHANGES REQUIRED`, `RECONSIDER CHANGE` when evidence
   challenges the implementation's justification, or `NEEDS DECISION` for a
   user-owned choice.
