import { useState, useEffect, useCallback } from 'react'
import type { Project } from '../../context/AppContext'
import { useI18n } from '../../i18n'

const NOTES_FILE = '/.dbvs-horsefarm-notes.md'

interface ProjectCardProps {
  project: Project
  index: number
  total: number
  onEnter: () => void
  onCommit: () => void
  onRemove: (projectPath: string) => void
  onDeleteFiles: (projectPath: string) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onMoveTop: () => void
  onMoveBottom: () => void
  onSetRating: (rating: number) => void
}

function getStarColor(rating: number): string {
  if (rating === 1) return '#22c55e'
  if (rating === 2) return '#16a34a'
  if (rating === 3) return '#eab308'
  if (rating === 4) return '#f59e0b'
  if (rating === 5) return '#ef4444'
  return '#dc2626'
}

export default function ProjectCard({ project, index, total, onEnter, onCommit, onRemove, onDeleteFiles, onMoveUp, onMoveDown, onMoveTop, onMoveBottom, onSetRating }: ProjectCardProps) {
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showRatingPicker, setShowRatingPicker] = useState(false)
  const { t } = useI18n()

  const hasWorkingCopy = !!project.path

  // Notes
  const [notes, setNotes] = useState('')
  const [showNotesEditor, setShowNotesEditor] = useState(false)
  const [notesDraft, setNotesDraft] = useState('')

  useEffect(() => {
    if (!hasWorkingCopy) return
    const notesPath = project.path + NOTES_FILE
    window.electronAPI.readFile(notesPath).then(r => {
      if (r.success && r.content) setNotes(r.content)
    }).catch(() => {})
  }, [project.path])

  const openNotesEditor = useCallback(() => {
    setNotesDraft(notes)
    setShowNotesEditor(true)
  }, [notes])

  const saveNotes = useCallback(async () => {
    const notesPath = project.path + NOTES_FILE
    const result = await window.electronAPI.writeFile(notesPath, notesDraft)
    if (result.success) {
      setNotes(notesDraft)
      setShowNotesEditor(false)
    }
  }, [project.path, notesDraft])

  const notesShort = notes.length > 80 ? notes.slice(0, 80) + '...' : notes

  const openFolder = () => {
    if (!hasWorkingCopy) return
    window.electronAPI.openFolder(project.path)
  }

  const handleRemove = () => {
    onRemove(hasWorkingCopy ? project.path : project.repoPath)
  }

  const handleDeleteFiles = () => {
    if (!hasWorkingCopy) return
    onDeleteFiles(project.path)
  }

  // Remove Dialog with two options
  if (showRemoveDialog) {
    return (
      <div className="project-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong style={{ fontSize: '14px' }}>{project.name}</strong>
            <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '10px' }}>
              {hasWorkingCopy ? project.path : <span style={{ color: '#d97706' }}>⚠ {t.projectCard.notCheckedOut}</span>}
            </span>
          </div>
          <button
            onClick={() => { setShowRemoveDialog(false); setShowDeleteConfirm(false) }}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px', color: '#9ca3af' }}
          >✕</button>
        </div>

        {!showDeleteConfirm ? (
          <>
            <div style={{ fontSize: '13px', color: '#374151', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
              {t.projectCard.removeTitle}
            </div>

            {/* Option 1: Unlink only */}
            <button
              onClick={() => { handleRemove(); setShowRemoveDialog(false) }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px',
                width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db',
                background: '#f9fafb', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937' }}>{t.projectCard.unlinkOnly}</span>
              <span style={{ fontSize: '11px', color: '#6b7280' }}>{t.projectCard.unlinkDesc}</span>
            </button>

            {/* Option 2: Delete files */}
            {hasWorkingCopy && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px',
                  width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #fca5a5',
                  background: '#fef2f2', cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#dc2626' }}>{t.projectCard.deleteFiles}</span>
                <span style={{ fontSize: '11px', color: '#991b1b' }}>{t.projectCard.deleteFilesDesc}</span>
              </button>
            )}
          </>
        ) : (
          <>
            <div style={{ fontSize: '13px', color: '#dc2626', fontWeight: 600 }}>
              ⚠ {t.projectCard.deleteFilesConfirm}
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                className="secondary-button"
                style={{ fontSize: '12px', padding: '4px 12px' }}
                onClick={() => setShowDeleteConfirm(false)}
              >
                {t.common.cancel}
              </button>
              <button
                className="warning-button"
                style={{ fontSize: '12px', padding: '4px 12px', background: '#dc2626' }}
                onClick={() => { handleDeleteFiles(); setShowRemoveDialog(false); setShowDeleteConfirm(false) }}
              >
                {t.projectCard.deleteFilesFinal}
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="project-card" style={{ flexWrap: 'wrap', gap: '10px' }}>
      {/* Left: Order controls */}
      <div className="project-order-controls" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
        <button
          className="project-order-btn"
          onClick={onMoveTop}
          disabled={index === 0}
          title={t.projectCard.moveTop}
          style={{ fontSize: '10px', padding: '1px 5px', lineHeight: 1, border: '1px solid #d1d5db', borderRadius: '3px', background: '#fff', cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.3 : 0.7, color: '#374151' }}
        >⏫</button>
        <button
          className="project-order-btn"
          onClick={onMoveUp}
          disabled={index === 0}
          title={t.projectCard.moveUp}
          style={{ fontSize: '10px', padding: '1px 5px', lineHeight: 1, border: '1px solid #d1d5db', borderRadius: '3px', background: '#fff', cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.3 : 0.7, color: '#374151' }}
        >▲</button>
        <span style={{ fontSize: '9px', color: '#9ca3af', fontWeight: 500, minWidth: '16px', textAlign: 'center' }}>{index + 1}</span>
        <button
          className="project-order-btn"
          onClick={onMoveDown}
          disabled={index >= total - 1}
          title={t.projectCard.moveDown}
          style={{ fontSize: '10px', padding: '1px 5px', lineHeight: 1, border: '1px solid #d1d5db', borderRadius: '3px', background: '#fff', cursor: index >= total - 1 ? 'default' : 'pointer', opacity: index >= total - 1 ? 0.3 : 0.7, color: '#374151' }}
        >▼</button>
        <button
          className="project-order-btn"
          onClick={onMoveBottom}
          disabled={index >= total - 1}
          title={t.projectCard.moveBottom}
          style={{ fontSize: '10px', padding: '1px 5px', lineHeight: 1, border: '1px solid #d1d5db', borderRadius: '3px', background: '#fff', cursor: index >= total - 1 ? 'default' : 'pointer', opacity: index >= total - 1 ? 0.3 : 0.7, color: '#374151' }}
        >⏬</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
      <div className="project-info" style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
        {/* Star rating */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setShowRatingPicker(!showRatingPicker)}
            title={`${'★'.repeat(project.rating || 2)} (${project.rating || 2}/6)`}
            style={{
              border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: '14px', lineHeight: 1, padding: '2px 0',
              color: getStarColor(project.rating || 2),
              letterSpacing: '1px',
            }}
          >
            {'★'.repeat(project.rating || 2)}{'☆'.repeat(6 - (project.rating || 2))}
          </button>
          {showRatingPicker && (
            <div className="project-rating-dropdown" style={{
              position: 'absolute', top: '100%', left: 0, zIndex: 100,
              background: '#fff', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              border: '1px solid #e5e7eb', padding: '4px',
              display: 'flex', flexDirection: 'column', gap: '1px',
              minWidth: '120px',
            }}>
              {[1, 2, 3, 4, 5, 6].map(n => (
                <button
                  key={n}
                  onClick={() => { onSetRating(n); setShowRatingPicker(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '5px 10px', border: 'none', borderRadius: '4px',
                    background: (project.rating || 2) === n ? '#f3f4f6' : 'transparent',
                    cursor: 'pointer', textAlign: 'left', fontSize: '13px',
                    color: getStarColor(n), fontWeight: (project.rating || 2) === n ? 600 : 400,
                  }}
                  onMouseEnter={e => { if ((project.rating || 2) !== n) e.currentTarget.style.background = '#f9fafb' }}
                  onMouseLeave={e => { if ((project.rating || 2) !== n) e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{ letterSpacing: '1px' }}>{'★'.repeat(n)}{'☆'.repeat(6 - n)}</span>
                  <span style={{ fontSize: '11px', color: '#6b7280' }}>{n} 级</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <h3 style={{ margin: 0, whiteSpace: 'nowrap', fontSize: '14px' }}>{project.name}</h3>
        <span style={{ fontSize: '12px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {hasWorkingCopy
            ? project.path
            : <span style={{ color: '#d97706', fontWeight: 500 }} title={t.projectCard.noWorkingCopy}>⚠ {t.projectCard.notCheckedOut}</span>
          }
        </span>
        <span className={`project-status ${project.status === t.projectCard.synced ? 'synced' : 'unsynced'}`}>
          {project.status === t.projectCard.synced ? t.projectCard.synced : project.status}
        </span>
        {project.hasChanges && (
          <span style={{ fontSize: '12px', color: '#d97706', fontWeight: 500 }}>● {t.projectCard.hasChanges}</span>
        )}
      </div>
      <div className="project-actions" style={{ flexShrink: 0 }}>
        <button
          style={{ fontSize: '12px', padding: '4px 12px' }}
          onClick={hasWorkingCopy ? onEnter : undefined}
          disabled={!hasWorkingCopy}
          title={!hasWorkingCopy ? t.projectCard.noWorkingCopy : ''}
        >{t.projectCard.enter}</button>
        <button
          style={{ fontSize: '12px', padding: '4px 12px' }}
          onClick={hasWorkingCopy ? onCommit : undefined}
          disabled={!hasWorkingCopy}
          title={!hasWorkingCopy ? t.projectCard.noWorkingCopy : ''}
        >{t.projectCard.commits}</button>
        <button
          className="secondary-button"
          style={{ fontSize: '12px', padding: '4px 12px' }}
          onClick={openFolder}
          disabled={!hasWorkingCopy}
          title={!hasWorkingCopy ? t.projectCard.noWorkingCopy : ''}
        >{t.projectCard.openFolder}</button>
        <button
          className="secondary-button"
          style={{ fontSize: '12px', padding: '4px 12px', color: '#9ca3af' }}
          onClick={() => setShowRemoveDialog(true)}
        >
          {t.projectCard.remove}
        </button>
      </div>

      {/* Notes row — full width below the main row */}
      {hasWorkingCopy && (
        <div
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => { e.stopPropagation(); openNotesEditor(); }}
          title={t.projectCard.notesPlaceholder}
          style={{
            width: '100%', fontSize: '11px',
            color: notes ? '#374151' : '#9ca3af',
            lineHeight: '1.5', cursor: 'pointer', marginTop: '4px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            padding: '3px 6px', borderRadius: '4px', minHeight: '20px',
            border: notes ? '1px solid #e5e7eb' : '1px dashed #d1d5db',
            background: notes ? '#f9fafb' : '#fafafa',
            userSelect: 'none',
          }}
        >
          {notes ? notesShort : '💬 ' + t.projectCard.notesPlaceholder}
          {notes && notes.length > 80 && (
            <button
              onClick={(e) => { e.stopPropagation(); openNotesEditor(); }}
              style={{
                fontSize: '10px', marginLeft: '6px', padding: '0 4px', border: 'none', background: 'transparent',
                color: '#6366f1', cursor: 'pointer', textDecoration: 'underline',
              }}
            >{t.projectCard.notesViewAll}</button>
          )}
        </div>
      )}

      {/* Notes Editor Popup */}
      {showNotesEditor && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10001,
          background: 'rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowNotesEditor(false)}>
          <div style={{
            background: '#fff', borderRadius: '12px', padding: '20px',
            width: '520px', maxWidth: '94vw', maxHeight: '80vh',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            display: 'flex', flexDirection: 'column',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '14px', color: '#1f2937' }}>
                {t.projectCard.notesEditorTitle} — {project.name}
              </h4>
              <button onClick={() => setShowNotesEditor(false)} style={{
                border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px', color: '#9ca3af',
              }}>✕</button>
            </div>
            <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 10px' }}>
              {t.projectCard.notesHint}
            </p>
            <textarea
              value={notesDraft}
              onChange={e => setNotesDraft(e.target.value)}
              placeholder={t.projectCard.notesPlaceholder}
              autoFocus
              style={{
                flex: 1, minHeight: '180px', padding: '12px',
                border: '1px solid #d1d5db', borderRadius: '8px',
                fontSize: '13px', lineHeight: 1.6, resize: 'vertical',
                outline: 'none', fontFamily: 'inherit',
              }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button
                onClick={() => setShowNotesEditor(false)}
                style={{
                  padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db',
                  background: '#fff', color: '#374151', cursor: 'pointer', fontSize: '12px',
                }}
              >
                {t.projectCard.notesCancel}
              </button>
              <button
                onClick={saveNotes}
                style={{
                  padding: '8px 16px', borderRadius: '6px', border: 'none',
                  background: '#4f46e5', color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: 500,
                }}
              >
                {t.projectCard.notesSave}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
