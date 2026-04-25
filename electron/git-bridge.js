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
exports.GitBridge = void 0;
const isomorphic_git_1 = __importDefault(require("isomorphic-git"));
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const node_1 = __importDefault(require("isomorphic-git/http/node"));
const electron_1 = require("electron");
const DBVS_GITIGNORE = `.dbvs-link.json
.dbvs/
`;
class GitBridge {
    constructor() {
        this.authPath = path.join(electron_1.app.getPath('userData'), 'git-auth.json');
    }
    // ==================== Auth ====================
    async getAuthStore() {
        try {
            if (await fs.pathExists(this.authPath)) {
                return await fs.readJson(this.authPath);
            }
        }
        catch { /* ignore */ }
        return {};
    }
    async saveAuthEntry(host, username, token) {
        try {
            const store = await this.getAuthStore();
            store[host] = { username, token };
            await fs.writeJson(this.authPath, store, { spaces: 2 });
            return { success: true, message: `凭证已保存 (${host})` };
        }
        catch (error) {
            return { success: false, message: String(error) };
        }
    }
    async deleteAuthEntry(host) {
        try {
            const store = await this.getAuthStore();
            delete store[host];
            await fs.writeJson(this.authPath, store, { spaces: 2 });
            return { success: true, message: `凭证已删除 (${host})` };
        }
        catch (error) {
            return { success: false, message: String(error) };
        }
    }
    async resolveAuth(remoteUrl) {
        try {
            const host = new URL(remoteUrl).hostname;
            const store = await this.getAuthStore();
            const entry = store[host];
            if (entry) {
                return { username: entry.username, password: entry.token };
            }
        }
        catch { /* ignore */ }
        return undefined;
    }
    buildOnAuth(auth) {
        return () => ({ username: auth.username, password: auth.token });
    }
    // ==================== Connection ====================
    async connectRepo(dir, remoteUrl, branch, auth, onProgress) {
        try {
            // Init git repo if needed
            const gitDir = path.join(dir, '.git');
            if (!(await fs.pathExists(gitDir))) {
                onProgress?.('初始化 Git 仓库...');
                await isomorphic_git_1.default.init({ fs, dir, defaultBranch: branch });
            }
            // Set remote origin
            onProgress?.('配置远程仓库地址...');
            const remotes = await isomorphic_git_1.default.listRemotes({ fs, dir });
            if (remotes.find(r => r.remote === 'origin')) {
                await isomorphic_git_1.default.deleteRemote({ fs, dir, remote: 'origin' });
            }
            await isomorphic_git_1.default.addRemote({ fs, dir, remote: 'origin', url: remoteUrl });
            // Write .gitignore for DBVS files
            const gitignorePath = path.join(dir, '.gitignore');
            if (!(await fs.pathExists(gitignorePath))) {
                await fs.writeFile(gitignorePath, DBVS_GITIGNORE);
            }
            else {
                const content = await fs.readFile(gitignorePath, 'utf-8');
                if (!content.includes('.dbvs-link.json')) {
                    await fs.appendFile(gitignorePath, '\n' + DBVS_GITIGNORE);
                }
            }
            // Try initial fetch + checkout
            try {
                onProgress?.('正在从远程获取数据...');
                await isomorphic_git_1.default.fetch({
                    fs, http: node_1.default, dir, remote: 'origin', ref: branch,
                    onAuth: this.buildOnAuth(auth),
                    onProgress: (evt) => {
                        onProgress?.(`获取: ${evt.phase}`);
                    },
                });
                // Set branch to track remote
                onProgress?.('正在检出文件...');
                try {
                    await isomorphic_git_1.default.checkout({ fs, dir, ref: branch, force: true });
                }
                catch {
                    // If local branch doesn't exist, create it tracking remote
                    await isomorphic_git_1.default.branch({ fs, dir, ref: branch, checkout: true });
                    await isomorphic_git_1.default.checkout({ fs, dir, ref: branch, force: true });
                }
            }
            catch (fetchError) {
                // Remote might be empty — that's OK, we'll push later
                const msg = String(fetchError);
                if (!msg.includes('404') && !msg.includes('empty')) {
                    // Real error
                    return { success: false, message: `连接失败: ${msg}` };
                }
                onProgress?.('远程仓库为空，跳过获取步骤');
            }
            return { success: true, message: '远程仓库已连接' };
        }
        catch (error) {
            return { success: false, message: String(error) };
        }
    }
    async disconnectRepo(dir) {
        try {
            const gitDir = path.join(dir, '.git');
            if (await fs.pathExists(gitDir)) {
                await fs.remove(gitDir);
            }
            return { success: true, message: '已断开远程仓库' };
        }
        catch (error) {
            return { success: false, message: String(error) };
        }
    }
    // ==================== Sync Status ====================
    async getSyncStatus(dir) {
        try {
            const gitDir = path.join(dir, '.git');
            if (!(await fs.pathExists(gitDir))) {
                return { connected: false, ahead: 0, behind: 0, hasChanges: false };
            }
            const remotes = await isomorphic_git_1.default.listRemotes({ fs, dir });
            const origin = remotes.find(r => r.remote === 'origin');
            if (!origin) {
                return { connected: false, ahead: 0, behind: 0, hasChanges: false };
            }
            let branch = 'main';
            try {
                branch = (await isomorphic_git_1.default.currentBranch({ fs, dir })) || 'main';
            }
            catch { /* use default */ }
            // Count ahead/behind
            let ahead = 0;
            let behind = 0;
            try {
                const localOid = await isomorphic_git_1.default.resolveRef({ fs, dir, ref: branch });
                const remoteOid = await isomorphic_git_1.default.resolveRef({ fs, dir, ref: `refs/remotes/origin/${branch}` });
                if (localOid !== remoteOid) {
                    // Count commits ahead/behind using log comparison
                    try {
                        const localLog = await isomorphic_git_1.default.log({ fs, dir, ref: branch, depth: 50 });
                        const remoteLog = await isomorphic_git_1.default.log({ fs, dir, ref: `refs/remotes/origin/${branch}`, depth: 50 });
                        const localOids = new Set(localLog.map(c => c.oid));
                        const remoteOids = new Set(remoteLog.map(c => c.oid));
                        ahead = localLog.filter(c => !remoteOids.has(c.oid)).length;
                        behind = remoteLog.filter(c => !localOids.has(c.oid)).length;
                    }
                    catch { /* ignore */ }
                }
            }
            catch { /* no remote ref yet */ }
            // Check working tree changes
            let hasChanges = false;
            try {
                const matrix = await isomorphic_git_1.default.statusMatrix({ fs, dir });
                hasChanges = matrix.some((row) => row[1] !== 1 || row[2] !== 1);
            }
            catch { /* ignore */ }
            return {
                connected: true,
                remoteUrl: origin.url,
                branch,
                ahead,
                behind,
                hasChanges,
            };
        }
        catch {
            return { connected: false, ahead: 0, behind: 0, hasChanges: false };
        }
    }
    // ==================== Pull ====================
    async pull(dir, auth, onProgress) {
        try {
            let branch = 'main';
            try {
                branch = (await isomorphic_git_1.default.currentBranch({ fs, dir })) || 'main';
            }
            catch { /* use default */ }
            onProgress?.('正在从远程获取更新...');
            await isomorphic_git_1.default.fetch({
                fs, http: node_1.default, dir, remote: 'origin', ref: branch,
                onAuth: this.buildOnAuth(auth),
                onProgress: (evt) => {
                    onProgress?.(`获取中: ${evt.phase}`);
                },
            });
            // Merge remote into local
            onProgress?.('正在合并...');
            try {
                await isomorphic_git_1.default.merge({
                    fs, dir,
                    ours: branch,
                    theirs: `origin/${branch}`,
                    author: { name: 'DBVS', email: 'dbvs@local' },
                });
            }
            catch (mergeError) {
                const msg = String(mergeError);
                if (msg.includes('conflict') || msg.includes('MergeConflict') || msg.includes('CONFLICT')) {
                    // Detect conflicted files
                    const conflicts = await this.detectConflicts(dir);
                    return { success: false, message: `合并冲突: ${conflicts.length} 个文件`, conflicts };
                }
                throw mergeError;
            }
            return { success: true, message: '拉取成功' };
        }
        catch (error) {
            return { success: false, message: `拉取失败: ${String(error)}` };
        }
    }
    // ==================== Push ====================
    async push(dir, commitMessage, authorName, authorEmail, auth, onProgress) {
        try {
            let branch = 'main';
            try {
                branch = (await isomorphic_git_1.default.currentBranch({ fs, dir })) || 'main';
            }
            catch { /* use default */ }
            // Stage all changes
            onProgress?.('正在暂存文件...');
            const matrix = await isomorphic_git_1.default.statusMatrix({ fs, dir });
            for (const [filepath, headStatus, workdirStatus] of matrix) {
                if (headStatus !== workdirStatus) {
                    await isomorphic_git_1.default.add({ fs, dir, filepath: filepath });
                }
            }
            // Check if there's anything to commit
            const stagedMatrix = await isomorphic_git_1.default.statusMatrix({ fs, dir });
            const hasStaged = stagedMatrix.some((row) => row[1] !== 1 || row[2] !== 1);
            if (hasStaged) {
                onProgress?.('正在提交...');
                await isomorphic_git_1.default.commit({
                    fs, dir,
                    message: commitMessage,
                    author: { name: authorName, email: authorEmail },
                });
            }
            // Push
            onProgress?.('正在推送到远程...');
            await isomorphic_git_1.default.push({
                fs, http: node_1.default, dir, remote: 'origin', ref: branch,
                onAuth: this.buildOnAuth(auth),
                onProgress: (evt) => {
                    onProgress?.(`推送中: ${evt.phase}`);
                },
            });
            return { success: true, message: '推送成功' };
        }
        catch (error) {
            return { success: false, message: `推送失败: ${String(error)}` };
        }
    }
    // ==================== Conflict Resolution ====================
    async resolveConflict(dir, filePath, resolution) {
        try {
            if (resolution === 'ours') {
                // Keep current working copy version — just stage it
                await isomorphic_git_1.default.add({ fs, dir, filepath: filePath });
            }
            else {
                // Use remote version: read from remote HEAD
                let branch = 'main';
                try {
                    branch = (await isomorphic_git_1.default.currentBranch({ fs, dir })) || 'main';
                }
                catch { /* use default */ }
                try {
                    const remoteOid = await isomorphic_git_1.default.resolveRef({ fs, dir, ref: `refs/remotes/origin/${branch}` });
                    const blob = await isomorphic_git_1.default.readBlob({ fs, dir, oid: remoteOid, filepath: filePath });
                    await fs.writeFile(path.join(dir, filePath), Buffer.from(blob.blob));
                }
                catch {
                    // File might not exist on remote (was deleted there) — remove locally
                    await fs.remove(path.join(dir, filePath)).catch(() => { });
                }
                await isomorphic_git_1.default.add({ fs, dir, filepath: filePath });
            }
            return { success: true, message: `已解决: ${filePath} (${resolution === 'ours' ? '保留本地' : '使用远程'})` };
        }
        catch (error) {
            return { success: false, message: String(error) };
        }
    }
    async commitMergeResolution(dir, authorName, authorEmail) {
        try {
            await isomorphic_git_1.default.commit({
                fs, dir,
                message: '合并冲突已解决',
                author: { name: authorName, email: authorEmail },
            });
            return { success: true, message: '冲突已提交' };
        }
        catch (error) {
            return { success: false, message: String(error) };
        }
    }
    // ==================== Internal ====================
    async detectConflicts(dir) {
        const conflicts = [];
        try {
            const matrix = await isomorphic_git_1.default.statusMatrix({ fs, dir });
            for (const row of matrix) {
                const filepath = row[0];
                // Status code: head=0 means conflict/unmerged in some cases
                // Also check for conflict markers in file content
                const fullPath = path.join(dir, filepath);
                if (await fs.pathExists(fullPath)) {
                    const content = await fs.readFile(fullPath, 'utf-8').catch(() => '');
                    if (content.includes('<<<<<<<') || content.includes('=======')) {
                        const ext = path.extname(filepath).toLowerCase();
                        const binaryExts = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.svg',
                            '.zip', '.tar', '.gz', '.rar', '.7z', '.pdf', '.exe', '.dll', '.so', '.woff', '.woff2', '.ttf'];
                        conflicts.push({ path: filepath, isBinary: binaryExts.includes(ext) });
                    }
                }
            }
        }
        catch { /* ignore */ }
        return conflicts;
    }
}
exports.GitBridge = GitBridge;
