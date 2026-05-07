import { createContext, useContext, useReducer, type ReactNode } from 'react'
import type { ConflictFile, GitSyncStatus } from '../types/electron'

// --- Types ---

export interface Project {
  name: string
  path: string       // 工作副本路径（用户文件所在位置）
  repoPath: string   // 集中仓库路径（repositories/<name>）
  status: string
  lastUpdate?: string
  hasChanges?: boolean
}

export interface AppState {
  // Navigation
  currentView: 'setup' | 'repositories' | 'dashboard'
  activeTab: 'overview' | 'files' | 'history' | 'settings' | 'about'

  // Root repository
  rootRepositoryPath: string
  isRootRepoConfigured: boolean

  // Projects
  projects: Project[]
  currentProject: string | null
  projectPath: string   // 工作副本路径
  repoPath: string      // 集中仓库路径

  // UI state
  isLoading: boolean
  message: string
  showSettingsModal: boolean
  showCreateProjectModal: boolean
  isMaximized: boolean

  // Version control
  repoStatus: boolean | null
  statusLines: string[]
  selectedFiles: string[]
  historyText: string
  commitMessage: string
  rollbackVersion: string
  repositoryInfo: string

  // File management
  managedFiles: string[]
  editingFile: string | null
  fileContent: string
  newFileName: string
  newProjectName: string

  // Diff / Commit panel
  commitPanelProject: string | null
  commitPanelFiles: Array<{ path: string; status: string }>
  diffModalFile: string | null
  diffContent: string
  fileTree: string[]

  // CLI 右键菜单待处理动作
  pendingCliAction: string | null
  cliTargetPath: string

  // 新手引导
  showOnboarding: boolean

  // Git 远程同步
  gitSyncStatus: GitSyncStatus | null
  gitConflicts: ConflictFile[]
  showGitRemoteModal: boolean
  showConflictModal: boolean
  gitProgress: string
  gitAuthorName: string
  gitAuthorEmail: string
}

export type AppAction =
  | { type: 'RESET_PROJECT_STATE' }
  | { type: 'SET_CURRENT_VIEW'; payload: AppState['currentView'] }
  | { type: 'SET_ACTIVE_TAB'; payload: AppState['activeTab'] }
  | { type: 'SET_ROOT_REPOSITORY_PATH'; payload: string }
  | { type: 'SET_IS_ROOT_REPO_CONFIGURED'; payload: boolean }
  | { type: 'SET_PROJECTS'; payload: Project[] }
  | { type: 'SET_CURRENT_PROJECT'; payload: string | null }
  | { type: 'SET_PROJECT_PATH'; payload: string }
  | { type: 'SET_REPO_PATH'; payload: string }
  | { type: 'SET_IS_LOADING'; payload: boolean }
  | { type: 'SET_MESSAGE'; payload: string }
  | { type: 'SET_SHOW_SETTINGS_MODAL'; payload: boolean }
  | { type: 'SET_SHOW_CREATE_PROJECT_MODAL'; payload: boolean }
  | { type: 'SET_IS_MAXIMIZED'; payload: boolean }
  | { type: 'SET_REPO_STATUS'; payload: boolean | null }
  | { type: 'SET_STATUS_LINES'; payload: string[] }
  | { type: 'SET_SELECTED_FILES'; payload: string[] }
  | { type: 'TOGGLE_SELECTED_FILE'; payload: string }
  | { type: 'SET_HISTORY_TEXT'; payload: string }
  | { type: 'SET_COMMIT_MESSAGE'; payload: string }
  | { type: 'SET_ROLLBACK_VERSION'; payload: string }
  | { type: 'SET_REPOSITORY_INFO'; payload: string }
  | { type: 'SET_MANAGED_FILES'; payload: string[] }
  | { type: 'SET_EDITING_FILE'; payload: string | null }
  | { type: 'SET_FILE_CONTENT'; payload: string }
  | { type: 'SET_NEW_FILE_NAME'; payload: string }
  | { type: 'SET_NEW_PROJECT_NAME'; payload: string }
  | { type: 'SET_COMMIT_PANEL_PROJECT'; payload: string | null }
  | { type: 'SET_COMMIT_PANEL_FILES'; payload: Array<{ path: string; status: string }> }
  | { type: 'SET_DIFF_MODAL_FILE'; payload: string | null }
  | { type: 'SET_DIFF_CONTENT'; payload: string }
  | { type: 'SET_FILE_TREE'; payload: string[] }
  | { type: 'SET_PENDING_CLI_ACTION'; payload: { action: string | null; targetPath: string } }
  | { type: 'SET_GIT_SYNC_STATUS'; payload: GitSyncStatus | null }
  | { type: 'SET_GIT_CONFLICTS'; payload: ConflictFile[] }
  | { type: 'SET_SHOW_GIT_REMOTE_MODAL'; payload: boolean }
  | { type: 'SET_SHOW_CONFLICT_MODAL'; payload: boolean }
  | { type: 'SET_GIT_PROGRESS'; payload: string }
  | { type: 'SET_GIT_AUTHOR_NAME'; payload: string }
  | { type: 'SET_GIT_AUTHOR_EMAIL'; payload: string }
  | { type: 'SET_SHOW_ONBOARDING'; payload: boolean }

