"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExternalApiConfig = getExternalApiConfig;
exports.loadExternalApiConfig = loadExternalApiConfig;
exports.saveExternalApiConfig = saveExternalApiConfig;
exports.startExternalApi = startExternalApi;
exports.stopExternalApi = stopExternalApi;
exports.getExternalApiStatus = getExternalApiStatus;
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const electron_1 = require("electron");
const dbvs_repository_1 = require("./dbvs-repository");
const CONFIG_FILENAME = 'external-api.json';
let server = null;
let currentConfig = { enabled: false, port: 3281, token: '' };
// ==================== Token Encryption ====================
function encryptToken(token) {
    if (!token)
        return token;
    if (electron_1.safeStorage.isEncryptionAvailable()) {
        const encrypted = electron_1.safeStorage.encryptString(token);
        return 'enc:v1:' + encrypted.toString('base64');
    }
    console.warn('[DBHT] safeStorage encryption unavailable, storing API token with base64 obfuscation');
    return 'b64:v1:' + Buffer.from(token, 'utf-8').toString('base64');
}
function decryptToken(stored) {
    if (!stored)
        return stored;
    if (stored.startsWith('enc:v1:')) {
        const buf = Buffer.from(stored.slice(7), 'base64');
        return electron_1.safeStorage.decryptString(buf);
    }
    if (stored.startsWith('b64:v1:')) {
        return Buffer.from(stored.slice(7), 'base64').toString('utf-8');
    }
    return stored;
}
function getExternalApiConfig() {
    return { ...currentConfig };
}
function loadExternalApiConfig(rootPath) {
    try {
        const configPath = path_1.default.join(rootPath, 'config', CONFIG_FILENAME);
        if (fs_1.default.existsSync(configPath)) {
            const data = fs_1.default.readFileSync(configPath, 'utf-8');
            const parsed = JSON.parse(data);
            if (parsed.token) {
                parsed.token = decryptToken(parsed.token);
            }
            currentConfig = { ...currentConfig, ...parsed };
        }
    }
    catch { /* use defaults */ }
    return { ...currentConfig };
}
function saveExternalApiConfig(rootPath, config) {
    const configDir = path_1.default.join(rootPath, 'config');
    if (!fs_1.default.existsSync(configDir))
        fs_1.default.mkdirSync(configDir, { recursive: true });
    const toSave = { ...config, token: encryptToken(config.token) };
    fs_1.default.writeFileSync(path_1.default.join(configDir, CONFIG_FILENAME), JSON.stringify(toSave, null, 2), 'utf-8');
    currentConfig = { ...config };
}
function authMiddleware(req, res, next) {
    if (!currentConfig.token) {
        next();
        return;
    }
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ') || auth.slice(7) !== currentConfig.token) {
        res.status(401).json({ error: 'Unauthorized', message: 'Invalid or missing Bearer token' });
        return;
    }
    next();
}
function readRegistry(rootPath) {
    try {
        const registryPath = path_1.default.join(rootPath, 'config', 'projects.json');
        if (fs_1.default.existsSync(registryPath)) {
            const raw = JSON.parse(fs_1.default.readFileSync(registryPath, 'utf-8'));
            return raw.map((entry) => {
                if (entry.repoPath)
                    return entry;
                // compat with old format
                return {
                    name: entry.name,
                    repoPath: entry.path,
                    workingCopies: [{ path: entry.path }],
                    created: entry.created,
                };
            });
        }
    }
    catch { /* fall through */ }
    // Fallback: scan repositories/ directory
    const reposDir = path_1.default.join(rootPath, 'repositories');
    const entries = [];
    if (fs_1.default.existsSync(reposDir)) {
        try {
            const dirs = fs_1.default.readdirSync(reposDir);
            for (const dir of dirs) {
                const repoPath = path_1.default.join(reposDir, dir);
                const stat = fs_1.default.statSync(repoPath);
                if (stat.isDirectory() && fs_1.default.existsSync(path_1.default.join(repoPath, 'config.json'))) {
                    entries.push({
                        name: dir, repoPath, workingCopies: [],
                        created: stat.mtime.toISOString(),
                    });
                }
            }
        }
        catch { /* ignore */ }
    }
    return entries;
}
async function startExternalApi(rootPath) {
    if (server) {
        return { success: false, message: `API server is already running on port ${currentConfig.port}` };
    }
    const dbvs = new dbvs_repository_1.DBHTRepository();
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use(authMiddleware);
    // GET /api/v1/status
    app.get('/api/v1/status', async (_req, res) => {
        try {
            const registry = readRegistry(rootPath);
            res.json({
                status: 'running',
                rootPath,
                projects: registry.length,
                timestamp: new Date().toISOString(),
            });
        }
        catch (e) {
            res.status(500).json({ error: 'Internal error', message: String(e) });
        }
    });
    // GET /api/v1/projects
    app.get('/api/v1/projects', async (_req, res) => {
        try {
            const registry = readRegistry(rootPath);
            res.json(registry.map(e => ({
                name: e.name,
                path: e.repoPath,
                workingCopies: e.workingCopies.map(w => w.path),
                gitConfig: e.gitConfig,
            })));
        }
        catch (e) {
            res.status(500).json({ error: String(e) });
        }
    });
    // GET /api/v1/projects/:name/graph-versions
    app.get('/api/v1/projects/:name/graph-versions', async (_req, res) => {
        try {
            const graphsDir = path_1.default.join(rootPath, 'graphs');
            if (!fs_1.default.existsSync(graphsDir)) {
                res.json({ graphs: [] });
                return;
            }
            const files = fs_1.default.readdirSync(graphsDir).filter(f => f.endsWith('.json'));
            res.json({ graphs: files.map(f => f.replace('.json', '')) });
        }
        catch (e) {
            res.status(500).json({ error: String(e) });
        }
    });
    // GET /api/v1/projects/:name/health
    app.get('/api/v1/projects/:name/health', async (req, res) => {
        try {
            const registry = readRegistry(rootPath);
            const proj = registry.find(e => e.name === req.params.name);
            if (!proj) {
                res.status(404).json({ error: 'Project not found' });
                return;
            }
            const history = await dbvs.getHistoryStructured(proj.repoPath);
            if (!history.success || !history.commits?.length) {
                res.status(404).json({ error: 'No commits found' });
                return;
            }
            const { loadGraph } = await Promise.resolve().then(() => __importStar(require('./graph-store')));
            const { generateHealthReport } = await Promise.resolve().then(() => __importStar(require('./health-scorer')));
            const graph = await loadGraph(rootPath, history.commits[0].id);
            if (!graph) {
                res.status(404).json({ error: 'No graph found — run AST analysis first' });
                return;
            }
            const report = generateHealthReport(graph);
            res.json(report);
        }
        catch (e) {
            res.status(500).json({ error: String(e) });
        }
    });
    // GET /api/v1/projects/:name/impact — 变更影响分析
    app.get('/api/v1/projects/:name/impact', async (req, res) => {
        try {
            const registry = readRegistry(rootPath);
            const proj = registry.find(e => e.name === req.params.name);
            if (!proj) {
                res.status(404).json({ error: 'Project not found' });
                return;
            }
            const primaryCopy = proj.workingCopies?.[0];
            if (!primaryCopy) {
                res.status(404).json({ error: 'No working copy' });
                return;
            }
            const history = await dbvs.getHistoryStructured(proj.repoPath);
            if (!history.success || !history.commits?.length) {
                res.status(404).json({ error: 'No commits found' });
                return;
            }
            const { loadGraph } = await Promise.resolve().then(() => __importStar(require('./graph-store')));
            const { analyzeImpact } = await Promise.resolve().then(() => __importStar(require('./impact-analyzer')));
            const graph = await loadGraph(rootPath, history.commits[0].id);
            if (!graph) {
                res.status(404).json({ error: 'No graph found — run AST analysis first' });
                return;
            }
            const diffSummary = await dbvs.getDiffSummary(proj.repoPath, primaryCopy.path);
            if (!diffSummary.success || !diffSummary.files) {
                res.status(400).json({ error: diffSummary.message || 'Cannot get diff' });
                return;
            }
            const report = analyzeImpact(graph, diffSummary.files);
            res.json(report);
        }
        catch (e) {
            res.status(500).json({ error: String(e) });
        }
    });
    // GET /api/v1/projects/:name/rag?q=...
    // Returns RAG-friendly knowledge graph context, optionally filtered by query
    app.get('/api/v1/projects/:name/rag', async (req, res) => {
        try {
            const registry = readRegistry(rootPath);
            const proj = registry.find(e => e.name === req.params.name);
            if (!proj) {
                res.status(404).json({ error: 'Project not found' });
                return;
            }
            const history = await dbvs.getHistoryStructured(proj.repoPath);
            if (!history.success || !history.commits?.length) {
                res.status(404).json({ error: 'No commits found' });
                return;
            }
            const { loadGraph } = await Promise.resolve().then(() => __importStar(require('./graph-store')));
            const graph = await loadGraph(rootPath, history.commits[0].id);
            if (!graph) {
                res.status(404).json({ error: 'No graph found — run AST analysis first' });
                return;
            }
            const query = typeof req.query.q === 'string' ? req.query.q.toLowerCase() : '';
            // Collect all nodes
            const allNodes = [];
            function collectNodes(node, parentId, depth) {
                allNodes.push({
                    id: node.id, label: node.label, type: node.type, path: node.path,
                    fileCount: node.fileCount, lineCount: node.lineCount, exportsCount: node.exportsCount,
                    parentId, depth, childCount: node.children?.length ?? 0,
                });
                if (node.children) {
                    for (const child of node.children)
                        collectNodes(child, node.id, depth + 1);
                }
            }
            collectNodes(graph.rootNode, null, 1);
            // Key relationships
            const keyRelationships = [];
            for (const e of graph.edges) {
                const src = allNodes.find(n => n.id === e.source);
                const tgt = allNodes.find(n => n.id === e.target);
                if (src && tgt) {
                    keyRelationships.push(`[${e.type}] ${String(src.label)} -> ${String(tgt.label)}${e.label ? ` (${e.label})` : ''}`);
                }
            }
            // Filter by query if provided
            const filteredRels = query
                ? keyRelationships.filter(r => r.toLowerCase().includes(query)).slice(0, 50)
                : keyRelationships.slice(0, 50);
            const filteredNodes = query
                ? allNodes.filter(n => {
                    const label = String(n.label).toLowerCase();
                    const path = String(n.path).toLowerCase();
                    const type = String(n.type).toLowerCase();
                    return label.includes(query) || path.includes(query) || type.includes(query);
                }).slice(0, 100)
                : allNodes.slice(0, 100);
            // Build summary
            const buildings = allNodes.filter(n => n.type === 'building');
            const floors = allNodes.filter(n => n.type === 'floor');
            const rooms = allNodes.filter(n => n.type === 'room');
            const summary = [
                `Project "${graph.projectName}" at commit ${history.commits[0].id.slice(0, 14)}.`,
                `Structure: ${buildings.length} buildings (modules), ${floors.length} floors (subdirectories), ${rooms.length} rooms (source files).`,
                `Total: ${graph.metrics.totalLines.toLocaleString()} lines of code across ${graph.metrics.totalFiles} files.`,
                `Circular dependencies: ${graph.metrics.circularDepCount}. Orphan modules: ${graph.metrics.orphanCount}.`,
            ].join('\n');
            res.json({
                projectName: graph.projectName,
                commitId: history.commits[0].id,
                naturalLanguageSummary: summary,
                buildingCount: buildings.length,
                floorCount: floors.length,
                roomCount: rooms.length,
                totalRelationships: keyRelationships.length,
                keyRelationships: filteredRels,
                nodes: filteredNodes,
                metrics: graph.metrics,
                query: query || null,
            });
        }
        catch (e) {
            res.status(500).json({ error: String(e) });
        }
    });
    // POST /api/v1/tasks/complete
    app.post('/api/v1/tasks/complete', async (req, res) => {
        try {
            const { projectName, message, author } = req.body;
            if (!projectName) {
                res.status(400).json({ error: 'projectName is required' });
                return;
            }
            const registry = readRegistry(rootPath);
            const proj = registry.find(e => e.name === projectName);
            if (!proj) {
                res.status(404).json({ error: 'Project not found' });
                return;
            }
            const wc = proj.workingCopies[0];
            if (!wc) {
                res.status(404).json({ error: 'No working copy for project' });
                return;
            }
            const status = await dbvs.getStatus(proj.repoPath, wc.path);
            const changedFiles = (status.status || []).filter((s) => !s.startsWith('?'));
            if (changedFiles.length === 0) {
                res.json({ success: true, message: 'No changes to commit', version: null });
                return;
            }
            const result = await dbvs.commit(proj.repoPath, wc.path, message || '[External API] Task completed — auto snapshot', changedFiles, { author: author || 'external-api' });
            res.json({ success: result.success, message: result.message });
        }
        catch (e) {
            res.status(500).json({ error: String(e) });
        }
    });
    // POST /api/v1/projects/:name/commit
    app.post('/api/v1/projects/:name/commit', async (req, res) => {
        try {
            const { message: commitMsg, author, files: specifiedFiles } = req.body;
            if (!commitMsg) {
                res.status(400).json({ error: 'message is required' });
                return;
            }
            const registry = readRegistry(rootPath);
            const proj = registry.find(e => e.name === req.params.name);
            if (!proj) {
                res.status(404).json({ error: 'Project not found' });
                return;
            }
            const wc = proj.workingCopies[0];
            if (!wc) {
                res.status(404).json({ error: 'No working copy' });
                return;
            }
            const status = await dbvs.getStatus(proj.repoPath, wc.path);
            let files = specifiedFiles;
            if (!files || files.length === 0) {
                files = (status.status || []).filter((s) => !s.startsWith('?'));
            }
            if (files.length === 0) {
                res.json({ success: true, message: 'No files to commit' });
                return;
            }
            const result = await dbvs.commit(proj.repoPath, wc.path, commitMsg, files, {
                author: author || 'external-api',
            });
            res.json({ success: result.success, message: result.message });
        }
        catch (e) {
            res.status(500).json({ error: String(e) });
        }
    });
    // POST /api/v1/projects/:name/vector/index
    app.post('/api/v1/projects/:name/vector/index', async (req, res) => {
        try {
            const name = String(req.params.name);
            const registry = readRegistry(rootPath);
            const proj = registry.find(e => e.name === name);
            if (!proj) {
                res.status(404).json({ error: 'Project not found' });
                return;
            }
            const wc = proj.workingCopies[0];
            if (!wc) {
                res.status(404).json({ error: 'No working copy for project' });
                return;
            }
            const history = await dbvs.getHistoryStructured(proj.repoPath);
            const commitId = (history.success && history.commits?.length > 0)
                ? history.commits[0].id : 'unknown';
            const { buildVectorIndex } = await Promise.resolve().then(() => __importStar(require('./vector-engine')));
            const filePaths = req.body?.filePaths || undefined;
            const result = await buildVectorIndex(rootPath, wc.path, commitId, name, filePaths);
            res.json(result);
        }
        catch (e) {
            res.status(500).json({ error: String(e) });
        }
    });
    // GET /api/v1/projects/:name/vector/status
    app.get('/api/v1/projects/:name/vector/status', async (req, res) => {
        try {
            const { getVectorStatus } = await Promise.resolve().then(() => __importStar(require('./vector-engine')));
            const result = await getVectorStatus(rootPath, String(req.params.name));
            res.json(result);
        }
        catch (e) {
            res.status(500).json({ error: String(e) });
        }
    });
    // POST /api/v1/projects/:name/vector/search
    app.post('/api/v1/projects/:name/vector/search', async (req, res) => {
        try {
            const { searchVectors } = await Promise.resolve().then(() => __importStar(require('./vector-engine')));
            const { text, topK, minSimilarity, fileTypes } = req.body || {};
            if (!text) {
                res.status(400).json({ error: 'text is required' });
                return;
            }
            const result = await searchVectors(rootPath, String(req.params.name), {
                text, topK, minSimilarity, fileTypes,
            });
            res.json(result);
        }
        catch (e) {
            res.status(500).json({ error: String(e) });
        }
    });
    // DELETE /api/v1/projects/:name/vector
    app.delete('/api/v1/projects/:name/vector', async (req, res) => {
        try {
            const { deleteVectorIndex } = await Promise.resolve().then(() => __importStar(require('./vector-engine')));
            const result = await deleteVectorIndex(rootPath, String(req.params.name));
            res.json(result);
        }
        catch (e) {
            res.status(500).json({ error: String(e) });
        }
    });
    // POST /api/v1/projects/:name/vector/ingest — ingest external files
    app.post('/api/v1/projects/:name/vector/ingest', async (req, res) => {
        try {
            const { filePaths } = req.body || {};
            if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
                return res.status(400).json({ success: false, message: 'filePaths array required' });
            }
            const { ingestFiles } = await Promise.resolve().then(() => __importStar(require('./vector-engine')));
            const name = String(req.params.name);
            const registry = readRegistry(rootPath);
            const proj = registry.find(e => e.name === name);
            if (!proj) {
                res.status(404).json({ error: 'Project not found' });
                return;
            }
            const history = await dbvs.getHistoryStructured(proj.repoPath);
            const commitId = (history.success && history.commits?.length > 0)
                ? history.commits[0].id : 'unknown';
            const result = await ingestFiles(rootPath, filePaths, name, commitId);
            res.json(result);
        }
        catch (e) {
            res.status(500).json({ error: String(e) });
        }
    });
    // GET /api/v1/projects/:name/vector/files — list indexed files
    app.get('/api/v1/projects/:name/vector/files', async (req, res) => {
        try {
            const { getIndexedFiles } = await Promise.resolve().then(() => __importStar(require('./vector-engine')));
            const result = await getIndexedFiles(rootPath, String(req.params.name));
            res.json(result);
        }
        catch (e) {
            res.status(500).json({ error: String(e) });
        }
    });
    // DELETE /api/v1/projects/:name/vector/files — remove files from index
    app.delete('/api/v1/projects/:name/vector/files', async (req, res) => {
        try {
            const { filePaths } = req.body || {};
            if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
                return res.status(400).json({ success: false, message: 'filePaths array required' });
            }
            const { removeFilesFromIndex } = await Promise.resolve().then(() => __importStar(require('./vector-engine')));
            const name = String(req.params.name);
            const result = await removeFilesFromIndex(rootPath, '', '', name, filePaths);
            res.json(result);
        }
        catch (e) {
            res.status(500).json({ error: String(e) });
        }
    });
    // GET /api/v1/projects/:name/vector/export — export index
    app.get('/api/v1/projects/:name/vector/export', async (req, res) => {
        try {
            const { exportVectorIndex } = await Promise.resolve().then(() => __importStar(require('./vector-engine')));
            const result = await exportVectorIndex(rootPath, String(req.params.name));
            if (result.success && result.data) {
                res.type('application/json').send(result.data);
            }
            else {
                res.json(result);
            }
        }
        catch (e) {
            res.status(500).json({ error: String(e) });
        }
    });
    // POST /api/v1/projects/:name/vector/import — import index
    app.post('/api/v1/projects/:name/vector/import', async (req, res) => {
        try {
            const data = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
            const { importVectorIndex } = await Promise.resolve().then(() => __importStar(require('./vector-engine')));
            const result = await importVectorIndex(rootPath, String(req.params.name), data);
            res.json(result);
        }
        catch (e) {
            res.status(500).json({ error: String(e) });
        }
    });
    // GET /api/v1/projects/:name/vector/supported — list supported formats
    app.get('/api/v1/projects/:name/vector/supported', async (_req, res) => {
        try {
            const { getSupportedExtensions } = await Promise.resolve().then(() => __importStar(require('./vector-engine')));
            res.json(getSupportedExtensions());
        }
        catch (e) {
            res.status(500).json({ error: String(e) });
        }
    });
    // ==================== OpenClaw Agent Tools ====================
    // GET /api/v1/tools — get OpenClaw tool manifest
    app.get('/api/v1/tools', async (_req, res) => {
        try {
            const { getToolsManifest } = await Promise.resolve().then(() => __importStar(require('./openclaw-tools')));
            res.json(getToolsManifest());
        }
        catch (e) {
            res.status(500).json({ error: String(e) });
        }
    });
    // POST /api/v1/tools/:name/invoke — invoke an OpenClaw tool
    app.post('/api/v1/tools/:name/invoke', async (req, res) => {
        try {
            const { DBHT_OPENCLAW_TOOLS } = await Promise.resolve().then(() => __importStar(require('./openclaw-tools')));
            const toolName = String(req.params.name);
            const tool = DBHT_OPENCLAW_TOOLS.find(t => t.name === toolName);
            if (!tool) {
                res.status(404).json({ error: `Unknown tool: ${toolName}` });
                return;
            }
            const params = req.body || {};
            // Helper: resolve projectPath → { repoPath, workingCopyPath }
            const resolveProject = async (projectPath) => {
                if (!projectPath)
                    return null;
                const registry2 = readRegistry(rootPath);
                for (const entry of registry2) {
                    const wc = entry.workingCopies?.[0];
                    if (entry.repoPath === projectPath || wc?.path === projectPath) {
                        return { repoPath: entry.repoPath, workingCopyPath: wc?.path || entry.repoPath };
                    }
                }
                // Fallback: check if projectPath is a working copy with .dbvs-link.json
                try {
                    const linkPath = path_1.default.join(projectPath, '.dbvs-link.json');
                    if (fs_1.default.existsSync(linkPath)) {
                        const link = JSON.parse(fs_1.default.readFileSync(linkPath, 'utf-8'));
                        return { repoPath: link.repoPath, workingCopyPath: projectPath };
                    }
                }
                catch { /* ignore */ }
                return null;
            };
            switch (toolName) {
                case 'dbht_commit': {
                    const resolved = await resolveProject(params.projectPath);
                    if (!resolved) {
                        res.status(400).json({ success: false, message: 'Cannot resolve project path' });
                        return;
                    }
                    const status = await dbvs.getStatus(resolved.repoPath, resolved.workingCopyPath);
                    const files = params.files
                        ? String(params.files).split(',').map((f) => f.trim())
                        : (status.status || []).filter((s) => !s.startsWith('?'));
                    if (files.length === 0) {
                        res.json({ success: true, message: 'No files to commit' });
                        return;
                    }
                    const result = await dbvs.commit(resolved.repoPath, resolved.workingCopyPath, params.message || 'AI auto commit', files, { sessionId: params.sessionId });
                    res.json(result);
                    return;
                }
                case 'dbht_history': {
                    const resolved = await resolveProject(params.projectPath);
                    if (!resolved) {
                        res.status(400).json({ success: false, message: 'Cannot resolve project path' });
                        return;
                    }
                    const result = await dbvs.getHistoryStructured(resolved.repoPath);
                    res.json(result);
                    return;
                }
                case 'dbht_search': {
                    const { searchVectors } = await Promise.resolve().then(() => __importStar(require('./vector-engine')));
                    const result = await searchVectors(rootPath, params.projectName || '', {
                        text: params.query || '',
                        topK: params.topK || 10,
                        searchMode: params.searchMode || 'hybrid',
                    });
                    res.json(result);
                    return;
                }
                case 'dbht_cross_ref': {
                    const { analyzeCrossReferences } = await Promise.resolve().then(() => __importStar(require('./cross-ref-analyzer')));
                    const registry3 = readRegistry(rootPath);
                    const projectName = params.projectPath ? path_1.default.basename(String(params.projectPath)) : '';
                    const result = await analyzeCrossReferences(rootPath, projectName, registry3);
                    res.json(result);
                    return;
                }
                case 'dbht_rollback': {
                    const resolved = await resolveProject(params.projectPath);
                    if (!resolved) {
                        res.status(400).json({ success: false, message: 'Cannot resolve project path' });
                        return;
                    }
                    const result = await dbvs.rollback(resolved.repoPath, resolved.workingCopyPath, params.version);
                    res.json(result);
                    return;
                }
                case 'dbht_diff': {
                    const resolved = await resolveProject(params.projectPath);
                    if (!resolved) {
                        res.status(400).json({ success: false, message: 'Cannot resolve project path' });
                        return;
                    }
                    if (params.impact) {
                        const history = await dbvs.getHistoryStructured(resolved.repoPath);
                        if (!history.success || !history.commits?.length) {
                            res.status(404).json({ success: false, message: 'No commits found' });
                            return;
                        }
                        const { loadGraph } = await Promise.resolve().then(() => __importStar(require('./graph-store')));
                        const { analyzeImpact } = await Promise.resolve().then(() => __importStar(require('./impact-analyzer')));
                        const graph = await loadGraph(rootPath, history.commits[0].id);
                        if (!graph) {
                            res.status(404).json({ success: false, message: 'No graph found' });
                            return;
                        }
                        const diffSummary = await dbvs.getDiffSummary(resolved.repoPath, resolved.workingCopyPath);
                        if (!diffSummary.success || !diffSummary.files) {
                            res.status(400).json({ success: false, message: diffSummary.message || 'Cannot get diff summary' });
                            return;
                        }
                        res.json({ success: true, report: analyzeImpact(graph, diffSummary.files) });
                        return;
                    }
                    const result = await dbvs.getDiff(resolved.repoPath, resolved.workingCopyPath, params.file || '');
                    res.json(result);
                    return;
                }
                case 'dbht_health': {
                    let resolved = null;
                    if (params.projectPath) {
                        resolved = await resolveProject(params.projectPath);
                    }
                    else {
                        const registry4 = readRegistry(rootPath);
                        const entry = registry4[0];
                        if (entry) {
                            const wc = entry.workingCopies?.[0];
                            resolved = wc ? { repoPath: entry.repoPath, workingCopyPath: wc.path } : null;
                        }
                    }
                    if (!resolved) {
                        res.status(400).json({ success: false, message: 'Cannot resolve project path' });
                        return;
                    }
                    const history = await dbvs.getHistoryStructured(resolved.repoPath);
                    if (!history.success || !history.commits?.length) {
                        res.status(404).json({ success: false, message: 'No commits found' });
                        return;
                    }
                    const { loadGraph } = await Promise.resolve().then(() => __importStar(require('./graph-store')));
                    const { generateHealthReport } = await Promise.resolve().then(() => __importStar(require('./health-scorer')));
                    const graph = await loadGraph(rootPath, history.commits[0].id);
                    if (!graph) {
                        res.status(404).json({ success: false, message: 'No graph found' });
                        return;
                    }
                    res.json({ success: true, report: generateHealthReport(graph) });
                    return;
                }
                case 'dbht_status': {
                    const resolved = await resolveProject(params.projectPath);
                    if (!resolved) {
                        res.status(400).json({ success: false, message: 'Cannot resolve project path' });
                        return;
                    }
                    const result = await dbvs.getStatus(resolved.repoPath, resolved.workingCopyPath);
                    res.json(result);
                    return;
                }
                case 'dbht_file_tree': {
                    const resolved = await resolveProject(params.projectPath);
                    if (!resolved) {
                        res.status(400).json({ success: false, message: 'Cannot resolve project path' });
                        return;
                    }
                    const result = await dbvs.getFileTree(resolved.workingCopyPath);
                    res.json(result);
                    return;
                }
                default:
                    res.status(400).json({ success: false, message: `Tool ${toolName} not implemented` });
                    return;
            }
        }
        catch (e) {
            res.status(500).json({ error: String(e) });
        }
    });
    return new Promise(resolve => {
        server = app.listen(currentConfig.port, () => {
            const addr = `http://localhost:${currentConfig.port}`;
            resolve({ success: true, message: `API server started on ${addr}`, port: currentConfig.port, address: addr });
        });
        server.on('error', (err) => {
            server = null;
            resolve({ success: false, message: `Failed to start API server: ${err.message}` });
        });
    });
}
function stopExternalApi() {
    if (!server) {
        return { success: false, message: 'API server is not running' };
    }
    server.close();
    server = null;
    return { success: true, message: 'API server stopped' };
}
function getExternalApiStatus() {
    return { running: server !== null, port: currentConfig.port };
}
