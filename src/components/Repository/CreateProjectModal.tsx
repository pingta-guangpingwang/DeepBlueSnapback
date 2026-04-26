import { useState } from 'react'
import { useAppState } from '../../context/AppContext'
import { useProjects } from '../../hooks/useProjects'
import { useI18n } from '../../i18n'

export default function CreateProjectModal() {
  const [state, dispatch] = useAppState()
  const { createProject } = useProjects()
  const { t } = useI18n()
  const [clientPath, setClientPath] = useState('')
  const [tried, setTried] = useState(false)

  const nameOk = state.newProjectName.trim().length > 0
  const clientOk = clientPath.trim().length > 0

  const handleCreate = () => {
    setTried(true)
    if (!nameOk || !clientOk) return
    createProject(state.newProjectName.trim(), clientPath.trim())
  }

  const selectFolder = async () => {
    const folder = await window.electronAPI.selectFolder()
    if (folder) {
      setClientPath(folder)
      setTried(false)
    }
  }

  const close = () => {
    dispatch({ type: 'SET_SHOW_CREATE_PROJECT_MODAL', payload: false })
  }

  const warnStyle = (ok: boolean) => ({
    border: (!ok && tried) ? '1px solid #f87171' : '1px solid #d1d5db',
    borderRadius: '6px',
  })

  return (
    <div className="modal-overlay" onClick={close}>
      <div className="modal-content" style={{ maxWidth: '580px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{t.createProject.title}</h3>
          <button className="close-button" onClick={close}>✕</button>
        </div>
        <div className="modal-body">
          <div className="project-creator">
            {/* 项目名称 */}
            <div className="creator-section">
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {t.createProject.projectName}
                  {!nameOk && tried && <span style={{ color: '#dc2626', fontSize: '14px' }}>⚠</span>}
                </label>
                <input
                  type="text"
                  value={state.newProjectName}
                  onChange={(e) => {
                    dispatch({ type: 'SET_NEW_PROJECT_NAME', payload: e.target.value })
                    if (e.target.value.trim()) setTried(false)
                  }}
                  placeholder={t.createProject.namePlaceholder}
                  style={warnStyle(nameOk)}
                  autoFocus
                />
              </div>
            </div>

            {/* 仓库路径（自动生成） */}
            <div className="creator-section">
              <div className="form-group">
                <label>{t.createProject.repoPath}</label>
                <div style={{
                  padding: '8px 12px', background: '#f8fafc', borderRadius: '6px',
                  border: '1px solid #e5e7eb', fontSize: '13px', color: '#374151',
                  fontFamily: 'Consolas, monospace', wordBreak: 'break-all',
                }}>
                  {state.rootRepositoryPath}/repositories/{state.newProjectName.trim() || t.createProject.repoPathName}
                </div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                  {t.createProject.repoPathHint}
                </div>
              </div>
            </div>

            {/* 客户端路径（必填） */}
            <div className="creator-section">
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {t.createProject.clientPath}
                  {!clientOk && tried && <span style={{ color: '#dc2626', fontSize: '14px' }}>⚠</span>}
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={clientPath}
                    onChange={(e) => {
                      setClientPath(e.target.value)
                      if (e.target.value.trim()) setTried(false)
                    }}
                    placeholder={t.createProject.clientPlaceholder}
                    style={{ flex: 1, fontSize: '13px', fontFamily: 'Consolas, monospace', ...warnStyle(clientOk) }}
                  />
                  <button onClick={selectFolder} style={{ whiteSpace: 'nowrap' }}>{t.common.browse}</button>
                </div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                  {t.createProject.clientPathHint}
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="creator-actions" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={close}>{t.common.cancel}</button>
              <button
                className="primary-button"
                onClick={handleCreate}
              >
                {t.createProject.createProject}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
