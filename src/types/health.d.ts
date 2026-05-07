export interface CouplingMetrics {
  afferent: number
  efferent: number
}

export interface QualityReport {
  nodeId: string
  label: string
  path: string
  coupling: CouplingMetrics
  instability: number
  abstractness: number
  distance: number
  cyclomaticComplexity: number
  isGodModule: boolean
  isOrphan: boolean
  score: number
  issues: string[]
}

export interface HealthSummary {
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
  summary: HealthSummary
  topIssues: QualityReport[]
  suggestions: Suggestion[]
  timestamp: string
}
