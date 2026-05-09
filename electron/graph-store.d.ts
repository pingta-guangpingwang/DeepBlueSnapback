import type { ArchitectureGraph, GraphDiff } from './graph-types';
export declare function saveGraph(rootPath: string, graph: ArchitectureGraph): Promise<{
    success: boolean;
    message?: string;
}>;
export declare function loadGraph(rootPath: string, commitId: string): Promise<ArchitectureGraph | null>;
export declare function listGraphs(rootPath: string): Promise<string[]>;
export declare function compareGraphs(graphA: ArchitectureGraph | null, graphB: ArchitectureGraph | null): GraphDiff;
