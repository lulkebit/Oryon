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

export const useEngineStore = create<EngineState>((set) => ({
  loadedModel: null,
  generating: false,
  loading: false,
  hardware: null,

  init: async () => {
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

    set({ loading: true })
    try {
      const info = await ipc.loadModel(path, modelId)
      set({ loadedModel: info, loading: false })
    } catch (err) {
      console.error('Failed to load model:', err)
      set({ loading: false })
    }
  },

  loadModelFromPath: async (path, modelId) => {
    set({ loading: true })
    try {
      const info = await ipc.loadModel(path, modelId)
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
