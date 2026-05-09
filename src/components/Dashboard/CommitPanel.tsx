import { useState } from 'react'
import { useAppState } from '../../context/AppContext'
import { useRepository } from '../../hooks/useRepository'
import { useI18n } from '../../i18n'

function getFileIcon(name: string): { icon: string; color: string } {
  const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : ''
  const map: Record<string, { icon: string; color: string }> = {
    ts: { icon: 'TS', color: '#3178c6' }, tsx: { icon: 'TX', color: '#3178c6' },
    js: { icon: 'JS', color: '#f7df1e' }, jsx: { icon: 'JX', color: '#f7df1e' },
    py: { icon: 'PY', color: '#3776ab' }, java: { icon: 'JV', color: '#ed8b00' },
    cs: { icon: 'C#', color: '#68217a' }, go: { icon: 'GO', color: '#00add8' },
    rs: { icon: 'RS', color: '#dea584' }, c: { icon: 'C ', color: '#555' },
    cpp: { icon: 'C+', color: '#00599c' }, h: { icon: 'H ', color: '#555' },
    html: { icon: 'HT', color: '#e34c26' }, css: { icon: 'CS', color: '#1572b6' },
    json: { icon: '{}', color: '#292929' }, xml: { icon: '<>', color: '#e44d26' },
    yaml: { icon: 'YM', color: '#cb171e' }, yml: { icon: 'YM', color: '#cb171e' },
    md: { icon: 'MD', color: '#083fa1' }, txt: { icon: 'TX', color: '#6b7280' },
    png: { icon: 'PN', color: '#a855f7' }, jpg: { icon: 'JP', color: '#a855f7' },
    svg: { icon: 'SV', color: '#ffb13b' }, sql: { icon: 'SQ', color: '#336791' },
    sh: { icon: 'SH', color: '#4eaa25' }, env: { icon: 'EN', color: '#ecd53f' },
    lock: { icon: 'LK', color: '#6b7280' },
  }
  return map[ext] || { icon: ext ? ext.substring(0, 2).toUpperCase() : '?', color: '#9ca3af' }
}

