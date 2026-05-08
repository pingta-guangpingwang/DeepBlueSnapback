import type { ArchitectureGraph } from './graph-types';
export interface FileImpact {
    filePath: string;
    status: string;
    directDependents: string[];
    indirectDependents: string[];
    affectedEdges: string[];
    riskLevel: 'low' | 'medium' | 'high';
}
export interface ImpactReport {
    version: string;
    timestamp: string;
    changedFiles: number;
    totalAffectedFiles: number;
    highRiskCount: number;
    impacts: FileImpact[];
    summary: string;
}
export declare function analyzeImpact(graph: ArchitectureGraph, changedFiles: Array<{
    path: string;
    status: string;
}>): ImpactReport;
