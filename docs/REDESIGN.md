# DBGODVS (深蓝主神版本管理系统) 重构技术方案

> 版本：2.0 | 日期：2026-04-10

## 一、项目定位

DBGODVS 是一个**本地优先的版本管理系统**，集 SVN 服务器 + 客户端于一体，核心价值：

- **零依赖**：无需安装 SVN/Git 客户端或服务器，开箱即用
- **可视化**：所有操作通过图形界面完成，支持代码比对、语法高亮、左右对照
- **本地化**：所有数据存储在本地，完全离线可用
- **远程拉取**：可从 GitHub/GitLab 等平台拉取/同步开源项目到本地仓库
- **局域网协同**：一台机器做本地仓库服务器，局域网内其他机器连接协同开发
- **双模式**：适合个人单机开发，也适合小团队局域网协同
- **AI 友好**：提供完整 CLI 命令行接口，便于 AI Agent 自动化操作
- **一键安装**：打包为独立可执行文件，含 Windows 右键菜单集成

### 1.1 使用场景

| 场景 | 模式 | 说明 |
|------|------|------|
| 个人开发 | 单机 | 本地仓库 + 版本管理，完全离线 |
| 学习开源项目 | 单机+远程 | 从 GitHub/GitLab 拉取项目，本地管理版本 |
| 小团队开发 | 局域网 | 一台做服务器，其他人通过网络连接 |
| AI 辅助开发 | CLI | 通过命令行让 AI Agent 执行版本操作 |

---

## 二、技术架构

### 2.1 整体架构

