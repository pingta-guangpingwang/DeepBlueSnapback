export interface DiffChange {
    path: string;
    status: string;
    added: number;
    removed: number;
}
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
