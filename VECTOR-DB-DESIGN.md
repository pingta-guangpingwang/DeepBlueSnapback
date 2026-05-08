# DBHT 向量数据库 — 技术设计文档

> 版本：v1.0 | 日期：2026-05-08 | 状态：设计阶段

---

## 1. 概述

### 1.1 目标

在 DBHT 中内置向量数据库引擎，为 AI 工具提供项目文件的语义检索能力。向量数据库与知识图谱深度结合，共同构成 DBHT 的 RAG（检索增强生成）基础设施。

### 1.2 核心能力

- **文件向量化**：将项目中的任意文本文件（源码、文档、配置）编码为向量嵌入
- **语义搜索**：根据自然语言查询，返回语义最相关的文件/代码片段
- **项目绑定**：向量数据存储在 DBHT 根仓库，与项目生命周期绑定
- **AI 可调用**：通过 CLI、External REST API、IPC 三种渠道供 AI 工具查询
- **GUI 管理**：在 Dashboard 中查看向量索引状态、手动触发索引、测试搜索
- **版本关联**：向量索引与图谱版本（commitId）关联，支持跨版本对比

### 1.3 与知识图谱的关系

```
┌─────────────────────────────────────────────────────┐
│                   DBHT RAG 基础设施                    │
│                                                     │
│  ┌───────────────────┐   ┌──────────────────────┐  │
│  │   知识图谱 (Graph)  │   │  向量数据库 (Vector)   │  │
│  │                   │   │                      │  │
│  │ · 模块结构        │   │ · 语义向量嵌入        │  │
│  │ · 依赖关系        │   │ · 相似度搜索          │  │
│  │ · 架构层级        │   │ · 代码片段检索        │  │
│  │ · 循环检测        │   │ · 跨文件语义关联      │  │
│  │                   │   │                      │  │
│  │ 回答："哪些文件    │   │ 回答："哪个文件的      │  │
│  │ 依赖了这个模块？"  │   │ 内容和这个查询最相关？"│  │
│  └────────┬──────────┘   └──────────┬───────────┘  │
│           │                         │              │
│           └─────────┬───────────────┘              │
│                     │                              │
│           ┌─────────┴─────────┐                    │
│           │  统一 RAG 查询接口  │                    │
│           │  GET /api/v1/rag   │                    │
│           └───────────────────┘                    │
└─────────────────────────────────────────────────────┘
```

图谱提供**结构性**上下文（谁依赖谁、层级关系），向量数据库提供**语义性**上下文（内容和查询的相关性），两者互补。

---

## 2. 架构设计

### 2.1 整体架构

```
┌──────────────────────────────────────────────────────────┐
│                     Renderer Process                       │
│  ┌────────────────────┐  ┌─────────────────────────────┐ │
│  │  VectorPanel UI    │  │  useVectorDB() hook         │ │
│  │  · 索引状态        │  │  · search(query)            │ │
│  │  · 搜索测试        │  │  · indexFiles(paths)        │ │
│  │  · 手动索引        │  │  · getStatus()              │ │
│  └────────────────────┘  └─────────────────────────────┘ │
└──────────────────────────┬───────────────────────────────┘
                           │ IPC
┌──────────────────────────┴───────────────────────────────┐
│                     Main Process                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │                 vector-engine.ts                      │ │
│  │  ┌──────────────┐ ┌────────────┐ ┌───────────────┐  │ │
│  │  │ Embedder     │ │ IndexStore │ │ SearchEngine  │  │ │
│  │  │ · chunk split│ │ · save/load│ │ · cosine sim  │  │ │
│  │  │ · embedding  │ │ · metadata │ │ · top-k       │  │ │
│  │  │ · batch proc │ │ · version  │ │ · filter      │  │ │
│  │  └──────────────┘ └────────────┘ └───────────────┘  │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌──────────────────────┐  ┌──────────────────────────┐  │
│  │  external-api.ts     │  │  main.ts (IPC handlers)  │  │
│  │  /api/v1/rag/search  │  │  vector:index            │  │
│  │  /api/v1/rag/index   │  │  vector:search           │  │
│  │  /api/v1/rag/status  │  │  vector:status           │  │
│  └──────────────────────┘  └──────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────┴───────────────────────────────┐
│                     Storage Layer                          │
│  <rootPath>/vectors/<projectName>/                        │
│  ├── index.json           # 向量索引元数据                 │
│  ├── embeddings.bin       # 向量数据 (Float32Array 二进制) │
│  ├── chunks.json          # 文本分块 + 元数据              │
│  └── versions/            # 按 commitId 的索引快照         │
│      ├── <commitId>.json  # 版本关联（引用 index.json）    │
│      └── ...                                              │
└──────────────────────────────────────────────────────────┘
```

