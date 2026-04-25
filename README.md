# DeepBlueSnapback
Your code's local vault. Version control without the cloud, without the complexity

# DBVS — DeepBlue Version System

基于 Electron + React 的本地版本控制系统，采用 SVN 风格的集中仓库 + 分布式工作副本架构。

我叫王广平，我的微信：1084703441，邮箱18351267631@163.com 
个人网站：www.ssrgpt.com
我将努力开发与世界连接，这是我发向全世界发送的一根信息触手，欢迎交流

## 快速开始

### 开发环境
双击 `start.bat` 一键启动。

### 生产环境
```bash
npm run build && npm run start
```

### CLI 模式
```bash
# 设置根仓库
dbvs set-root D:/DBVS-Root

# 创建项目
dbvs create-project my-app

# 查看状态
dbvs status /path/to/project

# 提交变更
dbvs commit /path/to/project --message "修复登录 bug"
```

## 技术栈

- **前端**: React 19 + TypeScript + Vite 8 (端口 3005)
- **桌面**: Electron 28
- **版本控制**: DBVS 自研引擎 (集中仓库 + 工作副本)
- **Git 远程同步**: isomorphic-git (pull/push/冲突解决)
- **CLI**: Commander.js (独立运行，不依赖 Electron GUI)

## 架构

```
DBVS-Root/                    ← 根仓库
├── repositories/             ← 集中版本仓库
│   ├── project-a/           ← 每个项目的版本数据
│   │   ├── config.json      ← 仓库配置
│   │   ├── HEAD.json        ← 当前版本指针
│   │   ├── commits/         ← 提交记录
│   │   └── objects/         ← 文件快照 (content-addressed)
│   └── project-b/
├── projects.json             ← 项目注册表
└── config/
    └── dbvs-root.json        ← 根仓库配置

工作副本 (任意位置)/
├── .dbvs-link.json           ← 指向集中仓库的链接
├── DBVS-GUIDE.md             ← 版本管理说明文档
├── .git/                     ← (可选) Git 远程同步
└── ...项目文件...
```

### 核心概念

| 概念 | 说明 |
|------|------|
| **根仓库** | 所有项目版本数据的存放根目录 |
| **集中仓库** | 每个项目的完整版本历史 (commits + objects) |
| **工作副本** | 用户实际操作的文件目录，通过 `.dbvs-link.json` 关联仓库 |
| **提交 (Commit)** | 将工作副本的文件快照保存到集中仓库 |
| **更新 (Update)** | 从集中仓库恢复文件到工作副本 |
| **回滚 (Rollback)** | 恢复到历史指定版本 |

## CLI 命令参考

### 全局选项
```
--format <json|table|text>    输出格式 (默认 json)
--root <path>                 指定根仓库路径
```

### 根仓库管理
```bash
dbvs set-root <path>          # 设置根仓库路径
dbvs get-root                 # 获取当前根仓库路径
```

### 项目管理
```bash
dbvs create-project <name>    # 创建新项目
dbvs import-project <src>     # 导入外部文件夹为项目
dbvs delete-project <name>    # 删除项目
dbvs delete-project <name> --keep-files  # 仅删除版本历史，保留文件
dbvs list-projects            # 列出所有项目
dbvs list-repos               # 列出所有仓库
dbvs unregister <path>        # 从项目列表移除
dbvs unregister <path> --delete-files  # 移除并删除文件
```

### 版本控制操作
```bash
dbvs status [path]            # 查看工作区状态
dbvs commit <path> -m "msg"   # 提交变更
dbvs commit <path> -m "msg" -f file1,file2  # 提交指定文件
dbvs update <path>            # 更新到最新版本
dbvs rollback <path> -v v3    # 回滚到指定版本
dbvs history <path>           # 查看提交历史
dbvs log [path] -n 10         # 查看最近 N 条提交日志
dbvs diff <path> -f file.ts   # 查看文件差异
dbvs diff <path> -f file.ts -a v1 -b v2  # 比较两个版本
dbvs info <path>              # 查看仓库信息
dbvs init <path>              # 初始化仓库
dbvs verify <path>            # 验证仓库完整性
dbvs file-tree <path>         # 列出项目文件树
dbvs version [path]           # 查看当前版本
dbvs pull <repoPath> <dir>    # 从仓库拉取项目到目标目录
```

### Git 远程同步
```bash
dbvs git-connect <path> <url>              # 连接远程仓库
dbvs git-connect <path> <url> -b main -u user -t TOKEN

dbvs git-pull <path>                       # 拉取远程更新
dbvs git-pull <path> -u user -t TOKEN

dbvs git-push <path> -m "sync message"     # 推送到远程
dbvs git-push <path> -m "msg" -u user -t TOKEN
```

## AI 智能体接入

每个由 DBVS 管理的项目目录下都会自动生成 `DBVS-GUIDE.md`，其中包含：
- 项目基本信息（名称、路径、仓库路径）
- 常用 CLI 命令速查
- 版本管理操作指引

### AI 智能体推荐工作流

1. **了解项目**: 读取项目目录下的 `DBVS-GUIDE.md`
2. **开始工作前**: `dbvs status <path>` 检查当前变更
3. **修改文件后**: `dbvs commit <path> -m "描述变更内容"`
4. **查看差异**: `dbvs diff <path> -f <file>` 查看具体变更
5. **回滚误操作**: `dbvs rollback <path> -v <version>`
6. **远程同步**: `dbvs git-pull <path>` / `dbvs git-push <path> -m "msg"`

## 忽略规则

DBVS 自动忽略以下文件/目录（不纳入版本管理）：
- `.dbvs/` `.dbvs-link.json` — DBVS 内部文件
- `.git/` — Git 远程同步数据
- `node_modules/` — 依赖目录
- `.DS_Store` `Thumbs.db` — 系统文件
- 所有以 `.` 开头的隐藏文件

## 端口冲突

```bat
netstat -ano | findstr :3005
taskkill /PID <pid> /F
```

## 许可

MIT

