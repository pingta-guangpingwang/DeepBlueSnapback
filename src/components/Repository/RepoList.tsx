import { useState, useEffect, useCallback } from 'react'
import { useAppState } from '../../context/AppContext'
import { useProjects } from '../../hooks/useProjects'
import { useRepository } from '../../hooks/useRepository'
import { useI18n } from '../../i18n'
import ProjectCard from './ProjectCard'
import CreateProjectModal from './CreateProjectModal'
import ImportProjectModal from './ImportProjectModal'
import CheckoutModal from './CheckoutModal'
import GitCloneModal from './GitCloneModal'

// Context menu descriptions moved into ContextMenuSettings component for i18n

function CLISetupButton() {
  const { t } = useI18n()
  const [registered, setRegistered] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    window.electronAPI.isCLIRegistered().then(r => setRegistered(r.registered)).catch(() => {})
  }, [])

  const handleRegister = async () => {
    setLoading(true)
    try {
      const result = await window.electronAPI.registerCLI()
      const isReg = (await window.electronAPI.isCLIRegistered()).registered
      setRegistered(isReg)
      if (!result.success) {
        alert(result.message)
      }
    } catch (e) {
      alert(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <button
        onClick={handleRegister}
        disabled={loading}
        style={{
          padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
          cursor: loading ? 'wait' : 'pointer',
          background: registered ? '#f0fdf4' : '#2563eb',
          color: registered ? '#16a34a' : '#fff',
          border: registered ? '1px solid #bbf7d0' : 'none',
        }}
      >
        {loading ? t.repoList.registering : registered ? t.repoList.reRegister : t.repoList.registerCli}
      </button>
      {registered && (
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontSize: '13px', fontWeight: 500 }}>
          {t.repoList.registered}
        </span>
      )}
    </div>
  )
}

