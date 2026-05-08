import type { QualityResult, QualityReport } from './quality-analyzer';
import type { ArchitectureGraph } from './graph-types';
export interface Suggestion {
    level: 'critical' | 'warning' | 'info';
    code: string;
    params: Record<string, string | number>;
    module?: string;
}
export interface HealthReport {
    score: number;
    grade: string;
    gradeLabel: string;
    summary: QualityResult['summary'];
    topIssues: QualityReport[];
    suggestions: Suggestion[];
    timestamp: string;
}
export declare function generateHealthReport(graph: ArchitectureGraph): HealthReport;
