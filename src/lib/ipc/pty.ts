import { isTauri } from '@/lib/tauri'

export interface PtySessionInfo {
  id: string
  title: string
  cwd: string
  shell: string
}

export interface PtyDataEvent {
  sessionId: string
  data: string
}

export interface PtyExitEvent {
  sessionId: string
  code?: number
}

export async function ptyCreate(
  cwd: string,
  cols: number,
  rows: number,
  shell?: string
): Promise<PtySessionInfo> {
  if (!isTauri) throw new Error('Not in Tauri context')
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke('pty_create', { cwd, cols, rows, shell })
}

export async function ptyWrite(sessionId: string, data: string): Promise<void> {
  if (!isTauri) return
  const { invoke } = await import('@tauri-apps/api/core')
  await invoke('pty_write', { sessionId, data })
}

export async function ptyResize(
  sessionId: string,
  cols: number,
  rows: number
): Promise<void> {
  if (!isTauri) return
  const { invoke } = await import('@tauri-apps/api/core')
  await invoke('pty_resize', { sessionId, cols, rows })
}

export async function ptyKill(sessionId: string): Promise<void> {
  if (!isTauri) return
  const { invoke } = await import('@tauri-apps/api/core')
  await invoke('pty_kill', { sessionId })
}

export async function ptyList(): Promise<PtySessionInfo[]> {
  if (!isTauri) return []
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke('pty_list')
}

export async function subscribePtyData(
  handler: (event: PtyDataEvent) => void
): Promise<() => void> {
  if (!isTauri) return () => {}
  const { listen } = await import('@tauri-apps/api/event')
  const unlisten = await listen<PtyDataEvent>('pty:data', (e) => handler(e.payload))
  return unlisten
}

export async function subscribePtyExit(
  handler: (event: PtyExitEvent) => void
): Promise<() => void> {
  if (!isTauri) return () => {}
  const { listen } = await import('@tauri-apps/api/event')
  const unlisten = await listen<PtyExitEvent>('pty:exit', (e) => handler(e.payload))
  return unlisten
}
