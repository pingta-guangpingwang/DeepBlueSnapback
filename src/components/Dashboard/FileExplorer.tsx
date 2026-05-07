import { useState, useEffect, useCallback } from 'react'
import { useAppState } from '../../context/AppContext'
import { useFiles } from '../../hooks/useFiles'
import { useI18n } from '../../i18n'

interface TreeNode {
  name: string
  path: string
  isDirectory: boolean
  children: TreeNode[]
}

interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
}

// 文件类型图标和颜色映射
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
    toml: { icon: 'TM', color: '#9c4221' },
    md: { icon: 'MD', color: '#083fa1' }, txt: { icon: 'TX', color: '#6b7280' },
    pdf: { icon: 'PD', color: '#da291c' },
    png: { icon: 'PN', color: '#a855f7' }, jpg: { icon: 'JP', color: '#a855f7' },
    jpeg: { icon: 'JP', color: '#a855f7' }, gif: { icon: 'GI', color: '#a855f7' },
    svg: { icon: 'SV', color: '#ffb13b' }, ico: { icon: 'IC', color: '#a855f7' },
    sql: { icon: 'SQ', color: '#336791' },
    sh: { icon: 'SH', color: '#4eaa25' }, bat: { icon: 'BT', color: '#4eaa25' },
    zip: { icon: 'ZI', color: '#f59e0b' }, env: { icon: 'EN', color: '#ecd53f' },
    lock: { icon: 'LK', color: '#6b7280' },
  }
  return map[ext] || { icon: ext ? ext.substring(0, 2).toUpperCase() : '?', color: '#9ca3af' }
}

function buildTree(files: FileEntry[]): TreeNode[] {
  const root: TreeNode[] = []
  for (const file of files) {
    const parts = file.path.split('/')
    let current = root
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1
      const isDir = isLast ? file.isDirectory : true
      const existingNode = current.find(n => n.name === part)
      if (existingNode) {
        current = existingNode.children
      } else {
        const newNode: TreeNode = {
          name: part,
          path: parts.slice(0, i + 1).join('/'),
          isDirectory: isDir,
          children: [],
        }
        current.push(newNode)
        current.sort((a, b) => {
          if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
          return a.name.localeCompare(b.name)
        })
        current = newNode.children
      }
    }
  }
  return root
}

function TreeNodeView({
  node,
  depth,
  expandedDirs,
  toggleDir,
  onEdit,
  onDelete,
}: {
  node: TreeNode
  depth: number
  expandedDirs: Set<string>
  toggleDir: (path: string) => void
  onEdit: (path: string) => void
  onDelete: (name: string) => void
}) {
  const { t } = useI18n()
  const isExpanded = expandedDirs.has(node.path)
  const paddingLeft = 14 + depth * 22

  if (node.isDirectory) {
    return (
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '4px 10px',
            paddingLeft: `${paddingLeft}px`,
            cursor: 'pointer',
            userSelect: 'none',
            borderRadius: '4px',
          }}
          className="tree-row"
          onClick={() => toggleDir(node.path)}
        >
          <span style={{
            fontSize: '10px', marginRight: '5px', color: '#9ca3af',
            display: 'inline-block',
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s', width: '10px',
          }}>▶</span>
          <span style={{ fontSize: '15px', marginRight: '6px' }}>
            {isExpanded ? '📂' : '📁'}
          </span>
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#1f2937' }}>{node.name}</span>
          <span style={{ fontSize: '11px', color: '#9ca3af', marginLeft: '8px' }}>
            {node.children.length}
          </span>
        </div>
        {isExpanded && node.children.map(child => (
          <TreeNodeView
            key={child.path}
            node={child}
            depth={depth + 1}
            expandedDirs={expandedDirs}
            toggleDir={toggleDir}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    )
  }

  const { icon, color } = getFileIcon(node.name)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '4px 10px',
        paddingLeft: `${paddingLeft + 16}px`,
        borderRadius: '4px',
      }}
      className="tree-row"
    >
      <span style={{
        fontSize: '9px', fontWeight: 700, color: '#fff',
        background: color, padding: '1px 4px', borderRadius: '3px',
        marginRight: '8px', width: '20px', textAlign: 'center',
        fontFamily: 'Consolas, Monaco, monospace', lineHeight: '14px',
        flexShrink: 0,
      }}>{icon}</span>
      <span style={{ fontSize: '13px', color: '#374151', flex: 1 }}>{node.name}</span>
      <div className="tree-row-actions">
        <button className="tree-action-btn" onClick={() => onEdit(node.path)}>{t.fileExplorer.edit}</button>
        <button className="tree-action-btn tree-action-delete" onClick={() => onDelete(node.path)}>{t.fileExplorer.delete}</button>
      </div>
    </div>
  )
}

