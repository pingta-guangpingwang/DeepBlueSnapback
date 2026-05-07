import type { QualityResult, QualityReport } from './quality-analyzer'
import { analyzeQuality } from './quality-analyzer'
import type { ArchitectureGraph } from './graph-types'

export interface Suggestion {
  level: 'critical' | 'warning' | 'info'
  title: string
  description: string
  module?: string
}

export interface HealthReport {
  score: number
  grade: string
  gradeLabel: string
  summary: QualityResult['summary']
  topIssues: QualityReport[]
  suggestions: Suggestion[]
  timestamp: string
}

const GRADE_LABELS: Record<string, string> = {
  A: 'Excellent — architecture is well-structured',
  B: 'Good — minor improvements possible',
  C: 'Acceptable — some technical debt present',
  D: 'Poor — significant refactoring needed',
  F: 'Critical — architecture health is failing',
}

export function generateHealthReport(graph: ArchitectureGraph): HealthReport {
  const result = analyzeQuality(graph)

  // Generate suggestions
  const suggestions: Suggestion[] = []

  if (result.summary.godModules > 0) {
    suggestions.push({
      level: 'critical',
      title: `${result.summary.godModules} God Module(s) Detected`,
      description: 'Modules with excessive responsibilities (>500 lines or >15 exports). Consider splitting into smaller, focused modules. Each module should have a single responsibility.',
    })
  }

  if (result.summary.orphans > 0) {
    suggestions.push({
      level: 'warning',
      title: `${result.summary.orphans} Orphan Module(s) Found`,
      description: 'Files with no incoming or outgoing dependencies. These may be unused dead code, or need to be integrated into the dependency graph.',
    })
  }

  if (result.summary.painZoneModules > 0) {
    suggestions.push({
      level: 'warning',
      title: `${result.summary.painZoneModules} Module(s) in Pain Zone`,
      description: 'Modules with unbalanced instability vs abstractness. Unstable modules should be abstract, stable modules should be concrete. Review the D-metric for each module.',
    })
  }

  if (graph.metrics.circularDepCount > 0) {
    suggestions.push({
      level: 'critical',
      title: `${graph.metrics.circularDepCount} Circular Dependencies`,
      description: 'Cycles create tight coupling and make testing/refactoring difficult. Break cycles by extracting interfaces or using dependency inversion.',
    })
  }

  if (result.summary.avgComplexity > 20) {
    suggestions.push({
      level: 'warning',
      title: 'High Average Complexity',
      description: `Average cyclomatic complexity is ${result.summary.avgComplexity}. Extract complex logic into smaller functions and reduce nesting depth.`,
    })
  }

  if (result.summary.cloneGroups > 0) {
    suggestions.push({
      level: 'info',
      title: `${result.summary.cloneGroups} Clone Group(s) Detected`,
      description: 'Files with the same name in different directories may indicate code duplication. Consider extracting shared logic into a shared module.',
    })
  }

  if (result.summary.grade === 'A' && suggestions.length === 0) {
    suggestions.push({
      level: 'info',
      title: 'Architecture looks healthy',
      description: 'No significant issues detected. Continue following good practices: keep modules small, manage dependencies, and refactor regularly.',
    })
  }

  // Top 5 worst modules
  const topIssues = [...result.reports]
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)
    .filter(r => r.issues.length > 0)

  return {
    score: result.summary.score,
    grade: result.summary.grade,
    gradeLabel: GRADE_LABELS[result.summary.grade] || '',
    summary: result.summary,
    topIssues,
    suggestions,
    timestamp: new Date().toISOString(),
  }
}
