# DBHT 技术开发路线图（AI 可执行）

本文档基于 2026-05-07 技术审计报告，按优先级排列所有待办事项。每个任务包含：目标、涉及文件、执行步骤、验证命令。设计为 AI 助手可逐项执行并验证。

---

## P0 — 安全（发布前阻塞项）

### P0-1：加密 GitHub Token 存储

**目标**：将 `git-auth.json` 中明文 token 替换为 Electron `safeStorage` 加密存储。

**涉及文件**：
- `electron/git-bridge.ts` — 读写 git-auth.json 的方法
- `electron/main.ts` — Git credential 相关的 IPC handler
- `electron/preload.ts` — 可能需要新增 IPC 方法

**执行步骤**：
1. 在 `git-bridge.ts` 中引入 `safeStorage`：`const { safeStorage } = require('electron')`
2. 修改 `saveCredentials()`：调用 `safeStorage.isEncryptionAvailable()` 检查可用性，用 `safeStorage.encryptString(token)` 加密后存为 Buffer（base64 编码写入 JSON）
3. 修改 `loadCredentials()`：读取后 base64 解码，`safeStorage.decryptString(buffer)` 解密
4. 兼容处理：如果加密不可用（Linux 无密钥链），降级为 base64 编码（非安全但至少非明文）+ 控制台警告
5. 迁移逻辑：首次读取到明文 token 时自动加密升级

**验证**：
```bash
# 设置凭据后检查 git-auth.json 文件内容，token 不应为明文
cat "%APPDATA%/dbht/git-auth.json"
# 确认 Git push/pull 仍然正常工作
npm run build && npm run cli -- git-push
```

---

### P0-2：外部 API Token 加密存储

**目标**：将 `external-api.json` 中 token 改为加密存储。方案同 P0-1。

**涉及文件**：
- `electron/external-api.ts` — API token 存储和验证逻辑

**执行步骤**：参照 P0-1，对 `external-api.json` 中的 token 做同样加密。

**验证**：
```bash
cat "%APPDATA%/dbht/external-api.json"
# 启动 external-api 并验证 token 认证仍正常
```

---

### P0-3：LAN 服务器添加 Token 认证

**目标**：LAN 服务器的所有端点必须验证 token，防止局域网内未授权访问。

**涉及文件**：
- `electron/lan-server.ts` — 局域网服务实现
- `electron/main.ts` — `lanStart` IPC handler 可能需要传 token 参数
- `src/types/electron.d.ts` — `lanStart` 类型签名可能需要更新

**执行步骤**：
1. `lan-server.ts` 添加 Express 中间件，检查请求头 `Authorization: Bearer <token>` 或查询参数 `?token=xxx`
2. 启动时自动生成随机 token（UUID），通过 IPC 返回给渲染进程展示
3. 不匹配的请求返回 401
4. 渲染进程 Dashboard UI 显示 LAN token，方便用户分享给团队成员

**验证**：
```bash
# 无 token 请求应返回 401
curl http://localhost:3280/api/projects
# 带 token 请求应正常
curl -H "Authorization: Bearer <token>" http://localhost:3280/api/projects
```

---

## P1 — 质量与架构（本月优先）

### P1-1：建立 VCS 核心引擎测试体系

**目标**：对 `DBHTRepository` 类建立 Vitest 单元测试，核心操作覆盖率 ≥ 80%。

**涉及文件**：
- `package.json` — 添加 vitest 依赖和 test 脚本
- `electron/dbvs-repository.ts` — 被测代码
- `test/unit/dbvs-repository.test.ts` — **新建**单元测试文件
- `vitest.config.ts` — **新建** Vitest 配置

**执行步骤**：
1. 安装依赖：
   ```bash
   npm install -D vitest @vitest/coverage-v8
   ```
2. 创建 `vitest.config.ts`：
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
3. 创建 `test/unit/` 目录和测试文件，至少覆盖以下场景：
   - `createRepository()` — 创建仓库、重复创建报错
   - `commit()` — 单文件提交、多文件提交、空提交
   - `getStatus()` — 新增文件、修改文件、删除文件
   - `checkout()` — 切换到历史版本、文件内容验证
   - `rollback()` — 回滚到指定版本、回滚后 status 验证
   - `getHistory()` — 历史记录排序、过滤
   - `getDiff()` — 文本差异计算准确性
   - `verify()` — blob 完整性校验、缺失 blob 检测
   - 二进制文件处理
   - `.dbvsignore` 规则
4. 在 `package.json` 的 `scripts` 中添加：
   ```json
   "test": "vitest run",
   "test:watch": "vitest",
   "test:coverage": "vitest run --coverage"
   ```

**验证**：
```bash
npm test
npm run test:coverage
# 覆盖率应 ≥ 80%
```

---

### P1-2：建立 GUI 关键路径 E2E 测试

**目标**：用 Playwright 覆盖核心 GUI 操作流程。

