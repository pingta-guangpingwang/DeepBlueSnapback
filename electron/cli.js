"use strict";
/**
 * DBHT CLI - Command Line Interface
 *
 * Usage:
 *   dbht <command> [options]
 *
 * All commands output JSON by default for AI Agent parsing.
 * Use --format table or --format text to change output format.
 */
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
exports.runCLI = runCLI;
const commander_1 = require("commander");
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const dbvs_repository_1 = require("./dbvs-repository");
const electron_1 = require("electron");
const repo = new dbvs_repository_1.DBHTRepository();
const program = new commander_1.Command();
program
    .name('dbht')
    .description('DeepBlueHarnessTrace / 深蓝驭溯 - Local Version Control System')
    .version('2.0.0')
    .option('--format <type>', '输出格式: json, table, text', 'json')
    .option('--root <path>', '根仓库路径');
// ==================== 输出格式化 ====================
function output(data, format) {
    if (format === 'json') {
        console.log(JSON.stringify(data, null, 2));
    }
    else if (format === 'text') {
        if (typeof data === 'string') {
            console.log(data);
        }
        else if (data.message) {
            console.log(data.message);
        }
        else {
            console.log(JSON.stringify(data, null, 2));
        }
    }
    else {
        // table
        if (Array.isArray(data)) {
            if (data.length === 0) {
                console.log('(empty)');
                return;
            }
            const keys = Object.keys(data[0]);
            const colWidths = keys.map(k => Math.max(k.length, ...data.map((r) => String(r[k] || '').length)));
            console.log(keys.map((k, i) => k.padEnd(colWidths[i])).join('  '));
            console.log(colWidths.map(w => '-'.repeat(w)).join('  '));
            for (const row of data) {
                console.log(keys.map((k, i) => String(row[k] || '').padEnd(colWidths[i])).join('  '));
            }
        }
        else {
            console.log(JSON.stringify(data, null, 2));
        }
    }
}
function getRootPath(opts) {
    if (opts.root)
        return opts.root;
    // 尝试从用户数据目录读取
    const configPath = path.join(electron_1.app.getPath('userData'), 'dbvs-root.json');
    if (fs.pathExistsSync(configPath)) {
        const config = fs.readJsonSync(configPath);
        return config.rootPath;
    }
    throw new Error('根仓库未配置。使用 dbgvs root set <path> 设置，或使用 --root 指定。');
}
// ==================== 根仓库管理 ====================
program
    .command('root set <path>')
    .description('设置根仓库路径')
    .action(async (rootPath) => {
    const opts = program.opts();
    try {
        await fs.ensureDir(rootPath);
        await fs.ensureDir(path.join(rootPath, 'projects'));
        await fs.ensureDir(path.join(rootPath, 'repositories'));
        await fs.ensureDir(path.join(rootPath, 'config'));
        const configPath = path.join(electron_1.app.getPath('userData'), 'dbvs-root.json');
        await fs.writeJson(configPath, { rootPath, savedAt: new Date().toISOString() });
        output({ success: true, message: `根仓库已设置: ${rootPath}` }, opts.format);
    }
    catch (error) {
        output({ success: false, message: String(error) }, opts.format);
        process.exit(1);
    }
});
program
    .command('root get')
    .description('获取根仓库路径')
    .action(async () => {
    const opts = program.opts();
    try {
        const rootPath = getRootPath(opts);
        output({ success: true, rootPath }, opts.format);
    }
    catch (error) {
        output({ success: false, message: String(error) }, opts.format);
        process.exit(1);
    }
});
// ==================== 项目管理 ====================
program
    .command('project list')
    .description('列出所有项目')
    .action(async () => {
    const opts = program.opts();
    try {
        const rootPath = getRootPath(opts);
        const result = await (await Promise.resolve().then(() => __importStar(require('./main')))).getProjectsList(rootPath);
        output(result, opts.format);
    }
    catch (error) {
        output({ success: false, message: String(error) }, opts.format);
        process.exit(1);
    }
});
program
    .command('project create <name>')
    .description('创建新项目')
    .action(async (name) => {
    const opts = program.opts();
    try {
        const rootPath = getRootPath(opts);
        const projectDir = path.join(rootPath, 'projects', name);
        const repoDir = path.join(rootPath, 'repositories', name);
        await fs.ensureDir(projectDir);
        await repo.createRepository(repoDir, name);
        output({ success: true, message: `项目 "${name}" 创建成功`, path: projectDir }, opts.format);
    }
    catch (error) {
        output({ success: false, message: String(error) }, opts.format);
        process.exit(1);
    }
});
program
    .command('project import <srcPath>')
    .description('导入外部文件夹为项目')
    .action(async (srcPath) => {
    const opts = program.opts();
    try {
        const rootPath = getRootPath(opts);
        const name = path.basename(srcPath);
        const projectDir = path.join(rootPath, 'projects', name);
        const repoDir = path.join(rootPath, 'repositories', name);
        await fs.copy(srcPath, projectDir, { overwrite: false, errorOnExist: false });
        await repo.createRepository(repoDir, name);
        output({ success: true, message: `项目 "${name}" 导入成功`, path: projectDir }, opts.format);
    }
    catch (error) {
        output({ success: false, message: String(error) }, opts.format);
        process.exit(1);
    }
});
// ==================== 版本控制操作（SVN 风格）====================
/** 解析路径：自动区分仓库路径和工作副本路径 */
async function resolveRepoPathsCli(inputPath) {
    const resolved = await repo.resolvePaths(inputPath);
    if (!resolved) {
        return { repoPath: inputPath, workingCopyPath: inputPath };
    }
    return resolved;
}
program
    .command('status [projectPath]')
    .description('查看工作区状态')
    .action(async (projectPath) => {
    const opts = program.opts();
    try {
        const p = projectPath || opts.root;
        const { repoPath, workingCopyPath } = await resolveRepoPathsCli(p);
        const result = await repo.getStatus(repoPath, workingCopyPath);
        output(result, opts.format);
    }
    catch (error) {
        output({ success: false, message: String(error) }, opts.format);
        process.exit(1);
    }
});
program
    .command('commit <projectPath>')
    .description('提交变更')
    .requiredOption('-m, --message <msg>', '提交信息')
    .option('-f, --files <files>', '指定文件（逗号分隔）', '')
    .action(async (projectPath, cmdOpts) => {
    const opts = program.opts();
    try {
        const { repoPath, workingCopyPath } = await resolveRepoPathsCli(projectPath);
        let files = [];
        if (cmdOpts.files) {
            files = cmdOpts.files.split(',').map((f) => f.trim());
        }
        else {
            const status = await repo.getStatus(repoPath, workingCopyPath);
            if (status.success && status.status) {
                files = status.status
                    .filter(s => s.startsWith('A ') || s.startsWith('M '))
                    .map(s => s.slice(2).trim());
            }
        }
        if (files.length === 0) {
            output({ success: false, message: '没有需要提交的文件' }, opts.format);
            return;
        }
        const result = await repo.commit(repoPath, workingCopyPath, cmdOpts.message, files);
        output(result, opts.format);
    }
    catch (error) {
        output({ success: false, message: String(error) }, opts.format);
        process.exit(1);
    }
});
program
    .command('history <projectPath>')
    .description('查看提交历史')
    .option('-n, --limit <count>', '显示条数', '20')
    .action(async (projectPath, cmdOpts) => {
    const opts = program.opts();
    try {
        const { repoPath } = await resolveRepoPathsCli(projectPath);
        const result = await repo.getHistory(repoPath);
        output(result, opts.format);
    }
    catch (error) {
        output({ success: false, message: String(error) }, opts.format);
        process.exit(1);
    }
});
program
    .command('rollback <projectPath>')
    .description('回滚到指定版本')
    .requiredOption('-v, --version <version>', '目标版本号')
    .action(async (projectPath, cmdOpts) => {
    const opts = program.opts();
    try {
        const { repoPath, workingCopyPath } = await resolveRepoPathsCli(projectPath);
        const result = await repo.rollback(repoPath, workingCopyPath, cmdOpts.version);
        output(result, opts.format);
    }
    catch (error) {
        output({ success: false, message: String(error) }, opts.format);
        process.exit(1);
    }
});
program
    .command('update <projectPath>')
    .description('更新到最新版本（丢弃工作区修改）')
    .action(async (projectPath) => {
    const opts = program.opts();
    try {
        const { repoPath, workingCopyPath } = await resolveRepoPathsCli(projectPath);
        const result = await repo.update(repoPath, workingCopyPath);
        output(result, opts.format);
    }
    catch (error) {
        output({ success: false, message: String(error) }, opts.format);
        process.exit(1);
    }
});
program
    .command('diff <projectPath>')
    .description('查看文件差异')
    .requiredOption('-f, --file <filePath>', '文件路径')
    .option('-a, --version-a <version>', '旧版本')
    .option('-b, --version-b <version>', '新版本')
    .action(async (projectPath, cmdOpts) => {
    const opts = program.opts();
    try {
        const result = await repo.getDiff(projectPath, cmdOpts.file, cmdOpts.versionA, cmdOpts.versionB);
        output(result, opts.format);
    }
    catch (error) {
        output({ success: false, message: String(error) }, opts.format);
        process.exit(1);
    }
});
program
    .command('info <projectPath>')
    .description('查看仓库信息')
    .action(async (projectPath) => {
    const opts = program.opts();
    try {
        const result = await repo.getRepositoryInfo(projectPath);
        output(result, opts.format);
    }
    catch (error) {
        output({ success: false, message: String(error) }, opts.format);
        process.exit(1);
    }
});
program
    .command('init <projectPath>')
    .description('在指定目录初始化 DBHT 仓库')
    .action(async (projectPath) => {
    const opts = program.opts();
    try {
        const result = await repo.createRepository(projectPath, path.basename(projectPath));
        output(result, opts.format);
    }
    catch (error) {
        output({ success: false, message: String(error) }, opts.format);
        process.exit(1);
    }
});
// ==================== 解析命令行 ====================
function runCLI(argv) {
    program.parse(argv);
}
