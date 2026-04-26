import { useCallback } from 'react'
import { useAppState } from '../context/AppContext'

export function useProjects() {
  const [state, dispatch] = useAppState()

  const loadProjects = useCallback(async () => {
    if (!state.rootRepositoryPath) return

    try {
      const result = await window.electronAPI.getProjects(state.rootRepositoryPath)
      if (result?.success && result.projects) {
        dispatch({ type: 'SET_PROJECTS', payload: result.projects })
      } else {
        dispatch({ type: 'SET_MESSAGE', payload: '加载项目列表失败：' + (result?.message || '未知错误') })
      }
    } catch (error) {
      dispatch({ type: 'SET_MESSAGE', payload: '加载项目列表失败：' + (error as Error).message })
    }
  }, [state.rootRepositoryPath, dispatch])

  const createProject = useCallback(async (name: string, customPath?: string) => {
    if (!name.trim()) {
      dispatch({ type: 'SET_MESSAGE', payload: '请输入项目名称' })
      return
    }
    if (!state.rootRepositoryPath) {
      dispatch({ type: 'SET_MESSAGE', payload: '根仓库未配置' })
      return
    }

    dispatch({ type: 'SET_IS_LOADING', payload: true })
    try {
      const result = await window.electronAPI.createProject(state.rootRepositoryPath, name, customPath)
      if (result?.success) {
        await loadProjects()
        dispatch({ type: 'SET_NEW_PROJECT_NAME', payload: '' })
        dispatch({ type: 'SET_SHOW_CREATE_PROJECT_MODAL', payload: false })
        dispatch({ type: 'SET_MESSAGE', payload: `项目 "${name}" 创建成功！` })
      } else {
        dispatch({ type: 'SET_MESSAGE', payload: '项目创建失败：' + result?.message })
      }
    } catch (error) {
      dispatch({ type: 'SET_MESSAGE', payload: '创建项目失败：' + (error as Error).message })
    } finally {
      dispatch({ type: 'SET_IS_LOADING', payload: false })
    }
  }, [state.rootRepositoryPath, dispatch, loadProjects])

  const importProject = useCallback(async (): Promise<{ folder: string; warning?: string } | null> => {
    const folder = await window.electronAPI.selectFolder()
    if (!folder) return null

    // 检查是否是已有工作副本（有 .dbvs-link.json）
    const resolved = await window.electronAPI.resolvePaths(folder)
    if (resolved) {
      if (!state.rootRepositoryPath) return null
      dispatch({ type: 'SET_IS_LOADING', payload: true })
      try {
        const result = await window.electronAPI.registerWorkingCopy(state.rootRepositoryPath, folder)
        if (result?.success) {
          await loadProjects()
          dispatch({ type: 'SET_MESSAGE', payload: result.message || '已加载项目' })
        } else if (result?.message?.includes('仓库不存在')) {
          // 旧仓库已不存在，走重新导入路径
          dispatch({ type: 'SET_IS_LOADING', payload: false })
          return {
            folder,
            warning: `检测到旧的工作副本关联（${resolved.repoPath}），但仓库已不存在。确认后将重新创建仓库并提交文件。`
          }
        } else {
          dispatch({ type: 'SET_MESSAGE', payload: result?.message || '加载失败' })
        }
      } catch (error) {
        dispatch({ type: 'SET_MESSAGE', payload: '加载项目失败：' + (error as Error).message })
      } finally {
        dispatch({ type: 'SET_IS_LOADING', payload: false })
      }
      return null
    }

    // 新项目 → 返回文件夹路径，由 RepoList 弹出确认弹窗
    return { folder }
  }, [state.rootRepositoryPath, dispatch, loadProjects])

  const confirmImport = useCallback(async (folderPath: string, projectName: string, initWithCommit: boolean) => {
    if (!state.rootRepositoryPath) return

    dispatch({ type: 'SET_IS_LOADING', payload: true })
    try {
      const result = await window.electronAPI.registerProject(state.rootRepositoryPath, folderPath, projectName, initWithCommit)
      if (result?.success) {
        await loadProjects()
        dispatch({ type: 'SET_MESSAGE', payload: `项目 "${projectName}" 导入成功！${initWithCommit ? '（已创建初始版本）' : ''}` })
      } else {
        dispatch({ type: 'SET_MESSAGE', payload: '导入失败：' + result?.message })
      }
    } catch (error) {
      dispatch({ type: 'SET_MESSAGE', payload: '导入项目失败：' + (error as Error).message })
    } finally {
      dispatch({ type: 'SET_IS_LOADING', payload: false })
    }
  }, [state.rootRepositoryPath, dispatch, loadProjects])

  const checkoutToProject = useCallback(async (repoPath: string, targetParentDir: string, folderName: string) => {
    if (!state.rootRepositoryPath) return

    dispatch({ type: 'SET_IS_LOADING', payload: true })
    try {
      const result = await window.electronAPI.checkoutTo(state.rootRepositoryPath, repoPath, targetParentDir, folderName)
      if (result?.success) {
        await loadProjects()
        dispatch({ type: 'SET_MESSAGE', payload: result.message || '拉取成功' })
      } else {
        dispatch({ type: 'SET_MESSAGE', payload: result?.message || '拉取失败' })
      }
    } catch (error) {
      dispatch({ type: 'SET_MESSAGE', payload: '拉取失败：' + (error as Error).message })
    } finally {
      dispatch({ type: 'SET_IS_LOADING', payload: false })
    }
  }, [state.rootRepositoryPath, dispatch, loadProjects])

  const checkoutProject = useCallback(async (repoPath: string) => {
    if (!state.rootRepositoryPath) return

    dispatch({ type: 'SET_IS_LOADING', payload: true })
    try {
      const result = await window.electronAPI.checkoutProject(state.rootRepositoryPath, repoPath)
      if (result?.success) {
        await loadProjects()
        dispatch({ type: 'SET_MESSAGE', payload: result.message || 'Checkout 成功' })
      } else {
        dispatch({ type: 'SET_MESSAGE', payload: result?.message || 'Checkout 取消' })
      }
    } catch (error) {
      dispatch({ type: 'SET_MESSAGE', payload: 'Checkout 失败：' + (error as Error).message })
    } finally {
      dispatch({ type: 'SET_IS_LOADING', payload: false })
    }
  }, [state.rootRepositoryPath, dispatch, loadProjects])

  const openProject = useCallback(async (projectPath: string) => {
    const project = state.projects.find(p => p.path === projectPath)
    if (!project) return

    dispatch({ type: 'RESET_PROJECT_STATE' })
    dispatch({ type: 'SET_CURRENT_PROJECT', payload: project.path })
    dispatch({ type: 'SET_PROJECT_PATH', payload: project.path })
    dispatch({ type: 'SET_REPO_PATH', payload: project.repoPath })
    dispatch({ type: 'SET_CURRENT_VIEW', payload: 'dashboard' })

    try {
      const result = await window.electronAPI.isDBHTRepository(project.repoPath)
      dispatch({ type: 'SET_REPO_STATUS', payload: result })
      dispatch({ type: 'SET_MESSAGE', payload: result ? '当前目录是一个DBHT仓库。' : '当前目录不是DBHT仓库，可以初始化或创建仓库。' })
    } catch {
      dispatch({ type: 'SET_REPO_STATUS', payload: false })
    }
  }, [state.projects, dispatch])

  const removeProject = useCallback(async (projectPath: string) => {
    const project = state.projects.find(p => p.path === projectPath)
    if (!project) return

    dispatch({ type: 'SET_IS_LOADING', payload: true })
    try {
      // 仅从项目列表移除，断开关联，不删文件不删仓库
      const result = await window.electronAPI.unregisterProject(state.rootRepositoryPath, projectPath)
      if (result?.success) {
        await loadProjects()
        dispatch({ type: 'SET_MESSAGE', payload: `已从项目列表移除 "${project.name}"（文件和仓库不受影响）` })
      } else {
        dispatch({ type: 'SET_MESSAGE', payload: '移除失败：' + (result?.message || '未知错误') })
      }
    } catch (error) {
      dispatch({ type: 'SET_MESSAGE', payload: '移除失败：' + (error as Error).message })
    } finally {
      dispatch({ type: 'SET_IS_LOADING', payload: false })
    }
  }, [state.projects, dispatch, loadProjects])

  return { loadProjects, createProject, importProject, confirmImport, checkoutToProject, checkoutProject, openProject, removeProject }
}
