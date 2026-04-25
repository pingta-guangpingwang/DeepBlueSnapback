export interface ConflictFile {
    path: string;
    isBinary: boolean;
}
export interface GitSyncStatus {
    connected: boolean;
    remoteUrl?: string;
    branch?: string;
    ahead: number;
    behind: number;
    lastSync?: string;
    hasChanges: boolean;
}
interface GitAuthEntry {
    username: string;
    token: string;
}
export declare class GitBridge {
    private authPath;
    constructor();
    getAuthStore(): Promise<Record<string, GitAuthEntry>>;
    saveAuthEntry(host: string, username: string, token: string): Promise<{
        success: boolean;
        message: string;
    }>;
    deleteAuthEntry(host: string): Promise<{
        success: boolean;
        message: string;
    }>;
    resolveAuth(remoteUrl: string): Promise<{
        username: string;
        password: string;
    } | undefined>;
    private buildOnAuth;
    connectRepo(dir: string, remoteUrl: string, branch: string, auth: {
        username: string;
        token: string;
    }, onProgress?: (msg: string) => void): Promise<{
        success: boolean;
        message: string;
    }>;
    disconnectRepo(dir: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getSyncStatus(dir: string): Promise<GitSyncStatus>;
    pull(dir: string, auth: {
        username: string;
        token: string;
    }, onProgress?: (msg: string) => void): Promise<{
        success: boolean;
        message: string;
        conflicts?: ConflictFile[];
    }>;
    push(dir: string, commitMessage: string, authorName: string, authorEmail: string, auth: {
        username: string;
        token: string;
    }, onProgress?: (msg: string) => void): Promise<{
        success: boolean;
        message: string;
    }>;
    resolveConflict(dir: string, filePath: string, resolution: 'ours' | 'theirs'): Promise<{
        success: boolean;
        message: string;
    }>;
    commitMergeResolution(dir: string, authorName: string, authorEmail: string): Promise<{
        success: boolean;
        message: string;
    }>;
    private detectConflicts;
}
export {};
