import { useEffect } from 'react'
import { useAppState } from './context/AppContext'
import { useI18n } from './i18n'
import TitleBar from './components/Layout/TitleBar'
import RootSetup from './components/Setup/RootSetup'
import RepoList from './components/Repository/RepoList'
import Dashboard from './components/Dashboard/Dashboard'
import CommitPanel from './components/Dashboard/CommitPanel'
import DiffViewer from './components/Dashboard/DiffViewer'
import GitRemoteModal from './components/Dashboard/GitRemoteModal'
import ConflictModal from './components/Dashboard/ConflictModal'
import OnboardingGuide from './components/Onboarding/OnboardingGuide'

function App() {
  const [state, dispatch] = useAppState()
  const { t } = useI18n()

  // Initialize: load root repository config
  useEffect(() => {
    const initApp = async () => {
      const result = await window.electronAPI.getRootRepository()
      if (result?.success && result.rootPath) {
        dispatch({ type: 'SET_ROOT_REPOSITORY_PATH', payload: result.rootPath })
        dispatch({ type: 'SET_IS_ROOT_REPO_CONFIGURED', payload: true })
        dispatch({ type: 'SET_CURRENT_VIEW', payload: 'repositories' })
        // Load projects directly using the path
        try {
          const projResult = await window.electronAPI.getProjects(result.rootPath)
          if (projResult?.success && projResult.projects) {
            dispatch({ type: 'SET_PROJECTS', payload: projResult.projects })
          }
        } catch { /* ignore load failure */ }
        // Check and fill missing DBHT-GUIDE.md for all projects
        try {
          await window.electronAPI.ensureProjectDocs(result.rootPath)
        } catch { /* ignore */ }
      } else {
        dispatch({ type: 'SET_CURRENT_VIEW', payload: 'repositories' })
      }
    }
    initApp()
  }, [dispatch])

  // Check onboarding when entering repositories view (covers both fresh start and after root setup)
  useEffect(() => {
    if (state.isRootRepoConfigured && state.currentView === 'repositories' && !state.showOnboarding) {
      window.electronAPI.getOnboardingStatus().then(obResult => {
        if (!obResult.completed) {
          dispatch({ type: 'SET_SHOW_ONBOARDING', payload: true })
        }
      }).catch(() => {})
    }
  }, [state.isRootRepoConfigured, state.currentView, dispatch])

  // Register menu shortcuts
  useEffect(() => {
    const unsub1 = window.electronAPI.onMenuNewProject(() =>
      dispatch({ type: 'SET_SHOW_CREATE_PROJECT_MODAL', payload: true })
    )
    const unsub2 = window.electronAPI.onMenuOpenProject(() => {
      if (state.isRootRepoConfigured) {
        dispatch({ type: 'SET_CURRENT_VIEW', payload: 'repositories' })
      }
    })
    return () => { unsub1(); unsub2() }
  }, [dispatch, state.isRootRepoConfigured])

  // Handle CLI actions from right-click context menu
  useEffect(() => {
    const unsub = window.electronAPI.onCliAction(async (data) => {
      const { action, path: targetPath } = data
      if (!state.isRootRepoConfigured || !state.rootRepositoryPath) return

      // 刷新项目列表
      const projResult = await window.electronAPI.getProjects(state.rootRepositoryPath)
      if (projResult?.success && projResult.projects) {
        dispatch({ type: 'SET_PROJECTS', payload: projResult.projects })
      }

      // 拉取文件：导航到项目列表，打开拉取弹窗
      if (action === 'pull') {
        dispatch({ type: 'SET_PENDING_CLI_ACTION', payload: { action: 'pull', targetPath } })
        dispatch({ type: 'SET_CURRENT_VIEW', payload: 'repositories' })
        return
      }

      // update / update-to / commit：需要版本管理的文件夹
      const resolved = await window.electronAPI.resolvePaths(targetPath)
      if (!resolved) {
        dispatch({ type: 'SET_MESSAGE', payload: t.app.notWorkingCopy })
        dispatch({ type: 'SET_CURRENT_VIEW', payload: 'repositories' })
        return
      }

      // 查找匹配的项目
      const projects = projResult?.projects || []
      let project = projects.find((p: any) =>
        targetPath.startsWith(p.path) || p.path === targetPath
      )

      // 工作副本不在列表中，尝试注册
      if (!project) {
        const regResult = await window.electronAPI.registerWorkingCopy(state.rootRepositoryPath, targetPath)
        if (regResult?.success) {
          const projResult2 = await window.electronAPI.getProjects(state.rootRepositoryPath)
          if (projResult2?.success && projResult2.projects) {
            dispatch({ type: 'SET_PROJECTS', payload: projResult2.projects })
            project = projResult2.projects.find((p: any) =>
              targetPath.startsWith(p.path) || p.path === targetPath
            )
          }
        }
      }

      if (!project) {
        dispatch({ type: 'SET_MESSAGE', payload: t.app.loadWorkingCopyFailed })
        dispatch({ type: 'SET_CURRENT_VIEW', payload: 'repositories' })
        return
      }

      // 导航到 Dashboard
      dispatch({ type: 'RESET_PROJECT_STATE' })
      dispatch({ type: 'SET_CURRENT_PROJECT', payload: project.path })
      dispatch({ type: 'SET_PROJECT_PATH', payload: project.path })
      dispatch({ type: 'SET_REPO_PATH', payload: project.repoPath })
      dispatch({ type: 'SET_CURRENT_VIEW', payload: 'dashboard' })

      if (action === 'update') {
        dispatch({ type: 'SET_ACTIVE_TAB', payload: 'overview' })
        dispatch({ type: 'SET_PENDING_CLI_ACTION', payload: { action: 'update', targetPath } })
      } else if (action === 'update-to') {
        dispatch({ type: 'SET_ACTIVE_TAB', payload: 'history' })
        dispatch({ type: 'SET_PENDING_CLI_ACTION', payload: { action: 'update-to', targetPath } })
      } else if (action === 'commit') {
        dispatch({ type: 'SET_ACTIVE_TAB', payload: 'overview' })
        dispatch({ type: 'SET_PENDING_CLI_ACTION', payload: { action: 'commit', targetPath } })
      }
    })
    return () => { unsub() }
  }, [dispatch, state.isRootRepoConfigured, state.rootRepositoryPath])

  // If not configured, show setup
  if (!state.isRootRepoConfigured || state.currentView === 'setup') {
    return (
      <>
        <TitleBar />
        <RootSetup />
      </>
    )
  }

  // Repositories view
  if (state.currentView === 'repositories') {
    return (
      <>
        <TitleBar />
        <RepoList />
        {state.commitPanelProject && <CommitPanel />}
        {state.diffModalFile && <DiffViewer />}
        {state.showOnboarding && <OnboardingGuide />}
      </>
    )
  }

  // Dashboard view
  return (
    <>
      <TitleBar />
      <Dashboard />
      {state.commitPanelProject && <CommitPanel />}
      {state.diffModalFile && <DiffViewer />}
      {state.showGitRemoteModal && <GitRemoteModal />}
      {state.showConflictModal && <ConflictModal />}
    </>
  )
}

export default App
