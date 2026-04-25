import { useState, useEffect, useCallback } from 'react'
import { useAppState } from '../../context/AppContext'
import { useProjects } from '../../hooks/useProjects'
import { useRepository } from '../../hooks/useRepository'
import ProjectCard from './ProjectCard'
import CreateProjectModal from './CreateProjectModal'
import ImportProjectModal from './ImportProjectModal'
import CheckoutModal from './CheckoutModal'
import GitCloneModal from './GitCloneModal'

// 右键菜单功能说明
const CONTEXT_MENU_ITEMS = [
  {
    icon: '📥',
    action: 'pull',
    label: '拉取文件',
    desc: '在非版本管理的文件夹空白处右键，打开深蓝并自动跳转到拉取界面，将仓库项目拉取到该文件夹。',
  },
  {
    icon: '🔄',
    action: 'update',
    label: '更新到最新版本',
    desc: '在版本管理的项目文件夹内右键，打开深蓝并自动更新工作副本到仓库最新版本。',
  },
  {
    icon: '📋',
    action: 'update-to',
    label: '更新到指定版本',
    desc: '在版本管理的项目文件夹内右键，打开深蓝并进入历史版本列表，选择目标版本进行更新。',
  },
  {
    icon: '📤',
    action: 'commit',
    label: '推送到仓库',
    desc: '在版本管理的项目文件夹内右键，打开深蓝并自动打开提交面板，查看变更并提交新版本。',
  },
]

function CLISetupButton() {
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
        {loading ? '注册中...' : registered ? '重新注册' : '注册命令行工具'}
      </button>
      {registered && (
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontSize: '13px', fontWeight: 500 }}>
          ✓ 已注册
        </span>
      )}
    </div>
  )
}

