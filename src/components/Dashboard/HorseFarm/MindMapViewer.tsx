import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { useI18n } from '../../../i18n'
import type { HorseFarmProject, MindMapData, MindMapNode } from '../../../types/horseFarm'

const BRANCH_COLORS = [
  '#5B6EF5', '#F5A623', '#34C759', '#FF3B30', '#007AFF',
  '#AF52DE', '#FF9500', '#00C7BE', '#FF2D55', '#5856D6',
]

const H_GAP = 80
const V_GAP = 16
const ROOT_X = 80
const ROOT_Y = 160

interface LayoutNode extends MindMapNode {
  _x: number
  _y: number
  _w: number
  _h: number
  _collapsed: boolean
  _branchColor: string
}

interface MindMapViewerProps {
  activeProject: string | null
  hfProjects: Record<string, HorseFarmProject>
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function adjustColor(hex: string, amount: number): string {
  const r = Math.max(0, Math.min(255, parseInt(hex.slice(1, 3), 16) + amount))
  const g = Math.max(0, Math.min(255, parseInt(hex.slice(3, 5), 16) + amount))
  const b = Math.max(0, Math.min(255, parseInt(hex.slice(5, 7), 16) + amount))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

const TYPE_ICONS: Record<string, string> = {
  root: '🏠',
  module: '📁',
  task: '📋',
  file: '📄',
  concept: '💡',
}

const STATUS_COLORS: Record<string, string> = {
  completed: '#34C759',
  in_progress: '#007AFF',
  pending: '#A0A8C8',
  blocked: '#FF3B30',
}

const STATUS_BG: Record<string, string> = {
  completed: 'rgba(52,199,89,0.08)',
  in_progress: 'rgba(0,122,255,0.08)',
  pending: 'rgba(160,168,200,0.06)',
  blocked: 'rgba(255,59,48,0.08)',
}

// ---- SVG Connector ----
function Connector({ x1, y1, x2, y2, color }: { x1: number; y1: number; x2: number; y2: number; color: string }) {
  const midX = (x1 + x2) / 2
  const d = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`
  return <path d={d} className="mm-connector" style={{ stroke: color }} />
}

// ---- MindMapNodeCard ----
function NodeCard({ node, isRoot, branchColor, onClickCollapse, onClickNode }: {
  node: LayoutNode
  isRoot: boolean
  branchColor: string
  onClickCollapse: (id: string) => void
  onClickNode: (id: string) => void
}) {
  if (isRoot) {
    const c = node._branchColor || '#5B6EF5'
    return (
      <div
        className="mm-node-card root-card"
        style={{
          left: node._x,
          top: node._y,
          background: `linear-gradient(135deg, ${c}, ${adjustColor(c, -30)})`,
        }}
        onClick={() => onClickNode(node.id)}
      >
        <span className="mm-node-icon">{TYPE_ICONS[node.type] || '●'}</span>
        <span className="mm-node-text">{node.label}</span>
      </div>
    )
  }

  const statusCls = node.status
  const borderColor = node._branchColor || branchColor
  const hasChildren = node.children.length > 0

  return (
    <div
      className={`mm-node-card child-card status-${statusCls}`}
      style={{
        left: node._x,
        top: node._y,
        width: node._w,
        borderColor,
        background: node.status === 'completed' ? STATUS_BG.completed
          : node.status === 'in_progress' ? STATUS_BG.in_progress
          : node.status === 'blocked' ? STATUS_BG.blocked
          : STATUS_BG.pending,
      }}
      onClick={() => onClickNode(node.id)}
    >
      {hasChildren && (
        <button
          className="mm-collapse-btn"
          style={{ left: -10, top: node._h / 2 - 8 }}
          onClick={e => { e.stopPropagation(); onClickCollapse(node.id) }}
        >
          {node._collapsed ? '+' : '−'}
        </button>
      )}
      <div className="mm-node-header">
        <span className="mm-node-icon">{TYPE_ICONS[node.type] || '●'}</span>
        <span className="mm-node-text">{node.label}</span>
      </div>
      <div className="mm-node-meta">
        <span className={`mm-status-dot ${node.status}`} style={{ background: STATUS_COLORS[node.status] }} />
        <span className="mm-status-label">{node.status}</span>
        <span className="mm-progress-label">{node.progress}%</span>
      </div>
      <div className="mm-node-progress-bar">
        <div
          className="mm-node-progress-fill"
          style={{
            width: `${node.progress}%`,
            background: STATUS_COLORS[node.status],
          }}
        />
      </div>
    </div>
  )
}

// ---- Main View ----
export default function MindMapViewer({ activeProject, hfProjects }: MindMapViewerProps) {
  const { t } = useI18n()
  const containerRef = useRef<HTMLDivElement>(null)
  const [mindMapData, setMindMapData] = useState<MindMapData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0, px: 0, py: 0 })

  const hfProj = activeProject ? hfProjects[activeProject] : undefined

  // Load mind map data
  const loadData = useCallback(() => {
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
  }, [hfProj?.projectPath, hfProj?.mindmapFilePath])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Reset view when project changes
  useEffect(() => {
    setZoom(1)
    setPanX(0)
    setPanY(0)
    setCollapsed(new Set())
  }, [activeProject])

  // Compute layout
  const layoutNodes = useMemo(() => {
    if (!mindMapData) return []
    try {
    const measureCtx = document.createElement('canvas').getContext('2d')
    if (!measureCtx) return []

    const measureNode = (node: MindMapNode, isRoot: boolean): { w: number; h: number } => {
      if (isRoot) {
        measureCtx.font = 'bold 15px -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif'
        const tw = measureCtx.measureText(node.label || '').width
        return { w: Math.max(100, tw + 60), h: 44 }
      }
      measureCtx.font = '13px -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif'
      const lines = (node.label || '').split('\n')
      const maxW = Math.min(220, Math.max(80, ...lines.map(l => measureCtx.measureText(l).width)))
      const lh = 20
      const textH = Math.max(lines.length * lh, 18)
      // header: icon + text, meta: status + progress + progress bar
      return { w: Math.max(140, maxW + 50), h: textH + 38 }
    }

    const root = mindMapData.rootNode
    const result: LayoutNode[] = []

    // Compute subtree height
    const subH = (node: MindMapNode, isRoot: boolean): number => {
      const m = measureNode(node, isRoot)
      if (collapsed.has(node.id) || node.children.length === 0) return m.h
      let total = 0
      node.children.forEach((c, i) => {
        if (i) total += V_GAP
        total += subH(c, false)
      })
      return Math.max(m.h, total)
    }

    const maxChildW = (children: MindMapNode[]): number => {
      let m = 0
      children.forEach(c => { const s = measureNode(c, false); m = Math.max(m, s.w) })
      return m || 140
    }

    // Layout a subtree
    const doLayout = (node: MindMapNode, x: number, y: number, isRoot: boolean, branchColor: string, depth: number): void => {
      const m = measureNode(node, isRoot)
      const sh = subH(node, isRoot)
      const by = y + sh / 2 - m.h / 2

      result.push({
        ...node,
        _x: x,
        _y: by,
        _w: m.w,
        _h: m.h,
        _collapsed: collapsed.has(node.id),
        _branchColor: isRoot ? branchColor : (node.type === 'root' ? BRANCH_COLORS[0] : branchColor),
      })

      if (collapsed.has(node.id) || node.children.length === 0) return

      const cx = x + m.w + H_GAP
      let cy = y
      node.children.forEach((c, i) => {
        if (i) cy += V_GAP
        const ch = subH(c, false)
        const childColor = isRoot
          ? BRANCH_COLORS[i % BRANCH_COLORS.length]
          : branchColor
        doLayout(c, cx, cy, false, childColor, depth + 1)
        cy += ch
      })
    }

    doLayout(root, ROOT_X, ROOT_Y, true, BRANCH_COLORS[0], 0)
    return result
    } catch { return [] }
  }, [mindMapData, collapsed])

  // Build connector lines
  const connectors = useMemo(() => {
    if (!mindMapData) return []
    const nodeMap = new Map<number | string, LayoutNode>()
    layoutNodes.forEach(n => nodeMap.set(n.id, n))

    const lines: { x1: number; y1: number; x2: number; y2: number; color: string }[] = []

    const findChildren = (nodeId: string) => {
      const parent = nodeMap.get(nodeId)
      if (!parent || parent._collapsed) return

      const originalNode = findOriginalNode(mindMapData.rootNode, nodeId)
      if (!originalNode || originalNode.children.length === 0) return

      originalNode.children.forEach(child => {
        const childLayout = nodeMap.get(child.id)
        if (!childLayout) return

        // Connector from parent right edge to child left edge, middle of each node
        const x1 = parent._x + parent._w
        const y1 = parent._y + parent._h / 2
        const x2 = childLayout._x
        const y2 = childLayout._y + childLayout._h / 2

        lines.push({
          x1, y1, x2, y2,
          color: childLayout._branchColor || parent._branchColor,
        })

        findChildren(child.id)
      })
    }

    findChildren(mindMapData.rootNode.id)
    return lines
  }, [layoutNodes, mindMapData])

  // Find a node in the original data tree
  function findOriginalNode(node: MindMapNode, id: string): MindMapNode | null {
    if (node.id === id) return node
    for (const child of node.children) {
      const found = findOriginalNode(child, id)
      if (found) return found
    }
    return null
  }

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.mm-node-card, .mm-collapse-btn')) return
    isPanning.current = true
    panStart.current = { x: e.clientX, y: e.clientY, px: panX, py: panY }
    e.preventDefault()
  }, [panX, panY])

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!isPanning.current) return
      setPanX(panStart.current.px + (e.clientX - panStart.current.x))
      setPanY(panStart.current.py + (e.clientY - panStart.current.y))
    }
    const handleUp = () => { isPanning.current = false }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [])

  // Zoom handler
  const handleWheel = useCallback((e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom(z => Math.max(0.25, Math.min(2, z + delta)))
  }, [])

  // Auto-fit
  useEffect(() => {
    if (layoutNodes.length === 0) return
    const maxR = Math.max(...layoutNodes.map(n => n._x + n._w))
    const maxB = Math.max(...layoutNodes.map(n => n._y + n._h))
    const containerW = containerRef.current?.clientWidth || 800
    const containerH = containerRef.current?.clientHeight || 500
    const fitZoom = Math.min(
      containerW / (maxR + 60),
      containerH / (maxB + 60),
      1
    )
    if (fitZoom < 0.3) setZoom(fitZoom)
    setPanX(20)
    setPanY(20)
  }, [layoutNodes.length > 0 && mindMapData?.projectName]) // eslint-disable-line

  const toggleCollapse = useCallback((id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // Boundaries for SVG
  const maxX = Math.max(100, ...layoutNodes.map(n => n._x + n._w)) + 100
  const maxY = Math.max(100, ...layoutNodes.map(n => n._y + n._h)) + 100

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
    <div
      ref={containerRef}
      className="mm-viewport"
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
      style={{ cursor: isPanning.current ? 'grabbing' : 'grab' }}
    >
      {/* Info bar */}
      <div className="mm-info-bar">
        <span className="mm-info-title">{mindMapData.projectName} — {t.horseFarm.subTabMindmap}</span>
        <span className="mm-info-date">
          {new Date(mindMapData.generatedAt).toLocaleString('zh-CN')}
        </span>
        <button
          className="mm-refresh-btn"
          onClick={(e) => { e.stopPropagation(); loadData() }}
          disabled={loading}
          title="刷新思维导图"
        >🔄</button>
        <span className="mm-info-zoom">{Math.round(zoom * 100)}%</span>
      </div>

      {/* Canvas */}
      <div
        className="mm-canvas"
        style={{
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: '0 0',
          width: maxX,
          height: maxY,
        }}
      >
        {/* SVG connectors */}
        <svg
          className="mm-svg-layer"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: maxX,
            height: maxY,
            overflow: 'visible',
            pointerEvents: 'none',
          }}
        >
          {connectors.map((c, i) => (
            <Connector key={i} {...c} />
          ))}
        </svg>

        {/* Nodes */}
        <div className="mm-nodes-layer" style={{ position: 'absolute', top: 0, left: 0, width: maxX, height: maxY }}>
          {layoutNodes.map(node => (
            <NodeCard
              key={node.id}
              node={node}
              isRoot={node.id === mindMapData.rootNode.id}
              branchColor={node._branchColor}
              onClickCollapse={toggleCollapse}
              onClickNode={() => toggleCollapse(node.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
