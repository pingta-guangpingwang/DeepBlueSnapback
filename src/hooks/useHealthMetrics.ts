import { useState, useCallback } from 'react'
import type { HealthReport } from '../types/health'

interface UseHealthMetricsReturn {
  report: HealthReport | null
  loading: boolean
  error: string | null
  analyzeHealth: (commitId: string) => Promise<void>
  clearReport: () => void
}

export function useHealthMetrics(): UseHealthMetricsReturn {
  const [report, setReport] = useState<HealthReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const analyzeHealth = useCallback(async (commitId: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.electronAPI.analyzeQuality(commitId)
      if (result.success && result.report) {
        setReport(result.report as unknown as HealthReport)
      } else {
        setError((result as any).message || 'Analysis failed')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  const clearReport = useCallback(() => {
    setReport(null)
    setError(null)
  }, [])

  return { report, loading, error, analyzeHealth, clearReport }
}
