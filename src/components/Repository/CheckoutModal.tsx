import { useState, useEffect, useCallback } from 'react'
import { useAppState } from '../../context/AppContext'

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
    if (dir) setTargetDir(dir)
  }

  const handleConfirm = async () => {
    if (!selectedRepo || !targetDir) return
    setLoading(true)
    const name = folderName.trim() || selectedRepo.name
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
          <h3>拉取仓库项目</h3>
          <button className="close-button" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body">
          {/* 选择仓库 */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
              选择仓库
            </label>
            {loadingRepos ? (
              <div style={{ padding: '12px', textAlign: 'center', color: '#9ca3af', fontSize: '13px', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
                加载仓库列表...
              </div>
            ) : repos.length === 0 ? (
              <div style={{ padding: '12px', textAlign: 'center', color: '#9ca3af', fontSize: '13px', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
                暂无可拉取的仓库。请先创建或导入项目。
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
                        {repo.totalCommits} 提交 · {formatSize(repo.totalSize)} · {repo.workingCopies.length} 个工作副本
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
              拉取到目录
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={targetDir}
                onChange={e => setTargetDir(e.target.value)}
                placeholder="选择目标文件夹..."
                style={{
                  flex: 1, padding: '8px 12px', fontSize: '13px',
                  borderRadius: '6px', border: '1px solid #d1d5db',
                  fontFamily: 'Consolas, monospace',
                }}
              />
              <button onClick={selectTargetDir} style={{ whiteSpace: 'nowrap' }}>浏览...</button>
            </div>
          </div>

          {/* 文件夹名称 */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
              文件夹名称
            </label>
            <input
              type="text"
              value={folderName}
              onChange={e => setFolderName(e.target.value)}
              placeholder={selectedRepo ? selectedRepo.name : '不输入则默认使用仓库名称'}
              style={{
                width: '100%', padding: '8px 12px', fontSize: '13px',
                borderRadius: '6px', border: '1px solid #d1d5db',
                fontFamily: 'Consolas, monospace',
              }}
            />
            <div style={{ marginTop: '4px', fontSize: '12px', color: '#9ca3af' }}>
              {targetDir
                ? `${targetDir}/${folderName || selectedRepo?.name || '<名称>'}`
                : '请先选择目标目录'}
            </div>
          </div>

          {/* 操作按钮 */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={onCancel} disabled={loading}>取消</button>
            <button
              className="primary-button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              style={{ opacity: canConfirm ? 1 : 0.5 }}
            >
              {loading ? '拉取中...' : '拉取项目'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
