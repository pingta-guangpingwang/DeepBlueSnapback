import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useI18n } from '../../i18n'
import { useAppState } from '../../context/AppContext'
import { useVectorDB } from '../../hooks/useVectorDB'
import type { SupportedExtension, IngestFilesResult, VectorChunkInfo } from '../../types/electron'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function VectorPanel() {
  const { t } = useI18n()
  const [state] = useAppState()
  const {
    status, indexedFiles, results, loading, error, progressLog,
    buildIndex, search, deleteIndex, loadStatus, loadFiles,
    removeFiles, exportIndex, importIndex, ingestFiles,
    openFilesDialog, openFolderDialog, getSupportedExtensions, clearError,
  } = useVectorDB()

  // Search
  const [query, setQuery] = useState('')
  const [topK, setTopK] = useState(10)
  const [minSim, setMinSim] = useState(0.3)

  // File management
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [fileFilter, setFileFilter] = useState('')

  // Upload / ingestion
  const [uploadFilePaths, setUploadFilePaths] = useState<string[]>([])
  const [uploadSelected, setUploadSelected] = useState<Set<number>>(new Set())
  const [ingestResult, setIngestResult] = useState<IngestFilesResult | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [supportedExts, setSupportedExts] = useState<SupportedExtension[]>([])
  const lastCheckRef = useRef<number | null>(null)

  // Modals
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [detailFile, setDetailFile] = useState<{ filePath: string; chunks: VectorChunkInfo[]; loading: boolean } | null>(null)

  // UI state
  const [currentCommitId, setCurrentCommitId] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<'upload' | 'files' | 'search'>('upload')
  const [importing, setImporting] = useState(false)

  const didLoad = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const vt = useCallback((key: string): string =>
    (t as any).vector?.[key] || key, [t])

  // Load everything on mount
  useEffect(() => {
    if (didLoad.current) return
    if (!state.currentProject) return
    didLoad.current = true
    loadStatus(state.currentProject)
    loadFiles(state.currentProject)
    getSupportedExtensions().then(setSupportedExts)

    if (state.repoPath) {
      ;(window as any).electronAPI?.getHistoryStructured(state.repoPath).then(
        (r: any) => { if (r?.success && r.commits?.length > 0) setCurrentCommitId(r.commits[0].id) }
      ).catch(() => {})
    }
  }, [state.currentProject])

  const flash = (msg: string) => {
    setActionMsg(msg)
    setTimeout(() => setActionMsg(null), 3000)
  }

  const getCurrentCommitId = async (): Promise<string> => {
    if (currentCommitId) return currentCommitId
    if (!state.repoPath) return 'unknown'
    try {
      const r = await (window as any).electronAPI?.getHistoryStructured(state.repoPath)
      if (r?.success && r.commits?.length > 0) { setCurrentCommitId(r.commits[0].id); return r.commits[0].id }
    } catch { /* ignore */ }
    return 'unknown'
  }

  // ---- Actions ----

  const handleBuildIndex = async () => {
    if (!state.repoPath || !state.projectPath || !state.currentProject) return
    const cid = await getCurrentCommitId()
    const ok = await buildIndex(state.repoPath, state.projectPath, cid, state.currentProject)
    if (ok) { flash(vt('buildIndex') + ' ✓'); setCurrentCommitId(cid) }
  }

  const handleSearch = async () => {
    if (!query.trim() || !state.currentProject) return
    await search(state.currentProject, { text: query.trim(), topK, minSimilarity: minSim })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const handleDelete = async () => {
    if (!state.currentProject) return
    await deleteIndex(state.currentProject)
    setShowDeleteConfirm(false)
    setSelectedFiles(new Set())
    setUploadFilePaths([])
  }

  const handleRemoveFiles = async () => {
    if (!state.projectPath || !state.currentProject || selectedFiles.size === 0) return
    const cid = await getCurrentCommitId()
    await removeFiles(state.projectPath, cid, state.currentProject, Array.from(selectedFiles))
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
        const blob = new Blob([data], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `${state.currentProject}-vector-export.json`; a.click()
        URL.revokeObjectURL(url)
        flash(vt('exportSuccess'))
      }
    }
  }

  const handleImport = async () => {
    if (!state.currentProject) return
    try {
      const text = await navigator.clipboard.readText()
      if (text.includes('"dbht-vector-export-v1"')) {
        setImporting(true)
        const ok = await importIndex(state.currentProject, text)
        setImporting(false)
        flash(ok ? vt('importSuccess') : vt('importFailed'))
        return
      }
    } catch { /* fall through */ }
    fileInputRef.current?.click()
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !state.currentProject) return
    setImporting(true)
    try {
      const text = await file.text()
      const ok = await importIndex(state.currentProject, text)
      flash(ok ? vt('importSuccess') : vt('importFailed'))
    } catch { flash(vt('importFailed')) }
    setImporting(false)
    e.target.value = ''
  }

  // ---- File Upload / Ingestion ----

  const handleOpenFileDialog = async () => {
    const files = await openFilesDialog()
    if (files.length > 0) setUploadFilePaths(prev => [...prev, ...files])
  }

  const handleOpenFolderDialog = async () => {
    const files = await openFolderDialog()
    if (files.length > 0) setUploadFilePaths(prev => [...prev, ...files])
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files: string[] = []
    if (e.dataTransfer?.files) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const f = e.dataTransfer.files[i] as any
        if (f.path) files.push(f.path)
      }
    }
    if (files.length > 0) setUploadFilePaths(prev => [...prev, ...files])
  }, [])

  const removeUploadFile = (filePath: string) => {
    setUploadFilePaths(prev => prev.filter(p => p !== filePath))
  }

  const clearUploadFiles = () => { setUploadFilePaths([]); setUploadSelected(new Set()) }

  const toggleUploadFile = (index: number, shiftKey: boolean) => {
    setUploadSelected(prev => {
      const next = new Set(prev)
      if (shiftKey && lastCheckRef.current !== null) {
        // Shift+click: range select
        const start = Math.min(lastCheckRef.current, index)
        const end = Math.max(lastCheckRef.current, index)
        const targetState = !prev.has(index)
        for (let i = start; i <= end; i++) {
          if (targetState) next.add(i); else next.delete(i)
        }
      } else {
        if (next.has(index)) next.delete(index); else next.add(index)
      }
      return next
    })
    lastCheckRef.current = index
  }

  const selectAllUpload = () => {
    setUploadSelected(new Set(uploadFilePaths.map((_, i) => i)))
  }

  const deselectAllUpload = () => {
    setUploadSelected(new Set())
  }

  const handleIngestFiles = async () => {
    if (!state.currentProject || uploadSelected.size === 0) return
    const selectedPaths = Array.from(uploadSelected).map(i => uploadFilePaths[i]).filter(Boolean)
    if (selectedPaths.length === 0) return
    const cid = await getCurrentCommitId()
    const result = await ingestFiles(state.currentProject, selectedPaths, state.projectPath || '', cid)
    if (result?.success) {
      setIngestResult(result)
      const succ = result.filesSucceeded || 0
      const fail = result.filesFailed || 0
      if (succ > 0 && fail === 0) flash(vt('ingestSuccess').replace('{count}', String(succ)))
      else if (succ > 0) flash(vt('ingestPartial').replace('{succeeded}', String(succ)).replace('{failed}', String(fail)))
      else flash(vt('ingestFailed'))
      setCurrentCommitId(cid)
      // Remove ingested files from pending list
      const ingestedSet = new Set(selectedPaths)
      setUploadFilePaths(prev => prev.filter(p => !ingestedSet.has(p)))
      setUploadSelected(new Set())
    }
  }

  // ---- File selection ----

  const toggleFile = (filePath: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev)
      if (next.has(filePath)) next.delete(filePath); else next.add(filePath)
      return next
    })
  }

  const selectAllFiles = () => setSelectedFiles(new Set(indexedFiles.map(f => f.filePath)))
  const deselectAllFiles = () => setSelectedFiles(new Set())

  const handleFileDoubleClick = async (filePath: string) => {
    if (!state.currentProject) return
    setDetailFile({ filePath, chunks: [], loading: true })
    const api = (window as any).electronAPI
    if (api?.vectorFileChunks) {
      const r = await api.vectorFileChunks(state.currentProject, filePath)
      if (r?.success) {
        setDetailFile({ filePath, chunks: r.chunks || [], loading: false })
      } else {
        setDetailFile({ filePath, chunks: [], loading: false })
      }
    } else {
      setDetailFile({ filePath, chunks: [], loading: false })
    }
  }

  const filteredIndexedFiles = useMemo(() => {
    if (!fileFilter.trim()) return indexedFiles
    const q = fileFilter.toLowerCase()
    return indexedFiles.filter(f => f.filePath.toLowerCase().includes(q))
  }, [indexedFiles, fileFilter])

  // ---- Derived ----

  const versionMismatch = status && currentCommitId && status.commitId !== currentCommitId
  const fileNames = useMemo(() => uploadFilePaths.map(p => {
    const parts = p.replace(/\\/g, '/').split('/')
    return { path: p, name: parts[parts.length - 1], ext: p.slice(p.lastIndexOf('.')).toLowerCase() }
  }), [uploadFilePaths])

  const formatCount = supportedExts.length

  return (
    <div className="vector-panel">
      <h2 className="vector-title">{vt('title')}</h2>

      {/* ===== Toolbar ===== */}
      <div className="vector-toolbar">
        <div className="vector-toolbar-group">
          <button className="vector-btn-primary" onClick={handleOpenFileDialog} disabled={loading}>
            + {vt('addFiles')}
          </button>
          <button className="vector-btn-primary" onClick={handleOpenFolderDialog} disabled={loading} style={{ background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)' }}>
            📂 {vt('addFolder') || 'Add Folder'}
          </button>
        </div>
        {status && (
          <>
            <div className="vector-toolbar-divider" />
            <div className="vector-toolbar-group">
              <span className="vector-toolbar-label">{vt('exportIndex')}</span>
              <button className="vector-btn vector-btn-export" onClick={handleExport} disabled={!status}>
                {vt('exportIndex')}
              </button>
              <button className="vector-btn vector-btn-import" onClick={handleImport} disabled={importing}>
                {importing ? vt('importing') || 'Importing...' : vt('importIndex')}
              </button>
            </div>
            <div className="vector-toolbar-divider" />
            <button className="vector-btn vector-btn-delete" onClick={() => setShowDeleteConfirm(true)}>
              {vt('deleteIndex')}
            </button>
          </>
        )}
      </div>

      {actionMsg && <div className="vector-action-msg">{actionMsg}</div>}

      {/* ===== Step 1: Source Area (Drop Zone) ===== */}
      <div className="vector-section">
        <div className="vector-section-label">{vt('stepSource') || '📥 Source Files'}</div>
        <div
          className={`vector-dropzone ${isDragging ? 'drag-active' : ''}`}
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={e => { e.preventDefault(); setIsDragging(false) }}
          onDrop={handleDrop}
          onClick={handleOpenFileDialog}
        >
          <div className="vector-dropzone-icon">📁</div>
          <div className="vector-dropzone-text">
            {isDragging ? vt('uploadZoneActive') : vt('uploadZone')}
          </div>
          <div className="vector-dropzone-hint">
            {vt('uploadZoneHint')}
          </div>
          {formatCount > 0 && (
            <div className="vector-formats-bar">
              {supportedExts.map(e => (
                <span key={e.extension} className={`vector-format-badge cat-${e.category}`}>
                  {e.extension}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== Step 2: Pending Files ===== */}
      {uploadFilePaths.length > 0 && (
        <div className="vector-section">
          <div className="vector-upload-list-card">
            <div className="vector-upload-list-header">
              <span>{vt('pendingFiles') || 'Pending Files'} ({uploadFilePaths.length})</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="vector-btn-small" onClick={selectAllUpload}>{vt('selectAll')}</button>
                <button className="vector-btn-small" onClick={deselectAllUpload}>{vt('deselectAll')}</button>
                <button className="vector-btn-small vector-btn-remove" onClick={clearUploadFiles}>
                  {vt('clearFiles')}
                </button>
              </div>
            </div>
            <div className="vector-upload-list">
              {fileNames.map((f, i) => (
                <div
                  key={f.path}
                  className={`vector-upload-item ${uploadSelected.has(i) ? 'selected' : ''}`}
                  onClick={e => toggleUploadFile(i, e.shiftKey)}
                >
                  <input
                    type="checkbox"
                    className="vector-upload-checkbox"
                    checked={uploadSelected.has(i)}
                    onChange={e => { e.stopPropagation(); toggleUploadFile(i, false) }}
                    onClick={e => e.stopPropagation()}
                  />
                  <span className={`vector-upload-ext ${f.ext.slice(1)}`}>{f.ext}</span>
                  <span className="vector-upload-name" title={f.path}>{f.name}</span>
                  <span className="vector-upload-path" title={f.path}>{f.path}</span>
                  <button
                    className="vector-upload-remove"
                    onClick={e => { e.stopPropagation(); removeUploadFile(f.path) }}
                    title={t.common?.remove || 'Remove'}
                  >×</button>
                </div>
              ))}
            </div>
            <div className="vector-upload-list-footer">
              <span className="vector-upload-count">
                {uploadSelected.size > 0
                  ? `${uploadSelected.size} of ${uploadFilePaths.length} selected`
                  : `${uploadFilePaths.length} file(s) pending`}
              </span>
              <button
                className="vector-btn-primary"
                onClick={handleIngestFiles}
                disabled={loading || uploadSelected.size === 0}
              >
                {loading ? vt('ingesting') : vt('startIngest') || 'Import Selected'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Step 3: Main Action — Build / Vectorize ===== */}
      <div className="vector-section vector-action-section">
        <button
          className="vector-btn-build-main"
          onClick={handleBuildIndex}
          disabled={loading}
        >
          {loading && progressLog.length > 0
            ? <><span className="vector-spinner-sm" /> {vt('building')}</>
            : vt('buildBtn')}
        </button>
        <p className="vector-action-desc">{vt('buildDesc')}</p>
      </div>

      {/* ===== Progress Log ===== */}
      {loading && progressLog.length > 0 && (
        <div className="vector-section">
          <div className="vector-progress">
            <div className="vector-progress-header">
              <span>{vt('progress')}</span>
            </div>
            <div className="vector-progress-bar">
              <div className="vector-progress-fill" style={{ width: `${Math.min(100, (progressLog.length / 15) * 100)}%` }} />
            </div>
            {progressLog.slice(-8).map((msg, i) => (
              <div key={i} className="vector-progress-line">{msg}</div>
            ))}
          </div>
        </div>
      )}

      {/* ===== Version Warning ===== */}
      {versionMismatch && (
        <div className="vector-version-warning">
          ⚠ {vt('versionMismatch')}
        </div>
      )}

      {/* ===== Error ===== */}
      {error && (
        <div className="vector-error" onClick={clearError}>{error}</div>
      )}

      {/* ===== Step 4: Knowledge Base Result ===== */}
      {status && (
        <div className="vector-section">
          <div className="vector-section-label">{vt('knowledgeBase') || '📊 Knowledge Base'}</div>

          {/* Status Grid */}
          <div className="vector-status-card">
            <div className="vector-status-grid">
              <div className="vector-stat">
                <span className="vector-stat-value-lg">{status.totalFiles.toLocaleString()}</span>
                <span className="vector-stat-label">{vt('files')}</span>
              </div>
              <div className="vector-stat">
                <span className="vector-stat-value-lg">{status.totalChunks.toLocaleString()}</span>
                <span className="vector-stat-label">{vt('chunks')}</span>
              </div>
              <div className="vector-stat">
                <span className="vector-stat-value-lg">{status.totalTokens.toLocaleString()}</span>
                <span className="vector-stat-label">{vt('tokens')}</span>
              </div>
              <div className="vector-stat">
                <span className="vector-stat-value-lg">{status.dimensions}d</span>
                <span className="vector-stat-label">{status.model}</span>
              </div>
            </div>
          </div>

          {/* Indexed Files */}
          {indexedFiles.length > 0 && (
            <div className="vector-files-card" style={{ marginTop: 12 }}>
              <div className="vector-files-header">
                <h3>{vt('indexedFiles')} ({indexedFiles.length})</h3>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    className="vector-filter-input"
                    type="text"
                    placeholder={vt('filterFiles')}
                    value={fileFilter}
                    onChange={e => setFileFilter(e.target.value)}
                  />
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
                {filteredIndexedFiles.map(f => (
                  <div
                    key={f.filePath}
                    className={`vector-file-item ${selectedFiles.has(f.filePath) ? 'selected' : ''}`}
                    onClick={() => toggleFile(f.filePath)}
                    onDoubleClick={(e) => { e.preventDefault(); handleFileDoubleClick(f.filePath) }}
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
                {filteredIndexedFiles.length === 0 && fileFilter.trim() !== '' && (
                  <div className="vector-no-results">No files match "{fileFilter}"</div>
                )}
              </div>
            </div>
          )}

          {/* Semantic Search */}
          <div className="vector-search-card" style={{ marginTop: 12 }}>
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
                  {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <label className="vector-option">
                {vt('minSimilarity')}:
                <select value={minSim} onChange={e => setMinSim(Number(e.target.value))}>
                  {[0, 0.3, 0.5, 0.7, 0.9].map(n => <option key={n} value={n}>{n}</option>)}
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
        </div>
      )}

      {/* ===== Empty State ===== */}
      {!status && !loading && (
        <div className="vector-section">
          <div className="vector-empty-state">
            <div className="vector-empty-icon">🧠</div>
            <h3>{vt('noIndex')}</h3>
            <p>{vt('noIndexHint') || '点击上方按钮构建知识库，将源代码和文档转化为可语义搜索的向量索引'}</p>
          </div>
        </div>
      )}

      {/* ===== File Detail Modal ===== */}
      {detailFile && (
        <div className="vector-modal-overlay" onClick={() => setDetailFile(null)}>
          <div className="vector-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="vector-detail-header">
              <div>
                <h3>{detailFile.filePath.split(/[\\/]/).pop()}</h3>
                <span className="vector-detail-path">{detailFile.filePath}</span>
              </div>
              <button className="vector-detail-close" onClick={() => setDetailFile(null)}>✕</button>
            </div>
            <div className="vector-detail-body">
              {detailFile.loading ? (
                <div className="vector-detail-loading">{vt('loading') || 'Loading...'}</div>
              ) : detailFile.chunks.length === 0 ? (
                <div className="vector-detail-empty">No chunk data available</div>
              ) : (
                <>
                  <div className="vector-detail-stats">
                    <span>{detailFile.chunks.length} chunks</span>
                    <span>{detailFile.chunks.reduce((s, c) => s + c.tokenCount, 0).toLocaleString()} tokens</span>
                    <span>{detailFile.chunks[0]?.language || 'unknown'}</span>
                  </div>
                  <div className="vector-detail-chunks">
                    {detailFile.chunks.map(chunk => (
                      <div key={chunk.id} className="vector-detail-chunk">
                        <div className="vector-detail-chunk-header">
                          Lines {chunk.startLine}–{chunk.endLine}
                          <span className="vector-detail-chunk-tokens">{chunk.tokenCount} tokens</span>
                        </div>
                        <pre className="vector-detail-chunk-content">{chunk.content.slice(0, 500)}{chunk.content.length > 500 ? '...' : ''}</pre>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== Delete Confirmation Modal ===== */}
      {showDeleteConfirm && (
        <div className="vector-modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="vector-modal" onClick={e => e.stopPropagation()}>
            <h3>{vt('deleteIndex')}</h3>
            <p>{vt('deleteConfirm')}</p>
            <div className="vector-modal-actions">
              <button className="vector-btn" onClick={() => setShowDeleteConfirm(false)}>{t.common.cancel}</button>
              <button className="vector-btn vector-btn-delete" onClick={handleDelete}>{t.common.confirm}</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Remove Files Confirmation ===== */}
      {showRemoveConfirm && (
        <div className="vector-modal-overlay" onClick={() => setShowRemoveConfirm(false)}>
          <div className="vector-modal" onClick={e => e.stopPropagation()}>
            <h3>{vt('removeSelected')}</h3>
            <p>{vt('removeFilesConfirm').replace('{count}', String(selectedFiles.size))}</p>
            <div className="vector-modal-actions">
              <button className="vector-btn" onClick={() => setShowRemoveConfirm(false)}>{t.common.cancel}</button>
              <button className="vector-btn vector-btn-delete" onClick={handleRemoveFiles}>{t.common.confirm}</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Hidden file inputs ===== */}
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
