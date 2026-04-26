import { useI18n } from '../../../i18n'
import { useAppState } from '../../../context/AppContext'
import type { HorseFarmProject, HFTask } from '../../../types/horseFarm'
import type { Project } from '../../../context/AppContext'
import type { InitProgress } from './HorseFarm'
import ProjectProgressCard from './ProjectProgressCard'

interface ProjectListProps {
  projectIds: string[]
  hfProjects: Record<string, HorseFarmProject>
  activeProject: string | null
  projects: Project[]
  detailProjectPath: string | null
  detailPanelType: string | null
  initProgress: Record<string, InitProgress>
  onSelectProject: (path: string) => void
  onRemoveProject: (path: string) => void
  onOpenProject: (path: string) => void
  onViewMindMap: (path: string) => void
  onViewKB: (path: string) => void
  onViewInitLog: (path: string) => void
  getProgress: (path: string) => number
  updateRequirements: (path: string, requirements: string) => void
  updateSummary: (path: string, summary: string) => void
  setPhase: (path: string, phase: HorseFarmProject['phase']) => void
  setMindmapPath: (path: string, mp: string) => void
  setKnowledgeBasePath: (path: string, kb: string) => void
  addSystemMessage: (path: string | null, content: string, type?: 'chat' | 'command' | 'status' | 'error') => void
  addTask: (path: string, task: HFTask) => void
  updateTask: (path: string, taskId: string, updates: Partial<HFTask>) => void
  removeTask: (path: string, taskId: string) => void
}

export default function ProjectList({
  projectIds, hfProjects, activeProject, projects, detailProjectPath, detailPanelType, initProgress,
  onSelectProject, onRemoveProject, onOpenProject, onViewMindMap, onViewKB, onViewInitLog,
  getProgress, updateRequirements, updateSummary, setPhase,
  setMindmapPath, setKnowledgeBasePath, addSystemMessage,
  addTask, updateTask, removeTask,
}: ProjectListProps) {
  const { t } = useI18n()
  const [, dispatch] = useAppState()

  if (projectIds.length === 0) {
    return (
      <div className="hf-empty-state">
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>🐴</div>
        <h3 style={{ margin: '0 0 8px', fontSize: '16px', color: '#374151' }}>{t.horseFarm.tabLabel}</h3>
        <p style={{ margin: '0 0 8px', color: '#6b7280', fontSize: '13px' }}>{t.horseFarm.noProjects}</p>
        <p style={{ margin: '0 0 20px', color: '#9ca3af', fontSize: '12px' }}>
          {t.horseFarm.selectProjects}
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            onClick={() => dispatch({ type: 'SET_CURRENT_VIEW', payload: 'repositories' })}
            style={{
              padding: '8px 20px', borderRadius: '8px', border: 'none',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
            }}
          >
            {t.horseFarm.addFromRepo}
          </button>
          <button
            onClick={() => dispatch({ type: 'SET_HORSE_FARM_SUB_TAB', payload: 'settings' })}
            style={{
              padding: '8px 20px', borderRadius: '8px',
              border: '1px solid #d1d5db', background: '#fff',
              color: '#374151', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
            }}
          >
            {t.horseFarm.subTabSettings}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="hf-project-list">
      {projectIds.map(id => {
        const hfProj = hfProjects[id]
        const proj = projects.find(p => p.path === id)
        if (!hfProj) return null
        return (
          <ProjectProgressCard
            key={id}
            hfProject={hfProj}
            project={proj}
            isActive={activeProject === id}
            progress={getProgress(id)}
            detailProjectPath={detailProjectPath}
            detailPanelType={detailPanelType}
            initProgress={initProgress[id]}
            onSelect={() => onSelectProject(id)}
            onRemove={() => onRemoveProject(id)}
            onOpen={() => onOpenProject(id)}
            onViewMindMap={() => onViewMindMap(id)}
            onViewKB={() => onViewKB(id)}
            onViewInitLog={() => onViewInitLog(id)}
            updateRequirements={(req) => updateRequirements(id, req)}
            updateSummary={(sum) => updateSummary(id, sum)}
            setPhase={(p) => setPhase(id, p)}
            setMindmapPath={(mp) => setMindmapPath(id, mp)}
            setKnowledgeBasePath={(kb) => setKnowledgeBasePath(id, kb)}
            addSystemMessage={(content, type) => addSystemMessage(id, content, type)}
            addTask={(task) => addTask(id, task)}
            updateTask={(taskId, updates) => updateTask(id, taskId, updates)}
            removeTask={(taskId) => removeTask(id, taskId)}
          />
        )
      })}
    </div>
  )
}
