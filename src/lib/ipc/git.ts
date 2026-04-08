import { isTauri } from '@/lib/tauri'

export interface GitFileStatus {
  path: string
  status: string
  staged: boolean
  originalPath?: string
}

export interface GitStatusResult {
  branch: string
  upstream?: string
  ahead: number
  behind: number
  files: GitFileStatus[]
  isRepo: boolean
}

export async function gitGetStatus(
  workspacePath: string
): Promise<GitStatusResult> {
  if (!isTauri) {
    return { branch: '', upstream: undefined, ahead: 0, behind: 0, files: [], isRepo: false }
  }
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke('git_get_status', { workspacePath })
}

export async function gitGetFileDiff(
  workspacePath: string,
  filePath: string,
  staged: boolean,
  untracked: boolean
): Promise<string> {
  if (!isTauri) return ''
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke('git_get_file_diff', { workspacePath, filePath, staged, untracked })
}
