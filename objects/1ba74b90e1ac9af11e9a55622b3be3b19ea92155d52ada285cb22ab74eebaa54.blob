import { useState, useEffect, useCallback } from 'react'
import { useAppState } from '../../context/AppContext'
import { useI18n } from '../../i18n'

interface RepoItem {
  name: string
  path: string
  created: string
  currentVersion: string | null
  totalCommits: number
  totalSize: number
  blobCount: number
  workingCopies: string[]
}

interface Props {
  onConfirm: (repoPath: string, targetParentDir: string, folderName: string) => Promise<void>
  onCancel: () => void
  defaultTargetDir?: string
}

export default function CheckoutModal({ onConfirm, onCancel, defaultTargetDir }: Props) {
  const [state] = useAppState()
  const { t } = useI18n()
  const [repos, setRepos] = useState<RepoItem[]>([])
  const [selectedRepo, setSelectedRepo] = useState<RepoItem | null>(null)
  const [targetDir, setTargetDir] = useState(() => {
    if (!defaultTargetDir) return ''
    // 拆分为父目录 + 文件夹名
    const parts = defaultTargetDir.replace(/\\/g, '/')
    const lastSlash = parts.lastIndexOf('/')
    return lastSlash > 0 ? parts.substring(0, lastSlash).replace(/\//g, '\\') : defaultTargetDir
  })
  const [folderName, setFolderName] = useState(() => {
    if (!defaultTargetDir) return ''
    const parts = defaultTargetDir.replace(/\\/g, '/')
    const lastSlash = parts.lastIndexOf('/')
    return lastSlash >= 0 ? parts.substring(lastSlash + 1) : ''
  })
  const [loading, setLoading] = useState(false)
  const [loadingRepos, setLoadingRepos] = useState(true)

  const loadRepos = useCallback(async () => {
    setLoadingRepos(true)
    try {
      const result = await window.electronAPI.listRepositories(state.rootRepositoryPath)
      if (result?.success) {
        setRepos(result.repos)
      }
    } catch { /* ignore */ }
    setLoadingRepos(false)
  }, [state.rootRepositoryPath])

  useEffect(() => { loadRepos() }, [loadRepos])

  // 选择仓库时自动填充默认文件夹名（如果没有预填值）
  useEffect(() => {
    if (selectedRepo && !defaultTargetDir) {
      setFolderName(selectedRepo.name)
    }
  }, [selectedRepo, defaultTargetDir])

  const selectTargetDir = async () => {
    const dir = await window.electronAPI.selectFolder()
    if (dir) {
      // 拆分为父目录 + 文件夹名
      const normalized = dir.replace(/\//g, '\\')
      const lastSep = normalized.lastIndexOf('\\')
      if (lastSep > 0) {
        setTargetDir(normalized.substring(0, lastSep))
        setFolderName(normalized.substring(lastSep + 1))
      } else {
        setTargetDir(normalized)
        setFolderName('')
      }
    }
  }

  const handleConfirm = async () => {
    if (!selectedRepo || !targetDir) return
    setLoading(true)
    const name = folderName.trim()
    await onConfirm(selectedRepo.path, targetDir, name)
    setLoading(false)
  }

  const canConfirm = selectedRepo && targetDir && !loading

  const formatSize = (bytes: number) => {
    if (bytes > 1048576) return `${(bytes / 1048576).toFixed(1)}MB`
    if (bytes > 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${bytes}B`
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" style={{ maxWidth: '560px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{t.checkout.title}</h3>
          <button className="close-button" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body">
          {/* 选择仓库 */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
              {t.checkout.selectRepo}
            </label>
            {loadingRepos ? (
              <div style={{ padding: '12px', textAlign: 'center', color: '#9ca3af', fontSize: '13px', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
                {t.checkout.loadingRepos}
              </div>
            ) : repos.length === 0 ? (
              <div style={{ padding: '12px', textAlign: 'center', color: '#9ca3af', fontSize: '13px', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
                {t.checkout.noRepos}
              </div>
            ) : (
              <div style={{
                border: '1px solid #e5e7eb', borderRadius: '8px',
                maxHeight: '200px', overflowY: 'auto',
              }}>
                {repos.map(repo => (
                  <div
                    key={repo.name}
                    onClick={() => setSelectedRepo(repo)}
                    className="tree-row"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '8px 12px', cursor: 'pointer',
                      background: selectedRepo?.name === repo.name ? '#eff6ff' : '#fff',
                      borderBottom: '1px solid #f3f4f6',
                    }}
                  >
                    <span style={{ fontSize: '14px' }}>{selectedRepo?.name === repo.name ? '📂' : '📁'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: '#1f2937' }}>{repo.name}</div>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                        {repo.totalCommits}{t.checkout.commits}{formatSize(repo.totalSize)} · {repo.workingCopies.length}{t.checkout.workingCopies}
                      </div>
                    </div>
                    {selectedRepo?.name === repo.name && (
                      <span style={{ fontSize: '12px', color: '#2563eb', fontWeight: 600 }}>✓</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 目标目录 */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
              {t.checkout.targetDir}
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={targetDir}
                onChange={e => setTargetDir(e.target.value)}
                placeholder={t.checkout.selectTarget}
                style={{
                  flex: 1, padding: '8px 12px', fontSize: '13px',
                  borderRadius: '6px', border: '1px solid #d1d5db',
                  fontFamily: 'Consolas, monospace',
                }}
              />
              <button onClick={selectTargetDir} style={{ whiteSpace: 'nowrap' }}>{t.common.browse}</button>
            </div>
          </div>

          {/* 文件夹名称 */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
              {t.checkout.folderName}
            </label>
            <input
              type="text"
              value={folderName}
              onChange={e => setFolderName(e.target.value)}
              placeholder={selectedRepo ? selectedRepo.name : t.checkout.folderPlaceholder}
              style={{
                width: '100%', padding: '8px 12px', fontSize: '13px',
                borderRadius: '6px', border: '1px solid #d1d5db',
                fontFamily: 'Consolas, monospace',
              }}
            />
            <div style={{ marginTop: '4px', fontSize: '12px', color: '#9ca3af' }}>
              {targetDir
                ? folderName.trim()
                  ? `${targetDir}\\${folderName.trim()}`
                  : `${targetDir}${t.checkout.previewDirect}`
                : t.checkout.previewSelect}
            </div>
          </div>

          {/* 操作按钮 */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={onCancel} disabled={loading}>{t.common.cancel}</button>
            <button
              className="primary-button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              style={{ opacity: canConfirm ? 1 : 0.5 }}
            >
              {loading ? t.checkout.pulling : t.checkout.pullProject}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