```
┌───────────────────────────────────────────────────────────┐
│                      Electron Shell                        │
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │  VCS 引擎    │  │  Git 桥接层  │  │  LAN 服务器     │ │
│  │ (dbvs-repo)  │  │ (git-bridge) │  │ (lan-server)    │ │
│  │              │  │              │  │                  │ │
│  │ 本地版本控制 │  │ 拉取远程仓库 │  │ HTTP API        │ │
│  │ SHA-2 存储   │  │ isomorphic-git│ │ WebSocket 通知  │ │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘ │
│         │                 │                    │           │
│  ┌──────┴─────────────────┴────────────────────┴─────────┐ │
│  │                    IPC 层                             │ │
│  └──────┬─────────────────┬────────────────────┬─────────┘ │
│         │                 │                    │           │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌────────┴─────────┐ │
│  │  React UI    │  │  CLI 接口    │  │  右键菜单       │ │
│  │              │  │              │  │  (注册表)       │ │
│  │ 可视化操作   │  │ AI 友好命令  │  │  Windows Shell  │ │
│  │ 代码比对     │  │ 脚本自动化   │  │                  │ │
│  └──────────────┘  └──────────────┘  └──────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

### 2.2 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| UI 框架 | React 19 + TypeScript | 已有 |
| 桌面壳 | Electron 28 | 已有 |
| 构建 | Vite 8 | 已有 |
| 内容寻址 | SHA-256 (crypto) | 已有，Node.js 内置 |
| 差异算法 | diff-match-patch | 已有 |
| 代码比对 | Monaco Editor | 新增，VS Code 同款编辑器，支持语法高亮和 diff 视图 |
| Git 远程 | isomorphic-git | 新增，纯 JS Git 实现，支持 clone/pull |
| LAN 服务器 | Express.js + socket.io | 新增，局域网 HTTP API + 实时通知 |
| CLI | Commander.js | 新增，命令行参数解析 |
| 文件操作 | fs-extra | 已有 |
| 状态管理 | React Context + useReducer | 已有 |
| 打包 | electron-builder | 新增 |

---

## 三、功能模块详细设计

### 3.1 代码比对可视化（SVN 风格）

**目标**：提供像 SVN 客户端 TortoiseSVN 一样的可读代码比对界面。

**技术方案**：集成 Monaco Editor 的 diff 编辑器。

**功能**：
- 左右对照对比（Old vs New）
- 语法高亮（自动识别文件类型）
- 行内差异标注（增/删/改高亮）
- 支持对比：工作区 vs 最新提交、任意两版本间、两个文件间

### 3.2 GitHub/GitLab 远程拉取

**目标**：从 GitHub/GitLab 等平台拉取项目到本地 DBGODVS 仓库。

**技术方案**：使用 isomorphic-git 实现 Git 协议支持。

**功能**：
- 输入远程仓库 URL → 拉取到本地 → 自动创建 DBGODVS 仓库
- 支持选择分支/标签
- 增量拉取更新（fetch + merge）
- 暂不支持推送到远程（未来扩展）

### 3.3 局域网协同模式

**目标**：局域网内一台机器做仓库服务器，其他机器连接。

**技术方案**：
- 服务器模式：内置 Express.js HTTP 服务 + WebSocket
- 客户端模式：通过 HTTP API 连接到服务器

**服务器端 API**：
```
GET    /api/projects              -- 获取项目列表
POST   /api/projects              -- 创建项目
GET    /api/projects/:name/status -- 获取项目状态
POST   /api/projects/:name/commit -- 提交变更
GET    /api/projects/:name/files/*-- 获取文件内容
POST   /api/projects/:name/update -- 拉取更新
WS     /ws/notifications          -- 实时变更通知
```

**工作流程**：
1. 服务器端：启动 LAN 模式 → 显示 IP 地址和端口
2. 客户端：输入服务器地址 → 连接 → 选择项目 → 拉取到本地工作目录
3. 编辑后 → 提交到本地 → 推送到 LAN 服务器
4. 服务器通知其他客户端更新

### 3.4 CLI 命令行接口（AI 友好）

**目标**：所有功能都可以通过命令行操作，便于 AI Agent 和脚本使用。

**命令设计**：
```
dbgvs init <path>                      -- 初始化仓库
dbgvs status [path]                    -- 查看状态
dbgvs commit <path> -m "message" [-f file1,file2]  -- 提交
dbgvs history <path> [-n 10]           -- 查看历史
dbgvs rollback <path> -v <version>     -- 回滚
dbgvs update <path>                    -- 更新到最新
dbgvs diff <path> [-f file] [-v v1 v2]-- 差异对比
dbgvs info <path>                      -- 仓库信息

dbgvs project list                     -- 列出项目
dbgvs project create <name>            -- 创建项目
dbgvs project import <src-path>        -- 导入项目
dbgvs project clone <git-url>          -- 从 Git 拉取

dbgvs server start [--port 3280]       -- 启动 LAN 服务器
dbgvs server connect <address>         -- 连接 LAN 服务器
dbgvs server status                    -- 服务器状态

dbgvs root set <path>                  -- 设置根仓库
dbgvs root get                         -- 获取根仓库路径
```

**输出格式**：默认 JSON（便于 AI 解析），可选 `--format table` 或 `--format text`。

---

## 四、数据存储模型（已实现）

### 根仓库目录结构

```
<root-repository>/
  projects/                     -- 项目工作区
    MyProject/
      src/
      README.md
      .dbvs/                    -- 版本控制数据
        config.json
        HEAD.json
        objects/
          <sha256>.blob         -- 文件内容快照
        commits/
          <timestamp>.json      -- 提交记录
  repositories/                 -- 纯仓库（LAN 模式用）
  config/
    dbvs-config.json            -- 根仓库配置
```

---

## 五、分阶段实施计划

### 阶段 1-2：核心 VCS + 安全模型（已完成 ✓）
- [x] 重写 VCS 引擎（SHA-256 存储、commit/rollback/update/diff）
- [x] 修复渲染进程安全模型（IPC 替代 require('fs')）
- [x] 根仓库持久化
- [x] UI：窗口控制栏（全屏/最小化/拖拽）
- [x] 43 项自动化测试全部通过

### 阶段 3：架构拆分（进行中）
- 将 1200 行 App.tsx 拆分为模块化组件
- 目录结构：components/、hooks/、context/

### 阶段 4：代码比对可视化
- 集成 Monaco Editor diff 组件
- 左右对照、语法高亮、行内差异

### 阶段 5：CLI 命令行接口
- 实现 Commander.js 命令行
- JSON 输出格式
- 覆盖所有 VCS 操作

### 阶段 6：Git 远程拉取
- 集成 isomorphic-git
- GitHub/GitLab 拉取 UI + CLI

### 阶段 7：局域网协同
- Express.js + socket.io 服务器
- LAN 客户端连接
- 实时通知

### 阶段 8：打包与安装
- electron-builder 打包
- Windows 右键菜单
- 一键安装

---

## 六、新增依赖

| 包名 | 用途 | 大小 |
|------|------|------|
| monaco-editor | 代码比对、语法高亮 | ~2MB |
| @monaco-editor/react | React 封装 | ~50KB |
| isomorphic-git | Git 协议支持 | ~500KB |
| express | LAN HTTP 服务器 | ~200KB |
| socket.io | LAN 实时通信 | ~300KB |
| commander | CLI 命令解析 | ~50KB |

---

## 七、文件变更总览

| 文件 | 操作 | 阶段 |
|------|------|------|
| `docs/REDESIGN.md` | 更新 | 文档 |
| `electron/dbvs-repository.ts` | 已重写 | 1 ✓ |
| `electron/main.ts` | 已修改 | 1-2 ✓ |
| `electron/preload.ts` | 已修改 | 2 ✓ |
| `src/types/electron.d.ts` | 已修改 | 2 ✓ |
| `src/App.tsx` | 重构 | 3 |
| `src/context/AppContext.tsx` | 新建 | 3 |
| `src/components/**/*.tsx` | 新建 | 3-4 |
| `src/hooks/*.ts` | 新建 | 3 |
| `electron/cli.ts` | 新建 | 5 |
| `electron/git-bridge.ts` | 新建 | 6 |
| `electron/lan-server.ts` | 新建 | 7 |
| `electron/context-menu.ts` | 新建 | 8 |
| `electron-builder.yml` | 新建 | 8 |
| `package.json` | 修改 | 4-8 |
