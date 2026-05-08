"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// 向渲染进程暴露API
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // 窗口控制
    minimizeWindow: () => electron_1.ipcRenderer.invoke('window:minimize'),
    maximizeWindow: () => electron_1.ipcRenderer.invoke('window:maximize'),
    closeWindow: () => electron_1.ipcRenderer.invoke('window:close'),
    isMaximized: () => electron_1.ipcRenderer.invoke('window:is-maximized'),
    // 对话框
    selectFolder: () => electron_1.ipcRenderer.invoke('dialog:select-folder'),
    // 文件系统
    isEmptyFolder: (path) => electron_1.ipcRenderer.invoke('fs:is-empty-folder', path),
    readFile: (path) => electron_1.ipcRenderer.invoke('fs:read-file', path),
    createFile: (path) => electron_1.ipcRenderer.invoke('fs:create-file', path),
    writeFile: (path, content) => electron_1.ipcRenderer.invoke('fs:write-file', path, content),
    deleteFile: (path) => electron_1.ipcRenderer.invoke('fs:delete-file', path),
    listFiles: (path) => electron_1.ipcRenderer.invoke('fs:list-files', path),
    copyDir: (src, dest) => electron_1.ipcRenderer.invoke('fs:copy-dir', src, dest),
    pathJoin: (...paths) => electron_1.ipcRenderer.invoke('fs:path-join', ...paths),
    pathBasename: (filePath) => electron_1.ipcRenderer.invoke('fs:path-basename', filePath),
    // DBHT操作（SVN 风格：repoPath = 集中仓库, workingCopyPath = 工作副本）
    isDBHTRepository: (path) => electron_1.ipcRenderer.invoke('dbgvs:is-repository', path),
    createRepository: (repoPath, name) => electron_1.ipcRenderer.invoke('dbgvs:create-repository', repoPath, name),
    createProject: (rootPath, projectName, customPath) => electron_1.ipcRenderer.invoke('dbgvs:create-project', rootPath, projectName, customPath),
    getProjects: (rootPath) => electron_1.ipcRenderer.invoke('dbgvs:get-projects', rootPath),
    registerProject: (rootPath, projectPath, projectName, initWithCommit) => electron_1.ipcRenderer.invoke('dbgvs:register-project', rootPath, projectPath, projectName, initWithCommit),
    checkoutProject: (rootPath, repoPath) => electron_1.ipcRenderer.invoke('dbgvs:checkout-project', rootPath, repoPath),
    initRepository: (repoPath) => electron_1.ipcRenderer.invoke('dbgvs:init-repository', repoPath),
    getStatus: (repoPath, workingCopyPath) => electron_1.ipcRenderer.invoke('dbgvs:get-status', repoPath, workingCopyPath),
    getFileTree: (workingCopyPath) => electron_1.ipcRenderer.invoke('dbgvs:get-file-tree', workingCopyPath),
    commit: (repoPath, workingCopyPath, message, files, options) => electron_1.ipcRenderer.invoke('dbgvs:commit', repoPath, workingCopyPath, message, files, options),
    getHistory: (repoPath) => electron_1.ipcRenderer.invoke('dbgvs:get-history', repoPath),
    rollback: (repoPath, workingCopyPath, version) => electron_1.ipcRenderer.invoke('dbgvs:rollback', repoPath, workingCopyPath, version),
    rollbackFile: (repoPath, workingCopyPath, version, filePath) => electron_1.ipcRenderer.invoke('dbgvs:rollback-file', repoPath, workingCopyPath, version, filePath),
    undoRollback: (repoPath, workingCopyPath) => electron_1.ipcRenderer.invoke('dbgvs:undo-rollback', repoPath, workingCopyPath),
    rollbackAI: (repoPath, workingCopyPath, sessionId) => electron_1.ipcRenderer.invoke('dbgvs:rollback-ai', repoPath, workingCopyPath, sessionId),
    revertFiles: (repoPath, workingCopyPath, filePaths) => electron_1.ipcRenderer.invoke('dbgvs:revert-files', repoPath, workingCopyPath, filePaths),
    autoSnapshotStart: (repoPath, workingCopyPath, intervalMinutes) => electron_1.ipcRenderer.invoke('dbgvs:auto-snapshot-start', repoPath, workingCopyPath, intervalMinutes),
    autoSnapshotStop: () => electron_1.ipcRenderer.invoke('dbgvs:auto-snapshot-stop'),
    onAutoSnapshotResult: (callback) => {
        electron_1.ipcRenderer.on('auto-snapshot:result', (_, result) => callback(result));
        return () => electron_1.ipcRenderer.removeAllListeners('auto-snapshot:result');
    },
    update: (repoPath, workingCopyPath) => electron_1.ipcRenderer.invoke('dbgvs:update', repoPath, workingCopyPath),
    getDiff: (repoPath, workingCopyPath, filePath, versionA, versionB) => electron_1.ipcRenderer.invoke('dbgvs:get-diff', repoPath, workingCopyPath, filePath, versionA, versionB),
    getDiffSummary: (repoPath, workingCopyPath) => electron_1.ipcRenderer.invoke('dbgvs:get-diff-summary', repoPath, workingCopyPath),
    getDiffContent: (repoPath, workingCopyPath, filePath, versionA, versionB) => electron_1.ipcRenderer.invoke('dbgvs:get-diff-content', repoPath, workingCopyPath, filePath, versionA, versionB),
    deleteRepository: (repoPath) => electron_1.ipcRenderer.invoke('dbgvs:delete-repository', repoPath),
    deleteRepositoryFull: (rootPath, repoPath, deleteWorkingCopies) => electron_1.ipcRenderer.invoke('dbgvs:delete-repository-full', rootPath, repoPath, deleteWorkingCopies),
    verify: (repoPath) => electron_1.ipcRenderer.invoke('dbgvs:verify', repoPath),
    getHistoryStructured: (repoPath) => electron_1.ipcRenderer.invoke('dbgvs:get-history-structured', repoPath),
    getRepositoryInfo: (repoPath) => electron_1.ipcRenderer.invoke('dbgvs:get-repository-info', repoPath),
    getCommitDetail: (repoPath, commitId) => electron_1.ipcRenderer.invoke('dbgvs:get-commit-detail', repoPath, commitId),
    getBlobContent: (repoPath, hash) => electron_1.ipcRenderer.invoke('dbgvs:get-blob-content', repoPath, hash),
    resolvePaths: (inputPath) => electron_1.ipcRenderer.invoke('dbgvs:resolve-paths', inputPath),
    listRepositories: (rootPath) => electron_1.ipcRenderer.invoke('dbgvs:list-repositories', rootPath),
    createRootRepository: (path) => electron_1.ipcRenderer.invoke('dbgvs:create-root-repository', path),
    getRootRepository: () => electron_1.ipcRenderer.invoke('dbgvs:get-root-repository'),
    saveRootRepository: (path) => electron_1.ipcRenderer.invoke('dbgvs:save-root-repository', path),
    registerCLI: () => electron_1.ipcRenderer.invoke('dbgvs:register-cli'),
    isCLIRegistered: () => electron_1.ipcRenderer.invoke('dbgvs:is-cli-registered'),
    // Shell
    openFolder: (path) => electron_1.ipcRenderer.invoke('shell:open-folder', path),
    // 系统
    checkAdmin: () => electron_1.ipcRenderer.invoke('system:check-admin'),
    // 菜单事件
    onMenuNewProject: (callback) => {
        electron_1.ipcRenderer.on('menu:new-project', callback);
        return () => electron_1.ipcRenderer.removeListener('menu:new-project', callback);
    },
    onMenuOpenProject: (callback) => {
        electron_1.ipcRenderer.on('menu:open-project', callback);
        return () => electron_1.ipcRenderer.removeListener('menu:open-project', callback);
    },
    onMenuAbout: (callback) => {
        electron_1.ipcRenderer.on('menu:about', callback);
        return () => electron_1.ipcRenderer.removeListener('menu:about', callback);
    },
    // Git Remote Sync
    gitConnect: (workingCopyPath, remoteUrl, branch, username, token) => electron_1.ipcRenderer.invoke('git:connect', workingCopyPath, remoteUrl, branch, username, token),
    gitDisconnect: (workingCopyPath) => electron_1.ipcRenderer.invoke('git:disconnect', workingCopyPath),
    gitSyncStatus: (workingCopyPath) => electron_1.ipcRenderer.invoke('git:sync-status', workingCopyPath),
    gitPull: (workingCopyPath, username, token) => electron_1.ipcRenderer.invoke('git:pull', workingCopyPath, username, token),
    gitPush: (workingCopyPath, commitMessage, authorName, authorEmail, username, token) => electron_1.ipcRenderer.invoke('git:push', workingCopyPath, commitMessage, authorName, authorEmail, username, token),
    gitResolveConflict: (workingCopyPath, filePath, resolution) => electron_1.ipcRenderer.invoke('git:resolve-conflict', workingCopyPath, filePath, resolution),
    gitCommitMerge: (workingCopyPath, authorName, authorEmail) => electron_1.ipcRenderer.invoke('git:commit-merge', workingCopyPath, authorName, authorEmail),
    gitGetCredentials: () => electron_1.ipcRenderer.invoke('git:get-credentials'),
    gitSaveCredential: (host, username, token) => electron_1.ipcRenderer.invoke('git:save-credential', host, username, token),
    gitDeleteCredential: (host) => electron_1.ipcRenderer.invoke('git:delete-credential', host),
    onGitProgress: (callback) => {
        electron_1.ipcRenderer.on('git:progress', (_, msg) => callback(msg));
        return () => electron_1.ipcRenderer.removeAllListeners('git:progress');
    },
    onGraphProgress: (callback) => {
        electron_1.ipcRenderer.on('graph:progress', (_, msg) => callback(msg));
        return () => electron_1.ipcRenderer.removeAllListeners('graph:progress');
    },
    // Vector Database
    vectorIndex: (repoPath, workingCopyPath, commitId, projectName, filePaths) => electron_1.ipcRenderer.invoke('vector:index', repoPath, workingCopyPath, commitId, projectName, filePaths),
    vectorStatus: (projectName) => electron_1.ipcRenderer.invoke('vector:status', projectName),
    vectorDelete: (projectName) => electron_1.ipcRenderer.invoke('vector:delete', projectName),
    vectorSearch: (projectName, query) => electron_1.ipcRenderer.invoke('vector:search', projectName, query),
    vectorSearchBatch: (projectName, queries) => electron_1.ipcRenderer.invoke('vector:search-batch', projectName, queries),
    vectorEnhanceRag: (projectName, query, topK) => electron_1.ipcRenderer.invoke('vector:enhance-rag', projectName, query, topK),
    vectorFiles: (projectName) => electron_1.ipcRenderer.invoke('vector:files', projectName),
    vectorRemoveFiles: (workingCopyPath, commitId, projectName, filePaths) => electron_1.ipcRenderer.invoke('vector:remove-files', workingCopyPath, commitId, projectName, filePaths),
    vectorExport: (projectName) => electron_1.ipcRenderer.invoke('vector:export', projectName),
    vectorImport: (projectName, data) => electron_1.ipcRenderer.invoke('vector:import', projectName, data),
    vectorIngestFiles: (projectName, filePaths, workingCopyPath, commitId) => electron_1.ipcRenderer.invoke('vector:ingest-files', projectName, filePaths, workingCopyPath, commitId),
    vectorOpenFilesDialog: () => electron_1.ipcRenderer.invoke('vector:open-files-dialog'),
    vectorOpenFolderDialog: () => electron_1.ipcRenderer.invoke('vector:open-folder-dialog'),
    vectorGetSupportedExtensions: () => electron_1.ipcRenderer.invoke('vector:get-supported-extensions'),
    onVectorProgress: (callback) => {
        electron_1.ipcRenderer.on('vector:progress', (_, msg) => callback(msg));
        return () => electron_1.ipcRenderer.removeAllListeners('vector:progress');
    },
    // LAN Server
    lanStart: (rootPath, port) => electron_1.ipcRenderer.invoke('lan:start', rootPath, port),
    lanStop: () => electron_1.ipcRenderer.invoke('lan:stop'),
    lanStatus: () => electron_1.ipcRenderer.invoke('lan:status'),
    // 右键菜单
    registerContextMenu: () => electron_1.ipcRenderer.invoke('context-menu:register'),
    unregisterContextMenu: () => electron_1.ipcRenderer.invoke('context-menu:unregister'),
    isContextMenuRegistered: () => electron_1.ipcRenderer.invoke('context-menu:is-registered'),
    // CLI 参数事件（右键菜单触发）
    onCliAction: (callback) => {
        electron_1.ipcRenderer.on('cli:action', (_, data) => callback(data));
        return () => electron_1.ipcRenderer.removeAllListeners('cli:action');
    },
    // Checkout 到指定目录
    checkoutTo: (rootPath, repoPath, targetParentDir, folderName) => electron_1.ipcRenderer.invoke('dbgvs:checkout-to', rootPath, repoPath, targetParentDir, folderName),
    // 注册已有工作副本
    registerWorkingCopy: (rootPath, workingCopyPath) => electron_1.ipcRenderer.invoke('dbgvs:register-working-copy', rootPath, workingCopyPath),
    // 从项目列表移除工作副本（仅断开关联）
    unregisterProject: (rootPath, workingCopyPath) => electron_1.ipcRenderer.invoke('dbgvs:unregister-project', rootPath, workingCopyPath),
    // 启动检查：补全项目 DBHT-GUIDE.md
    ensureProjectDocs: (rootPath) => electron_1.ipcRenderer.invoke('dbgvs:ensure-project-docs', rootPath),
    // 新手引导
    getOnboardingStatus: () => electron_1.ipcRenderer.invoke('dbgvs:get-onboarding-status'),
    setOnboardingCompleted: (completed) => electron_1.ipcRenderer.invoke('dbgvs:set-onboarding-completed', completed),
    // AST & Graph
    parseProject: (repoPath, workingCopyPath) => electron_1.ipcRenderer.invoke('ast:parse-project', repoPath, workingCopyPath),
    buildGraph: (repoPath, workingCopyPath, commitId, projectName) => electron_1.ipcRenderer.invoke('graph:build', repoPath, workingCopyPath, commitId, projectName),
    getGraph: (commitId) => electron_1.ipcRenderer.invoke('graph:get', commitId),
    listGraphVersions: () => electron_1.ipcRenderer.invoke('graph:list-versions'),
    compareGraphs: (versionA, versionB) => electron_1.ipcRenderer.invoke('graph:compare', versionA, versionB),
    getRagContext: (commitId) => electron_1.ipcRenderer.invoke('graph:to-rag-context', commitId),
    // Version switching
    switchToVersionReadonly: (repoPath, version) => electron_1.ipcRenderer.invoke('version:switch-readonly', repoPath, version),
    releaseVersionReadonly: (version) => electron_1.ipcRenderer.invoke('version:release-readonly', version),
    getVersionFileList: (repoPath, version) => electron_1.ipcRenderer.invoke('version:get-file-list', repoPath, version),
    getVersionFileContent: (repoPath, version, filePath) => electron_1.ipcRenderer.invoke('version:get-file-content', repoPath, version, filePath),
    // Quality & health
    analyzeQuality: (commitId) => electron_1.ipcRenderer.invoke('quality:analyze', commitId),
    // External API
    externalApiStart: () => electron_1.ipcRenderer.invoke('external-api:start'),
    externalApiStop: () => electron_1.ipcRenderer.invoke('external-api:stop'),
    externalApiStatus: () => electron_1.ipcRenderer.invoke('external-api:status'),
    externalApiGetConfig: () => electron_1.ipcRenderer.invoke('external-api:get-config'),
    externalApiSaveConfig: (config) => electron_1.ipcRenderer.invoke('external-api:save-config', config),
});