// --- Initial state ---

const initialState: AppState = {
  currentView: 'setup',
  activeTab: 'overview',

  rootRepositoryPath: '',
  isRootRepoConfigured: false,

  projects: [],
  currentProject: null,
  projectPath: '',
  repoPath: '',

  isLoading: false,
  message: '\u6B22\u8FCE\u4F7F\u7528 DBHT \u7248\u672C\u7BA1\u7406\u7CFB\u7EDF',
  showSettingsModal: false,
  showCreateProjectModal: false,
  isMaximized: false,

  repoStatus: null,
  statusLines: [],
  selectedFiles: [],
  historyText: '',
  commitMessage: '\u66F4\u65B0\u63D0\u4EA4',
  rollbackVersion: '',
  repositoryInfo: '',

  managedFiles: [],
  editingFile: null,
  fileContent: '',
  newFileName: '',
  newProjectName: '',

  commitPanelProject: null,
  commitPanelFiles: [],
  diffModalFile: null,
  diffContent: '',
  fileTree: [],

  pendingCliAction: null,
  cliTargetPath: '',

  gitSyncStatus: null,
  gitConflicts: [],
  showGitRemoteModal: false,
  showConflictModal: false,
  gitProgress: '',
  gitAuthorName: '',
  gitAuthorEmail: '',

  showOnboarding: false,
}