function ContextMenuSettings() {
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
          {loading ? '处理中...' : registered ? '注销右键菜单' : '注册右键菜单'}
        </button>
        {registered && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontSize: '13px', fontWeight: 500 }}>
            ✓ 已启用
          </span>
        )}
      </div>

      {/* 说明文字 */}
      <p style={{ marginTop: '12px', fontSize: '12px', color: '#9ca3af', lineHeight: '1.6' }}>
        注册后，在 Windows 资源管理器中右键点击任意文件夹即可看到 DBVS 操作选项。<br/>
        注销后，右键菜单项将被移除。可随时重新注册。
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
    const msg = hasWork
      ? `即将打开仓库 "${repo.name}" 的文件夹。\n\n该仓库包含 ${repo.totalCommits} 个提交记录和 ${repo.workingCopies.length} 个工作副本。\n如果删除仓库内的文件（objects、commits），所有版本历史将不可恢复。\n\n请谨慎操作。`
      : `即将打开仓库 "${repo.name}" 的文件夹。\n\n该仓库包含 ${repo.totalCommits} 个提交记录。\n如果删除仓库内的文件（objects、commits），所有版本历史将不可恢复。\n\n请谨慎操作。`
    if (!confirm(msg)) return
    window.electronAPI.openFolder(repo.path)
  }

  const handleOpenRoot = () => {
    if (!confirm('即将打开根仓库文件夹。\n\n根仓库包含所有项目的版本数据（repositories/）和配置（config/）。\n删除任何项目仓库将导致该项目的所有版本记录永久丢失。\n\n请谨慎操作。')) return
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
        dispatch({ type: 'SET_MESSAGE', payload: '删除失败：' + (result?.message || '未知错误') })
      }
    } catch (error) {
      dispatch({ type: 'SET_MESSAGE', payload: '删除失败：' + (error as Error).message })
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
            <div style={{ fontWeight: 600, fontSize: '13px', color: '#1e40af' }}>根仓库</div>
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
          >打开根目录</button>
        </div>
        <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontSize: '12px', color: '#4b5563' }}>
          <span>📦 仓库: <strong>{repos.length}</strong></span>
          <span>📝 提交: <strong>{totalCommits}</strong></span>
          <span>📄 快照: <strong>{totalBlobs}</strong></span>
          <span>💾 数据: <strong>{formatSize(totalSize)}</strong></span>
        </div>
      </div>

      {/* 警告 */}
      <div style={{
        padding: '8px 12px', background: '#fffbeb', borderRadius: '6px',
        border: '1px solid #fde68a', marginBottom: '14px',
        fontSize: '12px', color: '#92400e', lineHeight: '1.5',
      }}>
        ⚠️ 仓库文件夹内包含所有版本数据。删除仓库将导致关联项目的所有提交记录、文件快照永久丢失，且不可恢复。操作前请确认。
      </div>

      {/* 仓库列表 */}
      <div style={{
        border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden',
        maxHeight: 'calc(85vh - 380px)', overflowY: 'auto',
      }}>
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>加载中...</div>
        ) : repos.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
            暂无仓库。创建项目后，仓库数据将自动出现在此处。
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
                      {repo.totalCommits} 提交 · {formatSize(repo.totalSize)}
                    </span>
                  </span>
                  {repo.workingCopies.length > 0 && (
                    <span style={{
                      fontSize: '10px', color: '#2563eb', fontWeight: 600,
                      background: '#eff6ff', padding: '1px 6px', borderRadius: '3px',
                    }}>
                      {repo.workingCopies.length} 个工作副本
                    </span>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); handleOpenRepo(repo) }}
                    style={{
                      fontSize: '11px', padding: '2px 10px', borderRadius: '4px',
                      border: '1px solid #d1d5db', background: '#fff',
                      cursor: 'pointer', color: '#374151',
                    }}
                  >打开</button>
                  <button
                    onClick={e => { e.stopPropagation(); setDeleteTarget(repo.name) }}
                    style={{
                      fontSize: '11px', padding: '2px 10px', borderRadius: '4px',
                      border: '1px solid #fecaca', background: '#fff',
                      cursor: 'pointer', color: '#dc2626',
                    }}
                  >删除</button>
                </div>

                {/* 展开详情 */}
                {isExpanded && (
                  <div style={{ padding: '6px 12px 12px 42px', background: '#fafbfc', borderTop: '1px solid #f3f4f6' }}>
                    {/* 元信息 */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                      <div style={{ padding: '6px 10px', background: '#fff', borderRadius: '6px', border: '1px solid #f3f4f6' }}>
                        <div style={{ fontSize: '10px', color: '#9ca3af' }}>创建时间</div>
                        <div style={{ fontSize: '12px', color: '#374151', fontWeight: 500 }}>
                          {repo.created ? new Date(repo.created).toLocaleDateString() : '—'}
                        </div>
                      </div>
                      <div style={{ padding: '6px 10px', background: '#fff', borderRadius: '6px', border: '1px solid #f3f4f6' }}>
                        <div style={{ fontSize: '10px', color: '#9ca3af' }}>当前版本</div>
                        <div style={{ fontSize: '11px', color: '#374151', fontFamily: 'Consolas, monospace', fontWeight: 500 }}>
                          {repo.currentVersion || '无'}
                        </div>
                      </div>
                      <div style={{ padding: '6px 10px', background: '#fff', borderRadius: '6px', border: '1px solid #f3f4f6' }}>
                        <div style={{ fontSize: '10px', color: '#9ca3af' }}>文件快照</div>
                        <div style={{ fontSize: '12px', color: '#374151', fontWeight: 500 }}>{repo.blobCount} 个</div>
                      </div>
                      <div style={{ padding: '6px 10px', background: '#fff', borderRadius: '6px', border: '1px solid #f3f4f6' }}>
                        <div style={{ fontSize: '10px', color: '#9ca3af' }}>数据大小</div>
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
                        <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, marginBottom: '4px' }}>关联工作副本：</div>
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
                            >打开</button>
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
                      确认删除仓库 "{repo.name}"？
                    </div>
                    <div style={{ fontSize: '12px', color: '#991b1b', marginBottom: '10px', lineHeight: '1.6' }}>
                      将永久删除 {repo.totalCommits} 个提交记录、{repo.blobCount} 个文件快照及所有版本历史。此操作不可撤销。
                    </div>

                    {/* 关联工作副本 */}
                    {repo.workingCopies.length > 0 && (
                      <div style={{
                        padding: '8px 10px', background: '#fff', borderRadius: '6px',
                        border: '1px solid #fecaca', marginBottom: '10px',
                      }}>
                        <div style={{ fontSize: '12px', color: '#374151', fontWeight: 500, marginBottom: '6px' }}>
                          关联的本地项目文件：
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
                            同时删除以上本地项目文件
                          </label>
                        </div>
                        {!deleteAlsoCopies && (
                          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                            不勾选则仅删除仓库数据，本地项目文件将保留
                          </div>
                        )}
                        {deleteAlsoCopies && (
                          <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px', fontWeight: 500 }}>
                            ⚠ 本地项目文件将被永久删除！
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button className="secondary-button" style={{ fontSize: '11px', padding: '3px 12px' }}
                        onClick={() => { setDeleteTarget(null); setDeleteAlsoCopies(false) }}
                        disabled={deleteLoading}
                      >取消</button>
                      <button className="warning-button" style={{ fontSize: '11px', padding: '3px 12px' }}
                        onClick={() => handleDeleteRepo(repo)}
                        disabled={deleteLoading}
                      >
                        {deleteLoading ? '删除中...' : '确认删除'}
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
          {loading ? '加载中...' : '刷新'}
        </button>
      </div>
    </div>
  )
}

// ==================== 主组件 ====================

export default function RepoList() {
  const [state, dispatch] = useAppState()
  const { importProject, confirmImport, checkoutToProject, openProject, removeProject } = useProjects()
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
    const confirmed = confirm('确定要更改根仓库位置吗？这将清除当前的所有配置。')
    if (!confirmed) return

    await window.electronAPI.saveRootRepository('')
    dispatch({ type: 'SET_ROOT_REPOSITORY_PATH', payload: '' })
    dispatch({ type: 'SET_IS_ROOT_REPO_CONFIGURED', payload: false })
    dispatch({ type: 'SET_PROJECTS', payload: [] })
    dispatch({ type: 'SET_SHOW_SETTINGS_MODAL', payload: false })
    dispatch({ type: 'SET_MESSAGE', payload: '已清除根仓库配置，请重新设置' })
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
          <h1>仓库管理</h1>
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
          }}>给 AI 套上缰绳，让每一次代码生成都有迹可循</span>
        </div>
        <div className="header-right" />
      </header>

      <main className="repositories-content">
        {/* 消息提示 */}
        {state.message && state.message !== '欢迎使用 DBVS 版本管理系统' && (
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
          <h2>根仓库信息</h2>
          <div className="info-card">
            <div className="info-item">
              <strong>根仓库路径：</strong>
              <span>{state.rootRepositoryPath}</span>
            </div>
            <div className="info-item">
              <strong>项目数量：</strong>
              <span>{state.projects.length}</span>
            </div>
          </div>
        </div>

        <div className="projects-section">
          <div className="section-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h2 style={{ margin: 0 }}>项目列表</h2>
              <button
                onClick={() => setShowHelpModal(true)}
                title="功能说明"
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
                创建项目
              </button>
              <button onClick={async () => {
                const result = await importProject()
                if (result) {
                  setImportFolderPath(result.folder)
                  setImportWarning(result.warning)
                }
              }}>导入项目</button>
              <button onClick={() => setShowCheckoutModal(true)}>拉取项目</button>
              <button onClick={() => {
                // Set a flag so GitCloneModal knows to close via this state
                setShowGitCloneModal(true)
              }}>克隆远程仓库</button>
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
              <h3>全局设置</h3>
              <button className="close-button" onClick={() => dispatch({ type: 'SET_SHOW_SETTINGS_MODAL', payload: false })}>✕</button>
            </div>
            <div className="modal-body" style={{ paddingTop: '0' }}>
              {/* Tab 切换 */}
              <div style={{
                display: 'flex', borderBottom: '2px solid #e5e7eb', marginBottom: '20px', marginTop: '-4px',
              }}>
                <button onClick={() => setSettingsTab('general')} style={tabStyle(settingsTab === 'general')}>
                  基本设置
                </button>
                <button onClick={() => setSettingsTab('repository')} style={tabStyle(settingsTab === 'repository')}>
                  仓库管理
                </button>
                <button onClick={() => setSettingsTab('context-menu')} style={tabStyle(settingsTab === 'context-menu')}>
                  Windows 右键菜单
                </button>
              </div>

              {/* 基本设置 */}
              {settingsTab === 'general' && (
                <div>
                  <div className="setting-item">
                    <label style={{ fontWeight: 500, color: '#1f2937' }}>根仓库路径</label>
                    <div style={{
                      marginTop: '6px', padding: '8px 12px', background: '#f8fafc',
                      borderRadius: '6px', fontSize: '13px', color: '#374151',
                      fontFamily: 'Consolas, monospace', wordBreak: 'break-all',
                      border: '1px solid #e5e7eb',
                    }}>{state.rootRepositoryPath}</div>
                  </div>
                  <div className="setting-item" style={{ marginTop: '16px' }}>
                    <button className="warning-button" onClick={changeRootRepository}>
                      更改根仓库位置
                    </button>
                    <p className="warning-text">⚠️ 更改根仓库位置将重置所有配置，请谨慎操作</p>
                  </div>

                  {/* CLI 命令行工具 */}
                  <div className="setting-item" style={{ marginTop: '24px' }}>
                    <label style={{ fontWeight: 500, color: '#1f2937' }}>命令行工具</label>
                    <p style={{ color: '#6b7280', fontSize: '13px', margin: '6px 0 12px', lineHeight: '1.6' }}>
                      注册后可在终端中直接使用 <code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: '3px', fontFamily: 'Consolas, monospace', fontSize: '12px' }}>dbvs</code> 命令，无需打开应用即可进行版本管理操作（提交、更新、回滚等）。
                    </p>
                    <CLISetupButton />
                  </div>

                  {/* 新手引导 */}
                  <div className="setting-item" style={{ marginTop: '24px' }}>
                    <label style={{ fontWeight: 500, color: '#1f2937' }}>新手引导</label>
                    <p style={{ color: '#6b7280', fontSize: '13px', margin: '6px 0 12px', lineHeight: '1.6' }}>
                      重新查看 DBVS 基础功能的引导教程。
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
                      重新查看新手引导
                    </button>
                  </div>

                  {/* 关于 */}
                  <div style={{
                    marginTop: '28px', padding: '16px', background: '#f8fafc',
                    borderRadius: '8px', border: '1px solid #e5e7eb',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 700, color: '#1f2937' }}>DBVS</span>
                        <span style={{
                          fontSize: '11px', fontWeight: 600, color: '#fff',
                          background: '#4f46e5', padding: '1px 8px', borderRadius: '10px',
                        }}>v1.0.0</span>
                      </div>
                      <span style={{ fontSize: '11px', color: '#9ca3af' }}>MIT License</span>
                    </div>
                    <p style={{ margin: '8px 0 10px', fontSize: '12px', color: '#6b7280', lineHeight: 1.5 }}>
                      DeepBlue Version System — 本地版本管理工具<br />
                      给 AI 套上缰绳，让每一次代码生成都有迹可循
                    </p>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#9ca3af', flexWrap: 'wrap' }}>
                      <span>作者：王广平</span>
                      <span>Electron 28 + React 19</span>
                      <span>SVN 集中式架构</span>
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
                    在 Windows 资源管理器中集成 DBVS 右键菜单
                  </h4>
                  <p style={{ color: '#6b7280', fontSize: '13px', margin: '0 0 16px', lineHeight: '1.6' }}>
                    注册后，在资源管理器中右键点击任意文件夹，即可看到以下 DBVS 操作选项。
                    无需手动打开 DBVS，直接从文件夹操作版本管理。
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
          onConfirm={async (projectName, initWithCommit) => {
            await confirmImport(importFolderPath, projectName, initWithCommit)
            setImportFolderPath(null)
            setImportWarning(undefined)
          }}
          onCancel={() => { setImportFolderPath(null); setImportWarning(undefined) }}
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
        title="全局设置"
      >
        ⚙️
      </button>

      {/* Help Modal — 功能说明 */}
      {showHelpModal && (
        <div className="modal-overlay" onClick={() => setShowHelpModal(false)}>
          <div className="modal-content" style={{ maxWidth: '560px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>项目操作说明</h3>
              <button className="close-button" onClick={() => setShowHelpModal(false)}>✕</button>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {([
                {
                  icon: '🆕',
                  title: '创建项目',
                  color: '#2563eb',
                  desc: '在根仓库中新建一个空项目，同时创建对应的工作副本目录。适合从零开始的新项目。',
                },
                {
                  icon: '📥',
                  title: '导入项目',
                  color: '#16a34a',
                  desc: '将本地已有的文件夹导入到 DBVS 版本管理中。DBVS 会自动扫描文件并创建首次提交快照。',
                },
                {
                  icon: '📂',
                  title: '拉取项目',
                  color: '#d97706',
                  desc: '从已有的集中仓库中拉取项目到本地工作副本。适合多人共享同一个根仓库时获取其他人的项目。',
                },
                {
                  icon: '🔗',
                  title: '从 Git 克隆',
                  color: '#7c3aed',
                  desc: '连接远程 Git 仓库（如 GitHub、Gitee），将代码克隆到本地并自动纳入 DBVS 管理。后续可通过 Git 同步保持远程更新。',
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
                💡 提示：进入任意项目后，可在「设置 → 关于」标签页中重新查看新手引导，了解 DBVS 的完整功能介绍。
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
