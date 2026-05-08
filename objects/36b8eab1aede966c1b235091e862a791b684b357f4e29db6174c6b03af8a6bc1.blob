import { useState, useCallback, useRef, useEffect } from 'react'
import type { ArchitectureGraph, GraphNode, GraphEdge, GraphViewMode, GraphFilter, NodePosition, EdgePath } from '../types/graph'

// ==================== Layout Engine ====================

// Simple tree layout for module/architecture view
// maxDepth: -1 = unlimited, >0 = treat nodes at this level as leaves
// Uses standard mind-map right-tree layout: root at left, children expand to the right
function computeTreeLayout(graph: ArchitectureGraph, maxDepth = -1): NodePosition[] {
  const positions: NodePosition[] = []
  const levelHeight = 56      // vertical spacing between parent-child levels
  const nodeWidth = 130
  const nodeHeight = 28
  const siblingGap = 16       // vertical gap between adjacent siblings at same level
  const basePadding = 24

  // First pass: compute subtree heights (total vertical span including descendants)
  // This allows us to center each node within its subtree's vertical extent
  function computeHeights(node: GraphNode, level: number): number {
    const hasChildren = (maxDepth <= 0 || level < maxDepth) && node.children && node.children.length > 0
    if (!hasChildren || !node.children || node.children.length === 0) {
      return nodeHeight
    }
    let total = 0
    for (let i = 0; i < node.children.length; i++) {
      total += computeHeights(node.children[i], level + 1)
      if (i < node.children.length - 1) total += siblingGap
    }
    return Math.max(total, nodeHeight)
  }

  // Second pass: assign positions
  function walk(node: GraphNode, level: number, yOffset: number): number {
    const hasChildren = (maxDepth <= 0 || level < maxDepth) && node.children && node.children.length > 0

    // Compute vertical center of self vs subtree
    const myHeight = nodeHeight
    let subtreeHeight = myHeight
    if (hasChildren && node.children && node.children.length > 0) {
      subtreeHeight = 0
      for (let i = 0; i < node.children.length; i++) {
        subtreeHeight += computeHeights(node.children[i], level + 1)
        if (i < node.children.length - 1) subtreeHeight += siblingGap
      }
    }

    // Center self vertically within allocated space
    const selfY = yOffset + (subtreeHeight - myHeight) / 2

    positions.push({
      id: node.id,
      x: level * (nodeWidth + 64), // horizontal spacing: node + gap to next level
      y: selfY,
      width: nodeWidth,
      height: nodeHeight,
      level,
    })

    if (hasChildren && node.children && node.children.length > 0) {
      let childY = yOffset
      for (const child of node.children) {
        const ch = computeHeights(child, level + 1)
        walk(child, level + 1, childY)
        childY += ch + siblingGap
      }
    }

    return subtreeHeight
  }

  walk(graph.rootNode, 0, basePadding)
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
  const gapX = 180
  const gapY = 56

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
  progressLog: string[]
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
  const [progressLog, setProgressLog] = useState<string[]>([])
  const [depth, setDepthState] = useState<number>(1) // -1 = unlimited, default 1
  const collapsedNodes = useRef<Set<string>>(new Set())
  // Refs to keep latest values accessible in callbacks without stale closures
  const graphRef = useRef<ArchitectureGraph | null>(null)
  const viewModeRef = useRef<GraphViewMode>('module')
  const depthRef = useRef<number>(1)

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

  // Direct setDepth that immediately recomputes layout (no stale useEffect delay)
  const setDepth = useCallback((d: number) => {
    setDepthState(d)
    depthRef.current = d
    const g = graphRef.current
    const vm = viewModeRef.current
    if (g && (vm === 'module' || vm === 'unused')) {
      setPositions(computeTreeLayout(g, d))
    }
  }, [])

  // Keep refs in sync
  useEffect(() => { graphRef.current = graph }, [graph])
  useEffect(() => { viewModeRef.current = viewMode }, [viewMode])

  const loadGraph = useCallback(async (
    repoPath: string,
    workingCopyPath: string,
    commitId: string,
    projectName: string
  ) => {
    setLoading(true)
    setError(null)
    setProgressLog([])

    // Subscribe to progress updates
    const unsub = window.electronAPI.onGraphProgress((msg) => {
      setProgressLog(prev => [...prev, msg])
    })

    try {
      // Build graph fresh
      const result = await window.electronAPI.buildGraph(repoPath, workingCopyPath, commitId, projectName)
      if (result.success && result.graph) {
        const g = result.graph as unknown as ArchitectureGraph
        setGraph(g)
        applyLayout(g, viewMode, depthRef.current)
      } else {
        setError(result.message || 'Failed to build graph')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      unsub()
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
        applyLayout(g, viewMode, depthRef.current)
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
    const g = graphRef.current
    const vm = viewModeRef.current
    if (g) {
      applyLayout(g, vm, depthRef.current)
      collapsedNodes.current.clear()
      setSelectedNode(null)
    }
  }, [applyLayout])

  return {
    graph,
    positions,
    edges,
    viewMode,
    filter,
    loading,
    error,
    selectedNode,
    progressLog,
    loadGraph,
    loadGraphForVersion,
    setViewMode: (mode: GraphViewMode) => {
      setViewMode(mode)
      viewModeRef.current = mode
      const g = graphRef.current
      if (g) applyLayout(g, mode, depthRef.current)
    },
    setFilter,
    setSelectedNode,
    toggleNodeCollapse,
    depth,
    setDepth,
    resetView,
  }
}
