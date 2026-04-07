import { isTauri } from '@/lib/tauri'
import type { Theme } from '@/lib/types'

export async function getTheme(): Promise<Theme> {
  if (!isTauri) return 'system'
  const { invoke } = await import('@tauri-apps/api/core')
  const raw = await invoke<string>('get_theme')
  return JSON.parse(raw) as Theme
}

export async function setTheme(theme: Theme): Promise<void> {
  if (!isTauri) return
  const { invoke } = await import('@tauri-apps/api/core')
  await invoke('set_theme', { theme })
}

export async function getAppInfo(): Promise<{
  name: string
  version: string
}> {
  if (!isTauri) return { name: 'Oryon', version: '0.1.0' }
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke('get_app_info')
}
