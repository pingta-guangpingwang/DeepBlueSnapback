import { useState, useEffect } from 'react'
import { useAppState } from '../../context/AppContext'

interface Props {
  folderPath: string
  warning?: string
  onConfirm: (projectName: string, initWithCommit: boolean) => void
  onCancel: () => void
}

export default function ImportProjectModal({ folderPath, warning, onConfirm, onCancel }: Props) {
  const [state] = useAppState()
  const [projectName, setProjectName] = useState('')
  const [initWithCommit, setInitWithCommit] = useState(true)
  const [fileCount, setFileCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  // 从文件夹路径提取默认名称
  useEffect(() => {
    if (folderPath) {
      window.electronAPI.pathBasename(folderPath).then(result => {
        setProjectName(result.result)
      })
    }
  }, [folderPath])

  // 统计文件数
  useEffect(() => {
    if (folderPath) {
      window.electronAPI.getFileTree(folderPath).then(result => {
        if (result.success && result.files) {
          setFileCount(result.files.length)
        }
      }).catch(() => {
        setFileCount(0)
      })
    }
  }, [folderPath])

  const handleConfirm = async () => {
    if (!projectName.trim()) return
    setLoading(true)
    await onConfirm(projectName.trim(), initWithCommit)
    setLoading(false)
  }

  const canConfirm = projectName.trim().length > 0 && !loading

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>导入新项目</h3>
          <button className="close-button" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body">
          {/* 重新导入警告 */}
          {warning && (
            <div style={{
              padding: '10px 14px', background: '#fffbeb', borderRadius: '8px',
              border: '1px solid #fde68a', marginBottom: '16px',
              fontSize: '13px', color: '#92400e', lineHeight: '1.5',
            }}>
              {warning}
            </div>
          )}
          {/* 源文件夹信息 */}
          <div style={{
            padding: '12px 14px', background: '#f8fafc', borderRadius: '8px',
            border: '1px solid #e5e7eb', marginBottom: '16px',
          }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>源文件夹</div>
            <div style={{
              fontSize: '13px', color: '#1f2937', fontFamily: 'Consolas, monospace',
              wordBreak: 'break-all', fontWeight: 500,
            }}>
              {folderPath}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>
              {fileCount !== null ? `检测到 ${fileCount} 个文件` : '正在扫描文件...'}
            </div>
          </div>

          {/* 仓库名称 */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
              仓库名称
            </label>
            <input
              type="text"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              placeholder="输入仓库名称"
              autoFocus
              style={{
                width: '100%', padding: '8px 12px', fontSize: '13px',
                borderRadius: '6px', border: '1px solid #d1d5db',
                fontFamily: 'Consolas, monospace',
              }}
            />
            <div style={{
              marginTop: '6px', fontSize: '12px', color: '#9ca3af',
              fontFamily: 'Consolas, monospace',
            }}>
              {state.rootRepositoryPath}/repositories/{projectName || '<名称>'}
            </div>
          </div>

          {/* 是否立刻提交初始版本 */}
          <div style={{
            padding: '10px 14px', background: '#f0fdf4', borderRadius: '8px',
            border: '1px solid #bbf7d0', marginBottom: '16px',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <input
              type="checkbox"
              checked={initWithCommit}
              onChange={e => setInitWithCommit(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#16a34a' }}
              id="init-commit-check"
            />
            <label htmlFor="init-commit-check" style={{ cursor: 'pointer', flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#166534' }}>立刻提交初始版本</div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                勾选后，导入时将自动扫描文件夹内所有文件并创建初始提交版本
              </div>
            </label>
          </div>

          {/* 操作说明 */}
          <div style={{
            padding: '8px 12px', background: '#fffbeb', borderRadius: '6px',
            border: '1px solid #fde68a', fontSize: '12px', color: '#92400e',
            lineHeight: '1.5', marginBottom: '16px',
          }}>
            导入后，文件夹将作为工作副本，版本数据存储在仓库的 repositories/ 目录中。
          </div>

          {/* 操作按钮 */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={onCancel} disabled={loading}>取消</button>
            <button
              className="primary-button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              style={{ opacity: canConfirm ? 1 : 0.5 }}
            >
              {loading ? '导入中...' : '确认导入'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
