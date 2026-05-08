import { useAppState } from '../../context/AppContext'
import { useGit } from '../../hooks/useGit'
import { useI18n } from '../../i18n'

export default function ConflictModal() {
  const [state] = useAppState()
  const { resolveConflict, resolveAllConflicts } = useGit()
  const { t } = useI18n()

  if (state.gitConflicts.length === 0) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{t.conflict.title} ({state.gitConflicts.length} {t.conflict.conflictCount})</h3>
        </div>
        <div className="modal-body" style={{ padding: '16px' }}>
          <div style={{
            padding: '10px 14px', background: '#fef2f2', borderRadius: '8px',
            border: '1px solid #fecaca', fontSize: '13px', color: '#991b1b',
            marginBottom: '16px', lineHeight: '1.5',
          }}>
            {t.conflict.description}
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
                  }}>{t.conflict.conflict}</span>
                  <span style={{
                    flex: 1, fontSize: '13px', fontFamily: 'Consolas, monospace',
                    color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }} title={conflict.path}>
                    {conflict.path}
                  </span>
                  {conflict.isBinary && (
                    <span style={{ fontSize: '11px', color: '#92400e', flexShrink: 0 }}>{t.conflict.binary}</span>
                  )}
                  <button
                    className="secondary-button"
                    style={{ fontSize: '11px', padding: '3px 10px', flexShrink: 0 }}
                    onClick={() => resolveConflict(conflict.path, 'ours')}
                  >
                    {t.conflict.keepLocal}
                  </button>
                  <button
                    className="secondary-button"
                    style={{ fontSize: '11px', padding: '3px 10px', flexShrink: 0 }}
                    onClick={() => resolveConflict(conflict.path, 'theirs')}
                  >
                    {t.conflict.useRemote}
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
              {t.conflict.keepAllLocal}
            </button>
            <button
              style={{ fontSize: '12px', padding: '5px 14px' }}
              onClick={() => resolveAllConflicts('theirs')}
            >
              {t.conflict.useAllRemote}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
