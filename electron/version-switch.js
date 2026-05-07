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
exports.switchToVersionReadonly = switchToVersionReadonly;
exports.releaseVersionReadonly = releaseVersionReadonly;
exports.getVersionFileList = getVersionFileList;
exports.getVersionFileContent = getVersionFileContent;
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
/**
 * Checkout a specific version to a temporary read-only directory.
 * Returns the temp path so the renderer can read files from it.
 */
async function switchToVersionReadonly(rootPath, repoPath, version) {
    const tmpDir = path.join(rootPath, 'tmp', `view-${version}`);
    try {
        // Clean up any previous temp checkout
        if (await fs.pathExists(tmpDir)) {
            await fs.remove(tmpDir);
        }
        // Load commit data
        const commitPath = path.join(repoPath, 'commits', `${version}.json`);
        if (!(await fs.pathExists(commitPath))) {
            return { success: false, message: `Version ${version} not found` };
        }
        const commit = await fs.readJson(commitPath);
        const files = commit.files || [];
        // Restore files from blobs
        for (const file of files) {
            const blobPath = path.join(repoPath, 'objects', `${file.hash}.blob`);
            if (!(await fs.pathExists(blobPath))) {
                return { success: false, message: `Blob missing: ${file.path}` };
            }
            const dest = path.join(tmpDir, file.path);
            await fs.ensureDir(path.dirname(dest));
            await fs.copyFile(blobPath, dest);
        }
        return { success: true, viewPath: tmpDir, files };
    }
    catch (error) {
        return { success: false, message: String(error) };
    }
}
/**
 * Release a read-only version checkout — delete temp directory.
 */
async function releaseVersionReadonly(rootPath, version) {
    try {
        const tmpDir = path.join(rootPath, 'tmp', `view-${version}`);
        if (await fs.pathExists(tmpDir)) {
            await fs.remove(tmpDir);
        }
        return { success: true };
    }
    catch (error) {
        return { success: false, message: String(error) };
    }
}
/**
 * Get file list for a specific version directly from commit manifest.
 */
async function getVersionFileList(repoPath, version) {
    try {
        const commitPath = path.join(repoPath, 'commits', `${version}.json`);
        if (!(await fs.pathExists(commitPath))) {
            return { success: false, message: `Version ${version} not found` };
        }
        const commit = await fs.readJson(commitPath);
        return { success: true, files: commit.files || [] };
    }
    catch (error) {
        return { success: false, message: String(error) };
    }
}
/**
 * Get file content from a specific version by reading blob directly.
 */
async function getVersionFileContent(repoPath, version, filePath) {
    try {
        const commitPath = path.join(repoPath, 'commits', `${version}.json`);
        if (!(await fs.pathExists(commitPath))) {
            return { success: false, message: `Version ${version} not found` };
        }
        const commit = await fs.readJson(commitPath);
        const file = (commit.files || []).find((f) => f.path === filePath);
        if (!file) {
            return { success: false, message: `File not found in version: ${filePath}` };
        }
        const blobPath = path.join(repoPath, 'objects', `${file.hash}.blob`);
        if (!(await fs.pathExists(blobPath))) {
            return { success: false, message: `Blob missing: ${file.hash}` };
        }
        const content = await fs.readFile(blobPath, 'utf-8');
        return { success: true, content };
    }
    catch (error) {
        return { success: false, message: String(error) };
    }
}
