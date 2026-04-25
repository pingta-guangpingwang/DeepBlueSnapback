# DBGODVS
Your code's local vault. Version control without the cloud, without the complexity

# DBGODVS — 深蓝主神版本管理系统

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
dbgvs set-root D:/DBGODVS-Root

# 创建项目
dbgvs create-project my-app

# 查看状态
dbgvs status /path/to/project

# 提交变更
dbgvs commit /path/to/project --message "修复登录 bug"
```

## 技术栈

- **前端**: React 19 + TypeScript + Vite 8 (端口 3005)
- **桌面**: Electron 28
- **版本控制**: DBGODVS 自研引擎 (集中仓库 + 工作副本)
- **Git 远程同步**: isomorphic-git (pull/push/冲突解决)
- **CLI**: Commander.js (独立运行，不依赖 Electron GUI)

## 架构

```
DBGODVS-Root/                    ← 根仓库
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
├── DBGODVS-GUIDE.md             ← 版本管理说明文档
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
dbgvs set-root <path>          # 设置根仓库路径
dbgvs get-root                 # 获取当前根仓库路径
```

### 项目管理
```bash
dbgvs create-project <name>    # 创建新项目
dbgvs import-project <src>     # 导入外部文件夹为项目
dbgvs delete-project <name>    # 删除项目
dbgvs delete-project <name> --keep-files  # 仅删除版本历史，保留文件
dbgvs list-projects            # 列出所有项目
dbgvs list-repos               # 列出所有仓库
dbgvs unregister <path>        # 从项目列表移除
dbgvs unregister <path> --delete-files  # 移除并删除文件
```

### 版本控制操作
```bash
dbgvs status [path]            # 查看工作区状态
dbgvs commit <path> -m "msg"   # 提交变更
dbgvs commit <path> -m "msg" -f file1,file2  # 提交指定文件
dbgvs update <path>            # 更新到最新版本
dbgvs rollback <path> -v v3    # 回滚到指定版本
dbgvs history <path>           # 查看提交历史
dbgvs log [path] -n 10         # 查看最近 N 条提交日志
dbgvs diff <path> -f file.ts   # 查看文件差异
dbgvs diff <path> -f file.ts -a v1 -b v2  # 比较两个版本
dbgvs info <path>              # 查看仓库信息
dbgvs init <path>              # 初始化仓库
dbgvs verify <path>            # 验证仓库完整性
dbgvs file-tree <path>         # 列出项目文件树
dbgvs version [path]           # 查看当前版本
dbgvs pull <repoPath> <dir>    # 从仓库拉取项目到目标目录
```

### Git 远程同步
```bash
dbgvs git-connect <path> <url>              # 连接远程仓库
dbgvs git-connect <path> <url> -b main -u user -t TOKEN

dbgvs git-pull <path>                       # 拉取远程更新
dbgvs git-pull <path> -u user -t TOKEN

dbgvs git-push <path> -m "sync message"     # 推送到远程
dbgvs git-push <path> -m "msg" -u user -t TOKEN
```

## AI 智能体接入

每个由 DBGODVS 管理的项目目录下都会自动生成 `DBGODVS-GUIDE.md`，其中包含：
- 项目基本信息（名称、路径、仓库路径）
- 常用 CLI 命令速查
- 版本管理操作指引

### AI 智能体推荐工作流

1. **了解项目**: 读取项目目录下的 `DBGODVS-GUIDE.md`
2. **开始工作前**: `dbvs status <path>` 检查当前变更
3. **修改文件后**: `dbvs commit <path> -m "描述变更内容"`
4. **查看差异**: `dbvs diff <path> -f <file>` 查看具体变更
5. **回滚误操作**: `dbvs rollback <path> -v <version>`
6. **远程同步**: `dbvs git-pull <path>` / `dbvs git-push <path> -m "msg"`

## 忽略规则

DBGODVS 自动忽略以下文件/目录（不纳入版本管理）：
- `.dbvs/` `.dbvs-link.json` — DBGODVS 内部文件
- `.git/` — Git 远程同步数据
- `node_modules/` — 依赖目录
- `.DS_Store` `Thumbs.db` — 系统文件
- 所有以 `.` 开头的隐藏文件

## 端口冲突

```bat
netstat -ano | findstr :3005
taskkill /PID <pid> /F
```

## 联系与支持

DBGODVS 是一款完全免费的开源软件，如果你觉得它对你有帮助，欢迎打赏支持，你的鼓励是我持续更新的动力。

<table>
  <tr>
    <td align="center">
      <img src="f9e661730d92fb35985a8d0dffcfb624.jpg" width="180" /><br/>
      <b>微信支付</b>
    </td>
    <td align="center">
      <img src="cd5741cc158ccc6be0b524f0444cc22c.jpg" width="180" /><br/>
      <b>支付宝</b>
    </td>
    <td align="center">
      <img src="94407fbdd42a797af5a902bc107d72e8.jpg" width="180" /><br/>
      <b>微信交流群</b>
    </td>
  </tr>
</table>

## 许可

MIT

