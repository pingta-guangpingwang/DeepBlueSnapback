import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useAppState } from '../../context/AppContext'
import { useRepository } from '../../hooks/useRepository'
import { useVersionSwitch } from '../../hooks/useVersionSwitch'
import { VersionSwitcherBanner as VersionBanner } from './VersionSwitcher'
import { computeLineDiff, getDiffStats, type DiffLine } from './DiffView'
import { useI18n } from '../../i18n'
import VirtualList from '../common/VirtualList'

interface CommitEntry {
  id: string
  message: string
  timestamp: string
  fileCount: number
  totalSize: number
  summary?: string
  author?: string
  sessionId?: string
  changedFiles?: { added: string[]; modified: string[]; deleted: string[] }
}

interface FileEntry {
  path: string
  hash: string
  size: number
}

interface CommitDetail {
  id: string
  message: string
  timestamp: string
  files: FileEntry[]
  parentVersion: string | null
  totalSize: number
}

const COMMIT_ROW_HEIGHT = 76
const DIFF_LINE_HEIGHT = 22

export default function History() {
  const [state, dispatch] = useAppState()
  const { handleRollback } = useRepository()
  const { t } = useI18n()
  const { isViewing, viewedVersion, switching, error: switchError, switchToVersion, releaseVersion } = useVersionSwitch()
  const [commits, setCommits] = useState<CommitEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedCommit, setExpandedCommit] = useState<string | null>(null)
  const [commitDetail, setCommitDetail] = useState<CommitDetail | null>(null)
  const [parentDetail, setParentDetail] = useState<CommitDetail | null>(null)
  const [diffFile, setDiffFile] = useState<{ path: string; oldContent: string; newContent: string } | null>(null)
  const [diffLoading, setDiffLoading] = useState(false)
  const [diffError, setDiffError] = useState('')
  const [confirmVersion, setConfirmVersion] = useState<string | null>(null)
  const [undoAvailable, setUndoAvailable] = useState(false)
  const [undoLoading, setUndoLoading] = useState(false)
  const [restoringFile, setRestoringFile] = useState<string | null>(null)
  const [confirmRestore, setConfirmRestore] = useState<{ version: string; filePath: string } | null>(null)
  const [showAllFiles, setShowAllFiles] = useState(false)
  const [sortBy, setSortBy] = useState<'path' | 'type'>('path')

  const diffLines = useMemo(() =>
    diffFile ? computeLineDiff(diffFile.oldContent, diffFile.newContent) : [],
    [diffFile])
  const diffStats = useMemo(() => getDiffStats(diffLines), [diffLines])

  const loadHistory = useCallback(async () => {
    if (!state.repoPath) return
    setLoading(true)
    try {
      const result = await window.electronAPI.getHistoryStructured(state.repoPath)
      if (result?.success && result.commits) {
        setCommits(result.commits)
      } else {
        setCommits([])
      }
    } catch {
      setCommits([])
    } finally {
      setLoading(false)
    }
  }, [state.repoPath])

  useEffect(() => {
    if (state.repoPath) loadHistory()
  }, [state.repoPath, loadHistory])

  const toggleCommitDetail = async (commitId: string) => {
    if (expandedCommit === commitId) {
      setExpandedCommit(null)
      setCommitDetail(null)
      setParentDetail(null)
      return
    }

    setExpandedCommit(commitId)
    setCommitDetail(null)
    setParentDetail(null)

    try {
      const detail = await window.electronAPI.getCommitDetail(state.repoPath, commitId)
      if (detail) {
        setCommitDetail(detail)
        if (detail.parentVersion) {
          const parent = await window.electronAPI.getCommitDetail(state.repoPath, detail.parentVersion)
          if (parent) setParentDetail(parent)
        }
      }
    } catch (e) {
      console.error('Failed to load commit detail:', e)
    }
  }

  const showDiff = async (filePath: string) => {
    if (!commitDetail) return
    setDiffLoading(true)
    setDiffError('')

    try {
      let oldContent = ''
      if (parentDetail) {
        const parentFile = parentDetail.files.find(f => f.path === filePath)
        if (parentFile) {
          const blobResult = await window.electronAPI.getBlobContent(state.repoPath, parentFile.hash)
          if (blobResult.success) oldContent = blobResult.content || ''
        }
      }

      let newContent = ''
      const currentFile = commitDetail.files.find(f => f.path === filePath)
      if (currentFile) {
        const blobResult = await window.electronAPI.getBlobContent(state.repoPath, currentFile.hash)
        if (blobResult.success) newContent = blobResult.content || ''
      }

      setDiffFile({ path: filePath, oldContent, newContent })
    } catch (e) {
      setDiffError(t.history.loadDiffFailed + ' ' + String(e))
    } finally {
      setDiffLoading(false)
    }
  }

  const getFileStatus = (filePath: string): { label: string; color: string } => {
    if (!commitDetail || !parentDetail) {
      return { label: t.history.added, color: '#16a34a' }
    }
    const inParent = parentDetail.files.some(f => f.path === filePath)
    const inCurrent = commitDetail.files.some(f => f.path === filePath)
    if (!inParent && inCurrent) return { label: t.history.added, color: '#16a34a' }
    if (inParent && !inCurrent) return { label: t.history.deleted, color: '#dc2626' }
    const parentFile = parentDetail.files.find(f => f.path === filePath)
    const currentFile = commitDetail.files.find(f => f.path === filePath)
    if (parentFile && currentFile && parentFile.hash !== currentFile.hash) {
      return { label: t.history.modified, color: '#d97706' }
    }
    return { label: t.history.unchanged, color: '#9ca3af' }
  }

  const onRollback = async (version: string) => {
    setConfirmVersion(null)
    await handleRollback(version)
    setUndoAvailable(true)
    await loadHistory()
  }

  const onUndoRollback = async () => {
    if (!state.repoPath || !state.projectPath) return
    setUndoLoading(true)
    try {
      const result = await window.electronAPI.undoRollback(state.repoPath, state.projectPath)
      if (result.success) {
        dispatch({ type: 'SET_MESSAGE', payload: result.message || t.history.undoSuccess })
        setUndoAvailable(false)
        await loadHistory()
      } else {
        dispatch({ type: 'SET_MESSAGE', payload: t.history.undoFailed + (result.message || t.common.unknownError) })
      }
    } catch (e) {
      dispatch({ type: 'SET_MESSAGE', payload: t.history.undoFailed + String(e) })
    } finally {
      setUndoLoading(false)
    }
  }

  const onRestoreFile = (version: string, filePath: string) => {
    setConfirmRestore({ version, filePath })
  }

  const confirmRestoreFile = async () => {
    if (!confirmRestore || !state.repoPath || !state.projectPath) return
    const { version, filePath } = confirmRestore
    setConfirmRestore(null)
    setRestoringFile(filePath)
    try {
      const result = await window.electronAPI.rollbackFile(state.repoPath, state.projectPath, version, filePath)
      if (result.success) {
        dispatch({ type: 'SET_MESSAGE', payload: result.message || `${t.history.restoreSuccess}${filePath}` })
      } else {
        dispatch({ type: 'SET_MESSAGE', payload: t.history.restoreFailed + (result.message || t.common.unknownError) })
      }
    } catch (e) {
      dispatch({ type: 'SET_MESSAGE', payload: t.history.restoreFailed + String(e) })
    } finally {
      setRestoringFile(null)
    }
  }

  const formatTime = (iso: string) => {
    try { return new Date(iso).toLocaleString() } catch { return iso }
  }

  const formatSize = (bytes: number) => {
    if (bytes > 1048576) return `${(bytes / 1048576).toFixed(1)}MB`
    if (bytes > 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${bytes}B`
  }

  const getExt = (filePath: string) => {
    const parts = filePath.split('.')
    return parts.length > 1 ? parts.pop()!.toLowerCase() : ''
  }

  const displayFiles = useMemo(() => {
    if (!commitDetail) return []
    let files = commitDetail.files
    if (!showAllFiles) {
      files = files.filter(f => getFileStatus(f.path).label !== t.history.unchanged)
    }
    const sorted = [...files]
    if (sortBy === 'path') {
      sorted.sort((a, b) => a.path.localeCompare(b.path))
    } else {
      sorted.sort((a, b) => {
        const extA = getExt(a.path)
        const extB = getExt(b.path)
        if (extA !== extB) return extA.localeCompare(extB)
        return a.path.localeCompare(b.path)
      })
    }
    return sorted
  }, [commitDetail, showAllFiles, sortBy, parentDetail])

  const onSwitchToVersion = useCallback(async (repoPath: string, version: string) => {
    await switchToVersion(repoPath, version)
  }, [switchToVersion])

  const onReleaseVersion = useCallback(async () => {
    await releaseVersion()
  }, [releaseVersion])

  const commitListHeight = expandedCommit ? 'calc(100vh - 600px)' : 'calc(100vh - 300px)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <VersionBanner
        repoPath={state.repoPath}
        viewedVersion={viewedVersion}
        isViewing={isViewing}
        onSwitchToVersion={onSwitchToVersion}
        onReleaseVersion={onReleaseVersion}
        switching={switching}
        error={switchError}
      />

      <div style={{
        background: 'white', borderRadius: '12px', padding: '20px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', border: '1px solid #e5e7eb',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ margin: 0 }}>{t.history.title}</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {undoAvailable && (
              <button
                className="warning-button"
                style={{ fontSize: '12px', padding: '4px 12px' }}
                onClick={onUndoRollback}
                disabled={undoLoading}
              >
                {undoLoading ? t.history.restoring : t.history.undoRollback}
              </button>
            )}
            <button onClick={loadHistory} disabled={loading}>
              {loading ? t.history.loading : t.history.refresh}
            </button>
          </div>
        </div>

        {commits.length === 0 ? (
          <p style={{ color: '#6b7280' }}>{t.history.noHistory}</p>
        ) : (
          <>
            <div style={{
              border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden',
              background: '#fff',
            }}>
              <VirtualList
                items={commits}
                itemHeight={COMMIT_ROW_HEIGHT}
                height={commitListHeight}
                overscan={5}
                itemKey={(index) => commits[index].id}
                renderItem={(commit, _index, style) => (
                  <div style={{
                    ...style,
                    padding: '8px 14px',
                    borderBottom: '1px solid #f3f4f6',
                    background: expandedCommit === commit.id ? '#f8fafc' : '#fff',
                  }}>
                    <div
                      style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', height: '100%' }}
                      onClick={() => toggleCommitDetail(commit.id)}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{commit.message}</span>
                          {commit.author ? (
                            <span style={{
                              fontSize: '10px', padding: '1px 6px', borderRadius: '3px',
                              background: '#dbeafe', color: '#1d4ed8', fontWeight: 600, flexShrink: 0,
                            }}>AI: {commit.author}</span>
                          ) : (
                            <span style={{
                              fontSize: '10px', padding: '1px 6px', borderRadius: '3px',
                              background: '#f3f4f6', color: '#6b7280', fontWeight: 500, flexShrink: 0,
                            }}>{t.history.manual}</span>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                          <code style={{ background: '#f3f4f6', padding: '1px 6px', borderRadius: '3px', fontSize: '11px' }}>{commit.id}</code>
                          <span style={{ marginLeft: '10px' }}>{formatTime(commit.timestamp)}</span>
                          <span style={{ marginLeft: '10px' }}>{commit.fileCount} {t.history.files} {formatSize(commit.totalSize)}</span>
                          {commit.changedFiles && (
                            <>
                              {commit.changedFiles.added.length > 0 && <span style={{ marginLeft: '8px', color: '#16a34a', fontSize: '11px' }}>+{commit.changedFiles.added.length}</span>}
                              {commit.changedFiles.modified.length > 0 && <span style={{ marginLeft: '4px', color: '#d97706', fontSize: '11px' }}>~{commit.changedFiles.modified.length}</span>}
                              {commit.changedFiles.deleted.length > 0 && <span style={{ marginLeft: '4px', color: '#dc2626', fontSize: '11px' }}>-{commit.changedFiles.deleted.length}</span>}
                            </>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0, marginLeft: '12px' }}>
                        {confirmVersion === commit.id ? (
                          <>
                            <button className="warning-button" style={{ fontSize: '12px', padding: '3px 10px' }}
                              onClick={e => { e.stopPropagation(); onRollback(commit.id) }}>{t.history.confirmRollback}</button>
                            <button className="secondary-button" style={{ fontSize: '12px', padding: '3px 10px' }}
                              onClick={e => { e.stopPropagation(); setConfirmVersion(null) }}>{t.common.cancel}</button>
                          </>
                        ) : (
                          <>
                            <button
                              style={{
                                fontSize: '11px', padding: '3px 10px', border: '1px solid #60a5fa',
                                borderRadius: '4px', background: viewedVersion === commit.id ? '#2563eb' : 'transparent',
                                color: viewedVersion === commit.id ? '#fff' : '#60a5fa', cursor: 'pointer',
                              }}
                              onClick={e => {
                                e.stopPropagation()
                                if (viewedVersion === commit.id) {
                                  onReleaseVersion()
                                } else {
                                  onSwitchToVersion(state.repoPath, commit.id)
                                }
                              }}
                              disabled={switching}
                            >
                              {viewedVersion === commit.id ? 'Viewing' : 'View'}
                            </button>
                            <button className="secondary-button" style={{ fontSize: '12px', padding: '3px 10px' }}
                              onClick={e => { e.stopPropagation(); setConfirmVersion(commit.id) }}>{t.history.rollbackToVersion}</button>
                          </>
                        )}
                        <span style={{ fontSize: '16px', color: '#9ca3af', transition: 'transform 0.2s',
                          transform: expandedCommit === commit.id ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                      </div>
                    </div>
                  </div>
                )}
              />
            </div>

            {/* Expanded commit detail panel (rendered outside the virtual list) */}
            {expandedCommit && (
              <div style={{ borderTop: '1px solid #e5e7eb', padding: '10px 14px', background: '#fafbfc', marginTop: '8px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                {!commitDetail ? (
                  <p style={{ color: '#9ca3af', fontSize: '13px' }}>{t.history.loadingDetail}</p>
                ) : commitDetail.files.length === 0 ? (
                  <p style={{ color: '#9ca3af', fontSize: '13px' }}>{t.history.noFilesInVersion}</p>
                ) : (
                  <>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      marginBottom: '8px', padding: '4px 0',
                    }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#6b7280', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={showAllFiles}
                          onChange={e => setShowAllFiles(e.target.checked)}
                          style={{ cursor: 'pointer' }}
                        />
                        {t.history.showAllFiles} ({commitDetail.files.length})
                      </label>
                      <div style={{ display: 'flex', gap: '4px', fontSize: '12px' }}>
                        <span style={{ color: '#9ca3af' }}>{t.history.sortBy}</span>
                        <button style={{
                          padding: '1px 8px', fontSize: '11px', borderRadius: '3px',
                          border: `1px solid ${sortBy === 'path' ? '#4f46e5' : '#d1d5db'}`,
                          background: sortBy === 'path' ? '#eef2ff' : '#fff',
                          color: sortBy === 'path' ? '#4f46e5' : '#6b7280', cursor: 'pointer',
                        }} onClick={() => setSortBy('path')}>{t.history.path}</button>
                        <button style={{
                          padding: '1px 8px', fontSize: '11px', borderRadius: '3px',
                          border: `1px solid ${sortBy === 'type' ? '#4f46e5' : '#d1d5db'}`,
                          background: sortBy === 'type' ? '#eef2ff' : '#fff',
                          color: sortBy === 'type' ? '#4f46e5' : '#6b7280', cursor: 'pointer',
                        }} onClick={() => setSortBy('type')}>{t.history.type}</button>
                      </div>
                    </div>
                    {!showAllFiles && (
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '6px' }}>
                        {displayFiles.length}{t.history.showingFiles}{commitDetail.files.length}）
                      </div>
                    )}
                    <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, background: '#fafbfc' }}>
                            <th style={{ textAlign: 'left', padding: '4px 8px', color: '#6b7280', fontWeight: 500 }}>{t.history.status}</th>
                            <th style={{ textAlign: 'left', padding: '4px 8px', color: '#6b7280', fontWeight: 500 }}>{t.history.filePath}</th>
                            <th style={{ textAlign: 'right', padding: '4px 8px', color: '#6b7280', fontWeight: 500 }}>{t.history.size}</th>
                            <th style={{ textAlign: 'center', padding: '4px 8px', color: '#6b7280', fontWeight: 500 }}>{t.history.diff}</th>
                            <th style={{ textAlign: 'center', padding: '4px 8px', color: '#6b7280', fontWeight: 500 }}>{t.history.restore}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayFiles.map(file => {
                            const status = getFileStatus(file.path)
                            return (
                              <tr key={file.path} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '4px 8px' }}>
                                  <span style={{ color: status.color, fontWeight: 500, fontSize: '12px' }}>[{status.label}]</span>
                                </td>
                                <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontSize: '12px' }}>{file.path}</td>
                                <td style={{ padding: '4px 8px', textAlign: 'right', color: '#6b7280', fontSize: '12px' }}>{formatSize(file.size)}</td>
                                <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                                  <button style={{
                                    fontSize: '12px', padding: '2px 8px', border: '1px solid #d1d5db',
                                    borderRadius: '4px', background: '#fff', cursor: 'pointer', color: '#374151'
                                  }} onClick={() => showDiff(file.path)}>
                                    {t.history.diff}
                                  </button>
                                </td>
                                <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                                  {status.label !== t.history.unchanged && (
                                    <button style={{
                                      fontSize: '12px', padding: '2px 8px', border: '1px solid #fca5a5',
                                      borderRadius: '4px', background: '#fef2f2', cursor: 'pointer', color: '#dc2626'
                                    }} onClick={() => onRestoreFile(commitDetail.id, file.path)}
                                      disabled={restoringFile === filePath}
                                    >
                                      {restoringFile === filePath ? t.history.restoringFile : t.history.restore}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Restore file confirmation */}
      {confirmRestore && (
        <div className="modal-overlay" style={{ zIndex: 2500 }}>
          <div style={{
            background: '#fff', borderRadius: '10px', padding: '24px', maxWidth: '420px', width: '90%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: '#1f2937' }}>{t.history.confirmFileRestore}</h3>
            <p style={{ fontSize: '13px', color: '#374151', lineHeight: '1.6', margin: '0 0 8px' }}>
              {t.history.fileRestoreWarning}<code style={{ background: '#f3f4f6', padding: '1px 6px', borderRadius: '3px', fontSize: '12px' }}>{confirmRestore.version}</code>{t.history.fileRestoreSuffix}
            </p>
            <div style={{
              padding: '8px 12px', background: '#f8fafc', borderRadius: '6px',
              border: '1px solid #e5e7eb', fontFamily: 'Consolas, monospace',
              fontSize: '12px', color: '#374151', marginBottom: '16px',
            }}>
              {confirmRestore.filePath}
            </div>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 16px' }}>
              {t.history.fileRestoreNote}
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button style={{
                padding: '6px 16px', fontSize: '13px', border: '1px solid #d1d5db',
                borderRadius: '6px', background: '#fff', cursor: 'pointer', color: '#374151',
              }} onClick={() => setConfirmRestore(null)}>{t.common.cancel}</button>
              <button className="warning-button" style={{ padding: '6px 16px', fontSize: '13px' }}
                onClick={confirmRestoreFile}>{t.history.confirmRestore}</button>
            </div>
          </div>
        </div>
      )}

      {/* Diff popup with virtualized line rendering */}
      {(diffFile || diffLoading || diffError) && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 2000
          }}
          onClick={() => { setDiffFile(null); setDiffError('') }}
        >
          <div style={{
            width: '92vw', maxWidth: '1300px', height: '85vh', background: '#fff',
            borderRadius: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column'
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              padding: '10px 16px', borderBottom: '1px solid #e5e7eb',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '14px' }}>
                  {t.history.diffTitle} {diffFile?.path || ''}
                </h3>
                {diffFile && (diffStats.added > 0 || diffStats.removed > 0) && (
                  <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                    <span style={{ color: '#16a34a', fontWeight: 500 }}>+{diffStats.added} {t.history.lines}</span>
                    <span style={{ color: '#dc2626', fontWeight: 500 }}>-{diffStats.removed} {t.history.lines}</span>
                  </div>
                )}
              </div>
              <button style={{
                border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer',
                color: '#6b7280', padding: '4px 8px', lineHeight: 1
              }} onClick={(e) => { e.stopPropagation(); setDiffFile(null); setDiffError('') }}>✕</button>
            </div>

            {diffError ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>{diffError}</div>
            ) : diffLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>{t.history.loadingDiff}</div>
            ) : diffFile ? (
              <div style={{ flex: 1, background: '#fafbfc' }}>
                <VirtualList
                  items={diffLines}
                  itemHeight={DIFF_LINE_HEIGHT}
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
                      bg = '#dcfce7'; lineColor = '#166534'; prefix = '+'
                      gutterBg = '#bbf7d0'; gutterColor = '#16a34a'
                    } else if (line.type === 'removed') {
                      bg = '#fee2e2'; lineColor = '#991b1b'; prefix = '-'
                      gutterBg = '#fecaca'; gutterColor = '#dc2626'
                    }

                    return (
                      <div style={{
                        ...style,
                        display: 'flex',
                        background: bg,
                        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                        fontSize: '13px', lineHeight: `${DIFF_LINE_HEIGHT}px`,
                      }}>
                        <div style={{
                          minWidth: '40px', textAlign: 'right', padding: '0 8px',
                          color: gutterColor, background: gutterBg,
                          borderRight: '1px solid #e5e7eb', userSelect: 'none', fontSize: '12px',
                        }}>
                          {line.oldLineNo ?? ''}
                        </div>
                        <div style={{
                          minWidth: '40px', textAlign: 'right', padding: '0 8px',
                          color: gutterColor, background: gutterBg,
                          borderRight: '1px solid #e5e7eb', userSelect: 'none', fontSize: '12px',
                        }}>
                          {line.newLineNo ?? ''}
                        </div>
                        <div style={{
                          padding: '0 4px', textAlign: 'center', color: lineColor,
                          userSelect: 'none', fontWeight: 700, fontSize: '13px',
                        }}>
                          {prefix}
                        </div>
                        <div style={{
                          flex: 1, padding: '0 8px', color: lineColor,
                          whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                          overflow: 'hidden',
                        }}>
                          {line.content || ' '}
                        </div>
                      </div>
                    )
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