export default function CommitPanel() {
  const [state, dispatch] = useAppState()
  const { handleCommit } = useRepository()
  const { t } = useI18n()
  const [validationMsg, setValidationMsg] = useState('')
  const [aiAuthor, setAiAuthor] = useState('')
  const [aiSession, setAiSession] = useState('')
  const [aiSummary, setAiSummary] = useState('')
  const [showRevertConfirm, setShowRevertConfirm] = useState(false)
  const [reverting, setReverting] = useState(false)
  const [generating, setGenerating] = useState(false)

  const STATUS_MAP: Record<string, { text: string; color: string }> = {
    A: { text: t.commitPanel.added, color: '#16a34a' },
    M: { text: t.commitPanel.modified, color: '#d97706' },
    D: { text: t.commitPanel.deleted, color: '#dc2626' },
  }

  const close = () => {
    dispatch({ type: 'SET_COMMIT_PANEL_PROJECT', payload: null })
    setValidationMsg('')
    setAiAuthor('')
    setAiSession('')
    setAiSummary('')
    setShowRevertConfirm(false)
  }

  const handleGenerateMessage = async () => {
    if (!state.commitPanelProject) return
    const project = state.projects.find(p => p.path === state.commitPanelProject)
    const repoPath = project?.repoPath || state.repoPath
    const workingCopyPath = project?.path || state.projectPath
    if (!repoPath || !workingCopyPath) return

    setGenerating(true)
    try {
      const result = await window.electronAPI.generateCommitMessage(repoPath, workingCopyPath)
      if (result.success && result.message) {
        dispatch({ type: 'SET_COMMIT_MESSAGE', payload: result.message })
        if (result.summary) setAiSummary(result.summary)
      }
    } catch { /* ignore */ }
    setGenerating(false)
  }

  const onRevert = () => {
    if (state.selectedFiles.length === 0) {
      setValidationMsg(t.commitPanel.selectFilesFirst)
      return
    }
    setShowRevertConfirm(true)
  }

  const confirmRevert = async () => {
    if (!state.commitPanelProject) return
    const project = state.projects.find(p => p.path === state.commitPanelProject)
    const repoPath = project?.repoPath || state.repoPath
    const workingCopyPath = project?.path || state.projectPath
    if (!repoPath || !workingCopyPath) return

    setReverting(true)
    try {
      const result = await window.electronAPI.revertFiles(repoPath, workingCopyPath, state.selectedFiles)
      if (result.success) {
        dispatch({ type: 'SET_MESSAGE', payload: `${result.reverted.length}${t.commitPanel.revertedCount}` })
        setShowRevertConfirm(false)
        const statusResult = await window.electronAPI.getStatus(repoPath, workingCopyPath)
        if (statusResult?.success && statusResult.status) {
          const files = statusResult.status
            .map((line: string) => {
              const raw = line.trim()
              if (!raw || raw.length < 2) return null
              return { path: raw.slice(2).trim(), status: raw[0] }
            })
            .filter((item): item is { path: string; status: string } => item !== null && !!item.path)
          dispatch({ type: 'SET_COMMIT_PANEL_FILES', payload: files })
          dispatch({ type: 'SET_SELECTED_FILES', payload: [] })
        } else {
          dispatch({ type: 'SET_COMMIT_PANEL_FILES', payload: [] })
          dispatch({ type: 'SET_SELECTED_FILES', payload: [] })
        }
      } else {
        setValidationMsg(t.commitPanel.revertFailed + result.message)
      }
    } catch (e) {
      setValidationMsg(t.commitPanel.revertFailed + String(e))
    } finally {
      setReverting(false)
    }
  }

  const toggleFile = (filePath: string) => {
    dispatch({ type: 'TOGGLE_SELECTED_FILE', payload: filePath })
    setValidationMsg('')
  }

  const toggleAll = () => {
    const allSelected = state.selectedFiles.length === state.commitPanelFiles.length
    for (const f of state.commitPanelFiles) {
      const inSelected = state.selectedFiles.includes(f.path)
      if (allSelected ? inSelected : !inSelected) {
        dispatch({ type: 'TOGGLE_SELECTED_FILE', payload: f.path })
      }
    }
    setValidationMsg('')
  }

  const openDiff = (filePath: string) => {
    dispatch({ type: 'SET_DIFF_MODAL_FILE', payload: filePath })
  }

  const onSubmit = async () => {
    if (state.selectedFiles.length === 0) { setValidationMsg(t.commitPanel.selectCommitFiles); return }
    if (!state.commitMessage.trim()) { setValidationMsg(t.commitPanel.enterMessage); return }
    setValidationMsg('')
    const options: { summary?: string; author?: string; sessionId?: string } = {}
    if (aiAuthor.trim()) options.author = aiAuthor.trim()
    if (aiSession.trim()) options.sessionId = aiSession.trim()
    if (aiSummary.trim()) options.summary = aiSummary.trim()
    await handleCommit(Object.keys(options).length > 0 ? options : undefined)
  }

  const canSubmit = state.selectedFiles.length > 0 && state.commitMessage.trim()

  const groups: Record<string, typeof state.commitPanelFiles> = {}
  for (const file of state.commitPanelFiles) {
    const parts = file.path.split('/')
    const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : ''
    if (!groups[dir]) groups[dir] = []
    groups[dir].push(file)
  }

  const stats = { A: 0, M: 0, D: 0 }
  for (const f of state.commitPanelFiles) stats[f.status as 'A' | 'M' | 'D']++

  return (
    <div className="modal-overlay" onClick={close}>
      <div style={{
        width: '96vw', maxWidth: '1200px', height: '92vh',
        background: '#fff', borderRadius: '10px',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '10px 16px', borderBottom: '1px solid #e5e7eb',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '15px', whiteSpace: 'nowrap' }}>{t.commitPanel.title}</h3>
            <span style={{
              fontSize: '12px', color: '#6b7280', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{state.commitPanelProject}</span>
            <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
              {stats.A > 0 && <span style={{ color: '#16a34a', fontWeight: 500 }}>+{stats.A} {t.commitPanel.added}</span>}
              {stats.M > 0 && <span style={{ color: '#d97706', fontWeight: 500 }}>~{stats.M} {t.commitPanel.modified}</span>}
              {stats.D > 0 && <span style={{ color: '#dc2626', fontWeight: 500 }}>-{stats.D} {t.commitPanel.deleted}</span>}
            </div>
          </div>
          <button style={{
            border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer',
            color: '#6b7280', padding: '4px 8px', position: 'relative', zIndex: 1,
          }} onClick={close}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Left: file tree */}
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            borderRight: '1px solid #e5e7eb', minWidth: 0,
          }}>
            <div style={{
              padding: '6px 12px', borderBottom: '1px solid #f3f4f6',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>
                <strong style={{ color: '#374151' }}>{state.selectedFiles.length}</strong> / {state.commitPanelFiles.length} {t.commitPanel.selectedCount}
              </span>
              <button className="secondary-button" style={{ fontSize: '11px', padding: '2px 10px' }} onClick={toggleAll}>
                {state.selectedFiles.length === state.commitPanelFiles.length ? t.commitPanel.deselectAll : t.commitPanel.selectAll}
              </button>
            </div>

            <div style={{ flex: 1, overflow: 'auto', background: '#fafbfc' }}>
              {state.commitPanelFiles.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
                  {t.commitPanel.noChanges}
                </div>
              ) : (
                Object.entries(groups).map(([dir, files]) => (
                  <div key={dir || '__root__'}>
                    {dir && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        padding: '4px 12px', background: '#f0f1f3',
                        borderBottom: '1px solid #e5e7eb',
                        position: 'sticky', top: 0, zIndex: 1,
                      }}>
                        <span style={{ fontSize: '12px' }}>📁</span>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', letterSpacing: '0.02em' }}>{dir}/</span>
                      </div>
                    )}
                    {files.map(file => {
                      const status = STATUS_MAP[file.status] || { text: file.status, color: '#6b7280' }
                      const { icon, color } = getFileIcon(file.path)
                      const isChecked = state.selectedFiles.includes(file.path)

                      return (
                        <div
                          key={file.path}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '3px 12px 3px 10px',
                            borderBottom: '1px solid #f3f4f6',
                            background: isChecked ? '#f0fdf4' : 'transparent',
                            cursor: 'pointer', fontSize: '13px',
                          }}
                          onClick={() => toggleFile(file.path)}
                          className="tree-row"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleFile(file.path)}
                            onClick={e => e.stopPropagation()}
                            style={{ cursor: 'pointer', flexShrink: 0, width: '14px', height: '14px' }}
                          />
                          <span style={{
                            fontSize: '9px', fontWeight: 700, color: '#fff',
                            background: color, padding: '1px 3px', borderRadius: '2px',
                            width: '18px', textAlign: 'center', lineHeight: '13px',
                            fontFamily: 'Consolas, Monaco, monospace', flexShrink: 0,
                          }}>{icon}</span>
                          <span style={{
                            flex: 1, color: '#374151', fontSize: '12px',
                            fontFamily: 'Consolas, monospace',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>{file.path.split('/').pop()}</span>
                          <span style={{
                            fontSize: '10px', fontWeight: 600, color: status.color,
                            padding: '0 5px', borderRadius: '3px', lineHeight: '16px',
                            background: `${status.color}12`, flexShrink: 0,
                          }}>{status.text}</span>
                          <button
                            onClick={e => { e.stopPropagation(); openDiff(file.path) }}
                            style={{
                              fontSize: '10px', padding: '1px 6px',
                              border: '1px solid #d1d5db', borderRadius: '3px',
                              background: '#fff', cursor: 'pointer', color: '#6b7280',
                              lineHeight: '16px', flexShrink: 0,
                            }}
                          >{t.commitPanel.diff}</button>
                        </div>
                      )
                    })}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: commit message */}
          <div style={{
            width: '320px', flexShrink: 0,
            display: 'flex', flexDirection: 'column',
            padding: '12px', gap: '10px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: '13px', color: '#1f2937' }}>{t.commitPanel.commitMessage}</span>
              <button
                onClick={handleGenerateMessage}
                disabled={generating || state.commitPanelFiles.length === 0}
                style={{
                  fontSize: '11px', padding: '3px 10px',
                  border: '1px solid #d1d5db', borderRadius: '4px',
                  background: '#fff', cursor: state.commitPanelFiles.length === 0 ? 'default' : 'pointer',
                  color: '#374151', whiteSpace: 'nowrap',
                  opacity: state.commitPanelFiles.length === 0 ? 0.4 : 1,
                }}
              >{generating ? t.commitPanel.generating : t.commitPanel.generateMessage}</button>
            </div>
            <textarea
              value={state.commitMessage}
              onChange={(e) => {
                dispatch({ type: 'SET_COMMIT_MESSAGE', payload: e.target.value })
                setValidationMsg('')
              }}
              placeholder={t.commitPanel.messagePlaceholder}
              style={{
                flex: 1, width: '100%', resize: 'none',
                border: validationMsg && !state.commitMessage.trim() ? '1px solid #f87171' : '1px solid #d1d5db',
                borderRadius: '6px', padding: '10px',
                fontFamily: 'inherit', fontSize: '13px', lineHeight: '1.5',
              }}
            />
            {validationMsg && (
              <div style={{
                padding: '6px 10px', borderRadius: '6px',
                background: '#fef2f2', color: '#dc2626', fontSize: '12px',
                border: '1px solid #fecaca',
              }}>
                {validationMsg}
              </div>
            )}

            <div style={{
              borderTop: '1px solid #e5e7eb', paddingTop: '10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', letterSpacing: '0.02em' }}>{t.commitPanel.aiLabel}</span>
                <span style={{ fontSize: '10px', color: '#9ca3af' }}>{t.commitPanel.aiDescription}</span>
              </div>
              <input
                type="text"
                value={aiAuthor}
                onChange={e => setAiAuthor(e.target.value)}
                placeholder={t.commitPanel.aiNamePlaceholder}
                style={{
                  width: '100%', padding: '6px 10px', fontSize: '12px',
                  border: '1px solid #e5e7eb', borderRadius: '4px', marginBottom: '6px',
                }}
              />
              <input
                type="text"
                value={aiSession}
                onChange={e => setAiSession(e.target.value)}
                placeholder={t.commitPanel.aiSessionPlaceholder}
                style={{
                  width: '100%', padding: '6px 10px', fontSize: '12px',
                  border: '1px solid #e5e7eb', borderRadius: '4px', marginBottom: '6px',
                }}
              />
              <input
                type="text"
                value={aiSummary}
                onChange={e => setAiSummary(e.target.value)}
                placeholder={t.commitPanel.aiSummaryPlaceholder}
                style={{
                  width: '100%', padding: '6px 10px', fontSize: '12px',
                  border: '1px solid #e5e7eb', borderRadius: '4px',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                className="warning-button"
                onClick={onRevert}
                disabled={state.selectedFiles.length === 0}
                style={{ padding: '6px 16px', fontSize: '13px', opacity: state.selectedFiles.length > 0 ? 1 : 0.4 }}
              >
                {t.commitPanel.revertAll}
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={{ padding: '6px 16px', fontSize: '13px' }} onClick={close}>{t.common.cancel}</button>
                <button
                  className="primary-button"
                  onClick={onSubmit}
                  style={{ opacity: canSubmit ? 1 : 0.5, padding: '6px 16px', fontSize: '13px' }}
                >
                  {t.commitPanel.commitChanges}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Revert confirmation dialog */}
      {showRevertConfirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 2000,
        }}>
          <div style={{
            background: '#fff', borderRadius: '10px', padding: '24px', maxWidth: '440px', width: '90%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: '#1f2937' }}>{t.commitPanel.confirmRevert}</h3>
            <p style={{ fontSize: '13px', color: '#374151', lineHeight: '1.6', margin: '0 0 12px' }}>
              {t.commitPanel.revertWarning.replace('以下', `以下 ${state.selectedFiles.length} `)}
            </p>
            <div style={{
              maxHeight: '150px', overflow: 'auto', padding: '8px 12px',
              background: '#f8fafc', borderRadius: '6px', border: '1px solid #e5e7eb',
              fontFamily: 'Consolas, monospace', fontSize: '12px', color: '#374151',
              marginBottom: '16px',
            }}>
              {state.selectedFiles.map(f => <div key={f}>{f}</div>)}
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button style={{
                padding: '6px 16px', fontSize: '13px', border: '1px solid #d1d5db',
                borderRadius: '6px', background: '#fff', cursor: 'pointer', color: '#374151',
              }} onClick={() => setShowRevertConfirm(false)}>{t.common.cancel}</button>
              <button className="warning-button" style={{ padding: '6px 16px', fontSize: '13px' }}
                onClick={confirmRevert} disabled={reverting}>
                {reverting ? t.commitPanel.reverting : t.commitPanel.confirmRevertBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
