import { useState, useCallback } from 'react'
import type { VectorIndexInfo, VectorQuery, VectorSearchResult, IndexedFileInfo, VectorChunkInfo, IngestFilesResult, SupportedExtension } from '../types/electron'

interface UseVectorDBReturn {
  status: VectorIndexInfo | null
  indexedFiles: IndexedFileInfo[]
  results: VectorSearchResult[]
  loading: boolean
  error: string | null
  progressLog: string[]
  loadStatus: (projectName: string) => Promise<void>
  loadFiles: (projectName: string) => Promise<void>
  getFileChunks: (projectName: string, filePath: string) => Promise<VectorChunkInfo[]>
  buildIndex: (repoPath: string, workingCopyPath: string, commitId: string, projectName: string) => Promise<boolean>
  search: (projectName: string, query: VectorQuery) => Promise<void>
  deleteIndex: (projectName: string) => Promise<void>
  removeFiles: (workingCopyPath: string, commitId: string, projectName: string, filePaths: string[]) => Promise<void>
  exportIndex: (projectName: string) => Promise<string | null>
  importIndex: (projectName: string, data: string) => Promise<boolean>
  ingestFiles: (projectName: string, filePaths: string[], workingCopyPath: string, commitId: string) => Promise<IngestFilesResult | null>
  openFilesDialog: () => Promise<string[]>
  openFolderDialog: () => Promise<string[]>
  getSupportedExtensions: () => Promise<SupportedExtension[]>
  clearResults: () => void
  clearError: () => void
}