**涉及文件**：
- `package.json` — 添加 playwright 依赖
- `test/e2e/` — **新建** E2E 测试目录
- `playwright.config.ts` — **新建**

**执行步骤**：
1. 安装依赖：`npm install -D @playwright/test`
2. 创建 `playwright.config.ts`，配置 Electron 启动
3. 编写至少以下场景：
   - 创建项目 → 进入 Dashboard → 提交文件
   - Dashboard 7 个 Tab 切换无报错
   - 图谱 Tab：节点渲染、深度切换、自动定位
   - 历史 Tab：版本列表加载、版本回滚
   - Diff 查看：文件差异渲染
   - 设置页面：主题/语言切换

**验证**：
```bash
npx playwright test
```

---

### P1-3：拆分 main.ts 为模块化 IPC Handler

**目标**：将 2050 行的 `main.ts` 按功能域拆分为 `electron/ipc-handlers/` 目录。

**涉及文件**：
- `electron/main.ts` — 当前单体文件，拆分为调度中心
- `electron/ipc-handlers/repository.ts` — **新建** VCS 操作 handler
- `electron/ipc-handlers/projects.ts` — **新建** 项目管理 handler
- `electron/ipc-handlers/git.ts` — **新建** Git 同步 handler
- `electron/ipc-handlers/graph.ts` — **新建** 图谱/健康 handler
- `electron/ipc-handlers/lan.ts` — **新建** LAN 服务 handler
- `electron/ipc-handlers/external-api.ts` — **新建** 外部 API handler
- `electron/ipc-handlers/version.ts` — **新建** 版本切换 handler
- `electron/ipc-handlers/utils.ts` — **新建** 文件/窗口/CLI handler

**执行步骤**：
1. 创建 `electron/ipc-handlers/` 目录
2. 每个 handler 模块 export 一个 `register(ipcMain: Electron.IpcMain, context: AppContext)` 函数
3. AppContext 接口包含共享单例（dbvsRepo, gitBridge, lanServer 等）
4. main.ts 中遍历调用各 handler 模块的 register
5. 每个 handler 模块附带单元测试 `electron/ipc-handlers/__tests__/<name>.test.ts`

**验证**：
```bash
npm run build
npx vitest run
# 所有 IPC 功能与拆分前一致
```

---

### P1-4：拆分 AppContext 为领域 Context

**目标**：将 40+ 字段的单一 AppContext 拆分为多个领域 Context。

**涉及文件**：
- `src/context/AppContext.tsx` — 拆分
- `src/context/ProjectContext.tsx` — **新建** 项目相关状态
- `src/context/VersionContext.tsx` — **新建** VCS 操作状态
- `src/context/UIContext.tsx` — **新建** UI 状态
- `src/context/GitSyncContext.tsx` — **新建** Git 同步状态

**执行步骤**：
1. 新建各领域 Context，从 AppContext 迁移对应状态和 reducer
2. AppContext 保留全局路由和跨域共享字段
3. 更新所有消费组件，从对应 Context 获取状态
4. 确保无性能退化（用 React DevTools Profiler 检查）

**验证**：
```bash
npm run build
npm run dev-electron
# 手动测试所有页面功能正常
```

---

## P2 — 性能与生态（季度目标）

### P2-1：引入增量文件状态扫描

**目标**：避免每次 `getStatus()` 全量读文件计算 SHA-256，用 mtime + size 缓存。

**涉及文件**：
- `electron/dbvs-repository.ts` — 修改 `getStatus()` 方法
- `electron/cache-index.ts` — **新建** 文件索引缓存模块

**执行步骤**：
1. 创建 `cache-index.ts`，维护 `Map<filePath, { mtime, size, sha }>` 缓存
2. `getStatus()` 先检查 mtime+size：未变则跳过 SHA-256 计算
3. 缓存持久化到 `.dbvs/cache-index.json`
4. 提供 `invalidateCache()` 方法手动刷新

**验证**：
```bash
# 大项目（1000+ 文件）上对比优化前后的 status 耗时
time node -e "require('./electron/cli-standalone').status()"
```

---

### P2-2：Blob 目录结构优化 + Delta Compression

**目标**：将扁平 `objects/` 改为两级哈希前缀目录 + 引入 delta 存储。

**涉及文件**：
- `electron/dbvs-repository.ts` — 修改 blob 读写路径
- `electron/delta-store.ts` — **新建** delta 压缩模块

**执行步骤**：
1. Blob 存储路径从 `objects/<sha256>` 改为 `objects/<2char>/<remaining>`（与 Git 一致）
2. 兼容读取：先查新路径，找不到回退旧路径
3. 实现 delta compression：新版本 blob 只存储与上一版本的 diff
4. 读取时从 base blob 逐层 apply delta 重建完整内容
5. 提供 `git gc` 等价命令：合并 delta 链为完整 blob