export default function FileExplorer() {
  const [state, dispatch] = useAppState()
  const { loadManagedFiles, createNewFile, startEditingFile, saveFile, deleteFile } = useFiles()
  const { t } = useI18n()
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
  const [fileEntries, setFileEntries] = useState<FileEntry[]>([])
  const [treeLoading, setTreeLoading] = useState(false)

  // 加载完整文件树（含目录）
  const loadFileTree = useCallback(async () => {
    if (!state.projectPath) return
    setTreeLoading(true)
    try {
      const result = await window.electronAPI.listFiles(state.projectPath)
      if (result?.success && result.files) {
        // 同时更新 managedFiles 供全局使用
        const fileNames = result.files.filter(f => !f.isDirectory).map(f => f.path)
        dispatch({ type: 'SET_MANAGED_FILES', payload: fileNames })
        setFileEntries(result.files)
      }
      if (result?.errors && result.errors.length > 0) {
        console.warn('Some directories could not be read:', result.errors)
      }
    } catch (e) {
      console.error('Failed to load file tree:', e)
    } finally {
      setTreeLoading(false)
    }
  }, [state.projectPath, dispatch])

  // Auto-load on mount
  useEffect(() => {
    if (state.projectPath) {
      loadFileTree()
    }
  }, [state.projectPath])

  const toggleDir = (dirPath: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev)
      if (next.has(dirPath)) next.delete(dirPath)
      else next.add(dirPath)
      return next
    })
  }

  const handleDeleteFile = (filePath: string) => {
    const fileName = filePath.split('/').pop() || filePath
    if (!confirm(t.fileExplorer.confirmDelete.replace('{name}', fileName))) return
    deleteFile(fileName)
    // Refresh tree after delete
    setTimeout(loadFileTree, 300)
  }

  const handleEdit = (filePath: string) => {
    const fileName = filePath.split('/').pop() || filePath
    startEditingFile(fileName)
  }

  const tree = buildTree(fileEntries)

  return (
    <div className="files-tab">
      <div className="file-actions">
        <div className="file-action-group">
          <input
            type="text"
            placeholder={t.fileExplorer.newFileName}
            value={state.newFileName}
            onChange={(e) => dispatch({ type: 'SET_NEW_FILE_NAME', payload: e.target.value })}
          />
          <button onClick={async () => {
            if (!state.newFileName.trim()) {
              dispatch({ type: 'SET_MESSAGE', payload: t.fileExplorer.enterName })
              return
            }
            await createNewFile(state.newFileName)
            await loadFileTree()
          }}>{t.fileExplorer.createFile}</button>
        </div>
        <button onClick={loadFileTree} disabled={treeLoading}>
          {treeLoading ? t.fileExplorer.refreshing : t.fileExplorer.refreshList}
        </button>
      </div>

      {state.editingFile ? (
        <div className="file-editor">
          <div className="editor-header">
            <h3>{t.fileExplorer.editingFile} {state.editingFile}</h3>
            <div className="editor-actions">
              <button onClick={() => { saveFile(); setTimeout(loadFileTree, 500) }}>{t.fileExplorer.save}</button>
              <button onClick={() => dispatch({ type: 'SET_EDITING_FILE', payload: null })}>{t.common.cancel}</button>
            </div>
          </div>
          <textarea
            value={state.fileContent}
            onChange={(e) => dispatch({ type: 'SET_FILE_CONTENT', payload: e.target.value })}
            placeholder={t.fileExplorer.contentPlaceholder}
          />
        </div>
      ) : (
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          background: '#fff',
          overflow: 'auto',
          maxHeight: 'calc(100vh - 260px)',
        }}>
          {tree.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>
              {t.fileExplorer.noFiles}
            </div>
          ) : (
            tree.map(node => (
              <TreeNodeView
                key={node.path}
                node={node}
                depth={0}
                expandedDirs={expandedDirs}
                toggleDir={toggleDir}
                onEdit={handleEdit}
                onDelete={handleDeleteFile}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}
