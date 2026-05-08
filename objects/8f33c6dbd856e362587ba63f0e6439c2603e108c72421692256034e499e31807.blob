# DBHT 技术开发路线图（AI 可执行）

> 基于 2026-05-07 技术审计 · 目标：独立通用版本管理平台 + AI 原生工作流引擎 + 驾驭工程数据源头

---

## 产品定位（开发前必读）

### DBHT 是什么

DBHT 不是 Git 的补丁，而是一个**独立的、完整的版本管理平台**。它有三层架构：

```
┌──────────────────────────────────────────────────────────┐
│                    DBHT 独立闭环                          │
│                                                          │
│ 第1层：通用版本引擎（基础）                                 │
│   SHA-256 存储 · commit/rollback · 自动快照               │
│   GUI + CLI + REST API · 零外部依赖 · 适合任意开发项目       │
│                                                          │
│ 第2层：AI 原生工作流（核心壁垒）                            │
│   AI 会话追踪 · 知识图谱 · RAG 上下文                      │
│   自动快照引擎 · 健康分析 · MCP Server                     │
│   工作流编排（人+AI 协同）                                  │
│                                                          │
│ 第3层：生态兼容桥接（不锁死）                                │
│   Git Bridge ⇄ GitHub · API ⇄ 外部工具                    │
│   VS Code 扩展 · LAN 协作                                  │
└──────────────────────────────────────────────────────────┘
```

### DBHT 与驾驭工程（DeepBlueGodHarnessFarm）的关系

DBHT 是 **数据规范源头 + 版本引擎 + CLI 工具链**，驾驭工程是 **多项目 AI 管理驾驶舱**。两者的分工：

