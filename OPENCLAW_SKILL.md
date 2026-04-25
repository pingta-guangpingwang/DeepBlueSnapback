# 深蓝主神版本管理技能 (DBGODVS)

DBGODVS 是一个本地版本管理工具，提供类似 SVN 的集中仓库 + 分布式工作副本架构。AI 智能体可以通过命令行操作 DBGODVS 完成项目版本管理。

## 安装与初始化

### 前置条件
- DBGODVS 已安装并可用命令行 `dbgvs`
- 已设置根仓库路径

### 初始化根仓库
```bash
dbgvs set-root /path/to/root-repo
```

### 在项目中初始化版本管理

对于一个新项目目录：
```bash
# 创建仓库并注册项目（会自动提交初始版本）
dbgvs init /path/to/project
```

对于已有项目目录：
```bash
# 导入已有项目到 DBGODVS 管理
dbgvs import-project /path/to/existing/project
```

## 日常工作流

### 查看工作区状态
```bash
# 查看当前有哪些文件变更（新增/修改/删除）
dbgvs status /path/to/project

# 输出示例：
# A new-file.ts        （新增）
# M src/main.ts        （修改）
# D old-file.ts        （删除）
```

### 提交变更
```bash
# 提交所有变更文件
dbgvs commit /path/to/project -m "feat: 添加用户认证模块"

# 提交指定文件
dbgvs commit /path/to/project -m "fix: 修复登录验证" -f "src/auth.ts,src/utils.ts"
```

### 查看版本信息
```bash
# 查看当前版本状态
dbgvs version /path/to/project

# 查看提交历史
dbgvs log /path/to/project

# 查看最近 5 条
dbgvs log /path/to/project -n 5
```

### 更新与回滚
```bash
# 更新到最新版本（丢弃工作区修改，恢复到仓库最新状态）
dbgvs update /path/to/project

# 回滚到指定版本
dbgvs rollback /path/to/project -v 20260418T143022123
```

### 查看差异
```bash
# 查看工作区与最新版本的差异
dbgvs diff /path/to/project -f src/main.ts

# 查看两个版本间的差异
dbgvs diff /path/to/project -f src/main.ts -a 20260418T120000000 -b 20260418T143022123
```

### 拉取项目
```bash
# 从仓库拉取项目到新目录
dbgvs pull /path/to/root-repo/repositories/ProjectName /target/directory

# 指定文件夹名
dbgvs pull /path/to/root-repo/repositories/ProjectName /target/directory -n MyProject
```

### 列出所有仓库
```bash
dbgvs list-repos
```

## AI 智能体集成指南

### 典型场景：AI 辅助开发

1. **项目初始化**
   ```
   用户：帮我创建一个新项目 MyProject
   AI：
   $ dbgvs init /path/to/MyProject
   $ dbgvs commit /path/to/MyProject -m "初始项目结构"
   ```

2. **功能开发后提交**
   ```
   用户：我已经完成了登录功能
   AI：
   $ dbgvs status /path/to/MyProject
   $ dbgvs commit /path/to/MyProject -m "feat: 实现用户登录功能"
   ```

3. **出错时回滚**
   ```
   用户：刚才的改动有问题，回滚到上一个版本
   AI：
   $ dbgvs log /path/to/MyProject -n 5
   $ dbgvs rollback /path/to/MyProject -v 20260418T143022123
   ```

4. **版本对比**
   ```
   用户：最近改了什么？
   AI：
   $ dbgvs log /path/to/MyProject -n 3
   $ dbgvs diff /path/to/MyProject -f src/main.ts
   ```

### AI 安全策略

AI 在操作版本管理时应遵循以下规则：

1. **每次完成功能后提交** — 确保每个可工作的状态都有版本记录
2. **提交信息语义化** — 使用 `feat:` / `fix:` / `refactor:` 等前缀
3. **修改前先检查状态** — `dbvs status` 确认当前无未提交变更
4. **出错立即回滚** — 使用 `dbvs rollback` 恢复到最近的稳定版本
5. **不要跳过提交** — 即使是小改动也要提交，保持完整版本历史

### CLI 命令速查

| 命令 | 说明 |
|------|------|
| `dbvs set-root <path>` | 设置根仓库 |
| `dbvs get-root` | 查看根仓库路径 |
| `dbvs init <path>` | 初始化项目版本管理 |
| `dbvs import-project <src>` | 导入已有项目 |
| `dbvs status [path]` | 查看工作区状态 |
| `dbvs commit <path> -m <msg>` | 提交变更 |
| `dbvs log [path]` | 查看提交日志 |
| `dbvs version [path]` | 查看当前版本信息 |
| `dbvs update <path>` | 更新到最新版本 |
| `dbvs rollback <path> -v <ver>` | 回滚到指定版本 |
| `dbvs diff <path> -f <file>` | 查看文件差异 |
| `dbvs pull <repo> <dir>` | 拉取项目到新目录 |
| `dbvs list-repos` | 列出所有仓库 |
| `dbvs info <path>` | 查看仓库详细信息 |
| `dbvs verify <path>` | 验证仓库完整性 |
| `dbvs file-tree <path>` | 列出项目文件树 |

### 输出格式

所有命令支持 `--format` 参数：
- `--format json` （默认）JSON 格式输出，适合程序解析
- `--format table` 表格格式，适合人类阅读
- `--format text` 纯文本摘要