### 2.2 核心模块

| 模块 | 文件 | 职责 |
|------|------|------|
| 嵌入引擎 | `electron/vector-engine.ts` | 文本分块、调用嵌入模型、批量处理 |
| 索引存储 | `electron/vector-engine.ts` | 向量和元数据的读写、版本管理 |
| 搜索引擎 | `electron/vector-engine.ts` | 余弦相似度计算、Top-K 检索、过滤 |
| IPC 处理 | `electron/main.ts` | 渲染进程 ↔ 主进程通信 |
| REST API | `electron/external-api.ts` | 外部 AI 工具的 HTTP 查询接口 |
| CLI | `electron/cli-standalone.js` | `dbht vector search/index/status` |
| UI 面板 | `src/components/Dashboard/VectorPanel.tsx` | 向量索引管理界面 |
| Hook | `src/hooks/useVectorDB.ts` | 前端状态管理 |

---

## 3. 数据模型

### 3.1 文本分块 (Chunk)

```typescript
interface VectorChunk {
  id: string              // SHA-256 of content
  filePath: string        // 相对于项目根目录的路径
  startLine: number       // 起始行号 (0-based)
  endLine: number         // 结束行号 (exclusive)
  content: string         // 分块文本内容
  tokenCount: number      // 估计 token 数
  language: string        // 编程语言 (ts/js/py/go/...)
  nodeId?: string         // 关联的知识图谱节点 ID
}
```

分块策略：
- **源码文件**：按函数/类边界分块（AST 感知），单个 chunk 上限 512 tokens
- **文档/Markdown**：按标题段落分块，上限 512 tokens
- **配置文件**：完整文件作为一个 chunk（通常足够小）

### 3.2 嵌入向量 (Embedding)

```typescript
interface VectorEmbedding {
  chunkId: string         // 关联的 chunk.id
  vector: Float32Array    // 嵌入向量（维度取决于模型）
  dimensions: number      // 向量维度
  model: string           // 使用的嵌入模型名称
  createdAt: string       // ISO8601
}
```

### 3.3 索引元数据

```typescript
interface VectorIndex {
  schemaVersion: number       // = 1
  projectName: string
  commitId: string            // 关联的图谱版本
  model: string               // 嵌入模型
  dimensions: number          // 向量维度
  totalChunks: number
  totalFiles: number
  totalTokens: number
  createdAt: string
  updatedAt: string
}

interface StoredIndex {
  meta: VectorIndex
  chunks: VectorChunk[]
  embeddings: number[][]      // 序列化为二维数组存 JSON，或二进制文件
}
```

### 3.4 查询与结果

```typescript
interface VectorQuery {
  text: string                // 查询文本
  topK?: number               // 返回数量，默认 10
  minSimilarity?: number      // 最低相似度阈值 (0-1)，默认 0.5
  fileTypes?: string[]        // 过滤文件类型
  nodeId?: string             // 限制在图谱节点范围内搜索
}

interface VectorSearchResult {
  chunk: VectorChunk
  similarity: number          // 余弦相似度 [0, 1]
  rank: number
}
```

---

## 4. 嵌入模型选择

### 4.1 设计原则

- **本地优先**：默认使用本地模型，零外部依赖
- **可更换**：支持配置外部 API（OpenAI、deepseek 等）
- **合理默认**：内置一个轻量级本地模型

### 4.2 方案对比

| 方案 | 维度 | 文件大小 | 优点 | 缺点 |
|------|------|---------|------|------|
| all-MiniLM-L6-v2 (ONNX) | 384 | ~90MB | 质量好，业界标准 | 需要下载模型文件 |
| @xenova/transformers.js | 384 | ~90MB | 纯 JS，无需 ONNX | 首次加载慢 |
| 外部 API (OpenAI text-embedding-3-small) | 1536 | — | 质量最好，免本地资源 | 需要 API Key，有网络延迟 |
| 自定义 TF-IDF 向量 | 动态 | — | 零依赖，极快 | 无语义理解，质量低 |

### 4.3 推荐方案：分层策略

```
默认模式：本地 ONNX 模型 (all-MiniLM-L6-v2)
  ↓ 用户在设置中配置了 API Key
增强模式：外部 API (用户选择的 provider)
  ↓
自动回退：外部 API 不可用时自动切换本地模型
```

**实施路径**：
1. **第一阶段（当前）**：纯本地，使用 TF-IDF + 词共现矩阵生成稀疏向量。零依赖，立即可用，质量够用。
2. **第二阶段**：集成 `@xenova/transformers`，提供 384 维语义向量。
3. **第三阶段**：支持外部 API 配置。

