import { useState } from 'react'
import { useI18n } from '../../../i18n'
import type { HFTask } from '../../../types/horseFarm'

interface TaskTrackerProps {
  tasks: HFTask[]
  onAddTask: (task: HFTask) => void
  onUpdateTask: (taskId: string, updates: Partial<HFTask>) => void
  onRemoveTask: (taskId: string) => void
}

export default function TaskTracker({ tasks, onAddTask, onUpdateTask, onRemoveTask }: TaskTrackerProps) {
  const { t } = useI18n()
  const [newTaskDesc, setNewTaskDesc] = useState('')

  const handleAdd = () => {
    const desc = newTaskDesc.trim()
    if (!desc) return
    const task: HFTask = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      description: desc,
      status: 'pending',
      priority: 'medium',
      progress: 0,
      createdAt: new Date().toISOString(),
      dependsOn: [],
    }
    onAddTask(task)
    setNewTaskDesc('')
  }

  const cycleStatus = (task: HFTask) => {
    const next: Record<string, HFTask['status']> = {
      pending: 'in_progress',
      in_progress: 'completed',
      completed: 'pending',
    }
    const newStatus = next[task.status] || 'pending'
    const newProgress = newStatus === 'completed' ? 100 : newStatus === 'in_progress' ? 50 : 0
    onUpdateTask(task.id, { status: newStatus, progress: newProgress, completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined })
  }

  const statusLabel: Record<string, string> = {
    pending: t.horseFarm.taskPending,
    in_progress: t.horseFarm.taskInProgress,
    completed: t.horseFarm.taskCompleted,
    blocked: t.horseFarm.taskBlocked,
  }

  const completed = tasks.filter(t => t.status === 'completed').length

  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
        <input
          type="text"
          value={newTaskDesc}
          onChange={e => setNewTaskDesc(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
          placeholder={t.horseFarm.taskPlaceholder}
          style={{
            flex: 1, padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px',
            fontSize: '12px', outline: 'none',
          }}
        />
        <button
          onClick={handleAdd}
          style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px', border: '1px solid #4f46e5', background: '#4f46e5', color: '#fff', cursor: 'pointer' }}
        >
          {t.horseFarm.addTask}
        </button>
      </div>
      {tasks.length === 0 ? (
        <div style={{ fontSize: '12px', color: '#9ca3af', padding: '8px 0' }}>
          {t.horseFarm.tasksCompleted.replace('{done}', '0').replace('{total}', '0')}
        </div>
      ) : (
        <div>
          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px' }}>
            {t.horseFarm.tasksCompleted.replace('{done}', String(completed)).replace('{total}', String(tasks.length))}
          </div>
          {tasks.map(task => (
            <div key={task.id} className="hf-task-card">
              <span className={`task-status ${task.status}`} onClick={() => cycleStatus(task)} style={{ cursor: 'pointer' }}>
                {statusLabel[task.status]}
              </span>
              <span className="task-desc">{task.description}</span>
              <button
                onClick={() => onRemoveTask(task.id)}
                style={{ fontSize: '11px', padding: '2px 6px', border: 'none', background: 'transparent', color: '#9ca3af', cursor: 'pointer' }}
                title="Remove"
              >✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