```
┌─────────────────────────────────────────────────────────────┐
│                 深蓝生态 (DeepBlue Ecosystem)                 │
│                                                             │
│  ┌─────────────────────┐    ┌──────────────────────────┐   │
│  │      DBHT           │    │   驾驭工程 (Horse Farm)    │   │
│  │  (h:\SourceTree)    │    │ (H:\DeepBlueGodHarnessFarm)│   │
│  │                     │    │                           │   │
│  │ · 版本引擎          │───▶│ · 多项目并行管理           │   │
│  │ · 项目注册表        │    │ · AI 摘要/思维导图/KB 生成 │   │
│  │ · CLI 沙盒操作      │    │ · 任务追踪                │   │
│  │ · 知识图谱          │    │ · 工作流阶段管理           │   │
│  │ · 数据规范定义       │    │ · API Key 管理             │   │
│  │ · 健康分析          │    │ · 多模型调度               │   │
│  │                     │    │                           │   │
│  │ 角色：基础设施       │    │ 角色：上层应用             │   │
│  │ 提供规则+程序+规范   │    │ 消费数据+调度AI+展示       │   │
│  └─────────────────────┘    └──────────────────────────┘   │
│           │                           │                    │
│           │    .dbvs-* 文件规范        │                    │
│           │◄──────────────────────────┤                    │
│           │    config/projects.json   │                    │
│           │    DBHT-KNOWLEDGEBASE.md  │                    │
│           │    .dbvs-mindmap.json     │                    │
│           │    .dbvs-horsefarm.json   │                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

DBHT 定义的 **数据规范**（驾驭工程消费的标准接口）：
- `config/projects.json` — 项目注册表，驾驭工程从中发现所有项目
- `.dbvs-mindmap.json` — 思维导图数据格式（DBHT 图谱输出 / 驾驭工程独立生成）
- `DBHT-KNOWLEDGEBASE.md` — 知识库 Markdown 格式
- `.dbvs-horsefarm.json` — 驾驭工程在每个项目中的状态数据
- `.dbvs-horsefarm-notes.md` — 项目笔记
- CLI `dbgvs` 命令 — 驾驭工程通过 `exec()` 调用做沙盒快照/提交/回滚

**当前耦合问题**（需要在 DEV-ROADMAP 中解决）：
1. 驾驭工程硬编码了 `H:\SourceTree` 路径（`electron/main.ts:590`，i18n locale 两处）
2. CLI 二进制名是 `dbgvs`（旧名），应统一为 `dbht`
3. 驾驭工程用 `child_process.exec` 调 CLI，没有走 DBHT 的 External API
4. 数据规范散落在两个项目的代码里，没有独立文档

**核心设计原则**：

- **独立自洽**：不依赖 Git、不依赖 GitHub，完整闭环。用户不需要先学 Git 再用 DBHT
- **AI 原生**：AI 不是外挂功能，版本引擎的每一步都天然区分人/AI 的操作来源
- **小白友好**：GUI 优先，无需命令行知识即可完成所有操作。CLI 为进阶用户和自动化准备
- **通用不挑项目**：前端、后端、游戏、文档、数据——任何文件项目都能用
- **兼容不绑定**：Git Bridge 是第3层的一个可选模块，不与 DBHT 身份绑定
- **规范驱动**：DBHT 定义数据格式标准，驾驭工程等上层应用消费这些标准——不硬编码路径

---

## P0 — 安全与独立发布（阻塞项）

### P0-1：凭据加密存储

**目标**：所有 token/密码类数据使用 Electron `safeStorage` 加密，杜绝明文存储。

**涉及文件**：
- `electron/git-bridge.ts` — Git 凭据读写
- `electron/external-api.ts` — 外部 API token
- `electron/main.ts` — IPC handler

**执行步骤**：
1. 引入 `safeStorage`：`const { safeStorage } = require('electron')`
2. `saveCredentials()` / `saveApiToken()`：检查 `isEncryptionAvailable()`，用 `encryptString()` 加密后 base64 写入 JSON
3. `loadCredentials()` / `loadApiToken()`：读取 base64 → Buffer → `decryptString()` 解密
4. 加密不可用时降级为 base64 + 控制台警告
5. 首次读取到明文时自动迁移升级

**验证**：
```bash
cat "%APPDATA%/dbht/git-auth.json"      # 不应看到明文 token
cat "%APPDATA%/dbht/external-api.json"  # 同上
npm run build && npm run cli -- git-push # 功能正常
```

---

### P0-2：LAN 服务器 Token 认证

**目标**：LAN 所有端点验证 token，局域网内未授权请求返回 401。

**涉及文件**：
- `electron/lan-server.ts` — Express 中间件
- `electron/main.ts` — `lanStart` 返回 token 给渲染进程
- `src/types/electron.d.ts` — 类型更新

**执行步骤**：
1. 添加 Express 中间件，检查 `Authorization: Bearer <token>` 头
2. 启动时自动生成 UUID token，IPC 返回给 GUI 展示
3. 无 token / token 错误 → 401
4. GUI 中显示 LAN token 供用户复制分享

**验证**：
```bash
curl http://localhost:3280/api/projects                    # → 401
curl -H "Authorization: Bearer <token>" http://localhost:3280/api/projects  # → 正常
```

---

### P0-3：项目初始化向导（小白入口）

**目标**：新用户首次打开 DBHT 时，通过 3 步向导完成"创建/导入项目 → 选择工作模式 → 开始使用"，无需任何命令行。

**涉及文件**：
- `src/components/Onboarding/OnboardingGuide.tsx` — 扩展现有引导
- `src/components/Setup/RootSetup.tsx` — 根仓库配置
- `src/i18n/locales/en.ts`、`zh.ts` — 添加向导文本

**执行步骤**：
1. 改造 `OnboardingGuide` 为 3 步流程：
   - 步骤1：创建新项目 或 导入已有项目（支持拖放文件夹）
   - 步骤2：选择工作模式：AI 辅助模式 / 手动模式 / 两种都要
   - 步骤3：确认自动快照策略（每次保存 / AI操作后 / 手动触发）
2. 每步有清晰的中英双语说明和图示
3. 完成引导后自动打开 Dashboard，显示 "你的第一个提交" 引导按钮

**验证**：
```bash
npm run dev-electron
# 删除 %APPDATA%/dbht/ 下的 onboarding 标记
# 重启应用，走完 3 步向导，确认进入 Dashboard
```

---

## P1 — 独立版本引擎强化（本月）

### P1-1：VCS 核心引擎测试体系

**目标**：对 `DBHTRepository` 建立 Vitest 单元测试，核心操作覆盖率 ≥ 80%。版本管理工具的数据 bug 不可接受。

**涉及文件**：
- `package.json` — 添加 vitest
- `electron/dbvs-repository.ts` — 被测代码
- `test/unit/dbvs-repository.test.ts` — **新建**
- `vitest.config.ts` — **新建**

**执行步骤**：
```bash
npm install -D vitest @vitest/coverage-v8
```

创建 `vitest.config.ts`：
```typescript
import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    include: ['test/unit/**/*.test.ts'],
    coverage: { provider: 'v8', include: ['electron/dbvs-repository.ts'] },
    testTimeout: 30000,
  },
})
```

`test/unit/dbvs-repository.test.ts` 必须覆盖：
- `createRepository()` — 创建、重复创建报错
- `commit()` — 单文件、多文件、空提交、AI 标记提交
- `getStatus()` — 新增、修改、删除文件
- `checkout()` — 切换版本、文件内容验证
- `rollback()` — 回滚、回滚后 status
- `rollbackAI()` — AI 会话回滚精度
- `getHistory()` — 排序、过滤、AI/人区分
- `getDiff()` — 文本差异准确性
- `verify()` — blob 完整性、缺失检测
- 二进制文件处理
- `.dbvsignore` 规则

`package.json` 新增：
```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

