type ModelInfo = {
  providerID: string
  id: string
  type?: string
  enabled: boolean
  status: string
  capabilities?: { tools?: boolean }
  variants?: readonly { id: string }[]
}

type ModelRef = {
  providerID: string
  id: string
}

type RetryHookEvent = {
  readonly sessionID: string
  readonly model: ModelRef
  readonly error?: { type?: unknown; message?: unknown; status?: unknown }
  readonly decision?: { delay?: unknown }
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

const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000
const MIN_SWITCH_DELAY_MS = 300_000

const rateLimitedUntil = new Map<string, number>()

function rateLimitKey(providerID: string, id: string) {
  return `${providerID}/${id}`
}

export function markRateLimited(
  providerID: string,
  id: string,
  retryAfterMs?: number | null,
  now: number = Date.now(),
) {
  const after =
    typeof retryAfterMs === "number" && Number.isFinite(retryAfterMs)
      ? Math.max(0, retryAfterMs)
      : DEFAULT_RATE_LIMIT_WINDOW_MS
  rateLimitedUntil.set(rateLimitKey(providerID, id), now + after)
}

export function isRateLimited(providerID: string, id: string, now: number = Date.now()) {
  const key = rateLimitKey(providerID, id)
  const until = rateLimitedUntil.get(key)
  if (until === undefined) return false
  if (now < until) return true
  rateLimitedUntil.delete(key)
  return false
}

export function isRateLimitError(error: RetryHookEvent["error"]) {
  const text = [error?.type, error?.message].filter((value): value is string => typeof value === "string").join(" ")
  if (typeof error?.status === "number" && error.status === 429) return true
  return /rate.?limit|too.?many.?requests|quota|throttl|exhaust/i.test(text)
}

function isSwappableModel(model: ModelInfo | undefined, current: ModelRef) {
  if (!model) return false
  if (model.providerID === current.providerID && model.id === current.id) return false
  if ((model.type ?? "chat") !== "chat") return false
  if (!model.enabled || model.status === "deprecated") return false
  if (model.capabilities?.tools !== true) return false
  return !isRateLimited(model.providerID, model.id)
}

export function selectAlternativeModel(models: readonly ModelInfo[], current: ModelRef): ModelRef | undefined {
  for (const model of models) {
    if (isSwappableModel(model, current)) return { providerID: model.providerID, id: model.id }
  }
  return undefined
}

async function installPlugin(ctx: PluginContext) {
  if (typeof ctx.session?.hook !== "function") return
  const switches = new Map<string, number>()
  return await ctx.session.hook("retry", async (event) => {
    if (!isRateLimitError(event?.error)) return
    const delay = event?.decision?.delay
    if (typeof delay !== "number" || !Number.isFinite(delay) || delay <= MIN_SWITCH_DELAY_MS) return
    const session = await ctx.session?.get?.({ sessionID: event.sessionID }).catch(() => undefined)
    if (typeof session?.parentID !== "string" || session.parentID.length === 0) return
    const model = event?.model
    if (typeof model?.providerID !== "string" || typeof model?.id !== "string") return
    const used = switches.get(event.sessionID) ?? 0
    if (used >= 3) return
    switches.set(event.sessionID, used + 1)
    const { data: models } = await ctx.model.list().catch(() => ({ data: [] as ModelInfo[] }))
    const alternative = selectAlternativeModel(models, model)
    if (!alternative) return
    markRateLimited(model.providerID, model.id, delay)
    await ctx.session?.switchModel?.({ sessionID: event.sessionID, model: alternative })
  })
}

export default {
  id: "local.session-rate-limit-switch",
  setup: installPlugin,
}
