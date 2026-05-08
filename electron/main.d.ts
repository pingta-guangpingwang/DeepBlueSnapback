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
