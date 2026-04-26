import { useState, useMemo, useCallback, useEffect } from 'react'
import { useAppState } from '../../context/AppContext'
import { useRepository } from '../../hooks/useRepository'
import { useGit } from '../../hooks/useGit'
import { useI18n } from '../../i18n'

// 文件类型图标
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
    scss: { icon: 'SC', color: '#cc6699' },
    json: { icon: '{}', color: '#292929' }, xml: { icon: '<>', color: '#e44d26' },
    yaml: { icon: 'YM', color: '#cb171e' }, yml: { icon: 'YM', color: '#cb171e' },
    md: { icon: 'MD', color: '#083fa1' }, txt: { icon: 'TX', color: '#6b7280' },
    png: { icon: 'PN', color: '#a855f7' }, jpg: { icon: 'JP', color: '#a855f7' },
    svg: { icon: 'SV', color: '#ffb13b' }, sql: { icon: 'SQ', color: '#336791' },
    sh: { icon: 'SH', color: '#4eaa25' }, bat: { icon: 'BT', color: '#4eaa25' },
    env: { icon: 'EN', color: '#ecd53f' }, lock: { icon: 'LK', color: '#6b7280' },
  }
  return map[ext] || { icon: ext ? ext.substring(0, 2).toUpperCase() : '?', color: '#9ca3af' }
}

const STATUS_MAP: Record<string, { text: string; color: string }> = {
  A: { text: 'Added', color: '#16a34a' },
  M: { text: 'Modified', color: '#d97706' },
  D: { text: 'Deleted', color: '#dc2626' },
}

interface StatusFile {
  path: string
  stateChar: string
}

