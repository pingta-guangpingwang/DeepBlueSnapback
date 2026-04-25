# SVN 完整功能清单

> 参考 Apache Subversion 1.14 完整功能集，按功能域分类整理。

---

## 一、仓库管理（Repository Management）

### 1.1 仓库创建与初始化
| 功能 | 命令 | 说明 |
|------|------|------|
| 创建仓库 | `svnadmin create <path>` | 创建一个新的 SVN 仓库，包含基础目录结构 |
| 仓库验证 | `svnadmin verify <path>` | 验证仓库数据完整性 |
| 仓库迁移 | `svnadmin dump/load` | 导出/导入仓库数据 |
| 仓库热备份 | `svnadmin hotcopy` | 在线备份仓库 |
| 仓库升级 | `svnadmin upgrade` | 升级仓库格式到新版本 |

### 1.2 仓库配置
| 功能 | 说明 |
|------|------|
| 访问控制（authz） | 配置用户/组对路径的读写权限 |
| 密码认证（passwd） | 配置用户名密码 |
| 服务器配置 | svnserve.conf 配置（匿名访问、认证方式等） |
| 钩子脚本（hooks） | pre-commit、post-commit、pre-revprop-change 等事件钩子 |
| 仓库 UUID | 唯一标识仓库 |

---

## 二、工作副本操作（Working Copy Operations）

### 2.1 检出与导出
| 功能 | 命令 | 说明 |
|------|------|------|
| 检出（checkout） | `svn checkout <url> [path]` | 从仓库创建工作副本 |
| 导出（export） | `svn export <url> [path]` | 导出干净的目录树（无 .svn 元数据） |
| 切换分支 | `svn switch <url>` | 切换工作副本到不同分支/标签 |
| 重新定位 | `svn relocate <url>` | 仓库地址变更后更新工作副本指向 |

### 2.2 更新与同步
| 功能 | 命令 | 说明 |
|------|------|------|
| 更新（update） | `svn update [path...]` | 将仓库最新变更拉取到工作副本 |
| 更新到指定版本 | `svn update -r <rev>` | 更新到指定版本而非最新 |
| 合并更新冲突 | 手动处理 | 当 update 发现冲突时，标记冲突文件 |
| 恢复（revert） | `svn revert <path>` | 丢弃工作副本中的本地修改 |

### 2.3 状态查看
| 功能 | 命令 | 说明 |
|------|------|------|
| 状态查看 | `svn status [path...]` | 显示工作副本的文件修改状态 |
| 详细状态 | `svn status -v` | 显示最后修改的版本号和作者 |
| 远程状态 | `svn status -u` | 与仓库比较，显示过期信息 |
| 忽略列表 | `svn:ignore` | 配置哪些文件/目录不纳入版本控制 |
| 属性修改检测 | `svn status` | 检测属性变更（M 标记） |

### 2.4 文件状态标记
| 标记 | 含义 |
|------|------|
| ` ` (空格) | 无修改 |
| `A` | 已添加（Added） |
| `D` | 已删除（Deleted） |
| `M` | 已修改（Modified） |
| `R` | 已替换（Replaced） |
| `C` | 冲突（Conflict） |
| `X` | 外部定义（eXternal） |
| `I` | 被忽略（Ignored） |
| `?` | 未纳入版本控制 |
| `!` | 文件丢失（Missing） |
| `~` | 类型变更（目录↔文件） |

---

## 三、变更提交（Commit/Changeset）

### 3.1 基本提交
| 功能 | 命令 | 说明 |
|------|------|------|
| 提交 | `svn commit -m "message"` | 提交工作副本变更到仓库 |
| 选择性提交 | `svn commit <files...>` | 只提交指定文件的变更 |
| 修改提交信息 | `svn propset svn:log` | 修改历史提交的日志信息（需启用钩子） |

