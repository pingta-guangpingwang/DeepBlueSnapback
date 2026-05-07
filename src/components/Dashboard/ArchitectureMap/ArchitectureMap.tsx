import { useEffect, useRef, useState, useCallback } from 'react'
import { useI18n } from '../../../i18n'
import { useAppState } from '../../../context/AppContext'
import { useArchitectureGraph } from '../../../hooks/useArchitectureGraph'
import { useGraphComparison } from '../../../hooks/useGraphComparison'
import { MapCanvas } from './MapCanvas'
import { MapControls } from './MapControls'
import { MapLegend } from './MapLegend'
import { MapTooltip } from './MapTooltip'
import { GraphDiffView } from '../GraphDiffView'
import type { GraphNode, GraphEdge } from '../../../types/graph'

export function ArchitectureMap() {
  const { t } = useI18n()
  const [state] = useAppState()
  const {
    graph, positions, edges, viewMode, filter, loading, error, selectedNode,
    loadGraph, setViewMode, setFilter, setSelectedNode, toggleNodeCollapse, depth, setDepth, resetView,
  } = useArchitectureGraph()

  const { diff, loading: cmpLoading, error: cmpError, versionA, versionB, compareVersions, clearComparison } = useGraphComparison()
  const [showCompare, setShowCompare] = useState(false)
  const [availableVersions, setAvailableVersions] = useState<string[]>([])
  const [cmpVersionA, setCmpVersionA] = useState('')
  const [cmpVersionB, setCmpVersionB] = useState('')

  const [tooltip, setTooltip] = useState<{
    node: GraphNode | null; edge: GraphEdge | null; x: number; y: number; visible: boolean
  }>({ node: null, edge: null, x: 0, y: 0, visible: false })

  const collapsedNodesRef = useRef<Set<string>>(new Set())
  const didLoad = useRef(false)

  // Load available graph versions
  useEffect(() => {
    const fetchVersions = async () => {
      const result = await (window as any).electronAPI?.listGraphVersions()
      if (result?.success && result.versions) {
        setAvailableVersions(result.versions)
      }
    }
    fetchVersions()
  }, [graph])

  const handleCompare = useCallback(async () => {
    if (cmpVersionA && cmpVersionB) {
      setShowCompare(true)
      await compareVersions(cmpVersionA, cmpVersionB)
    }
  }, [cmpVersionA, cmpVersionB, compareVersions])

  const handleCloseCompare = useCallback(() => {
    setShowCompare(false)
    clearComparison()
  }, [clearComparison])

  // Tooltip handlers for node/edge hover
  const handleHoverNode = useCallback((nodeId: string | null) => {
    if (!nodeId || !graph) {
      setTooltip(prev => ({ ...prev, node: null, visible: false }))
      return
    }
    const node = findNodeById(graph.rootNode, nodeId)
    if (node) {
      setTooltip({ node, edge: null, x: 0, y: 0, visible: true })
    }
  }, [graph])

  const handleHoverEdge = useCallback((edgeId: string | null) => {
    if (!edgeId || !graph) {
      setTooltip(prev => ({ ...prev, edge: null, visible: false }))
      return
    }
    const edge = graph.edges.find(e => e.id === edgeId)
    if (edge) {
      setTooltip({ node: null, edge, x: 0, y: 0, visible: true })
    }
  }, [graph])

  // Mouse move for tooltip positioning
  useEffect(() => {
    const handleMouseMove = (e: globalThis.MouseEvent) => {
      if (tooltip.visible) {
        setTooltip(prev => ({ ...prev, x: e.clientX, y: e.clientY }))
      }
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [tooltip.visible])

  // Load graph on mount
  useEffect(() => {
    if (didLoad.current) return
    if (!state.repoPath || !state.projectPath) return
    didLoad.current = true

    const load = async () => {
      const bridge = (window as any).electronAPI
      if (!bridge) return
      try {
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

  const depthOptions = [1, 2, 3, 4, 5, -1]

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

      {/* Depth slider */}
      <div className="map-depth-slider">
        <span className="map-depth-label">{t.graph.depth}:</span>
        {depthOptions.map(d => (
          <button
            key={d}
            className={`map-depth-btn ${depth === d ? 'active' : ''}`}
            onClick={() => setDepth(d)}
          >
            {d === -1 ? t.graph.depthAll : d}
          </button>
        ))}
      </div>

      {/* Graph version comparison */}
      {availableVersions.length > 1 && (
        <div className="map-compare-bar">
          <span className="map-compare-label">{t.graph.compareLabel}</span>
          <select value={cmpVersionA} onChange={e => setCmpVersionA(e.target.value)}>
            <option value="">{t.graph.selectVersionA}</option>
            {availableVersions.map(v => (
              <option key={v} value={v}>{v.slice(0, 14)}</option>
            ))}
          </select>
          <span className="map-compare-vs">vs</span>
          <select value={cmpVersionB} onChange={e => setCmpVersionB(e.target.value)}>
            <option value="">{t.graph.selectVersionB}</option>
            {availableVersions.map(v => (
              <option key={v} value={v}>{v.slice(0, 14)}</option>
            ))}
          </select>
          <button
            onClick={handleCompare}
            disabled={!cmpVersionA || !cmpVersionB || cmpLoading}
          >
            {t.graph.compare}
          </button>
        </div>
      )}

      <div className="map-main-area">
        <MapCanvas
          rootNode={graph?.rootNode ?? null}
          positions={positions}
          edges={edges}
          selectedNode={selectedNode}
          collapsedNodes={collapsedNodesRef.current}
          depth={depth}
          onSelectNode={handleSelectNode}
          onToggleCollapse={handleToggleCollapse}
          onHoverNode={handleHoverNode}
          onHoverEdge={handleHoverEdge}
          loading={loading}
          error={error}
        />

        <MapLegend />

        {/* Floating detail panel */}
        {selectedNode && graph && !showCompare && (
          <div className="map-detail-panel">
            <NodeDetailPanel
              nodeId={selectedNode}
              graph={graph}
              onClose={() => setSelectedNode(null)}
            />
          </div>
        )}
      </div>

      <MapTooltip
        node={tooltip.node}
        edge={tooltip.edge}
        x={tooltip.x}
        y={tooltip.y}
        visible={tooltip.visible}
      />

      {/* Graph diff comparison panel */}
      <GraphDiffView
        diff={diff}
        loading={cmpLoading}
        error={cmpError}
        versionA={versionA}
        versionB={versionB}
        onClose={handleCloseCompare}
      />
    </div>
  )
}

function NodeDetailPanel({ nodeId, graph, onClose }: {
  nodeId: string; graph: { rootNode: GraphNode; edges: GraphEdge[] }; onClose: () => void
}) {
  const { t } = useI18n()
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
          <span className="stat-label">{t.graph.nodeType}</span>
          <span className="stat-value">{node.type}</span>
        </div>
        <div className="node-detail-stat">
          <span className="stat-label">{t.graph.path}</span>
          <span className="stat-value mono">{node.path}</span>
        </div>
        <div className="node-detail-stat">
          <span className="stat-label">{t.graph.nodeFiles}</span>
          <span className="stat-value">{node.fileCount}</span>
        </div>
        <div className="node-detail-stat">
          <span className="stat-label">{t.graph.nodeLines}</span>
          <span className="stat-value">{node.lineCount.toLocaleString()}</span>
        </div>
        <div className="node-detail-stat">
          <span className="stat-label">{t.graph.nodeExports}</span>
          <span className="stat-value">{node.exportsCount}</span>
        </div>
        <div className="node-detail-stat">
          <span className="stat-label">{t.graph.nodeIncoming}</span>
          <span className="stat-value">{incomingEdges.length} {t.graph.deps}</span>
        </div>
        <div className="node-detail-stat">
          <span className="stat-label">{t.graph.nodeOutgoing}</span>
          <span className="stat-value">{outgoingEdges.length} {t.graph.deps}</span>
        </div>
        {circularEdges.length > 0 && (
          <div className="node-detail-stat warning">
            <span className="stat-label">⤾ {t.graph.nodeCircular}</span>
            <span className="stat-value">{circularEdges.length} {t.graph.cycles}</span>
          </div>
        )}
      </div>
      {outgoingEdges.length > 0 && (
        <div className="node-detail-edges">
          <span className="node-detail-subtitle">{t.graph.dependencies} ({outgoingEdges.length})</span>
          <div className="node-detail-edge-list">
            {outgoingEdges.slice(0, 20).map(e => (
              <div key={e.id} className={`node-detail-edge edge-${e.type}`}>
                <span className="edge-type-badge">{e.type}</span>
                <span className="edge-target">{e.target.split(':').pop()}</span>
                {e.label && <span className="edge-label">→ {e.label}</span>}
              </div>
            ))}
            {outgoingEdges.length > 20 && <div className="node-detail-more">+{outgoingEdges.length - 20} {t.graph.more}</div>}
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
