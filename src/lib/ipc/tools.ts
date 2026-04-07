import { isTauri } from '@/lib/tauri'

export interface ToolResult {
  toolName: string
  success: boolean
  output: string
  durationMs: number
}

export interface ToolInfo {
  id: string
  name: string
  group: string
  description: string
}

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  workspacePath: string
): Promise<ToolResult> {
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke('execute_tool', { toolName, args, workspacePath })
}

export async function listAvailableTools(): Promise<ToolInfo[]> {
  if (!isTauri) return []
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke('list_available_tools')
}
