import { create } from 'zustand'
import * as ipc from '@/lib/ipc'

interface InferenceDefaults {
  temperature: number
  topP: number
  topK: number
  maxTokens: number
}

interface SettingsState {
  reducedMotion: boolean
  defaultModelId: string | null
  autoLoadDefaultEnabled: boolean
  inferenceDefaults: InferenceDefaults
  gpuLayers: number
  contextWindow: number
  ramReserveMb: number
  maxToolRounds: number
  autoUnloadEnabled: boolean
  autoUnloadMinutes: number
  modelStoragePath: string
  defaultTools: string[]
  shellBlocklist: string[]
  excludedPatterns: string[]
  loaded: boolean

  load: () => Promise<void>
  setReducedMotion: (v: boolean) => Promise<void>
  setDefaultModelId: (id: string | null) => Promise<void>
  setAutoLoadDefault: (v: boolean) => Promise<void>
  setInferenceDefaults: (d: Partial<InferenceDefaults>) => Promise<void>
  setGpuLayers: (n: number) => Promise<void>
  setContextWindow: (n: number) => Promise<void>
  setRamReserveMb: (n: number) => Promise<void>
  setMaxToolRounds: (n: number) => Promise<void>
  setAutoUnload: (enabled: boolean, minutes?: number) => Promise<void>
  setModelStoragePath: (p: string) => Promise<void>
  setDefaultTools: (tools: string[]) => Promise<void>
  setShellBlocklist: (list: string[]) => Promise<void>
  setExcludedPatterns: (patterns: string[]) => Promise<void>
}

async function get(key: string): Promise<string | null> {
  return ipc.getSetting(key)
}

async function put(key: string, value: string): Promise<void> {
  return ipc.setSetting(key, value)
}

function jsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

const DEFAULT_INFERENCE: InferenceDefaults = {
  temperature: 0.7,
  topP: 0.95,
  topK: 40,
  maxTokens: 4096,
}

const DEFAULT_TOOLS = [
  'file_read',
  'file_write',
  'file_create',
  'file_patch',
  'file_delete',
  'glob',
  'grep',
  'shell_exec',
  'git_status',
  'git_diff',
  'git_commit',
  'git_log',
]

const DEFAULT_BLOCKLIST = [
  'rm -rf /',
  'sudo',
  'shutdown',
  'reboot',
  'mkfs',
  'dd if=',
]

export const useSettingsStore = create<SettingsState>((set, get_) => ({
  reducedMotion: false,
  defaultModelId: null,
  autoLoadDefaultEnabled: true,
  inferenceDefaults: DEFAULT_INFERENCE,
  gpuLayers: 999,
  contextWindow: 0,
  ramReserveMb: 4096,
  maxToolRounds: 10,
  autoUnloadEnabled: false,
  autoUnloadMinutes: 30,
  modelStoragePath: '',
  defaultTools: DEFAULT_TOOLS,
  shellBlocklist: DEFAULT_BLOCKLIST,
  excludedPatterns: ['node_modules', '.git', 'dist', 'build', '.next'],
  loaded: false,

  load: async () => {
    const [
      reducedMotion,
      defaultModelId,
      autoLoadDefaultEnabled,
      inferenceRaw,
      gpuLayers,
      contextWindow,
      ramReserveMb,
      maxToolRounds,
      autoUnloadEnabled,
      autoUnloadMinutes,
      modelStoragePath,
      defaultTools,
      shellBlocklist,
      excludedPatterns,
    ] = await Promise.all([
      get('reduced_motion'),
      get('default_model_id'),
      get('auto_load_default_enabled'),
      get('inference_defaults'),
      get('gpu_layers'),
      get('context_window'),
      get('ram_reserve_mb'),
      get('max_tool_rounds'),
      get('auto_unload_enabled'),
      get('auto_unload_minutes'),
      get('model_storage_path'),
      get('default_tools'),
      get('shell_blocklist'),
      get('excluded_patterns'),
    ])

    set({
      reducedMotion: reducedMotion === 'true',
      defaultModelId: defaultModelId || null,
      autoLoadDefaultEnabled: autoLoadDefaultEnabled !== 'false',
      inferenceDefaults: jsonParse(inferenceRaw, DEFAULT_INFERENCE),
      gpuLayers: gpuLayers ? parseInt(gpuLayers, 10) : 999,
      contextWindow:
        contextWindow !== null && contextWindow !== ''
          ? parseInt(contextWindow, 10) || 0
          : 0,
      ramReserveMb: ramReserveMb ? parseInt(ramReserveMb, 10) || 4096 : 4096,
      maxToolRounds: maxToolRounds ? parseInt(maxToolRounds, 10) || 10 : 10,
      autoUnloadEnabled: autoUnloadEnabled === 'true',
      autoUnloadMinutes: autoUnloadMinutes
        ? parseInt(autoUnloadMinutes, 10)
        : 30,
      modelStoragePath: modelStoragePath ?? '',
      defaultTools: jsonParse(defaultTools, DEFAULT_TOOLS),
      shellBlocklist: jsonParse(shellBlocklist, DEFAULT_BLOCKLIST),
      excludedPatterns: jsonParse(excludedPatterns, [
        'node_modules',
        '.git',
        'dist',
        'build',
        '.next',
      ]),
      loaded: true,
    })
  },

  setReducedMotion: async (v) => {
    set({ reducedMotion: v })
    await put('reduced_motion', String(v))
  },

  setDefaultModelId: async (id) => {
    set({ defaultModelId: id })
    await put('default_model_id', id ?? '')
  },

  setAutoLoadDefault: async (v) => {
    set({ autoLoadDefaultEnabled: v })
    await put('auto_load_default_enabled', String(v))
  },

  setInferenceDefaults: async (partial) => {
    const merged = { ...get_().inferenceDefaults, ...partial }
    set({ inferenceDefaults: merged })
    await put('inference_defaults', JSON.stringify(merged))
  },

  setGpuLayers: async (n) => {
    set({ gpuLayers: n })
    await put('gpu_layers', String(n))
  },

  setContextWindow: async (n) => {
    set({ contextWindow: n })
    await put('context_window', String(n))
  },

  setRamReserveMb: async (n) => {
    const clamped = Math.max(512, Math.round(n))
    set({ ramReserveMb: clamped })
    await put('ram_reserve_mb', String(clamped))
  },

  setMaxToolRounds: async (n) => {
    const clamped = Math.max(1, Math.min(100, Math.round(n)))
    set({ maxToolRounds: clamped })
    await put('max_tool_rounds', String(clamped))
  },

  setAutoUnload: async (enabled, minutes) => {
    const updates: Partial<SettingsState> = { autoUnloadEnabled: enabled }
    if (minutes !== undefined) updates.autoUnloadMinutes = minutes
    set(updates)
    await put('auto_unload_enabled', String(enabled))
    if (minutes !== undefined) await put('auto_unload_minutes', String(minutes))
  },

  setModelStoragePath: async (p) => {
    set({ modelStoragePath: p })
    await put('model_storage_path', p)
  },

  setDefaultTools: async (tools) => {
    set({ defaultTools: tools })
    await put('default_tools', JSON.stringify(tools))
  },

  setShellBlocklist: async (list) => {
    set({ shellBlocklist: list })
    await put('shell_blocklist', JSON.stringify(list))
  },

  setExcludedPatterns: async (patterns) => {
    set({ excludedPatterns: patterns })
    await put('excluded_patterns', JSON.stringify(patterns))
  },
}))
