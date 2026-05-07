import { useState, useEffect, useCallback } from 'react'
import { useAppState } from '../../context/AppContext'
import { useGit } from '../../hooks/useGit'
import { useI18n } from '../../i18n'

function ExternalApiSection() {
  const [running, setRunning] = useState(false)
  const [port, setPort] = useState(3281)
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const { t } = useI18n()

  useEffect(() => {
    window.electronAPI.externalApiGetConfig().then(config => {
      setPort(config.port || 3281)
      setToken(config.token || '')
    }).catch(() => {})
    window.electronAPI.externalApiStatus().then(status => {
      setRunning(status.running)
      if (status.port) setPort(status.port)
    }).catch(() => {})
  }, [])

  const handleStart = async () => {
    setLoading(true)
    setMessage('')
    await window.electronAPI.externalApiSaveConfig({ enabled: true, port, token })
    const result = await window.electronAPI.externalApiStart()
    setMessage(result.message)
    if (result.success) setRunning(true)
    setLoading(false)
  }

  const handleStop = async () => {
    setLoading(true)
    setMessage('')
    const result = await window.electronAPI.externalApiStop()
    setMessage(result.message)
    if (result.success) setRunning(false)
    setLoading(false)
  }

  const handleSave = async () => {
    const result = await window.electronAPI.externalApiSaveConfig({ enabled: running, port, token })
    setMessage(result.message)
  }

  return (
    <div className="settings-section">
      <h3>{t.settings.externalApi}</h3>
      <p style={{ color: '#6b7280', margin: '0 0 16px', fontSize: '13px' }}>
        {t.settings.externalApiDesc}
      </p>

      {running && (
        <div style={{
          padding: '10px 14px', background: '#f0fdf4', borderRadius: '6px',
          border: '1px solid #bbf7d0', marginBottom: '12px',
        }}>
          <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600, marginBottom: '4px' }}>
            {t.settings.apiRunning}
          </div>
          <code style={{ fontSize: '13px', color: '#166534', fontFamily: 'Consolas, monospace' }}>
            http://localhost:{port}/api/v1/status
          </code>
        </div>
      )}

      <div className="form-group" style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '13px' }}>{t.settings.apiPort}</label>
        <input
          type="number"
          value={port}
          onChange={e => setPort(Number(e.target.value))}
          disabled={running}
          style={{ maxWidth: '200px', fontSize: '13px' }}
          min={1024}
          max={65535}
        />
      </div>

      <div className="form-group" style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '13px' }}>{t.settings.apiToken}</label>
        <input
          type="text"
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="Bearer Token (leave empty for no auth)"
          style={{ fontSize: '13px' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {running ? (
          <button className="warning-button" onClick={handleStop} disabled={loading}>
            {loading ? t.settings.apiStopping : t.settings.apiStop}
          </button>
        ) : (
          <button onClick={handleStart} disabled={loading}>
            {loading ? t.settings.apiStarting : t.settings.apiStart}
          </button>
        )}
        <button
          onClick={handleSave}
          style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db' }}
          disabled={loading}
        >
          {t.settings.apiSave}
        </button>
      </div>

      {message && (
        <div style={{
          marginTop: '8px', padding: '6px 10px', borderRadius: '6px',
          background: message.includes('Failed') || message.includes('not') ? '#fee2e2' : '#f0fdf4',
          color: message.includes('Failed') || message.includes('not') ? '#991b1b' : '#166534',
          fontSize: '12px',
        }}>
          {message}
        </div>
      )}
    </div>
  )
}

