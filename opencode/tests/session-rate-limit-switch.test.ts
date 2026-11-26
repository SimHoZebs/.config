import { beforeEach, describe, expect, test } from "bun:test"
import SessionRateLimitSwitch, { isFallbackError, selectAlternativeModel } from "../plugins/session-rate-limit-switch"
import { SUBAGENT_MODEL_PREFERENCES, clearRateLimitRegistry, isModelRateLimited } from "../plugins/subagent-model-order"

const preferences = SUBAGENT_MODEL_PREFERENCES
const models = preferences.map((model) => ({
  ...model,
  enabled: true,
  status: "active",
  capabilities: { tools: true },
  variants: model.variant ? [{ id: model.variant }] : [],
}))
type Model = { providerID: string; id: string; variant?: string }
type RetryEvent = {
  sessionID: string
  model: Model
  error?: { type?: string; message?: string; status?: number; retryAfterMs?: unknown }
  decision?: { retry?: boolean; delay?: unknown }
}

async function setupPlugin(options: { main?: boolean; failSwitches?: number; catalog?: typeof models } = {}) {
  let handler: (event: RetryEvent) => void | Promise<void>
  const switched: Model[] = []
  let listCalls = 0
  let disposed = false
  const cleanup = await SessionRateLimitSwitch.setup({
    model: { list: async () => {
      listCalls++
      return { data: options.catalog ?? models }
    } },
    session: {
      get: async () => options.main ? {} : { parentID: "ses_parent" },
      hook: async (_name, callback) => {
        handler = callback
        return { dispose: () => { disposed = true } }
      },
      switchModel: async ({ model }) => {
        switched.push(model)
        if (switched.length <= (options.failSwitches ?? 0)) throw new Error("Model is unavailable")
      },
    },
  })
  return {
    emit: (event: RetryEvent) => handler(event),
    switched,
    listCalls: () => listCalls,
    cleanup,
    disposed: () => disposed,
  }
}

function failure(model: Model = preferences[0], sessionID = "ses_child"): RetryEvent {
  return {
    sessionID, model,
    error: { type: "provider.invalid-request", message: "Upstream request failed: Model is unavailable.", status: 400 },
    decision: { retry: false },
  }
}