**验证**：
```bash
npm test && npm run test:coverage  # 覆盖率 ≥ 80%
```

---

### P1-2：工作流引擎（Workflow Engine）

**目标**：DBHT 不只是被动记录版本，还能定义和执行自动化工作流。让小白用户点一个按钮就能跑完整开发流程。

**核心思路**：工作流 = 一系列操作的 DAG（有向无环图），每个节点可以是：AI 操作 / 手动操作 / 自动检查。

**涉及文件**：
- `electron/workflow-engine.ts` — **新建** 工作流执行引擎
- `electron/workflow-definitions/` — **新建** 内置工作流模板目录
- `src/components/Dashboard/WorkflowPanel.tsx` — **新建** 工作流 UI
- `src/types/electron.d.ts` — 新增 workflow IPC 类型

**执行步骤**：

1. **定义工作流 DSL**（JSON 格式）：
```json
{
  "name": "AI代码审查工作流",
  "steps": [
    { "id": "snapshot", "type": "auto-snapshot", "desc": "保存当前状态" },
    { "id": "ai-review", "type": "ai-task", "prompt": "审查代码质量和安全问题", "dependsOn": ["snapshot"] },
    { "id": "apply-fixes", "type": "ai-task", "prompt": "修复发现的问题", "dependsOn": ["ai-review"] },
    { "id": "verify", "type": "check", "command": "npm test", "dependsOn": ["apply-fixes"] },
    { "id": "commit", "type": "commit", "message": "AI审查通过", "dependsOn": ["verify"] }
  ]
}
```

2. **内置工作流模板**（`electron/workflow-definitions/`）：
   - `ai-code-review.json` — AI 代码审查 → 自动修复 → 测试 → 提交
   - `feature-dev.json` — 自动快照 → AI 生成代码 → 审查 → 合并
   - `refactor.json` — 快照 → AI 重构 → 图谱对比 → 提交
   - `quick-snapshot.json` — 一键快照（最简单，适合小白）

3. **WorkflowEngine 类**：
   - `loadWorkflow(path)` — 加载工作流定义
   - `run(workflow)` — 按 DAG 依赖顺序执行
   - `pause/resume/abort` — 流程控制
   - `on('step:complete', callback)` — 事件通知