> 第一阶段使用轻量级文本向量化（N-gram + TF-IDF），不需下载模型，即时可用。后续可平滑升级到深度学习模型。

---

## 5. 存储设计

### 5.1 目录结构

```
<rootPath>/
└── vectors/
    └── <projectName>/
        ├── index.json          # 元数据 + chunk 列表
        ├── embeddings.bin      # Float32 二进制向量块
        └── versions/
            └── <commitId>.json # { linkedIndex: "<path>", createdAt: "..." }
```

### 5.2 文件格式

**index.json**：
```json
{
  "schemaVersion": 1,
  "projectName": "my-project",
  "commitId": "abc123def456",
  "model": "tfidf-v1",
  "dimensions": 768,
  "totalChunks": 150,
  "totalFiles": 42,
  "totalTokens": 45000,
  "createdAt": "2026-05-08T10:30:00Z",
  "updatedAt": "2026-05-08T10:30:00Z",
  "chunks": [
    {
      "id": "sha256-of-content",
      "filePath": "src/components/App.tsx",
      "startLine": 0,
      "endLine": 45,
      "content": "import React...",
      "tokenCount": 280,
      "language": "tsx",
      "nodeId": "room:src/components/App.tsx"
    }
  ]
}
```

**embeddings.bin**：
- 头部 8 字节：`[dimensions: uint32, count: uint32]`
- 向量数据：连续的 `count * dimensions` 个 Float32（小端序）
- 向量顺序与 `index.json` 中 chunks 数组顺序一致

### 5.3 索引大小估算

- 中型项目（500 文件，2000 chunks，384 维）：~3 MB 向量 + ~500 KB 元数据 = **~3.5 MB**
- 大型项目（5000 文件，20000 chunks，384 维）：~30 MB 向量 + ~5 MB 元数据 = **~35 MB**

对于本地应用完全可接受。

---

## 6. API 设计

### 6.1 IPC 接口

```typescript
// —— 索引操作 ——

// 对指定文件列表生成向量索引
vector:index(repoPath: string, workingCopyPath: string, 
             commitId: string, projectName: string, 
             filePaths?: string[]) 
  => { success: boolean; index: VectorIndex; message?: string }

// 获取索引状态
vector:status(projectName: string)
  => { success: boolean; index?: VectorIndex; message?: string }

// 删除索引
vector:delete(projectName: string)
  => { success: boolean; message?: string }

// —— 搜索操作 ——

// 语义搜索
vector:search(projectName: string, query: VectorQuery)
  => { success: boolean; results: VectorSearchResult[]; message?: string }

// 批量搜索（多个查询并行）
vector:searchBatch(projectName: string, queries: VectorQuery[])
  => { success: boolean; results: VectorSearchResult[][]; message?: string }

// —— 进度推送 ——

// 索引构建进度（遵循已有 onGraphProgress 模式）
onVectorProgress: (callback: (msg: string) => void) => () => void
```

### 6.2 REST API 端点

在 `external-api.ts` 中新增：

```
POST /api/v1/projects/:name/vector/index
  可选 body: { filePaths?: string[] }
  → { success: true, index: { totalChunks, totalFiles, ... } }

GET  /api/v1/projects/:name/vector/status
  → { success: true, index: {...} | null }

POST /api/v1/projects/:name/vector/search
  body: { text: string, topK?: number, minSimilarity?: number, fileTypes?: string[] }
  → { success: true, results: [{ filePath, startLine, similarity, content }, ...] }

DELETE /api/v1/projects/:name/vector
  → { success: true }
```

### 6.3 CLI 命令

```bash
# 构建向量索引
dbht vector index [--files <glob>]

# 语义搜索
dbht vector search "how does authentication work" [--top-k 10] [--project <name>]

# 查看索引状态
dbht vector status [--project <name>]

# 删除索引
dbht vector delete [--project <name>]
```

---

## 7. UI 设计

### 7.1 Dashboard 新增 "Vectors" 标签页

