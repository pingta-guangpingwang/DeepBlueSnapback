import { useRef, useState, useCallback, useEffect, type MouseEvent, type WheelEvent } from 'react'
import type { GraphNode, GraphEdge, NodePosition } from '../../../types/graph'
import { NodeRenderer } from './NodeRenderer'
import { EdgeRenderer } from './EdgeRenderer'

interface MapCanvasProps {
  rootNode: GraphNode | null
  positions: NodePosition[]
  edges: GraphEdge[]
  selectedNode: string | null
  collapsedNodes: Set<string>
  onSelectNode: (id: string | null) => void
  onToggleCollapse: (id: string) => void
  loading: boolean
  error: string | null
}

export function MapCanvas({
  rootNode, positions, edges, selectedNode, collapsedNodes,
  onSelectNode, onToggleCollapse, loading, error,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.85)
  const [panX, setPanX] = useState(20)
  const [panY, setPanY] = useState(20)
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null)

  const positionMap = new Map(positions.map(p => [p.id, p]))

  // Collapse filter: hide children of collapsed nodes
  const visibleNodeIds = new Set<string>()
  function collectVisible(node: GraphNode, parentCollapsed: boolean): void {
    if (parentCollapsed) return
    visibleNodeIds.add(node.id)
    if (node.children) {
      const isCollapsed = collapsedNodes.has(node.id)
      for (const child of node.children) {
        collectVisible(child, isCollapsed)
      }
    }
  }
  if (rootNode) collectVisible(rootNode, false)

  const visiblePositions = positions.filter(p => visibleNodeIds.has(p.id))
  const visibleEdges = edges.filter(e =>
    visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
  )

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.08 : 0.08
    setScale(prev => Math.max(0.2, Math.min(3, prev + delta)))
  }, [])

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-node]')) return
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

  // Global mouse up
  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [handleMouseUp])

  const handleZoomIn = () => setScale(prev => Math.min(3, prev + 0.15))
  const handleZoomOut = () => setScale(prev => Math.max(0.2, prev - 0.15))
  const handleZoomReset = () => { setScale(0.85); setPanX(20); setPanY(20) }

  if (loading) {
    return (
      <div className="map-canvas" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="map-loading">Building architecture map...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="map-canvas" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="map-error">Failed to load: {error}</div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="map-canvas"
      onWheel={handleWheel}
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
        {/* SVG edge layer */}
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
            return (
              <EdgeRenderer
                key={edge.id}
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
              />
            )
          })}
        </svg>

        {/* HTML node layer */}
        {visiblePositions.map(pos => {
          const node = findNode(rootNode, pos.id)
          if (!node) return null
          return (
            <div
              key={pos.id}
              data-node="true"
              onClick={() => onSelectNode(pos.id)}
              onDoubleClick={() => onToggleCollapse(pos.id)}
              onMouseEnter={() => setHoveredNode(pos.id)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              <NodeRenderer
                node={node}
                position={pos}
                isSelected={selectedNode === pos.id}
                isCollapsed={collapsedNodes.has(pos.id)}
                isHighRisk={edges.some(e => e.type === 'circular' && (e.source === pos.id || e.target === pos.id))}
                scale={scale}
              />
            </div>
          )
        })}
      </div>

      {/* Zoom controls */}
      <div className="map-zoom-controls">
        <button onClick={handleZoomIn} title="Zoom in">+</button>
        <button onClick={handleZoomReset} title="Reset zoom">⊙</button>
        <button onClick={handleZoomOut} title="Zoom out">−</button>
      </div>

      {/* Mini map hint */}
      <div className="map-stats">
        {visiblePositions.length} nodes · {visibleEdges.length} edges
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
