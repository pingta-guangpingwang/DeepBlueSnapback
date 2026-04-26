import { useI18n } from '../../../i18n'
import type { HorseFarmProject, HFTask } from '../../../types/horseFarm'
import type { Project } from '../../../context/AppContext'
import ProjectProgressCard from './ProjectProgressCard'

interface ProjectListProps {
  projectIds: string[]
  hfProjects: Record<string, HorseFarmProject>
  activeProject: string | null
  projects: Project[]
  onSelectProject: (path: string) => void
  onRemoveProject: (path: string) => void
  onStartWorkflow: (path: string) => void
  onOpenProject: (path: string) => void
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
  projectIds, hfProjects, activeProject, projects,
  onSelectProject, onRemoveProject, onOpenProject,
  getProgress, updateRequirements, updateSummary, setPhase,
  setMindmapPath, setKnowledgeBasePath, addSystemMessage,
  addTask, updateTask, removeTask,
}: ProjectListProps) {
  const { t } = useI18n()

  if (projectIds.length === 0) {
    return (
      <div className="hf-empty-state">
        <p style={{ fontSize: '32px', marginBottom: '8px' }}>🐴</p>
        <p>{t.horseFarm.noProjects}</p>
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
            onSelect={() => onSelectProject(id)}
            onRemove={() => onRemoveProject(id)}
            onOpen={() => onOpenProject(id)}
            onStartWorkflow={() => onSelectProject(id)}
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
