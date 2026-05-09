export interface ProjectRegistryEntry {
    name: string;
    repoPath: string;
    workingCopies: Array<{
        path: string;
    }>;
    created: string;
    order?: number;
    rating?: number;
    gitConfig?: {
        remoteUrl: string;
        branch: string;
        connected: boolean;
        lastSync?: string;
    };
}
export declare function getRootPath(): Promise<string | null>;
export declare function addExcludedRepo(rootPath: string, repoPath: string): Promise<void>;
export declare function removeExcludedRepo(rootPath: string, repoPath: string): Promise<void>;
export declare function readProjectRegistry(rootPath: string): Promise<ProjectRegistryEntry[]>;
export declare function writeProjectRegistry(rootPath: string, entries: ProjectRegistryEntry[]): Promise<void>;
export declare function getProjectsList(rootPath: string): Promise<{
    success: boolean;
    projects: {
        name: string;
        path: string;
        repoPath: string;
        status: string;
        lastUpdate: string;
        hasChanges: boolean;
        order: number;
        rating: number;
    }[];
}>;
