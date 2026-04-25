import { useAppState } from '../../context/AppContext'
import { useGit } from '../../hooks/useGit'

export default function ConflictModal() {
  const [state] = useAppState()
  const { resolveConflict, resolveAllConflicts } = useGit()

  if (state.gitConflicts.length === 0) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>冲突解决 ({state.gitConflicts.length} 个文件冲突)</h3>
        </div>
        <div className="modal-body" style={{ padding: '16px' }}>
          <div style={{
            padding: '10px 14px', background: '#fef2f2', borderRadius: '8px',
            border: '1px solid #fecaca', fontSize: '13px', color: '#991b1b',
            marginBottom: '16px', lineHeight: '1.5',
          }}>
            拉取远程更新时检测到文件冲突。请为每个冲突文件选择保留本地版本或使用远程版本。
          </div>

          {/* Conflict file list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {state.gitConflicts.map((conflict) => {
              const fileName = conflict.path.split('/').pop()
              return (
                <div key={conflict.path} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 14px', background: '#fffbeb',
                  border: '1px solid #fde68a', borderRadius: '6px',
                }}>
                  <span style={{
                    fontSize: '10px', fontWeight: 700, color: '#fff',
                    background: '#dc2626', padding: '1px 5px', borderRadius: '3px',
                    flexShrink: 0,
                  }}>冲突</span>
                  <span style={{
                    flex: 1, fontSize: '13px', fontFamily: 'Consolas, monospace',
                    color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }} title={conflict.path}>
                    {conflict.path}
                  </span>
                  {conflict.isBinary && (
                    <span style={{ fontSize: '11px', color: '#92400e', flexShrink: 0 }}>二进制</span>
                  )}
                  <button
                    className="secondary-button"
                    style={{ fontSize: '11px', padding: '3px 10px', flexShrink: 0 }}
                    onClick={() => resolveConflict(conflict.path, 'ours')}
                  >
                    保留本地
                  </button>
                  <button
                    className="secondary-button"
                    style={{ fontSize: '11px', padding: '3px 10px', flexShrink: 0 }}
                    onClick={() => resolveConflict(conflict.path, 'theirs')}
                  >
                    使用远程
                  </button>
                </div>
              )
            })}
          </div>

          {/* Quick actions */}
          <div style={{
            display: 'flex', gap: '8px', justifyContent: 'flex-end',
            marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #e5e7eb',
          }}>
            <button
              style={{ fontSize: '12px', padding: '5px 14px' }}
              onClick={() => resolveAllConflicts('ours')}
            >
              全部保留本地
            </button>
            <button
              style={{ fontSize: '12px', padding: '5px 14px' }}
              onClick={() => resolveAllConflicts('theirs')}
            >
              全部使用远程
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
