import { useState, useEffect, useRef } from 'react'
import { useAppState } from '../../context/AppContext'
import { useI18n } from '../../i18n'

interface Props {
  onClose: () => void
}

type ClonePhase = 'form' | 'cloning' | 'success' | 'error'

export default function GitCloneModal({ onClose }: Props) {
  const [state, dispatch] = useAppState()
  const { t } = useI18n()
  const [remoteUrl, setRemoteUrl] = useState('')
  const [branch, setBranch] = useState('main')
  const [targetDir, setTargetDir] = useState('')
  const [folderName, setFolderName] = useState('')
  const [username, setUsername] = useState('')
  const [token, setToken] = useState('')
  const [saveCreds, setSaveCreds] = useState(true)
  const [phase, setPhase] = useState<ClonePhase>('form')
  const [progressLines, setProgressLines] = useState<string[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const logRef = useRef<HTMLDivElement>(null)

  // Extract folder name from URL
  useEffect(() => {
    if (remoteUrl) {
      const match = remoteUrl.match(/\/([^\/]+?)(?:\.git)?$/)
      if (match) setFolderName(match[1])
    }
  }, [remoteUrl])

  // Load saved credentials
  useEffect(() => {
    const loadCreds = async () => {
      try {
        const host = new URL(remoteUrl).hostname
        const creds = await window.electronAPI.gitGetCredentials()
        if (creds[host]) {
          setUsername(creds[host].username)
          setToken(creds[host].token)
        }
      } catch { /* invalid URL */ }
    }
    if (remoteUrl.includes('://')) loadCreds()
  }, [remoteUrl])

  // Subscribe to git progress events during cloning
  useEffect(() => {
    if (phase !== 'cloning') return
    const unsub = window.electronAPI.onGitProgress((msg: string) => {
      setProgressLines(prev => [...prev, msg])
    })
    return unsub
  }, [phase])

  // Auto-scroll progress log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [progressLines])

  const close = () => {
    if (phase === 'cloning') return // Block close during cloning
    onClose()
  }

  const selectTarget = async () => {
    const folder = await window.electronAPI.selectFolder()
    if (folder) setTargetDir(folder)
  }

  const handleClone = async () => {
    if (!remoteUrl.trim() || !targetDir.trim() || !folderName.trim()) return
    setPhase('cloning')
    setProgressLines([t.gitClone.cloningRepo])

    try {
      // Save credentials if requested
      if (saveCreds && token.trim()) {
        try {
          const host = new URL(remoteUrl).hostname
          await window.electronAPI.gitSaveCredential(host, username.trim(), token.trim())
        } catch { /* ignore */ }
      }

      const fullTargetPath = [targetDir.trim(), folderName.trim()].join('/').replace(/\\/g, '/')

      // Clone via git bridge IPC
      setProgressLines(prev => [...prev, t.gitClone.connecting])
      const result = await window.electronAPI.gitConnect(
        fullTargetPath, remoteUrl.trim(), branch.trim() || 'main',
        username.trim() || 'anonymous', token.trim() || ''
      )

      if (!result.success) {
        setPhase('error')
        setErrorMessage(result.message)
        return
      }

      setProgressLines(prev => [...prev, t.gitClone.registeringProject])

      // Register as DBHT project
      if (state.rootRepositoryPath) {
        const regResult = await window.electronAPI.registerProject(
          state.rootRepositoryPath, fullTargetPath, folderName.trim(), true
        )
        if (regResult?.success) {
          // Reload project list
          const projResult = await window.electronAPI.getProjects(state.rootRepositoryPath)
          if (projResult?.success && projResult.projects) {
            dispatch({ type: 'SET_PROJECTS', payload: projResult.projects })
          }
          setProgressLines(prev => [...prev, t.gitClone.projectCloned.replace('{name}', folderName)])
          setPhase('success')
        } else {
          setPhase('error')
          setErrorMessage(t.gitClone.cloneSuccessRegFail + (regResult?.message || '未知错误'))
        }
      } else {
        setProgressLines(prev => [...prev, t.gitClone.cloneSuccessNoRoot])
        setPhase('error')
        setErrorMessage(t.gitClone.noRootPath)
      }
    } catch (error) {
      setPhase('error')
      setErrorMessage((error as Error).message)
    }
  }

  const canClone = remoteUrl.trim() && targetDir.trim() && folderName.trim() && phase === 'form'
  const isBusy = phase === 'cloning'

  return (
    <div className="modal-overlay" onClick={close}>
      <div className="modal-content" style={{ maxWidth: '560px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{t.gitClone.title}</h3>
          {!isBusy && (
            <button className="close-button" onClick={close}>✕</button>
          )}
        </div>
        <div className="modal-body">
          <div className="project-creator">
            {/* Remote URL */}
            <div className="form-group">
              <label>{t.gitClone.repoUrl}</label>
              <input
                type="text"
                value={remoteUrl}
                onChange={e => setRemoteUrl(e.target.value)}
                placeholder="https://github.com/user/repo.git"
                style={{ fontFamily: 'Consolas, monospace', fontSize: '13px' }}
                disabled={isBusy}
                autoFocus={phase === 'form'}
              />
              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                {t.gitClone.repoUrlHint}
              </div>
            </div>

            {/* Branch */}
            <div className="form-group" style={{ marginTop: '14px' }}>
              <label>{t.gitClone.branch}</label>
              <input
                type="text"
                value={branch}
                onChange={e => setBranch(e.target.value)}
                placeholder="main"
                style={{ fontSize: '13px' }}
                disabled={isBusy}
              />
            </div>

            {/* Target directory */}
            <div className="form-group" style={{ marginTop: '14px' }}>
              <label>{t.gitClone.targetFolder}</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={targetDir}
                  onChange={e => setTargetDir(e.target.value)}
                  placeholder={t.gitClone.targetPlaceholder}
                  style={{ flex: 1, fontFamily: 'Consolas, monospace', fontSize: '13px' }}
                  disabled={isBusy}
                />
                <button onClick={selectTarget} disabled={isBusy} style={{ whiteSpace: 'nowrap' }}>{t.gitClone.browse}</button>
              </div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px', fontFamily: 'Consolas, monospace' }}>
                {targetDir || t.gitClone.pathPreview}/{folderName || t.gitClone.projectName}
              </div>
            </div>

            {/* Auth section */}
            <div style={{
              marginTop: '16px', padding: '12px 14px', background: '#f8fafc',
              borderRadius: '8px', border: '1px solid #e5e7eb',
            }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '10px' }}>
                {t.gitClone.authInfo}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder={t.gitClone.username}
                  style={{ flex: 1, fontSize: '13px' }}
                  disabled={isBusy}
                />
                <input
                  type="password"
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  placeholder="Personal Access Token"
                  style={{ flex: 1, fontFamily: 'Consolas, monospace', fontSize: '13px' }}
                  disabled={isBusy}
                />
              </div>
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="checkbox"
                  checked={saveCreds}
                  onChange={e => setSaveCreds(e.target.checked)}
                  style={{ width: '14px', height: '14px', cursor: 'pointer', accentColor: '#2563eb' }}
                  id="clone-save-creds"
                  disabled={isBusy}
                />
                <label htmlFor="clone-save-creds" style={{ cursor: 'pointer', fontSize: '12px', color: '#6b7280' }}>
                  {t.gitClone.saveCredentials}
                </label>
              </div>
            </div>

            {/* Progress log */}
            {(phase === 'cloning' || phase === 'success' || phase === 'error') && (
              <div style={{
                marginTop: '14px', borderRadius: '8px',
                border: '1px solid ' + (phase === 'error' ? '#fecaca' : phase === 'success' ? '#bbf7d0' : '#bfdbfe'),
                background: phase === 'error' ? '#fef2f2' : phase === 'success' ? '#f0fdf4' : '#f8fafc',
                overflow: 'hidden',
              }}>
                {/* Status header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 12px',
                  background: phase === 'error' ? '#fef2f2' : phase === 'success' ? '#f0fdf4' : '#eff6ff',
                  borderBottom: '1px solid ' + (phase === 'error' ? '#fecaca' : phase === 'success' ? '#bbf7d0' : '#bfdbfe'),
                  fontSize: '13px', fontWeight: 600,
                  color: phase === 'error' ? '#dc2626' : phase === 'success' ? '#16a34a' : '#2563eb',
                }}>
                  {phase === 'cloning' && (
                    <>
                      <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>&#9696;</span>
                      {' '}{t.gitClone.cloning}
                    </>
                  )}
                  {phase === 'success' && <>&#10003; {' '}{t.gitClone.cloneComplete}</>}
                  {phase === 'error' && <>&#10007; {' '}{t.gitClone.cloneFailed}</>}
                </div>
                {/* Log area */}
                <div
                  ref={logRef}
                  style={{
                    maxHeight: '180px', overflowY: 'auto', padding: '8px 12px',
                    fontSize: '12px', fontFamily: 'Consolas, monospace',
                    lineHeight: '1.7',
                  }}
                >
                  {progressLines.map((line, i) => (
                    <div key={i} style={{
                      color: i === progressLines.length - 1 && phase === 'cloning'
                        ? '#2563eb'
                        : phase === 'error' && i === progressLines.length - 1
                          ? '#dc2626'
                          : '#4b5563',
                    }}>
                      {line}
                    </div>
                  ))}
                </div>
                {/* Error detail */}
                {phase === 'error' && errorMessage && (
                  <div style={{
                    padding: '8px 12px', borderTop: '1px solid #fecaca',
                    fontSize: '12px', color: '#991b1b', background: '#fef2f2',
                  }}>
                    {errorMessage}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              {phase === 'form' && (
                <>
                  <button onClick={close}>{t.gitClone.cancel}</button>
                  <button
                    className="primary-button"
                    onClick={handleClone}
                    disabled={!canClone}
                    style={{ opacity: canClone ? 1 : 0.5 }}
                  >
                    {t.gitClone.cloneProject}
                  </button>
                </>
              )}
              {phase === 'cloning' && (
                <div style={{
                  fontSize: '12px', color: '#9ca3af', padding: '4px 0',
                  fontStyle: 'italic',
                }}>
                  {t.gitClone.doNotClose}
                </div>
              )}
              {phase === 'success' && (
                <button className="primary-button" onClick={close}>
                  {t.gitClone.done}
                </button>
              )}
              {phase === 'error' && (
                <>
                  <button onClick={close}>{t.gitClone.close}</button>
                  <button
                    className="primary-button"
                    onClick={() => {
                      setPhase('form')
                      setProgressLines([])
                      setErrorMessage('')
                    }}
                  >
                    {t.gitClone.retry}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Spinner animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
