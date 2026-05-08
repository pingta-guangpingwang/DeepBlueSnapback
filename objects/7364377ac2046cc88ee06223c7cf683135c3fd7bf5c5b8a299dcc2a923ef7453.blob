import { useState, useCallback } from 'react'
import type { GraphDiff } from '../types/graph'

interface UseGraphComparisonReturn {
  diff: GraphDiff | null
  loading: boolean
  error: string | null
  versionA: string | null
  versionB: string | null
  compareVersions: (versionA: string, versionB: string) => Promise<void>
  clearComparison: () => void
}

export function useGraphComparison(): UseGraphComparisonReturn {
  const [diff, setDiff] = useState<GraphDiff | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [versionA, setVersionA] = useState<string | null>(null)
  const [versionB, setVersionB] = useState<string | null>(null)

  const compareVersions = useCallback(async (verA: string, verB: string) => {
    setLoading(true)
    setError(null)
    setVersionA(verA)
    setVersionB(verB)
    try {
      const result = await window.electronAPI.compareGraphs(verA, verB)
      if (result.success && result.diff) {
        setDiff(result.diff as unknown as GraphDiff)
      } else {
        setError((result as any).message || 'Comparison failed')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  const clearComparison = useCallback(() => {
    setDiff(null)
    setVersionA(null)
    setVersionB(null)
    setError(null)
  }, [])

  return { diff, loading, error, versionA, versionB, compareVersions, clearComparison }
}
