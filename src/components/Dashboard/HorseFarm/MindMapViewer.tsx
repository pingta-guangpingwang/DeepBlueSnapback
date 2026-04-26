import { useState, useEffect } from 'react'
import { useI18n } from '../../../i18n'
import type { HorseFarmProject, MindMapData, MindMapNode } from '../../../types/horseFarm'

interface MindMapViewerProps {
  activeProject: string | null
  hfProjects: Record<string, HorseFarmProject>
}

function MindMapNodeView({ node, depth }: { node: MindMapNode; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 2)

  const statusColors: Record<string, string> = {
    completed: '#059669',
    in_progress: '#2563eb',
    pending: '#9ca3af',
    blocked: '#dc2626',
  }

  const typeIcons: Record<string, string> = {
    root: '🏠',
    module: '📁',
    task: '📋',
    file: '📄',
    concept: '💡',
  }

  return (
    <div className="hf-mindmap-node">
      <div
        className={`hf-mindmap-node-content status-${node.status}`}
        style={{ marginLeft: `${depth * 24}px` }}
        onClick={() => node.children.length > 0 && setExpanded(!expanded)}
      >
        <span className="node-expand">
          {node.children.length > 0 ? (expanded ? '▼' : '▶') : '●'}
        </span>
        <span style={{ marginRight: '4px' }}>{typeIcons[node.type] || '●'}</span>
        <span className="node-label">{node.label}</span>
        <span className="node-type">{node.type}</span>
        <div className="node-progress-mini">
          <div
            className="node-progress-mini-fill"
            style={{ width: `${node.progress}%`, background: statusColors[node.status] }}
          />
        </div>
      </div>
      {expanded && node.children.map(child => (
        <MindMapNodeView key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  )
}

export default function MindMapViewer({ activeProject, hfProjects }: MindMapViewerProps) {
  const { t } = useI18n()
  const [mindMapData, setMindMapData] = useState<MindMapData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const hfProj = activeProject ? hfProjects[activeProject] : undefined

  useEffect(() => {
    if (!hfProj) {
      setMindMapData(null)
      return
    }
    const mindmapPath = hfProj.mindmapFilePath || `${hfProj.projectPath}/.dbvs-mindmap.json`
    setLoading(true)
    setError('')
    window.electronAPI.readMindMapFile(mindmapPath)
      .then(res => {
        if (res.success && res.data) {
          setMindMapData(res.data)
        } else {
          setError(res.message || 'Failed to load')
        }
      })
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false))
  }, [activeProject, hfProj?.mindmapFilePath])

  if (!activeProject || !hfProj) {
    return (
      <div className="hf-empty-state">
        <p>{t.horseFarm.mindmapEmpty}</p>
      </div>
    )
  }

  if (loading) {
    return <div className="hf-loading"><span>🧠</span> {t.horseFarm.mindmapLoading}</div>
  }

  if (error || !mindMapData) {
    return (
      <div className="hf-empty-state">
        <p>{t.horseFarm.mindmapEmpty}</p>
      </div>
    )
  }

  return (
    <div className="hf-mindmap-container">
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: '16px' }}>
          {mindMapData.projectName} — {t.horseFarm.subTabMindmap}
        </h3>
        <span style={{ fontSize: '11px', color: '#9ca3af' }}>
          {new Date(mindMapData.generatedAt).toLocaleString('zh-CN')}
        </span>
      </div>
      <MindMapNodeView node={mindMapData.rootNode} depth={0} />
    </div>
  )
}
