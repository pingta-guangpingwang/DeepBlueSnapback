export interface ElectronAPI {
    minimizeWindow: () => Promise<void>;
    maximizeWindow: () => Promise<void>;
    closeWindow: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
    selectFolder: () => Promise<string | null>;
    isEmptyFolder: (path: string) => Promise<boolean>;
    readFile: (path: string) => Promise<{
        success: boolean;
        content?: string;
        error?: string;
    }>;
    createFile: (path: string) => Promise<{
        success: boolean;
        message?: string;
    }>;
    writeFile: (path: string, content: string) => Promise<{
        success: boolean;
        message?: string;
    }>;
    deleteFile: (path: string) => Promise<{
        success: boolean;
        message?: string;
    }>;
    listFiles: (path: string) => Promise<{
        success: boolean;
        files?: Array<{
            name: string;
            path: string;
            isDirectory: boolean;
        }>;
        message?: string;
        errors?: string[];
    }>;
    copyDir: (src: string, dest: string) => Promise<{
        success: boolean;
        message?: string;
    }>;
    pathJoin: (...paths: string[]) => Promise<{
        result: string;
    }>;
    pathBasename: (filePath: string) => Promise<{
        result: string;
    }>;
    isDBHTRepository: (path: string) => Promise<boolean>;
    createRepository: (repoPath: string, name: string) => Promise<{
        success: boolean;
        message?: string;
    }>;
    createProject: (rootPath: string, projectName: string, customPath?: string) => Promise<{
        success: boolean;
        message?: string;
    }>;
    getProjects: (rootPath: string) => Promise<{
        success: boolean;
        projects?: Array<{
            name: string;
            path: string;
            repoPath: string;
            status: string;
            lastUpdate?: string;
            hasChanges?: boolean;
        }>;
        message?: string;
    }>;
    registerProject: (rootPath: string, projectPath: string, projectName?: string, initWithCommit?: boolean) => Promise<{
        success: boolean;
        message?: string;
    }>;
    checkoutProject: (rootPath: string, repoPath: string) => Promise<{
        success: boolean;
        message?: string;
        targetPath?: string;
    }>;
    initRepository: (repoPath: string) => Promise<{
        success: boolean;
        message?: string;
    }>;
    getStatus: (repoPath: string, workingCopyPath: string) => Promise<{
        success: boolean;
        status?: string[];
        message?: string;
    }>;
    getFileTree: (workingCopyPath: string) => Promise<{
        success: boolean;
        files?: Array<{
            name: string;
            path: string;
        }>;
        message?: string;
    }>;
    commit: (repoPath: string, workingCopyPath: string, message: string, files: string[]) => Promise<{
        success: boolean;
        message?: string;
    }>;
    getHistory: (repoPath: string) => Promise<{
        success: boolean;
        history?: string;
        message?: string;
    }>;
    rollback: (repoPath: string, workingCopyPath: string, version: string) => Promise<{
        success: boolean;
        message?: string;
    }>;
    rollbackFile: (repoPath: string, workingCopyPath: string, version: string, filePath: string) => Promise<{
        success: boolean;
        message?: string;
    }>;
    undoRollback: (repoPath: string, workingCopyPath: string) => Promise<{
        success: boolean;
        message?: string;
    }>;
    rollbackAI: (repoPath: string, workingCopyPath: string, sessionId: string) => Promise<{
        success: boolean;
        message?: string;
        targetVersion?: string;
    }>;
    revertFiles: (repoPath: string, workingCopyPath: string, filePaths: string[]) => Promise<{
        success: boolean;
        message: string;
        reverted: string[];
    }>;
    autoSnapshotStart: (repoPath: string, workingCopyPath: string, intervalMinutes: number) => Promise<{
        success: boolean;
        message: string;
    }>;
    autoSnapshotStop: () => Promise<{
        success: boolean;
        message: string;
    }>;
    onAutoSnapshotResult: (callback: (result: {
        success: boolean;
        message?: string;
    }) => void) => () => void;
    update: (repoPath: string, workingCopyPath: string) => Promise<{
        success: boolean;
        message?: string;
    }>;
    getDiff: (repoPath: string, workingCopyPath: string, filePath: string, versionA?: string, versionB?: string) => Promise<{
        success: boolean;
        diff?: string;
        message?: string;
    }>;
    getDiffSummary: (repoPath: string, workingCopyPath: string) => Promise<{
        success: boolean;
        files?: Array<{
            path: string;
            status: string;
            added: number;
            removed: number;
        }>;
        totalAdded?: number;
        totalRemoved?: number;
        message?: string;
    }>;
    getDiffContent: (repoPath: string, workingCopyPath: string, filePath: string, versionA?: string, versionB?: string) => Promise<{
        success: boolean;
        oldContent?: string;
        newContent?: string;
        message?: string;
    }>;
    deleteRepository: (repoPath: string) => Promise<{
        success: boolean;
        message?: string;
    }>;
    deleteRepositoryFull: (rootPath: string, repoPath: string, deleteWorkingCopies: boolean) => Promise<{
        success: boolean;
        message: string;
        deletedCopies?: string[];
    }>;
    verify: (repoPath: string) => Promise<{
        success: boolean;
        valid: boolean;
        errors: string[];
        message?: string;
    }>;
    getHistoryStructured: (repoPath: string) => Promise<{
        success: boolean;
        commits?: Array<{
            id: string;
            message: string;
            timestamp: string;
            fileCount: number;
            totalSize: number;
        }>;
        message?: string;
    }>;
    getRepositoryInfo: (repoPath: string) => Promise<{
        success: boolean;
        info?: string;
        message?: string;
    }>;
    getCommitDetail: (repoPath: string, commitId: string) => Promise<{
        id: string;
        message: string;
        timestamp: string;
        files: Array<{
            path: string;
            hash: string;
            size: number;
        }>;
        parentVersion: string | null;
        totalSize: number;
    } | null>;
    getBlobContent: (repoPath: string, hash: string) => Promise<{
        success: boolean;
        content?: string;
    }>;
    resolvePaths: (inputPath: string) => Promise<{
        repoPath: string;
        workingCopyPath: string;
    } | null>;
    listRepositories: (rootPath: string) => Promise<{
        success: boolean;
        repos: Array<{
            name: string;
            path: string;
            created: string;
            currentVersion: string | null;
            totalCommits: number;
            totalSize: number;
            blobCount: number;
            workingCopies: string[];
        }>;
    }>;
    createRootRepository: (path: string) => Promise<{
        success: boolean;
        message?: string;
    }>;
    getRootRepository: () => Promise<{
        success: boolean;
        rootPath?: string | null;
    }>;
    saveRootRepository: (path: string) => Promise<{
        success: boolean;
        message?: string;
    }>;
    openFolder: (path: string) => Promise<void>;
    checkAdmin: () => Promise<boolean>;
    onMenuNewProject: (callback: () => void) => () => void;
    onMenuOpenProject: (callback: () => void) => () => void;
    onMenuAbout: (callback: () => void) => () => void;
    registerContextMenu: () => Promise<{
        success: boolean;
        message: string;
    }>;
    unregisterContextMenu: () => Promise<{
        success: boolean;
        message: string;
    }>;
    isContextMenuRegistered: () => Promise<boolean>;
    onCliAction: (callback: (data: {
        action: string;
        path: string;
    }) => void) => () => void;
    checkoutTo: (rootPath: string, repoPath: string, targetParentDir: string, folderName: string) => Promise<{
        success: boolean;
        message: string;
        targetPath?: string;
        projectName?: string;
    }>;
    registerWorkingCopy: (rootPath: string, workingCopyPath: string) => Promise<{
        success: boolean;
        message: string;
        projectName?: string;
        repoPath?: string;
    }>;
    unregisterProject: (rootPath: string, workingCopyPath: string) => Promise<{
        success: boolean;
        message: string;
    }>;
    getOnboardingStatus: () => Promise<{
        completed: boolean;
    }>;
    setOnboardingCompleted: (completed: boolean) => Promise<{
        success: boolean;
        message?: string;
    }>;
    parseProject: (repoPath: string, workingCopyPath: string) => Promise<{
        success: boolean;
        files: Array<Record<string, unknown>>;
        errors: string[];
        totalFiles: number;
        cachedFiles: number;
    }>;
    buildGraph: (repoPath: string, workingCopyPath: string, commitId: string, projectName: string) => Promise<{
        success: boolean;
        graph?: Record<string, unknown>;
        message?: string;
    }>;
    onGraphProgress: (callback: (msg: string) => void) => () => void;
    getGraph: (commitId: string) => Promise<{
        success: boolean;
        graph?: Record<string, unknown>;
        message?: string;
    }>;
    listGraphVersions: () => Promise<{
        success: boolean;
        versions: string[];
        message?: string;
    }>;
    compareGraphs: (versionA: string, versionB: string) => Promise<{
        success: boolean;
        diff?: Record<string, unknown>;
        message?: string;
    }>;
    switchToVersionReadonly: (repoPath: string, version: string) => Promise<{
        success: boolean;
        viewPath?: string;
        files?: Array<{
            path: string;
            hash: string;
            size: number;
        }>;
        message?: string;
    }>;
    releaseVersionReadonly: (version: string) => Promise<{
        success: boolean;
        message?: string;
    }>;
    getVersionFileList: (repoPath: string, version: string) => Promise<{
        success: boolean;
        files?: Array<{
            path: string;
            hash: string;
            size: number;
        }>;
        message?: string;
    }>;
    getVersionFileContent: (repoPath: string, version: string, filePath: string) => Promise<{
        success: boolean;
        content?: string;
        message?: string;
    }>;
    getRagContext: (commitId: string) => Promise<{
        success: boolean;
        context?: Record<string, unknown>;
        message?: string;
    }>;
    analyzeQuality: (commitId: string) => Promise<{
        success: boolean;
        report?: Record<string, unknown>;
        message?: string;
    }>;
    externalApiStart: () => Promise<{
        success: boolean;
        message: string;
        port?: number;
        address?: string;
    }>;
    externalApiStop: () => Promise<{
        success: boolean;
        message: string;
    }>;
    externalApiStatus: () => Promise<{
        running: boolean;
        port: number;
    }>;
    externalApiGetConfig: () => Promise<{
        enabled: boolean;
        port: number;
        token: string;
    }>;
    externalApiSaveConfig: (config: {
        enabled: boolean;
        port: number;
        token: string;
    }) => Promise<{
        success: boolean;
        message: string;
    }>;
}
export interface FileStatus {
    path: string;
    status: 'unchanged' | 'added' | 'modified' | 'deleted' | 'conflict';
    isDirectory: boolean;
}
export interface FileTreeNode {
    name: string;
    path: string;
    isDirectory: boolean;
    status: 'unchanged' | 'added' | 'modified' | 'deleted' | 'conflict';
    children?: FileTreeNode[];
}
export interface VersionInfo {
    version: string;
    timestamp: string;
    message: string;
    files: string[];
    size: number;
}
export interface DiffResult {
    filePath: string;
    diff: DiffBlock[];
    canDisplay: boolean;
}
export interface DiffBlock {
    type: 'add' | 'delete' | 'modify' | 'equal';
    content: string;
    oldStart?: number;
    oldEnd?: number;
    newStart?: number;
    newEnd?: number;
}
export interface RepositoryInfo {
    name: string;
    path: string;
    currentVersion: string;
    createdAt: string;
    totalFiles: number;
    totalVersions: number;
    totalSize: number;
}
