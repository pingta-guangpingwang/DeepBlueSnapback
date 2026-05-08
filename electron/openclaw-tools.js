"use strict";
/**
 * OpenClaw Tool Definitions — DBHT commands exposed as Agent Tools
 *
 * These tools are consumed by OpenClaw agents (Claude Code, Cursor, etc.)
 * to interact with DBHT version control programmatically.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DBHT_OPENCLAW_TOOLS = void 0;
exports.getToolsManifest = getToolsManifest;
exports.DBHT_OPENCLAW_TOOLS = [
    {
        name: 'dbht_commit',
        description: '提交项目变更到 DBHT 版本控制，自动生成中文提交信息',
        category: 'version-control',
        parameters: [
            { name: 'projectPath', type: 'string', description: '项目路径（工作副本目录）', required: true },
            { name: 'message', type: 'string', description: '提交信息（留空则自动生成）', required: false },
            { name: 'files', type: 'string', description: '指定文件列表（逗号分隔，默认提交所有变更）', required: false },
            { name: 'sessionId', type: 'string', description: 'AI 会话 ID，用于审计追踪', required: false },
        ],
        confirmRequired: false,
        handlerRef: 'dbvs:commit',
    },
    {
        name: 'dbht_history',
        description: '查看项目版本历史记录',
        category: 'version-control',
        parameters: [
            { name: 'projectPath', type: 'string', description: '项目路径', required: true },
            { name: 'limit', type: 'number', description: '返回条数（默认 20）', required: false, default: 20 },
        ],
        confirmRequired: false,
        handlerRef: 'dbvs:get-history-structured',
    },
    {
        name: 'dbht_search',
        description: '跨项目语义搜索代码和文档（BM25 + 向量混合搜索）',
        category: 'search',
        parameters: [
            { name: 'query', type: 'string', description: '自然语言查询', required: true },
            { name: 'projectName', type: 'string', description: '限定项目名（不填则搜索所有）', required: false },
            { name: 'topK', type: 'number', description: '返回结果数（默认 10）', required: false, default: 10 },
            { name: 'searchMode', type: 'string', description: '搜索模式: hybrid, vector, bm25', required: false, default: 'hybrid' },
        ],
        confirmRequired: false,
        handlerRef: 'vector:search',
    },
    {
        name: 'dbht_cross_ref',
        description: '分析跨项目引用关系，发现项目间的依赖',
        category: 'analysis',
        parameters: [
            { name: 'projectPath', type: 'string', description: '目标项目路径', required: true },
        ],
        confirmRequired: false,
        handlerRef: 'cross-ref:analyze',
    },
    {
        name: 'dbht_rollback',
        description: '回滚项目到指定版本（需要二次确认，不可逆）',
        category: 'version-control',
        parameters: [
            { name: 'projectPath', type: 'string', description: '项目路径', required: true },
            { name: 'version', type: 'string', description: '目标版本号', required: true },
        ],
        confirmRequired: true,
        handlerRef: 'dbvs:rollback',
    },
    {
        name: 'dbht_diff',
        description: '查看项目变更差异或影响分析',
        category: 'analysis',
        parameters: [
            { name: 'projectPath', type: 'string', description: '项目路径', required: true },
            { name: 'file', type: 'string', description: '指定文件路径（相对路径）', required: false },
            { name: 'impact', type: 'boolean', description: '是否进行影响分析', required: false, default: false },
        ],
        confirmRequired: false,
        handlerRef: 'dbvs:diff',
    },
    {
        name: 'dbht_health',
        description: '项目健康检查：代码质量、耦合度、死代码检测',
        category: 'analysis',
        parameters: [
            { name: 'projectPath', type: 'string', description: '项目路径（默认根仓库）', required: false },
        ],
        confirmRequired: false,
        handlerRef: 'quality:analyze',
    },
    {
        name: 'dbht_status',
        description: '查看工作区状态（哪些文件有变更）',
        category: 'version-control',
        parameters: [
            { name: 'projectPath', type: 'string', description: '项目路径', required: true },
        ],
        confirmRequired: false,
        handlerRef: 'dbvs:status',
    },
    {
        name: 'dbht_file_tree',
        description: '列出项目文件树',
        category: 'version-control',
        parameters: [
            { name: 'projectPath', type: 'string', description: '项目路径', required: true },
        ],
        confirmRequired: false,
        handlerRef: 'dbvs:file-tree',
    },
];
/**
 * Get tool manifest for OpenClaw agent discovery
 */
function getToolsManifest() {
    return {
        version: '1.0.0',
        tools: exports.DBHT_OPENCLAW_TOOLS.map(t => ({
            name: t.name,
            description: t.description + (t.confirmRequired ? ' ⚠️ 需确认' : ''),
            parameters: {
                type: 'object',
                properties: Object.fromEntries(t.parameters.map(p => [
                    p.name,
                    {
                        type: p.type,
                        description: p.description + (p.required ? '' : ' (可选)'),
                        ...(p.default !== undefined ? { default: p.default } : {}),
                    },
                ])),
                required: t.parameters.filter(p => p.required).map(p => p.name),
            },
        })),
    };
}
