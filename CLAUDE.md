# DBHT — DeepBlueHarnessTrace (深蓝驭溯)

## 项目身份
这是 DBHT 项目本身——一个本地 SVN 风格版本控制系统的源码仓库。**本项目自身受 DBHT 版本管理**，所有开发变更必须提交版本。

## 权限规则（AI 开发自主权）
- **项目内 (`h:/SourceTree/`)**：完全自主——随意增删改，无需询问开发者。本项目已被版本管理，不需要每次确认权限。
- **项目外**：读取、搜索、WebFetch 等操作随意；**删除操作**（文件/目录）需要开发者确认。其他权限拉到最大。
- **原则**：有任务直接干，直到任务完成。不要反复询问"是否继续"、"是否允许"。

## 提交规则
- 每完成一个功能点或修复后，**立即提交到版本管理**（git + DBHT 双轨）。
- 使用语义化 commit message（feat/fix/refactor/docs/chore）。
- **不要自动 push 到 GitHub**，等开发者测试完成后明确要求再 push。
- 如果变更影响 DBHT-REQUIREMENTS.md 中追踪的功能，同步更新状态表。

## 开发命令
- `npm run dev` — Vite dev server（仅前端）
- `npm run dev-electron` — 完整开发（Vite + Electron）
- `npm run build` — 构建（electron TS + Vite 生产）
- `npm run start` — 构建并启动 Electron
- `npm run cli` — 运行 CLI
- `npm run dist` — 构建并打包（electron-builder）

## 技术栈
- 前端：React 19 + TypeScript + Vite 8（端口 3005）
- 桌面：Electron 28（无框窗口，自定义标题栏）
- VCS 引擎：SHA-256 内容寻址存储 + diff-match-patch
- Git Bridge：isomorphic-git
- LAN：Express 5 + Socket.IO（端口 3280）
- CLI：Commander.js
- i18n：中/英双语（localStorage）

## 架构要点
- Electron main process 负责 VCS 引擎、IPC、项目注册表
- preload.ts 通过 contextBridge 暴露 IPC 接口给渲染进程
- src/App.tsx 路由控制视图切换
- src/context/AppContext.tsx 全局状态管理（useReducer）
- 所有 IPC 方法类型定义在 src/types/electron.d.ts
