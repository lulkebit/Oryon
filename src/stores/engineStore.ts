import { create } from 'zustand'
import type { ModelInfo, HardwareInfo } from '@/lib/ipc'
import * as ipc from '@/lib/ipc'

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

const LAST_LOADED_MODEL_KEY = 'last_loaded_model'

interface LastLoadedModel {
  path: string
  modelId: string
}

function persistLastLoadedModel(path: string, modelId: string): void {
  ipc
    .setSetting(LAST_LOADED_MODEL_KEY, JSON.stringify({ path, modelId }))
    .catch((err) =>
      console.error('Failed to persist last loaded model:', err)
    )
}

export const useEngineStore = create<EngineState>((set, get) => ({
  loadedModel: null,
  generating: false,
  loading: false,
  hardware: null,

  init: async () => {
    try {
      const [status, hardware, lastLoadedRaw] = await Promise.all([
        ipc.getEngineStatus(),
        ipc.getHardwareInfo(),
        ipc.getSetting(LAST_LOADED_MODEL_KEY),
      ])
      set({
        loadedModel: status.loadedModel,
        generating: status.generating,
        hardware,
      })

      if (status.loadedModel || !lastLoadedRaw) return

      let last: LastLoadedModel | null = null
      try {
        last = JSON.parse(lastLoadedRaw) as LastLoadedModel
      } catch {
        last = null
      }
      if (!last?.path || !last?.modelId) return

      set({ loading: true })
      try {
        const info = await ipc.loadModel(last.path, last.modelId)
        set({ loadedModel: info, loading: false })
      } catch (err) {
        console.warn('Failed to auto-load last model:', err)
        set({ loading: false })
        ipc.setSetting(LAST_LOADED_MODEL_KEY, '').catch(() => {})
      }
    } catch (err) {
      console.error('Failed to init engine store:', err)
    }
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
      const info = await ipc.loadModel(path, modelId)
      set({ loadedModel: info, loading: false })
      persistLastLoadedModel(path, modelId)
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
