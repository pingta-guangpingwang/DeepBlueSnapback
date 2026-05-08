#!/usr/bin/env node
"use strict";
/**
 * DBHT Launcher — Windows 右键菜单启动器
 *
 * 功能：
 *   1. 检查 DBHT 主程序是否正在运行（通过端口文件）
 *   2. 如果运行中 → 通过 TCP 发送命令到主程序
 *   3. 如果没运行 → 启动主程序，等待就绪后发送命令
 *
 * 用法：
 *   dbvs-launcher.exe --pull "C:\myproject"
 *   dbvs-launcher.exe --update "C:\myproject"
 *   dbvs-launcher.exe --update-to "C:\myproject"
 *   dbvs-launcher.exe --commit "C:\myproject"
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
const net = __importStar(require("net"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const child_process_1 = require("child_process");
// DBHT 主程序写入端口文件的路径（用户数据目录）
const PORT_FILE = path.join(process.env.APPDATA || process.env.LOCALAPPDATA || path.join(require('os').homedir(), '.config'), 'DBHT', 'ipc-port');
/** 读取 DBHT 主进程监听的端口 */
function readPort() {
    try {
        if (!fs.existsSync(PORT_FILE))
            return null;
        const content = fs.readFileSync(PORT_FILE, 'utf-8').trim();
        const port = parseInt(content, 10);
        return isNaN(port) ? null : port;
    }
    catch {
        return null;
    }
}
/** 通过 TCP 发送命令到 DBHT 主进程 */
function sendCommand(port, action, targetPath) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        const payload = JSON.stringify({ action, path: targetPath });
        socket.connect(port, '127.0.0.1', () => {
            socket.write(payload);
            socket.end();
        });
        socket.on('data', (data) => {
            const response = data.toString();
            if (response.includes('OK')) {
                resolve(true);
            }
            else {
                resolve(false);
            }
            socket.destroy();
        });
        socket.on('error', () => {
            resolve(false);
        });
        // 3 秒超时
        socket.setTimeout(3000);
        socket.on('timeout', () => {
            socket.destroy();
            resolve(false);
        });
    });
}
/** 启动 DBHT 主程序 */
function startDBHT() {
    return new Promise((resolve, reject) => {
        // 判断是开发模式还是打包模式
        const isDev = !process.execPath.includes('dbht') && !process.execPath.includes('DBHT');
        let cmd;
        let args;
        if (isDev) {
            // 开发模式：运行 npm run electron
            const projectRoot = path.resolve(__dirname, '..');
            cmd = process.execPath;
            args = [path.join(projectRoot, 'electron', 'main.js')];
            // 设置环境变量
            const env = { ...process.env, NODE_ENV: 'development' };
            const proc = (0, child_process_1.execFile)(cmd, args, { env, detached: true, stdio: 'ignore' });
            proc.unref();
        }
        else {
            // 打包模式：直接运行 dbvs.exe
            const exeDir = path.dirname(process.execPath);
            const dbvsExe = path.join(exeDir, 'DBHT.exe');
            cmd = dbvsExe;
            const proc = (0, child_process_1.execFile)(cmd, { detached: true, stdio: 'ignore' });
            proc.unref();
        }
        resolve();
    });
}
/** 等待 DBHT 主进程就绪（端口文件出现） */
function waitForReady(maxWaitMs = 15000) {
    return new Promise((resolve) => {
        const start = Date.now();
        const check = () => {
            const port = readPort();
            if (port) {
                resolve(port);
                return;
            }
            if (Date.now() - start > maxWaitMs) {
                resolve(null);
                return;
            }
            setTimeout(check, 500);
        };
        check();
    });
}
// ==================== Main ====================
async function main() {
    const argv = process.argv.slice(1); // 去掉 launcher 自身路径
    let action = '';
    let targetPath = '';
    for (let i = 0; i < argv.length; i++) {
        if (argv[i].startsWith('--')) {
            action = argv[i].substring(2);
            targetPath = argv[i + 1] || '';
            break;
        }
    }
    if (!action || !targetPath || !['pull', 'update', 'update-to', 'commit'].includes(action)) {
        console.error('Usage: dbvs-launcher --<pull|update|update-to|commit> "<path>"');
        process.exit(1);
    }
    // 1. 尝试连接已运行的实例
    let port = readPort();
    if (port) {
        const ok = await sendCommand(port, action, targetPath);
        if (ok) {
            // 成功发送命令，退出
            process.exit(0);
        }
        // 连接失败，可能端口文件过期，继续尝试启动
    }
    // 2. 启动 DBHT
    console.log('Starting DBHT...');
    await startDBHT();
    // 3. 等待就绪
    port = await waitForReady();
    if (!port) {
        console.error('DBHT 启动超时');
        process.exit(1);
    }
    // 4. 发送命令
    const ok = await sendCommand(port, action, targetPath);
    process.exit(ok ? 0 : 1);
}
main().catch((err) => {
    console.error('Launcher error:', err);
    process.exit(1);
});
