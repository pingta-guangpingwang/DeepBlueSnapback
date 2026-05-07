import * as fs from 'fs-extra'
import * as path from 'path'
import type { ArchitectureGraph, GraphDiff, GraphNode } from './graph-types'

// ==================== Graph Store ====================

function getGraphsDir(rootPath: string): string {
  return path.join(rootPath, 'graphs')
}

function getGraphPath(rootPath: string, commitId: string): string {
  return path.join(getGraphsDir(rootPath), `${commitId}.json`)
}

export async function saveGraph(
  rootPath: string,
  graph: ArchitectureGraph
): Promise<{ success: boolean; message?: string }> {
  try {
    const dir = getGraphsDir(rootPath)
    await fs.ensureDir(dir)

    const filePath = getGraphPath(rootPath, graph.commitId)
    await fs.writeJson(filePath, graph, { spaces: 2 })
    return { success: true }
  } catch (error) {
    return { success: false, message: String(error) }
  }
}

export async function loadGraph(
  rootPath: string,
  commitId: string
): Promise<ArchitectureGraph | null> {
  try {
    const filePath = getGraphPath(rootPath, commitId)
    if (!(await fs.pathExists(filePath))) return null
    return await fs.readJson(filePath) as ArchitectureGraph
  } catch {
    return null
  }
}

export async function deleteGraph(
  rootPath: string,
  commitId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const filePath = getGraphPath(rootPath, commitId)
    if (await fs.pathExists(filePath)) {
      await fs.remove(filePath)
    }
    return { success: true }
  } catch (error) {
    return { success: false, message: String(error) }
  }
}

export async function listGraphs(
  rootPath: string
): Promise<string[]> {
  try {
    const dir = getGraphsDir(rootPath)
    if (!(await fs.pathExists(dir))) return []

    const files = await fs.readdir(dir)
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''))
      .sort()
      .reverse()
  } catch {
    return []
  }
}

export async function graphExists(
  rootPath: string,
  commitId: string
): Promise<boolean> {
  try {
    return await fs.pathExists(getGraphPath(rootPath, commitId))
  } catch {
    return false
  }
}

// ==================== Graph Comparison ====================

export function compareGraphs(
  graphA: ArchitectureGraph | null,
  graphB: ArchitectureGraph | null
): GraphDiff {
  if (!graphA && !graphB) {
    return {
      addedNodes: [], removedNodes: [], modifiedNodes: [],
      addedEdges: [], brokenEdges: [],
      summary: { nodesAdded: 0, nodesRemoved: 0, nodesModified: 0, edgesAdded: 0, edgesBroken: 0 },
    }
  }

  if (!graphA) {
    // All nodes in B are added
    const allNodes = collectAllNodes(graphB!.rootNode)
    return {
      addedNodes: allNodes,
      removedNodes: [],
      modifiedNodes: [],
      addedEdges: graphB!.edges,
      brokenEdges: [],
      summary: {
        nodesAdded: allNodes.length,
        nodesRemoved: 0,
        nodesModified: 0,
        edgesAdded: graphB!.edges.length,
        edgesBroken: 0,
      },
    }
  }

  if (!graphB) {
    // All nodes in A are removed
    const allNodes = collectAllNodes(graphA!.rootNode)
    return {
      addedNodes: [],
      removedNodes: allNodes,
      modifiedNodes: [],
      addedEdges: [],
      brokenEdges: graphA!.edges,
      summary: {
        nodesAdded: 0,
        nodesRemoved: allNodes.length,
        nodesModified: 0,
        edgesAdded: 0,
        edgesBroken: graphA!.edges.length,
      },
    }
  }

  // Build node maps
  const nodesAMap = new Map<string, GraphNode>()
  const nodesBMap = new Map<string, GraphNode>()

  for (const n of collectAllNodes(graphA.rootNode)) nodesAMap.set(n.id, n)
  for (const n of collectAllNodes(graphB.rootNode)) nodesBMap.set(n.id, n)

  const addedNodes = collectAllNodes(graphB.rootNode).filter(n => !nodesAMap.has(n.id))
  const removedNodes = collectAllNodes(graphA.rootNode).filter(n => !nodesBMap.has(n.id))

  // Modified nodes: same id, different stats
  const modifiedNodes: GraphDiff['modifiedNodes'] = []
  for (const [id, nodeA] of nodesAMap) {
    const nodeB = nodesBMap.get(id)
    if (nodeB) {
      if (
        nodeA.lineCount !== nodeB.lineCount ||
        nodeA.fileCount !== nodeB.fileCount ||
        nodeA.exportsCount !== nodeB.exportsCount
      ) {
        modifiedNodes.push({ before: nodeA, after: nodeB })
      }
    }
  }

  // Edge comparison
  const edgeKey = (e: { source: string; target: string; type: string }) =>
    `${e.source}->${e.target}:${e.type}`

  const edgesAMap = new Map<string, typeof graphA.edges[0]>()
  const edgesBMap = new Map<string, typeof graphB.edges[0]>()

  for (const e of graphA.edges) edgesAMap.set(edgeKey(e), e)
  for (const e of graphB.edges) edgesBMap.set(edgeKey(e), e)

  const addedEdges = graphB.edges.filter(e => !edgesAMap.has(edgeKey(e)))
  const brokenEdges = graphA.edges.filter(e => !edgesBMap.has(edgeKey(e)))

  return {
    addedNodes,
    removedNodes,
    modifiedNodes,
    addedEdges,
    brokenEdges,
    summary: {
      nodesAdded: addedNodes.length,
      nodesRemoved: removedNodes.length,
      nodesModified: modifiedNodes.length,
      edgesAdded: addedEdges.length,
      edgesBroken: brokenEdges.length,
    },
  }
}

function collectAllNodes(root: GraphNode): GraphNode[] {
  const nodes: GraphNode[] = []

  function walk(node: GraphNode): void {
    nodes.push({
      id: node.id,
      label: node.label,
      path: node.path || '',
      type: node.type,
      fileCount: node.fileCount || 0,
      lineCount: node.lineCount || 0,
      exportsCount: node.exportsCount || 0,
    })
    if (node.children) {
      for (const child of node.children) walk(child)
    }
  }

  walk(root)
  return nodes
}

// ==================== Architecture Change Log ====================

export interface ArchitectureChangeEntry {
  versionId: string
  timestamp: string
  previousVersionId?: string
  summary: {
    nodesAdded: number
    nodesRemoved: number
    nodesModified: number
    edgesAdded: number
    edgesBroken: number
    circularDepsChanged: boolean
    healthScoreChanged?: number
  }
}

export async function appendChangeLog(
  rootPath: string,
  entry: ArchitectureChangeEntry
): Promise<void> {
  const logPath = path.join(getGraphsDir(rootPath), '_change-log.json')
  let log: ArchitectureChangeEntry[] = []
  try {
    if (await fs.pathExists(logPath)) {
      log = await fs.readJson(logPath)
    }
  } catch {
    // Start fresh
  }

  log.push(entry)
  await fs.writeJson(logPath, log, { spaces: 2 })
}

export async function getChangeLog(
  rootPath: string
): Promise<ArchitectureChangeEntry[]> {
  const logPath = path.join(getGraphsDir(rootPath), '_change-log.json')
  try {
    if (await fs.pathExists(logPath)) {
      return await fs.readJson(logPath)
    }
  } catch {
    // Ignore
  }
  return []
}