4. **WorkflowPanel UI**（渲染进程）：
   - 工作流模板库（卡片展示，中英双语描述）
   - 一键执行按钮（最大的那个，绿色的）
   - 步骤进度条（实时显示当前到哪一步了）
   - 每步的日志输出
   - 支持用户拖放组合自定义工作流

**验证**：
```bash
# 通过 CLI 触发工作流
dbht workflow run ai-code-review
# 在 GUI 中点击工作流卡片，观察步骤执行
```

---

### P1-3：小白模式（Simple Mode）

**目标**：为不熟悉版本管理的新手提供一个极简界面，隐藏所有高级概念（commit/rollback/diff 等术语全部翻译成"保存/撤销/对比"），只暴露最常用的 3-4 个按钮。

**涉及文件**：
- `src/components/Dashboard/SimpleView.tsx` — 改造现有
- `src/context/AppContext.tsx` — 添加 `simpleMode` 状态
- `src/i18n/locales/en.ts`、`zh.ts` — 添加小白模式专用文案

**执行步骤**：
1. 改造 `SimpleView` 为全屏小白界面：
   - 中央大按钮："💾 保存当前进度"（= commit + auto-snapshot）
   - 左侧面板："📋 历史记录"（简化历史，只显示时间和一句话描述）
   - 右侧面板："↩ 撤销到之前"（= rollback，用时间线选择器）
   - 顶部状态条：显示当前项目名和上次保存时间
2. 所有术语用自然语言替代：
   - commit → "保存"
   - rollback → "恢复到"
   - diff → "对比变化"
   - repository → "项目存档"
3. Dashboard 顶部添加模式切换开关（高级/小白），默认新用户进入小白模式
4. 小白模式下隐藏：分支概念、图谱、健康分析、CLI 相关

**验证**：
```bash
npm run dev-electron
# 新用户引导 → 进入小白模式 → 点"保存"→"查看历史"→"恢复" 全流程无术语
```

---

### P1-4：拆分 main.ts 为模块化 IPC Handler

**目标**：将 2050 行的 `main.ts` 按功能域拆分为 `electron/ipc-handlers/` 目录。

**涉及文件**：
- `electron/main.ts` — 瘦身为调度中心
- `electron/ipc-handlers/repository.ts` — **新建**
- `electron/ipc-handlers/projects.ts` — **新建**
- `electron/ipc-handlers/git.ts` — **新建**
- `electron/ipc-handlers/graph.ts` — **新建**
- `electron/ipc-handlers/lan.ts` — **新建**
- `electron/ipc-handlers/external-api.ts` — **新建**
- `electron/ipc-handlers/version.ts` — **新建**
- `electron/ipc-handlers/utils.ts` — **新建**
- `electron/ipc-handlers/workflow.ts` — **新建**（P1-2 的工作流 handler）

**执行步骤**：
1. 创建 `electron/ipc-handlers/` 目录
2. 每个模块 export `register(ipcMain, context)` 函数
3. `context` 包含共享单例：dbvsRepo, gitBridge, lanServer, externalApi, workflowEngine
4. main.ts 遍历调用各模块的 register
5. 每个 handler 模块附带 `__tests__/<name>.test.ts`

**验证**：
```bash
npm run build && npm test
# 所有功能与拆分前一致
```

---

### P1-5：拆分 AppContext 为领域 Context

**目标**：将 40+ 字段的单一 AppContext 拆分为多个领域 Context。

**涉及文件**：
- `src/context/AppContext.tsx` — 瘦身
- `src/context/ProjectContext.tsx` — **新建**
- `src/context/VersionContext.tsx` — **新建**
- `src/context/UIContext.tsx` — **新建**
- `src/context/WorkflowContext.tsx` — **新建**
- `src/context/GitSyncContext.tsx` — **新建**

