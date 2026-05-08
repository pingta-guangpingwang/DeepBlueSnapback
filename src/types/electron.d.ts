export interface ElectronAPI {
  minimizeWindow: () => Promise<void>
  maximizeWindow: () => Promise<void>
  closeWindow: () => Promise<void>
  isMaximized: () => Promise<boolean>
  selectFolder: () => Promise<string | null>
  isEmptyFolder: (path: string) => Promise<boolean>
  readFile: (path: string) => Promise<{ success: boolean; content?: string; error?: string }>
  createFile: (path: string) => Promise<{ success: boolean; message?: string }>
  writeFile: (path: string, content: string) => Promise<{ success: boolean; message?: string }>
  deleteFile: (path: string) => Promise<{ success: boolean; message?: string }>
  listFiles: (path: string) => Promise<{ success: boolean; files?: Array<{ name: string; path: string; isDirectory: boolean }>; message?: string; errors?: string[] }>
  copyDir: (src: string, dest: string) => Promise<{ success: boolean; message?: string }>
  pathJoin: (...paths: string[]) => Promise<{ result: string }>
  pathBasename: (filePath: string) => Promise<{ result: string }>

  // DBHT 操作（SVN 风格）
  isDBHTRepository: (path: string) => Promise<boolean>
  createRepository: (repoPath: string, name: string) => Promise<{ success: boolean; message?: string }>
  createProject: (rootPath: string, projectName: string, customPath?: string) => Promise<{ success: boolean; message?: string }>
  getProjects: (rootPath: string) => Promise<{ success: boolean; projects?: Array<{
    name: string; path: string; repoPath: string; status: string; lastUpdate?: string; hasChanges?: boolean
  }>; message?: string }>
  registerProject: (rootPath: string, projectPath: string, projectName?: string, initWithCommit?: boolean) => Promise<{ success: boolean; message?: string }>
  checkoutProject: (rootPath: string, repoPath: string) => Promise<{ success: boolean; message?: string; targetPath?: string }>
  initRepository: (repoPath: string) => Promise<{ success: boolean; message?: string }>
  getStatus: (repoPath: string, workingCopyPath: string) => Promise<{ success: boolean; status?: string[]; message?: string }>
  getFileTree: (workingCopyPath: string) => Promise<{ success: boolean; files?: Array<{ name: string; path: string }>; message?: string }>
  commit: (repoPath: string, workingCopyPath: string, message: string, files: string[], options?: { summary?: string; author?: string; sessionId?: string }) => Promise<{ success: boolean; message?: string }>
  getHistory: (repoPath: string) => Promise<{ success: boolean; history?: string; message?: string }>
  rollback: (repoPath: string, workingCopyPath: string, version: string) => Promise<{ success: boolean; message?: string }>
  rollbackFile: (repoPath: string, workingCopyPath: string, version: string, filePath: string) => Promise<{ success: boolean; message?: string }>
  undoRollback: (repoPath: string, workingCopyPath: string) => Promise<{ success: boolean; message?: string }>
  rollbackAI: (repoPath: string, workingCopyPath: string, sessionId: string) => Promise<{ success: boolean; message?: string; targetVersion?: string }>
  revertFiles: (repoPath: string, workingCopyPath: string, filePaths: string[]) => Promise<{ success: boolean; message: string; reverted: string[] }>
  autoSnapshotStart: (repoPath: string, workingCopyPath: string, intervalMinutes: number) => Promise<{ success: boolean; message: string }>
  autoSnapshotStop: () => Promise<{ success: boolean; message: string }>
  onAutoSnapshotResult: (callback: (result: { success: boolean; message?: string }) => void) => () => void
  update: (repoPath: string, workingCopyPath: string) => Promise<{ success: boolean; message?: string }>
  getDiff: (repoPath: string, workingCopyPath: string, filePath: string, versionA?: string, versionB?: string) => Promise<{ success: boolean; diff?: string; message?: string }>
  getDiffSummary: (repoPath: string, workingCopyPath: string) => Promise<{
    success: boolean
    files?: Array<{ path: string; status: string; added: number; removed: number }>
    totalAdded?: number
    totalRemoved?: number
    message?: string
  }>
  getDiffContent: (repoPath: string, workingCopyPath: string, filePath: string, versionA?: string, versionB?: string) => Promise<{ success: boolean; oldContent?: string; newContent?: string; message?: string }>
  diffImpact: (repoPath: string, workingCopyPath: string, commitId: string) => Promise<{ success: boolean; report?: Record<string, unknown>; message?: string }>
  deleteRepository: (repoPath: string) => Promise<{ success: boolean; message?: string }>
  deleteRepositoryFull: (rootPath: string, repoPath: string, deleteWorkingCopies: boolean) => Promise<{ success: boolean; message: string; deletedCopies?: string[] }>
  verify: (repoPath: string) => Promise<{ success: boolean; valid: boolean; errors: string[]; message?: string }>
  getHistoryStructured: (repoPath: string) => Promise<{ success: boolean; commits?: Array<{ id: string; message: string; timestamp: string; fileCount: number; totalSize: number }>; message?: string }>
  getRepositoryInfo: (repoPath: string) => Promise<{ success: boolean; info?: string; message?: string }>
  getCommitDetail: (repoPath: string, commitId: string) => Promise<{ id: string; message: string; timestamp: string; files: Array<{ path: string; hash: string; size: number }>; parentVersion: string | null; totalSize: number } | null>
  getBlobContent: (repoPath: string, hash: string) => Promise<{ success: boolean; content?: string }>
  resolvePaths: (inputPath: string) => Promise<{ repoPath: string; workingCopyPath: string } | null>
  listRepositories: (rootPath: string) => Promise<{ success: boolean; repos: Array<{
    name: string; path: string; created: string; currentVersion: string | null;
    totalCommits: number; totalSize: number; blobCount: number; workingCopies: string[]
  }> }>
  createRootRepository: (path: string) => Promise<{ success: boolean; message?: string }>
  getRootRepository: () => Promise<{ success: boolean; rootPath?: string | null }>
  saveRootRepository: (path: string) => Promise<{ success: boolean; message?: string }>
  registerCLI: () => Promise<{ success: boolean; message: string }>
  isCLIRegistered: () => Promise<{ registered: boolean }>
  openFolder: (path: string) => Promise<void>
  checkAdmin: () => Promise<boolean>

  // 菜单事件
  onMenuNewProject: (callback: () => void) => () => void
  onMenuOpenProject: (callback: () => void) => () => void
  onMenuAbout: (callback: () => void) => () => void

  // 右键菜单
  registerContextMenu: () => Promise<{ success: boolean; message: string }>
  unregisterContextMenu: () => Promise<{ success: boolean; message: string }>
  isContextMenuRegistered: () => Promise<boolean>
  onCliAction: (callback: (data: { action: string; path: string }) => void) => () => void

  // Checkout 到指定目录
  checkoutTo: (rootPath: string, repoPath: string, targetParentDir: string, folderName: string) => Promise<{ success: boolean; message: string; targetPath?: string; projectName?: string }>

  // 注册已有工作副本
  registerWorkingCopy: (rootPath: string, workingCopyPath: string) => Promise<{ success: boolean; message: string; projectName?: string; repoPath?: string }>

  // 从项目列表移除工作副本
  unregisterProject: (rootPath: string, workingCopyPath: string) => Promise<{ success: boolean; message: string }>

  // 启动检查：补全项目 DBHT-GUIDE.md
  ensureProjectDocs: (rootPath: string) => Promise<{ success: boolean; added: number; total: number; message?: string }>

  // Git Remote Sync
  gitConnect: (workingCopyPath: string, remoteUrl: string, branch: string, username: string, token: string) => Promise<{ success: boolean; message: string }>
  gitDisconnect: (workingCopyPath: string) => Promise<{ success: boolean; message: string }>
  gitSyncStatus: (workingCopyPath: string) => Promise<GitSyncStatus>
  gitPull: (workingCopyPath: string, username: string, token: string) => Promise<{ success: boolean; message: string; conflicts?: ConflictFile[] }>
  gitPush: (workingCopyPath: string, commitMessage: string, authorName: string, authorEmail: string, username: string, token: string) => Promise<{ success: boolean; message: string }>
  gitResolveConflict: (workingCopyPath: string, filePath: string, resolution: 'ours' | 'theirs') => Promise<{ success: boolean; message: string }>
  gitCommitMerge: (workingCopyPath: string, authorName: string, authorEmail: string) => Promise<{ success: boolean; message: string }>
  gitGetCredentials: () => Promise<Record<string, { username: string; token: string }>>
  gitSaveCredential: (host: string, username: string, token: string) => Promise<{ success: boolean; message: string }>
  gitDeleteCredential: (host: string) => Promise<{ success: boolean; message: string }>
  onGitProgress: (callback: (msg: string) => void) => () => void

  // LAN Server
  lanStart: (rootPath: string, port?: number) => Promise<{ success: boolean; address: string; message: string }>
  lanStop: () => Promise<{ success: boolean; message: string }>
  lanStatus: () => Promise<{ running: boolean; rootPath: string }>

  // 新手引导
  getOnboardingStatus: () => Promise<{ completed: boolean }>
  setOnboardingCompleted: (completed: boolean) => Promise<{ success: boolean; message?: string }>

  // AST & Graph
  parseProject: (repoPath: string, workingCopyPath: string) => Promise<{ success: boolean; files: Array<Record<string, unknown>>; errors: string[]; totalFiles: number; cachedFiles: number }>
  buildGraph: (repoPath: string, workingCopyPath: string, commitId: string, projectName: string) => Promise<{ success: boolean; graph?: Record<string, unknown>; message?: string }>
  onGraphProgress: (callback: (msg: string) => void) => () => void
  getGraph: (commitId: string) => Promise<{ success: boolean; graph?: Record<string, unknown>; message?: string }>
  listGraphVersions: () => Promise<{ success: boolean; versions: string[]; message?: string }>
  compareGraphs: (versionA: string, versionB: string) => Promise<{ success: boolean; diff?: Record<string, unknown>; message?: string }>

  // Version switching
  switchToVersionReadonly: (repoPath: string, version: string) => Promise<{ success: boolean; viewPath?: string; files?: Array<{ path: string; hash: string; size: number }>; message?: string }>
  releaseVersionReadonly: (version: string) => Promise<{ success: boolean; message?: string }>
  getVersionFileList: (repoPath: string, version: string) => Promise<{ success: boolean; files?: Array<{ path: string; hash: string; size: number }>; message?: string }>
  getVersionFileContent: (repoPath: string, version: string, filePath: string) => Promise<{ success: boolean; content?: string; message?: string }>

  // Graph
  getRagContext: (commitId: string) => Promise<{ success: boolean; context?: Record<string, unknown>; message?: string }>

  // Vector Database
  vectorIndex: (repoPath: string, workingCopyPath: string, commitId: string, projectName: string, filePaths?: string[]) =>
    Promise<{ success: boolean; index?: VectorIndexInfo; message?: string }>
  vectorStatus: (projectName: string) => Promise<{ success: boolean; index?: VectorIndexInfo; message?: string }>
  vectorDelete: (projectName: string) => Promise<{ success: boolean; message?: string }>
  vectorSearch: (projectName: string, query: VectorQuery) => Promise<{ success: boolean; results: VectorSearchResult[]; message?: string }>
  vectorSearchBatch: (projectName: string, queries: VectorQuery[]) => Promise<{ success: boolean; results: VectorSearchResult[][]; message?: string }>
  vectorEnhanceRag: (projectName: string, query: string, topK?: number) => Promise<{ success: boolean; vectorResults: VectorSearchResult[]; message?: string }>
  vectorFiles: (projectName: string) => Promise<{ success: boolean; files: IndexedFileInfo[]; message?: string }>
  vectorFileChunks: (projectName: string, filePath: string) => Promise<{ success: boolean; chunks: VectorChunkInfo[]; message?: string }>
  vectorRemoveFiles: (workingCopyPath: string, commitId: string, projectName: string, filePaths: string[]) =>
    Promise<{ success: boolean; index?: VectorIndexInfo; message?: string }>
  vectorExport: (projectName: string) => Promise<{ success: boolean; data?: string; message?: string }>
  vectorImport: (projectName: string, data: string) => Promise<{ success: boolean; index?: VectorIndexInfo; message?: string }>
  onVectorProgress: (callback: (msg: string) => void) => () => void
  onProjectProgress: (callback: (msg: string) => void) => () => void
  vectorIngestFiles: (projectName: string, filePaths: string[], workingCopyPath: string, commitId: string) =>
    Promise<IngestFilesResult>
  vectorOpenFilesDialog: () => Promise<{ canceled: boolean; filePaths: string[] }>
  vectorOpenFolderDialog: () => Promise<{ canceled: boolean; filePaths: string[] }>
  vectorGetSupportedExtensions: () => Promise<{ extensions: SupportedExtension[] }>

  // Quality & health
  analyzeQuality: (commitId: string) => Promise<{ success: boolean; report?: Record<string, unknown>; message?: string }>

  // External API
  externalApiStart: () => Promise<{ success: boolean; message: string; port?: number; address?: string }>
  externalApiStop: () => Promise<{ success: boolean; message: string }>
  externalApiStatus: () => Promise<{ running: boolean; port: number }>
  externalApiGetConfig: () => Promise<{ enabled: boolean; port: number; token: string }>
  externalApiSaveConfig: (config: { enabled: boolean; port: number; token: string }) => Promise<{ success: boolean; message: string }>

}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export interface ConflictFile {
  path: string
  isBinary: boolean
}