**验证**：
```bash
# 对同一文件修改 10 次后，检查仓库磁盘占用
# 应有明显减少（delta 存储 vs 全量 blob）
```

---

### P2-3：GitHub Actions CI 配置

**目标**：每次 push 自动运行测试、类型检查、构建。

**涉及文件**：
- `.github/workflows/ci.yml` — **新建**

**执行步骤**：
创建以下 workflow 文件：
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

**验证**：push 后 GitHub Actions 自动运行并全部通过。

---

### P2-4：实现 MCP Server（Model Context Protocol）

**目标**：将图谱数据和 RAG 上下文通过 MCP 协议暴露，让 Claude Code 等 AI 工具直接获取项目结构理解。

**涉及文件**：
- `electron/mcp-server.ts` — **新建** MCP Server 实现
- `electron/main.ts` — 注册 MCP 启动/停止 IPC handler
- `src/types/electron.d.ts` — 新增 MCP 相关类型

**执行步骤**：
1. 实现 MCP stdio transport server，提供以下 tools：
   - `get_project_graph` — 获取当前版本的项目架构图谱（节点+边+统计）
   - `get_rag_context` — 获取 RAG 格式的项目自然语言摘要
   - `compare_graph_versions` — 对比两个版本的图谱差异
   - `get_file_dependencies` — 查询指定文件的上下游依赖
2. DBHT 启动时注册 MCP Server 配置到 Claude Code 的 `.claude/mcp.json`
3. 在项目初始化时自动生成 MCP 配置模板

**验证**：
```bash
# 使用 MCP Inspector 测试
npx @anthropic-ai/mcp-inspector node electron/mcp-server.js
# Claude Code 中应能调用 get_project_graph 获取项目结构
```

---

### P2-5：Commit 签名机制（GPG/SSH）

**目标**：支持对 commit 进行 GPG 或 SSH 签名，确保提交者身份可验证。

**涉及文件**：
- `electron/dbvs-repository.ts` — commit 方法增加签名参数
- `electron/signature-verifier.ts` — **新建** 签名验证模块
- `electron/main.ts` — 新增 `verifySignature` IPC handler
- CLI — `commit` 命令增加 `--sign` 参数

**执行步骤**：
1. 使用 Node.js `crypto` 模块实现 Ed25519 签名（不依赖外部 GPG）
2. commit 时生成签名：`sign(privateKey, commitHash)`
3. 签名嵌入 commit 元数据（`.dbvs/commits/<id>.json` 中增加 `signature` 字段）
4. 提供 `dbht verify-commit <id>` 命令验证签名
5. 首次使用时自动生成密钥对并提示用户备份

**验证**：
```bash
dbht commit --sign -m "signed commit"
dbht verify-commit <commit-id>
# 应显示 "Signature: VALID"
```

---

## P3 — UX 打磨（持续迭代）

### P3-1：Diff Side-by-Side 视图

**文件**：`src/components/Dashboard/DiffViewer.tsx`、`src/components/Dashboard/DiffView.tsx`
**目标**：在现有 unified diff 基础上增加 side-by-side 对比模式，左右分栏显示旧/新版本。

### P3-2：图谱大型项目性能优化

**文件**：`src/hooks/useArchitectureGraph.ts`、`src/components/Dashboard/ArchitectureMap/MapCanvas.tsx`
**目标**：500+ 节点时使用虚拟化渲染或 Web Worker 计算布局，避免主线程阻塞。

### P3-3：自动更新机制

**文件**：`electron/main.ts`、`package.json`
**目标**：集成 `electron-updater`，启动时检查新版本并提示下载。

### P3-4：macOS/Linux 构建支持

**文件**：`package.json`（electron-builder 配置）、相关原生模块
**目标**：验证并修复 macOS 和 Linux 上的 electron-builder 打包。

---

## 执行顺序建议

```
第1周：  P0-1, P0-2, P0-3 (安全修复，3个任务可并行)
第2周：  P1-1 (测试体系，先建立再动架构)
第3周：  P1-3 (拆分 main.ts，测试保护下重构)
第4周：  P1-4 (拆分 AppContext)
第5-6周：P1-2 (E2E 测试)
第7-8周：P2-1, P2-2 (性能优化，可并行)
第9周：  P2-3 (CI 配置)
第10周： P2-4 (MCP Server，核心差异化功能)
第11周： P2-5 (签名机制)
第12周+：P3 各项 (UX 打磨，按需选择)
```

---

## 每个任务完成后

1. `npx tsc --noEmit` — 零类型错误
2. `npm test` — 测试全部通过
3. `npm run build` — 构建成功
4. git commit（语义化 message）+ DBHT 双轨提交
5. 如涉及需求文档追踪，更新 DBHT-REQUIREMENTS.md

---

> 生成日期：2026-05-07 | 基于 v2.0 技术审计报告 | 作者：AI 技术审计 + 王广平
