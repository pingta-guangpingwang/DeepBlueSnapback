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

  // Load saved config on mount
  useEffect(() => {
    window.electronAPI.loadHorseFarmConfig().then(result => {
      if (result.success && result.config) {
        setHfConfig(result.config)
      }
    }).catch(() => {})
  }, [])

  // 同步项目列表到 horse farm
  useEffect(() => {
    hf.syncFromProjects(state.horseFarmProjectIds)
  }, [state.horseFarmProjectIds, state.projects])

  const subTabs: Array<{ key: HFSubTab; label: string }> = [
    { key: 'list', label: t.horseFarm.subTabList },
    { key: 'mindmap', label: t.horseFarm.subTabMindmap },
    { key: 'knowledgebase', label: t.horseFarm.subTabKB },
    { key: 'settings', label: t.horseFarm.subTabSettings },
  ]

  // 合并所有项目的消息 + 全局消息
  const allCommands = useMemo(() => {
    const msgs = [...hf.globalCommands]
    for (const id of state.horseFarmProjectIds) {
      const proj = hf.hfProjects[id]
      if (proj) {
        for (const cmd of proj.commands) {
          msgs.push(cmd)
        }
      }
    }
    msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    return msgs
  }, [hf.globalCommands, hf.hfProjects, state.horseFarmProjectIds])

  return (
    <div className="hf-container">
      <CommandCenter
        commands={allCommands}
        projectIds={state.horseFarmProjectIds}
        hfProjects={hf.hfProjects}
        onSend={(projectPath, content) => {
          hf.addCommand(projectPath, content)
        }}
      />

      <div className="hf-sub-tabs">
        {subTabs.map(tab => (
          <button
            key={tab.key}
            className={`hf-sub-tab ${state.horseFarmActiveSubTab === tab.key ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SET_HORSE_FARM_SUB_TAB', payload: tab.key })}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="hf-sub-content">
        {state.horseFarmActiveSubTab === 'list' && (
          <ProjectList
            projectIds={state.horseFarmProjectIds}
            hfProjects={hf.hfProjects}
            activeProject={state.horseFarmActiveProject}
            projects={state.projects}
            onSelectProject={(path) => dispatch({ type: 'SET_HORSE_FARM_ACTIVE_PROJECT', payload: path })}
            onRemoveProject={(path) => dispatch({ type: 'REMOVE_FROM_HORSE_FARM', payload: path })}
            onStartWorkflow={(path) => {
              dispatch({ type: 'SET_HORSE_FARM_ACTIVE_PROJECT', payload: path })
              // 工作流在 ProjectProgressCard 内通过 PreProjectWorkflow 触发
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
        )}
        {state.horseFarmActiveSubTab === 'mindmap' && (
          <MindMapViewer
            activeProject={state.horseFarmActiveProject}
            hfProjects={hf.hfProjects}
          />
        )}
        {state.horseFarmActiveSubTab === 'knowledgebase' && (
          <KnowledgeBaseViewer
            activeProject={state.horseFarmActiveProject}
            hfProjects={hf.hfProjects}
          />
        )}
        {state.horseFarmActiveSubTab === 'settings' && (
          <HorseFarmSettings
            config={hfConfig}
            onConfigChange={setHfConfig}
          />
        )}
      </div>
    </div>
  )
}
