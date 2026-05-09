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
exports.getRootPath = getRootPath;
exports.addExcludedRepo = addExcludedRepo;
exports.removeExcludedRepo = removeExcludedRepo;
exports.readProjectRegistry = readProjectRegistry;
exports.writeProjectRegistry = writeProjectRegistry;
exports.getProjectsList = getProjectsList;
const electron_1 = require("electron");
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
async function getRootPath() {
    try {
        const configPath = path.join(electron_1.app.getPath('userData'), 'dbvs-root.json');
        if (await fs.pathExists(configPath)) {
            const config = await fs.readJson(configPath);
            return config.rootPath || null;
        }
    }
    catch { /* ignore */ }
    return null;
}
async function getRegistryPath(rootPath) {
    const configDir = path.join(rootPath, 'config');
    await fs.ensureDir(configDir);
    return path.join(configDir, 'projects.json');
}
async function getExcludedRepos(rootPath) {
    try {
        const excludedPath = path.join(rootPath, 'config', 'excluded-repos.json');
        if (await fs.pathExists(excludedPath)) {
            const list = await fs.readJson(excludedPath);
            return new Set(list.map(p => path.resolve(p)));
        }
    }
    catch { /* ignore */ }
    return new Set();
}
async function addExcludedRepo(rootPath, repoPath) {
    const excludedPath = path.join(rootPath, 'config', 'excluded-repos.json');
    const excluded = await getExcludedRepos(rootPath);
    excluded.add(path.resolve(repoPath));
    await fs.ensureDir(path.dirname(excludedPath));
    await fs.writeJson(excludedPath, [...excluded], { spaces: 2 });
}
async function removeExcludedRepo(rootPath, repoPath) {
    const excludedPath = path.join(rootPath, 'config', 'excluded-repos.json');
    const excluded = await getExcludedRepos(rootPath);
    excluded.delete(path.resolve(repoPath));
    if (excluded.size === 0) {
        await fs.remove(excludedPath).catch(() => { });
    }
    else {
        await fs.writeJson(excludedPath, [...excluded], { spaces: 2 });
    }
}
async function readProjectRegistry(rootPath) {
    const registryPath = await getRegistryPath(rootPath);
    const reposDir = path.join(rootPath, 'repositories');
    const excludedRepos = await getExcludedRepos(rootPath);
    let entries = [];
    // 1. 从注册表文件读取已有条目
    if (await fs.pathExists(registryPath)) {
        try {
            const raw = await fs.readJson(registryPath);
            entries = raw.map((entry) => {
                if (entry.repoPath)
                    return entry;
                return {
                    name: entry.name,
                    repoPath: entry.path,
                    workingCopies: [{ path: entry.path }],
                    created: entry.created
                };
            });
        }
        catch { /* ignore corrupt file */ }
    }
    // 2. 扫描 repositories/ 目录，补齐注册表中缺失的仓库（外部 AI 初始化）
    if (await fs.pathExists(reposDir)) {
        try {
            const dirs = await fs.readdir(reposDir);
            for (const dir of dirs) {
                const repoPath = path.join(reposDir, dir);
                const normalizedRepo = path.resolve(repoPath);
                if (excludedRepos.has(normalizedRepo))
                    continue;
                const configPath = path.join(repoPath, 'config.json');
                if (!(await fs.pathExists(configPath)))
                    continue;
                if (entries.find(e => path.resolve(e.repoPath) === normalizedRepo))
                    continue;
                const stat = await fs.stat(configPath).catch(() => null);
                entries.push({
                    name: dir, repoPath,
                    workingCopies: [],
                    created: stat?.mtime.toISOString() || new Date().toISOString()
                });
            }
        }
        catch { /* ignore */ }
    }
    // 3. 扫描 projects/ 目录，自动发现旧格式项目（有 .dbvs 子目录）
    const projectsDir = path.join(rootPath, 'projects');
    if (await fs.pathExists(projectsDir)) {
        try {
            const projectDirs = await fs.readdir(projectsDir);
            for (const dir of projectDirs) {
                const projPath = path.join(projectsDir, dir);
                const normalizedProj = path.resolve(projPath);
                const stat = await fs.stat(projPath).catch(() => null);
                if (!stat?.isDirectory())
                    continue;
                if (entries.find(e => e.workingCopies.some(wc => path.resolve(wc.path) === normalizedProj)))
                    continue;
                const oldDbvs = path.join(projPath, '.dbvs');
                if (await fs.pathExists(oldDbvs)) {
                    const newRepoPath = path.join(reposDir, dir);
                    if (!(await fs.pathExists(newRepoPath))) {
                        await fs.copy(oldDbvs, newRepoPath);
                    }
                    entries.push({
                        name: dir, repoPath: newRepoPath,
                        workingCopies: [{ path: projPath }],
                        created: stat.mtime.toISOString()
                    });
                }
            }
        }
        catch { /* ignore */ }
    }
    // 持久化补齐后的条目
    if (entries.length > 0) {
        await fs.ensureDir(path.dirname(registryPath));
        await fs.writeJson(registryPath, entries, { spaces: 2 });
    }
    return entries;
}
async function writeProjectRegistry(rootPath, entries) {
    const registryPath = await getRegistryPath(rootPath);
    await fs.writeJson(registryPath, entries, { spaces: 2 });
}
async function getProjectsList(rootPath) {
    const registry = await readProjectRegistry(rootPath);
    const projects = [];
    for (const entry of registry) {
        const repoExists = await fs.pathExists(path.join(entry.repoPath, 'config.json'));
        if (!repoExists)
            continue;
        const primaryCopy = entry.workingCopies.length > 0 ? entry.workingCopies[0] : null;
        projects.push({
            name: entry.name,
            path: primaryCopy?.path || '',
            repoPath: entry.repoPath,
            status: '已同步',
            lastUpdate: '',
            hasChanges: false,
            order: entry.order ?? 0,
            rating: entry.rating ?? 2,
        });
    }
    return { success: true, projects };
}