**执行步骤**：
1. 新建各领域 Context，迁移对应 state 和 reducer
2. AppContext 只保留全局路由和跨域共享字段
3. 更新所有消费组件

**验证**：
```bash
npm run build && npm run dev-electron
# 手动全功能回归测试
```

---

### P1-6：数据规范文档（DBHT Standard File Formats）

**目标**：将散落在 DBHT 和驾驭工程代码中的 `.dbvs-*` 文件格式定义为正式规范文档，让所有上层应用有统一的数据契约。

**涉及文件**：
- `docs/SPEC-DBVS-FILE-FORMATS.md` — **新建** 数据规范文档
- `electron/dbvs-repository.ts` — 参考实现
- `electron/graph-store.ts` — 图谱存储格式
- `H:\DeepBlueGodHarnessFarm\electron\main.ts` — 驾驭工程消费侧参考

**执行步骤**：

1. 创建 `docs/SPEC-DBVS-FILE-FORMATS.md`，定义以下标准：

   **A. 项目注册表** (`config/projects.json`)：
   ```json
   {
     "version": "1.0",
     "projects": [
       {
         "id": "uuid",
         "name": "project-name",
         "path": "absolute/path/to/working/copy",
         "repoPath": "absolute/path/to/repo",
         "createdAt": "ISO8601",
         "source": "dbht-root | individual"
       }
     ]
   }
   ```

   **B. 思维导图** (`.dbvs-mindmap.json`)：
   ```json
   {
     "schemaVersion": 1,
     "generatedAt": "ISO8601",
     "generatedBy": "dbht-graph | horsefarm",
     "tree": {
       "id": "root", "label": "项目名",
       "type": "root | module | task | file | concept",
       "status": "pending | in_progress | completed",
       "progress": 0-100,
       "children": [...],
       "metadata": { "tech": "React", "path": "src/..." }
     }
   }
   ```

   **C. 驾驭工程状态** (`.dbvs-horsefarm.json`)：
   ```json
   {
     "schemaVersion": 1,
     "projectPath": "...",
     "phase": "idle | requirements | summarizing | mindmap | active | paused",
     "requirements": "...",
     "summary": "...",
     "mindmapPath": ".dbvs-mindmap.json",
     "knowledgeBasePath": "DBHT-KNOWLEDGEBASE.md",
     "updatedAt": "ISO8601"
   }
   ```

   **D. 知识库** (`DBHT-KNOWLEDGEBASE.md`)：
   - Markdown 格式，固定章节：项目概述 → 技术栈 → 目录结构 → 核心模块 → 依赖关系 → AI 建议

   **E. 项目笔记** (`.dbvs-horsefarm-notes.md`)：
   - 自由格式 Markdown

2. 在 DBHT 的 `electron/main.ts` 中实现 `dbht:validate-project-spec` IPC handler，验证一个项目是否满足所有规范
3. 在驾驭工程中引用这份规范文档（而非硬编码格式逻辑）

**验证**：
- DBHT 项目初始化时自动生成符合规范的 `.dbvs-mindmap.json` 骨架
- 驾驭工程无需修改即可读取

---

### P1-7：统一 CLI 二进制名 & 消除硬编码路径

**目标**：将 CLI 从旧名 `dbgvs` 统一为 `dbht`，消除驾驭工程中 `H:\SourceTree` 的硬编码。

**涉及文件**：
- `h:\SourceTree\bin\dbvs-cli.js` — 现有 CLI 入口
- `h:\SourceTree\package.json` — bin 字段
- `H:\DeepBlueGodHarnessFarm\electron\main.ts` — 硬编码路径 (line 590)
- `H:\DeepBlueGodHarnessFarm\src\i18n\locales\zh.ts` — 硬编码路径
- `H:\DeepBlueGodHarnessFarm\src\i18n\locales\en.ts` — 硬编码路径

**执行步骤**：

