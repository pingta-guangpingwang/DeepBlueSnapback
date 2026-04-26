import { useState } from 'react'
import { useI18n } from '../../../i18n'
import type { HorseFarmProject, HFTask } from '../../../types/horseFarm'
import type { Project } from '../../../context/AppContext'
import PreProjectWorkflow from './PreProjectWorkflow'
import TaskTracker from './TaskTracker'

interface ProjectProgressCardProps {
  hfProject: HorseFarmProject
  project: Project | undefined
  isActive: boolean
  progress: number
  onSelect: () => void
  onRemove: () => void
  onOpen: () => void
  onStartWorkflow: () => void
  onViewMindMap: () => void
  onViewKB: () => void
  detailProjectPath: string | null
  updateRequirements: (requirements: string) => void
  updateSummary: (summary: string) => void
  setPhase: (phase: HorseFarmProject['phase']) => void
  setMindmapPath: (path: string) => void
  setKnowledgeBasePath: (path: string) => void
  addSystemMessage: (content: string, type?: 'chat' | 'command' | 'status' | 'error') => void
  addTask: (task: HFTask) => void
  updateTask: (taskId: string, updates: Partial<HFTask>) => void
  removeTask: (taskId: string) => void
}

const phaseLabels: Record<string, string> = {
  idle: 'phaseIdle', requirements: 'phaseRequirements',
  summarizing: 'phaseSummarizing', mindmap: 'phaseMindmap',
  active: 'phaseActive', paused: 'phasePaused',
}

export default function ProjectProgressCard({
  hfProject, project, isActive, progress,
  onSelect, onRemove, onOpen, onStartWorkflow, onViewMindMap, onViewKB, detailProjectPath,
  updateRequirements, updateSummary, setPhase, setMindmapPath, setKnowledgeBasePath,
  addSystemMessage, addTask, updateTask, removeTask,
}: ProjectProgressCardProps) {
  const { t } = useI18n()
  const [showWorkflow, setShowWorkflow] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const isComplete = progress >= 100

  return (
    <>
      <div
        className="hf-project-card"
        style={{ borderColor: isActive ? '#4f46e5' : undefined }}
        onClick={onSelect}
      >
        <div className="hf-project-card-header">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4 className="hf-project-name">{hfProject.projectName}</h4>
            <div className="hf-project-path">{hfProject.projectPath}</div>
          </div>
          <span className={`hf-phase-badge ${hfProject.phase}`}>
            {t.horseFarm[phaseLabels[hfProject.phase] as keyof typeof t.horseFarm] || hfProject.phase}
          </span>
        </div>

        <div className="hf-progress-bar">
          <div
            className={`hf-progress-fill ${isComplete ? 'complete' : ''}`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>

        <div className="hf-task-summary">
          {t.horseFarm.tasksCompleted
            .replace('{done}', String(hfProject.tasks.filter(t => t.status === 'completed').length))
            .replace('{total}', String(hfProject.tasks.length))}
        </div>

        <div className="hf-card-actions">
          <button onClick={onOpen}>{t.horseFarm.openProject}</button>
          {hfProject.phase === 'idle' || hfProject.phase === 'requirements' ? (
            <button className="primary" onClick={(e) => { e.stopPropagation(); setShowWorkflow(true) }}>
              {t.horseFarm.workflowTitle}
            </button>
          ) : (
            <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}>
              {expanded ? '收起' : '任务'}
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onViewMindMap() }}
            style={{ color: detailProjectPath === hfProject.projectPath ? '#7c3aed' : '#6b7280', fontWeight: detailProjectPath === hfProject.projectPath ? 600 : 400 }}
          >🧠</button>
          <button onClick={(e) => { e.stopPropagation(); onViewKB() }}
            style={{ color: detailProjectPath === hfProject.projectPath ? '#059669' : '#6b7280', fontWeight: detailProjectPath === hfProject.projectPath ? 600 : 400 }}
          >📄</button>
          <button onClick={(e) => { e.stopPropagation(); onRemove() }} style={{ color: '#9ca3af' }}>
            {t.horseFarm.removeFromFarm}
          </button>
        </div>

        {expanded && (
          <TaskTracker
            tasks={hfProject.tasks}
            onAddTask={addTask}
            onUpdateTask={updateTask}
            onRemoveTask={removeTask}
          />
        )}
      </div>

      {showWorkflow && (
        <PreProjectWorkflow
          hfProject={hfProject}
          project={project}
          onClose={() => setShowWorkflow(false)}
          updateRequirements={updateRequirements}
          updateSummary={updateSummary}
          setPhase={setPhase}
          setMindmapPath={setMindmapPath}
          setKnowledgeBasePath={setKnowledgeBasePath}
          addSystemMessage={addSystemMessage}
        />
      )}
    </>
  )
}
