// 驾驭工程/马场 (Horse Farm) — 多项目并行开发管理

export type HFWorkflowPhase =
  | 'idle'
  | 'requirements'
  | 'summarizing'
  | 'mindmap'
  | 'active'
  | 'paused'

export type HFSubTab = 'list' | 'mindmap' | 'knowledgebase' | 'settings'

export interface HFTask {
  id: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'blocked'
  priority: 'high' | 'medium' | 'low'
  progress: number
  createdAt: string
  completedAt?: string
  dependsOn: string[]
}

export interface CommandMessage {
  id: string
  timestamp: string
  sender: 'user' | 'ai' | 'system'
  content: string
  projectPath?: string
  type: 'chat' | 'command' | 'status' | 'error'
}

export interface HorseFarmProject {
  projectPath: string
  projectName: string
  repoPath: string
  addedAt: string
  phase: HFWorkflowPhase
  requirements: string
  summary: string
  mindmapFilePath: string
  knowledgeBasePath: string
  tasks: HFTask[]
  lastActivityAt: string
  commands: CommandMessage[]
}

export interface MindMapNode {
  id: string
  label: string
  type: 'root' | 'module' | 'task' | 'file' | 'concept'
  status: 'pending' | 'in_progress' | 'completed' | 'blocked'
  progress: number
  children: MindMapNode[]
  metadata?: {
    filePaths?: string[]
    description?: string
    priority?: 'high' | 'medium' | 'low'
  }
}

export interface MindMapData {
  schema: 1
  projectName: string
  generatedAt: string
  rootNode: MindMapNode
}

// API Key 管理
export type HFProvider = 'deepseek'

export interface HFApiKey {
  id: string
  name: string
  key: string
  provider: HFProvider
  role: 'manager' | 'worker'
  model: string
  enabled: boolean
  status: 'active' | 'rate_limited' | 'exhausted' | 'error'
  lastCheckedAt?: string
  errorMessage?: string
  config: {
    temperature: number
    maxTokens: number
    thinkingEnabled: boolean
    thinkingBudgetTokens?: number
  }
}

export interface HFConfig {
  projectIds: string[]
  apiKeys: HFApiKey[]
  settings: {
    defaultModel: string
    defaultTemperature: number
    defaultMaxTokens: number
    pollingIntervalMs: number
    maxConcurrentTasks: number
  }
}

export const DEEPSEEK_MODELS = [
  { value: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro' },
  { value: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash' },
  { value: 'deepseek-chat', label: 'DeepSeek Chat (V3)' },
  { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner (R1)' },
]

export const DEFAULT_API_CONFIG = {
  defaultModel: 'deepseek-v4-pro',
  defaultTemperature: 0.7,
  defaultMaxTokens: 4096,
  pollingIntervalMs: 5000,
  maxConcurrentTasks: 3,
}
