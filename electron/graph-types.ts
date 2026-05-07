// ==================== Architecture Graph Types (Electron) ====================
// Mirror of src/types/graph.d.ts for use in main process

export interface GraphNode {
  id: string // e.g., "folder:src/components", "file:src/App.tsx", "class:MyClass"
  type: 'building' | 'floor' | 'room'
  label: string // display name
  path: string // filesystem path
  fileCount: number
  lineCount: number
  exportsCount: number
  complexity?: number
  children?: GraphNode[]
  collapsed?: boolean
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  type: 'pipeline' | 'hierarchy' | 'flow' | 'circular'
  weight: number
  files: string[]
  label?: string
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

export interface ArchitectureGraph {
  schemaVersion: number
  commitId: string
  timestamp: string
  projectName: string
  rootNode: GraphNode
  edges: GraphEdge[]
  metrics: GraphMetrics
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
