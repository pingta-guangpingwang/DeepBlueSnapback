import { useState, useEffect, useRef, useCallback } from 'react'
import { validateVisualFile, type DBVSVisualFile, type CameraMode } from '../types/ai-workshop'

function buildDefaultScene(dirs: Array<{ id: string; name: string }>, projectName: string): DBVSVisualFile {
  const modules = dirs.length > 0
    ? dirs.map(d => ({ id: d.id, name: d.name, status: 'empty' as const }))
    : [{ id: 'root', name: projectName || 'Project', status: 'empty' as const }]

  return {
    schema: 1,
    timestamp: new Date().toISOString(),
    character: {
      name: 'AI',
      position: modules[0].id,
      action: 'idle',
      hp: 100,
      level: 1,
    },
    modules,
    tasks: [],
    stats: {
      gold: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      linesChanged: 0,
      filesModified: 0,
    },
  }
}

interface UseAIWorkshopReturn {
  data: DBVSVisualFile
  isStale: boolean
  isSynced: boolean
  cameraMode: CameraMode
  setCameraMode: (mode: CameraMode) => void
  cameraOffset: { x: number; y: number }
  setCameraOffset: (offset: { x: number; y: number }) => void
}

export function useAIWorkshop(projectPath: string): UseAIWorkshopReturn {
  const [data, setData] = useState<DBVSVisualFile>(() => buildDefaultScene([], ''))
  const [isStale, setIsStale] = useState(false)
  const [isSynced, setIsSynced] = useState(false)
  const [cameraMode, setCameraModeState] = useState<CameraMode>('follow')
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 })
  const lastUpdatedRef = useRef(Date.now())
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Scan project dirs on mount to build initial scene
  useEffect(() => {
    if (!projectPath) return
    ;(async () => {
      // Ensure 3D model assets are downloaded (runs in background, doesn't block)
      try { await window.electronAPI.ensureWorkshopAssets() } catch { /* non-critical */ }
      try {
        const result = await window.electronAPI.scanProjectDirs(projectPath)
        if (result.success && result.dirs) {
          const projectName = projectPath.split(/[/\\]/).filter(Boolean).pop() || 'Project'
          setData(buildDefaultScene(result.dirs, projectName))
        }
      } catch { /* ignore */ }
    })()
  }, [projectPath])

  // Poll dbvs-visual.json every second
  useEffect(() => {
    if (!projectPath) return
    const interval = setInterval(async () => {
      try {
        const result = await window.electronAPI.readVisualFile(projectPath)
        if (result?.success && result.content) {
          const parsed = JSON.parse(result.content)
          const validated = validateVisualFile(parsed)
          if (validated) {
            setData(validated)
            setIsStale(false)
            setIsSynced(true)
            lastUpdatedRef.current = Date.now()
            return
          }
        }
      } catch { /* invalid JSON or read error */ }
      // Mark stale if no valid update for 10s
      if (Date.now() - lastUpdatedRef.current > 10000) {
        setIsStale(true)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [projectPath])

  // Camera mode with auto-follow on idle
  const setCameraMode = useCallback((mode: CameraMode) => {
    setCameraModeState(mode)
    if (mode === 'free') {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      idleTimerRef.current = setTimeout(() => setCameraModeState('follow'), 5000)
    }
  }, [])

  // Reset idle timer on camera interaction
  const handleCameraOffset = useCallback((offset: { x: number; y: number }) => {
    setCameraOffset(offset)
    setCameraModeState('free')
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => setCameraModeState('follow'), 5000)
  }, [])

  return { data, isStale, isSynced, cameraMode, setCameraMode, cameraOffset, setCameraOffset: handleCameraOffset }
}