### 3.2 提交元数据
| 功能 | 说明 |
|------|------|
| 提交消息（log message） | 必填的变更说明 |
| 提交作者（author） | 记录谁执行了提交 |
| 提交时间（timestamp） | 自动记录的提交时间 |
| 提交版本号（revision） | 全局递增的版本号 |
| 变更文件列表 | 记录哪些文件发生了什么变更 |

### 3.3 添加与删除
| 功能 | 命令 | 说明 |
|------|------|------|
| 添加文件 | `svn add <path>` | 将新文件纳入版本控制 |
| 添加目录（递归） | `svn add <dir>` | 递归添加目录下所有文件 |
| 删除文件 | `svn delete <path>` | 从版本控制中删除文件（提交后生效） |
| 强制删除 | `svn delete --force` | 删除有本地修改的文件 |
| 重命名/移动 | `svn move/rename <src> <dst>` | 移动或重命名文件/目录 |
| 复制 | `svn copy <src> <dst>` | 保留历史的复制（用于分支/标签） |

---

## 四、差异与比对（Diff & Comparison）

### 4.1 差异查看
| 功能 | 命令 | 说明 |
|------|------|------|
| 工作副本差异 | `svn diff [path...]` | 查看工作副本与 BASE 的差异 |
| 两版本间差异 | `svn diff -r <rev1>:<rev2>` | 查看两个版本间的差异 |
| 指定文件差异 | `svn diff -r <rev1>:<rev2> <path>` | 查看特定文件在两个版本间的差异 |
| 单版本差异 | `svn diff -c <rev>` | 查看某个版本引入的变更 |
| 统一差异格式 | `svn diff --diff-cmd` | 使用自定义 diff 工具 |
| 并排对比 | 外部工具 | 使用 Beyond Compare 等工具并排对比 |

### 4.2 内容对比方式
| 类型 | 说明 |
|------|------|
| 文本差异（unified diff） | 标准的增/删/改行标注 |
| 二进制差异 | 标记二进制文件是否变更 |
| 属性差异 | 比较文件/目录属性变更 |
| 注解差异（annotate） | `svn blame/praise` 显示每行的最后修改版本 |

---

## 五、版本历史（History & Log）

### 5.1 日志查看
| 功能 | 命令 | 说明 |
|------|------|------|
| 查看日志 | `svn log [path]` | 显示提交历史 |
| 按版本范围 | `svn log -r <start>:<end>` | 查看指定版本范围的日志 |
| 限制条数 | `svn log -l <n>` | 只显示最近 n 条 |
| 详细模式 | `svn log -v` | 显示每个提交影响的文件 |
| 按路径过滤 | `svn log <path>` | 查看特定路径的变更历史 |
| 搜索日志 | `svn log --search <text>` | 在日志消息中搜索 |

### 5.2 注解（Blame/Annotate）
| 功能 | 命令 | 说明 |
|------|------|------|
| 注解 | `svn blame <file>` | 显示文件每行的最后修改版本和作者 |
| 指定版本范围 | `svn blame -r <rev1>:<rev2>` | 指定版本范围的注解 |

---

## 六、分支与标签（Branch & Tag）

### 6.1 分支操作
| 功能 | 命令 | 说明 |
|------|------|------|
| 创建分支 | `svn copy <trunk> <branches/feature>` | 使用 copy 创建分支 |
| 列出分支 | `svn list <branches>` | 查看所有分支 |
| 删除分支 | `svn delete <branches/feature>` | 删除分支 |
| 切换分支 | `svn switch <branch-url>` | 切换工作副本到分支 |

### 6.2 合并（Merge）
| 功能 | 命令 | 说明 |
|------|------|------|
| 合并分支 | `svn merge <source>` | 将分支变更合并到当前工作副本 |
| 指定版本合并 | `svn merge -r <rev1>:<rev2>` | 合并指定版本范围 |
| 重新整合合并 | `svn merge --reintegrate` | 将分支合并回主干 |
| 合并信息 | `svn mergeinfo` | 查看合并历史 |
| 记录合并追踪 | 自动 | svn:mergeinfo 属性追踪已合并的版本 |

