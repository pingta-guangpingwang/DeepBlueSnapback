import type { ArchitectureGraph, GraphDiff } from './graph-types';
export declare function saveGraph(rootPath: string, graph: ArchitectureGraph): Promise<{
    success: boolean;
    message?: string;
}>;
export declare function loadGraph(rootPath: string, commitId: string): Promise<ArchitectureGraph | null>;
export declare function deleteGraph(rootPath: string, commitId: string): Promise<{
    success: boolean;
    message?: string;
}>;
export declare function listGraphs(rootPath: string): Promise<string[]>;
export declare function graphExists(rootPath: string, commitId: string): Promise<boolean>;
export declare function compareGraphs(graphA: ArchitectureGraph | null, graphB: ArchitectureGraph | null): GraphDiff;
export interface ArchitectureChangeEntry {
    versionId: string;
    timestamp: string;
    previousVersionId?: string;
    summary: {
        nodesAdded: number;
        nodesRemoved: number;
        nodesModified: number;
        edgesAdded: number;
        edgesBroken: number;
        circularDepsChanged: boolean;
        healthScoreChanged?: number;
    };
}
export declare function appendChangeLog(rootPath: string, entry: ArchitectureChangeEntry): Promise<void>;
export declare function getChangeLog(rootPath: string): Promise<ArchitectureChangeEntry[]>;
