export interface Workspace {
  id: string
  name: string
  path: string
  createdAt: string
  updatedAt: string
  lastOpened: string | null
  sortOrder: number
}

export interface Chat {
  id: string
  workspaceId: string
  title: string
  createdAt: string
  updatedAt: string
  isArchived: boolean
}

export type MessageRole =
  | 'user'
  | 'agent'
  | 'tool_call'
  | 'tool_result'
  | 'system'

export interface Message {
  id: string
  chatId: string
  agentId: string | null
  role: MessageRole
  content: string
  metadata: MessageMetadata | null
  createdAt: string
  sortOrder: number
}

export interface MessageMetadata {
  attachments?: Attachment[]
  toolCall?: ToolCallInfo
  toolResult?: ToolResultInfo
}

export interface Attachment {
  filename: string
  mimeType: string
  size: number
  content: string
}

export interface ToolCallInfo {
  toolId: string
  args: Record<string, unknown>
  status: 'pending' | 'running' | 'completed' | 'error'
  duration?: number
}

export interface ToolResultInfo {
  toolCallId: string
  output: string
  exitCode?: number
  truncated: boolean
}

export interface Agent {
  id: string
  name: string
  modelId: string | null
  systemPrompt: string
  tools: string[]
  temperature: number
  maxTokens: number
  color: string
  createdAt: string
  updatedAt: string
}

export interface Model {
  id: string
  name: string
  filename: string
  hfRepoId: string | null
  hfFilename: string | null
  fileSize: number
  quantization: string | null
  parameters: string | null
  architecture: string | null
  contextLength: number | null
  family: string | null
  license: string | null
  sha256: string | null
  downloadedAt: string
  lastUsedAt: string | null
  storagePath: string
}

export type Theme = 'system' | 'dark' | 'light'

export type ActiveView = 'chat' | 'models' | 'settings' | 'agents'
