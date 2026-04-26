import { useCallback } from 'react'
import { useAppState } from '../context/AppContext'

export function useGit() {
  const [state, dispatch] = useAppState()

  const loadGitStatus = useCallback(async () => {
    if (!state.projectPath) return
    try {
      const result = await window.electronAPI.gitSyncStatus(state.projectPath)
      dispatch({ type: 'SET_GIT_SYNC_STATUS', payload: result })
    } catch {
      dispatch({ type: 'SET_GIT_SYNC_STATUS', payload: null })
    }
  }, [state.projectPath, dispatch])

  const connectRemote = useCallback(async (
    remoteUrl: string, branch: string, username: string, token: string
  ) => {
    if (!state.projectPath) return false
    dispatch({ type: 'SET_IS_LOADING', payload: true })
    dispatch({ type: 'SET_GIT_PROGRESS', payload: '正在连接远程仓库...' })
    try {
      const result = await window.electronAPI.gitConnect(
        state.projectPath, remoteUrl, branch, username, token
      )
      if (result.success) {
        dispatch({ type: 'SET_SHOW_GIT_REMOTE_MODAL', payload: false })
        await loadGitStatus()
      }
      dispatch({ type: 'SET_MESSAGE', payload: result.message })
      return result.success
    } catch (error) {
      dispatch({ type: 'SET_MESSAGE', payload: '连接失败：' + (error as Error).message })
      return false
    } finally {
      dispatch({ type: 'SET_IS_LOADING', payload: false })
      dispatch({ type: 'SET_GIT_PROGRESS', payload: '' })
    }
  }, [state.projectPath, dispatch, loadGitStatus])

  const disconnectRemote = useCallback(async () => {
    if (!state.projectPath) return
    dispatch({ type: 'SET_IS_LOADING', payload: true })
    try {
      const result = await window.electronAPI.gitDisconnect(state.projectPath)
      dispatch({ type: 'SET_MESSAGE', payload: result.message })
      if (result.success) await loadGitStatus()
    } finally {
      dispatch({ type: 'SET_IS_LOADING', payload: false })
    }
  }, [state.projectPath, dispatch, loadGitStatus])

  const gitPull = useCallback(async (username: string, token: string) => {
    if (!state.projectPath) return
    dispatch({ type: 'SET_IS_LOADING', payload: true })
    dispatch({ type: 'SET_GIT_PROGRESS', payload: '正在拉取远程更新...' })
    try {
      const result = await window.electronAPI.gitPull(state.projectPath, username, token)
      dispatch({ type: 'SET_MESSAGE', payload: result.message })
      if (result.conflicts && result.conflicts.length > 0) {
        dispatch({ type: 'SET_GIT_CONFLICTS', payload: result.conflicts })
        dispatch({ type: 'SET_SHOW_CONFLICT_MODAL', payload: true })
      }
      await loadGitStatus()
    } catch (error) {
      dispatch({ type: 'SET_MESSAGE', payload: '拉取失败：' + (error as Error).message })
    } finally {
      dispatch({ type: 'SET_IS_LOADING', payload: false })
      dispatch({ type: 'SET_GIT_PROGRESS', payload: '' })
    }
  }, [state.projectPath, dispatch, loadGitStatus])

  const gitPush = useCallback(async (
    commitMessage: string, username: string, token: string
  ) => {
    if (!state.projectPath) return
    dispatch({ type: 'SET_IS_LOADING', payload: true })
    dispatch({ type: 'SET_GIT_PROGRESS', payload: '正在推送到远程...' })
    try {
      const result = await window.electronAPI.gitPush(
        state.projectPath, commitMessage,
        state.gitAuthorName || 'DBHT User',
        state.gitAuthorEmail || 'dbgvs@local',
        username, token
      )
      dispatch({ type: 'SET_MESSAGE', payload: result.message })
      await loadGitStatus()
    } catch (error) {
      dispatch({ type: 'SET_MESSAGE', payload: '推送失败：' + (error as Error).message })
    } finally {
      dispatch({ type: 'SET_IS_LOADING', payload: false })
      dispatch({ type: 'SET_GIT_PROGRESS', payload: '' })
    }
  }, [state.projectPath, state.gitAuthorName, state.gitAuthorEmail, dispatch, loadGitStatus])

  const resolveConflict = useCallback(async (filePath: string, resolution: 'ours' | 'theirs') => {
    if (!state.projectPath) return
    dispatch({ type: 'SET_IS_LOADING', payload: true })
    try {
      const result = await window.electronAPI.gitResolveConflict(
        state.projectPath, filePath, resolution
      )
      if (result.success) {
        const remaining = state.gitConflicts.filter(c => c.path !== filePath)
        dispatch({ type: 'SET_GIT_CONFLICTS', payload: remaining })
        if (remaining.length === 0) {
          // All conflicts resolved — commit the merge
          await window.electronAPI.gitCommitMerge(
            state.projectPath,
            state.gitAuthorName || 'DBHT User',
            state.gitAuthorEmail || 'dbgvs@local'
          )
          dispatch({ type: 'SET_SHOW_CONFLICT_MODAL', payload: false })
        }
      }
      dispatch({ type: 'SET_MESSAGE', payload: result.message })
    } finally {
      dispatch({ type: 'SET_IS_LOADING', payload: false })
    }
  }, [state.projectPath, state.gitConflicts, state.gitAuthorName, state.gitAuthorEmail, dispatch])

  const resolveAllConflicts = useCallback(async (resolution: 'ours' | 'theirs') => {
    if (!state.projectPath) return
    dispatch({ type: 'SET_IS_LOADING', payload: true })
    try {
      for (const conflict of state.gitConflicts) {
        await window.electronAPI.gitResolveConflict(
          state.projectPath, conflict.path, resolution
        )
      }
      // Commit merge resolution
      await window.electronAPI.gitCommitMerge(
        state.projectPath,
        state.gitAuthorName || 'DBHT User',
        state.gitAuthorEmail || 'dbgvs@local'
      )
      dispatch({ type: 'SET_GIT_CONFLICTS', payload: [] })
      dispatch({ type: 'SET_SHOW_CONFLICT_MODAL', payload: false })
      dispatch({ type: 'SET_MESSAGE', payload: `所有冲突已解决（${resolution === 'ours' ? '保留本地' : '使用远程'}）` })
      await loadGitStatus()
    } catch (error) {
      dispatch({ type: 'SET_MESSAGE', payload: '解决冲突失败：' + (error as Error).message })
    } finally {
      dispatch({ type: 'SET_IS_LOADING', payload: false })
    }
  }, [state.projectPath, state.gitConflicts, state.gitAuthorName, state.gitAuthorEmail, dispatch, loadGitStatus])

  const loadCredentials = useCallback(async () => {
    return await window.electronAPI.gitGetCredentials()
  }, [])

  const saveCredential = useCallback(async (host: string, username: string, token: string) => {
    return await window.electronAPI.gitSaveCredential(host, username, token)
  }, [])

  return {
    loadGitStatus, connectRemote, disconnectRemote,
    gitPull, gitPush, resolveConflict, resolveAllConflicts,
    loadCredentials, saveCredential,
  }
}
