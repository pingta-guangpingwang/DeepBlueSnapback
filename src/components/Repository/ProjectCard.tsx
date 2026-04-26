import { useState } from 'react'
import type { Project } from '../../context/AppContext'
import { useI18n } from '../../i18n'

interface ProjectCardProps {
  project: Project
  onEnter: () => void
  onCommit: () => void
  onRemove: (projectPath: string) => void
  selected?: boolean
  onToggleSelect?: (projectPath: string) => void
  showCheckbox?: boolean
  isInFarm?: boolean
}

export default function ProjectCard({ project, onEnter, onCommit, onRemove, selected, onToggleSelect, showCheckbox, isInFarm }: ProjectCardProps) {
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const { t } = useI18n()

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
          <span style={{ fontSize: '12px', color: '#d97706', fontWeight: 500 }}>{t.projectCard.remove}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#6b7280', flex: 1 }}>{t.projectCard.confirmRemove}</span>
          <button
            className="warning-button"
            style={{ fontSize: '12px', padding: '4px 12px' }}
            onClick={() => { onRemove(project.path); setShowRemoveConfirm(false) }}
          >
            {t.projectCard.remove}
          </button>
          <button
            className="secondary-button"
            style={{ fontSize: '12px', padding: '4px 12px' }}
            onClick={() => setShowRemoveConfirm(false)}
          >
            {t.common.cancel}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="project-card" style={{ position: 'relative' }}>
      {showCheckbox && (
        <div style={{ position: 'absolute', top: '8px', left: '10px', zIndex: 1 }}>
          <input
            type="checkbox"
            checked={selected || false}
            onChange={() => onToggleSelect?.(project.path)}
            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#4f46e5' }}
          />
        </div>
      )}
      <div className="project-info" style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, flex: 1, paddingLeft: showCheckbox ? '28px' : '0' }}>
        <h3 style={{ margin: 0, whiteSpace: 'nowrap', fontSize: '14px' }}>{project.name}</h3>
        <span style={{ fontSize: '12px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {project.path}
        </span>
        <span className={`project-status ${project.status === t.projectCard.synced ? 'synced' : 'unsynced'}`}>
          {project.status === t.projectCard.synced ? t.projectCard.synced : project.status}
        </span>
        {project.hasChanges && (
          <span style={{ fontSize: '12px', color: '#d97706', fontWeight: 500 }}>● {t.projectCard.hasChanges}</span>
        )}
        {isInFarm && (
          <span style={{ fontSize: '11px', color: '#7c3aed', fontWeight: 500, background: '#ede9fe', padding: '2px 8px', borderRadius: '8px' }}>
            🐴 {t.horseFarm.tabLabelShort}
          </span>
        )}
      </div>
      <div className="project-actions" style={{ flexShrink: 0 }}>
        <button style={{ fontSize: '12px', padding: '4px 12px' }} onClick={onEnter}>{t.projectCard.enter}</button>
        <button style={{ fontSize: '12px', padding: '4px 12px' }} onClick={onCommit}>{t.projectCard.commits}</button>
        <button className="secondary-button" style={{ fontSize: '12px', padding: '4px 12px' }} onClick={openFolder}>{t.projectCard.openFolder}</button>
        <button
          className="secondary-button"
          style={{ fontSize: '12px', padding: '4px 12px', color: '#9ca3af' }}
          onClick={() => setShowRemoveConfirm(true)}
        >
          {t.projectCard.remove}
        </button>
      </div>
    </div>
  )
}
