export type CharacterAction = 'idle' | 'walking' | 'fighting' | 'celebrating' | 'resting'
export type ModuleStatus = 'empty' | 'active' | 'complete' | 'building'
export type TaskStatus = 'pending' | 'active' | 'completed' | 'failed'
export type TaskDifficulty = 'easy' | 'medium' | 'hard'
export type CameraMode = 'follow' | 'free'

export interface DBVSVisualFile {
  schema: 1
  timestamp: string
  character: {
    name: string
    position: string
    action: CharacterAction
    hp: number
    level: number
  }
  modules: Array<{
    id: string
    name: string
    status: ModuleStatus
  }>
  tasks: Array<{
    id: string
    module: string
    description: string
    files: string[]
    progress: number
    status: TaskStatus
    difficulty: TaskDifficulty
    reward: number
  }>
  stats: {
    gold: number
    tasksCompleted: number
    tasksFailed: number
    linesChanged: number
    filesModified: number
  }
}

export interface AIWorkshopState {
  lastValid: DBVSVisualFile | null
  cameraMode: CameraMode
  cameraOffset: { x: number; y: number }
  isStale: boolean
  lastUpdated: number
}

export function validateVisualFile(raw: unknown): DBVSVisualFile | null {
  if (!raw || typeof raw !== 'object') return null
  const d = raw as Record<string, unknown>
  if (d.schema !== 1) return null
  if (typeof d.timestamp !== 'string') return null
  if (isNaN(Date.parse(d.timestamp))) return null
  const ch = d.character
  if (!ch || typeof ch !== 'object') return null
  const char = ch as Record<string, unknown>
  if (typeof char.position !== 'string') return null
  if (typeof char.action !== 'string') return null
  if (!Array.isArray(d.modules) || d.modules.length === 0) return null
  if (!d.stats || typeof d.stats !== 'object') return null
  return raw as DBVSVisualFile
}
