import { useState, useCallback, useRef, useEffect } from 'react'
import type { ArchitectureGraph, GraphNode, GraphEdge, GraphViewMode, GraphFilter, NodePosition, EdgePath } from '../types/graph'

// ==================== Layout Engine ====================

// Simple tree layout for module/architecture view
// maxDepth: -1 = unlimited, >0 = treat nodes at this level as leaves
function computeTreeLayout(graph: ArchitectureGraph, maxDepth = -1): NodePosition[] {
  const positions: NodePosition[] = []
  const levelHeight = 168
  const nodeWidth = 140
  const nodeHeight = 28
  const levelGap = 84
  const basePadding = 20

  function walk(node: GraphNode, level: number, xOffset: number, siblings: number): number {
    // At depth limit, treat as leaf (no children)
    const hasChildren = (maxDepth <= 0 || level < maxDepth) && node.children && node.children.length > 0

    let totalWidth = 0
    if (hasChildren) {
      for (const child of node.children!) {
        totalWidth += walk(child, level + 1, xOffset + totalWidth, node.children!.length)
      }
    } else {
      totalWidth = nodeWidth + levelGap
    }

    const x = xOffset + totalWidth / 2 - nodeWidth / 2
    const y = level * levelHeight
    positions.push({
      id: node.id,
      x,
      y,
      width: nodeWidth,
      height: nodeHeight,
      level,
    })

    return Math.max(totalWidth, nodeWidth + levelGap)
  }

  walk(graph.rootNode, 0, basePadding, 1)
  return positions
}

// Force-directed layout for call/circular/inheritance views
function computeForceLayout(
  graph: ArchitectureGraph,
  viewMode: GraphViewMode
): { positions: NodePosition[]; filteredEdges: GraphEdge[] } {
  // We compute layout async using d3-force
  // For now, return a simple grid layout as fallback
  // The actual force layout will be computed in the hook

  const nodeList: GraphNode[] = []
  function collect(node: GraphNode): void {
    nodeList.push(node)
    if (node.children) node.children.forEach(collect)
  }
  collect(graph.rootNode)

  const cols = Math.ceil(Math.sqrt(nodeList.length))
  const gapX = 465
  const gapY = 132

  const positions: NodePosition[] = nodeList.map((node, i) => ({
    id: node.id,
    x: (i % cols) * gapX + 20,
    y: Math.floor(i / cols) * gapY + 20,
    width: 140,
    height: 28,
    level: 0,
  }))

  // Filter edges by view mode
  const filteredEdges = graph.edges.filter(e => {
    switch (viewMode) {
      case 'calls': return e.type === 'flow'
      case 'inheritance': return e.type === 'hierarchy'
      case 'circular': return e.type === 'circular'
      case 'unused': return false // unused nodes are detected by absence of edges
      default: return true
    }
  })

  return { positions, filteredEdges }
}

// ==================== Hook ====================

interface UseArchitectureGraphReturn {
  graph: ArchitectureGraph | null
  positions: NodePosition[]
  edges: GraphEdge[]
  viewMode: GraphViewMode
  filter: GraphFilter
  loading: boolean
  error: string | null
  selectedNode: string | null
  loadGraph: (repoPath: string, workingCopyPath: string, commitId: string, projectName: string) => Promise<void>
  loadGraphForVersion: (commitId: string) => Promise<void>
  setViewMode: (mode: GraphViewMode) => void
  setFilter: (filter: Partial<GraphFilter>) => void
  setSelectedNode: (nodeId: string | null) => void
  toggleNodeCollapse: (nodeId: string) => void
  depth: number
  setDepth: (depth: number) => void
  resetView: () => void
}

export function useArchitectureGraph(): UseArchitectureGraphReturn {
  const [graph, setGraph] = useState<ArchitectureGraph | null>(null)
  const [positions, setPositions] = useState<NodePosition[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [viewMode, setViewMode] = useState<GraphViewMode>('module')
  const [filter, setFilterState] = useState<GraphFilter>({
    hiddenModules: [],
    minEdgeWeight: 0,
    onlyHighRisk: false,
    searchQuery: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [depth, setDepth] = useState<number>(1) // -1 = unlimited, default 1
  const collapsedNodes = useRef<Set<string>>(new Set())

  const applyLayout = useCallback((g: ArchitectureGraph, mode: GraphViewMode, maxDepth = -1) => {
    if (mode === 'module' || mode === 'unused') {
      const pos = computeTreeLayout(g, maxDepth)
      setPositions(pos)
      setEdges(mode === 'unused' ? [] : g.edges)
    } else {
      const { positions: pos, filteredEdges } = computeForceLayout(g, mode)
      setPositions(pos)
      setEdges(filteredEdges)
    }
  }, [])

  // Re-layout tree when depth changes (clusters nodes to fit the visible range)
  const layoutDepthRef = useRef(-999)
  useEffect(() => {
    if (!graph) return
    if (layoutDepthRef.current === depth && viewMode !== 'module' && viewMode !== 'unused') return
    layoutDepthRef.current = depth
    if (viewMode === 'module' || viewMode === 'unused') {
      const pos = computeTreeLayout(graph, depth)
      setPositions(pos)
    }
  }, [depth, viewMode, graph])

  const loadGraph = useCallback(async (
    repoPath: string,
    workingCopyPath: string,
    commitId: string,
    projectName: string
  ) => {
    setLoading(true)
    setError(null)
    try {
      // Build graph fresh
      const result = await window.electronAPI.buildGraph(repoPath, workingCopyPath, commitId, projectName)
      if (result.success && result.graph) {
        const g = result.graph as unknown as ArchitectureGraph
        setGraph(g)
        applyLayout(g, viewMode)
      } else {
        setError(result.message || 'Failed to build graph')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [viewMode, applyLayout])

  const loadGraphForVersion = useCallback(async (commitId: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.electronAPI.getGraph(commitId)
      if (result.success && result.graph) {
        const g = result.graph as unknown as ArchitectureGraph
        setGraph(g)
        applyLayout(g, viewMode)
      } else {
        setError(result.message || 'Graph not found')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [viewMode, applyLayout])

  const setFilter = useCallback((partial: Partial<GraphFilter>) => {
    setFilterState(prev => ({ ...prev, ...partial }))
  }, [])

  const toggleNodeCollapse = useCallback((nodeId: string) => {
    if (collapsedNodes.current.has(nodeId)) {
      collapsedNodes.current.delete(nodeId)
    } else {
      collapsedNodes.current.add(nodeId)
    }
    // Trigger re-render by updating graph reference
    if (graph) {
      setGraph({ ...graph })
    }
  }, [graph])

  const resetView = useCallback(() => {
    if (graph) {
      applyLayout(graph, viewMode)
      collapsedNodes.current.clear()
      setSelectedNode(null)
    }
  }, [graph, viewMode, applyLayout])

  return {
    graph,
    positions,
    edges,
    viewMode,
    filter,
    loading,
    error,
    selectedNode,
    loadGraph,
    loadGraphForVersion,
    setViewMode: (mode: GraphViewMode) => {
      setViewMode(mode)
      if (graph) applyLayout(graph, mode)
    },
    setFilter,
    setSelectedNode,
    toggleNodeCollapse,
    depth,
    setDepth,
    resetView,
  }
}
