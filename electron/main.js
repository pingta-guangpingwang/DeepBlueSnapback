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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProjectsList = void 0;
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const net = __importStar(require("net"));
const dbvs_repository_1 = require("./dbvs-repository");
const git_bridge_1 = require("./git-bridge");
const lan_server_1 = require("./lan-server");
const context_menu_1 = require("./context-menu");
const project_registry_1 = require("./project-registry");
Object.defineProperty(exports, "getProjectsList", { enumerable: true, get: function () { return project_registry_1.getProjectsList; } });
const openclaw_tools_1 = require("./openclaw-tools");
const cross_ref_analyzer_1 = require("./cross-ref-analyzer");
const impact_analyzer_1 = require("./impact-analyzer");
const graph_store_1 = require("./graph-store");
const health_scorer_1 = require("./health-scorer");
const vector_engine_1 = require("./vector-engine");
const dbgvs_project_1 = require("./ipc-handlers/dbgvs-project");
const dbgvs_vcs_1 = require("./ipc-handlers/dbgvs-vcs");
const graph_1 = require("./ipc-handlers/graph");
const git_1 = require("./ipc-handlers/git");
const vector_1 = require("./ipc-handlers/vector");
let mainWindow = null;
const dbvsRepo = new dbvs_repository_1.DBHTRepository();
const gitBridge = new git_bridge_1.GitBridge();
const lanServer = new lan_server_1.LANServer();
const cliCommand = (0, context_menu_1.parseCommandLine)(process.argv);
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        frame: false,
        titleBarStyle: 'hidden',
        trafficLightPosition: { x: 15, y: 15 },
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        backgroundColor: '#ffffff',
        show: false
    });
    if (process.env.NODE_ENV !== 'development') {
        mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
            callback({
                responseHeaders: {
                    ...details.responseHeaders,
                    'Content-Security-Policy': [
                        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:"
                    ]
                }
            });
        });
    }
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:3005');
    }
    else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
        if (cliCommand) {
            mainWindow?.webContents.send('cli:action', cliCommand);
        }
    });
    const menuTemplate = [
        {
            label: '文件',
            submenu: [
                { label: '新建项目', accelerator: 'CmdOrCtrl+N', click: () => mainWindow?.webContents.send('menu:new-project') },
                { label: '打开项目', accelerator: 'CmdOrCtrl+O', click: () => mainWindow?.webContents.send('menu:open-project') },
                { type: 'separator' },
                { label: '退出', accelerator: 'CmdOrCtrl+Q', role: 'quit' }
            ]
        },
        {
            label: '编辑',
            submenu: [
                { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
                { label: '重做', accelerator: 'CmdOrCtrl+Shift+Z', role: 'redo' },
                { type: 'separator' },
                { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
                { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
                { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' }
            ]
        },
        {
            label: '视图',
            submenu: [
                { label: '重新加载', accelerator: 'CmdOrCtrl+R', role: 'reload' },
                { label: '强制重新加载', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
                { type: 'separator' },
                { label: '实际大小', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
                { label: '放大', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
                { label: '缩小', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
                { type: 'separator' },
                { label: '全屏', accelerator: 'F11', role: 'togglefullscreen' },
                { label: '开发者工具', accelerator: 'F12', role: 'toggleDevTools' }
            ]
        },
    ];
    const menu = electron_1.Menu.buildFromTemplate(menuTemplate);
    electron_1.Menu.setApplicationMenu(menu);
}
// ==================== IPC Handler Registration ====================
function registerIPCHandlers() {
    // Window controls
    electron_1.ipcMain.handle('window:minimize', () => mainWindow?.minimize());
    electron_1.ipcMain.handle('window:maximize', () => {
        if (mainWindow?.isMaximized()) {
            mainWindow.unmaximize();
        }
        else {
            mainWindow?.maximize();
        }
    });
    electron_1.ipcMain.handle('window:close', () => mainWindow?.close());
    electron_1.ipcMain.handle('window:is-maximized', () => mainWindow?.isMaximized());
    // 文件夹选择
    electron_1.ipcMain.handle('dialog:select-folder', async () => {
        const result = await electron_1.dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory', 'createDirectory'],
            title: '选择项目文件夹'
        });
        return result.canceled ? null : result.filePaths[0];
    });
    // 打开本地文件夹
    electron_1.ipcMain.handle('shell:open-folder', async (_, folderPath) => {
        electron_1.shell.openPath(folderPath);
    });
    // 读取文件内容
    electron_1.ipcMain.handle('fs:read-file', async (_, filePath) => {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            return { success: true, content };
        }
        catch (error) {
            return { success: false, error: String(error) };
        }
    });
    // 创建空文件
    electron_1.ipcMain.handle('fs:create-file', async (_, filePath) => {
        try {
            await fs.ensureDir(path.dirname(filePath));
            if (!(await fs.pathExists(filePath))) {
                await fs.writeFile(filePath, '');
            }
            return { success: true };
        }
        catch (error) {
            return { success: false, message: String(error) };
        }
    });
    // 写入文件内容
    electron_1.ipcMain.handle('fs:write-file', async (_, filePath, content) => {
        try {
            await fs.ensureDir(path.dirname(filePath));
            await fs.writeFile(filePath, content, 'utf-8');
            return { success: true };
        }
        catch (error) {
            return { success: false, message: String(error) };
        }
    });
    // 删除文件
    electron_1.ipcMain.handle('fs:delete-file', async (_, filePath) => {
        try {
            await fs.remove(filePath);
            return { success: true };
        }
        catch (error) {
            return { success: false, message: String(error) };
        }
    });
    // 递归列出目录文件
    electron_1.ipcMain.handle('fs:list-files', async (_, dirPath) => {
        const results = [];
        const errors = [];
        async function walk(dir, base, depth) {
            if (depth > 20)
                return;
            if (!(await fs.pathExists(dir)))
                return;
            let entries;
            try {
                entries = await fs.readdir(dir, { withFileTypes: true });
            }
            catch (err) {
                errors.push(`${dir}: ${String(err)}`);
                return;
            }
            for (const entry of entries) {
                if (entry.name.startsWith('.') || entry.name === 'node_modules')
                    continue;
                const fullPath = path.join(dir, entry.name);
                const relPath = path.relative(base, fullPath).replace(/\\/g, '/');
                try {
                    if (entry.isDirectory()) {
                        results.push({ name: entry.name, path: relPath, isDirectory: true });
                        await walk(fullPath, base, depth + 1);
                    }
                    else {
                        results.push({ name: entry.name, path: relPath, isDirectory: false });
                    }
                }
                catch (err) {
                    errors.push(`${relPath}: ${String(err)}`);
                }
            }
        }
        try {
            await walk(dirPath, dirPath, 0);
            return { success: true, files: results, errors: errors.length > 0 ? errors : undefined };
        }
        catch (error) {
            return { success: false, files: results, message: String(error), errors };
        }
    });
    // 路径拼接
    electron_1.ipcMain.handle('fs:path-join', async (_, ...paths) => {
        return { result: path.join(...paths) };
    });
    // 获取路径基础名
    electron_1.ipcMain.handle('fs:path-basename', async (_, filePath) => {
        return { result: path.basename(filePath) };
    });
    // 右键菜单
    electron_1.ipcMain.handle('context-menu:register', async () => {
        return await (0, context_menu_1.registerContextMenu)();
    });
    electron_1.ipcMain.handle('context-menu:unregister', async () => {
        return await (0, context_menu_1.unregisterContextMenu)();
    });
    electron_1.ipcMain.handle('context-menu:is-registered', async () => {
        return await (0, context_menu_1.isContextMenuRegistered)();
    });
    // ---- Delegated handler modules ----
    (0, dbgvs_project_1.registerProjectHandlers)(electron_1.ipcMain, mainWindow, dbvsRepo);
    (0, dbgvs_vcs_1.registerVcsHandlers)(electron_1.ipcMain, mainWindow, dbvsRepo);
    (0, graph_1.registerGraphHandlers)(electron_1.ipcMain, mainWindow, dbvsRepo);
    (0, git_1.registerGitHandlers)(electron_1.ipcMain, mainWindow, gitBridge);
    (0, vector_1.registerVectorHandlers)(electron_1.ipcMain, mainWindow);
    // ---- External API ----
    let externalApi = null;
    electron_1.ipcMain.handle('external-api:start', async () => {
        const rootPath = await (0, project_registry_1.getRootPath)();
        if (!rootPath)
            return { success: false, message: 'Root path not configured' };
        if (!externalApi)
            externalApi = await Promise.resolve().then(() => __importStar(require('./external-api')));
        return externalApi.startExternalApi(rootPath);
    });
    electron_1.ipcMain.handle('external-api:stop', async () => {
        if (!externalApi)
            externalApi = await Promise.resolve().then(() => __importStar(require('./external-api')));
        return externalApi.stopExternalApi();
    });
    electron_1.ipcMain.handle('external-api:status', async () => {
        if (!externalApi)
            externalApi = await Promise.resolve().then(() => __importStar(require('./external-api')));
        return externalApi.getExternalApiStatus();
    });
    electron_1.ipcMain.handle('external-api:get-config', async () => {
        const rootPath = await (0, project_registry_1.getRootPath)();
        if (!rootPath)
            return { enabled: false, port: 3281, token: '' };
        if (!externalApi)
            externalApi = await Promise.resolve().then(() => __importStar(require('./external-api')));
        return externalApi.loadExternalApiConfig(rootPath);
    });
    electron_1.ipcMain.handle('external-api:save-config', async (_, config) => {
        const rootPath = await (0, project_registry_1.getRootPath)();
        if (!rootPath)
            return { success: false, message: 'Root path not configured' };
        if (!externalApi)
            externalApi = await Promise.resolve().then(() => __importStar(require('./external-api')));
        externalApi.saveExternalApiConfig(rootPath, config);
        return { success: true, message: 'Config saved' };
    });
    // ---- LAN Server ----
    electron_1.ipcMain.handle('lan:start', async (_, rootPath, port) => {
        return await lanServer.start(rootPath, port || 3280);
    });
    electron_1.ipcMain.handle('lan:stop', async () => {
        lanServer.stop();
        return { success: true, message: 'LAN 服务器已停止' };
    });
    electron_1.ipcMain.handle('lan:status', async () => {
        return lanServer.getStatus();
    });
    // ---- OpenClaw Agent Tools ----
    electron_1.ipcMain.handle('tools:get-manifest', async () => {
        return (0, openclaw_tools_1.getToolsManifest)();
    });
    electron_1.ipcMain.handle('tools:invoke', async (_, toolName, params) => {
        const tool = openclaw_tools_1.DBHT_OPENCLAW_TOOLS.find(t => t.name === toolName);
        if (!tool)
            return { success: false, message: `Unknown tool: ${toolName}` };
        const rootPath = await (0, project_registry_1.getRootPath)();
        if (!rootPath)
            return { success: false, message: 'Root path not configured' };
        const resolveProject = async (projectPath) => {
            if (!projectPath)
                return null;
            return await dbvsRepo.resolvePaths(projectPath);
        };
        try {
            switch (toolName) {
                case 'dbht_commit': {
                    const resolved = await resolveProject(params.projectPath);
                    if (!resolved)
                        return { success: false, message: 'Cannot resolve project path' };
                    const status = await dbvsRepo.getStatus(resolved.repoPath, resolved.workingCopyPath);
                    const files = params.files
                        ? params.files.split(',').map(f => f.trim())
                        : (status.status || []).filter((s) => !s.startsWith('?'));
                    if (files.length === 0)
                        return { success: true, message: 'No files to commit' };
                    return await dbvsRepo.commit(resolved.repoPath, resolved.workingCopyPath, params.message || 'AI auto commit', files, { sessionId: params.sessionId });
                }
                case 'dbht_history': {
                    const resolved = await resolveProject(params.projectPath);
                    if (!resolved)
                        return { success: false, message: 'Cannot resolve project path' };
                    return await dbvsRepo.getHistoryStructured(resolved.repoPath);
                }
                case 'dbht_search': {
                    return await (0, vector_engine_1.searchVectors)(rootPath, params.projectName || '', {
                        text: params.query,
                        topK: params.topK || 10,
                        searchMode: params.searchMode || 'hybrid',
                    });
                }
                case 'dbht_cross_ref': {
                    const registry = await (0, project_registry_1.readProjectRegistry)(rootPath);
                    const projectName = params.projectPath
                        ? path.basename(params.projectPath)
                        : '';
                    return await (0, cross_ref_analyzer_1.analyzeCrossReferences)(rootPath, projectName, registry);
                }
                case 'dbht_rollback': {
                    const resolved = await resolveProject(params.projectPath);
                    if (!resolved)
                        return { success: false, message: 'Cannot resolve project path' };
                    return await dbvsRepo.rollback(resolved.repoPath, resolved.workingCopyPath, params.version);
                }
                case 'dbht_diff': {
                    const resolved = await resolveProject(params.projectPath);
                    if (!resolved)
                        return { success: false, message: 'Cannot resolve project path' };
                    if (params.impact) {
                        const history = await dbvsRepo.getHistoryStructured(resolved.repoPath);
                        if (!history.success || !history.commits?.length) {
                            return { success: false, message: 'No commits found for impact analysis' };
                        }
                        const graph = await (0, graph_store_1.loadGraph)(rootPath, history.commits[0].id);
                        if (!graph)
                            return { success: false, message: 'No graph found — run AST analysis first' };
                        const diffSummary = await dbvsRepo.getDiffSummary(resolved.repoPath, resolved.workingCopyPath);
                        if (!diffSummary.success || !diffSummary.files) {
                            return { success: false, message: diffSummary.message || 'Cannot get diff summary' };
                        }
                        return { success: true, report: (0, impact_analyzer_1.analyzeImpact)(graph, diffSummary.files) };
                    }
                    return await dbvsRepo.getDiff(resolved.repoPath, resolved.workingCopyPath, params.file || '');
                }
                case 'dbht_health': {
                    const projectPath = params.projectPath;
                    let resolved = null;
                    if (projectPath) {
                        resolved = await resolveProject(projectPath);
                    }
                    else {
                        const registry = await (0, project_registry_1.readProjectRegistry)(rootPath);
                        const entry = registry[0];
                        if (!entry)
                            return { success: false, message: 'No projects found' };
                        const wc = entry.workingCopies[0];
                        if (!wc)
                            return { success: false, message: 'No working copy found' };
                        resolved = { repoPath: entry.repoPath, workingCopyPath: wc.path };
                    }
                    if (!resolved)
                        return { success: false, message: 'Cannot resolve project path' };
                    const history = await dbvsRepo.getHistoryStructured(resolved.repoPath);
                    if (!history.success || !history.commits?.length) {
                        return { success: false, message: 'No commits found — commit something first' };
                    }
                    const graph = await (0, graph_store_1.loadGraph)(rootPath, history.commits[0].id);
                    if (!graph)
                        return { success: false, message: 'No graph found — run AST analysis first' };
                    return { success: true, report: (0, health_scorer_1.generateHealthReport)(graph) };
                }
                case 'dbht_status': {
                    const resolved = await resolveProject(params.projectPath);
                    if (!resolved)
                        return { success: false, message: 'Cannot resolve project path' };
                    return await dbvsRepo.getStatus(resolved.repoPath, resolved.workingCopyPath);
                }
                case 'dbht_file_tree': {
                    const resolved = await resolveProject(params.projectPath);
                    if (!resolved)
                        return { success: false, message: 'Cannot resolve project path' };
                    return await dbvsRepo.getFileTree(resolved.workingCopyPath);
                }
                default:
                    return { success: false, message: `Tool ${toolName} not implemented` };
            }
        }
        catch (e) {
            return { success: false, message: `Tool error: ${String(e)}` };
        }
    });
} // end registerIPCHandlers
// ==================== 启动 ====================
registerIPCHandlers();
electron_1.app.whenReady().then(createWindow);
// ==================== 本地 IPC Server（接收启动器命令）====================
const IPC_PORT_FILE = path.join(process.env.APPDATA || process.env.LOCALAPPDATA || path.join(require('os').homedir(), '.config'), 'DBHT', 'ipc-port');
let ipcServer = null;
function startIpcServer() {
    ipcServer = net.createServer((socket) => {
        let data = '';
        socket.on('data', (chunk) => {
            data += chunk.toString();
        });
        socket.on('end', () => {
            try {
                const cmd = JSON.parse(data);
                if (cmd.action && cmd.path) {
                    console.log(`[IPC] Received command: ${cmd.action} ${cmd.path}`);
                    if (mainWindow) {
                        mainWindow.webContents.send('cli:action', cmd);
                        if (mainWindow.isMinimized())
                            mainWindow.restore();
                        mainWindow.focus();
                    }
                    socket.write('OK');
                }
            }
            catch (e) {
                console.error('[IPC] Invalid command:', e);
                socket.write('ERROR');
            }
            socket.end();
        });
        socket.on('error', () => { });
    });
    ipcServer.listen(0, '127.0.0.1', () => {
        const addr = ipcServer.address();
        const port = addr.port;
        console.log(`[IPC] Listening on 127.0.0.1:${port}`);
        fs.ensureDirSync(path.dirname(IPC_PORT_FILE));
        fs.writeFileSync(IPC_PORT_FILE, String(port));
    });
    ipcServer.on('error', (err) => {
        console.error('[IPC] Server error:', err);
    });
}
function cleanupIpcServer() {
    try {
        if (fs.existsSync(IPC_PORT_FILE)) {
            fs.unlinkSync(IPC_PORT_FILE);
        }
    }
    catch { /* ignore */ }
    if (ipcServer) {
        ipcServer.close();
    }
}
electron_1.app.on('ready', () => {
    startIpcServer();
});
electron_1.app.on('before-quit', () => {
    cleanupIpcServer();
});
electron_1.app.on('window-all-closed', () => {
    cleanupIpcServer();
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
