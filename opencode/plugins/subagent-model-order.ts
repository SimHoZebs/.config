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
}

export const SUBAGENT_MODEL_PREFERENCES: readonly ModelPreference[] = [
  { providerID: "opencode-go", id: "hungerg-free" },
  { providerID: "opencode-go", id: "hy4-flash-free", variant: "high" },
  { providerID: "opencode", id: "deepseek-v4.1-flash-free", variant: "max" },
  { providerID: "opencode-go", id: "muse-spark-1.3-contributor", variant: "xhigh" },
  { providerID: "openai", id: "gpt-6.1-terra", variant: "medium" },
]

export function formatModelPreference(preference: ModelPreference) {
  const model = `${preference.providerID}/${preference.id}`
  return preference.variant ? `${model}#${preference.variant}` : model
}

export function isUsableModel(model: ModelInfo | undefined, preference: ModelPreference) {
  if (!model) return false
  if (model.providerID !== preference.providerID || model.id !== preference.id) return false
  if ((model.type ?? "chat") !== "chat") return false
  if (!model.enabled || model.status === "deprecated" || model.capabilities?.tools !== true) return false
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

async function installPlugin(ctx: PluginContext) {
  await ctx.tool.hook("execute.before", async (event) => {
    if (!isNewSubagentLaunch(event.tool, event.input)) return
    const { data: models } = await ctx.model.list()
    event.input.model = formatModelPreference(selectSubagentModel(models))
  })
}

export default {
  id: "local.subagent-model-order",
  setup: installPlugin,
}
