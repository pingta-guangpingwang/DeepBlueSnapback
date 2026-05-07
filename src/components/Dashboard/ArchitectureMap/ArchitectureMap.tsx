import { useEffect, useRef, useState } from 'react'
import { useAppState } from '../../../context/AppContext'
import { useArchitectureGraph } from '../../../hooks/useArchitectureGraph'
import { MapCanvas } from './MapCanvas'
import { MapControls } from './MapControls'
import { MapLegend } from './MapLegend'
import { MapTooltip } from './MapTooltip'
import type { GraphNode, GraphEdge } from '../../../types/graph'

export function ArchitectureMap() {
  const [state] = useAppState()
  const {
    graph, positions, edges, viewMode, filter, loading, error, selectedNode,
    loadGraph, setViewMode, setFilter, setSelectedNode, toggleNodeCollapse, resetView,
  } = useArchitectureGraph()

  const [tooltip, setTooltip] = useState<{
    node: GraphNode | null; edge: GraphEdge | null; x: number; y: number; visible: boolean
  }>({ node: null, edge: null, x: 0, y: 0, visible: false })

  const collapsedNodesRef = useRef<Set<string>>(new Set())
  const didLoad = useRef(false)

  // Load graph on mount using AppContext state
  useEffect(() => {
    if (didLoad.current) return
    if (!state.repoPath || !state.projectPath) return
    didLoad.current = true

    const load = async () => {
      const bridge = (window as any).electronAPI
      if (!bridge) return
      try {
        // Get latest commit ID from history
        const histResult = await bridge.getHistoryStructured(state.repoPath)
        let commitId = 'unknown'
        if (histResult?.success && histResult.commits?.length > 0) {
          commitId = histResult.commits[0].id
        }
        await loadGraph(
          state.repoPath,
          state.projectPath,
          commitId,
          state.currentProject || 'Project',
        )
      } catch {
        // Project not loaded yet or no commits
      }
    }
    load()
  }, [state.repoPath, state.projectPath])

  const handleToggleCollapse = (id: string) => {
    if (collapsedNodesRef.current.has(id)) {
      collapsedNodesRef.current.delete(id)
    } else {
      collapsedNodesRef.current.add(id)
    }
    toggleNodeCollapse(id)
  }

  const handleSelectNode = (id: string | null) => {
    setSelectedNode(id)
  }

  return (
    <div className="architecture-map">
      <MapControls
        viewMode={viewMode}
        filter={filter}
        onViewModeChange={setViewMode}
        onFilterChange={setFilter}
        onRefresh={resetView}
        loading={loading}
      />

      <div className="map-main-area">
        <MapCanvas
          rootNode={graph?.rootNode ?? null}
          positions={positions}
          edges={edges}
          selectedNode={selectedNode}
          collapsedNodes={collapsedNodesRef.current}
          onSelectNode={handleSelectNode}
          onToggleCollapse={handleToggleCollapse}
          loading={loading}
          error={error}
        />

        <MapLegend />
      </div>

      <MapTooltip
        node={tooltip.node}
        edge={tooltip.edge}
        x={tooltip.x}
        y={tooltip.y}
        visible={tooltip.visible}
      />

      {/* Selected node detail panel */}
      {selectedNode && graph && (
        <div className="map-detail-panel">
          <NodeDetailPanel
            nodeId={selectedNode}
            graph={graph}
            onClose={() => setSelectedNode(null)}
          />
        </div>
      )}
    </div>
  )
}

function NodeDetailPanel({ nodeId, graph, onClose }: {
  nodeId: string; graph: { rootNode: GraphNode; edges: GraphEdge[] }; onClose: () => void
}) {
  const node = findNodeById(graph.rootNode, nodeId)
  if (!node) return null

  const incomingEdges = graph.edges.filter(e => e.target === nodeId)
  const outgoingEdges = graph.edges.filter(e => e.source === nodeId)
  const circularEdges = graph.edges.filter(e => e.type === 'circular' && (e.source === nodeId || e.target === nodeId))

  return (
    <div className="node-detail">
      <div className="node-detail-header">
        <h4>{node.label}</h4>
        <button onClick={onClose}>✕</button>
      </div>
      <div className="node-detail-stats">
        <div className="node-detail-stat">
          <span className="stat-label">Type</span>
          <span className="stat-value">{node.type}</span>
        </div>
        <div className="node-detail-stat">
          <span className="stat-label">Path</span>
          <span className="stat-value mono">{node.path}</span>
        </div>
        <div className="node-detail-stat">
          <span className="stat-label">Files</span>
          <span className="stat-value">{node.fileCount}</span>
        </div>
        <div className="node-detail-stat">
          <span className="stat-label">Lines</span>
          <span className="stat-value">{node.lineCount.toLocaleString()}</span>
        </div>
        <div className="node-detail-stat">
          <span className="stat-label">Exports</span>
          <span className="stat-value">{node.exportsCount}</span>
        </div>
        <div className="node-detail-stat">
          <span className="stat-label">Incoming</span>
          <span className="stat-value">{incomingEdges.length} deps</span>
        </div>
        <div className="node-detail-stat">
          <span className="stat-label">Outgoing</span>
          <span className="stat-value">{outgoingEdges.length} deps</span>
        </div>
        {circularEdges.length > 0 && (
          <div className="node-detail-stat warning">
            <span className="stat-label">⤾ Circular</span>
            <span className="stat-value">{circularEdges.length} cycles</span>
          </div>
        )}
      </div>
      {outgoingEdges.length > 0 && (
        <div className="node-detail-edges">
          <span className="node-detail-subtitle">Dependencies ({outgoingEdges.length})</span>
          <div className="node-detail-edge-list">
            {outgoingEdges.slice(0, 20).map(e => (
              <div key={e.id} className={`node-detail-edge edge-${e.type}`}>
                <span className="edge-type-badge">{e.type}</span>
                <span className="edge-target">{e.target.split(':').pop()}</span>
                {e.label && <span className="edge-label">→ {e.label}</span>}
              </div>
            ))}
            {outgoingEdges.length > 20 && <div className="node-detail-more">+{outgoingEdges.length - 20} more</div>}
          </div>
        </div>
      )}
    </div>
  )
}

function findNodeById(root: GraphNode, id: string): GraphNode | null {
  if (root.id === id) return root
  if (root.children) {
    for (const child of root.children) {
      const found = findNodeById(child, id)
      if (found) return found
    }
  }
  return null
}