// --- Reducer ---

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'RESET_PROJECT_STATE':
      return {
        ...state,
        activeTab: 'overview',
        repoStatus: null,
        repoPath: '',
        statusLines: [],
        selectedFiles: [],
        historyText: '',
        commitMessage: '',
        rollbackVersion: '',
        repositoryInfo: '',
        managedFiles: [],
        editingFile: null,
        fileContent: '',
        newFileName: '',
        commitPanelProject: null,
        commitPanelFiles: [],
        diffModalFile: null,
        diffContent: '',
        fileTree: [],
        gitSyncStatus: null,
        gitConflicts: [],
        showGitRemoteModal: false,
        showConflictModal: false,
        gitProgress: '',
      }
    case 'SET_CURRENT_VIEW':
      return { ...state, currentView: action.payload }
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload }
    case 'SET_ROOT_REPOSITORY_PATH':
      return { ...state, rootRepositoryPath: action.payload }
    case 'SET_IS_ROOT_REPO_CONFIGURED':
      return { ...state, isRootRepoConfigured: action.payload }
    case 'SET_PROJECTS':
      return { ...state, projects: action.payload }
    case 'SET_CURRENT_PROJECT':
      return { ...state, currentProject: action.payload }
    case 'SET_PROJECT_PATH':
      return { ...state, projectPath: action.payload }
    case 'SET_REPO_PATH':
      return { ...state, repoPath: action.payload }
    case 'SET_IS_LOADING':
      return { ...state, isLoading: action.payload }
    case 'SET_MESSAGE':
      return { ...state, message: action.payload }
    case 'SET_SHOW_SETTINGS_MODAL':
      return { ...state, showSettingsModal: action.payload }
    case 'SET_SHOW_CREATE_PROJECT_MODAL':
      return { ...state, showCreateProjectModal: action.payload }
    case 'SET_IS_MAXIMIZED':
      return { ...state, isMaximized: action.payload }
    case 'SET_REPO_STATUS':
      return { ...state, repoStatus: action.payload }
    case 'SET_STATUS_LINES':
      return { ...state, statusLines: action.payload }
    case 'SET_SELECTED_FILES':
      return { ...state, selectedFiles: action.payload }
    case 'TOGGLE_SELECTED_FILE':
      return {
        ...state,
        selectedFiles: state.selectedFiles.includes(action.payload)
          ? state.selectedFiles.filter(f => f !== action.payload)
          : [...state.selectedFiles, action.payload],
      }
    case 'SET_HISTORY_TEXT':
      return { ...state, historyText: action.payload }
    case 'SET_COMMIT_MESSAGE':
      return { ...state, commitMessage: action.payload }
    case 'SET_ROLLBACK_VERSION':
      return { ...state, rollbackVersion: action.payload }
    case 'SET_REPOSITORY_INFO':
      return { ...state, repositoryInfo: action.payload }
    case 'SET_MANAGED_FILES':
      return { ...state, managedFiles: action.payload }
    case 'SET_EDITING_FILE':
      return { ...state, editingFile: action.payload }
    case 'SET_FILE_CONTENT':
      return { ...state, fileContent: action.payload }
    case 'SET_NEW_FILE_NAME':
      return { ...state, newFileName: action.payload }
    case 'SET_NEW_PROJECT_NAME':
      return { ...state, newProjectName: action.payload }
    case 'SET_COMMIT_PANEL_PROJECT':
      return { ...state, commitPanelProject: action.payload }
    case 'SET_COMMIT_PANEL_FILES':
      return { ...state, commitPanelFiles: action.payload }
    case 'SET_DIFF_MODAL_FILE':
      return { ...state, diffModalFile: action.payload }
    case 'SET_DIFF_CONTENT':
      return { ...state, diffContent: action.payload }
    case 'SET_FILE_TREE':
      return { ...state, fileTree: action.payload }
    case 'SET_PENDING_CLI_ACTION':
      return { ...state, pendingCliAction: action.payload.action, cliTargetPath: action.payload.targetPath }
    case 'SET_GIT_SYNC_STATUS':
      return { ...state, gitSyncStatus: action.payload }
    case 'SET_GIT_CONFLICTS':
      return { ...state, gitConflicts: action.payload }
    case 'SET_SHOW_GIT_REMOTE_MODAL':
      return { ...state, showGitRemoteModal: action.payload }
    case 'SET_SHOW_CONFLICT_MODAL':
      return { ...state, showConflictModal: action.payload }
    case 'SET_GIT_PROGRESS':
      return { ...state, gitProgress: action.payload }
    case 'SET_GIT_AUTHOR_NAME':
      return { ...state, gitAuthorName: action.payload }
    case 'SET_GIT_AUTHOR_EMAIL':
      return { ...state, gitAuthorEmail: action.payload }
    case 'SET_SHOW_ONBOARDING':
      return { ...state, showOnboarding: action.payload }
    default:
      return state
  }
}

// --- Context ---

interface AppContextValue {
  state: AppState
  dispatch: React.Dispatch<AppAction>
}

const AppContext = createContext<AppContextValue | null>(null)

// --- Provider ---

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

// --- Hook ---

export function useAppState(): [AppState, React.Dispatch<AppAction>] {
  const ctx = useContext(AppContext)
  if (!ctx) {
    throw new Error('useAppState must be used within an AppProvider')
  }
  return [ctx.state, ctx.dispatch]
}
