export interface VersionFileEntry {
    path: string;
    hash: string;
    size: number;
}
export interface VersionSwitchResult {
    success: boolean;
    message?: string;
    viewPath?: string;
    files?: VersionFileEntry[];
}
/**
 * Checkout a specific version to a temporary read-only directory.
 * Returns the temp path so the renderer can read files from it.
 */
export declare function switchToVersionReadonly(rootPath: string, repoPath: string, version: string): Promise<VersionSwitchResult>;
/**
 * Release a read-only version checkout — delete temp directory.
 */
export declare function releaseVersionReadonly(rootPath: string, version: string): Promise<{
    success: boolean;
    message?: string;
}>;
/**
 * Get file list for a specific version directly from commit manifest.
 */
export declare function getVersionFileList(repoPath: string, version: string): Promise<{
    success: boolean;
    files?: VersionFileEntry[];
    message?: string;
}>;
/**
 * Get file content from a specific version by reading blob directly.
 */
export declare function getVersionFileContent(repoPath: string, version: string, filePath: string): Promise<{
    success: boolean;
    content?: string;
    message?: string;
}>;
