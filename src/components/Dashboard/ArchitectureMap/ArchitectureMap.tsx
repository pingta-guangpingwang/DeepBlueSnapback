import { useEffect, useRef, useState, useCallback } from 'react'
import { useI18n } from '../../../i18n'
import { useAppState } from '../../../context/AppContext'
import { useArchitectureGraph } from '../../../hooks/useArchitectureGraph'
import { useGraphComparison } from '../../../hooks/useGraphComparison'
import { useFlowAnimation } from '../../../hooks/useFlowAnimation'
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
    graph, positions, edges, viewMode, filter, loading, error, selectedNode, progressLog,
    loadGraph, setViewMode, setFilter, setSelectedNode, toggleNodeCollapse, depth, setDepth, resetView,
  } = useArchitectureGraph()

  const { diff, loading: cmpLoading, error: cmpError, versionA, versionB, compareVersions, clearComparison } = useGraphComparison()
  const { flowActive, flowSpeed, flowMode, flowDots, glowingNodes, setFlowSpeed, setFlowMode, startFlow, stopFlow } = useFlowAnimation(edges)
  const [showCompare, setShowCompare] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [graphFullscreen, setGraphFullscreen] = useState(false)
  const [fileViewer, setFileViewer] = useState<{
    visible: boolean; node: GraphNode | null; content: string; loading: boolean; error: string | null
  }>({ visible: false, node: null, content: '', loading: false, error: null })
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

  // ESC to exit fullscreen
  useEffect(() => {
    if (!graphFullscreen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setGraphFullscreen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [graphFullscreen])

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

  const handleOpenFile = useCallback(async (nodeId: string) => {
    if (!state.projectPath || !graph) return
    const node = findNodeById(graph.rootNode, nodeId)
    // Only open true leaf rooms (no children, represents an actual source file)
    if (!node || node.type !== 'room' || (node.children && node.children.length > 0)) return

    setFileViewer({ visible: true, node, content: '', loading: true, error: null })

    try {
      // Normalize path: use forward slashes, strip leading slash
      const relPath = node.path.replace(/\\/g, '/').replace(/^\//, '')
      const projectPath = state.projectPath.replace(/\\/g, '/')
      const fullPath = projectPath + '/' + relPath
      const result = await (window as any).electronAPI?.readFile(fullPath)
      if (result?.success) {
        setFileViewer(prev => ({ ...prev, content: result.content || '', loading: false }))
      } else {
        setFileViewer(prev => ({ ...prev, error: result?.error || 'Failed to read file', loading: false }))
      }
    } catch (err) {
      setFileViewer(prev => ({ ...prev, error: String(err), loading: false }))
    }
  }, [state.projectPath, graph])

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
        <button
          className="map-help-btn"
          onClick={() => setShowHelp(true)}
          title={String(t.graph.helpTitle)}
        >?</button>
      </div>

      {/* Flow animation demo bar — only when there are edges */}
      {edges.length > 0 && (
        <div className="map-flow-bar">
          {!flowActive ? (
            <button className="map-flow-start-btn" onClick={startFlow}>
              {'▶'} {String((t.graph as Record<string, string>).flowDemo || 'Flow Demo')}
            </button>
          ) : (
            <button className="map-flow-stop-btn" onClick={stopFlow}>
              {'■'} {String((t.graph as Record<string, string>).flowStop || 'Stop')}
            </button>
          )}
          <span className="map-flow-speed-label">{String((t.graph as Record<string, string>).flowSpeed || 'Speed')}</span>
          <input
            type="range"
            className="map-flow-speed-slider"
            min="0.25"
            max="3"
            step="0.25"
            value={flowSpeed}
            onChange={e => setFlowSpeed(parseFloat(e.target.value))}
          />
          <span className="map-flow-speed-val">{flowSpeed}x</span>
          <button
            className={`map-flow-mode-btn ${flowMode === 'single' ? 'active' : ''}`}
            onClick={() => setFlowMode(flowMode === 'single' ? 'multi' : 'single')}
            title={String((t.graph as Record<string, string>).flowMode || 'Mode')}
          >
            {flowMode === 'single' ? '\u{1F539}' : '\u{1F536}'} {flowMode === 'single' ? '1' : 'N'}
          </button>
        </div>
      )}

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
        {/* Build progress log */}
        {loading && progressLog.length > 0 && (
          <LogPanel messages={progressLog} />
        )}

        <MapCanvas
          rootNode={graph?.rootNode ?? null}
          positions={positions}
          edges={edges}
          selectedNode={selectedNode}
          collapsedNodes={collapsedNodesRef.current}
          depth={depth}
          onSelectNode={handleSelectNode}
          onToggleCollapse={handleToggleCollapse}
          onOpenFile={handleOpenFile}
          onHoverNode={handleHoverNode}
          onHoverEdge={handleHoverEdge}
          loading={loading}
          error={error}
          flowDots={flowDots}
          glowingNodes={glowingNodes}
        />

        <MapLegend />

        {/* Fullscreen button */}
        <button
          className="map-fullscreen-btn"
          onClick={() => setGraphFullscreen(true)}
          title={String(t.graph.fullscreen)}
        >
          {'⛶'}
        </button>

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

      {/* Fullscreen graph overlay */}
      {graphFullscreen && (
        <div className="map-fullscreen-overlay">
          <div className="map-fullscreen-header">
            <span className="map-fullscreen-title">{t.graph.fullscreen}</span>
            <button
              className="map-fullscreen-close"
              onClick={() => setGraphFullscreen(false)}
              title={String(t.graph.fullscreenExit)}
            >
              {'✕'}
            </button>
          </div>
          <div className="map-fullscreen-body">
            <MapCanvas
              rootNode={graph?.rootNode ?? null}
              positions={positions}
              edges={edges}
              selectedNode={selectedNode}
              collapsedNodes={collapsedNodesRef.current}
              depth={depth}
              onSelectNode={handleSelectNode}
              onToggleCollapse={handleToggleCollapse}
              onOpenFile={handleOpenFile}
              onHoverNode={handleHoverNode}
              onHoverEdge={handleHoverEdge}
              loading={loading}
              error={error}
              flowDots={flowDots}
              glowingNodes={glowingNodes}
            />
          </div>
        </div>
      )}

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

      {/* Help modal */}
      {showHelp && (
        <div className="map-help-overlay" onClick={() => setShowHelp(false)}>
          <div className="map-help-modal" onClick={e => e.stopPropagation()}>
            <div className="map-help-header">
              <h3>{String(t.graph.helpTitle)}</h3>
              <button onClick={() => setShowHelp(false)}>✕</button>
            </div>
            <div className="map-help-body">
              <p className="map-help-p">{String(t.graph.helpIntro)}</p>
              <p className="map-help-p">{String(t.graph.helpHowBuilt)}</p>
              <h4>{String(t.graph.helpRagTitle)}</h4>
              <p className="map-help-p">{String(t.graph.helpRagDesc)}</p>
              <h4>{String(t.graph.helpCliTitle)}</h4>
              <pre className="map-help-code">{String(t.graph.helpCliDesc)}</pre>
              <h4>{String(t.graph.helpApiTitle)}</h4>
              <pre className="map-help-code">{String(t.graph.helpApiDesc)}</pre>
            </div>
            <div className="map-help-footer">
              <button className="map-help-close-btn" onClick={() => setShowHelp(false)}>
                {String(t.graph.helpClose)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File viewer overlay */}
      {fileViewer.visible && fileViewer.node && (
        <FileViewerPanel
          node={fileViewer.node}
          content={fileViewer.content}
          loading={fileViewer.loading}
          error={fileViewer.error}
          graph={graph}
          onClose={() => setFileViewer({ visible: false, node: null, content: '', loading: false, error: null })}
        />
      )}
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

function LogPanel({ messages }: { messages: string[] }) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="map-log-panel">
      <div className="map-log-header">
        <span className="map-log-spinner" />
        Building graph...
      </div>
      <div className="map-log-messages">
        {messages.map((msg, i) => (
          <div key={i} className="map-log-line">
            <span className="map-log-time">{`${String(i + 1).padStart(2, '0')}`}</span>
            <span className="map-log-text">{msg}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  )
}

function FileViewerPanel({ node, content, loading, error, graph, onClose }: {
  node: GraphNode
  content: string
  loading: boolean
  error: string | null
  graph: { rootNode: GraphNode; edges: GraphEdge[] } | null
  onClose: () => void
}) {
  const { t } = useI18n()

  if (!graph) return null

  const incomingEdges = graph.edges.filter(e => e.target === node.id)
  const outgoingEdges = graph.edges.filter(e => e.source === node.id)
  const circularEdges = graph.edges.filter(e => e.type === 'circular' && (e.source === node.id || e.target === node.id))

  return (
    <div className="file-viewer-overlay" onClick={onClose}>
      <div className="file-viewer" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="file-viewer-header">
          <div className="file-viewer-title">
            <span className="file-viewer-icon">{'\u{1F4C4}'}</span>
            <span className="file-viewer-name">{node.label}</span>
            <span className="file-viewer-path">{node.path}</span>
          </div>
          <button className="file-viewer-close" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="file-viewer-body">
          {/* Code panel */}
          <div className="file-viewer-code-panel">
            {loading ? (
              <div className="file-viewer-loading">{t.graph.loading}</div>
            ) : error ? (
              <div className="file-viewer-error">{error}</div>
            ) : (
              <pre className="file-viewer-code">
                <code>{content}</code>
              </pre>
            )}
          </div>

          {/* Details side panel */}
          <div className="file-viewer-details">
            <div className="fv-detail-section">
              <h4 className="fv-detail-title">{t.graph.nodeType}</h4>
              <span className="fv-detail-value fv-type-badge">{node.type}</span>
            </div>

            <div className="fv-detail-section">
              <h4 className="fv-detail-title">{t.graph.nodeFiles}</h4>
              <span className="fv-detail-value">{node.fileCount}</span>
            </div>

            <div className="fv-detail-section">
              <h4 className="fv-detail-title">{t.graph.nodeLines}</h4>
              <span className="fv-detail-value">{node.lineCount.toLocaleString()}</span>
            </div>

            <div className="fv-detail-section">
              <h4 className="fv-detail-title">{t.graph.nodeExports}</h4>
              <span className="fv-detail-value">{node.exportsCount}</span>
            </div>

            {node.complexity != null && (
              <div className="fv-detail-section">
                <h4 className="fv-detail-title">Complexity</h4>
                <span className="fv-detail-value">{node.complexity}</span>
              </div>
            )}

            <div className="fv-detail-divider" />

            <div className="fv-detail-section">
              <h4 className="fv-detail-title">{t.graph.nodeIncoming}</h4>
              <span className="fv-detail-value">{incomingEdges.length} {t.graph.deps}</span>
            </div>

            {incomingEdges.length > 0 && (
              <div className="fv-edge-list">
                {incomingEdges.slice(0, 15).map(e => {
                  const src = findNodeById(graph.rootNode, e.source)
                  return (
                    <div key={e.id} className={`fv-edge-item fv-edge-${e.type}`}>
                      <span className="fv-edge-type">{e.type}</span>
                      <span className="fv-edge-name">{src?.label || e.source}</span>
                      {e.label && <span className="fv-edge-label">{e.label}</span>}
                    </div>
                  )
                })}
                {incomingEdges.length > 15 && <div className="fv-edge-more">+{incomingEdges.length - 15} {t.graph.more}</div>}
              </div>
            )}

            <div className="fv-detail-divider" />

            <div className="fv-detail-section">
              <h4 className="fv-detail-title">{t.graph.nodeOutgoing}</h4>
              <span className="fv-detail-value">{outgoingEdges.length} {t.graph.deps}</span>
            </div>

            {outgoingEdges.length > 0 && (
              <div className="fv-edge-list">
                {outgoingEdges.slice(0, 15).map(e => {
                  const tgt = findNodeById(graph.rootNode, e.target)
                  return (
                    <div key={e.id} className={`fv-edge-item fv-edge-${e.type}`}>
                      <span className="fv-edge-type">{e.type}</span>
                      <span className="fv-edge-name">{tgt?.label || e.target}</span>
                      {e.label && <span className="fv-edge-label">{e.label}</span>}
                    </div>
                  )
                })}
                {outgoingEdges.length > 15 && <div className="fv-edge-more">+{outgoingEdges.length - 15} {t.graph.more}</div>}
              </div>
            )}

            {circularEdges.length > 0 && (
              <>
                <div className="fv-detail-divider" />
                <div className="fv-detail-section fv-circular">
                  <h4 className="fv-detail-title">⤾ {t.graph.nodeCircular}</h4>
                  <span className="fv-detail-value">{circularEdges.length} {t.graph.cycles}</span>
                </div>
                <div className="fv-edge-list">
                  {circularEdges.map(e => (
                    <div key={e.id} className="fv-edge-item fv-edge-circular">
                      <span className="fv-edge-type">circular</span>
                      <span className="fv-edge-name">
                        {(findNodeById(graph.rootNode, e.source)?.label || e.source).split(':').pop()}
                        {' ↔ '}
                        {(findNodeById(graph.rootNode, e.target)?.label || e.target).split(':').pop()}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