export interface GitSyncStatus {
  connected: boolean
  remoteUrl?: string
  branch?: string
  ahead: number
  behind: number
  lastSync?: string
  hasChanges: boolean
}

export interface VectorIndexInfo {
  schemaVersion: number
  projectName: string
  commitId: string
  model: string
  dimensions: number
  totalChunks: number
  totalFiles: number
  totalTokens: number
  createdAt: string
  updatedAt: string
}

export interface VectorQuery {
  text: string
  topK?: number
  minSimilarity?: number
  fileTypes?: string[]
  nodeId?: string
  searchMode?: 'hybrid' | 'vector' | 'bm25'
}

export interface VectorSearchResult {
  chunk: { id: string; filePath: string; startLine: number; endLine: number; content: string; tokenCount: number; language: string; nodeId?: string }
  similarity: number
  rank: number
}

export interface IndexedFileInfo {
  filePath: string
  chunkCount: number
  totalChars: number
  language: string
}

export interface VectorChunkInfo {
  id: string
  filePath: string
  startLine: number
  endLine: number
  content: string
  tokenCount: number
  language: string
}

export interface IngestFilesResult {
  success: boolean
  projectName: string
  filesProcessed: number
  filesSucceeded: number
  filesFailed: number
  totalChunksAdded: number
  fileResults: Array<{
    name: string
    success: boolean
    chunksAdded: number
    error?: string
  }>
  updatedIndex?: VectorIndexInfo
  message?: string
}

export interface SupportedExtension {
  extension: string
  description: string
  category: 'document' | 'code' | 'data' | 'web'
}

export {}
