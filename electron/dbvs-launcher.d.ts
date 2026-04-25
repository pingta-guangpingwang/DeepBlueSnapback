#!/usr/bin/env node
/**
 * DBGODVS Launcher — Windows 右键菜单启动器
 *
 * 功能：
 *   1. 检查 DBGODVS 主程序是否正在运行（通过端口文件）
 *   2. 如果运行中 → 通过 TCP 发送命令到主程序
 *   3. 如果没运行 → 启动主程序，等待就绪后发送命令
 *
 * 用法：
 *   dbvs-launcher.exe --pull "C:\myproject"
 *   dbvs-launcher.exe --update "C:\myproject"
 *   dbvs-launcher.exe --update-to "C:\myproject"
 *   dbvs-launcher.exe --commit "C:\myproject"
 */
export {};
