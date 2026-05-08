import type { ArchitectureGraph } from './graph-types';
export interface DiffChange {
    path: string;
    status: string;
    added: number;
    removed: number;
}
/**
 * Generate a meaningful Chinese commit message from change patterns.
 * Uses heuristics: file type analysis, change magnitude, naming patterns.
 * Designed as foundation for future LLM enhancement via --ai flag.
 */
export declare function generateCommitMessage(changes: DiffChange[], graph?: ArchitectureGraph): {
    message: string;
    summary: string;
    suggestedLabels: string[];
};
/**
 * Attempt LLM-enhanced commit message via external AI (Claude Code / Cursor / etc.)
 * Falls back to heuristic if LLM is unavailable.
 */
export declare function generateAICommitMessage(changes: DiffChange[], tool: string, getDiffContent?: (filePath: string) => Promise<string>): Promise<{
    message: string;
    summary: string;
    suggestedLabels: string[];
    source: 'ai' | 'heuristic';
}>;
