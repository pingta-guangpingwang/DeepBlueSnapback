import { useState } from 'react'
import type { Project } from '../../context/AppContext'

interface ProjectCardProps {
  project: Project
  onEnter: () => void
  onCommit: () => void
  onRemove: (projectPath: string) => void
}

export default function ProjectCard({ project, onEnter, onCommit, onRemove }: ProjectCardProps) {
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)

  const openFolder = () => {
    window.electronAPI.openFolder(project.path)
  }

  if (showRemoveConfirm) {
    return (
      <div className="project-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong style={{ fontSize: '14px' }}>{project.name}</strong>
            <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '10px' }}>{project.path}</span>
          </div>
          <span style={{ fontSize: '12px', color: '#d97706', fontWeight: 500 }}>确认从列表移除？</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#6b7280', flex: 1 }}>仅从项目列表移除，文件和仓库数据不受影响</span>
          <button
            className="warning-button"
            style={{ fontSize: '12px', padding: '4px 12px' }}
            onClick={() => { onRemove(project.path); setShowRemoveConfirm(false) }}
          >
            确认移除
          </button>
          <button
            className="secondary-button"
            style={{ fontSize: '12px', padding: '4px 12px' }}
            onClick={() => setShowRemoveConfirm(false)}
          >
            取消
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="project-card">
      <div className="project-info" style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, flex: 1 }}>
        <h3 style={{ margin: 0, whiteSpace: 'nowrap', fontSize: '14px' }}>{project.name}</h3>
        <span style={{ fontSize: '12px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {project.path}
        </span>
        <span className={`project-status ${project.status === '已同步' ? 'synced' : 'unsynced'}`}>
          {project.status}
        </span>
        {project.hasChanges && (
          <span style={{ fontSize: '12px', color: '#d97706', fontWeight: 500 }}>● 有变更</span>
        )}
      </div>
      <div className="project-actions" style={{ flexShrink: 0 }}>
        <button style={{ fontSize: '12px', padding: '4px 12px' }} onClick={onEnter}>进入</button>
        <button style={{ fontSize: '12px', padding: '4px 12px' }} onClick={onCommit}>提交</button>
        <button className="secondary-button" style={{ fontSize: '12px', padding: '4px 12px' }} onClick={openFolder}>打开文件夹</button>
        <button
          className="secondary-button"
          style={{ fontSize: '12px', padding: '4px 12px', color: '#9ca3af' }}
          onClick={() => setShowRemoveConfirm(true)}
        >
          移除
        </button>
      </div>
    </div>
  )
}
