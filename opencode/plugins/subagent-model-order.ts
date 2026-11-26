export type ModelPreference = {
  providerID: string
  id: string
  variant?: string
}

export type ModelRef = {
  providerID: string
  id: string
  variant?: string
}

type ModelInfo = {
  providerID: string
  id: string
  modelID: string
  type?: string
  enabled: boolean
  status: string
  capabilities?: { tools?: boolean }
  variants?: readonly { id: string }[]
}

type ToolExecuteBeforeEvent = {
  tool: string
  input: {
    sessionID?: string
    model?: string
    [key: string]: unknown
  }
}

type RetryHookEvent = {
  readonly model: { providerID: string; id: string }
  readonly error?: { type?: unknown; message?: unknown; status?: unknown }
  readonly decision?: { delay?: unknown }
}

type Registration = {
  dispose(): void | Promise<void>
}

type SessionDomain = {
  hook?(
    name: "retry",
    callback: (event: RetryHookEvent) => void | Promise<void>,
  ): Promise<Registration | undefined>
}

type PluginContext = {
  model: {
    list(): Promise<{ data: readonly ModelInfo[] }>
  }
  tool: {
    hook(
      name: "execute.before",
      callback: (event: ToolExecuteBeforeEvent) => Promise<void> | void,
    ): Promise<unknown>
  }
  session?: SessionDomain
}

export const SUBAGENT_MODEL_PREFERENCES: readonly ModelPreference[] = [
  { providerID: "opencode-go", id: "hungerg-free" },
  { providerID: "opencode", id: "tidepool-alpha-free" },
  { providerID: "opencode", id: "seaglass-alpha-free" },
  { providerID: "opencode-go", id: "hy4-flash-free", variant: "high" },
  { providerID: "opencode", id: "deepseek-v4.1-flash-free", variant: "max" },
  { providerID: "opencode-go", id: "muse-spark-1.3-contributor", variant: "xhigh" },
  { providerID: "openai", id: "gpt-6.1-terra", variant: "medium" },
]

export function formatModelPreference(preference: ModelPreference) {
  const model = `${preference.providerID}/${preference.id}`
  return preference.variant ? `${model}#${preference.variant}` : model
}

const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000

const rateLimitedUntil = new Map<string, number>()

function rateLimitKey(providerID: string, id: string) {
  return `${providerID}/${id}`
}

export function markModelRateLimited(
  providerID: string,
  id: string,
  retryAfterMs?: number | null,
  now: number = Date.now(),
) {
  const after =
    typeof retryAfterMs === "number" && Number.isFinite(retryAfterMs)
      ? Math.max(0, retryAfterMs)
      : DEFAULT_RATE_LIMIT_WINDOW_MS
  const key = rateLimitKey(providerID, id)
  rateLimitedUntil.set(key, Math.max(rateLimitedUntil.get(key) ?? 0, now + after))
}

export function isModelRateLimited(providerID: string, id: string, now: number = Date.now()) {
  const key = rateLimitKey(providerID, id)
  const until = rateLimitedUntil.get(key)
  if (until === undefined) return false
  if (now < until) return true
  rateLimitedUntil.delete(key)
  return false
}

export function clearRateLimitRegistry() {
  rateLimitedUntil.clear()
}

export function isUsableModel(model: ModelInfo | undefined, preference: ModelPreference) {
  if (!model) return false
  if (model.providerID !== preference.providerID || model.id !== preference.id) return false
  if ((model.type ?? "chat") !== "chat") return false
  if (!model.enabled || model.status === "deprecated" || model.capabilities?.tools !== true) return false
  if (isModelRateLimited(model.providerID, model.id)) return false
  return !preference.variant || (model.variants ?? []).some((variant) => variant.id === preference.variant)
}

export function selectSubagentModel(models: readonly ModelInfo[]): ModelRef {
  for (const preference of SUBAGENT_MODEL_PREFERENCES) {
    const model = models.find((candidate) => candidate.providerID === preference.providerID && candidate.id === preference.id)
    if (!isUsableModel(model, preference)) continue

    return {
      providerID: preference.providerID,
      id: preference.id,
      ...(preference.variant ? { variant: preference.variant } : {}),
    }
  }

  const unavailable = SUBAGENT_MODEL_PREFERENCES.map(formatModelPreference).join(", ")
  throw new Error(`No usable model is available for new subagents. Unavailable preferences: ${unavailable}`)
}

export function isNewSubagentLaunch(tool: string, input: { sessionID?: unknown }) {
  return tool === "subagent" && input.sessionID === undefined
}

function isRateLimitError(error: RetryHookEvent["error"]) {
  const text = [error?.type, error?.message].filter((value): value is string => typeof value === "string").join(" ")
  if (typeof error?.status === "number" && error.status === 429) return true
  return /rate.?limit|too.?many.?requests|quota|throttl|exhaust/i.test(text)
}

async function installPlugin(ctx: PluginContext) {
  await ctx.tool.hook("execute.before", async (event) => {
    if (!isNewSubagentLaunch(event.tool, event.input)) return
    if (event.input.model !== undefined) return
    const { data: models } = await ctx.model.list()
    event.input.model = formatModelPreference(selectSubagentModel(models))
  })

  let registration: Registration | undefined
  if (typeof ctx.session?.hook === "function") {
    try {
      registration =
        (await ctx.session.hook("retry", (event) => {
          const model = event?.model
          if (typeof model?.providerID !== "string" || typeof model?.id !== "string") return
          if (!isRateLimitError(event.error)) return
          const delay = event.decision?.delay
          markModelRateLimited(model.providerID, model.id, typeof delay === "number" ? delay : undefined)
        })) ?? undefined
    } catch {}
  }
  return () => registration?.dispose()
}

export default {
  id: "local.subagent-model-order",
  setup: installPlugin,
}
