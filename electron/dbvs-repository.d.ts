export interface CommitFileEntry {
    path: string;
    hash: string;
    size: number;
}
interface CommitData {
    id: string;
    message: string;
    summary?: string;
    author?: string;
    sessionId?: string;
    changedFiles?: {
        added: string[];
        modified: string[];
        deleted: string[];
    };
    timestamp: string;
    files: CommitFileEntry[];
    parentVersion: string | null;
    totalSize: number;
}
/** 工作副本链接文件格式 */
interface WorkingCopyLink {
    repoPath: string;
    checkedOutVersion: string | null;
}
export declare class DBHTRepository {
    /**
     * 从工作副本目录读取链接文件，获取对应的仓库路径
     */
    readWorkingCopyLink(workingCopyPath: string): Promise<WorkingCopyLink | null>;
    /**
     * 在工作副本目录创建链接文件
     */
    initWorkingCopy(repoPath: string, workingCopyPath: string, version?: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * 给定任意路径，尝试解析出仓库路径和工作副本路径
     * 可能是直接传了 repoPath，也可能是传了工作副本路径
     */
    resolvePaths(inputPath: string): Promise<{
        repoPath: string;
        workingCopyPath: string;
    } | null>;
    /**
     * 创建仓库（集中存储版本数据）
     * @param repoPath 仓库目录路径（如 <root>/repositories/<projectName>）
     * @param projectName 项目名称
     */
    createRepository(repoPath: string, projectName: string): Promise<{
        success: boolean;
        message: string;
    }>;
    initExistingProject(repoPath: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * 获取工作副本相对于仓库的状态
     * @param repoPath 仓库路径
     * @param workingCopyPath 工作副本路径
     */
    getStatus(repoPath: string, workingCopyPath: string): Promise<{
        success: boolean;
        status: string[];
        message?: string;
    }>;
    getFileTree(workingCopyPath: string): Promise<{
        success: boolean;
        files: Array<{
            name: string;
            path: string;
        }>;
        message?: string;
    }>;
    /**
     * 提交变更：从工作副本读文件，blob 存到仓库
     * @param repoPath 仓库路径
     * @param workingCopyPath 工作副本路径
     */
    commit(repoPath: string, workingCopyPath: string, message: string, selectedFiles: string[], options?: {
        summary?: string;
        author?: string;
        sessionId?: string;
        onProgress?: (msg: string) => void;
    }): Promise<{
        success: boolean;
        message: string;
        version?: string;
    }>;
    getHistory(repoPath: string): Promise<{
        success: boolean;
        history: string;
        message?: string;
    }>;
    getHistoryStructured(repoPath: string): Promise<{
        success: boolean;
        commits: Array<{
            id: string;
            message: string;
            timestamp: string;
            fileCount: number;
            totalSize: number;
            summary?: string;
            author?: string;
            sessionId?: string;
            changedFiles?: {
                added: string[];
                modified: string[];
                deleted: string[];
            };
        }>;
        message?: string;
    }>;
    getCommitDetail(repoPath: string, commitId: string): Promise<CommitData | null>;
    getBlobContent(repoPath: string, hash: string): Promise<string | null>;
    /**
     * 回滚工作副本到指定版本（自动创建回滚前快照）
     * @param repoPath 仓库路径
     * @param workingCopyPath 工作副本路径
     */
    rollback(repoPath: string, workingCopyPath: string, version: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * 回滚单个文件到指定版本
     */
    rollbackFile(repoPath: string, workingCopyPath: string, version: string, filePath: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * 将工作副本中的指定文件还原到 HEAD（最新提交）版本
     * - 已修改的文件：从 blob 恢复
     * - 新增的文件：删除
     * - 已删除的文件：从 blob 恢复
     */
    revertFiles(repoPath: string, workingCopyPath: string, filePaths: string[]): Promise<{
        success: boolean;
        message: string;
        reverted: string[];
    }>;
    /**
     * 撤销上次回滚（恢复到回滚前自动快照版本）
     */
    undoRollback(repoPath: string, workingCopyPath: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * 按 AI 会话 ID 回滚：找到指定 sessionId 的所有提交，回滚到该会话最早提交之前的版本
     */
    rollbackBySession(repoPath: string, workingCopyPath: string, sessionId: string): Promise<{
        success: boolean;
        message: string;
        targetVersion?: string;
    }>;
    update(repoPath: string, workingCopyPath: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * 从仓库 checkout 到指定目录
     * @param repoPath 仓库路径
     * @param targetPath 目标目录
     */
    checkout(repoPath: string, targetPath: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getDiff(repoPath: string, workingCopyPath: string, filePath: string, versionA?: string, versionB?: string): Promise<{
        success: boolean;
        diff: string;
        message?: string;
    }>;
    getDiffSummary(repoPath: string, workingCopyPath: string): Promise<{
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
    getDiffContent(repoPath: string, workingCopyPath: string, filePath: string, versionA?: string, versionB?: string): Promise<{
        success: boolean;
        oldContent?: string;
        newContent?: string;
        message?: string;
    }>;
    deleteRepository(repoPath: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getRepositoryInfo(repoPath: string): Promise<{
        success: boolean;
        info: string;
        message?: string;
    }>;
    verify(repoPath: string): Promise<{
        success: boolean;
        valid: boolean;
        errors: string[];
        message?: string;
    }>;
    private cleanEmptyDirs;
}
export {};
