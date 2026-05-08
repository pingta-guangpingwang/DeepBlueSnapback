import { contextBridge, ipcRenderer } from 'electron'

// 向渲染进程暴露API
contextBridge.exposeInMainWorld('electronAPI', {
  // 窗口控制
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),

  // 对话框
  selectFolder: () => ipcRenderer.invoke('dialog:select-folder'),

  // 文件系统
  isEmptyFolder: (path: string) => ipcRenderer.invoke('fs:is-empty-folder', path),
  readFile: (path: string) => ipcRenderer.invoke('fs:read-file', path),
  createFile: (path: string) => ipcRenderer.invoke('fs:create-file', path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke('fs:write-file', path, content),
  deleteFile: (path: string) => ipcRenderer.invoke('fs:delete-file', path),
  listFiles: (path: string) => ipcRenderer.invoke('fs:list-files', path),
  copyDir: (src: string, dest: string) => ipcRenderer.invoke('fs:copy-dir', src, dest),
  pathJoin: (...paths: string[]) => ipcRenderer.invoke('fs:path-join', ...paths),
  pathBasename: (filePath: string) => ipcRenderer.invoke('fs:path-basename', filePath),

  // DBHT操作（SVN 风格：repoPath = 集中仓库, workingCopyPath = 工作副本）
  isDBHTRepository: (path: string) => ipcRenderer.invoke('dbgvs:is-repository', path),
  createRepository: (repoPath: string, name: string) => ipcRenderer.invoke('dbgvs:create-repository', repoPath, name),
  createProject: (rootPath: string, projectName: string, customPath?: string) => ipcRenderer.invoke('dbgvs:create-project', rootPath, projectName, customPath),
  getProjects: (rootPath: string) => ipcRenderer.invoke('dbgvs:get-projects', rootPath),
  registerProject: (rootPath: string, projectPath: string, projectName?: string, initWithCommit?: boolean) => ipcRenderer.invoke('dbgvs:register-project', rootPath, projectPath, projectName, initWithCommit),
  checkoutProject: (rootPath: string, repoPath: string) => ipcRenderer.invoke('dbgvs:checkout-project', rootPath, repoPath),
  initRepository: (repoPath: string) => ipcRenderer.invoke('dbgvs:init-repository', repoPath),
  getStatus: (repoPath: string, workingCopyPath: string) => ipcRenderer.invoke('dbgvs:get-status', repoPath, workingCopyPath),
  getFileTree: (workingCopyPath: string) => ipcRenderer.invoke('dbgvs:get-file-tree', workingCopyPath),
  commit: (repoPath: string, workingCopyPath: string, message: string, files: string[], options?: { summary?: string; author?: string; sessionId?: string }) =>
    ipcRenderer.invoke('dbgvs:commit', repoPath, workingCopyPath, message, files, options),
  getHistory: (repoPath: string) => ipcRenderer.invoke('dbgvs:get-history', repoPath),
  rollback: (repoPath: string, workingCopyPath: string, version: string) =>
    ipcRenderer.invoke('dbgvs:rollback', repoPath, workingCopyPath, version),
  rollbackFile: (repoPath: string, workingCopyPath: string, version: string, filePath: string) =>
    ipcRenderer.invoke('dbgvs:rollback-file', repoPath, workingCopyPath, version, filePath),
  undoRollback: (repoPath: string, workingCopyPath: string) =>
    ipcRenderer.invoke('dbgvs:undo-rollback', repoPath, workingCopyPath),
  rollbackAI: (repoPath: string, workingCopyPath: string, sessionId: string) =>
    ipcRenderer.invoke('dbgvs:rollback-ai', repoPath, workingCopyPath, sessionId),
  revertFiles: (repoPath: string, workingCopyPath: string, filePaths: string[]) =>
    ipcRenderer.invoke('dbgvs:revert-files', repoPath, workingCopyPath, filePaths),
  autoSnapshotStart: (repoPath: string, workingCopyPath: string, intervalMinutes: number) =>
    ipcRenderer.invoke('dbgvs:auto-snapshot-start', repoPath, workingCopyPath, intervalMinutes),
  autoSnapshotStop: () =>
    ipcRenderer.invoke('dbgvs:auto-snapshot-stop'),
  onAutoSnapshotResult: (callback: (result: { success: boolean; message?: string }) => void) => {
    ipcRenderer.on('auto-snapshot:result', (_, result) => callback(result))
    return () => ipcRenderer.removeAllListeners('auto-snapshot:result')
  },
  update: (repoPath: string, workingCopyPath: string) =>
    ipcRenderer.invoke('dbgvs:update', repoPath, workingCopyPath),
  getDiff: (repoPath: string, workingCopyPath: string, filePath: string, versionA?: string, versionB?: string) =>
    ipcRenderer.invoke('dbgvs:get-diff', repoPath, workingCopyPath, filePath, versionA, versionB),
  getDiffSummary: (repoPath: string, workingCopyPath: string) =>
    ipcRenderer.invoke('dbgvs:get-diff-summary', repoPath, workingCopyPath),
  getDiffContent: (repoPath: string, workingCopyPath: string, filePath: string, versionA?: string, versionB?: string) =>
    ipcRenderer.invoke('dbgvs:get-diff-content', repoPath, workingCopyPath, filePath, versionA, versionB),
  deleteRepository: (repoPath: string) => ipcRenderer.invoke('dbgvs:delete-repository', repoPath),
  deleteRepositoryFull: (rootPath: string, repoPath: string, deleteWorkingCopies: boolean) =>
    ipcRenderer.invoke('dbgvs:delete-repository-full', rootPath, repoPath, deleteWorkingCopies),
  verify: (repoPath: string) => ipcRenderer.invoke('dbgvs:verify', repoPath),
  getHistoryStructured: (repoPath: string) => ipcRenderer.invoke('dbgvs:get-history-structured', repoPath),
  getRepositoryInfo: (repoPath: string) => ipcRenderer.invoke('dbgvs:get-repository-info', repoPath),
  getCommitDetail: (repoPath: string, commitId: string) => ipcRenderer.invoke('dbgvs:get-commit-detail', repoPath, commitId),
  getBlobContent: (repoPath: string, hash: string) => ipcRenderer.invoke('dbgvs:get-blob-content', repoPath, hash),
  resolvePaths: (inputPath: string) => ipcRenderer.invoke('dbgvs:resolve-paths', inputPath),
  listRepositories: (rootPath: string) => ipcRenderer.invoke('dbgvs:list-repositories', rootPath),
  createRootRepository: (path: string) => ipcRenderer.invoke('dbgvs:create-root-repository', path),
  getRootRepository: () => ipcRenderer.invoke('dbgvs:get-root-repository'),
  saveRootRepository: (path: string) => ipcRenderer.invoke('dbgvs:save-root-repository', path),
  registerCLI: () => ipcRenderer.invoke('dbgvs:register-cli'),
  isCLIRegistered: () => ipcRenderer.invoke('dbgvs:is-cli-registered'),

  // Shell
  openFolder: (path: string) => ipcRenderer.invoke('shell:open-folder', path),

  // 系统
  checkAdmin: () => ipcRenderer.invoke('system:check-admin'),

  // 菜单事件
  onMenuNewProject: (callback: () => void) => {
    ipcRenderer.on('menu:new-project', callback)
    return () => ipcRenderer.removeListener('menu:new-project', callback)
  },
  onMenuOpenProject: (callback: () => void) => {
    ipcRenderer.on('menu:open-project', callback)
    return () => ipcRenderer.removeListener('menu:open-project', callback)
  },
  onMenuAbout: (callback: () => void) => {
    ipcRenderer.on('menu:about', callback)
    return () => ipcRenderer.removeListener('menu:about', callback)
  },

  // Git Remote Sync
  gitConnect: (workingCopyPath: string, remoteUrl: string, branch: string, username: string, token: string) =>
    ipcRenderer.invoke('git:connect', workingCopyPath, remoteUrl, branch, username, token),
  gitDisconnect: (workingCopyPath: string) =>
    ipcRenderer.invoke('git:disconnect', workingCopyPath),
  gitSyncStatus: (workingCopyPath: string) =>
    ipcRenderer.invoke('git:sync-status', workingCopyPath),
  gitPull: (workingCopyPath: string, username: string, token: string) =>
    ipcRenderer.invoke('git:pull', workingCopyPath, username, token),
  gitPush: (workingCopyPath: string, commitMessage: string, authorName: string, authorEmail: string, username: string, token: string) =>
    ipcRenderer.invoke('git:push', workingCopyPath, commitMessage, authorName, authorEmail, username, token),
  gitResolveConflict: (workingCopyPath: string, filePath: string, resolution: 'ours' | 'theirs') =>
    ipcRenderer.invoke('git:resolve-conflict', workingCopyPath, filePath, resolution),
  gitCommitMerge: (workingCopyPath: string, authorName: string, authorEmail: string) =>
    ipcRenderer.invoke('git:commit-merge', workingCopyPath, authorName, authorEmail),
  gitGetCredentials: () =>
    ipcRenderer.invoke('git:get-credentials'),
  gitSaveCredential: (host: string, username: string, token: string) =>
    ipcRenderer.invoke('git:save-credential', host, username, token),
  gitDeleteCredential: (host: string) =>
    ipcRenderer.invoke('git:delete-credential', host),
  onGitProgress: (callback: (msg: string) => void) => {
    ipcRenderer.on('git:progress', (_, msg) => callback(msg))
    return () => ipcRenderer.removeAllListeners('git:progress')
  },
  onGraphProgress: (callback: (msg: string) => void) => {
    ipcRenderer.on('graph:progress', (_, msg) => callback(msg))
    return () => ipcRenderer.removeAllListeners('graph:progress')
  },

  // Vector Database
  vectorIndex: (repoPath: string, workingCopyPath: string, commitId: string, projectName: string, filePaths?: string[]) =>
    ipcRenderer.invoke('vector:index', repoPath, workingCopyPath, commitId, projectName, filePaths),
  vectorStatus: (projectName: string) =>
    ipcRenderer.invoke('vector:status', projectName),
  vectorDelete: (projectName: string) =>
    ipcRenderer.invoke('vector:delete', projectName),
  vectorSearch: (projectName: string, query: { text: string; topK?: number; minSimilarity?: number; fileTypes?: string[] }) =>
    ipcRenderer.invoke('vector:search', projectName, query),
  vectorSearchBatch: (projectName: string, queries: { text: string; topK?: number; minSimilarity?: number; fileTypes?: string[] }[]) =>
    ipcRenderer.invoke('vector:search-batch', projectName, queries),
  vectorEnhanceRag: (projectName: string, query: string, topK?: number) =>
    ipcRenderer.invoke('vector:enhance-rag', projectName, query, topK),
  vectorFiles: (projectName: string) =>
    ipcRenderer.invoke('vector:files', projectName),
  vectorRemoveFiles: (workingCopyPath: string, commitId: string, projectName: string, filePaths: string[]) =>
    ipcRenderer.invoke('vector:remove-files', workingCopyPath, commitId, projectName, filePaths),
  vectorExport: (projectName: string) =>
    ipcRenderer.invoke('vector:export', projectName),
  vectorImport: (projectName: string, data: string) =>
    ipcRenderer.invoke('vector:import', projectName, data),
  vectorIngestFiles: (projectName: string, filePaths: string[], workingCopyPath: string, commitId: string) =>
    ipcRenderer.invoke('vector:ingest-files', projectName, filePaths, workingCopyPath, commitId),
  vectorOpenFilesDialog: () =>
    ipcRenderer.invoke('vector:open-files-dialog'),
  vectorGetSupportedExtensions: () =>
    ipcRenderer.invoke('vector:get-supported-extensions'),
  onVectorProgress: (callback: (msg: string) => void) => {
    ipcRenderer.on('vector:progress', (_, msg) => callback(msg))
    return () => ipcRenderer.removeAllListeners('vector:progress')
  },

  // LAN Server
  lanStart: (rootPath: string, port?: number) => ipcRenderer.invoke('lan:start', rootPath, port),
  lanStop: () => ipcRenderer.invoke('lan:stop'),
  lanStatus: () => ipcRenderer.invoke('lan:status'),

  // 右键菜单
  registerContextMenu: () => ipcRenderer.invoke('context-menu:register'),
  unregisterContextMenu: () => ipcRenderer.invoke('context-menu:unregister'),
  isContextMenuRegistered: () => ipcRenderer.invoke('context-menu:is-registered'),

  // CLI 参数事件（右键菜单触发）
  onCliAction: (callback: (data: { action: string; path: string }) => void) => {
    ipcRenderer.on('cli:action', (_, data) => callback(data))
    return () => ipcRenderer.removeAllListeners('cli:action')
  },

  // Checkout 到指定目录
  checkoutTo: (rootPath: string, repoPath: string, targetParentDir: string, folderName: string) =>
    ipcRenderer.invoke('dbgvs:checkout-to', rootPath, repoPath, targetParentDir, folderName),

  // 注册已有工作副本
  registerWorkingCopy: (rootPath: string, workingCopyPath: string) =>
    ipcRenderer.invoke('dbgvs:register-working-copy', rootPath, workingCopyPath),

  // 从项目列表移除工作副本（仅断开关联）
  unregisterProject: (rootPath: string, workingCopyPath: string) =>
    ipcRenderer.invoke('dbgvs:unregister-project', rootPath, workingCopyPath),

  // 启动检查：补全项目 DBHT-GUIDE.md
  ensureProjectDocs: (rootPath: string) =>
    ipcRenderer.invoke('dbgvs:ensure-project-docs', rootPath),

  // 新手引导
  getOnboardingStatus: () =>
    ipcRenderer.invoke('dbgvs:get-onboarding-status'),
  setOnboardingCompleted: (completed: boolean) =>
    ipcRenderer.invoke('dbgvs:set-onboarding-completed', completed),

  // AST & Graph
  parseProject: (repoPath: string, workingCopyPath: string) =>
    ipcRenderer.invoke('ast:parse-project', repoPath, workingCopyPath),
  buildGraph: (repoPath: string, workingCopyPath: string, commitId: string, projectName: string) =>
    ipcRenderer.invoke('graph:build', repoPath, workingCopyPath, commitId, projectName),
  getGraph: (commitId: string) =>
    ipcRenderer.invoke('graph:get', commitId),
  listGraphVersions: () =>
    ipcRenderer.invoke('graph:list-versions'),
  compareGraphs: (versionA: string, versionB: string) =>
    ipcRenderer.invoke('graph:compare', versionA, versionB),
  getRagContext: (commitId: string) =>
    ipcRenderer.invoke('graph:to-rag-context', commitId),

  // Version switching
  switchToVersionReadonly: (repoPath: string, version: string) =>
    ipcRenderer.invoke('version:switch-readonly', repoPath, version),
  releaseVersionReadonly: (version: string) =>
    ipcRenderer.invoke('version:release-readonly', version),
  getVersionFileList: (repoPath: string, version: string) =>
    ipcRenderer.invoke('version:get-file-list', repoPath, version),
  getVersionFileContent: (repoPath: string, version: string, filePath: string) =>
    ipcRenderer.invoke('version:get-file-content', repoPath, version, filePath),

  // Quality & health
  analyzeQuality: (commitId: string) =>
    ipcRenderer.invoke('quality:analyze', commitId),

  // External API
  externalApiStart: () => ipcRenderer.invoke('external-api:start'),
  externalApiStop: () => ipcRenderer.invoke('external-api:stop'),
  externalApiStatus: () => ipcRenderer.invoke('external-api:status'),
  externalApiGetConfig: () => ipcRenderer.invoke('external-api:get-config'),
  externalApiSaveConfig: (config: { enabled: boolean; port: number; token: string }) =>
    ipcRenderer.invoke('external-api:save-config', config),

})

