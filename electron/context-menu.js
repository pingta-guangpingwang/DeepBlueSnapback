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
exports.registerContextMenu = registerContextMenu;
exports.unregisterContextMenu = unregisterContextMenu;
exports.isContextMenuRegistered = isContextMenuRegistered;
exports.parseCommandLine = parseCommandLine;
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
/**
 * Windows 右键菜单管理
 *
 * 架构：
 *   注册表 → dbvs-launcher.exe → TCP 连接 → DBGODVS 主进程
 *
 * - dbvs-launcher.exe 是小型启动器，负责连接已运行的 DBGODVS 或启动新实例
 * - DBGODVS 主进程在启动时开启 TCP IPC Server，监听启动器命令
 */
// 注册表项路径 — 对文件夹右键时显示
const REG_KEY = 'Directory\\Background\\shell\\DBGODVS';
// 对文件夹本身右键时显示
const REG_KEY_DIR = 'Directory\\shell\\DBGODVS';
/**
 * 获取启动器路径
 * - 开发模式：编译后的 dbvs-launcher.js（用 node 运行）
 * - 打包模式：dbvs-launcher.exe（或 dbvs-launcher.js 用 node 运行）
 */
function getLauncherCommand() {
    const isDev = !process.execPath.includes('dbgvs') && !process.execPath.includes('DBGODVS');
    if (isDev) {
        // 开发模式：node electron/dbvs-launcher.js
        const launcherJs = path.join(__dirname, 'dbvs-launcher.js');
        return { cmd: process.execPath, args: [launcherJs] };
    }
    else {
        // 打包模式：先尝试 exe，回退到 node js
        const exeDir = path.dirname(process.execPath);
        const launcherExe = path.join(exeDir, 'dbvs-launcher.exe');
        if (fs.existsSync(launcherExe)) {
            return { cmd: launcherExe, args: [] };
        }
        const launcherJs = path.join(exeDir, 'electron', 'dbvs-launcher.js');
        return { cmd: process.execPath, args: [launcherJs] };
    }
}
function runReg(args) {
    return new Promise((resolve) => {
        const proc = (0, child_process_1.execFile)('reg', args, { timeout: 10000 }, (error, stdout, stderr) => {
            if (error) {
                resolve({ success: false, output: stderr || error.message });
            }
            else {
                resolve({ success: true, output: stdout });
            }
        });
        proc.on('error', (err) => {
            resolve({ success: false, output: err.message });
        });
    });
}
/**
 * 注册右键菜单项
 */
async function registerItem(regBase, action, label, commandStr, iconPath) {
    const key = `${regBase}\\${action}`;
    const addKey = await runReg(['add', key, '/ve', '/d', label, '/f']);
    if (!addKey.success)
        return false;
    // 图标使用主程序 exe
    await runReg(['add', key, '/v', 'Icon', '/d', iconPath, '/f']);
    // 命令
    await runReg(['add', `${key}\\command`, '/ve', '/d', commandStr, '/f']);
    return true;
}
/**
 * 注册所有右键菜单项
 */
async function registerContextMenu() {
    const { cmd, args } = getLauncherCommand();
    const iconPath = process.execPath;
    // 构建注册表命令字符串
    // 格式: "node.exe" "launcher.js" --action "%V"
    // 或: "launcher.exe" --action "%V"
    let commandTemplate;
    if (args.length > 0) {
        commandTemplate = `"${cmd}" "${args[0]}" --%ACTION% "%V"`;
    }
    else {
        commandTemplate = `"${cmd}" --%ACTION% "%V"`;
    }
    // 先创建主菜单项
    await runReg(['add', REG_KEY, '/ve', '/d', '深蓝主神管理工具', '/f']);
    await runReg(['add', REG_KEY, '/v', 'Icon', '/d', iconPath, '/f']);
    await runReg(['add', REG_KEY, '/v', 'Position', '/d', 'Middle', '/f']);
    await runReg(['add', REG_KEY_DIR, '/ve', '/d', '深蓝主神管理工具', '/f']);
    await runReg(['add', REG_KEY_DIR, '/v', 'Icon', '/d', iconPath, '/f']);
    await runReg(['add', REG_KEY_DIR, '/v', 'Position', '/d', 'Middle', '/f']);
    const items = [
        { action: 'pull', label: '拉取文件' },
        { action: 'update', label: '更新到最新版本' },
        { action: 'update-to', label: '更新到指定版本' },
        { action: 'commit', label: '推送到仓库' },
    ];
    const results = [];
    for (const bases of [REG_KEY, REG_KEY_DIR]) {
        for (const item of items) {
            const commandStr = commandTemplate.replace('%ACTION%', item.action);
            const ok = await registerItem(bases, item.action, item.label, commandStr, iconPath);
            results.push(`${item.label}: ${ok ? 'OK' : 'FAIL'}`);
        }
    }
    const launcherInfo = args.length > 0 ? `${cmd} ${args[0]}` : cmd;
    return {
        success: true,
        message: `右键菜单注册完成\n启动器: ${launcherInfo}\n` + results.join('\n')
    };
}
/**
 * 注销所有右键菜单项
 */
async function unregisterContextMenu() {
    const results = [];
    for (const key of [REG_KEY, REG_KEY_DIR]) {
        const r = await runReg(['delete', key, '/f']);
        results.push(`${key}: ${r.success ? '已删除' : r.output}`);
    }
    return { success: true, message: '右键菜单已注销\n' + results.join('\n') };
}
/**
 * 检查右键菜单是否已注册
 */
async function isContextMenuRegistered() {
    const r = await runReg(['query', REG_KEY]);
    return r.success;
}
/**
 * 解析命令行参数，提取 DBGODVS 操作
 * （主进程直接启动时的备用解析，启动器不走这里）
 */
function parseCommandLine(argv) {
    for (let i = 1; i < argv.length; i++) {
        if (argv[i].startsWith('--')) {
            const action = argv[i].substring(2);
            if (['pull', 'update', 'update-to', 'commit'].includes(action)) {
                const targetPath = argv[i + 1] || '';
                if (targetPath && targetPath !== '%V') {
                    return { action, path: targetPath };
                }
            }
        }
    }
    return null;
}
