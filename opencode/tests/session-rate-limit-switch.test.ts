import { describe, expect, test } from "bun:test"
import SessionRateLimitSwitch, {
  isRateLimitError,
  isRateLimited,
  markRateLimited,
  selectAlternativeModel,
} from "../plugins/session-rate-limit-switch"

type CatalogModel = {
  providerID: string
  id: string
  type?: string
  enabled: boolean
  status: string
  capabilities?: { tools?: boolean }
  variants?: readonly { id: string }[]
}

function catalogModel(providerID: string, id: string, overrides: Partial<CatalogModel> = {}): CatalogModel {
  return {
    providerID,
    id,
    type: "chat",
    enabled: true,
    status: "active",
    capabilities: { tools: true },
    variants: [],
    ...overrides,
  }
}

type RetryEvent = {
  sessionID: string
  model: { providerID: string; id: string }
  error: { type?: string; message?: string; status?: number }
  decision?: { retry?: boolean; delay?: unknown }
}

async function setupPlugin(models: CatalogModel[], session?: { parentID?: string }) {
  let retryHandler: ((event: RetryEvent) => void | Promise<void>) | undefined
  let listCalls = 0
  const switched: { sessionID: string; model: { providerID: string; id: string } }[] = []

  await SessionRateLimitSwitch.setup({
    model: {
      list: async () => {
        listCalls += 1
        return { data: models }
      },
    },
    session: {
      get: async () => ({ parentID: session?.parentID }),
      hook: async (name, callback) => {
        expect(name).toBe("retry")
        retryHandler = callback as (event: RetryEvent) => void | Promise<void>
        return { dispose: () => undefined }
      },
      switchModel: async (input) => {
        switched.push(input)
      },
    },
  })

  return {
    emit: async (event: RetryEvent) => retryHandler?.(event),
    listCalls: () => listCalls,
    switched,
  }
}

describe("session rate-limit switch", () => {
  test("switches a sub-agent when the retry delay is over 300 seconds", async () => {
    const first = catalogModel("opencode-go", "hungerg-free")
    const second = catalogModel("opencode", "tidepool-alpha-free")
    const plugin = await setupPlugin([first, second], { parentID: "ses_parent" })

    await plugin.emit({
      sessionID: "ses_a",
      model: { providerID: first.providerID, id: first.id },
      error: { type: "provider.rate-limit", status: 429 },
      decision: { retry: true, delay: 600_000 },
    })

    expect(plugin.switched).toEqual([{ sessionID: "ses_a", model: { providerID: second.providerID, id: second.id } }])
  })

  test("does not switch at or below 300 seconds", async () => {
    const first = catalogModel("opencode-go", "hungerg-free")
    const plugin = await setupPlugin([first, catalogModel("opencode", "tidepool-alpha-free")], { parentID: "ses_parent" })

    await plugin.emit({
      sessionID: "ses_a",
      model: { providerID: first.providerID, id: first.id },
      error: { type: "provider.rate-limit", status: 429 },
      decision: { retry: true, delay: 300_000 },
    })

    expect(plugin.switched).toEqual([])
  })

  test("main sessions do not list models, mutate rate limits, or consume the switch cap", async () => {
    const session: { parentID?: string } = {}
    const first = catalogModel("main-guard", "current")
    const second = catalogModel("main-guard", "alternative")
    const plugin = await setupPlugin([first, second], session)
    const event: RetryEvent = {
      sessionID: "ses_main",
      model: { providerID: first.providerID, id: first.id },
      error: { type: "provider.rate-limit", status: 429 },
      decision: { retry: true, delay: 600_000 },
    }

    for (let index = 0; index < 4; index += 1) await plugin.emit(event)

    expect(plugin.listCalls()).toBe(0)
    expect(plugin.switched).toEqual([])
    expect(isRateLimited(first.providerID, first.id)).toBe(false)

    session.parentID = "ses_parent"
    await plugin.emit(event)
    expect(plugin.listCalls()).toBe(1)
    expect(plugin.switched).toEqual([{ sessionID: "ses_main", model: { providerID: second.providerID, id: second.id } }])
  })

  test("does not switch when the retry delay is missing", async () => {
    const first = catalogModel("opencode-go", "hungerg-free")
    const plugin = await setupPlugin([first, catalogModel("opencode", "tidepool-alpha-free")], { parentID: "ses_parent" })

    await plugin.emit({
      sessionID: "ses_a",
      model: { providerID: first.providerID, id: first.id },
      error: { type: "provider.rate-limit", status: 429 },
    })

    expect(plugin.switched).toEqual([])
  })

  test("ignores non-finite and non-number delays without mutating rate limits", async () => {
    const first = catalogModel("delay-guard", "current")
    const plugin = await setupPlugin([first, catalogModel("delay-guard", "alternative")], { parentID: "ses_parent" })

    for (const delay of [Number.POSITIVE_INFINITY, "600000"]) {
      await plugin.emit({
        sessionID: "ses_a",
        model: { providerID: first.providerID, id: first.id },
        error: { type: "provider.rate-limit", status: 429 },
        decision: { retry: true, delay },
      })
    }

    expect(plugin.listCalls()).toBe(0)
    expect(plugin.switched).toEqual([])
    expect(isRateLimited(first.providerID, first.id)).toBe(false)
  })

  test("does not switch when the retry is not a rate limit", async () => {
    const first = catalogModel("opencode-go", "hungerg-free")
    const plugin = await setupPlugin([first, catalogModel("opencode", "tidepool-alpha-free")], { parentID: "ses_parent" })

    await plugin.emit({
      sessionID: "ses_a",
      model: { providerID: first.providerID, id: first.id },
      error: { type: "provider.invalid-request", message: "Bad request" },
      decision: { retry: true, delay: 600_000 },
    })

    expect(plugin.switched).toEqual([])
  })

  test("does not switch when no alternative is available", async () => {
    const first = catalogModel("opencode-go", "hungerg-free")
    const plugin = await setupPlugin([first], { parentID: "ses_parent" })

    await plugin.emit({
      sessionID: "ses_a",
      model: { providerID: first.providerID, id: first.id },
      error: { type: "provider.rate-limit", status: 429 },
      decision: { retry: true, delay: 600_000 },
    })

    expect(plugin.switched).toEqual([])
  })

  test("isRateLimitError matches status 429 and rate-limit text but not plain errors", () => {
    expect(isRateLimitError({ status: 429, type: "provider.server_error" })).toBe(true)
    expect(isRateLimitError({ type: "provider.error", message: "rate limit reached" })).toBe(true)
    expect(isRateLimitError({ type: "provider.invalid-request", message: "Bad request" })).toBe(false)
    expect(isRateLimitError(undefined)).toBe(false)
  })

  test("selectAlternativeModel skips the current model, non-chat, and rate-limited models", () => {
    const current = { providerID: "opencode-go", id: "hungerg-free" }
    const others = [catalogModel("opencode", "tidepool-alpha-free"), catalogModel("openai", "gpt-6.1-terra")]

    expect(selectAlternativeModel([catalogModel(current.providerID, current.id), ...others], current)).toEqual({
      providerID: "opencode",
      id: "tidepool-alpha-free",
    })

    markRateLimited(others[0].providerID, others[0].id)
    expect(selectAlternativeModel([catalogModel(current.providerID, current.id), ...others], current)).toEqual({
      providerID: "openai",
      id: "gpt-6.1-terra",
    })
  })
})
