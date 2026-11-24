import { describe, expect, test } from "bun:test"
import SubagentModelOrder, {
  SUBAGENT_MODEL_PREFERENCES,
  formatModelPreference,
  isUsableModel,
  selectSubagentModel,
  type ModelPreference,
  type ModelRef,
} from "../plugins/subagent-model-order"

type CatalogModel = NonNullable<Parameters<typeof isUsableModel>[0]>
type BeforeHook = (event: {
  tool: string
  input: { sessionID?: string; model?: string; [key: string]: unknown }
}) => Promise<void> | void

function catalogModel(preference: ModelPreference, overrides: Partial<CatalogModel> = {}): CatalogModel {
  return {
    providerID: preference.providerID,
    id: preference.id,
    modelID: preference.id,
    type: "chat",
    enabled: true,
    status: "active",
    capabilities: { tools: true },
    variants: preference.variant ? [{ id: preference.variant }] : [],
    ...overrides,
  }
}

function modelRef(preference: ModelPreference): ModelRef {
  return {
    providerID: preference.providerID,
    id: preference.id,
    ...(preference.variant ? { variant: preference.variant } : {}),
  }
}

async function setupHook(initialModels: CatalogModel[]) {
  let models = initialModels
  let listCalls = 0
  let hook: BeforeHook | undefined

  await SubagentModelOrder.setup({
    model: {
      list: async () => {
        listCalls += 1
        return { data: models }
      },
    },
    tool: {
      hook: async (name, callback) => {
        expect(name).toBe("execute.before")
        hook = callback
      },
    },
  })

  return {
    run: (event: Parameters<BeforeHook>[0]) => hook!(event),
    setModels: (next: CatalogModel[]) => {
      models = next
    },
    listCalls: () => listCalls,
  }
}

