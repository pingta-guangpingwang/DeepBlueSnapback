/**
 * OpenClaw Tool Definitions — DBHT commands exposed as Agent Tools
 *
 * These tools are consumed by OpenClaw agents (Claude Code, Cursor, etc.)
 * to interact with DBHT version control programmatically.
 */
export interface ToolParameter {
    name: string;
    type: 'string' | 'number' | 'boolean';
    description: string;
    required: boolean;
    default?: string | number | boolean;
}
export interface ToolDefinition {
    name: string;
    description: string;
    category: 'version-control' | 'search' | 'analysis' | 'config';
    parameters: ToolParameter[];
    confirmRequired: boolean;
    handlerRef: string;
}
export declare const DBHT_OPENCLAW_TOOLS: ToolDefinition[];
/**
 * Get tool manifest for OpenClaw agent discovery
 */
export declare function getToolsManifest(): {
    version: string;
    tools: Array<{
        name: string;
        description: string;
        parameters: Record<string, unknown>;
    }>;
};
