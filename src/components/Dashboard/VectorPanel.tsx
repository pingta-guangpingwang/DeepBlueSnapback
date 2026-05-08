import { useState, useEffect, useRef, useCallback } from 'react'
import { useI18n } from '../../i18n'
import { useAppState } from '../../context/AppContext'
import { useVectorDB } from '../../hooks/useVectorDB'
import type { VectorSearchResult } from '../../types/electron'

export default function VectorPanel() {
  const { t } = useI18n()
  const [state] = useAppState()
  const {
    status, indexedFiles, results, loading, error, progressLog,
    buildIndex, search, deleteIndex, loadStatus, loadFiles,
    removeFiles, exportIndex, importIndex, clearError,
  } = useVectorDB()

  const [query, setQuery] = useState('')
  const [topK, setTopK] = useState(10)
  const [minSim, setMinSim] = useState(0.3)
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [currentCommitId, setCurrentCommitId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  const didLoad = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const vt = useCallback((key: string): string =>
    (t as any).vector?.[key] || key, [t])

  // Load status + files + detect current commit
  useEffect(() => {
    if (didLoad.current) return
    if (!state.currentProject) return
    didLoad.current = true
    loadStatus(state.currentProject)
    loadFiles(state.currentProject)

    // Get current HEAD commit for version mismatch detection
    if (state.repoPath) {
      ;(window as any).electronAPI?.getHistoryStructured(state.repoPath).then(
        (r: any) => {
          if (r?.success && r.commits?.length > 0) {
            setCurrentCommitId(r.commits[0].id)
          }
        }
      ).catch(() => {})
    }
  }, [state.currentProject])

  // Show action message briefly
  const flash = (msg: string) => {
    setActionMsg(msg)
    setTimeout(() => setActionMsg(null), 3000)
  }

  const getCurrentCommitId = async (): Promise<string> => {
    if (currentCommitId) return currentCommitId
    if (!state.repoPath) return 'unknown'
    try {
      const r = await (window as any).electronAPI?.getHistoryStructured(state.repoPath)
      if (r?.success && r.commits?.length > 0) {
        setCurrentCommitId(r.commits[0].id)
        return r.commits[0].id
      }
    } catch { /* ignore */ }
    return 'unknown'
  }

  const handleBuildIndex = async () => {
    if (!state.repoPath || !state.projectPath || !state.currentProject) return
    const commitId = await getCurrentCommitId()
    const ok = await buildIndex(state.repoPath, state.projectPath, commitId, state.currentProject)
    if (ok) {
      flash(vt('buildIndex') + ' ✓')
      setCurrentCommitId(commitId)
    }
  }

  const handleSearch = async () => {
    if (!query.trim() || !state.currentProject) return
    await search(state.currentProject, {
      text: query.trim(),
      topK,
      minSimilarity: minSim,
    })
  }

  const handleDelete = async () => {
    if (!state.currentProject) return
    await deleteIndex(state.currentProject)
    setShowDeleteConfirm(false)
    setSelectedFiles(new Set())
  }

  const handleRemoveFiles = async () => {
    if (!state.projectPath || !state.currentProject || selectedFiles.size === 0) return
    const commitId = await getCurrentCommitId()
    await removeFiles(state.projectPath, commitId, state.currentProject, Array.from(selectedFiles))
    setSelectedFiles(new Set())
    setShowRemoveConfirm(false)
  }

  const handleExport = async () => {
    if (!state.currentProject) return
    const data = await exportIndex(state.currentProject)
    if (data) {
      try {
        await navigator.clipboard.writeText(data)
        flash(vt('exportSuccess'))
      } catch {
        // Fallback: download as file
        const blob = new Blob([data], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${state.currentProject}-vector-export.json`
        a.click()
        URL.revokeObjectURL(url)
        flash(vt('exportSuccess'))
      }
    }
  }

  const handleImport = async () => {
    if (!state.currentProject) return
    try {
      // Try clipboard first
      const text = await navigator.clipboard.readText()
      if (text.includes('"dbht-vector-export-v1"')) {
        const ok = await importIndex(state.currentProject, text)
        if (ok) flash(vt('importSuccess'))
        return
      }
    } catch { /* clipboard empty, fall through to file picker */ }
    fileInputRef.current?.click()
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !state.currentProject) return
    try {
      const text = await file.text()
      const ok = await importIndex(state.currentProject, text)
      if (ok) flash(vt('importSuccess'))
    } catch {
      flash(vt('importFailed'))
    }
    e.target.value = ''
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const toggleFile = (filePath: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev)
      if (next.has(filePath)) next.delete(filePath)
      else next.add(filePath)
      return next
    })
  }

  const selectAllFiles = () => setSelectedFiles(new Set(indexedFiles.map(f => f.filePath)))
  const deselectAllFiles = () => setSelectedFiles(new Set())

  const versionMismatch = status && currentCommitId && status.commitId !== currentCommitId

  return (
    <div className="vector-panel">
      <h2 className="vector-title">{vt('title')}</h2>

      {/* Status Card */}
      <div className="vector-status-card">
        <div className="vector-status-header">
          <h3>{vt('indexStatus')}</h3>
          <div className="vector-status-actions">
            <button
              className="vector-btn vector-btn-build"
              onClick={handleBuildIndex}
              disabled={loading}
            >
              {loading && progressLog.length > 0 ? '...' : status ? vt('rebuildIndex') : vt('buildIndex')}
            </button>
            {status && (
              <>
                <button className="vector-btn vector-btn-export" onClick={handleExport}>
                  {vt('exportIndex')}
                </button>
                <button className="vector-btn vector-btn-import" onClick={handleImport}>
                  {vt('importIndex')}
                </button>
                <button
                  className="vector-btn vector-btn-delete"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  {vt('deleteIndex')}
                </button>
              </>
            )}
          </div>
        </div>

        {versionMismatch && (
          <div className="vector-version-warning">
            ⚠ {vt('versionMismatch')}
          </div>
        )}

        {status ? (
          <div className="vector-status-grid">
            <div className="vector-stat">
              <span className="vector-stat-label">{vt('model')}</span>
              <span className="vector-stat-value">{status.model}</span>
            </div>
            <div className="vector-stat">
              <span className="vector-stat-label">{vt('dimensions')}</span>
              <span className="vector-stat-value">{status.dimensions}</span>
            </div>
            <div className="vector-stat">
              <span className="vector-stat-label">{vt('chunks')}</span>
              <span className="vector-stat-value">{status.totalChunks.toLocaleString()}</span>
            </div>
            <div className="vector-stat">
              <span className="vector-stat-label">{vt('files')}</span>
              <span className="vector-stat-value">{status.totalFiles.toLocaleString()}</span>
            </div>
            <div className="vector-stat">
              <span className="vector-stat-label">{vt('tokens')}</span>
              <span className="vector-stat-value">{status.totalTokens.toLocaleString()}</span>
            </div>
            <div className="vector-stat">
              <span className="vector-stat-label">{vt('version')}</span>
              <span className={`vector-stat-value mono ${versionMismatch ? 'vector-version-stale' : ''}`}>
                {status.commitId.slice(0, 14)}
              </span>
            </div>
          </div>
        ) : (
          <div className="vector-status-empty">
            {vt('noIndex')}
          </div>
        )}

        {actionMsg && <div className="vector-action-msg">{actionMsg}</div>}

        {loading && progressLog.length > 0 && (
          <div className="vector-progress">
            <div className="vector-progress-header">
              <span>{vt('progress')}</span>
              <button className="vector-progress-clear" onClick={() => {}}>{vt('clearProgress')}</button>
            </div>
            {progressLog.map((msg, i) => (
              <div key={i} className="vector-progress-line">{msg}</div>
            ))}
          </div>
        )}

        {error && (
          <div className="vector-error" onClick={clearError}>{error}</div>
        )}
      </div>

      {/* File List Card */}
      {status && indexedFiles.length > 0 && (
        <div className="vector-files-card">
          <div className="vector-files-header">
            <h3>{vt('indexedFiles')} ({indexedFiles.length})</h3>
            <div className="vector-files-actions">
              <button className="vector-btn-small" onClick={selectAllFiles}>{vt('selectAll')}</button>
              <button className="vector-btn-small" onClick={deselectAllFiles}>{vt('deselectAll')}</button>
              <button
                className="vector-btn-small vector-btn-remove"
                disabled={selectedFiles.size === 0}
                onClick={() => setShowRemoveConfirm(true)}
              >
                {vt('removeSelected')} ({selectedFiles.size})
              </button>
            </div>
          </div>
          <div className="vector-files-list">
            {indexedFiles.map(f => (
              <div
                key={f.filePath}
                className={`vector-file-item ${selectedFiles.has(f.filePath) ? 'selected' : ''}`}
                onClick={() => toggleFile(f.filePath)}
              >
                <input
                  type="checkbox"
                  checked={selectedFiles.has(f.filePath)}
                  onChange={() => toggleFile(f.filePath)}
                  onClick={e => e.stopPropagation()}
                />
                <span className="vector-file-path">{f.filePath}</span>
                <span className="vector-file-meta">
                  <span className="vector-file-chunks">{f.chunkCount} chunks</span>
                  <span className="vector-file-lang">{f.language}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Card */}
      <div className="vector-search-card">
        <h3>{vt('semanticSearch')}</h3>
        <div className="vector-search-bar">
          <input
            type="text"
            className="vector-search-input"
            placeholder={vt('searchPlaceholder')}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            className="vector-btn vector-btn-search"
            onClick={handleSearch}
            disabled={loading || !query.trim()}
          >
            {vt('search')}
          </button>
        </div>
        <div className="vector-search-options">
          <label className="vector-option">
            {vt('topK')}:
            <select value={topK} onChange={e => setTopK(Number(e.target.value))}>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </label>
          <label className="vector-option">
            {vt('minSimilarity')}:
            <select value={minSim} onChange={e => setMinSim(Number(e.target.value))}>
              <option value={0}>0</option>
              <option value={0.3}>0.3</option>
              <option value={0.5}>0.5</option>
              <option value={0.7}>0.7</option>
              <option value={0.9}>0.9</option>
            </select>
          </label>
        </div>

        {results.length > 0 && (
          <div className="vector-results">
            <h4>{vt('results')} ({results.length})</h4>
            {results.map(r => (
              <div key={r.chunk.id} className="vector-result-item">
                <div className="vector-result-header">
                  <span className="vector-result-rank">#{r.rank}</span>
                  <span className="vector-result-sim">{(r.similarity * 100).toFixed(1)}%</span>
                  <span className="vector-result-file">{r.chunk.filePath}:{r.chunk.startLine}-{r.chunk.endLine}</span>
                  <span className="vector-result-lang">{r.chunk.language}</span>
                </div>
                <pre className="vector-result-content">{r.chunk.content.slice(0, 300)}</pre>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="vector-modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="vector-modal" onClick={e => e.stopPropagation()}>
            <h3>{vt('deleteIndex')}</h3>
            <p>{vt('deleteConfirm')}</p>
            <div className="vector-modal-actions">
              <button className="vector-btn" onClick={() => setShowDeleteConfirm(false)}>
                {t.common.cancel}
              </button>
              <button className="vector-btn vector-btn-delete" onClick={handleDelete}>
                {t.common.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Files Confirmation */}
      {showRemoveConfirm && (
        <div className="vector-modal-overlay" onClick={() => setShowRemoveConfirm(false)}>
          <div className="vector-modal" onClick={e => e.stopPropagation()}>
            <h3>{vt('removeSelected')}</h3>
            <p>{vt('removeFilesConfirm').replace('{count}', String(selectedFiles.size))}</p>
            <div className="vector-modal-actions">
              <button className="vector-btn" onClick={() => setShowRemoveConfirm(false)}>
                {t.common.cancel}
              </button>
              <button className="vector-btn vector-btn-delete" onClick={handleRemoveFiles}>
                {t.common.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleImportFile}
      />
    </div>
  )
}
