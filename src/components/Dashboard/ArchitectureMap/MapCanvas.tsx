import { useRef, useState, useCallback, useEffect, type MouseEvent } from 'react'
import { useI18n } from '../../../i18n'
import type { GraphNode, GraphEdge, NodePosition } from '../../../types/graph'
import { NodeRenderer } from './NodeRenderer'
import { EdgeRenderer } from './EdgeRenderer'

interface MapCanvasProps {
  rootNode: GraphNode | null
  positions: NodePosition[]
  edges: GraphEdge[]
  selectedNode: string | null
  collapsedNodes: Set<string>
  depth: number
  onSelectNode: (id: string | null) => void
  onToggleCollapse: (id: string) => void
  onOpenFile: (id: string) => void
  onHoverNode: (id: string | null) => void
  onHoverEdge: (id: string | null) => void
  loading: boolean
  error: string | null
}

export function MapCanvas({
  rootNode, positions, edges, selectedNode, collapsedNodes, depth,
  onSelectNode, onToggleCollapse, onOpenFile, onHoverNode, onHoverEdge, loading, error,
}: MapCanvasProps) {
  const { t } = useI18n()
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.92)
  const [panX, setPanX] = useState(16)
  const [panY, setPanY] = useState(16)
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null)
  const [fitVersion, setFitVersion] = useState(0)
  const needsAutoFit = useRef(true)
  const prevVisibleKey = useRef('')

  const positionMap = new Map(positions.map(p => [p.id, p]))

  // Collapse filter + depth cap
  const visibleNodeIds = new Set<string>()
  function collectVisible(node: GraphNode, parentCollapsed: boolean, currentDepth: number): void {
    if (parentCollapsed) return
    // depth: -1 = unlimited, otherwise stop at depth limit
    if (depth > 0 && currentDepth > depth) return
    visibleNodeIds.add(node.id)
    if (node.children) {
      const isCollapsed = collapsedNodes.has(node.id)
      for (const child of node.children) {
        collectVisible(child, isCollapsed, currentDepth + 1)
      }
    }
  }
  if (rootNode) collectVisible(rootNode, false, 1)

  const visiblePositions = positions.filter(p => visibleNodeIds.has(p.id))
  const visibleEdges = edges.filter(e =>
    visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
  )

  // Track when visible node set changes → trigger auto-fit
  const visibleKey = visiblePositions.map(p => p.id).sort().join(',')
  if (prevVisibleKey.current !== visibleKey) {
    prevVisibleKey.current = visibleKey
    needsAutoFit.current = true
  }

  // Auto-fit: recompute zoom/pan to frame visible nodes
  const applyAutoFit = useCallback(() => {
    if (!containerRef.current || visiblePositions.length === 0) return
    const el = containerRef.current
    const cw = el.clientWidth
    const ch = el.clientHeight
    if (cw === 0 || ch === 0) return // container not laid out yet — don't clear needsAutoFit

    needsAutoFit.current = false

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const p of visiblePositions) {
      if (p.x < minX) minX = p.x
      if (p.y < minY) minY = p.y
      if (p.x + p.width > maxX) maxX = p.x + p.width
      if (p.y + p.height > maxY) maxY = p.y + p.height
    }

    const padding = 60
    const bboxW = maxX - minX + padding * 2
    const bboxH = maxY - minY + padding * 2
    const fitScale = Math.max(0.2, Math.min(3, Math.min(cw / bboxW, ch / bboxH)))
    setScale(fitScale)
    setPanX((cw - bboxW * fitScale) / 2 - (minX - padding) * fitScale)
    setPanY((ch - bboxH * fitScale) / 2 - (minY - padding) * fitScale)
  }, [visiblePositions])

  // Run auto-fit when visiblePositions change or fitVersion is bumped
  useEffect(() => {
    if (!needsAutoFit.current) return
    applyAutoFit()
  }, [visiblePositions, fitVersion, applyAutoFit])

  // Retry auto-fit after paint when container dimensions become available
  useEffect(() => {
    if (!needsAutoFit.current || !containerRef.current || visiblePositions.length === 0) return
    const el = containerRef.current
    if (el.clientWidth > 0 && el.clientHeight > 0) return // already sized

    // Container has no dimensions yet — retry after layout
    let attempts = 0
    const maxAttempts = 10
    const tryFit = () => {
      if (!needsAutoFit.current || attempts >= maxAttempts) return
      if (el.clientWidth > 0 && el.clientHeight > 0) {
        applyAutoFit()
      } else {
        attempts++
        requestAnimationFrame(tryFit)
      }
    }
    requestAnimationFrame(tryFit)
  }, [visiblePositions, fitVersion, applyAutoFit])

  // ResizeObserver: re-fit when container size changes (e.g. detail panel opens)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let lastW = el.clientWidth
    let lastH = el.clientHeight
    const observer = new ResizeObserver(() => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (w !== lastW || h !== lastH) {
        lastW = w; lastH = h
        if (w > 0 && h > 0 && visiblePositions.length > 0) {
          needsAutoFit.current = true
          // Use a microtask to avoid triggering during render
          requestAnimationFrame(() => setFitVersion(v => v + 1))
        }
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [visiblePositions.length])

  // Manual wheel listener with { passive: false } to allow preventDefault
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: globalThis.WheelEvent) => {
      e.preventDefault()
      needsAutoFit.current = false
      const delta = e.deltaY > 0 ? -0.08 : 0.08
      setScale(prev => Math.max(0.2, Math.min(3, prev + delta)))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-node]')) return
    needsAutoFit.current = false
    setDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY, panX, panY }
    e.preventDefault()
  }, [panX, panY])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    setPanX(dragStart.current.panX + dx)
    setPanY(dragStart.current.panY + dy)
  }, [dragging])

  const handleMouseUp = useCallback(() => {
    setDragging(false)
  }, [])

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [handleMouseUp])

  const handleNodeHover = useCallback((id: string | null) => {
    setHoveredNode(id)
    onHoverNode(id)
  }, [onHoverNode])

  const handleEdgeHover = useCallback((id: string | null) => {
    setHoveredEdge(id)
    onHoverEdge(id)
  }, [onHoverEdge])

  const handleZoomIn = () => { needsAutoFit.current = false; setScale(prev => Math.min(3, prev + 0.15)) }
  const handleZoomOut = () => { needsAutoFit.current = false; setScale(prev => Math.max(0.2, prev - 0.15)) }
  const handleZoomReset = () => { needsAutoFit.current = true; setFitVersion(v => v + 1) }

  if (loading) {
    return (
      <div ref={containerRef} className="map-canvas" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="map-loading">{t.graph.buildingMap}</div>
      </div>
    )
  }

  if (error) {
    return (
      <div ref={containerRef} className="map-canvas" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="map-error">{t.graph.loadFailed.replace('{error}', error)}</div>
      </div>
    )
  }

  // Highlight incident edges for selected/hovered node
  const incidentEdgeIds = new Set<string>()
  const activeNodeId = hoveredNode || selectedNode
  if (activeNodeId) {
    edges.forEach(e => {
      if (e.source === activeNodeId || e.target === activeNodeId) {
        incidentEdgeIds.add(e.id)
      }
    })
  }

  return (
    <div
      ref={containerRef}
      className="map-canvas"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ cursor: dragging ? 'grabbing' : 'grab', position: 'relative', overflow: 'hidden' }}
    >
      <div
        className="map-transform-layer"
        style={{
          transform: `translate(${panX}px, ${panY}px) scale(${scale})`,
          transformOrigin: '0 0',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        {/* HTML node layer — rendered FIRST so SVG edges paint on top */}
        {visiblePositions.map(pos => {
          const node = findNode(rootNode, pos.id)
          if (!node) return null
          return (
            <div
              key={pos.id}
              data-node="true"
              onClick={() => onSelectNode(pos.id)}
              onDoubleClick={() => {
                if (node.type === 'room') onOpenFile(pos.id)
                else onToggleCollapse(pos.id)
              }}
              onMouseEnter={() => handleNodeHover(pos.id)}
              onMouseLeave={() => handleNodeHover(null)}
            >
              <NodeRenderer
                node={node}
                position={pos}
                isSelected={selectedNode === pos.id}
                isCollapsed={collapsedNodes.has(pos.id) || (depth > 0 && pos.level >= depth && (node.children?.length ?? 0) > 0)}
                isHighRisk={edges.some(e => e.type === 'circular' && (e.source === pos.id || e.target === pos.id))}
                scale={scale}
              />
            </div>
          )
        })}

        {/* SVG edge layer — rendered SECOND so edges paint ABOVE nodes */}
        <svg
          className="map-edge-layer"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none',
            overflow: 'visible',
          }}
        >
          {visibleEdges.map(edge => {
            const sp = positionMap.get(edge.source)
            const tp = positionMap.get(edge.target)
            if (!sp || !tp) return null
            const isIncident = incidentEdgeIds.has(edge.id)
            return (
              <g
                key={edge.id}
                style={{ pointerEvents: 'stroke' }}
                onMouseEnter={() => handleEdgeHover(edge.id)}
                onMouseLeave={() => handleEdgeHover(null)}
              >
                <EdgeRenderer
                  edge={edge}
                  sourceX={sp.x}
                  sourceY={sp.y}
                  sourceW={sp.width}
                  sourceH={sp.height}
                  targetX={tp.x}
                  targetY={tp.y}
                  targetW={tp.width}
                  targetH={tp.height}
                  scale={scale}
                  highlighted={isIncident}
                />
              </g>
            )
          })}
        </svg>
      </div>

      {/* Zoom controls */}
      <div className="map-zoom-controls">
        <button onClick={handleZoomIn} title={t.graph.zoomIn}>+</button>
        <button onClick={handleZoomReset} title={t.graph.zoomReset}>⊙</button>
        <button onClick={handleZoomOut} title={t.graph.zoomOut}>−</button>
      </div>

      {/* Stats bar */}
      <div className="map-stats">
        {visiblePositions.length} {t.graph.nodes} · {visibleEdges.length} {t.graph.edges}
      </div>
    </div>
  )
}

function findNode(root: GraphNode | null, id: string): GraphNode | null {
  if (!root) return null
  if (root.id === id) return root
  if (root.children) {
    for (const child of root.children) {
      const found = findNode(child, id)
      if (found) return found
    }
  }
  return null
}