export default function Overview() {
  const [state, dispatch] = useAppState()
  const { loadStatus, handleUpdate, loadRepositoryInfo, showFileDiff } = useRepository()
  const { loadGitStatus, gitPull, gitPush, loadCredentials } = useGit()
  const { t } = useI18n()
  const [feedback, setFeedback] = useState('')
  const [gitAuth, setGitAuth] = useState<{ username: string; token: string }>({ username: '', token: '' })
  const [pushMsg, setPushMsg] = useState('')
  const [diffSummary, setDiffSummary] = useState<{
    files: Array<{ path: string; status: string; added: number; removed: number }>
    totalAdded: number
    totalRemoved: number
  } | null>(null)

  // Load Git sync status on mount
  useEffect(() => {
    if (state.projectPath) loadGitStatus()
  }, [state.projectPath])

  // Load saved Git credentials when sync status loads
  useEffect(() => {
    const loadCreds = async () => {
      if (state.gitSyncStatus?.remoteUrl) {
        try {
          const host = new URL(state.gitSyncStatus.remoteUrl).hostname
          const creds = await loadCredentials()
          if (creds[host]) setGitAuth(creds[host])
        } catch { /* ignore */ }
      }
    }
    loadCreds()
  }, [state.gitSyncStatus?.connected])

  // 自动执行来自右键菜单的 CLI 动作
  useEffect(() => {
    if (!state.pendingCliAction) return
    const action = state.pendingCliAction
    dispatch({ type: 'SET_PENDING_CLI_ACTION', payload: { action: null, targetPath: '' } })

    if (action === 'update') {
      setFeedback(t.overview.updating)
      handleUpdate().then(() => setFeedback(t.overview.updated))
    }
    // commit 动作通过 Overview 内部的 openCommitPanel 处理，在组件挂载后由下面的 effect 触发
  }, [state.pendingCliAction, handleUpdate, dispatch])

  // 解析状态行
  const statusItems: StatusFile[] = useMemo(() => {
    return state.statusLines
      .map(line => {
        const raw = line.trim()
        if (!raw || raw.length < 2) return null
        const stateChar = raw[0]
        const filePath = raw.slice(2).trim()
        return { path: filePath, stateChar }
      })
      .filter((item): item is StatusFile => item !== null && !!item.path)
  }, [state.statusLines])

  // 统计
  const stats = useMemo(() => {
    const s = { A: 0, M: 0, D: 0 }
    for (const item of statusItems) {
      if (item.stateChar in s) s[item.stateChar as 'A' | 'M' | 'D']++
    }
    return s
  }, [statusItems])

  // 按目录分组
  const groups = useMemo(() => {
    const g: Record<string, StatusFile[]> = {}
    for (const file of statusItems) {
      const parts = file.path.split('/')
      const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : ''
      if (!g[dir]) g[dir] = []
      g[dir].push(file)
    }
    return g
  }, [statusItems])

  const onGetStatus = useCallback(async () => {
    setFeedback(t.overview.gettingStatus)
    await loadStatus()
    // 同时加载 diff 统计
    if (state.repoPath && state.projectPath) {
      try {
        const result = await window.electronAPI.getDiffSummary(state.repoPath, state.projectPath)
        if (result.success && result.files && result.files.length > 0) {
          setDiffSummary({ files: result.files, totalAdded: result.totalAdded || 0, totalRemoved: result.totalRemoved || 0 })
        } else {
          setDiffSummary(null)
        }
      } catch { setDiffSummary(null) }
    }
    if (statusItems.length === 0 && state.statusLines.length === 0) {
      setFeedback(t.overview.noChanges)
    } else {
      setFeedback('')
    }
  }, [loadStatus, state.repoPath, state.projectPath])

  const onUpdate = useCallback(async () => {
    setFeedback(t.overview.updating)
    await handleUpdate()
    setFeedback(t.overview.updated)
  }, [handleUpdate])

  const onRepoInfo = useCallback(async () => {
    setFeedback(t.overview.gettingInfo)
    await loadRepositoryInfo()
    setFeedback(t.overview.gotInfo)
  }, [loadRepositoryInfo])

  const openCommitPanel = useCallback(async () => {
    if (!state.currentProject) return
    // 重新获取最新状态后打开提交面板
    dispatch({ type: 'SET_IS_LOADING', payload: true })
    try {
      const project = state.projects.find(p => p.path === state.currentProject)
      const repoPath = project?.repoPath || state.repoPath
      const workingCopyPath = project?.path || state.projectPath
      if (!repoPath || !workingCopyPath) return

      const statusResult = await window.electronAPI.getStatus(repoPath, workingCopyPath)
      if (statusResult?.success && statusResult.status) {
        const files = statusResult.status
          .map((line: string) => {
            const raw = line.trim()
            if (!raw || raw.length < 2) return null
            const status = raw[0]
            const filePath = raw.slice(2).trim()
            return { path: filePath, status }
          })
          .filter((item): item is { path: string; status: string } => item !== null && !!item.path)

        dispatch({ type: 'SET_COMMIT_PANEL_FILES', payload: files })
        dispatch({ type: 'SET_COMMIT_PANEL_PROJECT', payload: state.currentProject })
        dispatch({ type: 'SET_SELECTED_FILES', payload: files.map(f => f.path) })
        dispatch({ type: 'SET_COMMIT_MESSAGE', payload: '' })
      } else {
        setFeedback(t.overview.noChangedFiles)
      }
    } catch {
      setFeedback(t.overview.openCommitFailed)
    } finally {
      dispatch({ type: 'SET_IS_LOADING', payload: false })
    }
  }, [state.currentProject, state.projects, state.repoPath, state.projectPath, dispatch])

  // 来自右键菜单的 commit 动作：自动打开提交面板
  const pendingCommitRef = useState(false)
  useEffect(() => {
    if (state.pendingCliAction === 'commit' && state.projectPath) {
      dispatch({ type: 'SET_PENDING_CLI_ACTION', payload: { action: null, targetPath: '' } })
      openCommitPanel()
    }
  }, [state.pendingCliAction, state.projectPath, openCommitPanel, dispatch])

  const openDiff = useCallback(async (filePath: string) => {
    dispatch({ type: 'SET_DIFF_MODAL_FILE', payload: filePath })
  }, [dispatch])

  return (
    <div className="overview-tab">
      {/* Feedback banner */}
      {feedback && (
        <div style={{
          padding: '8px 16px', marginBottom: '12px', borderRadius: '6px',
          background: feedback.includes('失败') || feedback.includes('错误') ? '#fef2f2' : '#f0fdf4',
          color: feedback.includes('失败') || feedback.includes('错误') ? '#dc2626' : '#16a34a',
          fontSize: '13px', border: '1px solid ' + (feedback.includes('失败') ? '#fecaca' : '#bbf7d0')
        }}>
          {feedback}
        </div>
      )}

      {/* Stats + Actions bar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'stretch' }}>
        <div style={{
          flex: 1, display: 'flex', gap: '10px', padding: '12px 16px',
          background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb',
        }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#1f2937' }}>
              {state.repoStatus === true ? '✓' : '—'}
            </div>
            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{t.overview.repo}</div>
          </div>
          <div style={{ width: '1px', background: '#e5e7eb' }} />
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '22px', fontWeight: 700, color: stats.A > 0 || stats.M > 0 || stats.D > 0 ? '#d97706' : '#16a34a' }}>
              {statusItems.length}
            </div>
            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{t.overview.changes}</div>
          </div>
          <div style={{ width: '1px', background: '#e5e7eb' }} />
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#1f2937' }}>{state.fileTree.length}</div>
            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{t.overview.files}</div>
          </div>
          {statusItems.length > 0 && (
            <>
              <div style={{ width: '1px', background: '#e5e7eb' }} />
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
                {stats.A > 0 && <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>+{stats.A} {t.overview.added}</span>}
                {stats.M > 0 && <span style={{ fontSize: '12px', color: '#d97706', fontWeight: 600 }}>~{stats.M} {t.overview.modified}</span>}
                {stats.D > 0 && <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>-{stats.D} {t.overview.deleted}</span>}
              </div>
            </>
          )}
        </div>

        {/* 操作按钮 */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
          <button onClick={onGetStatus}>{t.overview.getStatus}</button>
          <button onClick={onUpdate}>{t.overview.update}</button>
          <button onClick={onRepoInfo}>{t.overview.info}</button>
          <button onClick={() => { if (state.projectPath) window.electronAPI.openFolder(state.projectPath) }}>
            {t.overview.openFolder}
          </button>
          <button
            className="primary-button"
            onClick={openCommitPanel}
            disabled={statusItems.length === 0}
            style={{ opacity: statusItems.length > 0 ? 1 : 0.4 }}
          >
            {t.overview.commitChanges}
          </button>
        </div>
      </div>

      {/* Diff 统计条 */}
      {diffSummary && diffSummary.files.length > 0 && (
        <div style={{
          display: 'flex', gap: '16px', marginBottom: '12px', alignItems: 'center',
          padding: '8px 16px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e5e7eb',
          fontSize: '13px',
        }}>
          <span style={{ fontWeight: 600, color: '#374151' }}>{t.overview.diffStats}</span>
          <span style={{ color: '#16a34a', fontWeight: 600 }}>+{diffSummary.totalAdded} {t.overview.lines}</span>
          <span style={{ color: '#dc2626', fontWeight: 600 }}>-{diffSummary.totalRemoved} {t.overview.lines}</span>
          <span style={{ color: '#6b7280' }}>({diffSummary.files.length} {t.overview.files_lc})</span>
        </div>
      )}

      {/* Git 同步状态栏 */}
      <div style={{
        display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center',
        padding: '10px 16px', background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb',
      }}>
        {state.gitSyncStatus?.connected ? (
          <>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#2563eb' }}>Git</span>
            <span style={{
              fontSize: '11px', color: '#6b7280', fontFamily: 'Consolas, monospace',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px',
            }} title={state.gitSyncStatus.remoteUrl}>
              {state.gitSyncStatus.remoteUrl}
            </span>
            <span style={{ fontSize: '11px', color: '#9ca3af' }}>({state.gitSyncStatus.branch})</span>
            {(state.gitSyncStatus.ahead > 0 || state.gitSyncStatus.behind > 0) && (
              <span style={{ fontSize: '12px', color: '#6b7280' }}>
                {state.gitSyncStatus.ahead > 0 && <span style={{ color: '#2563eb' }}>↑{state.gitSyncStatus.ahead}</span>}
                {state.gitSyncStatus.behind > 0 && <span style={{ color: '#d97706' }}> ↓{state.gitSyncStatus.behind}</span>}
              </span>
            )}
            <div style={{ flex: 1 }} />
            {state.gitProgress && (
              <span style={{ fontSize: '12px', color: '#d97706' }}>{state.gitProgress}</span>
            )}
            <button
              style={{ fontSize: '12px', padding: '3px 12px' }}
              onClick={() => gitPull(gitAuth.username, gitAuth.token)}
              disabled={state.isLoading}
            >
              Pull
            </button>
            <button
              className="primary-button"
              style={{ fontSize: '12px', padding: '3px 12px' }}
              disabled={state.isLoading}
              onClick={() => {
                const msg = pushMsg || state.commitMessage || t.overview.dbhtSync
                gitPush(msg, gitAuth.username, gitAuth.token)
              }}
            >
              Push
            </button>
          </>
        ) : (
          <>
            <span style={{ fontSize: '13px', color: '#9ca3af' }}>{t.overview.noRemote}</span>
            <div style={{ flex: 1 }} />
            <button
              style={{ fontSize: '12px', padding: '3px 12px' }}
              onClick={() => dispatch({ type: 'SET_SHOW_GIT_REMOTE_MODAL', payload: true })}
            >
              {t.overview.connectRemote}
            </button>
          </>
        )}
      </div>

      {/* 状态文件列表 — 类似文件页签风格 */}
      <div style={{
        border: '1px solid #e5e7eb', borderRadius: '8px', background: '#fff',
        overflow: 'auto', maxHeight: 'calc(100vh - 250px)',
      }}>
        {statusItems.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
            {state.statusLines.length === 0
              ? t.overview.clickGetStatus
              : t.overview.noChanges}
          </div>
        ) : (
          Object.entries(groups).map(([dir, files]) => (
            <div key={dir || '__root__'}>
              {/* 目录头 */}
              {dir && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '4px 12px', background: '#f0f1f3',
                  borderBottom: '1px solid #e5e7eb',
                  position: 'sticky', top: 0, zIndex: 1,
                }}>
                  <span style={{ fontSize: '12px' }}>📁</span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', letterSpacing: '0.02em' }}>{dir}/</span>
                  <span style={{ fontSize: '10px', color: '#9ca3af', marginLeft: '4px' }}>({files.length})</span>
                </div>
              )}
              {/* 文件行 */}
              {files.map(file => {
                const status = STATUS_MAP[file.stateChar] || { text: file.stateChar, color: '#6b7280' }
                const fileName = file.path.split('/').pop() || file.path
                const { icon, color } = getFileIcon(fileName)

                return (
                  <div
                    key={file.path}
                    className="tree-row"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '4px 12px',
                      borderBottom: '1px solid #f3f4f6',
                      cursor: 'default', fontSize: '13px',
                    }}
                  >
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
                    }}>{fileName}</span>
                    {!dir && (
                      <span style={{ fontSize: '10px', color: '#9ca3af', fontFamily: 'Consolas, monospace' }}>
                        {file.path}
                      </span>
                    )}
                    <span style={{
                      fontSize: '10px', fontWeight: 600, color: status.color,
                      padding: '0 5px', borderRadius: '3px', lineHeight: '16px',
                      background: `${status.color}12`, flexShrink: 0,
                    }}>{status.text}</span>
                    {(file.stateChar === 'A' || file.stateChar === 'M') && (
                      <button
                        onClick={() => openDiff(file.path)}
                        className="tree-action-btn"
                      >Diff</button>
                    )}
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>

      {/* 仓库信息 */}
      {state.repositoryInfo && (
        <div style={{
          marginTop: '12px', padding: '12px 16px',
          background: '#f8fafc', borderRadius: '8px',
          border: '1px solid #e5e7eb',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontWeight: 600, fontSize: '13px', color: '#374151' }}>{t.overview.repoInfo}</span>
            <button
              className="tree-action-btn"
              onClick={() => dispatch({ type: 'SET_REPOSITORY_INFO', payload: '' })}
            >{t.overview.close}</button>
          </div>
          <pre style={{ fontSize: '12px', lineHeight: '1.6', margin: 0, color: '#4b5563' }}>{state.repositoryInfo}</pre>
        </div>
      )}
    </div>
  )
}