### 6.3 标签（Tag）
| 功能 | 命令 | 说明 |
|------|------|------|
| 创建标签 | `svn copy <trunk> <tags/v1.0>` | 创建只读快照 |
| 列出标签 | `svn list <tags>` | 查看所有标签 |
| 删除标签 | `svn delete <tags/v1.0>` | 删除标签 |

---

## 七、属性管理（Properties）

### 7.1 版本化属性
| 功能 | 命令 | 说明 |
|------|------|------|
| 查看属性 | `svn proplist <path>` | 列出文件/目录的所有属性 |
| 获取属性值 | `svn propget <name> <path>` | 获取特定属性的值 |
| 设置属性 | `svn propset <name> <value> <path>` | 设置属性 |
| 删除属性 | `svn propdel <name> <path>` | 删除属性 |
| 编辑属性 | `svn propedit <name> <path>` | 用编辑器编辑属性 |

### 7.2 特殊属性
| 属性 | 说明 |
|------|------|
| `svn:ignore` | 忽略文件模式 |
| `svn:global-ignores` | 全局忽略模式 |
| `svn:executable` | 设置可执行位 |
| `svn:mime-type` | 设置 MIME 类型 |
| `svn:eol-style` | 行尾风格（LF/CRLF/native） |
| `svn:keywords` | 关键字替换（$Id$、$Date$等） |
| `svn:externals` | 外部仓库引用 |
| `svn:needs-lock` | 需要锁定才能编辑 |
| `svn:mergeinfo` | 合并追踪信息 |

---

## 八、锁定机制（Locking）

### 8.1 文件锁定
| 功能 | 命令 | 说明 |
|------|------|------|
| 锁定文件 | `svn lock <path>` | 独占锁定文件，防止他人修改 |
| 解锁文件 | `svn unlock <path>` | 解除锁定 |
| 强制解锁 | `svn unlock --force` | 强制解除他人的锁定（需权限） |
| 查看锁 | `svn info --show-item=locks` | 查看文件锁定状态 |
| 窃取锁 | `svn lock --force` | 窃取他人的锁定 |

---

## 九、信息与元数据（Info & Metadata）

### 9.1 信息查看
| 功能 | 命令 | 说明 |
|------|------|------|
| 文件/目录信息 | `svn info <path>` | 显示版本、作者、时间、路径等 |
| 列出目录 | `svn list <url/path>` | 列出仓库或工作副本中的内容 |
| 目录详细信息 | `svn list -v` | 显示版本号、作者、大小 |
| 仓库统计 | `svnlook` | 仓库级别的统计信息 |

### 9.2 工作副本管理
| 功能 | 命令 | 说明 |
|------|------|------|
| 清理 | `svn cleanup` | 清理工作副本（删除锁、完成中断操作） |
| 升级工作副本 | `svn upgrade` | 升级工作副本格式 |
| 解决冲突 | `svn resolve <path>` | 标记冲突已解决 |
| 标记已解决 | `svn resolved <path>` | （旧命令）标记冲突已解决 |

---

## 十、网络与服务器（Networking）

### 10.1 服务器协议
| 协议 | 说明 |
|------|------|
| `svn://` | svnserve 自定义协议（默认端口3690） |
| `http://` / `https://` | 通过 WebDAV/DeltaV 协议（需 Apache） |
| `file://` | 本地文件系统直接访问 |
| `svn+ssh://` | 通过 SSH 隧道访问 |

### 10.2 网络操作
| 功能 | 说明 |
|------|------|
| 认证 | 用户名/密码、SSH 密钥、SSL 证书 |
| 代理配置 | HTTP 代理设置 |
| 缓存凭证 | 缓存认证信息 |
| SSL/TLS | 加密通信 |
| 压缩传输 | 数据压缩 |

