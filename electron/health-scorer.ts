import type { QualityResult, QualityReport } from './quality-analyzer'
import { analyzeQuality } from './quality-analyzer'
import type { ArchitectureGraph } from './graph-types'

export interface Suggestion {
  level: 'critical' | 'warning' | 'info'
  code: string
  params: Record<string, string | number>
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

// Grade codes for i18n translation on frontend
const GRADE_CODES: Record<string, string> = {
  A: 'grade_a',
  B: 'grade_b',
  C: 'grade_c',
  D: 'grade_d',
  F: 'grade_f',
}

export function generateHealthReport(graph: ArchitectureGraph): HealthReport {
  const result = analyzeQuality(graph)

  // Generate suggestions
  const suggestions: Suggestion[] = []

  if (result.summary.godModules > 0) {
    suggestions.push({
      level: 'critical',
      code: 'god_modules',
      params: { count: result.summary.godModules },
    })
  }

  if (result.summary.orphans > 0) {
    suggestions.push({
      level: 'warning',
      code: 'orphan_modules',
      params: { count: result.summary.orphans },
    })
  }

  if (result.summary.painZoneModules > 0) {
    suggestions.push({
      level: 'warning',
      code: 'pain_zone',
      params: { count: result.summary.painZoneModules },
    })
  }

  if (graph.metrics.circularDepCount > 0) {
    suggestions.push({
      level: 'critical',
      code: 'circular_deps',
      params: { count: graph.metrics.circularDepCount },
    })
  }

  if (result.summary.avgComplexity > 20) {
    suggestions.push({
      level: 'warning',
      code: 'high_complexity',
      params: { value: result.summary.avgComplexity },
    })
  }

  if (result.summary.cloneGroups > 0) {
    suggestions.push({
      level: 'info',
      code: 'clone_groups',
      params: { count: result.summary.cloneGroups },
    })
  }

  if (result.summary.grade === 'A' && suggestions.length === 0) {
    suggestions.push({
      level: 'info',
      code: 'healthy',
      params: {},
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
    gradeLabel: GRADE_CODES[result.summary.grade] || '',
    summary: result.summary,
    topIssues,
    suggestions,
    timestamp: new Date().toISOString(),
  }
}
