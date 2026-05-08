import type { ArchitectureGraph } from './graph-types';
export interface QualityReport {
    nodeId: string;
    label: string;
    path: string;
    coupling: {
        afferent: number;
        efferent: number;
    };
    instability: number;
    abstractness: number;
    distance: number;
    cyclomaticComplexity: number;
    isGodModule: boolean;
    isOrphan: boolean;
    score: number;
    issues: string[];
}
export interface QualityResult {
    success: boolean;
    message?: string;
    reports: QualityReport[];
    summary: {
        totalModules: number;
        godModules: number;
        orphans: number;
        painZoneModules: number;
        avgComplexity: number;
        avgCoupling: number;
        cloneGroups: number;
        score: number;
        grade: string;
    };
}
export declare function analyzeQuality(graph: ArchitectureGraph): QualityResult;
