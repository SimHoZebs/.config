# Explain findings: background, direct change, verification

Use a few short paragraphs and concise source references. The user should immediately understand what the proposed work is.

Cite at least one source file path per finding, with a line number when available.

- Establish the relevant background: what the named components do and why their current implementation causes a problem or maintenance cost.
- State the direct change: merge, delete, reuse, move, or fix the specific code. Identify what exists and what must be created only where that distinction helps explain the work.
- Name the verification that proves the change works. Include a constraint or risk only when it explains a real regression to test.

Apply these rules to scope reports, user-facing findings, and task files:

- Do not repeat the same workflow as numbered current/proposed lists. If only one step differs, explain that change directly.
- Use numbered steps only when the workflow itself changes and the sequence helps the user understand it. Extracting a shared helper usually changes code ownership, not the runtime procedure.
- If the work is merging two implementations, say that after establishing their roles. Do not hide the action behind phrases such as "one guard implementation."
- Include concrete screens, entries, values, and settings only when they demonstrate the issue. Do not pad an implementation-cleanup finding with unrelated fixture balances or configuration values.
- Do not present unchanged defaults or blanket "keep/do not change" lists as proposed work. Put meaningful behavioral constraints in verification.
- Use ordinary words. Explain a necessary code term at its first use, then use it consistently. Remove definitions of terms that the explanation never uses again.
- Name files and functions when they locate or clarify the change, not as a substitute for explaining it. Prefer the user's domain terms over storage jargon in prose.
- Separate independent corrections into separate findings, even when they concern the same component.
- Do not claim speed or net line savings without measurement. Distinguish existing duplicate lines from measured savings. State shared measurement limits once rather than adding boilerplate to every finding.
- Avoid mandatory "what you see / what the code does / simpler version" labels. A task title, short explanation, references, and verification are enough.

## Example: merge duplicate implementations

For SimpleFIN, `Sync` handles scheduled/direct syncs and `Trigger` handles manual requests. Both call the existing bank-data fetch-and-save method but duplicate the surrounding concurrency and retry checks. `Trigger` also checks the wait between successful manual syncs.

Merge the duplicated implementation into one private method. Make both entry methods delegate to it, with the manual path enabling the manual wait check and timestamp.

Verify that syncs cannot overlap, failures allow retry, provider retry waits work, and only successful manual syncs restart the manual wait.
