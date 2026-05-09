import { useEffect, useState, useMemo } from 'react'
import { useAppState } from '../../context/AppContext'
import { computeLineDiff, getDiffStats, type DiffLine } from './DiffView'
import { useI18n } from '../../i18n'
import VirtualList from '../common/VirtualList'

export default function DiffViewer() {
  const [state, dispatch] = useAppState()
  const { t } = useI18n()
  const [oldContent, setOldContent] = useState('')
  const [newContent, setNewContent] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!state.diffModalFile) return

    const loadDiff = async () => {
      setError('')
      setOldContent('')
      setNewContent('')
      try {
        // 解析 repoPath 和 workingCopyPath
        let repoPath = state.repoPath
        let workingCopyPath = state.projectPath

        if (!repoPath && state.commitPanelProject) {
          const project = state.projects.find(p => p.path === state.commitPanelProject)
          repoPath = project?.repoPath || ''
          workingCopyPath = project?.path || ''
        }

        if (!repoPath || !workingCopyPath) {
          setError(t.diffViewer.noProjectPath)
          return
        }

        const result = await window.electronAPI.getDiffContent(repoPath, workingCopyPath, state.diffModalFile!)

        if (result?.success) {
          setOldContent(result.oldContent || '')
          setNewContent(result.newContent || '')
        } else {
          setError(result?.message || t.diffViewer.loadFailed)
        }
      } catch (error) {
        setError(String(error))
      }
    }
    loadDiff()
  }, [state.diffModalFile, state.commitPanelProject, state.repoPath, state.projectPath, state.projects])

  const diffLines = useMemo(() => computeLineDiff(oldContent, newContent), [oldContent, newContent])
  const stats = useMemo(() => getDiffStats(diffLines), [diffLines])

  if (!state.diffModalFile) return null

  const close = () => {
    dispatch({ type: 'SET_DIFF_MODAL_FILE', payload: null })
  }

  const ext = state.diffModalFile.split('.').pop()?.toLowerCase() || 'txt'
  const isNewFile = !oldContent
  const isDeletedFile = !newContent

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 2000
      }}
      onClick={close}
    >
      <div
        style={{
          width: '95vw', maxWidth: '1400px', height: '85vh', background: '#fff',
          borderRadius: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '10px 16px', borderBottom: '1px solid #e5e7eb',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '14px' }}>
              {t.diffViewer.title} {state.diffModalFile}
              <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px' }}>({ext})</span>
            </h3>
            {/* Diff stats */}
            {!error && (stats.added > 0 || stats.removed > 0) && (
              <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                <span style={{ color: '#16a34a', fontWeight: 500 }}>+{stats.added} {t.diffViewer.lines}</span>
                <span style={{ color: '#dc2626', fontWeight: 500 }}>-{stats.removed} {t.diffViewer.lines}</span>
              </div>
            )}
            {isNewFile && <span style={{ color: '#16a34a', fontSize: '12px', fontWeight: 500 }}>[{t.diffViewer.newFile}]</span>}
            {isDeletedFile && <span style={{ color: '#dc2626', fontSize: '12px', fontWeight: 500 }}>[{t.diffViewer.deletedFile}]</span>}
          </div>
          <button style={{
            border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer',
            color: '#6b7280', padding: '4px 8px', lineHeight: 1
          }} onClick={(e) => { e.stopPropagation(); close() }}>✕</button>
        </div>

        {/* Content */}
        {error ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>{error}</div>
        ) : (
          <div style={{ flex: 1, background: '#fafbfc' }}>
            <VirtualList
              items={diffLines}
              itemHeight={22}
              height="100%"
              width="100%"
              overscan={10}
              itemKey={(index) => index}
              renderItem={(line, _idx, style) => {
                let bg = 'transparent'
                let lineColor = '#374151'
                let prefix = ' '
                let gutterBg = '#fafbfc'
                let gutterColor = '#9ca3af'

                if (line.type === 'added') {
                  bg = '#dcfce7'
                  lineColor = '#166534'
                  prefix = '+'
                  gutterBg = '#bbf7d0'
                  gutterColor = '#16a34a'
                } else if (line.type === 'removed') {
                  bg = '#fee2e2'
                  lineColor = '#991b1b'
                  prefix = '-'
                  gutterBg = '#fecaca'
                  gutterColor = '#dc2626'
                }

                return (
                  <div style={{
                    ...style,
                    display: 'flex',
                    background: bg,
                    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                    fontSize: '13px', lineHeight: '22px',
                  }}>
                    <div style={{
                      minWidth: '40px', textAlign: 'right', padding: '0 8px',
                      color: gutterColor, background: gutterBg,
                      borderRight: '1px solid #e5e7eb', userSelect: 'none', fontSize: '12px',
                    }}>{line.oldLineNo ?? ''}</div>
                    <div style={{
                      minWidth: '40px', textAlign: 'right', padding: '0 8px',
                      color: gutterColor, background: gutterBg,
                      borderRight: '1px solid #e5e7eb', userSelect: 'none', fontSize: '12px',
                    }}>{line.newLineNo ?? ''}</div>
                    <div style={{
                      padding: '0 4px', textAlign: 'center', color: lineColor,
                      userSelect: 'none', fontWeight: 700, fontSize: '13px',
                    }}>{prefix}</div>
                    <div style={{
                      flex: 1, padding: '0 8px', color: lineColor,
                      whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                    }}>{line.content || '\u00A0'}</div>
                  </div>
                )
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