// 类型声明
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
  commit: (repoPath: string, workingCopyPath: string, message: string, files: string[]) => Promise<{ success: boolean; message?: string }>
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
  openFolder: (path: string) => Promise<void>
  checkAdmin: () => Promise<boolean>
  onMenuNewProject: (callback: () => void) => () => void
  onMenuOpenProject: (callback: () => void) => () => void
  onMenuAbout: (callback: () => void) => () => void
  registerContextMenu: () => Promise<{ success: boolean; message: string }>
  unregisterContextMenu: () => Promise<{ success: boolean; message: string }>
  isContextMenuRegistered: () => Promise<boolean>
  onCliAction: (callback: (data: { action: string; path: string }) => void) => () => void
  checkoutTo: (rootPath: string, repoPath: string, targetParentDir: string, folderName: string) => Promise<{ success: boolean; message: string; targetPath?: string; projectName?: string }>
  registerWorkingCopy: (rootPath: string, workingCopyPath: string) => Promise<{ success: boolean; message: string; projectName?: string; repoPath?: string }>
  unregisterProject: (rootPath: string, workingCopyPath: string) => Promise<{ success: boolean; message: string }>

  // 新手引导
  getOnboardingStatus: () => Promise<{ completed: boolean }>
  setOnboardingCompleted: (completed: boolean) => Promise<{ success: boolean; message?: string }>

  // AST & Graph
  parseProject: (repoPath: string, workingCopyPath: string) => Promise<{ success: boolean; files: Array<Record<string, unknown>>; errors: string[]; totalFiles: number; cachedFiles: number }>
  buildGraph: (repoPath: string, workingCopyPath: string, commitId: string, projectName: string) => Promise<{ success: boolean; graph?: Record<string, unknown>; message?: string }>
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
    Promise<{ success: boolean; index?: { schemaVersion: number; projectName: string; commitId: string; model: string; dimensions: number; totalChunks: number; totalFiles: number; totalTokens: number; createdAt: string; updatedAt: string }; message?: string }>
  vectorStatus: (projectName: string) => Promise<{ success: boolean; index?: Record<string, unknown>; message?: string }>
  vectorDelete: (projectName: string) => Promise<{ success: boolean; message?: string }>
  vectorSearch: (projectName: string, query: { text: string; topK?: number; minSimilarity?: number; fileTypes?: string[] }) =>
    Promise<{ success: boolean; results: Array<{ chunk: Record<string, unknown>; similarity: number; rank: number }>; message?: string }>
  vectorSearchBatch: (projectName: string, queries: { text: string; topK?: number; minSimilarity?: number; fileTypes?: string[] }[]) =>
    Promise<{ success: boolean; results: Array<Array<{ chunk: Record<string, unknown>; similarity: number; rank: number }>>; message?: string }>
  vectorEnhanceRag: (projectName: string, query: string, topK?: number) =>
    Promise<{ success: boolean; vectorResults: Array<{ chunk: Record<string, unknown>; similarity: number; rank: number }>; message?: string }>
  vectorFiles: (projectName: string) => Promise<{ success: boolean; files: Array<{ filePath: string; chunkCount: number; totalChars: number; language: string }>; message?: string }>
  vectorRemoveFiles: (workingCopyPath: string, commitId: string, projectName: string, filePaths: string[]) =>
    Promise<{ success: boolean; index?: Record<string, unknown>; message?: string }>
  vectorExport: (projectName: string) => Promise<{ success: boolean; data?: string; message?: string }>
  vectorImport: (projectName: string, data: string) => Promise<{ success: boolean; index?: Record<string, unknown>; message?: string }>
  vectorIngestFiles: (projectName: string, filePaths: string[], workingCopyPath: string, commitId: string) =>
    Promise<{ success: boolean; result?: Record<string, unknown>; message?: string }>
  vectorOpenFilesDialog: () => Promise<{ canceled: boolean; filePaths: string[] }>
  vectorGetSupportedExtensions: () => Promise<{ extensions: Array<{ extension: string; description: string; category: string }> }>
  onVectorProgress: (callback: (msg: string) => void) => () => void

  // Quality & health
  analyzeQuality: (commitId: string) => Promise<{ success: boolean; report?: Record<string, unknown>; message?: string }>

  // External API
  externalApiStart: () => Promise<{ success: boolean; message: string; port?: number; address?: string }>
  externalApiStop: () => Promise<{ success: boolean; message: string }>
  externalApiStatus: () => Promise<{ running: boolean; port: number }>
  externalApiGetConfig: () => Promise<{ enabled: boolean; port: number; token: string }>
  externalApiSaveConfig: (config: { enabled: boolean; port: number; token: string }) => Promise<{ success: boolean; message: string }>
}

export interface FileStatus {
  path: string
  status: 'unchanged' | 'added' | 'modified' | 'deleted' | 'conflict'
  isDirectory: boolean
}

export interface FileTreeNode {
  name: string
  path: string
  isDirectory: boolean
  status: 'unchanged' | 'added' | 'modified' | 'deleted' | 'conflict'
  children?: FileTreeNode[]
}

export interface VersionInfo {
  version: string
  timestamp: string
  message: string
  files: string[]
  size: number
}

export interface DiffResult {
  filePath: string
  diff: DiffBlock[]
  canDisplay: boolean
}

export interface DiffBlock {
  type: 'add' | 'delete' | 'modify' | 'equal'
  content: string
  oldStart?: number
  oldEnd?: number
  newStart?: number
  newEnd?: number
}

export interface RepositoryInfo {
  name: string
  path: string
  currentVersion: string
  createdAt: string
  totalFiles: number
  totalVersions: number
  totalSize: number
}
