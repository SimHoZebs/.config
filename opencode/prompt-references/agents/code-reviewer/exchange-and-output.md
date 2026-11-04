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
Do not reopen previously cleared surface unless the correction interacts with
previously cleared code — then re-trace that surface and report the disposition.

For a review of a new or changed target, return:

1. target identity and affected behavior;
2. findings ordered by severity;
3. required context or evidence;
4. evidence-grounded nits when in scope;
5. verification run or not run, including material coverage gaps;
6. material residual risks;
7. failure-catalog attestation (`Failure-catalog classes checked: [...]`) and
   sibling-grep evidence; and
8. `DIFF CLEAR; PRODUCT/RUNTIME NOT ASSESSED` when runtime or product evidence is
   absent and that lane was not run, `NO ACTIONABLE FINDINGS` only for the staged
   diff when runtime/product evidence is attached or the lane is genuinely N/A
   with a stated reason, `CHANGES REQUIRED` if any cited item remains `NOT DISCHARGED`, `RECONSIDER CHANGE`
   when evidence challenges the implementation's justification, or `NEEDS DECISION`
   for a user-owned choice.