export default function Settings() {
  const [state, dispatch] = useAppState()
  const { disconnectRemote, loadGitStatus } = useGit()
  const { t } = useI18n()
  const [authorName, setAuthorName] = useState(state.gitAuthorName)
  const [authorEmail, setAuthorEmail] = useState(state.gitAuthorEmail)
  const [autoSnapshotRunning, setAutoSnapshotRunning] = useState(false)
  const [snapshotInterval, setSnapshotInterval] = useState(15)

  useEffect(() => { setAuthorName(state.gitAuthorName) }, [state.gitAuthorName])
  useEffect(() => { setAuthorEmail(state.gitAuthorEmail) }, [state.gitAuthorEmail])

  const handleCreateRepository = async () => {
    if (!state.repoPath) {
      dispatch({ type: 'SET_MESSAGE', payload: t.settings.selectProject })
      return
    }
    dispatch({ type: 'SET_IS_LOADING', payload: true })
    const result = await window.electronAPI.initRepository(state.repoPath)
    if (result?.success) {
      dispatch({ type: 'SET_MESSAGE', payload: t.settings.repoInitSuccess })
      const isRepo = await window.electronAPI.isDBHTRepository(state.repoPath)
      dispatch({ type: 'SET_REPO_STATUS', payload: isRepo })
    } else {
      dispatch({ type: 'SET_MESSAGE', payload: t.settings.repoInitFailPrefix + (result?.message ?? '未知错误') })
    }
    dispatch({ type: 'SET_IS_LOADING', payload: false })
  }

  const handleVerify = async () => {
    if (!state.repoPath) return
    dispatch({ type: 'SET_IS_LOADING', payload: true })
    const result = await window.electronAPI.verify(state.repoPath)
    if (result?.valid) {
      dispatch({ type: 'SET_MESSAGE', payload: t.settings.verifyPassed })
    } else {
      dispatch({ type: 'SET_MESSAGE', payload: t.settings.verifyFailedPrefix + (result.errors?.join('; ') || '未知错误') })
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
        dispatch({ type: 'SET_MESSAGE', payload: t.settings.selectProjectFirst })
        return
      }
      const result = await window.electronAPI.autoSnapshotStart(state.repoPath, state.projectPath, snapshotInterval)
      if (result.success) {
        setAutoSnapshotRunning(true)
        dispatch({ type: 'SET_MESSAGE', payload: result.message })
      } else {
        dispatch({ type: 'SET_MESSAGE', payload: t.settings.startFailed + result.message })
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
        <h3>{t.settings.gitRemote}</h3>
        {state.gitSyncStatus?.connected ? (
          <div style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <div style={{
                padding: '10px 14px', background: '#f0fdf4', borderRadius: '6px',
                border: '1px solid #bbf7d0', flex: 1,
              }}>
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>{t.settings.remoteRepo}</div>
                <div style={{ fontSize: '13px', color: '#374151', fontFamily: 'Consolas, monospace', wordBreak: 'break-all' }}>
                  {state.gitSyncStatus.remoteUrl}
                </div>
              </div>
              <div style={{
                padding: '10px 14px', background: '#f0fdf4', borderRadius: '6px',
                border: '1px solid #bbf7d0', minWidth: '120px',
              }}>
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>{t.settings.branch}</div>
                <div style={{ fontSize: '13px', color: '#374151' }}>{state.gitSyncStatus.branch}</div>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '13px' }}>{t.settings.authorName}</label>
              <input
                type="text"
                value={authorName}
                onChange={e => { setAuthorName(e.target.value); dispatch({ type: 'SET_GIT_AUTHOR_NAME', payload: e.target.value }) }}
                placeholder="Your Name"
                style={{ fontSize: '13px' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px' }}>{t.settings.authorEmail}</label>
              <input
                type="text"
                value={authorEmail}
                onChange={e => { setAuthorEmail(e.target.value); dispatch({ type: 'SET_GIT_AUTHOR_EMAIL', payload: e.target.value }) }}
                placeholder="you@example.com"
                style={{ fontSize: '13px' }}
              />
            </div>
            <button className="warning-button" onClick={handleDisconnect} disabled={state.isLoading}>
              {t.settings.disconnect}
            </button>
          </div>
        ) : (
          <div style={{ marginTop: '12px' }}>
            <p style={{ color: '#6b7280', margin: '0 0 16px', fontSize: '13px' }}>
              {t.settings.noRemote}
            </p>
            <button onClick={() => dispatch({ type: 'SET_SHOW_GIT_REMOTE_MODAL', payload: true })}>
              {t.settings.connectRemote}
            </button>
          </div>
        )}
      </div>

      <div className="settings-section">
        <h3>{t.settings.initRepo}</h3>
        <p style={{ color: '#6b7280', margin: '0 0 16px', fontSize: '13px' }}>
          {t.settings.initRepoDesc}
        </p>
        <button onClick={handleCreateRepository}>{t.settings.initRepoBtn}</button>
      </div>

      <div className="settings-section">
        <h3>{t.settings.verify}</h3>
        <p style={{ color: '#6b7280', margin: '0 0 16px', fontSize: '13px' }}>
          {t.settings.verifyDesc}
        </p>
        <button onClick={handleVerify}>{t.settings.verifyBtn}</button>
      </div>

      <ExternalApiSection />

      <div className="settings-section">
        <h3>{t.settings.autoSnapshot}</h3>
        <p style={{ color: '#6b7280', margin: '0 0 12px', fontSize: '13px' }}>
          {t.settings.autoSnapshotDesc}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <label style={{ fontSize: '13px', color: '#374151' }}>{t.settings.interval}</label>
          <select
            value={snapshotInterval}
            onChange={e => setSnapshotInterval(Number(e.target.value))}
            disabled={autoSnapshotRunning}
            style={{ fontSize: '13px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
          >
            <option value={15}>{`15 ${t.settings.minutes}`}</option>
            <option value={30}>{`30 ${t.settings.minutes}`}</option>
            <option value={60}>{`60 ${t.settings.minutes}`}</option>
          </select>
          <button
            className={autoSnapshotRunning ? 'warning-button' : 'primary-button'}
            onClick={handleAutoSnapshotToggle}
          >
            {autoSnapshotRunning ? t.settings.stopSnapshot : t.settings.startSnapshot}
          </button>
        </div>
        {autoSnapshotRunning && (
          <div style={{ padding: '8px 12px', background: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe', fontSize: '13px', color: '#1e40af' }}>
            {t.settings.snapshotRunning.replace('{interval}', String(snapshotInterval))}
          </div>
        )}
      </div>
    </div>
  )
}
