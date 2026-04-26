import { useState, useEffect } from 'react'
import { useAppState } from '../../context/AppContext'
import { useGit } from '../../hooks/useGit'
import { useI18n } from '../../i18n'

export default function GitRemoteModal() {
  const [state, dispatch] = useAppState()
  const { connectRemote, loadCredentials, saveCredential } = useGit()
  const { t } = useI18n()
  const [remoteUrl, setRemoteUrl] = useState('')
  const [branch, setBranch] = useState('main')
  const [username, setUsername] = useState('')
  const [token, setToken] = useState('')
  const [saveCreds, setSaveCreds] = useState(true)
  const [loading, setLoading] = useState(false)

  const close = () => dispatch({ type: 'SET_SHOW_GIT_REMOTE_MODAL', payload: false })

  // Load saved credentials when URL changes
  useEffect(() => {
    const loadCreds = async () => {
      try {
        const host = new URL(remoteUrl).hostname
        const creds = await loadCredentials()
        if (creds[host]) {
          setUsername(creds[host].username)
          setToken(creds[host].token)
        }
      } catch { /* invalid URL */ }
    }
    if (remoteUrl.includes('://')) loadCreds()
  }, [remoteUrl])

  const handleConnect = async () => {
    if (!remoteUrl.trim() || !username.trim() || !token.trim()) return
    setLoading(true)
    try {
      if (saveCreds) {
        try {
          const host = new URL(remoteUrl).hostname
          await saveCredential(host, username, token)
        } catch { /* ignore save failure */ }
      }
      await connectRemote(remoteUrl.trim(), branch.trim() || 'main', username.trim(), token.trim())
    } finally {
      setLoading(false)
    }
  }

  const canConnect = remoteUrl.trim() && username.trim() && token.trim() && !loading

  return (
    <div className="modal-overlay" onClick={close}>
      <div className="modal-content" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{t.gitRemote.title}</h3>
          <button className="close-button" onClick={close}>✕</button>
        </div>
        <div className="modal-body">
          <div className="project-creator">
            <div className="form-group">
              <label>{t.gitRemote.remoteUrl}</label>
              <input
                type="text"
                value={remoteUrl}
                onChange={e => setRemoteUrl(e.target.value)}
                placeholder="https://github.com/user/repo.git"
                style={{ fontFamily: 'Consolas, monospace', fontSize: '13px' }}
                autoFocus
              />
              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                {t.gitRemote.remoteHint}
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label>{t.gitRemote.branch}</label>
              <input
                type="text"
                value={branch}
                onChange={e => setBranch(e.target.value)}
                placeholder="main"
                style={{ fontSize: '13px' }}
              />
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label>{t.gitRemote.username}</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder={t.gitRemote.usernamePlaceholder}
                style={{ fontSize: '13px' }}
              />
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label>{t.gitRemote.password}</label>
              <input
                type="password"
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder={t.gitRemote.passwordPlaceholder}
                style={{ fontFamily: 'Consolas, monospace', fontSize: '13px' }}
              />
              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                GitHub: Settings → Developer settings → Personal access tokens
              </div>
            </div>

            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={saveCreds}
                onChange={e => setSaveCreds(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#2563eb' }}
                id="save-creds"
              />
              <label htmlFor="save-creds" style={{ cursor: 'pointer', fontSize: '13px', color: '#374151' }}>
                {t.gitRemote.saveCredentials}
              </label>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={close}>{t.common.cancel}</button>
              <button
                className="primary-button"
                onClick={handleConnect}
                disabled={!canConnect}
                style={{ opacity: canConnect ? 1 : 0.5 }}
              >
                {loading ? t.gitRemote.connecting : t.gitRemote.connect}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