---

## 十一、外部工具集成（Integration）

### 11.1 外部定义（Externals）
| 功能 | 命令 | 说明 |
|------|------|------|
| 定义外部 | `svn propset svn:externals` | 引用其他仓库的目录 |
| 更新外部 | `svn update` 自动处理 | 自动拉取外部定义 |

### 11.2 钩子脚本（Hooks）
| 钩子 | 触发时机 |
|------|---------|
| `start-commit` | 提交开始前 |
| `pre-commit` | 提交内容验证 |
| `post-commit` | 提交完成后（通知、CI） |
| `pre-revprop-change` | 修改版本属性前 |
| `post-revprop-change` | 修改版本属性后 |
| `pre-lock` | 锁定前 |
| `post-lock` | 锁定后 |
| `pre-unlock` | 解锁前 |
| `post-unlock` | 解锁后 |

### 11.3 其他集成
| 功能 | 说明 |
|------|------|
| changelist | `svn changelist` 将文件分组便于批量操作 |
| 补丁 | `svn diff > patchfile` 生成标准补丁文件 |
| 应用补丁 | `svn patch <file>` 应用补丁 |

---

## 十二、冲突处理（Conflict Resolution）

| 功能 | 命令 | 说明 |
|------|------|------|
| 冲突检测 | 自动 | update/merge 时自动检测 |
| 冲突标记 | `C` 状态 | 工作副本标记冲突文件 |
| 冲突文件 | `.mine`/`.r<rev>` | 生成基础版本、冲突版本副本 |
| 交互式解决 | `svn resolve` | 选择接受我的/你的/合并版本 |
| 延迟解决 | `svn resolve --postpone` | 标记稍后解决 |
| 接受全量 | `svn resolve --accept mine-full/theirs-full` | 接受一方的全部变更 |

---

## 十三、备份与恢复（Backup & Recovery）

| 功能 | 命令 | 说明 |
|------|------|------|
| 仓库转储 | `svnadmin dump > file` | 完整导出仓库数据 |
| 仓库加载 | `svnadmin load < file` | 从转储文件恢复仓库 |
| 增量转储 | `svnadmin dump -r <rev>:HEAD` | 只导出指定版本范围 |
| 热备份 | `svnadmin hotcopy` | 在线热备份 |
| 验证 | `svnadmin verify` | 验证仓库完整性 |
| 清理修订属性 | `svnadmin rmmocks` | 删除废弃的修订属性 |

---

## 十四、性能与优化

| 功能 | 说明 |
|------|------|
| 稀疏检出 | `svn checkout --depth` 控制检出深度 |
| 浅克隆 | 只检出目录结构不下载文件 |
| 增量传输 | 只传输变更部分（Delta 传输） |
| 后端存储 | FSFS（默认）或 BDB |
| 打包修订 | `svnadmin pack` 压缩旧版本数据 |

---

## 十五、访问控制（Access Control）

| 功能 | 说明 |
|------|------|
| 匿名访问 | 允许无认证读取 |
| 用户认证 | 用户名/密码 |
| 路径授权 | 按路径控制读写权限 |
| 组权限 | 按用户组授权 |
| LDAP/AD 集成 | 企业认证集成 |
| SSL 客户端证书 | 证书认证 |

---

## 功能统计总览

| 功能域 | 功能数 |
|--------|--------|
| 仓库管理 | 10 |
| 工作副本操作 | 15 |
| 变更提交 | 12 |
| 差异比对 | 9 |
| 版本历史 | 7 |
| 分支与标签 | 10 |
| 属性管理 | 14 |
| 锁定机制 | 5 |
| 信息与元数据 | 8 |
| 网络与服务器 | 8 |
| 外部工具集成 | 9 |
| 冲突处理 | 6 |
| 备份与恢复 | 6 |
| 性能优化 | 5 |
| 访问控制 | 6 |
| **合计** | **~130** |
