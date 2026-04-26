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
    type: 'mindmap' | 'kb' | null
    projectPath: string | null
  }>({ type: null, projectPath: null })
  const [initializing, setInitializing] = useState(false)
  const [initStatuses, setInitStatuses] = useState<Array<{ name: string; kb: string; mindmap: string }>>([])

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

  const handleInitializeAll = async () => {
    if (state.horseFarmProjectIds.length === 0) return
    setInitializing(true)
    setInitStatuses([])
    const projList = state.horseFarmProjectIds.map(id => {
      const proj = hf.hfProjects[id]
      return { path: id, name: proj?.projectName || id.split('\\').pop() || id }
    })
    try {
      const result = await window.electronAPI.initializeAllProjects(projList)
      if (result.success && result.results) {
        setInitStatuses(result.results)
        // Update HF project paths for generated files
        for (const r of result.results) {
          if (r.kb === 'generated') hf.setKnowledgeBasePath(r.path, r.path + '\\DBHT-KNOWLEDGEBASE.md')
          if (r.mindmap === 'generated') hf.setMindmapPath(r.path, r.path + '\\.dbvs-mindmap.json')
        }
        dispatch({ type: 'SET_MESSAGE', payload: t.horseFarm.initDone })
      }
    } catch (err) {
      dispatch({ type: 'SET_MESSAGE', payload: t.horseFarm.initFailed + String(err) })
    }
    setInitializing(false)
  }

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
          {initStatuses.length > 0 && (
            <div style={{ fontSize: '11px', color: '#6b7280', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {initStatuses.map(s => `${s.name}: ${s.kb === 'exists' ? '✓' : s.kb === 'generated' ? '+' : '✗'}`).join('  ')}
            </div>
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
          {/* Left: Project List */}
          <div className="hf-left-panel">
            <ProjectList
              projectIds={state.horseFarmProjectIds}
              hfProjects={hf.hfProjects}
              activeProject={state.horseFarmActiveProject}
              projects={state.projects}
              detailProjectPath={detailPanel.projectPath}
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
              onViewMindMap={(path) => setDetailPanel({ type: 'mindmap', projectPath: path })}
              onViewKB={(path) => setDetailPanel({ type: 'kb', projectPath: path })}
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

          {/* Right: Detail Panel */}
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
