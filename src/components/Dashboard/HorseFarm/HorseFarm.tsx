import { useEffect, useMemo, useState } from 'react'
import { useAppState } from '../../../context/AppContext'
import { useI18n } from '../../../i18n'
import { useHorseFarm } from '../../../hooks/useHorseFarm'
import type { HFSubTab, HFConfig } from '../../../types/horseFarm'
import { DEFAULT_API_CONFIG } from '../../../types/horseFarm'
import CommandCenter from './CommandCenter'
import ProjectList from './ProjectList'
import MindMapViewer from './MindMapViewer'
import KnowledgeBaseViewer from './KnowledgeBaseViewer'
import HorseFarmSettings from './HorseFarmSettings'
import './HorseFarm.css'

export interface InitProgress {
  status: 'queued' | 'running' | 'done' | 'exists' | 'error'
  log: string[]
  kbResult: string
  mindmapResult: string
}

export default function HorseFarm() {
  const [state, dispatch] = useAppState()
  const { t } = useI18n()
  const hf = useHorseFarm()
  const [hfConfig, setHfConfig] = useState<HFConfig>({
    projectIds: [],
    apiKeys: [],
    settings: { ...DEFAULT_API_CONFIG },
  })
  const [detailPanel, setDetailPanel] = useState<{
    type: 'mindmap' | 'kb' | 'initLog' | null
    projectPath: string | null
  }>({ type: null, projectPath: null })
  const [initializing, setInitializing] = useState(false)
  const [initProgress, setInitProgress] = useState<Record<string, InitProgress>>({})

  useEffect(() => {
    window.electronAPI.loadHorseFarmConfig().then(result => {
      if (result.success && result.config) {
        setHfConfig(result.config)
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    hf.syncFromProjects(state.horseFarmProjectIds)
  }, [state.horseFarmProjectIds, state.projects])

  const subTabs: Array<{ key: HFSubTab; label: string }> = [
    { key: 'list', label: t.horseFarm.subTabList },
    { key: 'settings', label: t.horseFarm.subTabSettings },
  ]

  const allCommands = useMemo(() => {
    const msgs = [...hf.globalCommands]
    for (const id of state.horseFarmProjectIds) {
      const proj = hf.hfProjects[id]
      if (proj) {
        for (const cmd of proj.commands) msgs.push(cmd)
      }
    }
    msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    return msgs
  }, [hf.globalCommands, hf.hfProjects, state.horseFarmProjectIds])

  const addLog = (path: string, msg: string) => {
    setInitProgress(prev => ({
      ...prev,
      [path]: {
        ...prev[path],
        log: [...(prev[path]?.log || []), new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + msg],
      },
    }))
  }

  const handleInitializeAll = async () => {
    if (state.horseFarmProjectIds.length === 0) return
    setInitializing(true)

    // Initialize all projects as queued
    const initial: Record<string, InitProgress> = {}
    for (const id of state.horseFarmProjectIds) {
      const proj = hf.hfProjects[id]
      const name = proj?.projectName || id.split('\\').pop() || id
      initial[id] = { status: 'queued', log: [name + ': queued'], kbResult: '', mindmapResult: '' }
    }
    setInitProgress(initial)

    // Process each project sequentially
    for (const id of state.horseFarmProjectIds) {
      const proj = hf.hfProjects[id]
      const name = proj?.projectName || id.split('\\').pop() || id

      // Mark running
      setInitProgress(prev => ({ ...prev, [id]: { ...prev[id], status: 'running' } }))

      // Generate Knowledge Base
      addLog(id, 'Checking knowledge base...')
      try {
        const kbResult = await window.electronAPI.readKnowledgeBase(id)
        if (kbResult.success) {
          addLog(id, 'Knowledge base already exists, using existing')
          setInitProgress(prev => ({ ...prev, [id]: { ...prev[id], kbResult: 'exists' } }))
        } else {
          addLog(id, 'Generating knowledge base...')
          const genKb = await window.electronAPI.generateKnowledgeBase(id, name, '', '')
          if (genKb.success && genKb.filePath) {
            hf.setKnowledgeBasePath(id, genKb.filePath)
            addLog(id, 'Knowledge base generated: ' + genKb.filePath)
            setInitProgress(prev => ({ ...prev, [id]: { ...prev[id], kbResult: 'generated' } }))
          } else {
            addLog(id, 'KB generation failed: ' + (genKb.message || 'unknown'))
            setInitProgress(prev => ({ ...prev, [id]: { ...prev[id], kbResult: 'failed' } }))
          }
        }
      } catch (err) {
        addLog(id, 'KB error: ' + String(err))
        setInitProgress(prev => ({ ...prev, [id]: { ...prev[id], kbResult: 'error' } }))
      }

      // Generate Mind Map
      addLog(id, 'Checking mind map...')
      try {
        const mindmapPath = id + '\\.dbvs-mindmap.json'
        const mmResult = await window.electronAPI.readMindMapFile(mindmapPath)
        if (mmResult.success) {
          addLog(id, 'Mind map already exists, using existing')
          setInitProgress(prev => ({ ...prev, [id]: { ...prev[id], mindmapResult: 'exists' } }))
        } else {
          addLog(id, 'Scanning project structure...')
          const genMm = await window.electronAPI.generateMindMap(id, '')
          if (genMm.success && genMm.filePath) {
            hf.setMindmapPath(id, genMm.filePath)
            addLog(id, 'Mind map generated: ' + genMm.filePath)
            setInitProgress(prev => ({ ...prev, [id]: { ...prev[id], mindmapResult: 'generated' } }))
          } else {
            addLog(id, 'Mind map generation failed: ' + (genMm.message || 'unknown'))
            setInitProgress(prev => ({ ...prev, [id]: { ...prev[id], mindmapResult: 'failed' } }))
          }
        }
      } catch (err) {
        addLog(id, 'Mind map error: ' + String(err))
        setInitProgress(prev => ({ ...prev, [id]: { ...prev[id], mindmapResult: 'error' } }))
      }

      // Mark done
      addLog(id, 'Done.')
      setInitProgress(prev => ({ ...prev, [id]: { ...prev[id], status: 'done' } }))
    }

    setInitializing(false)
    dispatch({ type: 'SET_MESSAGE', payload: t.horseFarm.initDone })
  }

  // Count init progress
  const initDone = Object.values(initProgress).filter(p => p.status === 'done').length
  const initTotal = Object.keys(initProgress).length

  return (
    <div className="hf-container">
      <CommandCenter
        commands={allCommands}
        projectIds={state.horseFarmProjectIds}
        hfProjects={hf.hfProjects}
        onSend={(projectPath, content) => { hf.addCommand(projectPath, content) }}
      />

      <div className="hf-sub-tabs">
        <div style={{ display: 'flex', gap: 0 }}>
          {subTabs.map(tab => (
            <button
              key={tab.key}
              className={`hf-sub-tab ${state.horseFarmActiveSubTab === tab.key ? 'active' : ''}`}
              onClick={() => { dispatch({ type: 'SET_HORSE_FARM_SUB_TAB', payload: tab.key }); setDetailPanel({ type: null, projectPath: null }) }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '16px' }}>
          {initializing && (
            <span style={{ fontSize: '12px', color: '#7c3aed', fontWeight: 500 }}>
              {initDone}/{initTotal}
            </span>
          )}
          <button
            onClick={handleInitializeAll}
            disabled={initializing || state.horseFarmProjectIds.length === 0}
            className="hf-init-all-btn"
          >
            {initializing ? '⏳ ' + t.horseFarm.initializing : '🚀 ' + t.horseFarm.initializeAll}
          </button>
        </div>
      </div>

      {state.horseFarmActiveSubTab === 'settings' ? (
        <div className="hf-sub-content">
          <HorseFarmSettings config={hfConfig} onConfigChange={setHfConfig} />
        </div>
      ) : (
        <div className="hf-main-layout">
          <div className="hf-left-panel">
            <ProjectList
              projectIds={state.horseFarmProjectIds}
              hfProjects={hf.hfProjects}
              activeProject={state.horseFarmActiveProject}
              projects={state.projects}
              detailProjectPath={detailPanel.projectPath}
              detailPanelType={detailPanel.type}
              initProgress={initProgress}
              onViewMindMap={(path) => setDetailPanel({ type: 'mindmap', projectPath: path })}
              onViewKB={(path) => setDetailPanel({ type: 'kb', projectPath: path })}
              onViewInitLog={(path) => setDetailPanel({ type: 'initLog', projectPath: path })}
              onSelectProject={(path) => dispatch({ type: 'SET_HORSE_FARM_ACTIVE_PROJECT', payload: path })}
              onRemoveProject={(path) => dispatch({ type: 'REMOVE_FROM_HORSE_FARM', payload: path })}
              onStartWorkflow={(path) => {
                dispatch({ type: 'SET_HORSE_FARM_ACTIVE_PROJECT', payload: path })
              }}
              onOpenProject={(path) => {
                const proj = state.projects.find(p => p.path === path)
                if (proj) {
                  dispatch({ type: 'RESET_PROJECT_STATE' })
                  dispatch({ type: 'SET_CURRENT_PROJECT', payload: proj.name })
                  dispatch({ type: 'SET_PROJECT_PATH', payload: proj.path })
                  dispatch({ type: 'SET_REPO_PATH', payload: proj.repoPath })
                  dispatch({ type: 'SET_ACTIVE_TAB', payload: 'overview' })
                }
              }}
              getProgress={hf.getProjectProgress}
              updateRequirements={hf.updateRequirements}
              updateSummary={hf.updateSummary}
              setPhase={hf.setPhase}
              setMindmapPath={hf.setMindmapPath}
              setKnowledgeBasePath={hf.setKnowledgeBasePath}
              addSystemMessage={hf.addSystemMessage}
              addTask={hf.addTask}
              updateTask={hf.updateTask}
              removeTask={hf.removeTask}
            />
          </div>

          <div className="hf-right-panel">
            {detailPanel.type === 'mindmap' && detailPanel.projectPath && (
              <MindMapViewer
                activeProject={detailPanel.projectPath}
                hfProjects={hf.hfProjects}
              />
            )}
            {detailPanel.type === 'kb' && detailPanel.projectPath && (
              <KnowledgeBaseViewer
                activeProject={detailPanel.projectPath}
                hfProjects={hf.hfProjects}
              />
            )}
            {detailPanel.type === 'initLog' && detailPanel.projectPath && initProgress[detailPanel.projectPath] && (
              <div className="hf-init-log-viewer">
                <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#1f2937' }}>
                  Init Log — {hf.hfProjects[detailPanel.projectPath]?.projectName || detailPanel.projectPath.split('\\').pop()}
                </h4>
                <div className="hf-init-log-lines">
                  {initProgress[detailPanel.projectPath].log.map((line, i) => (
                    <div key={i} className="hf-init-log-line">{line}</div>
                  ))}
                </div>
              </div>
            )}
            {!detailPanel.type && (
              <div className="hf-detail-empty">
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
                <p>{t.horseFarm.detailPanelEmpty}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
