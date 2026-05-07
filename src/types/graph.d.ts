// ==================== Architecture Graph Types ====================

export interface GraphNode {
  id: string // e.g., "folder:src/components", "file:src/App.tsx", "class:MyClass"
  type: 'building' | 'floor' | 'room'
  label: string // display name
  path: string // filesystem path
  fileCount: number
  lineCount: number
  exportsCount: number
  complexity?: number // cyclomatic complexity score
  children?: GraphNode[]
  collapsed?: boolean
}

export interface GraphEdge {
  id: string
  source: string // node id
  target: string // node id
  type: 'pipeline' | 'hierarchy' | 'flow' | 'circular'
  weight: number // reference count / dependency strength
  files: string[] // specific files involved in this dependency
  label?: string
}

export interface ArchitectureGraph {
  schemaVersion: number
  commitId: string
  timestamp: string
  projectName: string
  rootNode: GraphNode
  edges: GraphEdge[]
  metrics: GraphMetrics
}

export interface GraphMetrics {
  nodeCount: number
  edgeCount: number
  circularDepCount: number
  maxDepth: number
  orphanCount: number
  totalLines: number
  totalFiles: number
}

export interface GraphDiff {
  addedNodes: GraphNode[]
  removedNodes: GraphNode[]
  modifiedNodes: Array<{ before: GraphNode; after: GraphNode }>
  addedEdges: GraphEdge[]
  brokenEdges: GraphEdge[]
  summary: {
    nodesAdded: number
    nodesRemoved: number
    nodesModified: number
    edgesAdded: number
    edgesBroken: number
  }
}

// Layout positions for rendering
export interface NodePosition {
  id: string
  x: number
  y: number
  width: number
  height: number
  level: number
}

export interface EdgePath {
  id: string
  sourceId: string
  targetId: string
  path: Array<{ x: number; y: number }>
  type: GraphEdge['type']
}

export type GraphViewMode = 'module' | 'calls' | 'inheritance' | 'circular' | 'unused'

export interface GraphFilter {
  hiddenModules: string[]
  minEdgeWeight: number
  onlyHighRisk: boolean
  searchQuery: string
}
