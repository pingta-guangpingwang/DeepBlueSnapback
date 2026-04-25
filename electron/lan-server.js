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
exports.LANServer = void 0;
const express_1 = __importDefault(require("express"));
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const dbvs_repository_1 = require("./dbvs-repository");
const repo = new dbvs_repository_1.DBVSRepository();
class LANServer {
    constructor() {
        this.server = null;
        this.rootPath = '';
        this.app = (0, express_1.default)();
        this.app.use(express_1.default.json());
        this.setupRoutes();
    }
    setupRoutes() {
        // Get server info
        this.app.get('/api/info', (_req, res) => {
            res.json({
                name: 'DBVS LAN Server',
                version: '2.0.0',
                rootPath: this.rootPath
            });
        });
        // List projects
        this.app.get('/api/projects', async (_req, res) => {
            try {
                const projectsDir = path.join(this.rootPath, 'projects');
                if (!(await fs.pathExists(projectsDir))) {
                    res.json({ success: true, projects: [] });
                    return;
                }
                const entries = await fs.readdir(projectsDir, { withFileTypes: true });
                const projects = [];
                for (const entry of entries) {
                    if (!entry.isDirectory())
                        continue;
                    const projPath = path.join(projectsDir, entry.name);
                    const stat = await fs.stat(projPath);
                    projects.push({
                        name: entry.name,
                        path: entry.name, // relative
                        lastUpdate: stat.mtime.toISOString()
                    });
                }
                res.json({ success: true, projects });
            }
            catch (error) {
                res.status(500).json({ success: false, message: String(error) });
            }
        });
        // Get project file tree
        this.app.get('/api/projects/:name/files', async (req, res) => {
            try {
                const projectDir = path.join(this.rootPath, 'projects', req.params.name);
                if (!(await fs.pathExists(projectDir))) {
                    res.status(404).json({ success: false, message: '项目不存在' });
                    return;
                }
                const result = await repo.getFileTree(projectDir);
                res.json(result);
            }
            catch (error) {
                res.status(500).json({ success: false, message: String(error) });
            }
        });
        // Get file content
        this.app.get('/api/projects/:name/files/{*filePath}', async (req, res) => {
            try {
                const parts = req.params.filePath;
                const subPath = Array.isArray(parts) ? parts.join('/') : (parts || '');
                const filePath = path.join(this.rootPath, 'projects', req.params.name, subPath);
                if (!(await fs.pathExists(filePath))) {
                    res.status(404).json({ success: false, message: '文件不存在' });
                    return;
                }
                const content = await fs.readFile(filePath, 'utf-8');
                res.json({ success: true, content });
            }
            catch (error) {
                res.status(500).json({ success: false, message: String(error) });
            }
        });
        // Get project status
        this.app.get('/api/projects/:name/status', async (req, res) => {
            try {
                const repoPath = path.join(this.rootPath, 'repositories', req.params.name);
                const projectDir = path.join(this.rootPath, 'projects', req.params.name);
                const result = await repo.getStatus(repoPath, projectDir);
                res.json(result);
            }
            catch (error) {
                res.status(500).json({ success: false, message: String(error) });
            }
        });
        // Get project history
        this.app.get('/api/projects/:name/history', async (req, res) => {
            try {
                const repoPath = path.join(this.rootPath, 'repositories', req.params.name);
                const result = await repo.getHistory(repoPath);
                res.json(result);
            }
            catch (error) {
                res.status(500).json({ success: false, message: String(error) });
            }
        });
        // Commit changes
        this.app.post('/api/projects/:name/commit', async (req, res) => {
            try {
                const { message, files } = req.body;
                const repoPath = path.join(this.rootPath, 'repositories', req.params.name);
                const projectDir = path.join(this.rootPath, 'projects', req.params.name);
                const result = await repo.commit(repoPath, projectDir, message, files);
                res.json(result);
            }
            catch (error) {
                res.status(500).json({ success: false, message: String(error) });
            }
        });
        // Rollback to version
        this.app.post('/api/projects/:name/rollback', async (req, res) => {
            try {
                const { version } = req.body;
                if (!version) {
                    res.status(400).json({ success: false, message: '缺少版本号' });
                    return;
                }
                const repoPath = path.join(this.rootPath, 'repositories', req.params.name);
                const projectDir = path.join(this.rootPath, 'projects', req.params.name);
                const result = await repo.rollback(repoPath, projectDir, version);
                res.json(result);
            }
            catch (error) {
                res.status(500).json({ success: false, message: String(error) });
            }
        });
        // Update to latest version
        this.app.post('/api/projects/:name/update', async (req, res) => {
            try {
                const repoPath = path.join(this.rootPath, 'repositories', req.params.name);
                const projectDir = path.join(this.rootPath, 'projects', req.params.name);
                const result = await repo.update(repoPath, projectDir);
                res.json(result);
            }
            catch (error) {
                res.status(500).json({ success: false, message: String(error) });
            }
        });
        // Get file diff
        this.app.get('/api/projects/:name/diff', async (req, res) => {
            try {
                const { file, versionA, versionB } = req.query;
                if (!file) {
                    res.status(400).json({ success: false, message: '缺少文件路径' });
                    return;
                }
                const repoPath = path.join(this.rootPath, 'repositories', req.params.name);
                const projectDir = path.join(this.rootPath, 'projects', req.params.name);
                const result = await repo.getDiff(repoPath, projectDir, String(file), versionA, versionB);
                res.json(result);
            }
            catch (error) {
                res.status(500).json({ success: false, message: String(error) });
            }
        });
        // Get repository info
        this.app.get('/api/projects/:name/info', async (req, res) => {
            try {
                const repoPath = path.join(this.rootPath, 'repositories', req.params.name);
                const result = await repo.getRepositoryInfo(repoPath);
                res.json(result);
            }
            catch (error) {
                res.status(500).json({ success: false, message: String(error) });
            }
        });
        // Verify repository integrity
        this.app.get('/api/projects/:name/verify', async (req, res) => {
            try {
                const projectDir = path.join(this.rootPath, 'projects', req.params.name);
                const result = await repo.verify(projectDir);
                res.json(result);
            }
            catch (error) {
                res.status(500).json({ success: false, message: String(error) });
            }
        });
        // Download project as zip (for client sync)
        this.app.get('/api/projects/:name/download', async (req, res) => {
            try {
                const projectDir = path.join(this.rootPath, 'projects', req.params.name);
                if (!(await fs.pathExists(projectDir))) {
                    res.status(404).json({ success: false, message: '项目不存在' });
                    return;
                }
                // Simple: tar the directory
                // For now, return file list and let client fetch individually
                const result = await repo.getFileTree(projectDir);
                res.json(result);
            }
            catch (error) {
                res.status(500).json({ success: false, message: String(error) });
            }
        });
    }
    /**
     * Start the LAN server
     */
    async start(rootPath, port = 3280) {
        this.rootPath = rootPath;
        return new Promise((resolve) => {
            this.server = this.app.listen(port, '0.0.0.0', () => {
                const address = `http://localhost:${port}`;
                resolve({ success: true, address, message: `LAN 服务器已启动: ${address}` });
            });
        });
    }
    /**
     * Stop the server
     */
    stop() {
        if (this.server) {
            this.server.close();
            this.server = null;
        }
    }
    /**
     * Get server status
     */
    getStatus() {
        return {
            running: this.server !== null,
            rootPath: this.rootPath
        };
    }
}
exports.LANServer = LANServer;
