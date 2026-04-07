import { create } from 'zustand'
import { isTauri } from '@/lib/tauri'
import type { HfModelResult, StoredModel } from '@/lib/ipc/hub'
import {
  searchModels,
  searchModelsFeatured,
  downloadModel,
  cancelDownload,
  listDownloadedModels,
  deleteModel,
} from '@/lib/ipc/hub'

interface DownloadProgress {
  downloadId: string
  downloaded: number
  total: number
  speedBps: number
}

interface ActiveDownload {
  repoId: string
  filename: string
  progress: DownloadProgress | null
}

export interface FeaturedCategory {
  id: string
  label: string
  description: string
  query: string
  results: HfModelResult[]
  loading: boolean
}

const FEATURED_CATEGORIES: Omit<FeaturedCategory, 'results' | 'loading'>[] = [
  {
    id: 'coding',
    label: 'Popular for Coding',
    description: 'Instruction-tuned models optimized for code generation',
    query: 'coder instruct gguf',
  },
  {
    id: 'small',
    label: 'Small & Fast',
    description: 'Lightweight models that run well on most hardware',
    query: '1b instruct gguf small',
  },
  {
    id: 'chat',
    label: 'Chat & General Purpose',
    description: 'Versatile models for conversations and general tasks',
    query: 'instruct chat gguf',
  },
  {
    id: 'reasoning',
    label: 'Reasoning',
    description: 'Models with strong logical and analytical capabilities',
    query: 'reasoning think gguf',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    description: 'High-performance open-source models from DeepSeek',
    query: 'deepseek gguf',
  },
  {
    id: 'qwen',
    label: 'Qwen',
    description: 'State-of-the-art models from Alibaba Cloud',
    query: 'qwen gguf instruct',
  },
]

interface ModelHubState {
  query: string
  searchResults: HfModelResult[]
  searching: boolean
  downloadedModels: StoredModel[]
  activeDownload: ActiveDownload | null
  tab: 'explore' | 'downloaded'
  featured: FeaturedCategory[]
  featuredLoaded: boolean
  error: string | null

  setQuery: (query: string) => void
  search: (query: string) => Promise<void>
  loadFeatured: () => Promise<void>
  loadDownloaded: () => Promise<void>
  startDownload: (repoId: string, filename: string) => Promise<void>
  cancelActiveDownload: () => Promise<void>
  removeModel: (modelId: string) => Promise<void>
  setTab: (tab: 'explore' | 'downloaded') => void
  updateDownloadProgress: (progress: DownloadProgress) => void
  onDownloadComplete: () => void
  onDownloadCancelled: () => void
  initEventListeners: () => Promise<void>
}

let _dlListenersActive = false

export const useModelHubStore = create<ModelHubState>((set, get) => ({
  query: '',
  searchResults: [],
  searching: false,
  downloadedModels: [],
  activeDownload: null,
  tab: 'explore',
  featured: FEATURED_CATEGORIES.map((c) => ({
    ...c,
    results: [],
    loading: false,
  })),
  featuredLoaded: false,
  error: null,

  setQuery: (query) => set({ query }),

  search: async (query) => {
    if (!query.trim()) {
      set({ searchResults: [], searching: false })
      return
    }
    set({ searching: true, error: null })
    try {
      const results = await searchModels(query)
      set({ searchResults: results, searching: false })
    } catch (e) {
      set({ error: String(e), searching: false })
    }
  },

  loadFeatured: async () => {
    if (get().featuredLoaded) return

    const cats = get().featured.map((c) => ({ ...c, loading: true }))
    set({ featured: cats })

    const settled = await Promise.allSettled(
      FEATURED_CATEGORIES.map((c) => searchModelsFeatured(c.query))
    )

    const updated = get().featured.map((cat, i) => {
      const result = settled[i]
      return {
        ...cat,
        results:
          result.status === 'fulfilled' ? result.value.slice(0, 6) : [],
        loading: false,
      }
    })

    set({ featured: updated, featuredLoaded: true })
  },

  loadDownloaded: async () => {
    try {
      const models = await listDownloadedModels()
      set({ downloadedModels: models })
    } catch (e) {
      set({ error: String(e) })
    }
  },

  startDownload: async (repoId, filename) => {
    set({
      activeDownload: { repoId, filename, progress: null },
      error: null,
    })
    try {
      await downloadModel(repoId, filename)
    } catch (e) {
      const msg = String(e)
      if (!msg.includes('cancelled')) {
        set({ error: msg })
      }
      set({ activeDownload: null })
    }
  },

  cancelActiveDownload: async () => {
    await cancelDownload()
  },

  removeModel: async (modelId) => {
    try {
      await deleteModel(modelId)
      const models = get().downloadedModels.filter((m) => m.id !== modelId)
      set({ downloadedModels: models })
    } catch (e) {
      set({ error: String(e) })
    }
  },

  setTab: (tab) => set({ tab }),

  updateDownloadProgress: (progress) => {
    const dl = get().activeDownload
    if (dl) {
      set({ activeDownload: { ...dl, progress } })
    }
  },

  onDownloadComplete: () => {
    set({ activeDownload: null })
    get().loadDownloaded()
  },

  onDownloadCancelled: () => {
    set({ activeDownload: null })
  },

  initEventListeners: async () => {
    if (!isTauri) return
    if (_dlListenersActive) return
    _dlListenersActive = true

    const { listen } = await import('@tauri-apps/api/event')
    await listen<DownloadProgress>('download:progress', (event) => {
      useModelHubStore.getState().updateDownloadProgress(event.payload)
    })
    await listen('download:completed', () => {
      useModelHubStore.getState().onDownloadComplete()
    })
    await listen('download:cancelled', () => {
      useModelHubStore.getState().onDownloadCancelled()
    })
  },
}))