export function useVectorDB(): UseVectorDBReturn {
  const [status, setStatus] = useState<VectorIndexInfo | null>(null)
  const [indexedFiles, setIndexedFiles] = useState<IndexedFileInfo[]>([])
  const [results, setResults] = useState<VectorSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progressLog, setProgressLog] = useState<string[]>([])

  const loadStatus = useCallback(async (projectName: string) => {
    setError(null)
    try {
      const result = await (window as any).electronAPI?.vectorStatus(projectName)
      if (result?.success) {
        setStatus(result.index || null)
      } else {
        setError(result?.message || 'Failed to load status')
      }
    } catch (err) {
      setError(String(err))
    }
  }, [])

  const loadFiles = useCallback(async (projectName: string) => {
    try {
      const result = await (window as any).electronAPI?.vectorFiles(projectName)
      if (result?.success) {
        setIndexedFiles(result.files || [])
      }
    } catch { /* ignore */ }
  }, [])

  const buildIndex = useCallback(async (
    repoPath: string,
    workingCopyPath: string,
    commitId: string,
    projectName: string,
  ): Promise<boolean> => {
    setLoading(true)
    setError(null)
    setProgressLog([])

    const unsub = (window as any).electronAPI?.onVectorProgress?.((msg: string) => {
      setProgressLog(prev => [...prev, msg])
    })

    try {
      const result = await (window as any).electronAPI?.vectorIndex(repoPath, workingCopyPath, commitId, projectName)
      if (result?.success) {
        setStatus(result.index)
        await loadFiles(projectName)
        return true
      } else {
        setError(result?.message || 'Failed to build index')
        return false
      }
    } catch (err) {
      setError(String(err))
      return false
    } finally {
      unsub?.()
      setLoading(false)
    }
  }, [loadFiles])

  const search = useCallback(async (projectName: string, query: VectorQuery) => {
    setLoading(true)
    setError(null)
    try {
      const result = await (window as any).electronAPI?.vectorSearch(projectName, query)
      if (result?.success) {
        setResults(result.results)
      } else {
        setError(result?.message || 'Search failed')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteIndex = useCallback(async (projectName: string) => {
    setError(null)
    try {
      const result = await (window as any).electronAPI?.vectorDelete(projectName)
      if (result?.success) {
        setStatus(null)
        setResults([])
        setIndexedFiles([])
      } else {
        setError(result?.message || 'Failed to delete index')
      }
    } catch (err) {
      setError(String(err))
    }
  }, [])

  const removeFiles = useCallback(async (
    workingCopyPath: string,
    commitId: string,
    projectName: string,
    filePaths: string[],
  ) => {
    setLoading(true)
    setError(null)
    setProgressLog([])
    const unsub = (window as any).electronAPI?.onVectorProgress?.((msg: string) => {
      setProgressLog(prev => [...prev, msg])
    })
    try {
      const result = await (window as any).electronAPI?.vectorRemoveFiles(workingCopyPath, commitId, projectName, filePaths)
      if (result?.success) {
        setStatus(result.index || null)
        await loadFiles(projectName)
      } else {
        setError(result?.message || 'Failed to remove files')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      unsub?.()
      setLoading(false)
    }
  }, [loadFiles])

  const exportIndex = useCallback(async (projectName: string): Promise<string | null> => {
    try {
      const result = await (window as any).electronAPI?.vectorExport(projectName)
      if (result?.success && result.data) {
        return result.data
      }
      setError(result?.message || 'Export failed')
      return null
    } catch (err) {
      setError(String(err))
      return null
    }
  }, [])

  const importIndex = useCallback(async (projectName: string, data: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      const result = await (window as any).electronAPI?.vectorImport(projectName, data)
      if (result?.success) {
        setStatus(result.index || null)
        await loadFiles(projectName)
        return true
      }
      setError(result?.message || 'Import failed')
      return false
    } catch (err) {
      setError(String(err))
      return false
    } finally {
      setLoading(false)
    }
  }, [loadFiles])

  const ingestFiles = useCallback(async (
    projectName: string,
    filePaths: string[],
    workingCopyPath: string,
    commitId: string,
  ): Promise<IngestFilesResult | null> => {
    setLoading(true)
    setError(null)
    setProgressLog([])
    const unsub = (window as any).electronAPI?.onVectorProgress?.((msg: string) => {
      setProgressLog(prev => [...prev, msg])
    })
    try {
      const result = await (window as any).electronAPI?.vectorIngestFiles(projectName, filePaths, workingCopyPath, commitId)
      if (result?.success) {
        setStatus(result.result?.updatedIndex || null)
        await loadFiles(projectName)
        return result
      }
      setError(result?.message || 'Ingestion failed')
      return null
    } catch (err) {
      setError(String(err))
      return null
    } finally {
      unsub?.()
      setLoading(false)
    }
  }, [loadFiles])

  const openFilesDialog = useCallback(async (): Promise<string[]> => {
    try {
      const result = await (window as any).electronAPI?.vectorOpenFilesDialog()
      if (!result?.canceled && result?.filePaths) {
        return result.filePaths
      }
    } catch { /* ignore */ }
    return []
  }, [])

  const openFolderDialog = useCallback(async (): Promise<string[]> => {
    try {
      const result = await (window as any).electronAPI?.vectorOpenFolderDialog()
      if (!result?.canceled && result?.filePaths) {
        return result.filePaths
      }
    } catch { /* ignore */ }
    return []
  }, [])

  const getSupportedExtensions = useCallback(async (): Promise<SupportedExtension[]> => {
    try {
      const result = await (window as any).electronAPI?.vectorGetSupportedExtensions()
      if (result?.extensions) return result.extensions
    } catch { /* ignore */ }
    return []
  }, [])

  const getFileChunks = useCallback(async (projectName: string, filePath: string): Promise<VectorChunkInfo[]> => {
    try {
      const result = await (window as any).electronAPI?.vectorFileChunks(projectName, filePath)
      if (result?.success) return result.chunks || []
    } catch { /* ignore */ }
    return []
  }, [])

  const clearResults = useCallback(() => setResults([]), [])
  const clearError = useCallback(() => setError(null), [])

  return {
    status, indexedFiles, results, loading, error, progressLog,
    loadStatus, loadFiles, getFileChunks, buildIndex, search, deleteIndex, removeFiles, exportIndex, importIndex,
    ingestFiles, openFilesDialog, openFolderDialog, getSupportedExtensions,
    clearResults, clearError,
  }
}
