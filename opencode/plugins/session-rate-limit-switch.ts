import {
  SUBAGENT_MODEL_PREFERENCES,
  isUsableModel,
  markModelRateLimited,
  type ModelRef,
} from "./subagent-model-order"

type ModelInfo = {
  providerID: string
  id: string
  modelID?: string
  type?: string
  enabled: boolean
  status: string
  capabilities?: { tools?: boolean }
  variants?: readonly { id: string }[]
}

type RetryHookEvent = {
  readonly sessionID: string
  readonly model: ModelRef
  readonly error?: { type?: unknown; message?: unknown; status?: unknown; retryAfterMs?: unknown }
  decision?: { retry?: boolean; delay?: unknown }
}

type Registration = {
  dispose(): void | Promise<void>
}

type SessionDomain = {
  get?(input: { sessionID: string }): Promise<{ parentID?: string } | undefined>
  hook?(
    name: "retry",
    callback: (event: RetryHookEvent) => void | Promise<void>,
  ): Promise<Registration | undefined>
  switchModel?(input: { sessionID: string; model: ModelRef }): Promise<unknown>
}

type PluginContext = {
  model: {
    list(): Promise<{ data: readonly ModelInfo[] }>
  }
  session?: SessionDomain
}

export function isRateLimitError(error: RetryHookEvent["error"]) {
  const text = [error?.type, error?.message].filter((value): value is string => typeof value === "string").join(" ")
  if (typeof error?.status === "number" && error.status === 429) return true
  return /rate.?limit|too.?many.?requests|quota|throttl|exhaust/i.test(text)
}

export function isFallbackError(error: RetryHookEvent["error"]) {
  if (isRateLimitError(error)) return true
  return typeof error?.message === "string" && /\bmodel\b.{0,80}\b(unavailable|not available|not found)\b/i.test(error.message)
}

function retryWait(event: RetryHookEvent) {
  const waits = [event.decision?.delay, event.error?.retryAfterMs].filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0,
  )
  return waits.length ? Math.max(...waits) : undefined
}

export function selectAlternativeModel(
  models: readonly ModelInfo[],
  current: ModelRef,
  attempted: ReadonlySet<string> = new Set(),
): ModelRef | undefined {
  const index = SUBAGENT_MODEL_PREFERENCES.findIndex((model) => model.providerID === current.providerID && model.id === current.id)
  for (const preference of SUBAGENT_MODEL_PREFERENCES.slice(index + 1)) {
    if (attempted.has(`${preference.providerID}/${preference.id}`)) continue
    const model = models.find((model) => model.providerID === preference.providerID && model.id === preference.id)
    if (!isUsableModel(model ? { ...model, modelID: model.modelID ?? model.id } : undefined, preference)) continue
    return { ...preference }
  }
  return undefined
}

async function installPlugin(ctx: PluginContext) {
  if (typeof ctx.session?.hook !== "function" || typeof ctx.session.switchModel !== "function") return
  const attempts = new Map<string, Set<string>>()
  const registration = await ctx.session.hook("retry", async (event) => {
    if (!isFallbackError(event?.error)) return
    const delay = retryWait(event)
    if (isRateLimitError(event.error) &&
      (typeof delay !== "number" || !Number.isFinite(delay) || delay <= 300_000)) return
    const session = await ctx.session?.get?.({ sessionID: event.sessionID }).catch(() => undefined)
    if (typeof session?.parentID !== "string" || session.parentID.length === 0) return
    const model = event?.model
    if (typeof model?.providerID !== "string" || typeof model?.id !== "string") return
    const attempted = attempts.get(event.sessionID) ?? new Set<string>()
    attempts.set(event.sessionID, attempted)
    attempted.add(`${model.providerID}/${model.id}`)
    markModelRateLimited(model.providerID, model.id,
      typeof delay === "number" && delay > 0 ? delay : undefined)
    const { data: models } = await ctx.model.list().catch(() => ({ data: [] as ModelInfo[] }))
    let current = model
    while (true) {
      const alternative = selectAlternativeModel(models, current, attempted)
      if (!alternative) return
      attempted.add(`${alternative.providerID}/${alternative.id}`)
      try {
        await ctx.session!.switchModel!({ sessionID: event.sessionID, model: alternative })
        event.decision = { retry: true, delay: 0 }
        return
      } catch {
        current = alternative
      }
    }
  })
  return () => {
    attempts.clear()
    return registration?.dispose()
  }
}

export default {
  id: "local.session-rate-limit-switch",
  setup: installPlugin,
}
