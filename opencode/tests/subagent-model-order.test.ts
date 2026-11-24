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

  test("throws with every unavailable preference instead of inheriting a caller model", () => {
    const unavailable = SUBAGENT_MODEL_PREFERENCES.map(formatModelPreference).join(", ")

    expect(() => selectSubagentModel([])).toThrow(
      `No usable model is available for new subagents. Unavailable preferences: ${unavailable}`,
    )
  })

  test("overrides only new subagent launches and refreshes the catalog on every launch", async () => {
    const first = SUBAGENT_MODEL_PREFERENCES[0]
    const second = SUBAGENT_MODEL_PREFERENCES[1]
    const callerModel = "caller/model#low"
    const plugin = await setupHook([catalogModel(first)])
    const existing = { tool: "subagent", input: { sessionID: "ses_existing", model: callerModel } }
    const otherTool = { tool: "read", input: { model: callerModel } }

    await plugin.run(otherTool)
    await plugin.run(existing)
    expect(plugin.listCalls()).toBe(0)
    expect(otherTool.input.model).toBe(callerModel)
    expect(existing.input.model).toBe(callerModel)

    const firstLaunch: Parameters<BeforeHook>[0] = { tool: "subagent", input: { prompt: "Investigate", model: callerModel } }
    await plugin.run(firstLaunch)
    expect(plugin.listCalls()).toBe(1)
    expect(firstLaunch.input).toEqual({ prompt: "Investigate", model: formatModelPreference(first) })

    plugin.setModels([catalogModel(second)])
    const secondLaunch: Parameters<BeforeHook>[0] = { tool: "subagent", input: { prompt: "Review", model: callerModel } }
    await plugin.run(secondLaunch)
    expect(plugin.listCalls()).toBe(2)
    expect(secondLaunch.input.model).toBe(formatModelPreference(second))
  })

  test("aborts a new launch when no preference is usable", async () => {
    const plugin = await setupHook([])
    const callerModel = "caller/model"
    const event = { tool: "subagent", input: { prompt: "Investigate", model: callerModel } }

    await expect(plugin.run(event)).rejects.toThrow("Unavailable preferences:")
    expect(event.input.model).toBe(callerModel)
  })
})