1. **DBHT 侧**：
   - 新增 `bin/dbht-cli.js`（指向同一个 `electron/cli-standalone.js`）
   - `package.json` 的 `bin` 字段添加 `"dbht": "./bin/dbht-cli.js"`
   - 保留 `dbvs-cli.js` 作为向后兼容别名（deprecation warning）
   - 所有 IPC channel 前缀从 `dbgvs:` 统一为 `dbht:`（渐进迁移，新旧同时注册）

2. **驾驭工程侧**：
   - `electron/main.ts`：用 `which('dbht')` 或 `command-exists('dbht')` 查找 CLI，失败时 fallback 查找 `dbgvs`
   - 错误提示改为 `"DBHT CLI (dbht) not found. Run: npm install -g dbht 或 cd <DBHT安装目录> && npm link"`
   - 移除 `H:\\SourceTree` 硬编码

**验证**：
```bash
dbht --version          # 新命令正常工作
dbgvs --version         # 旧命令仍可用 + deprecation 警告
# 驾驭工程切换到其他目录安装的 DBHT，仍能正常发现 CLI
```

---

## P2 — 性能与生态（季度目标）

### P2-1：增量文件状态扫描

**目标**：用 mtime + size 缓存替代每次 `getStatus()` 的全量 SHA-256 计算。

**涉及文件**：
- `electron/dbvs-repository.ts` — 修改 `getStatus()`
- `electron/cache-index.ts` — **新建** 文件索引缓存

**执行步骤**：
1. `cache-index.ts` 维护 `Map<filePath, { mtime, size, sha }>` 缓存
2. `getStatus()` 先比对 mtime+size，不变则跳过哈希
3. 缓存持久化到 `.dbvs/cache-index.json`
4. 提供 `invalidateCache()` 手动刷新

**验证**：1000+ 文件项目上对比 status 耗时

---

### P2-2：Blob 目录优化 + Delta Compression

**目标**：扁平 `objects/` → 两级哈希前缀目录 + 文件版本间 delta 存储。

**涉及文件**：
- `electron/dbvs-repository.ts` — 修改 blob 路径
- `electron/delta-store.ts` — **新建**

**执行步骤**：
1. Blob 路径：`objects/<sha256>` → `objects/<2char>/<remaining>`
2. 兼容旧路径：先查新→回退旧
3. Delta compression：新版本只存与上一版本的 diff
4. 提供 `dbht gc` 命令合并 delta 链

**验证**：同一文件修改 10 次后磁盘占用显著减少

---

### P2-3：GUI E2E 测试（Playwright）

**目标**：核心 GUI 流程自动化测试。

**涉及文件**：
- `test/e2e/` — **新建**
- `playwright.config.ts` — **新建**

**执行步骤**：
```bash
npm install -D @playwright/test
```

覆盖场景：
- 创建项目 → 小白模式保存 → 查看历史 → 恢复
- 工作流卡片 → 一键执行
- Dashboard 所有 Tab 切换
- 图谱：节点渲染、深度切换、自动定位、拖拽节点
- 中英文切换

**验证**：`npx playwright test` 全部通过

---

### P2-4：GitHub Actions CI

**目标**：push 自动运行类型检查 + 单元测试 + 构建。

**涉及文件**：`.github/workflows/ci.yml` — **新建**

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npm test
      - run: npm run build
