import { create } from 'zustand'
import type { ModelInfo, HardwareInfo } from '@/lib/ipc'
import * as ipc from '@/lib/ipc'
import { listDownloadedModels } from '@/lib/ipc/hub'
import { useSettingsStore } from '@/stores/settingsStore'

interface EngineState {
  loadedModel: ModelInfo | null
  generating: boolean
  loading: boolean
  hardware: HardwareInfo | null

  init: () => Promise<void>
  loadModel: () => Promise<void>
  loadModelFromPath: (path: string, modelId: string) => Promise<void>
  unloadModel: () => Promise<void>
  startInference: (chatId: string) => Promise<void>
  stopInference: () => void
  setGenerating: (g: boolean) => void
  setLoadedModel: (m: ModelInfo | null) => void
}

let initPromise: Promise<void> | null = null

export const useEngineStore = create<EngineState>((set, get) => ({
  loadedModel: null,
  generating: false,
  loading: false,
  hardware: null,

  init: async () => {
    if (initPromise) return initPromise
    initPromise = (async () => {
    try {
      const [status, hardware] = await Promise.all([
        ipc.getEngineStatus(),
        ipc.getHardwareInfo(),
      ])
      set({
        loadedModel: status.loadedModel,
        generating: status.generating,
        hardware,
      })

      if (status.loadedModel) return

      const settings = useSettingsStore.getState()
      if (!settings.autoLoadDefaultEnabled || !settings.defaultModelId) return

      let model
      try {
        const models = await listDownloadedModels()
        model = models.find((m) => m.id === settings.defaultModelId)
      } catch (err) {
        console.warn('Failed to look up default model:', err)
        return
      }
      if (!model) {
        console.warn(
          `Default model ${settings.defaultModelId} not found in downloaded models`
        )
        useSettingsStore.getState().setDefaultModelId(null).catch(() => {})
        return
      }

      set({ loading: true })
      try {
        const info = await ipc.loadModel(
          model.storagePath,
          model.id,
          settings.gpuLayers
        )
        set({ loadedModel: info, loading: false })
      } catch (err) {
        console.error('Failed to auto-load default model:', err)
        set({ loading: false })
      }
    } catch (err) {
      console.error('Failed to init engine store:', err)
    }
    })()
    return initPromise
  },

  loadModel: async () => {
    const path = await ipc.pickModelFile()
    if (!path) return

    const name =
      path.split('/').filter(Boolean).pop() ??
      path.split('\\').filter(Boolean).pop() ??
      'model'
    const modelId = name.replace(/\.gguf$/i, '')

    await get().loadModelFromPath(path, modelId)
  },

  loadModelFromPath: async (path, modelId) => {
    set({ loading: true })
    try {
      const gpuLayers = useSettingsStore.getState().gpuLayers
      const info = await ipc.loadModel(path, modelId, gpuLayers)
      set({ loadedModel: info, loading: false })
    } catch (err) {
      console.error('Failed to load model:', err)
      set({ loading: false })
    }
  },

  unloadModel: async () => {
    try {
      await ipc.unloadModel()
      set({ loadedModel: null })
    } catch (err) {
      console.error('Failed to unload model:', err)
    }
  },

  startInference: async (chatId) => {
    set({ generating: true })
    try {
      await ipc.startInference(chatId)
    } catch (err) {
      console.error('Failed to start inference:', err)
      set({ generating: false })
    }
  },

  stopInference: () => {
    ipc.stopInference().catch(console.error)
  },

  setGenerating: (generating) => set({ generating }),
  setLoadedModel: (loadedModel) => set({ loadedModel }),
}))
