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
exports.registerGitHandlers = registerGitHandlers;
const path = __importStar(require("path"));
const project_registry_1 = require("../project-registry");
function registerGitHandlers(ipcMain, mainWindow, gitBridge) {
    // Git: 连接远程仓库
    ipcMain.handle('git:connect', async (_, workingCopyPath, remoteUrl, branch, username, token) => {
        const result = await gitBridge.connectRepo(workingCopyPath, remoteUrl, branch, { username, token }, (msg) => {
            mainWindow?.webContents.send('git:progress', msg);
        });
        if (result.success) {
            try {
                const rootPath = await (0, project_registry_1.getRootPath)();
                if (rootPath) {
                    const registry = await (0, project_registry_1.readProjectRegistry)(rootPath);
                    const normalized = path.resolve(workingCopyPath);
                    for (const entry of registry) {
                        const wc = entry.workingCopies.find(wc => path.resolve(wc.path) === normalized);
                        if (wc) {
                            entry.gitConfig = { remoteUrl, branch, connected: true };
                            await (0, project_registry_1.writeProjectRegistry)(rootPath, registry);
                            break;
                        }
                    }
                }
            }
            catch { /* ignore registry update failure */ }
        }
        return result;
    });
    // Git: 断开远程仓库
    ipcMain.handle('git:disconnect', async (_, workingCopyPath) => {
        const result = await gitBridge.disconnectRepo(workingCopyPath);
        if (result.success) {
            try {
                const rootPath = await (0, project_registry_1.getRootPath)();
                if (rootPath) {
                    const registry = await (0, project_registry_1.readProjectRegistry)(rootPath);
                    const normalized = path.resolve(workingCopyPath);
                    for (const entry of registry) {
                        if (entry.workingCopies.some(wc => path.resolve(wc.path) === normalized)) {
                            delete entry.gitConfig;
                            await (0, project_registry_1.writeProjectRegistry)(rootPath, registry);
                            break;
                        }
                    }
                }
            }
            catch { /* ignore */ }
        }
        return result;
    });
    // Git: 获取同步状态
    ipcMain.handle('git:sync-status', async (_, workingCopyPath) => {
        return await gitBridge.getSyncStatus(workingCopyPath);
    });
    // Git: 拉取
    ipcMain.handle('git:pull', async (_, workingCopyPath, username, token) => {
        const result = await gitBridge.pull(workingCopyPath, { username, token }, (msg) => {
            mainWindow?.webContents.send('git:progress', msg);
        });
        if (result.success) {
            try {
                const rootPath = await (0, project_registry_1.getRootPath)();
                if (rootPath) {
                    const registry = await (0, project_registry_1.readProjectRegistry)(rootPath);
                    const normalized = path.resolve(workingCopyPath);
                    for (const entry of registry) {
                        if (entry.workingCopies.some(wc => path.resolve(wc.path) === normalized) && entry.gitConfig) {
                            entry.gitConfig.lastSync = new Date().toISOString();
                            await (0, project_registry_1.writeProjectRegistry)(rootPath, registry);
                            break;
                        }
                    }
                }
            }
            catch { /* ignore */ }
        }
        return result;
    });
    // Git: 推送
    ipcMain.handle('git:push', async (_, workingCopyPath, commitMessage, authorName, authorEmail, username, token) => {
        const result = await gitBridge.push(workingCopyPath, commitMessage, authorName, authorEmail, { username, token }, (msg) => {
            mainWindow?.webContents.send('git:progress', msg);
        });
        if (result.success) {
            try {
                const rootPath = await (0, project_registry_1.getRootPath)();
                if (rootPath) {
                    const registry = await (0, project_registry_1.readProjectRegistry)(rootPath);
                    const normalized = path.resolve(workingCopyPath);
                    for (const entry of registry) {
                        if (entry.workingCopies.some(wc => path.resolve(wc.path) === normalized) && entry.gitConfig) {
                            entry.gitConfig.lastSync = new Date().toISOString();
                            await (0, project_registry_1.writeProjectRegistry)(rootPath, registry);
                            break;
                        }
                    }
                }
            }
            catch { /* ignore */ }
        }
        return result;
    });
    // Git: 解决冲突
    ipcMain.handle('git:resolve-conflict', async (_, workingCopyPath, filePath, resolution) => {
        return await gitBridge.resolveConflict(workingCopyPath, filePath, resolution);
    });
    // Git: 提交合并解决
    ipcMain.handle('git:commit-merge', async (_, workingCopyPath, authorName, authorEmail) => {
        return await gitBridge.commitMergeResolution(workingCopyPath, authorName, authorEmail);
    });
    // Git: 凭证管理
    ipcMain.handle('git:get-credentials', async () => {
        return await gitBridge.getAuthStore();
    });
    ipcMain.handle('git:save-credential', async (_, host, username, token) => {
        return await gitBridge.saveAuthEntry(host, username, token);
    });
    ipcMain.handle('git:delete-credential', async (_, host) => {
        return await gitBridge.deleteAuthEntry(host);
    });
} // end registerGitHandlers
