import { useState, useEffect, useCallback } from 'react'
import { useAppState } from '../../context/AppContext'
import { useGit } from '../../hooks/useGit'

export default function Settings() {
  const [state, dispatch] = useAppState()
  const { disconnectRemote, loadGitStatus } = useGit()
  const [authorName, setAuthorName] = useState(state.gitAuthorName)
  const [authorEmail, setAuthorEmail] = useState(state.gitAuthorEmail)
  const [autoSnapshotRunning, setAutoSnapshotRunning] = useState(false)
  const [snapshotInterval, setSnapshotInterval] = useState(15)

  useEffect(() => { setAuthorName(state.gitAuthorName) }, [state.gitAuthorName])
  useEffect(() => { setAuthorEmail(state.gitAuthorEmail) }, [state.gitAuthorEmail])

  const handleCreateRepository = async () => {
    if (!state.repoPath) {
      dispatch({ type: 'SET_MESSAGE', payload: '请先选择项目目录。' })
      return
    }
    dispatch({ type: 'SET_IS_LOADING', payload: true })
    const result = await window.electronAPI.initRepository(state.repoPath)
    if (result?.success) {
      dispatch({ type: 'SET_MESSAGE', payload: '仓库初始化成功！' })
      const isRepo = await window.electronAPI.isDBVSRepository(state.repoPath)
      dispatch({ type: 'SET_REPO_STATUS', payload: isRepo })
    } else {
      dispatch({ type: 'SET_MESSAGE', payload: '仓库初始化失败：' + (result?.message ?? '未知错误') })
    }
    dispatch({ type: 'SET_IS_LOADING', payload: false })
  }

  const handleVerify = async () => {
    if (!state.repoPath) return
    dispatch({ type: 'SET_IS_LOADING', payload: true })
    const result = await window.electronAPI.verify(state.repoPath)
    if (result?.valid) {
      dispatch({ type: 'SET_MESSAGE', payload: '仓库验证通过，数据完整。' })
    } else {
      dispatch({ type: 'SET_MESSAGE', payload: '仓库验证失败：' + (result.errors?.join('; ') || '未知错误') })
    }
    dispatch({ type: 'SET_IS_LOADING', payload: false })
  }

  const handleDisconnect = async () => {
    dispatch({ type: 'SET_IS_LOADING', payload: true })
    await disconnectRemote()
    dispatch({ type: 'SET_IS_LOADING', payload: false })
  }

  const handleAutoSnapshotToggle = async () => {
    if (autoSnapshotRunning) {
      const result = await window.electronAPI.autoSnapshotStop()
      setAutoSnapshotRunning(false)
      dispatch({ type: 'SET_MESSAGE', payload: result.message })
    } else {
      if (!state.repoPath || !state.projectPath) {
        dispatch({ type: 'SET_MESSAGE', payload: '请先选择项目' })
        return
      }
      const result = await window.electronAPI.autoSnapshotStart(state.repoPath, state.projectPath, snapshotInterval)
      if (result.success) {
        setAutoSnapshotRunning(true)
        dispatch({ type: 'SET_MESSAGE', payload: result.message })
      } else {
        dispatch({ type: 'SET_MESSAGE', payload: '启动失败：' + result.message })
      }
    }
  }

  // 监听自动快照结果
  useEffect(() => {
    const unsub = window.electronAPI.onAutoSnapshotResult((result) => {
      dispatch({ type: 'SET_MESSAGE', payload: result.success ? `自动快照: ${result.message}` : `自动快照失败: ${result.message}` })
    })
    return unsub
  }, [dispatch])

  return (
    <div className="settings-tab">
      <div className="settings-section">
        <h3>Git 远程仓库</h3>
        {state.gitSyncStatus?.connected ? (
          <div style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <div style={{
                padding: '10px 14px', background: '#f0fdf4', borderRadius: '6px',
                border: '1px solid #bbf7d0', flex: 1,
              }}>
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>远程仓库</div>
                <div style={{ fontSize: '13px', color: '#374151', fontFamily: 'Consolas, monospace', wordBreak: 'break-all' }}>
                  {state.gitSyncStatus.remoteUrl}
                </div>
              </div>
              <div style={{
                padding: '10px 14px', background: '#f0fdf4', borderRadius: '6px',
                border: '1px solid #bbf7d0', minWidth: '120px',
              }}>
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>分支</div>
                <div style={{ fontSize: '13px', color: '#374151' }}>{state.gitSyncStatus.branch}</div>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '13px' }}>作者名称</label>
              <input
                type="text"
                value={authorName}
                onChange={e => { setAuthorName(e.target.value); dispatch({ type: 'SET_GIT_AUTHOR_NAME', payload: e.target.value }) }}
                placeholder="Your Name"
                style={{ fontSize: '13px' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px' }}>作者邮箱</label>
              <input
                type="text"
                value={authorEmail}
                onChange={e => { setAuthorEmail(e.target.value); dispatch({ type: 'SET_GIT_AUTHOR_EMAIL', payload: e.target.value }) }}
                placeholder="you@example.com"
                style={{ fontSize: '13px' }}
              />
            </div>
            <button className="warning-button" onClick={handleDisconnect} disabled={state.isLoading}>
              断开远程仓库
            </button>
          </div>
        ) : (
          <div style={{ marginTop: '12px' }}>
            <p style={{ color: '#6b7280', margin: '0 0 16px', fontSize: '13px' }}>
              尚未连接远程 Git 仓库。连接后可进行 Pull / Push 操作。
            </p>
            <button onClick={() => dispatch({ type: 'SET_SHOW_GIT_REMOTE_MODAL', payload: true })}>
              连接远程仓库
            </button>
          </div>
        )}
      </div>

      <div className="settings-section">
        <h3>初始化仓库</h3>
        <p style={{ color: '#6b7280', margin: '0 0 16px', fontSize: '13px' }}>
          将当前项目目录初始化为 DBVS 仓库。
        </p>
        <button onClick={handleCreateRepository}>初始化仓库</button>
      </div>

      <div className="settings-section">
        <h3>数据验证</h3>
        <p style={{ color: '#6b7280', margin: '0 0 16px', fontSize: '13px' }}>
          检查仓库数据完整性，验证所有文件快照是否存在。
        </p>
        <button onClick={handleVerify}>验证仓库</button>
      </div>

      <div className="settings-section">
        <h3>自动快照</h3>
        <p style={{ color: '#6b7280', margin: '0 0 12px', fontSize: '13px' }}>
          定时自动提交当前工作副本的变更，适用于长时间工作场景。自动快照仅在检测到变更时才会提交。
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <label style={{ fontSize: '13px', color: '#374151' }}>间隔：</label>
          <select
            value={snapshotInterval}
            onChange={e => setSnapshotInterval(Number(e.target.value))}
            disabled={autoSnapshotRunning}
            style={{ fontSize: '13px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
          >
            <option value={15}>15 分钟</option>
            <option value={30}>30 分钟</option>
            <option value={60}>60 分钟</option>
          </select>
          <button
            className={autoSnapshotRunning ? 'warning-button' : 'primary-button'}
            onClick={handleAutoSnapshotToggle}
          >
            {autoSnapshotRunning ? '停止自动快照' : '启动自动快照'}
          </button>
        </div>
        {autoSnapshotRunning && (
          <div style={{ padding: '8px 12px', background: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe', fontSize: '13px', color: '#1e40af' }}>
            自动快照运行中，间隔 {snapshotInterval} 分钟
          </div>
        )}
      </div>

      <div className="settings-section">
        <h3>版本回滚</h3>
        <p style={{ color: '#6b7280', margin: '0 0 8px', fontSize: '13px' }}>
          请前往"历史"标签页，点击对应版本的"回滚到此版本"按钮进行回滚。
        </p>
      </div>

      <div className="settings-section">
        <h3>全局设置</h3>
        <p style={{ color: '#6b7280', margin: '0 0 8px', fontSize: '13px' }}>
          Windows 右键菜单等全局配置请在仓库管理页面的"设置"按钮中管理。
        </p>
        <button onClick={() => dispatch({ type: 'SET_CURRENT_VIEW', payload: 'repositories' })}>
          前往全局设置
        </button>
      </div>
    </div>
  )
}
