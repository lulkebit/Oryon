import { useWorkspaceStore } from '@/stores/workspaceStore'

export function useActiveWorkspacePath(): string | null {
  const activeChatId = useWorkspaceStore((s) => s.activeChatId)
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)
  const chats = useWorkspaceStore((s) => s.chats)
  const workspaces = useWorkspaceStore((s) => s.workspaces)

  // Derive workspace from active chat first (setActiveChat never sets activeWorkspaceId)
  const workspaceId =
    (activeChatId
      ? chats.find((c) => c.id === activeChatId)?.workspaceId
      : null) ?? activeWorkspaceId

  if (!workspaceId) {
    // Fall back to first workspace if only one exists
    if (workspaces.length === 1) return workspaces[0].path
    return null
  }

  return workspaces.find((w) => w.id === workspaceId)?.path ?? null
}
