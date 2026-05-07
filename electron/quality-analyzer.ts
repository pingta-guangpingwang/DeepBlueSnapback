import type { ArchitectureGraph, GraphNode, GraphEdge } from './graph-types'

export interface QualityReport {
  nodeId: string
  label: string
  path: string
  coupling: {
    afferent: number   // Ca: how many others depend on this
    efferent: number   // Ce: how many this depends on
  }
  instability: number  // Ce / (Ca + Ce), 0=stable, 1=unstable
  abstractness: number // exports / (exports + calls)
  distance: number     // |abstractness + instability - 1|, >0.5 = pain zone
  cyclomaticComplexity: number
  isGodModule: boolean
  isOrphan: boolean
  score: number        // 0-100 individual score
  issues: string[]
}

export interface QualityResult {
  success: boolean
  message?: string
  reports: QualityReport[]
  summary: {
    totalModules: number
    godModules: number
    orphans: number
    painZoneModules: number
    avgComplexity: number
    avgCoupling: number
    cloneGroups: number
    score: number
    grade: string
  }
}

export function analyzeQuality(graph: ArchitectureGraph): QualityResult {
  const reports: QualityReport[] = []
  const nodeMap = new Map<string, GraphNode>()

  // Collect all file nodes
  function collectFiles(node: GraphNode): void {
    if (node.type === 'room' && node.children === undefined) {
      nodeMap.set(node.id, node)
    }
    if (node.children) {
      for (const child of node.children) collectFiles(child)
    }
  }
  collectFiles(graph.rootNode)

  // Build coupling maps
  const afferentMap = new Map<string, number>()  // incoming deps
  const efferentMap = new Map<string, number>()  // outgoing deps
  const sourceFileDeps = new Map<string, Set<string>>()

  for (const edge of graph.edges) {
    efferentMap.set(edge.source, (efferentMap.get(edge.source) || 0) + edge.weight)
    afferentMap.set(edge.target, (afferentMap.get(edge.target) || 0) + edge.weight)

    if (!sourceFileDeps.has(edge.source)) sourceFileDeps.set(edge.source, new Set())
    sourceFileDeps.get(edge.source)!.add(edge.target)
  }

  // Detect code clones (simplified: compare file hashes/names)
  const cloneGroups = detectClones(graph)

  for (const [id, node] of nodeMap) {
    const ce = efferentMap.get(id) || 0
    const ca = afferentMap.get(id) || 0
    const totalCoupling = ca + ce
    const instability = totalCoupling > 0 ? ce / totalCoupling : 0
    const abstractness = node.exportsCount > 0
      ? node.exportsCount / Math.max(1, node.exportsCount + (sourceFileDeps.get(id)?.size || 0))
      : 0
    const distance = Math.abs(abstractness + instability - 1)

    // Cyclomatic complexity estimation (file-based heuristic)
    const complexity = estimateComplexity(node)

    // God module: high lines + high exports + high coupling
    const isGodModule = node.lineCount > 500 || (node.exportsCount > 15 && node.lineCount > 300)

    // Orphan: no incoming AND no outgoing edges
    const isOrphan = ca === 0 && ce === 0

    const issues: string[] = []
    if (isGodModule) issues.push('God module — too large, consider splitting')
    if (isOrphan) issues.push('Orphan module — unused or dead code')
    if (distance > 0.5) issues.push(`Pain zone (D=${distance.toFixed(2)}) — unstable abstraction`)
    if (complexity > 30) issues.push(`High cyclomatic complexity (${complexity}) — consider refactoring`)
    if (ca === 0 && ce > 10) issues.push('High efferent coupling with no dependents — fragile dependency')
    if (ca > 10) issues.push('High afferent coupling — changes will have wide impact')

    // Individual score
    let score = 100
    if (isGodModule) score -= 25
    if (isOrphan) score -= 30
    if (distance > 0.5) score -= 20
    if (complexity > 30) score -= Math.min(25, (complexity - 30) * 0.5)
    if (ce > 10) score -= Math.min(15, (ce - 10) * 2)

    reports.push({
      nodeId: id,
      label: node.label,
      path: node.path,
      coupling: { afferent: ca, efferent: ce },
      instability,
      abstractness,
      distance,
      cyclomaticComplexity: complexity,
      isGodModule,
      isOrphan,
      score: Math.max(0, Math.round(score)),
      issues,
    })
  }

  // Aggregate summary
  const godModules = reports.filter(r => r.isGodModule).length
  const orphans = reports.filter(r => r.isOrphan).length
  const painZoneModules = reports.filter(r => r.distance > 0.5).length
  const avgComplexity = reports.length > 0
    ? Math.round(reports.reduce((s, r) => s + r.cyclomaticComplexity, 0) / reports.length)
    : 0
  const avgCoupling = reports.length > 0
    ? Math.round(reports.reduce((s, r) => s + r.coupling.afferent + r.coupling.efferent, 0) / reports.length)
    : 0

  // Overall score
  const avgScore = reports.length > 0
    ? Math.round(reports.reduce((s, r) => s + r.score, 0) / reports.length)
    : 100

  const { score: finalScore, grade } = computeHealthScore({
    avgScore,
    godModules,
    orphans,
    painZoneModules,
    avgComplexity,
    totalModules: reports.length,
    circularDeps: graph.metrics.circularDepCount,
    cloneCount: cloneGroups,
  })

  return {
    success: true,
    reports,
    summary: {
      totalModules: reports.length,
      godModules,
      orphans,
      painZoneModules,
      avgComplexity,
      avgCoupling,
      cloneGroups,
      score: finalScore,
      grade,
    },
  }
}

// ---- Helpers ----

function estimateComplexity(node: GraphNode): number {
  // Estimate cyclomatic complexity from metrics
  // Rough: lines/40 + exports*2 (heuristic)
  return Math.round(node.lineCount / 40 + node.exportsCount * 2)
}

function detectClones(graph: ArchitectureGraph): number {
  // Simplified clone detection: group files with same name but different paths
  const nameMap = new Map<string, string[]>()
  function walk(node: GraphNode): void {
    if (node.type === 'room' && !node.children) {
      const names = nameMap.get(node.label) || []
      names.push(node.id)
      nameMap.set(node.label, names)
    }
    if (node.children) for (const c of node.children) walk(c)
  }
  walk(graph.rootNode)

  let cloneGroups = 0
  for (const [, ids] of nameMap) {
    if (ids.length > 1) cloneGroups++
  }
  return cloneGroups
}

// ---- Health Score ----

function computeHealthScore(params: {
  avgScore: number
  godModules: number
  orphans: number
  painZoneModules: number
  avgComplexity: number
  totalModules: number
  circularDeps: number
  cloneCount: number
}): { score: number; grade: string } {
  const { avgScore, godModules, orphans, painZoneModules, avgComplexity, totalModules, circularDeps, cloneCount } = params

  if (totalModules === 0) return { score: 100, grade: 'A' }

  // Deductions
  let score = avgScore
  const godRatio = godModules / totalModules
  const orphanRatio = orphans / totalModules

  score -= godRatio * 15
  score -= orphanRatio * 10
  score -= Math.min(10, circularDeps * 2)
  score -= Math.min(10, cloneCount * 1.5)

  score = Math.max(0, Math.min(100, Math.round(score)))

  let grade: string
  if (score >= 90) grade = 'A'
  else if (score >= 75) grade = 'B'
  else if (score >= 60) grade = 'C'
  else if (score >= 40) grade = 'D'
  else grade = 'F'

  return { score, grade }
}
