
## 2026-05-07 — Phase 1: AST Analysis Engine & Architecture Graph Builder

### 完成内容
- **AST 解析器** (`electron/ast-analyzer.ts`): 基于 TypeScript Compiler API (`ts.createSourceFile`)，零侵入解析项目源码，提取 imports/exports/functions/classes/call expressions。支持文件哈希缓存，避免重复解析未变更文件。
- **图谱构建器** (`electron/graph-builder.ts`): 将 AST 分析结果转为建筑比喻图谱（文件夹=楼栋、模块=楼层、文件=房间），自动识别 pipeline/hierarchy/flow 三类依赖边，DFS 循环检测标注 circular 红线。
- **图谱存储** (`electron/graph-store.ts`): 每版本独立存储图谱 JSON 到 `graphs/<commitId>.json`。包含图谱对比引擎（compareGraphs）和架构变更日志（_change-log.json）。
- **5 个新 IPC**: ast:parse-project, graph:build, graph:get, graph:list-versions, graph:compare
- **提交自动建图**: commit 成功后 setImmediate 后台异步构建图谱，失败不影响提交流程。

### 技术验证
- electron TypeScript 编译通过 (tsc --project tsconfig.node.json)
- 前端 TypeScript 类型检查通过 (tsc --noEmit)
- 已 push 到 GitHub (commit 8a81394)

### 新增依赖
- d3-force ^3.0.0
- d3-selection ^3.0.0
