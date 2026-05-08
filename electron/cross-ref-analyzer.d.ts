export interface CrossProjectRef {
    sourceProject: string;
    targetProject: string;
    sourceFile: string;
    targetFile: string;
    refType: 'import' | 'require' | 'config' | 'naming';
    confidence: 'high' | 'medium' | 'low';
}
export interface CrossRefReport {
    timestamp: string;
    projects: string[];
    crossRefs: CrossProjectRef[];
    projectDeps: Record<string, string[]>;
    projectDependents: Record<string, string[]>;
    summary: string;
}
export declare function analyzeCrossReferences(rootPath: string, focusProjectName: string, registry: Array<{
    name: string;
    repoPath: string;
    workingCopies: Array<{
        path: string;
    }>;
}>): Promise<CrossRefReport>;