```
┌─────────────────────────────────────────────────────────┐
│  [概览] [文件] [图谱] [向量] [健康] [历史] [设置] [关于]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─── 索引状态 ─────────────────────────────────────┐   │
│  │  模型: TF-IDF v1    维度: 768                     │   │
│  │  分块数: 2,340      文件数: 156                   │   │
│  │  关联版本: abc123d  上次索引: 2026-05-08 10:30    │   │
│  │  [重新索引] [删除索引]                             │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─── 语义搜索 ─────────────────────────────────────┐   │
│  │  [________________________________________] [搜索] │   │
│  │  Top-K: [10▼]  最低相似度: [0.5▼]                │   │
│  │                                                   │   │
│  │  结果:                                            │   │
│  │  ┌──────────────────────────────────────────────┐ │   │
│  │  │ #1 相似度 0.87  src/auth/login.ts:22-45      │ │   │
│  │  │ function authenticateUser(credentials) {     │ │   │
│  │  │   ...                                        │ │   │
│  │  │ [查看文件]                                    │ │   │
│  │  └──────────────────────────────────────────────┘ │   │
│  │  ┌──────────────────────────────────────────────┐ │   │
│  │  │ #2 相似度 0.74  src/auth/middleware.ts:8-15  │ │   │
│  │  │ ...                                          │ │   │
│  │  └──────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 7.2 图谱面板集成

在图谱的 RAG 帮助弹窗中，搜索流程自动调用向量搜索增强结果：

```typescript
// 图谱 RAG 查询增强
async function enhancedRagQuery(query: string) {
  const [graphContext, vectorResults] = await Promise.all([
    getRagContext(commitId),       // 图谱结构上下文
    vectorSearch(projectName, { text: query, topK: 5 }),  // 语义搜索结果
  ])
  return { graphContext, vectorResults }
}
```

---

## 8. 实施计划

### Phase 1：核心引擎 + IPC（2-3 天）

| 文件 | 操作 | 内容 |
|------|------|------|
| `electron/vector-engine.ts` | **新建** | `VectorEngine` 类：TF-IDF 向量化、chunk 分割、余弦搜索、索引读写 |
| `electron/main.ts` | 修改 | 注册 `vector:index/search/status/delete` 四个 IPC handler + 进度推送 |
| `electron/preload.ts` | 修改 | 暴露 `vectorIndex/search/status/delete` + `onVectorProgress` |
| `src/types/electron.d.ts` | 修改 | 添加向量相关类型声明 |

### Phase 2：CLI + REST API（1 天）

| 文件 | 操作 | 内容 |
|------|------|------|
| `electron/cli-standalone.js` | 修改 | 添加 `vector index/search/status/delete` 子命令 |
| `electron/external-api.ts` | 修改 | 添加 `/api/v1/projects/:name/vector/*` 端点 |

### Phase 3：前端 UI（2 天）

| 文件 | 操作 | 内容 |
|------|------|------|
| `src/hooks/useVectorDB.ts` | **新建** | 前端 hook：状态管理、搜索、索引操作 |
| `src/components/Dashboard/VectorPanel.tsx` | **新建** | 向量索引面板：状态卡片、搜索框、结果列表 |
| `src/components/Dashboard/Dashboard.tsx` | 修改 | 添加 "Vectors" 标签页 |
| `src/i18n/locales/en.ts` | 修改 | 添加 `vector:` 翻译 key |
| `src/i18n/locales/zh.ts` | 修改 | 添加 `vector:` 翻译 key |
| `src/index.css` | 修改 | 添加向量面板样式 |

### Phase 4：图谱集成 + 端到端测试（1 天）

| 文件 | 操作 | 内容 |
|------|------|------|
| `src/components/Dashboard/ArchitectureMap/ArchitectureMap.tsx` | 修改 | RAG 查询同时调向量搜索 |
| `electron/external-api.ts` | 修改 | `/api/v1/projects/:name/rag` 增强：融合图谱 + 向量结果 |

### 总计：约 6-7 天

---

## 9. 文件清单

```
新增文件：
  electron/vector-engine.ts                        # 向量引擎核心
  src/hooks/useVectorDB.ts                         # 前端 hook
  src/components/Dashboard/VectorPanel.tsx          # 向量管理 UI

修改文件：
  electron/main.ts                                 # IPC 注册
  electron/preload.ts                              # bridge 暴露
  electron/cli-standalone.js                       # CLI 命令
  electron/external-api.ts                         # REST 端点
  src/types/electron.d.ts                          # 类型声明
  src/components/Dashboard/Dashboard.tsx            # 标签页
  src/components/Dashboard/ArchitectureMap/ArchitectureMap.tsx  # RAG 增强
  src/i18n/locales/en.ts                           # 英文翻译
  src/i18n/locales/zh.ts                           # 中文翻译
  src/index.css                                    # 样式
```

---

## 10. 验证方案

1. **CLI**：`dbht vector index && dbht vector search "authentication" --top-k 5`
2. **GUI**：Dashboard → Vectors tab → 点击索引 → 搜索 → 验证结果
3. **REST API**：`curl -H "Authorization: Bearer <token>" -X POST .../vector/search -d '{"text":"login","topK":3}'`
4. **RAG 增强**：图谱帮助面板搜索 → 结果包含向量搜索的语义匹配项
5. **构建**：`npm run build` 零错误
