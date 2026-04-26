import { useState, useCallback } from 'react'
import { useAppState } from '../context/AppContext'
import type { HorseFarmProject, HFTask, CommandMessage } from '../types/horseFarm'

export function useHorseFarm() {
  const [state, dispatch] = useAppState()
  const [hfProjects, setHfProjects] = useState<Record<string, HorseFarmProject>>({})
  const [globalCommands, setGlobalCommands] = useState<CommandMessage[]>([])

  const getProject = useCallback((projectPath: string): HorseFarmProject | undefined => {
    return hfProjects[projectPath]
  }, [hfProjects])

  const ensureProject = useCallback((projectPath: string, projectName: string, repoPath: string) => {
    setHfProjects(prev => {
      if (prev[projectPath]) return prev
      const entry: HorseFarmProject = {
        projectPath,
        projectName,
        repoPath,
        addedAt: new Date().toISOString(),
        phase: 'idle',
        requirements: '',
        summary: '',
        mindmapFilePath: '',
        knowledgeBasePath: '',
        tasks: [],
        lastActivityAt: new Date().toISOString(),
        commands: [],
      }
      return { ...prev, [projectPath]: entry }
    })
  }, [])

  const syncFromProjects = useCallback((projectIds: string[]) => {
    const known = new Set(projectIds)
    setHfProjects(prev => {
      const next: Record<string, HorseFarmProject> = {}
      for (const id of projectIds) {
        if (prev[id]) {
          next[id] = prev[id]
        } else {
          const proj = state.projects.find(p => p.path === id)
          next[id] = {
            projectPath: id,
            projectName: proj?.name || id.split('\\').pop() || id,
            repoPath: proj?.repoPath || '',
            addedAt: new Date().toISOString(),
            phase: 'idle',
            requirements: '',
            summary: '',
            mindmapFilePath: '',
            knowledgeBasePath: '',
            tasks: [],
            lastActivityAt: new Date().toISOString(),
            commands: [],
          }
        }
      }
      return next
    })
  }, [state.projects])

  const updateRequirements = useCallback((projectPath: string, requirements: string) => {
    setHfProjects(prev => {
      if (!prev[projectPath]) return prev
      return { ...prev, [projectPath]: { ...prev[projectPath], requirements, lastActivityAt: new Date().toISOString() } }
    })
  }, [])

  const updateSummary = useCallback((projectPath: string, summary: string) => {
    setHfProjects(prev => {
      if (!prev[projectPath]) return prev
      return { ...prev, [projectPath]: { ...prev[projectPath], summary, lastActivityAt: new Date().toISOString() } }
    })
  }, [])

  const setPhase = useCallback((projectPath: string, phase: HorseFarmProject['phase']) => {
    setHfProjects(prev => {
      if (!prev[projectPath]) return prev
      return { ...prev, [projectPath]: { ...prev[projectPath], phase, lastActivityAt: new Date().toISOString() } }
    })
  }, [])

  const setMindmapPath = useCallback((projectPath: string, path: string) => {
    setHfProjects(prev => {
      if (!prev[projectPath]) return prev
      return { ...prev, [projectPath]: { ...prev[projectPath], mindmapFilePath: path } }
    })
  }, [])

  const setKnowledgeBasePath = useCallback((projectPath: string, path: string) => {
    setHfProjects(prev => {
      if (!prev[projectPath]) return prev
      return { ...prev, [projectPath]: { ...prev[projectPath], knowledgeBasePath: path } }
    })
  }, [])

  const addTask = useCallback((projectPath: string, task: HFTask) => {
    setHfProjects(prev => {
      if (!prev[projectPath]) return prev
      return { ...prev, [projectPath]: { ...prev[projectPath], tasks: [...prev[projectPath].tasks, task], lastActivityAt: new Date().toISOString() } }
    })
  }, [])

  const updateTask = useCallback((projectPath: string, taskId: string, updates: Partial<HFTask>) => {
    setHfProjects(prev => {
      if (!prev[projectPath]) return prev
      const tasks = prev[projectPath].tasks.map(t => t.id === taskId ? { ...t, ...updates } : t)
      return { ...prev, [projectPath]: { ...prev[projectPath], tasks, lastActivityAt: new Date().toISOString() } }
    })
  }, [])

  const removeTask = useCallback((projectPath: string, taskId: string) => {
    setHfProjects(prev => {
      if (!prev[projectPath]) return prev
      return { ...prev, [projectPath]: { ...prev[projectPath], tasks: prev[projectPath].tasks.filter(t => t.id !== taskId), lastActivityAt: new Date().toISOString() } }
    })
  }, [])

  const addCommand = useCallback((projectPath: string | null, content: string) => {
    const msg: CommandMessage = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      timestamp: new Date().toISOString(),
      sender: 'user',
      content,
      projectPath: projectPath || undefined,
      type: 'chat',
    }
    if (projectPath) {
      setHfProjects(prev => {
        if (!prev[projectPath]) return prev
        return { ...prev, [projectPath]: { ...prev[projectPath], commands: [...prev[projectPath].commands, msg] } }
      })
    } else {
      setGlobalCommands(prev => [...prev, msg])
    }
  }, [])

  const addSystemMessage = useCallback((projectPath: string | null, content: string, type: CommandMessage['type'] = 'status') => {
    const msg: CommandMessage = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      timestamp: new Date().toISOString(),
      sender: 'system',
      content,
      projectPath: projectPath || undefined,
      type,
    }
    if (projectPath) {
      setHfProjects(prev => {
        if (!prev[projectPath]) return prev
        return { ...prev, [projectPath]: { ...prev[projectPath], commands: [...prev[projectPath].commands, msg] } }
      })
    } else {
      setGlobalCommands(prev => [...prev, msg])
    }
  }, [])

  const getActiveProject = useCallback((): HorseFarmProject | undefined => {
    if (!state.horseFarmActiveProject) return undefined
    return hfProjects[state.horseFarmActiveProject]
  }, [state.horseFarmActiveProject, hfProjects])

  const getProjectProgress = useCallback((projectPath: string): number => {
    const proj = hfProjects[projectPath]
    if (!proj || proj.tasks.length === 0) return 0
    const completed = proj.tasks.filter(t => t.status === 'completed').length
    return Math.round((completed / proj.tasks.length) * 100)
  }, [hfProjects])

  return {
    hfProjects,
    globalCommands,
    getProject,
    ensureProject,
    syncFromProjects,
    updateRequirements,
    updateSummary,
    setPhase,
    setMindmapPath,
    setKnowledgeBasePath,
    addTask,
    updateTask,
    removeTask,
    addCommand,
    addSystemMessage,
    getActiveProject,
    getProjectProgress,
  }
}
