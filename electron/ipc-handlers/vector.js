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
exports.registerVectorHandlers = registerVectorHandlers;
const electron_1 = require("electron");
const project_registry_1 = require("../project-registry");
const vector_engine_1 = require("../vector-engine");
function registerVectorHandlers(ipcMain, mainWindow) {
    ipcMain.handle('vector:index', async (event, repoPath, workingCopyPath, commitId, projectName, filePaths) => {
        const rootPath = await (0, project_registry_1.getRootPath)();
        if (!rootPath)
            return { success: false, message: 'Root path not configured' };
        const send = (msg) => {
            if (!event.sender.isDestroyed()) {
                event.sender.send('vector:progress', msg);
            }
        };
        return await (0, vector_engine_1.buildVectorIndex)(rootPath, workingCopyPath, commitId, projectName, filePaths, send);
    });
    ipcMain.handle('vector:status', async (_, projectName) => {
        const rootPath = await (0, project_registry_1.getRootPath)();
        if (!rootPath)
            return { success: false, message: 'Root path not configured' };
        return await (0, vector_engine_1.getVectorStatus)(rootPath, projectName);
    });
    ipcMain.handle('vector:delete', async (_, projectName) => {
        const rootPath = await (0, project_registry_1.getRootPath)();
        if (!rootPath)
            return { success: false, message: 'Root path not configured' };
        return await (0, vector_engine_1.deleteVectorIndex)(rootPath, projectName);
    });
    ipcMain.handle('vector:search', async (_, projectName, query) => {
        const rootPath = await (0, project_registry_1.getRootPath)();
        if (!rootPath)
            return { success: false, results: [], message: 'Root path not configured' };
        return await (0, vector_engine_1.searchVectors)(rootPath, projectName, query);
    });
    ipcMain.handle('vector:search-batch', async (_, projectName, queries) => {
        const rootPath = await (0, project_registry_1.getRootPath)();
        if (!rootPath)
            return { success: false, results: [], message: 'Root path not configured' };
        return await (0, vector_engine_1.searchBatchVectors)(rootPath, projectName, queries);
    });
    ipcMain.handle('vector:enhance-rag', async (_, projectName, query, topK) => {
        const rootPath = await (0, project_registry_1.getRootPath)();
        if (!rootPath)
            return { success: false, vectorResults: [], message: 'Root path not configured' };
        return await (0, vector_engine_1.enhanceRagContext)(rootPath, projectName, query, topK ?? 5);
    });
    ipcMain.handle('vector:files', async (_, projectName) => {
        const rootPath = await (0, project_registry_1.getRootPath)();
        if (!rootPath)
            return { success: false, files: [], message: 'Root path not configured' };
        return await (0, vector_engine_1.getIndexedFiles)(rootPath, projectName);
    });
    ipcMain.handle('vector:file-chunks', async (_, projectName, filePath) => {
        const rootPath = await (0, project_registry_1.getRootPath)();
        if (!rootPath)
            return { success: false, chunks: [], message: 'Root path not configured' };
        return await (0, vector_engine_1.getFileChunks)(rootPath, projectName, filePath);
    });
    ipcMain.handle('vector:remove-files', async (event, workingCopyPath, commitId, projectName, filePaths) => {
        const rootPath = await (0, project_registry_1.getRootPath)();
        if (!rootPath)
            return { success: false, message: 'Root path not configured' };
        const send = (msg) => {
            if (!event.sender.isDestroyed())
                event.sender.send('vector:progress', msg);
        };
        return await (0, vector_engine_1.removeFilesFromIndex)(rootPath, workingCopyPath, commitId, projectName, filePaths, send);
    });
    ipcMain.handle('vector:export', async (_, projectName) => {
        const rootPath = await (0, project_registry_1.getRootPath)();
        if (!rootPath)
            return { success: false, message: 'Root path not configured' };
        return await (0, vector_engine_1.exportVectorIndex)(rootPath, projectName);
    });
    ipcMain.handle('vector:import', async (_, projectName, data) => {
        const rootPath = await (0, project_registry_1.getRootPath)();
        if (!rootPath)
            return { success: false, message: 'Root path not configured' };
        return await (0, vector_engine_1.importVectorIndex)(rootPath, projectName, data);
    });
    ipcMain.handle('vector:ingest-files', async (event, projectName, filePaths, workingCopyPath, commitId) => {
        const rootPath = await (0, project_registry_1.getRootPath)();
        if (!rootPath)
            return { success: false, message: 'Root path not configured' };
        const send = (msg) => {
            if (!event.sender.isDestroyed())
                event.sender.send('vector:progress', msg);
        };
        return await (0, vector_engine_1.ingestFiles)(rootPath, filePaths, projectName, commitId, send);
    });
    ipcMain.handle('vector:open-files-dialog', async () => {
        if (!mainWindow)
            return { canceled: true, filePaths: [] };
        const result = await electron_1.dialog.showOpenDialog(mainWindow, {
            properties: ['openFile', 'multiSelections'],
            title: 'Select files to add to Vector Knowledge Base',
            filters: [
                { name: 'All Supported', extensions: ['pdf', 'docx', 'txt', 'md', 'csv', 'json', 'xml', 'html', 'css', 'yaml', 'yml', 'ts', 'tsx', 'js', 'jsx', 'py', 'java', 'cs', 'go', 'rs', 'c', 'cpp', 'h', 'rb', 'php', 'kt', 'swift', 'dart', 'lua', 'sh', 'scss', 'sql', 'toml', 'ini', 'bat', 'ps1'] },
                { name: 'Documents', extensions: ['pdf', 'docx', 'txt', 'md'] },
                { name: 'Code', extensions: ['ts', 'tsx', 'js', 'jsx', 'py', 'java', 'cs', 'go', 'rs', 'cpp', 'c', 'h', 'rb', 'php', 'kt', 'swift', 'dart', 'lua', 'sh', 'sql'] },
                { name: 'Data', extensions: ['csv', 'json', 'xml', 'yaml', 'yml', 'toml', 'ini'] },
                { name: 'Web', extensions: ['html', 'htm', 'css', 'scss'] },
                { name: 'All Files', extensions: ['*'] },
            ],
        });
        return { canceled: result.canceled, filePaths: result.filePaths };
    });
    ipcMain.handle('vector:open-folder-dialog', async () => {
        if (!mainWindow)
            return { canceled: true, filePaths: [] };
        const result = await electron_1.dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory'],
            title: 'Select folder to scan for supported files',
        });
        if (result.canceled || result.filePaths.length === 0)
            return { canceled: true, filePaths: [] };
        const folderPath = result.filePaths[0];
        const { findSupportedFiles } = await Promise.resolve().then(() => __importStar(require('../file-parser')));
        const filePaths = findSupportedFiles(folderPath);
        return { canceled: false, filePaths };
    });
    ipcMain.handle('vector:get-supported-extensions', async () => {
        return (0, vector_engine_1.getSupportedExtensions)();
    });
} // end registerVectorHandlers
