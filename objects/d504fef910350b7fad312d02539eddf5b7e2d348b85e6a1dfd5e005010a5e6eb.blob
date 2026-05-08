# DBHT — 深蓝驭溯

**你的代码本地金库。无需云端，告别复杂。**

深蓝驭溯 (DBHT) 是一个基于 Electron + React 的本地版本控制系统，采用 SVN 风格的集中仓库 + 分布式工作副本架构。

**给 AI 套上缰绳，让每一次代码生成都有迹可循。**

## 作者

**王广平**

- 微信：1084703441
- 邮箱：18351267631@163.com
- 个人网站：[www.shenlanai.com](https://www.shenlanai.com)

> 我将努力开发与世界连接，这是我发向全世界发送的一根信息触手，欢迎交流。

## 快速开始

### 开发环境
双击 `start.bat` 一键启动。首次运行自动安装依赖。

### 生产环境
```bash
npm run build && npm run start
```

### CLI 模式
```bash
# 设置根仓库
dbht set-root D:/DBHT-Root

# 创建项目
dbht create-project my-app

# 查看状态
dbht status /path/to/project

# 提交变更
dbht commit /path/to/project --message "修复登录 bug"
```

## 技术栈

- **前端**: React 19 + TypeScript + Vite 8 (端口 3005)
- **桌面**: Electron 28
- **版本控制**: DBHT 自研引擎 (集中仓库 + 工作副本)
- **Git 远程同步**: isomorphic-git (pull/push/冲突解决)
- **CLI**: Commander.js (独立运行，不依赖 Electron GUI)

## 架构

```
DBHT-Root/                    ← 根仓库
├── repositories/             ← 集中版本仓库
│   ├── project-a/           ← 每个项目的版本数据
│   │   ├── config.json      ← 仓库配置
│   │   ├── HEAD.json        ← 当前版本指针
│   │   ├── commits/         ← 提交记录
│   │   └── objects/         ← 文件快照 (content-addressed)
│   └── project-b/
├── projects.json             ← 项目注册表
└── config/
    └── dbht-root.json        ← 根仓库配置

工作副本 (任意位置)/
├── .dbvs-link.json           ← 指向集中仓库的链接
├── DBHT-GUIDE.md             ← 版本管理说明文档
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
dbht set-root <path>          # 设置根仓库路径
dbht get-root                 # 获取当前根仓库路径
```

### 项目管理
```bash
dbht create-project <name>    # 创建新项目
dbht import-project <src>     # 导入外部文件夹为项目
dbht delete-project <name>    # 删除项目
dbht delete-project <name> --keep-files  # 仅删除版本历史，保留文件
dbht list-projects            # 列出所有项目
dbht list-repos               # 列出所有仓库
dbht unregister <path>        # 从项目列表移除
dbht unregister <path> --delete-files  # 移除并删除文件
```

### 版本控制操作
```bash
dbht status [path]            # 查看工作区状态
dbht commit <path> -m "msg"   # 提交变更
dbht commit <path> -m "msg" -f file1,file2  # 提交指定文件
dbht update <path>            # 更新到最新版本
dbht rollback <path> -v v3    # 回滚到指定版本
dbht history <path>           # 查看提交历史
dbht log [path] -n 10         # 查看最近 N 条提交日志
dbht diff <path> -f file.ts   # 查看文件差异
dbht diff <path> -f file.ts -a v1 -b v2  # 比较两个版本
dbht info <path>              # 查看仓库信息
dbht init <path>              # 初始化仓库
dbht verify <path>            # 验证仓库完整性
dbht file-tree <path>         # 列出项目文件树
dbht version [path]           # 查看当前版本
dbht pull <repoPath> <dir>    # 从仓库拉取项目到目标目录
```

### Git 远程同步
```bash
dbht git-connect <path> <url>              # 连接远程仓库
dbht git-connect <path> <url> -b main -u user -t TOKEN

dbht git-pull <path>                       # 拉取远程更新
dbht git-pull <path> -u user -t TOKEN

dbht git-push <path> -m "sync message"     # 推送到远程
dbht git-push <path> -m "msg" -u user -t TOKEN
```

## AI 工作小世界

DBHT 的核心理念：**让 AI 放开手脚开发，每一行代码都可追溯、可回滚。**

### AI 智能体接入

每个由 DBHT 管理的项目目录下都会自动生成两份文档：

| 文件 | 用途 |
|------|------|
| `DBHT-GUIDE.md` | CLI 命令速查、版本操作指引、故障恢复 |
| `DBHT-REQUIREMENTS.md` | 项目需求跟踪、功能实现状态、AI 工作流规范 |

### AI 自动权限配置

AI 首次进入项目时，会自动在 `.claude/settings.json` 中配置以下权限：

```json
{
  "permissions": {
    "allow": [
      "Bash(dbht *)", "Bash(npm *)", "Bash(git *)", "Bash(node *)",
      "Read", "Glob", "Grep", "Edit", "Write"
    ]
  }
}
```

若 AI 无法自动创建配置，会主动提示用户手动授权；用户不同意则正常继续，不影响功能。

### AI 智能体推荐工作流

1. **了解项目**: 读取 `DBHT-GUIDE.md` 和 `DBHT-REQUIREMENTS.md`
2. **开始工作前**: `dbht status <path>` 检查当前变更
3. **每完成一个功能/修复**: 立即 `dbht commit <path> -m "feat: 描述"` — 不要积累变更
4. **查看差异**: `dbht diff <path> -f <file>` 查看具体变更
5. **回滚误操作**: `dbht rollback <path> -v <version>`
6. **远程同步**: `dbht git-pull <path>` / `dbht git-push <path> -m "msg"`

### AI 语义化提交规范

| 类型 | 格式 | 示例 |
|------|------|------|
| 新功能 | `feat: 描述` | `feat: 新增用户登录页面` |
| 修复 | `fix: 描述` | `fix: 修复文件上传失败问题` |
| 重构 | `refactor: 描述` | `refactor: 重构数据库连接模块` |
| 文档 | `docs: 描述` | `docs: 更新 API 文档` |
| 测试 | `test: 描述` | `test: 新增订单模块单元测试` |

### AI 提交追踪

AI 提交时可标记来源，便于区分人工与 AI 操作：

```bash
dbht commit <path> --message "feat: 新增功能" \
  --ai claude-code \
  --session <会话ID> \
  --summary "本次变更的目的和范围"
```

按 AI 会话批量回滚：

```bash
dbht rollback-ai <path> --session <会话ID>
```

## 忽略规则

DBHT 自动忽略以下文件/目录（不纳入版本管理）：
- `.dbvs/` `.dbvs-link.json` — DBHT 内部文件
- `.git/` — Git 远程同步数据
- `node_modules/` — 依赖目录
- `.DS_Store` `Thumbs.db` — 系统文件
- 所有以 `.` 开头的隐藏文件

## 端口冲突

```bat
netstat -ano | findstr :3005
taskkill /PID <pid> /F
```

## 最近更新 (2026年4-5月)

### 🧬 向量知识库（语义搜索）
- **TF-IDF 向量化引擎**：三元组哈希向量化，无需 AI 模型依赖，纯统计数学
- 768 维向量 + 余弦相似度，<10ms 搜索响应
- **CLI**：`dbht vector index/status/search/delete`，表格化搜索结果
- **REST API**：`POST /api/v1/projects/:name/vector/search` 供 AI 智能体调用
- **界面**：完整向量面板 — 文件列表、进度日志、文件删除、导入/导出（JSON 格式）
- 版本感知：自动检测索引与新提交的版本差异，提示重建
- 智能分块：基于函数/类边界的代码分块，最大 2000 字符/块
- **导入/导出**：通过 `dbht-vector-export-v1` JSON 格式在团队间共享索引

### 🏛️ 架构知识图谱
- 交互式代码结构可视化 — 模块为节点，依赖关系为边
- 树状布局、调用图、继承层级、循环依赖检测
- **RAG 知识库**：AI 工具通过 REST API 查询图谱（`GET /api/v1/projects/:name/rag`）
- 版本间图谱对比 — 追踪架构演变
- 建筑比喻：建筑（根目录）、楼层（子目录）、房间（源文件）
- SVG + HTML 分层渲染，支持缩放/平移/全屏、深度控制滑块
- 开发视图（完整图谱）和简单视图（建筑比喻）两种模式
- **CLI**：`dbht rag <项目名>` 返回结构化 JSON 知识图谱上下文

### 🏥 架构健康分析
- **代码质量仪表盘** — 检测上帝模块、孤儿文件、疼痛区模块
- 圈复杂度分析、Martin 不稳定性/抽象度指标
- 耦合分析、克隆检测、健康评分（A-F 等级）
- 可操作的优化建议，附具体模块引用
- **REST API**：`POST /api/v1/projects/:name/health/analyze`

### 🌍 多语言源码解析
- AST 分析引擎现支持 **12 种语言**（超越 TypeScript/JavaScript）
- Python、Java、C#、Go、Rust、C/C++、Ruby、PHP、Kotlin、Swift、Dart、Lua
- 按文件扩展名自动识别语言，统一图谱输出

### 🗺️ 图谱交互增强
- 图谱构建实时进度日志
- 全屏图谱视图（ESC/按钮关闭）
- 深度/可见性变化时自动适配
- 图谱控件、图例、提示框全面国际化（中/英）
- 流光演示动画，速度/模式控制

### 🐴 驾驭工程 → DeepBlueGodHarnessFarm（独立应用）
- 驾驭工程从 DBHT 中拆分，成为独立 Electron 应用 **DeepBlueGodHarnessFarm**
- 通过文件系统读取 DBHT 项目数据，两个应用零耦合
- 功能：项目列表、思维导图、知识库、任务追踪、指挥中心、API Key 配置、版本沙箱

### 🧠 思维导图查看器
- 树形布局思维导图，SVG 连线 + 平滑动画
- 拖拽平移、滚轮缩放、点击折叠/展开分支
- 自动生成项目设计框架，不再是单纯的文件列表

### 🔒 项目备注
- 每个项目卡片上直接显示备注（最多一行，可点击查看全部）
- 双击弹出编辑器，自动保存到项目目录的 `.dbvs-horsefarm-notes.md` 文件
- DBHT 和 DeepBlueGodHarnessFarm 共享同一个备注文件，实时同步

### 🌐 首次启动语言选择
- 首次打开应用时强制弹出语言选择对话框（English / 中文）
- 暗色渐变背景 + 国旗按钮动画 — 选择语言后才能进入

### 📦 内置 Node.js 22
- Node.js 22.19.0 便携版内置在 `nodejs/` 目录
- `start.bat` 自动配置 PATH，不依赖系统安装的 Node.js

### 🏗️ 版本沙箱（DeepBlueGodHarnessFarm）
- 任务开始前自动快照、任务完成提交、AI 会话回滚
- 任务版本历史查看器 — AI 生成的每一行代码都可追溯
- 通过 DBHT CLI (`dbgvs`) 驱动，零代码耦合

### 🔧 CLI 增强
- AI 标记提交：`--ai <tool> --session <id> --summary <text>`
- `rollback-ai` 命令：按 AI 会话批量回滚
- 结构化历史输出：`getHistoryStructured()`

## 联系与支持

DBHT 是一款完全免费的开源软件，如果你觉得它对你有帮助，欢迎打赏支持，你的鼓励是我持续更新的动力。

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
