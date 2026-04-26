// 驾驭工程/马场 (Horse Farm) — 多项目并行开发管理

export type HFWorkflowPhase =
  | 'idle'
  | 'requirements'
  | 'summarizing'
  | 'mindmap'
  | 'active'
  | 'paused'

export type HFSubTab = 'list' | 'mindmap' | 'knowledgebase'

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
