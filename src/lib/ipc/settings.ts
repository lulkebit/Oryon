import { invoke } from '@tauri-apps/api/core'
import type { Theme } from '@/lib/types'

export async function getTheme(): Promise<Theme> {
  const raw = await invoke<string>('get_theme')
  return JSON.parse(raw) as Theme
}

export async function setTheme(theme: Theme): Promise<void> {
  await invoke('set_theme', { theme })
}

export async function getAppInfo(): Promise<{
  name: string
  version: string
}> {
  return invoke('get_app_info')
}
