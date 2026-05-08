import { useCallback } from 'react'
import { useAppState } from '../context/AppContext'

export function useRepository() {
  const [state, dispatch] = useAppState()

  const loadStatus = useCallback(async () => {
    if (!state.projectPath || !state.repoPath) {
      dispatch({ type: 'SET_MESSAGE', payload: '请先选择项目目录。' })
      return
    }
    dispatch({ type: 'SET_IS_LOADING', payload: true })
    try {
      const result = await window.electronAPI.getStatus(state.repoPath, state.projectPath)
      if (result?.success) {
        const lines = Array.isArray(result.status)
          ? result.status
          : (result.status || '').split('\n')
        dispatch({ type: 'SET_STATUS_LINES', payload: lines })
        dispatch({ type: 'SET_MESSAGE', payload: '已获取工作区状态。' })
      } else {
        dispatch({ type: 'SET_MESSAGE', payload: '获取状态失败：' + (result?.message || '未知错误') })
      }
    } catch (error) {
      dispatch({ type: 'SET_MESSAGE', payload: '获取状态失败：' + (error as Error).message })
    } finally {
      dispatch({ type: 'SET_IS_LOADING', payload: false })
    }
  }, [state.projectPath, state.repoPath, dispatch])

  const handleCommit = useCallback(async (options?: { summary?: string; author?: string; sessionId?: string }) => {
    if (!state.commitPanelProject) {
      dispatch({ type: 'SET_MESSAGE', payload: '请先选择项目' })
      return
    }
    if (!state.commitMessage.trim()) {
      dispatch({ type: 'SET_MESSAGE', payload: '请输入提交信息' })
      return
    }
    if (state.selectedFiles.length === 0) {
      dispatch({ type: 'SET_MESSAGE', payload: '请先选择要提交的文件' })
      return
    }

    dispatch({ type: 'SET_IS_LOADING', payload: true })
    try {
      // 找到当前项目的 repoPath 和 workingCopyPath
      const project = state.projects.find(p => p.path === state.commitPanelProject)
      const repoPath = project?.repoPath || state.repoPath
      const workingCopyPath = project?.path || state.projectPath

      const result = await window.electronAPI.commit(
        repoPath, workingCopyPath, state.commitMessage, state.selectedFiles, options
      )
      if (result?.success) {
        dispatch({ type: 'SET_SELECTED_FILES', payload: [] })
        dispatch({ type: 'SET_COMMIT_MESSAGE', payload: '' })
        dispatch({ type: 'SET_COMMIT_PANEL_PROJECT', payload: null })
        dispatch({ type: 'SET_MESSAGE', payload: '提交成功！' })
      } else {
        dispatch({ type: 'SET_MESSAGE', payload: '提交失败：' + (result?.message || '未知错误') })
      }
    } catch (error) {
      dispatch({ type: 'SET_MESSAGE', payload: '提交失败：' + (error as Error).message })
    } finally {
      dispatch({ type: 'SET_IS_LOADING', payload: false })
    }
  }, [state.commitPanelProject, state.commitMessage, state.selectedFiles, state.repoPath, state.projectPath, state.projects, dispatch])

  const loadHistory = useCallback(async () => {
    if (!state.repoPath) {
      dispatch({ type: 'SET_MESSAGE', payload: '请先选择项目目录。' })
      return
    }
    dispatch({ type: 'SET_IS_LOADING', payload: true })
    try {
      const result = await window.electronAPI.getHistory(state.repoPath)
      if (result?.success) {
        dispatch({ type: 'SET_HISTORY_TEXT', payload: result.history || '暂无历史记录' })
        dispatch({ type: 'SET_MESSAGE', payload: '已获取提交历史。' })
      } else {
        dispatch({ type: 'SET_MESSAGE', payload: '获取历史失败：' + (result?.message || '未知错误') })
      }
    } catch (error) {
      dispatch({ type: 'SET_MESSAGE', payload: '获取历史失败：' + (error as Error).message })
    } finally {
      dispatch({ type: 'SET_IS_LOADING', payload: false })
    }
  }, [state.repoPath, dispatch])

  const handleRollback = useCallback(async (version: string) => {
    if (!state.projectPath || !state.repoPath) {
      dispatch({ type: 'SET_MESSAGE', payload: '请先选择项目目录。' })
      return
    }
    if (!version.trim()) {
      dispatch({ type: 'SET_MESSAGE', payload: '请输入版本号。' })
      return
    }
    dispatch({ type: 'SET_IS_LOADING', payload: true })
    try {
      const result = await window.electronAPI.rollback(state.repoPath, state.projectPath, version)
      if (result?.success) {
        dispatch({ type: 'SET_ROLLBACK_VERSION', payload: '' })
        dispatch({ type: 'SET_MESSAGE', payload: `已回滚到版本 ${version}。` })
        await loadStatus()
      } else {
        dispatch({ type: 'SET_MESSAGE', payload: '回滚失败：' + (result?.message || '未知错误') })
      }
    } catch (error) {
      dispatch({ type: 'SET_MESSAGE', payload: '回滚失败：' + (error as Error).message })
    } finally {
      dispatch({ type: 'SET_IS_LOADING', payload: false })
    }
  }, [state.projectPath, state.repoPath, dispatch, loadStatus])

  const handleUpdate = useCallback(async () => {
    if (!state.projectPath || !state.repoPath) {
      dispatch({ type: 'SET_MESSAGE', payload: '请先选择项目目录。' })
      return
    }
    dispatch({ type: 'SET_IS_LOADING', payload: true })
    try {
      const result = await window.electronAPI.update(state.repoPath, state.projectPath)
      if (result?.success) {
        dispatch({ type: 'SET_MESSAGE', payload: '已更新到最新版本。' })
        await loadStatus()
      } else {
        dispatch({ type: 'SET_MESSAGE', payload: '更新失败：' + (result?.message || '未知错误') })
      }
    } catch (error) {
      dispatch({ type: 'SET_MESSAGE', payload: '更新失败：' + (error as Error).message })
    } finally {
      dispatch({ type: 'SET_IS_LOADING', payload: false })
    }
  }, [state.projectPath, state.repoPath, dispatch, loadStatus])

  const loadRepositoryInfo = useCallback(async () => {
    if (!state.repoPath) {
      dispatch({ type: 'SET_MESSAGE', payload: '请先选择项目目录。' })
      return
    }
    dispatch({ type: 'SET_IS_LOADING', payload: true })
    try {
      const result = await window.electronAPI.getRepositoryInfo(state.repoPath)
      if (result?.success) {
        dispatch({ type: 'SET_REPOSITORY_INFO', payload: result.info || '暂无仓库信息' })
        dispatch({ type: 'SET_MESSAGE', payload: '已获取仓库信息。' })
      } else {
        dispatch({ type: 'SET_MESSAGE', payload: '获取仓库信息失败：' + (result?.message || '未知错误') })
      }
    } catch (error) {
      dispatch({ type: 'SET_MESSAGE', payload: '获取仓库信息失败：' + (error as Error).message })
    } finally {
      dispatch({ type: 'SET_IS_LOADING', payload: false })
    }
  }, [state.repoPath, dispatch])

  const openCommitPanel = useCallback(async (projectPath: string) => {
    const project = state.projects.find(p => p.path === projectPath)
    const repoPath = project?.repoPath || state.repoPath
    const workingCopyPath = project?.path || state.projectPath
    if (!repoPath || !workingCopyPath) {
      dispatch({ type: 'SET_MESSAGE', payload: '该项目尚未关联版本仓库，请先进入项目初始化仓库。' })
      return
    }

    dispatch({ type: 'SET_IS_LOADING', payload: true })
    try {
      const statusResult = await window.electronAPI.getStatus(repoPath, workingCopyPath)
      if (statusResult?.success && statusResult.status) {
        const files = statusResult.status
          .map((line: string) => {
            const raw = line.trim()
            if (!raw || raw.length < 2) return null
            const status = raw[0]
            const filePath = raw.slice(2).trim()
            return { path: filePath, status }
          })
          .filter((item): item is { path: string; status: string } => item !== null && !!item.path)

        if (files.length === 0) {
          dispatch({ type: 'SET_MESSAGE', payload: '当前没有可提交的变更文件。' })
          return
        }

        dispatch({ type: 'SET_COMMIT_PANEL_FILES', payload: files })
        dispatch({ type: 'SET_COMMIT_PANEL_PROJECT', payload: projectPath })
        dispatch({ type: 'SET_SELECTED_FILES', payload: [] })
        dispatch({ type: 'SET_COMMIT_MESSAGE', payload: '' })
      } else {
        dispatch({ type: 'SET_MESSAGE', payload: '该项目尚未初始化版本仓库，请先进入项目完成初始化。' })
      }
    } catch {
      dispatch({ type: 'SET_MESSAGE', payload: '打开提交面板失败' })
    } finally {
      dispatch({ type: 'SET_IS_LOADING', payload: false })
    }
  }, [state.projects, state.repoPath, state.projectPath, dispatch])

  const showFileDiff = useCallback(async (filePath: string) => {
    if (!state.commitPanelProject) return

    const project = state.projects.find(p => p.path === state.commitPanelProject)
    const repoPath = project?.repoPath || state.repoPath
    const workingCopyPath = project?.path || state.projectPath
    if (!repoPath || !workingCopyPath) return

    dispatch({ type: 'SET_IS_LOADING', payload: true })
    try {
      const diffResult = await window.electronAPI.getDiff(repoPath, workingCopyPath, filePath)
      if (diffResult?.success) {
        dispatch({ type: 'SET_DIFF_CONTENT', payload: diffResult.diff || '无差异' })
        dispatch({ type: 'SET_DIFF_MODAL_FILE', payload: filePath })
      } else {
        dispatch({ type: 'SET_MESSAGE', payload: '获取文件差异失败' })
      }
    } catch {
      dispatch({ type: 'SET_MESSAGE', payload: '获取文件差异失败' })
    } finally {
      dispatch({ type: 'SET_IS_LOADING', payload: false })
    }
  }, [state.commitPanelProject, state.repoPath, state.projectPath, state.projects, dispatch])

  return {
    loadStatus,
    handleCommit,
    loadHistory,
    handleRollback,
    handleUpdate,
    loadRepositoryInfo,
    openCommitPanel,
    showFileDiff,
  }
}