function ContextMenuSettings() {
  const { t } = useI18n()
  const CONTEXT_MENU_ITEMS = [
    { icon: '📥', action: 'pull', label: t.repoList.pullFiles, desc: t.repoList.pullFilesDesc },
    { icon: '🔄', action: 'update', label: t.repoList.updateLatest, desc: t.repoList.updateLatestDesc },
    { icon: '📋', action: 'update-to', label: t.repoList.updateTo, desc: t.repoList.updateToDesc },
    { icon: '📤', action: 'commit', label: t.repoList.pushRepo, desc: t.repoList.pushRepoDesc },
  ]
  const [registered, setRegistered] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [msgType, setMsgType] = useState<'success' | 'error'>('success')

  useEffect(() => {
    window.electronAPI.isContextMenuRegistered().then(r => setRegistered(r)).catch(() => {})
  }, [])

  const toggle = async () => {
    setLoading(true)
    setMessage('')
    try {
      const result = registered
        ? await window.electronAPI.unregisterContextMenu()
        : await window.electronAPI.registerContextMenu()

      const isReg = await window.electronAPI.isContextMenuRegistered()
      setRegistered(isReg)
      setMessage(result.message)
      setMsgType(isReg ? 'success' : 'error')
    } catch (e) {
      setMessage(String(e))
      setMsgType('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* 功能说明列表 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '0 0 20px' }}>
        {CONTEXT_MENU_ITEMS.map(item => (
          <div key={item.action} style={{
            display: 'flex', gap: '12px', alignItems: 'flex-start',
            padding: '10px 12px', borderRadius: '8px',
            background: '#f8fafc', border: '1px solid #e5e7eb',
          }}>
            <span style={{ fontSize: '22px', lineHeight: 1, flexShrink: 0, marginTop: '2px' }}>{item.icon}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px', color: '#1f2937', marginBottom: '2px' }}>{item.label}</div>
              <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.5' }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 开关按钮 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={toggle}
          disabled={loading}
          style={{
            padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
            cursor: loading ? 'wait' : 'pointer',
            background: registered ? '#fef2f2' : '#16a34a',
            color: registered ? '#dc2626' : '#fff',
            border: registered ? '1px solid #fecaca' : 'none',
          }}
        >
          {loading ? t.repoList.processing : registered ? t.repoList.unregisterContextMenu : t.repoList.registerContextMenu}
        </button>
        {registered && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontSize: '13px', fontWeight: 500 }}>
            {t.repoList.enabled}
          </span>
        )}
      </div>

      {/* 说明文字 */}
      <p style={{ marginTop: '12px', fontSize: '12px', color: '#9ca3af', lineHeight: '1.6' }}>
        {t.repoList.contextMenuNote}
      </p>

      {/* 操作结果 */}
      {message && (
        <pre style={{
          marginTop: '12px', fontSize: '12px',
          color: msgType === 'success' ? '#166534' : '#dc2626',
          background: msgType === 'success' ? '#f0fdf4' : '#fef2f2',
          padding: '10px 12px', borderRadius: '8px',
          whiteSpace: 'pre-wrap', border: `1px solid ${msgType === 'success' ? '#bbf7d0' : '#fecaca'}`,
        }}>{message}</pre>
      )}
    </div>
  )
}

// ==================== 仓库管理面板 ====================

interface RepoInfo {
  name: string
  path: string
  created: string
  currentVersion: string | null
  totalCommits: number
  totalSize: number
  blobCount: number
  workingCopies: string[]
}

function formatSize(bytes: number): string {
  if (bytes > 1048576) return `${(bytes / 1048576).toFixed(1)}MB`
  if (bytes > 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${bytes}B`
}

function RepoManager({ rootPath }: { rootPath: string }) {
  const { t } = useI18n()
  const [state, dispatch] = useAppState()
  const [repos, setRepos] = useState<RepoInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleteAlsoCopies, setDeleteAlsoCopies] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const loadRepos = useCallback(async () => {
    setLoading(true)
    try {
      const result = await window.electronAPI.listRepositories(rootPath)
      if (result?.success) {
        setRepos(result.repos)
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [rootPath])

  useEffect(() => { loadRepos() }, [loadRepos])

  const toggleExpand = (name: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name); else next.add(name)
      return next
    })
  }

  const handleOpenRepo = (repo: RepoInfo) => {
    const hasWork = repo.workingCopies.length > 0
    const copiesStr = hasWork
      ? t.repoList.openRepoConfirmCopies.replace('{copies}', String(repo.workingCopies.length))
      : ''
    const msg = t.repoList.openRepoConfirm
      .replace('{name}', repo.name)
      .replace('{commits}', String(repo.totalCommits))
      .replace('{copies}', copiesStr)
    if (!confirm(msg)) return
    window.electronAPI.openFolder(repo.path)
  }

  const handleOpenRoot = () => {
    if (!confirm(t.repoList.openRootConfirm)) return
    window.electronAPI.openFolder(rootPath)
  }

  const handleDeleteRepo = async (repo: RepoInfo) => {
    setDeleteLoading(true)
    try {
      const result = await window.electronAPI.deleteRepositoryFull(rootPath, repo.path, deleteAlsoCopies)
      if (result?.success) {
        dispatch({ type: 'SET_MESSAGE', payload: result.message })
        // 同步刷新项目列表
        const projResult = await window.electronAPI.getProjects(rootPath)
        if (projResult?.success && projResult.projects) {
          dispatch({ type: 'SET_PROJECTS', payload: projResult.projects })
        }
      } else {
        dispatch({ type: 'SET_MESSAGE', payload: t.repoList.deleteFailed + (result?.message || '未知错误') })
      }
    } catch (error) {
      dispatch({ type: 'SET_MESSAGE', payload: t.repoList.deleteFailed + (error as Error).message })
    }
    setDeleteTarget(null)
    setDeleteAlsoCopies(false)
    setDeleteLoading(false)
    await loadRepos()
  }

  // 总计统计
  const totalCommits = repos.reduce((s, r) => s + r.totalCommits, 0)
  const totalBlobs = repos.reduce((s, r) => s + r.blobCount, 0)
  const totalSize = repos.reduce((s, r) => s + r.totalSize, 0)

  return (
    <div>
      {/* 根仓库概览 */}
      <div style={{
        padding: '12px 14px', background: '#f0f4ff', borderRadius: '8px',
        border: '1px solid #bfdbfe', marginBottom: '16px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '13px', color: '#1e40af' }}>{t.repoList.rootRepo}</div>
            <div style={{ fontSize: '11px', color: '#6b7280', fontFamily: 'Consolas, monospace', marginTop: '2px', wordBreak: 'break-all' }}>
              {rootPath}
            </div>
          </div>
          <button
            onClick={handleOpenRoot}
            style={{
              fontSize: '12px', padding: '5px 14px', borderRadius: '6px',
              border: '1px solid #93c5fd', background: '#dbeafe',
              color: '#1e40af', cursor: 'pointer', fontWeight: 500,
            }}
          >{t.repoList.openRootDir}</button>
        </div>
        <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontSize: '12px', color: '#4b5563' }}>
          <span>📦 {t.repoList.repoCount} <strong>{repos.length}</strong></span>
          <span>📝 {t.repoList.commitCount} <strong>{totalCommits}</strong></span>
          <span>📄 {t.repoList.snapshotCount} <strong>{totalBlobs}</strong></span>
          <span>💾 {t.repoList.dataSize} <strong>{formatSize(totalSize)}</strong></span>
        </div>
      </div>

      {/* 警告 */}
      <div style={{
        padding: '8px 12px', background: '#fffbeb', borderRadius: '6px',
        border: '1px solid #fde68a', marginBottom: '14px',
        fontSize: '12px', color: '#92400e', lineHeight: '1.5',
      }}>
        {t.repoList.warning}
      </div>

      {/* 仓库列表 */}
      <div style={{
        border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden',
        maxHeight: 'calc(85vh - 380px)', overflowY: 'auto',
      }}>
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>{t.repoList.loading}</div>
        ) : repos.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
            {t.repoList.noRepos}
          </div>
        ) : (
          repos.map(repo => {
            const isExpanded = expanded.has(repo.name)
            return (
              <div key={repo.name} style={{ borderBottom: '1px solid #e5e7eb' }}>
                {/* 仓库行 */}
                <div
                  className="tree-row"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 12px', cursor: 'pointer',
                    background: isExpanded ? '#f8fafc' : '#fff',
                  }}
                  onClick={() => toggleExpand(repo.name)}
                >
                  <span style={{
                    fontSize: '10px', color: '#9ca3af',
                    display: 'inline-block',
                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.15s', width: '10px',
                  }}>▶</span>
                  <span style={{ fontSize: '14px' }}>
                    {isExpanded ? '📂' : '📁'}
                  </span>
                  <span style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: '13px', color: '#1f2937' }}>{repo.name}</span>
                    <span style={{ fontSize: '11px', color: '#9ca3af', marginLeft: '8px', fontFamily: 'Consolas, monospace' }}>
                      {repo.totalCommits}{t.repoList.commitsUnit}{formatSize(repo.totalSize)}
                    </span>
                  </span>
                  {repo.workingCopies.length > 0 && (
                    <span style={{
                      fontSize: '10px', color: '#2563eb', fontWeight: 600,
                      background: '#eff6ff', padding: '1px 6px', borderRadius: '3px',
                    }}>
                      {repo.workingCopies.length} {t.repoList.workingCopies}
                    </span>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); handleOpenRepo(repo) }}
                    style={{
                      fontSize: '11px', padding: '2px 10px', borderRadius: '4px',
                      border: '1px solid #d1d5db', background: '#fff',
                      cursor: 'pointer', color: '#374151',
                    }}
                  >{t.repoList.open}</button>
                  <button
                    onClick={e => { e.stopPropagation(); setDeleteTarget(repo.name) }}
                    style={{
                      fontSize: '11px', padding: '2px 10px', borderRadius: '4px',
                      border: '1px solid #fecaca', background: '#fff',
                      cursor: 'pointer', color: '#dc2626',
                    }}
                  >{t.repoList.delete}</button>
                </div>

                {/* 展开详情 */}
                {isExpanded && (
                  <div style={{ padding: '6px 12px 12px 42px', background: '#fafbfc', borderTop: '1px solid #f3f4f6' }}>
                    {/* 元信息 */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                      <div style={{ padding: '6px 10px', background: '#fff', borderRadius: '6px', border: '1px solid #f3f4f6' }}>
                        <div style={{ fontSize: '10px', color: '#9ca3af' }}>{t.repoList.created}</div>
                        <div style={{ fontSize: '12px', color: '#374151', fontWeight: 500 }}>
                          {repo.created ? new Date(repo.created).toLocaleDateString() : t.repoList.noneValue}
                        </div>
                      </div>
                      <div style={{ padding: '6px 10px', background: '#fff', borderRadius: '6px', border: '1px solid #f3f4f6' }}>
                        <div style={{ fontSize: '10px', color: '#9ca3af' }}>{t.repoList.currentVersion}</div>
                        <div style={{ fontSize: '11px', color: '#374151', fontFamily: 'Consolas, monospace', fontWeight: 500 }}>
                          {repo.currentVersion || t.repoList.none}
                        </div>
                      </div>
                      <div style={{ padding: '6px 10px', background: '#fff', borderRadius: '6px', border: '1px solid #f3f4f6' }}>
                        <div style={{ fontSize: '10px', color: '#9ca3af' }}>{t.repoList.fileSnapshots}</div>
                        <div style={{ fontSize: '12px', color: '#374151', fontWeight: 500 }}>{repo.blobCount}{t.repoList.snapCount}</div>
                      </div>
                      <div style={{ padding: '6px 10px', background: '#fff', borderRadius: '6px', border: '1px solid #f3f4f6' }}>
                        <div style={{ fontSize: '10px', color: '#9ca3af' }}>{t.repoList.dataSizeLabel}</div>
                        <div style={{ fontSize: '12px', color: '#374151', fontWeight: 500 }}>{formatSize(repo.totalSize)}</div>
                      </div>
                    </div>

                    {/* 仓库文件结构 */}
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        padding: '3px 8px', background: '#f0f4ff', borderRadius: '4px',
                        fontSize: '11px', color: '#4b5563',
                      }}>
                        <span style={{ fontSize: '12px' }}>📄</span>
                        <span style={{ fontFamily: 'Consolas, monospace', fontWeight: 500 }}>config.json</span>
                      </div>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        padding: '3px 8px', background: '#f0f4ff', borderRadius: '4px',
                        fontSize: '11px', color: '#4b5563',
                      }}>
                        <span style={{ fontSize: '12px' }}>📄</span>
                        <span style={{ fontFamily: 'Consolas, monospace', fontWeight: 500 }}>HEAD.json</span>
                      </div>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        padding: '3px 8px', background: '#f0fdf4', borderRadius: '4px',
                        fontSize: '11px', color: '#166534',
                      }}>
                        <span style={{ fontSize: '12px' }}>📁</span>
                        <span style={{ fontFamily: 'Consolas, monospace', fontWeight: 500 }}>commits/</span>
                        <span style={{ color: '#6b7280' }}>({repo.totalCommits})</span>
                      </div>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        padding: '3px 8px', background: '#f0fdf4', borderRadius: '4px',
                        fontSize: '11px', color: '#166534',
                      }}>
                        <span style={{ fontSize: '12px' }}>📁</span>
                        <span style={{ fontFamily: 'Consolas, monospace', fontWeight: 500 }}>objects/</span>
                        <span style={{ color: '#6b7280' }}>({repo.blobCount} blobs)</span>
                      </div>
                    </div>

                    {/* 工作副本 */}
                    {repo.workingCopies.length > 0 && (
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, marginBottom: '4px' }}>{t.repoList.linkedCopies}</div>
                        {repo.workingCopies.map(wc => (
                          <div key={wc} style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '2px 0', fontSize: '11px',
                          }}>
                            <span style={{ color: '#9ca3af' }}>📎</span>
                            <span style={{ fontFamily: 'Consolas, monospace', color: '#374151' }}>{wc}</span>
                            <button
                              onClick={() => window.electronAPI.openFolder(wc)}
                              style={{
                                fontSize: '10px', padding: '0 6px', borderRadius: '3px',
                                border: '1px solid #d1d5db', background: '#fff',
                                cursor: 'pointer', color: '#6b7280', lineHeight: '18px',
                              }}
                            >{t.repoList.open}</button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 仓库路径 */}
                    <div style={{ marginTop: '8px', fontSize: '11px', color: '#9ca3af', fontFamily: 'Consolas, monospace' }}>
                      {repo.path}
                    </div>
                  </div>
                )}

                {/* 删除确认 */}
                {deleteTarget === repo.name && (
                  <div style={{
                    padding: '10px 12px 10px 42px', background: '#fef2f2',
                    borderTop: '1px solid #fecaca',
                  }}>
                    <div style={{ fontSize: '13px', color: '#dc2626', fontWeight: 600, marginBottom: '8px' }}>
                      {t.repoList.confirmDelete.replace('{name}', repo.name)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#991b1b', marginBottom: '10px', lineHeight: '1.6' }}>
                      {t.repoList.deleteWarning.replace('{commits}', String(repo.totalCommits)).replace('{blobs}', String(repo.blobCount))}
                    </div>

                    {/* 关联工作副本 */}
                    {repo.workingCopies.length > 0 && (
                      <div style={{
                        padding: '8px 10px', background: '#fff', borderRadius: '6px',
                        border: '1px solid #fecaca', marginBottom: '10px',
                      }}>
                        <div style={{ fontSize: '12px', color: '#374151', fontWeight: 500, marginBottom: '6px' }}>
                          {t.repoList.relatedFiles}
                        </div>
                        {repo.workingCopies.map(wc => (
                          <div key={wc} style={{
                            fontSize: '11px', fontFamily: 'Consolas, monospace',
                            color: '#6b7280', padding: '2px 0', lineHeight: '1.5',
                          }}>
                            📂 {wc}
                          </div>
                        ))}
                        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type="checkbox"
                            checked={deleteAlsoCopies}
                            onChange={e => setDeleteAlsoCopies(e.target.checked)}
                            style={{ width: '14px', height: '14px', cursor: 'pointer', accentColor: '#dc2626' }}
                            id="delete-also-copies"
                          />
                          <label htmlFor="delete-also-copies" style={{ cursor: 'pointer', fontSize: '12px', color: '#dc2626', fontWeight: 500 }}>
                            {t.repoList.deleteAlsoCopies}
                          </label>
                        </div>
                        {!deleteAlsoCopies && (
                          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                            {t.repoList.keepCopiesNote}
                          </div>
                        )}
                        {deleteAlsoCopies && (
                          <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px', fontWeight: 500 }}>
                            {t.repoList.deleteWarningBold}
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button className="secondary-button" style={{ fontSize: '11px', padding: '3px 12px' }}
                        onClick={() => { setDeleteTarget(null); setDeleteAlsoCopies(false) }}
                        disabled={deleteLoading}
                      >{t.repoList.cancel}</button>
                      <button className="warning-button" style={{ fontSize: '11px', padding: '3px 12px' }}
                        onClick={() => handleDeleteRepo(repo)}
                        disabled={deleteLoading}
                      >
                        {deleteLoading ? t.repoList.deleting : t.repoList.confirmDeleteBtn}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* 刷新 */}
      <div style={{ marginTop: '10px', textAlign: 'right' }}>
        <button className="secondary-button" onClick={loadRepos} disabled={loading} style={{ fontSize: '12px' }}>
          {loading ? t.repoList.loading : t.repoList.refresh}
        </button>
      </div>
    </div>
  )
}

// ==================== 主组件 ====================

export default function RepoList() {
  const [state, dispatch] = useAppState()
  const { t, locale, setLocale } = useI18n()
  const { importProject, confirmImport, checkoutToProject, openProject, removeProject, deleteProject, importProgress, setImportProgress } = useProjects()
  const { openCommitPanel } = useRepository()
  const [settingsTab, setSettingsTab] = useState<'general' | 'repository' | 'context-menu'>('general')
  const [importFolderPath, setImportFolderPath] = useState<string | null>(null)
  const [importWarning, setImportWarning] = useState<string | undefined>(undefined)
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [showGitCloneModal, setShowGitCloneModal] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [cliPullTarget, setCliPullTarget] = useState<string | null>(null)
  // 检测来自右键菜单的拉取动作
  useEffect(() => {
    if (state.pendingCliAction === 'pull' && state.cliTargetPath) {
      setCliPullTarget(state.cliTargetPath)
      setShowCheckoutModal(true)
      dispatch({ type: 'SET_PENDING_CLI_ACTION', payload: { action: null, targetPath: '' } })
    }
  }, [state.pendingCliAction, state.cliTargetPath, dispatch])

  const changeRootRepository = async () => {
    const confirmed = confirm(t.repoList.confirmChangeRoot)
    if (!confirmed) return

    await window.electronAPI.saveRootRepository('')
    dispatch({ type: 'SET_ROOT_REPOSITORY_PATH', payload: '' })
    dispatch({ type: 'SET_IS_ROOT_REPO_CONFIGURED', payload: false })
    dispatch({ type: 'SET_PROJECTS', payload: [] })
    dispatch({ type: 'SET_SHOW_SETTINGS_MODAL', payload: false })
    dispatch({ type: 'SET_MESSAGE', payload: t.repoList.clearedRoot })
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '10px 20px', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
    border: 'none', background: 'none',
    color: active ? '#2563eb' : '#6b7280',
    borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
    marginBottom: '-2px',
  })

  return (
    <div className="repositories-screen">
      <header className="screen-header draggable-header">
        <div className="header-left">
          <h1>{t.repoList.title}</h1>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '20px',
          background: 'linear-gradient(135deg, #eef2ff 0%, #faf5ff 50%, #fff7ed 100%)',
          padding: '8px 20px', borderRadius: '10px',
          border: '1px solid #e5e7eb',
        }}>
          <span style={{
            fontSize: '14px', fontWeight: 600,
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed, #db2777)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            letterSpacing: '0.02em',
          }}>{t.repoList.slogan}</span>
        </div>
        <div className="header-right" />
      </header>

      <main className="repositories-content">
        {/* 消息提示 */}
        {state.message && state.message !== t.common.welcome && (
          <div style={{
            padding: '8px 16px', marginBottom: '12px', borderRadius: '6px',
            background: state.message.includes('失败') || state.message.includes('错误') ? '#fef2f2' : '#f0fdf4',
            color: state.message.includes('失败') || state.message.includes('错误') ? '#dc2626' : '#16a34a',
            fontSize: '13px', border: '1px solid ' + (state.message.includes('失败') ? '#fecaca' : '#bbf7d0'),
          }}>
            {state.message}
          </div>
        )}

        <div className="repo-info">
          <h2>{t.repoList.rootInfo}</h2>
          <div className="info-card">
            <div className="info-item">
              <strong>{t.repoList.rootPath}</strong>
              <span>{state.rootRepositoryPath}</span>
            </div>
            <div className="info-item">
              <strong>{t.repoList.projectCount}</strong>
              <span>{state.projects.length}</span>
            </div>
          </div>
        </div>

        <div className="projects-section">
          <div className="section-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h2 style={{ margin: 0 }}>{t.repoList.projectList}</h2>
              <button
                onClick={() => setShowHelpModal(true)}
                title={t.repoList.helpTitle}
                style={{
                  border: '1px solid #d1d5db', borderRadius: '50%',
                  width: '20px', height: '20px', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  background: '#fff', cursor: 'pointer', color: '#9ca3af',
                  fontSize: '12px', fontWeight: 700, lineHeight: 1,
                  transition: 'all 0.15s', padding: 0,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#4f46e5'; e.currentTarget.style.color = '#4f46e5' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.color = '#9ca3af' }}
              >?</button>
            </div>
            <div className="section-actions">
              <button onClick={() => dispatch({ type: 'SET_SHOW_CREATE_PROJECT_MODAL', payload: true })}>
                {t.repoList.createProject}
              </button>
              <button onClick={async () => {
                const result = await importProject()
                if (result) {
                  setImportFolderPath(result.folder)
                  setImportWarning(result.warning)
                }
              }}>{t.repoList.importProject}</button>
              <button onClick={() => setShowCheckoutModal(true)}>{t.repoList.pullProject}</button>
              <button onClick={() => {
                // Set a flag so GitCloneModal knows to close via this state
                setShowGitCloneModal(true)
              }}>{t.repoList.cloneRemote}</button>
            </div>
          </div>

          <div className="projects-grid">
            {state.projects.map(project => (
              <ProjectCard
                key={project.path || project.name}
                project={project}
                onEnter={() => openProject(project.path)}
                onCommit={() => openCommitPanel(project.path)}
                onRemove={removeProject}
                onDeleteFiles={deleteProject}
              />
            ))}
          </div>
        </div>
      </main>

      {/* Settings Modal — 全局设置 */}
      {state.showSettingsModal && (
        <div className="modal-overlay" onClick={() => dispatch({ type: 'SET_SHOW_SETTINGS_MODAL', payload: false })}>
          <div className="modal-content" style={{ maxWidth: '740px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t.repoList.globalSettings}</h3>
              <button className="close-button" onClick={() => dispatch({ type: 'SET_SHOW_SETTINGS_MODAL', payload: false })}>✕</button>
            </div>
            <div className="modal-body" style={{ paddingTop: '0' }}>
              {/* Tab 切换 */}
              <div style={{
                display: 'flex', borderBottom: '2px solid #e5e7eb', marginBottom: '20px', marginTop: '-4px',
              }}>
                <button onClick={() => setSettingsTab('general')} style={tabStyle(settingsTab === 'general')}>
                  {t.repoList.general}
                </button>
                <button onClick={() => setSettingsTab('repository')} style={tabStyle(settingsTab === 'repository')}>
                  {t.repoList.repository}
                </button>
                <button onClick={() => setSettingsTab('context-menu')} style={tabStyle(settingsTab === 'context-menu')}>
                  {t.repoList.windowsContextMenu}
                </button>
              </div>

              {/* 基本设置 */}
              {settingsTab === 'general' && (
                <div>
                  <div className="setting-item">
                    <label style={{ fontWeight: 500, color: '#1f2937' }}>{locale === 'en' ? 'Language / 语言' : '语言 / Language'}</label>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button
                        onClick={() => setLocale('en')}
                        style={{
                          padding: '6px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                          background: locale === 'en' ? '#2563eb' : '#fff',
                          color: locale === 'en' ? '#fff' : '#374151',
                          border: locale === 'en' ? 'none' : '1px solid #d1d5db',
                        }}
                      >English</button>
                      <button
                        onClick={() => setLocale('zh')}
                        style={{
                          padding: '6px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                          background: locale === 'zh' ? '#2563eb' : '#fff',
                          color: locale === 'zh' ? '#fff' : '#374151',
                          border: locale === 'zh' ? 'none' : '1px solid #d1d5db',
                        }}
                      >中文</button>
                    </div>
                  </div>

                  <div className="setting-item" style={{ marginTop: '16px' }}>
                    <label style={{ fontWeight: 500, color: '#1f2937' }}>{t.repoList.rootPath}</label>
                    <div style={{
                      marginTop: '6px', padding: '8px 12px', background: '#f8fafc',
                      borderRadius: '6px', fontSize: '13px', color: '#374151',
                      fontFamily: 'Consolas, monospace', wordBreak: 'break-all',
                      border: '1px solid #e5e7eb',
                    }}>{state.rootRepositoryPath}</div>
                  </div>
                  <div className="setting-item" style={{ marginTop: '16px' }}>
                    <button className="warning-button" onClick={changeRootRepository}>
                      {t.repoList.changeRootPath}
                    </button>
                    <p className="warning-text">{t.repoList.changeRootWarning}</p>
                  </div>

                  {/* CLI 命令行工具 */}
                  <div className="setting-item" style={{ marginTop: '24px' }}>
                    <label style={{ fontWeight: 500, color: '#1f2937' }}>{t.repoList.cliTool}</label>
                    <p style={{ color: '#6b7280', fontSize: '13px', margin: '6px 0 12px', lineHeight: '1.6' }}>
                      {t.repoList.cliDesc}
                    </p>
                    <CLISetupButton />
                  </div>

                  {/* 新手引导 */}
                  <div className="setting-item" style={{ marginTop: '24px' }}>
                    <label style={{ fontWeight: 500, color: '#1f2937' }}>{t.repoList.onboarding}</label>
                    <p style={{ color: '#6b7280', fontSize: '13px', margin: '6px 0 12px', lineHeight: '1.6' }}>
                      {t.repoList.onboardingDesc}
                    </p>
                    <button
                      style={{
                        fontSize: '13px', padding: '6px 16px', border: '1px solid #d1d5db',
                        borderRadius: '6px', background: '#fff', cursor: 'pointer', color: '#374151',
                      }}
                      onClick={async () => {
                        await window.electronAPI.setOnboardingCompleted(false)
                        dispatch({ type: 'SET_SHOW_ONBOARDING', payload: true })
                      }}
                    >
                      {t.repoList.reviewOnboarding}
                    </button>
                  </div>

                  {/* 关于 */}
                  <div style={{
                    marginTop: '28px', padding: '16px', background: '#f8fafc',
                    borderRadius: '8px', border: '1px solid #e5e7eb',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 700, color: '#1f2937' }}>{t.brand.name}</span>
                        <span style={{
                          fontSize: '11px', fontWeight: 600, color: '#fff',
                          background: '#4f46e5', padding: '1px 8px', borderRadius: '10px',
                        }}>v1.0.0</span>
                      </div>
                      <span style={{ fontSize: '11px', color: '#9ca3af' }}>MIT License</span>
                    </div>
                    <p style={{ margin: '8px 0 10px', fontSize: '12px', color: '#6b7280', lineHeight: 1.5 }}>
                      {t.repoList.aboutSection.split('\n').map((line, i) => (
                        <span key={i}>{i > 0 && <br />}{line}</span>
                      ))}
                    </p>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#9ca3af', flexWrap: 'wrap' }}>
                      <span>{t.about.author}</span>
                      <span>Electron 28 + React 19</span>
                      <span>{t.about.architectureValue}</span>
                      <span>GUI + CLI</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 仓库管理 */}
              {settingsTab === 'repository' && (
                <RepoManager rootPath={state.rootRepositoryPath} />
              )}

              {/* 右键菜单设置 */}
              {settingsTab === 'context-menu' && (
                <div>
                  <h4 style={{ margin: '0 0 8px', fontSize: '14px', color: '#1f2937' }}>
                    {t.repoList.contextMenuTitle}
                  </h4>
                  <p style={{ color: '#6b7280', fontSize: '13px', margin: '0 0 16px', lineHeight: '1.6' }}>
                    {t.repoList.contextMenuDesc}
                  </p>
                  <ContextMenuSettings />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {state.showCreateProjectModal && (
        <CreateProjectModal />
      )}

      {/* Import Project Modal */}
      {importFolderPath && (
        <ImportProjectModal
          folderPath={importFolderPath}
          warning={importWarning}
          progressLog={importProgress}
          onConfirm={async (projectName, initWithCommit) => {
            await confirmImport(importFolderPath, projectName, initWithCommit)
            setImportFolderPath(null)
            setImportWarning(undefined)
          }}
          onCancel={() => { setImportFolderPath(null); setImportWarning(undefined); setImportProgress([]) }}
        />
      )}

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <CheckoutModal
          defaultTargetDir={cliPullTarget || undefined}
          onConfirm={async (repoPath, targetParentDir, folderName) => {
            await checkoutToProject(repoPath, targetParentDir, folderName)
            setShowCheckoutModal(false)
            setCliPullTarget(null)
          }}
          onCancel={() => { setShowCheckoutModal(false); setCliPullTarget(null) }}
        />
      )}

      {/* Git Clone Modal */}
      {showGitCloneModal && <GitCloneModal onClose={() => setShowGitCloneModal(false)} />}

      {/* Settings floating button */}
      <button
        className="corner-settings-button"
        onClick={() => {
          setSettingsTab('general')
          dispatch({ type: 'SET_SHOW_SETTINGS_MODAL', payload: true })
        }}
        title={t.repoList.globalSettings}
      >
        ⚙️
      </button>

      {/* Help Modal — 功能说明 */}
      {showHelpModal && (
        <div className="modal-overlay" onClick={() => setShowHelpModal(false)}>
          <div className="modal-content" style={{ maxWidth: '560px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t.repoList.helpTitle}</h3>
              <button className="close-button" onClick={() => setShowHelpModal(false)}>✕</button>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {([
                {
                  icon: '🆕',
                  title: t.repoList.createProject,
                  color: '#2563eb',
                  desc: t.repoList.createDesc,
                },
                {
                  icon: '📥',
                  title: t.repoList.importProject,
                  color: '#16a34a',
                  desc: t.repoList.importDesc,
                },
                {
                  icon: '📂',
                  title: t.repoList.pullProject,
                  color: '#d97706',
                  desc: t.repoList.pullDesc,
                },
                {
                  icon: '🔗',
                  title: t.repoList.cloneRemote,
                  color: '#7c3aed',
                  desc: t.repoList.cloneDesc,
                },
              ]).map(item => (
                <div key={item.title} style={{
                  display: 'flex', gap: '12px', alignItems: 'flex-start',
                  padding: '12px', borderRadius: '8px',
                  background: `${item.color}08`, border: `1px solid ${item.color}20`,
                }}>
                  <span style={{ fontSize: '20px', flexShrink: 0, marginTop: '1px' }}>{item.icon}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#1f2937', marginBottom: '4px' }}>{item.title}</div>
                    <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
              <div style={{
                padding: '10px 14px', borderRadius: '6px',
                background: '#f0f9ff', border: '1px solid #bae6fd',
                fontSize: '13px', color: '#0369a1', lineHeight: 1.6,
              }}>
                {t.repoList.helpTip}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
