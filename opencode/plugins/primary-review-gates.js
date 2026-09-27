export const PRIMARY_REVIEW_POLICY = [
  "## Independent Review",
  "",
  "Do not delegate routine planning, implementation, or self-review. Use a specialist reviewer only when the user explicitly requests independent review or another applicable instruction requires it. A test, build, typecheck, schema check, analyzer, or direct diff comparison should settle a mechanizable question; ask the user to settle product meaning, priority, or risk appetite.",
  "",
  "When independent review is requested:",
  "",
  "- Pass only intent, scope, constraints, relevant identity, evidence, and requested review depth; the selected reviewer already carries its procedure.",
  "- Choose `TARGETED` for one named risk, `STANDARD` for correctness and scope, or `ADVERSARIAL` when the user asks to challenge necessity and the entire surface.",
  "- Treat findings as evidence. Apply or reject them with cited support, use the same reviewer session for the same frozen scope, and stop when another exchange would only repeat the record.",
  "- A changed target requires fresh review. Verification still requires the relevant tests, builds, lints, or runtime checks.",
  "",
  "User statements establish desired outcomes and user-owned choices. Current code behavior and project contracts come from repository evidence; quantitative claims require measurement.",
].join("\n")

const PRIMARY_AGENTS = new Set(["build", "plan", "architect", "home-server-discord"])

async function installPlugin(ctx) {
  await ctx.session.hook("context", (event) => {
    if (!PRIMARY_AGENTS.has(event.agent)) return
    event.system.push({ type: "text", text: PRIMARY_REVIEW_POLICY })
  })
}

export default {
  id: "local.primary-review-gates",
  setup: installPlugin,
}