describe("subagent model selection", () => {
  test("uses the exact preference order", () => {
    expect(SUBAGENT_MODEL_PREFERENCES.map(formatModelPreference)).toEqual([
      "opencode-go/hungerg-free",
      "opencode-go/hy4-flash-free#high",
      "opencode/deepseek-v4.1-flash-free#max",
      "opencode-go/muse-spark-1.3-contributor#xhigh",
      "openai/gpt-6.1-terra#medium",
    ])
  })

  test("selects the first usable preference and omits an unspecified variant", () => {
    const models = [...SUBAGENT_MODEL_PREFERENCES].reverse().map((preference) => catalogModel(preference))
    const snapshot = structuredClone(models)

    expect(selectSubagentModel(models)).toEqual({ providerID: "opencode-go", id: "hungerg-free" })
    expect(models).toEqual(snapshot)
  })

  test("falls through disabled preferences in order and preserves requested variants", () => {
    const models = SUBAGENT_MODEL_PREFERENCES.map((preference) => catalogModel(preference))

    for (let index = 0; index < SUBAGENT_MODEL_PREFERENCES.length - 1; index += 1) {
      models[index] = { ...models[index], enabled: false }
      expect(selectSubagentModel(models)).toEqual(modelRef(SUBAGENT_MODEL_PREFERENCES[index + 1]))
    }
  })

  test("rejects missing, disabled, deprecated, non-chat, and tool-incapable models", () => {
    const preference = SUBAGENT_MODEL_PREFERENCES[0]
    const unusable: (CatalogModel | undefined)[] = [
      undefined,
      catalogModel(preference, { providerID: "other" }),
      catalogModel(preference, { id: "other", modelID: preference.id }),
      catalogModel(preference, { enabled: false }),
      catalogModel(preference, { status: "deprecated" }),
      catalogModel(preference, { type: "image" }),
      catalogModel(preference, { capabilities: undefined }),
      catalogModel(preference, { capabilities: { tools: false } }),
    ]

    for (const model of unusable) expect(isUsableModel(model, preference)).toBe(false)
    expect(isUsableModel(catalogModel(preference, { type: undefined }), preference)).toBe(true)
  })

  test("requires the requested variant to exist", () => {
    const preference = SUBAGENT_MODEL_PREFERENCES[1]

    expect(isUsableModel(catalogModel(preference, { variants: undefined }), preference)).toBe(false)
    expect(isUsableModel(catalogModel(preference, { variants: [] }), preference)).toBe(false)
    expect(isUsableModel(catalogModel(preference, { variants: [{ id: "max" }] }), preference)).toBe(false)
    expect(isUsableModel(catalogModel(preference, { variants: [{ id: "high" }] }), preference)).toBe(true)
  })

  test("throws with every unavailable preference when no model can be selected", () => {
    const unavailable = SUBAGENT_MODEL_PREFERENCES.map(formatModelPreference).join(", ")

    expect(() => selectSubagentModel([])).toThrow(
      `No usable model is available for new subagents. Unavailable preferences: ${unavailable}`,
    )
  })

  test("preserves an explicit model byte-for-byte without reading the catalog", async () => {
    const first = SUBAGENT_MODEL_PREFERENCES[0]
    const callerModel = "Caller/Provider-Model#Variant.Exact"
    const plugin = await setupHook([catalogModel(first)])
    const event = { tool: "subagent", input: { prompt: "Investigate", model: callerModel } }

    await plugin.run(event)

    expect(plugin.listCalls()).toBe(0)
    expect(event.input.model).toBe(callerModel)
  })

  test("fills a missing model with the first usable preference", async () => {
    const first = SUBAGENT_MODEL_PREFERENCES[0]
    const models = [...SUBAGENT_MODEL_PREFERENCES].reverse().map((preference) => catalogModel(preference))
    const plugin = await setupHook(models)
    const event: Parameters<BeforeHook>[0] = { tool: "subagent", input: { prompt: "Investigate" } }

    await plugin.run(event)

    expect(plugin.listCalls()).toBe(1)
    expect(event.input).toEqual({ prompt: "Investigate", model: formatModelPreference(first) })
  })

  test("refreshes the catalog on later missing-model launches and falls through unavailable preferences", async () => {
    const first = SUBAGENT_MODEL_PREFERENCES[0]
    const second = SUBAGENT_MODEL_PREFERENCES[1]
    const plugin = await setupHook([catalogModel(first)])
    const firstLaunch: Parameters<BeforeHook>[0] = { tool: "subagent", input: { prompt: "Investigate" } }

    await plugin.run(firstLaunch)
    expect(plugin.listCalls()).toBe(1)
    expect(firstLaunch.input).toEqual({ prompt: "Investigate", model: formatModelPreference(first) })

    plugin.setModels([catalogModel(second)])
    const secondLaunch: Parameters<BeforeHook>[0] = { tool: "subagent", input: { prompt: "Review" } }
    await plugin.run(secondLaunch)
    expect(plugin.listCalls()).toBe(2)
    expect(secondLaunch.input).toEqual({ prompt: "Review", model: formatModelPreference(second) })
  })

  test("leaves existing child sessions and other tools untouched", async () => {
    const plugin = await setupHook([catalogModel(SUBAGENT_MODEL_PREFERENCES[0])])
    const existing = { tool: "subagent", input: { sessionID: "ses_existing", prompt: "Resume" } }
    const otherTool = { tool: "read", input: { filePath: "README.md" } }
    const snapshot = structuredClone([existing, otherTool])

    await plugin.run(existing)
    await plugin.run(otherTool)

    expect(plugin.listCalls()).toBe(0)
    expect([existing, otherTool]).toEqual(snapshot)
  })

  test("aborts a missing-model launch when no preference is usable", async () => {
    const plugin = await setupHook([])
    const event: Parameters<BeforeHook>[0] = { tool: "subagent", input: { prompt: "Investigate" } }

    await expect(plugin.run(event)).rejects.toThrow("Unavailable preferences:")
    expect(plugin.listCalls()).toBe(1)
    expect(event.input).toEqual({ prompt: "Investigate" })
  })

  test("passes an explicit model through with an empty catalog", async () => {
    const plugin = await setupHook([])
    const callerModel = "caller/model#custom"
    const event = { tool: "subagent", input: { prompt: "Investigate", model: callerModel } }

    await plugin.run(event)

    expect(plugin.listCalls()).toBe(0)
    expect(event.input.model).toBe(callerModel)
  })
})