```

---

### P2-5：MCP Server

**目标**：通过 MCP 协议暴露图谱 + RAG 上下文，让 Claude Code 等 AI 工具直接获取项目理解。

**涉及文件**：
- `electron/mcp-server.ts` — **新建**
- `electron/main.ts` — 注册 IPC handler

**提供的 MCP tools**：
- `get_project_graph` — 当前版本图谱（节点+边+统计）
- `get_rag_context` — RAG 自然语言摘要
- `compare_graph_versions` — 两版本图谱差异
- `get_file_dependencies` — 指定文件的上下游依赖
- `run_workflow` — 触发 DBHT 工作流

**自动集成**：DBHT 启动时自动注册到 `.claude/mcp.json`

**验证**：
```bash
npx @anthropic-ai/mcp-inspector node electron/mcp-server.js
```

---

### P2-6：Commit 签名机制

**目标**：Ed25519 签名确保提交者身份可验证。

**涉及文件**：
- `electron/dbvs-repository.ts` — commit 增加签名
- `electron/signature-verifier.ts` — **新建**
- `electron/main.ts` — `verifySignature` IPC

**执行步骤**：
1. 首次使用自动生成 Ed25519 密钥对，提示备份
2. `commit --sign` 对 commit hash 签名
3. `verify-commit <id>` 验证签名
4. 签名嵌入 commit 元数据

**验证**：
```bash
dbht commit --sign -m "signed"
dbht verify-commit <id>  # → "Signature: VALID"
```

---

## P3 — UX 与生态（持续迭代）

### P3-1：Diff Side-by-Side 视图

**文件**：`src/components/Dashboard/DiffViewer.tsx`、`src/components/Dashboard/DiffView.tsx`
**目标**：左右分栏对比旧/新版本，Unified 和 Side-by-Side 一键切换。

### P3-2：图谱大型项目优化

**文件**：`src/hooks/useArchitectureGraph.ts`、`src/components/Dashboard/ArchitectureMap/MapCanvas.tsx`
**目标**：500+ 节点使用虚拟化渲染或 Web Worker 计算布局。

### P3-3：自动更新机制

**文件**：`electron/main.ts`、`package.json`
**目标**：集成 `electron-updater`，启动检查新版本 → 提示下载 → 自动安装。

### P3-4：macOS / Linux 构建验证

**文件**：`package.json`（electron-builder）
**目标**：验证并修复跨平台打包。

### P3-5：VS Code 扩展

**文件**：`vscode-extension/` — **新建**目录
**目标**：在 VS Code 侧边栏显示 DBHT 状态、一键提交/回滚、工作流触发。
这不是 P0 但它是获取用户的关键渠道——VS Code Marketplace 有几千万日活。

### P3-6：工作流市场（Workflow Marketplace）

**文件**：`src/components/Dashboard/WorkflowMarket.tsx` — **新建**
**目标**：用户可分享和下载社区工作流模板。初期官方维护 10+ 模板，后期开放社区贡献。工作流是 DBHT 从工具变成平台的转折点。

---

## 专项：DBHT ↔ 驾驭工程一体化（跨项目里程碑）

> 目标：DBHT 与驾驭工程形成标准化、松耦合的上下游关系。DBHT 定义规范，驾驭工程消费规范。

### 一体化目标架构

```
驾驭工程 (Horse Farm)                 DBHT (深蓝驭溯)
┌─────────────────────┐          ┌─────────────────────────┐
│  多项目 AI 管理      │          │  版本引擎 + 数据规范      │
│                     │   CLI    │                         │
│  思维导图生成 ───────┼─────────▶│  snapshot-before-task    │
│  知识库生成          │  exec()  │  commit-task-finish      │
│  AI 摘要             │          │  rollback-task           │
│                     │          │                         │
│  项目发现 ──────────┼─────────▶│  config/projects.json    │
│                     │  读文件   │                         │
│  状态持久化 ────────┼─────────▶│  .dbvs-horsefarm.json    │
│  笔记存储            │  写文件   │  .dbvs-horsefarm-notes.md│
│  思维导图存储 ──────┼─────────▶│  .dbvs-mindmap.json      │
│  知识库存储 ────────┼─────────▶│  DBHT-KNOWLEDGEBASE.md   │
│                     │          │                         │
│  [未来] 实时协作 ───┼─────────▶│  External API (REST)     │
│  [未来] 图谱查询 ───┼─────────▶│  MCP Server             │
└─────────────────────┘          └─────────────────────────┘
```

### 一体化任务清单

| ID | 任务 | DBHT 侧 | 驾驭工程侧 | 优先级 |
|----|------|---------|-----------|:------:|
| I-1 | 创建数据规范文档 `docs/SPEC-DBVS-FILE-FORMATS.md` | 编写规范 + 参考实现 | 按规范验证消费代码 | P1 |
| I-2 | 统一 CLI 名为 `dbht`，消除 `H:\SourceTree` 硬编码 | 新增 bin 别名 | 改用 `which('dbht')` | P1 |
| I-3 | CLI 沙盒操作增加 `--format json` 标准化输出 | 标准化 JSON schema | 移除输出解析 hack | P2 |
| I-4 | 驾驭工程通过 External API 而非 `exec()` 调沙盒 | 暴露 REST 端点 | 切换到 HTTP 调用 | P2 |
| I-5 | MCP Server 向驾驭工程暴露图谱查询 | P2-5 完成后即可用 | 集成 MCP client | P3 |
| I-6 | 驾驭工程的思维导图生成器迁移为 DBHT 图谱的一个视图 | 图谱 API 扩展 | 改为消费者 | P3 |
| I-7 | 两个项目的 i18n 翻译 key 对齐（共享术语表） | 抽取公共 key | 引用公共 key | P3 |

### I-3 详情：CLI 沙盒操作 JSON Schema 标准化

**当前问题**：驾驭工程用 `exec('dbgvs commit ... --format json')` 然后解析 stdout，但输出格式未约定 schema，解析脆弱。

**DBHT 侧改动**：
- `commit/rollback-ai/history` 命令的 `--format json` 输出定义 JSON Schema
- 每个命令返回 `{ "success": true, "data": {...}, "error": null }` 统一信封
- Schema 写入 `docs/SPEC-DBVS-FILE-FORMATS.md`

**驾驭工程侧改动**：
- `JSON.parse(stdout)` 后按 schema 校验
- 增加错误处理：CLI 不可用时降级为手动模式提示

### I-4 详情：External API 替代 exec()

**目标**：驾驭工程不再 `exec('dbgvs ...')`，而是发 HTTP 请求到 DBHT External API。

**DBHT 侧**（`electron/external-api.ts`）新增端点：
- `POST /api/v1/projects/:name/snapshot` — 等同于 `dbht commit --ai`
- `POST /api/v1/projects/:name/rollback` — 等同于 `dbht rollback-ai`
- `GET /api/v1/projects/:name/history?session=xxx` — 等同于 `dbht history`

**驾驭工程侧改动**：
- `TaskTracker.tsx` 中 `hf:snapshot-before-task` 等 handler 改为调用 External API
- 优势：不再依赖 CLI 在 PATH 中、支持远程 DBHT 实例、有认证

---

## 执行路线图

```
第1周：   P0-1 凭据加密    P0-2 LAN认证    P0-3 小白向导   (并行)
第2周：   P1-1 VCS测试体系
第3周：   P1-4 拆分 main.ts (测试保护下重构)
第4周：   P1-5 拆分 AppContext
第5周：   P1-6 数据规范文档（DBHT 与驾驭工程的数据契约）
第6周：   P1-7 统一 CLI 名 & 消除硬编码路径
第7-8周： P1-2 工作流引擎（核心差异化功能）
第9周：   P1-3 小白模式
第10-11周：P2-1 增量扫描   P2-2 Delta存储    (并行)
第12周：  P2-3 CI配置      P2-5 MCP Server   (并行)
第13周：  P2-4 E2E测试     P2-6 Commit签名   (并行)
第14周+： P3 各项按需推进
```

## 每个任务完成后必做

1. `npx tsc --noEmit` — 零类型错误
2. `npm test` — 测试通过
3. `npm run build` — 构建成功
4. git commit（语义化 message）+ DBHT 双轨提交
5. 涉及需求追踪则更新 DBHT-REQUIREMENTS.md

---

> 生成：2026-05-07 | 审计版本：v2.0 | 目标版本：v3.0（独立通用版本管理 + AI 工作流平台）
