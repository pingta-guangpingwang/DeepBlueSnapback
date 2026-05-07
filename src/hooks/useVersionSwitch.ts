import { useState, useCallback } from 'react'

interface VersionSwitchState {
  isViewing: boolean
  viewedVersion: string | null
  viewPath: string | null
  switching: boolean
  error: string | null
}

export function useVersionSwitch() {
  const [state, setState] = useState<VersionSwitchState>({
    isViewing: false,
    viewedVersion: null,
    viewPath: null,
    switching: false,
    error: null,
  })

  const switchToVersion = useCallback(async (repoPath: string, version: string) => {
    setState(prev => ({ ...prev, switching: true, error: null }))
    try {
      const result = await window.electronAPI.switchToVersionReadonly(repoPath, version)
      if (result.success && result.viewPath) {
        setState({
          isViewing: true,
          viewedVersion: version,
          viewPath: result.viewPath,
          switching: false,
          error: null,
        })
      } else {
        setState(prev => ({
          ...prev,
          switching: false,
          error: result.message || 'Failed to switch version',
        }))
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        switching: false,
        error: String(err),
      }))
    }
  }, [])

  const releaseVersion = useCallback(async () => {
    if (!state.viewedVersion) return
    setState(prev => ({ ...prev, switching: true }))
    try {
      const result = await window.electronAPI.releaseVersionReadonly(state.viewedVersion)
      if (result.success) {
        setState({
          isViewing: false,
          viewedVersion: null,
          viewPath: null,
          switching: false,
          error: null,
        })
      } else {
        setState(prev => ({
          ...prev,
          switching: false,
          error: result.message || 'Failed to release version',
        }))
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        switching: false,
        error: String(err),
      }))
    }
  }, [state.viewedVersion])

  const getVersionFiles = useCallback(async (repoPath: string, version: string) => {
    const result = await window.electronAPI.getVersionFileList(repoPath, version)
    return result
  }, [])

  const getVersionFileContent = useCallback(async (repoPath: string, version: string, filePath: string) => {
    const result = await window.electronAPI.getVersionFileContent(repoPath, version, filePath)
    return result
  }, [])

  return {
    ...state,
    switchToVersion,
    releaseVersion,
    getVersionFiles,
    getVersionFileContent,
  }
}