describe("ordered subagent fallback", () => {
  beforeEach(clearRateLimitRegistry)

  test("retries a terminal unavailable-model failure immediately after switching", async () => {
    const plugin = await setupPlugin()
    const event = failure()
    await plugin.emit(event)
    expect(plugin.switched).toEqual([preferences[1]])
    expect(event.decision).toEqual({ retry: true, delay: 0 })
  })

  test("walks the entire priority list beyond three switches, preserving variants", async () => {
    const plugin = await setupPlugin({ catalog: [...models].reverse() })
    for (const model of preferences) {
      const event = failure(model)
      await plugin.emit(event)
      expect(event.decision).toEqual(model === preferences.at(-1) ? { retry: false } : { retry: true, delay: 0 })
    }
    expect(plugin.switched).toEqual(preferences.slice(1))
  })

  test("continues past rejected switches in the same retry hook", async () => {
    const plugin = await setupPlugin({ failSwitches: 2 })
    const event = failure()
    await plugin.emit(event)
    expect(plugin.switched).toEqual(preferences.slice(1, 4))
    expect(event.decision).toEqual({ retry: true, delay: 0 })
  })

  test("never loops back to already attempted models after their cooldown expires", async () => {
    const plugin = await setupPlugin()
    await plugin.emit(failure())
    clearRateLimitRegistry()
    await plugin.emit(failure(preferences[1]))
    expect(plugin.switched).toEqual(preferences.slice(1, 3))
  })

  test("rate limits keep the original retry at or below 300 seconds, or without a valid wait", async () => {
    for (const delay of [0, 1_000, 300_000, undefined, Infinity, "600000"]) {
      clearRateLimitRegistry()
      const plugin = await setupPlugin()
      const event = failure()
      event.error = { status: 429 }
      event.decision = { retry: true, delay }
      await plugin.emit(event)
      expect(plugin.switched).toEqual([])
      expect(plugin.listCalls()).toBe(0)
      expect(event.decision).toEqual({ retry: true, delay })
    }
  })

  test("rate limits switch only when the wait exceeds 300 seconds", async () => {
    const plugin = await setupPlugin()
    const event = failure()
    event.error = { status: 429 }
    event.decision = { retry: true, delay: 300_001 }
    await plugin.emit(event)
    expect(plugin.switched).toEqual([preferences[1]])
    expect(isModelRateLimited(preferences[0].providerID, preferences[0].id)).toBe(true)
    expect(event.decision).toEqual({ retry: true, delay: 0 })
  })

  test("a terminal free-limit error uses the provider wait and preserves its full cooldown", async () => {
    const plugin = await setupPlugin()
    const event = failure(preferences[2])
    event.error = {
      type: "provider.free-limit",
      message: "Free usage limit reached.",
      status: 429,
      retryAfterMs: 56_650_000,
    }
    const now = Date.now()
    await plugin.emit(event)
    expect(plugin.switched).toEqual([preferences[3]])
    expect(event.decision).toEqual({ retry: true, delay: 0 })
    expect(isModelRateLimited(event.model.providerID, event.model.id, now + 56_649_000)).toBe(true)
  })

  test("uses the longer valid wait when provider and retry policy disagree", async () => {
    for (const [providerWait, policyWait] of [[600_000, 1_000], [1_000, 600_000]]) {
      clearRateLimitRegistry()
      const plugin = await setupPlugin()
      const event = failure()
      event.error = { status: 429, retryAfterMs: providerWait }
      event.decision = { retry: true, delay: policyWait }
      await plugin.emit(event)
      expect(plugin.switched).toEqual([preferences[1]])
      expect(event.decision).toEqual({ retry: true, delay: 0 })
    }
  })

  test("short provider waits preserve the original retry decision", async () => {
    for (const retryAfterMs of [0, 1_000, 300_000]) {
      const plugin = await setupPlugin()
      const event = failure()
      event.error = { status: 429, retryAfterMs }
      event.decision = { retry: true, delay: 1_000 }
      await plugin.emit(event)
      expect(plugin.switched).toEqual([])
      expect(event.decision).toEqual({ retry: true, delay: 1_000 })
    }
  })

  test("invalid provider waits neither trigger fallback nor mask a valid policy wait", async () => {
    for (const retryAfterMs of [NaN, Infinity, -1, "600000", null]) {
      clearRateLimitRegistry()
      const plugin = await setupPlugin()
      const event = failure()
      event.error = { status: 429, retryAfterMs }
      await plugin.emit(event)
      expect(plugin.switched).toEqual([])
      expect(event.decision).toEqual({ retry: false })
      event.decision = { retry: true, delay: 600_000 }
      await plugin.emit(event)
      expect(plugin.switched).toEqual([preferences[1]])
    }
  })

  test("main sessions stay untouched", async () => {
    const plugin = await setupPlugin({ main: true })
    const event = failure()
    await plugin.emit(event)
    expect(plugin.listCalls()).toBe(0)
    expect(plugin.switched).toEqual([])
    expect(isModelRateLimited(event.model.providerID, event.model.id)).toBe(false)
    expect(event.decision).toEqual({ retry: false })
  })

  test("unrelated invalid requests stay terminal", async () => {
    const plugin = await setupPlugin()
    const event = failure()
    event.error = { type: "provider.invalid-request", status: 400, message: "Invalid tool schema" }
    await plugin.emit(event)
    expect(plugin.listCalls()).toBe(0)
    expect(plugin.switched).toEqual([])
  })

  test("exhaustion preserves the original retry policy", async () => {
    const plugin = await setupPlugin({ catalog: [] })
    const event = failure()
    await plugin.emit(event)
    expect(plugin.switched).toEqual([])
    expect(event.decision).toEqual({ retry: false })
  })

  test("selection follows preferences, never arbitrary catalog models or earlier entries", () => {
    expect(selectAlternativeModel([...models].reverse(), preferences[1])).toEqual(preferences[2])
    expect(selectAlternativeModel(models, preferences.at(-1)!)).toBeUndefined()
    expect(selectAlternativeModel([{ ...models[0], id: "gpt-6.2" }], preferences[0])).toBeUndefined()
  })

  test("selection skips disabled, deprecated, non-chat, tool-incapable, and variant-missing entries", () => {
    for (const overrides of [
      { enabled: false }, { status: "deprecated" }, { type: "image" },
      { capabilities: { tools: false } },
    ]) {
      const catalog = models.map((model, index) => index === 1 ? { ...model, ...overrides } : model)
      expect(selectAlternativeModel(catalog, preferences[0])).toEqual(preferences[2])
    }
    const index = preferences.findIndex((model) => model.variant)
    const catalog = models.map((model, i) => i === index ? { ...model, variants: [] } : model)
    expect(selectAlternativeModel(catalog, preferences[index - 1])).toEqual(preferences[index + 1])
  })

  test("an explicitly requested model outside the list can fall back to the first preference", () => {
    expect(selectAlternativeModel(models, { providerID: "caller", id: "requested" })).toEqual(preferences[0])
  })

  test("failed switches exhaust the finite list without changing the retry decision", async () => {
    const plugin = await setupPlugin({ failSwitches: preferences.length })
    const event = failure()
    await plugin.emit(event)
    expect(plugin.switched).toEqual(preferences.slice(1))
    expect(event.decision).toEqual({ retry: false })
  })

  test("classifies model availability and rate limits narrowly", () => {
    expect(isFallbackError({ status: 429 })).toBe(true)
    expect(isFallbackError({ status: 503 })).toBe(false)
    expect(isFallbackError(failure().error)).toBe(true)
    expect(isFallbackError({ status: 401, message: "Unauthorized" })).toBe(false)
    expect(isFallbackError(undefined)).toBe(false)
  })

  test("disposes the hook on unload", async () => {
    const plugin = await setupPlugin()
    await plugin.cleanup?.()
    expect(plugin.disposed()).toBe(true)
  })
})
