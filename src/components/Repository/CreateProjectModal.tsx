import { useState } from 'react'
import { useAppState } from '../../context/AppContext'
import { useProjects } from '../../hooks/useProjects'

export default function CreateProjectModal() {
  const [state, dispatch] = useAppState()
  const { createProject } = useProjects()
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
          <h3>创建新项目</h3>
          <button className="close-button" onClick={close}>✕</button>
        </div>
        <div className="modal-body">
          <div className="project-creator">
            {/* 项目名称 */}
            <div className="creator-section">
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  项目名称
                  {!nameOk && tried && <span style={{ color: '#dc2626', fontSize: '14px' }}>⚠</span>}
                </label>
                <input
                  type="text"
                  value={state.newProjectName}
                  onChange={(e) => {
                    dispatch({ type: 'SET_NEW_PROJECT_NAME', payload: e.target.value })
                    if (e.target.value.trim()) setTried(false)
                  }}
                  placeholder="输入项目名称"
                  style={warnStyle(nameOk)}
                  autoFocus
                />
              </div>
            </div>

            {/* 仓库路径（自动生成） */}
            <div className="creator-section">
              <div className="form-group">
                <label>仓库路径</label>
                <div style={{
                  padding: '8px 12px', background: '#f8fafc', borderRadius: '6px',
                  border: '1px solid #e5e7eb', fontSize: '13px', color: '#374151',
                  fontFamily: 'Consolas, monospace', wordBreak: 'break-all',
                }}>
                  {state.rootRepositoryPath}/repositories/{state.newProjectName.trim() || '<名称>'}
                </div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                  版本数据存储位置，根据项目名称自动生成
                </div>
              </div>
            </div>

            {/* 客户端路径（必填） */}
            <div className="creator-section">
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  客户端路径
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
                    placeholder="选择项目工作目录..."
                    style={{ flex: 1, fontSize: '13px', fontFamily: 'Consolas, monospace', ...warnStyle(clientOk) }}
                  />
                  <button onClick={selectFolder} style={{ whiteSpace: 'nowrap' }}>浏览...</button>
                </div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                  工作副本存放位置。若文件夹名与项目名不同，将自动在其下创建项目名称子目录
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="creator-actions" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={close}>取消</button>
              <button
                className="primary-button"
                onClick={handleCreate}
              >
                创建项目
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
