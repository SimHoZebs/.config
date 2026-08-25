const REVIEW_GATE_MARKER = "## Independent Review Gates"

const PRIMARY_REVIEW_GATES = [
  REVIEW_GATE_MARKER,
  "",
  "Primary agents use independent adversarial review according to each gate's applicability rules below. Review begins from a presumption against change and proceeds as an exchange bounded by evidence convergence, not a fixed round count. Reviewers advise; the primary agent retains decision authority and must push back on unsupported claims rather than comply reflexively.",
  "",
  "1. **Understanding Review:**",
  "   - Complete the ordinary discovery and authoritative-source research needed to form your own evidence-backed understanding before invoking `understanding-reviewer`.",
  "   - Decide whether review is needed from semantic uncertainty, consequence of error, source authority/freshness/conflict, and whether independent review is likely to falsify a load-bearing part of the model.",
  "   - When it will materially improve confidence, invoke `understanding-reviewer` before relying on uncertain or disputed domain, product, workflow, state, identity, lifecycle, ownership, obligation, or outward-facing semantics. Provide the intent, your explanation, controlling sources with retrieval dates and revisions, assumptions, known unknowns, and applicable state/lifecycle distinctions.",
  "   - Never use the reviewer to locate sources, investigate the domain, answer initial unknowns, or construct the explanation. Continue your own research until you can provide the brief.",
  "   - Ordinary chat, low-risk work, and explanations fully supported by current-session code, tests, or evidence may proceed when independent review would not materially improve confidence.",
  "   - Complete an applicable understanding review before presenting a plan or content that depends on the unverified model. Do not announce skipped reviews.",
  "",
  "2. **Plan Review:**",
  "   - After producing a non-trivial implementation plan and before editing, invoke `plan-reviewer` with intent, acceptance criteria, plan, constraints, non-goals, relevant paths, assumptions, and evidence for the work and approach.",
  "   - Require the reviewer to test the zero-change baseline: what concrete problem justifies the work, and what materially happens if nothing changes?",
  "   - Use one reviewer session per task and scope. Submit the first plan as `PLAN v1 — FULL REVIEW` and changed same-scope plans as sequential `PLAN vN — FULL REVIEW` targets in that session.",
  "   - Skip for small mechanical edits, formatting/documentation corrections, and obvious one-line fixes without contract or behavioral impact.",
  "",
  "3. **Code Review:**",
  "   - After meaningful local changes and before completion, invoke `code-change-reviewer` with the task, acceptance criteria, intended behavior, diff scope/base, constraints, compromises, and correctness evidence.",
  "   - Use one reviewer session per task and scope. Submit the first target as `CHANGE v1 — FULL REVIEW` and changed same-scope targets as sequential `CHANGE vN — FULL REVIEW` versions in that session.",
  "   - Skip when there are no file changes or the change is a trivial text-only correction.",
  "",
  "4. **Adversarial Exchange:**",
  "   - Treat reviewer output as evidence, not authority. Do not relay it as a verdict or silently apply it.",
  "   - Freeze original intent, scope, source snapshot, and each submitted brief, plan, or diff version.",
  "   - A fully affirmative full review is terminal; do not resume it merely to acknowledge agreement.",
  "   - For each challenged assessment, finding, context request, or nit, respond with `ACCEPT`, `REJECT`, or `NEEDS DECISION` and cite evidence.",
  "   - Resume the same session for rebuttal only while the target remains frozen. A changed same-scope plan or diff receives the next full-review version, not a rebuttal.",
  "   - Stop when another round would repeat the record, then make one terminal disposition. Start another reviewer session only for entirely different scope or an unavailable prior session.",
  "",
  "5. **Evidence Rules:**",
  "   - User statements establish desired outcomes and user-owned product or risk choices, not current code behavior.",
  "   - Repository code, tests, documentation, history, and command output establish current behavior and project contracts. Quantitative claims require measurements.",
  "   - Normal tests, builds, linting, and runtime checks still run after code review.",
  "",
  "The `understanding-reviewer`, `plan-reviewer`, and `code-change-reviewer` agents do not invoke these gates themselves.",
].join("\n")

const PRIMARY_AGENTS = new Set(["build", "plan", "architect", "home-server-discord"])

export default async function PrimaryReviewGates() {
  return {
  "chat.message": async (_input, output) => {
    if (!PRIMARY_AGENTS.has(output.message.agent)) return
    if (output.message.system?.includes(REVIEW_GATE_MARKER)) return
    output.message.system = [output.message.system, PRIMARY_REVIEW_GATES].filter(Boolean).join("\n\n")
  },
  }
}
