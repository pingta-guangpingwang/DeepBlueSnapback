/**
 * DBVS CLI - 独立命令行接口（不依赖 Electron GUI）
 *
 * 用法: node electron/cli-standalone.js <command> [options]
 *   或 npx ts-node electron/cli-standalone.ts <command> [options]
 */

import { Command } from 'commander'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as os from 'os'
import git from 'isomorphic-git'
import http from 'isomorphic-git/http/node'
import { DBVSRepository } from './dbvs-repository'

const repo = new DBVSRepository()
const program = new Command()

program
  .name('dbvs')
  .description('DeepBlue Version System - 本地版本管理工具')
  .version('2.0.0')
  .option('--format <type>', '输出格式: json, table, text', 'json')
  .option('--root <path>', '指定根仓库路径（覆盖配置）')

// ==================== 输出格式化 ====================

function out(data: any, format: string) {
  if (format === 'json') {
    console.log(JSON.stringify(data, null, 2))
  } else if (format === 'table') {
    if (Array.isArray(data?.projects)) {
      console.log('\n项目列表:')
      console.log('─'.repeat(80))
      console.log(padRight('名称', 20) + padRight('状态', 12) + padRight('最后更新', 26) + '路径')
      console.log('─'.repeat(80))
      for (const p of data.projects) {
        console.log(padRight(p.name, 20) + padRight(p.status, 12) + padRight(p.lastUpdate || '-', 26) + p.path)
      }
      console.log('─'.repeat(80))
      console.log(`共 ${data.projects.length} 个项目`)
    } else if (Array.isArray(data?.status)) {
      console.log('\n工作区状态:')
      console.log('─'.repeat(60))
      for (const s of data.status) {
        const statusChar = s.charAt(0)
        const filePath = s.slice(2)
        const label = statusChar === 'A' ? '新增' : statusChar === 'M' ? '修改' : statusChar === 'D' ? '删除' : statusChar
        console.log(`  [${label}] ${filePath}`)
      }
      console.log('─'.repeat(60))
      console.log(`共 ${data.status.length} 个变更`)
    } else if (Array.isArray(data?.commits)) {
      console.log('\n提交历史:')
      console.log('─'.repeat(80))
      for (const c of data.commits) {
        const sizeStr = c.totalSize > 1024 ? `${(c.totalSize / 1024).toFixed(1)}KB` : `${c.totalSize}B`
        console.log(`  版本: ${c.id}`)
        console.log(`  时间: ${c.timestamp}`)
        console.log(`  说明: ${c.message}`)
        console.log(`  文件: ${c.fileCount} 个, 共 ${sizeStr}`)
        console.log('─'.repeat(80))
      }
    } else if (Array.isArray(data?.errors)) {
      for (const e of data.errors) {
        console.log(`  ✗ ${e}`)
      }
      console.log(data.valid ? '\n✓ 仓库验证通过' : `\n✗ 发现 ${data.errors.length} 个问题`)
    } else {
      console.log(typeof data === 'string' ? data : data.message || data.info || JSON.stringify(data, null, 2))
    }
  } else {
    // text format
    if (typeof data === 'string') { console.log(data); return }
    if (data.message) console.log(data.message)
    if (data.info) console.log(data.info)
    if (data.diff) console.log(data.diff)
    if (data.history) console.log(data.history)
    if (data.rootPath) console.log(`根仓库: ${data.rootPath}`)
    if (data.path) console.log(`路径: ${data.path}`)
    if (data.version) console.log(`版本: ${data.version}`)
    if (Array.isArray(data.status) && data.status.length > 0) {
      console.log('变更文件:')
      for (const s of data.status) console.log(`  ${s}`)
    }
    if (Array.isArray(data.projects)) {
      for (const p of data.projects) console.log(`  ${p.name} [${p.status}]`)
    }
  }
}

function padRight(str: string, len: number): string {
  const s = str || ''
  return s.length >= len ? s.slice(0, len) : s + ' '.repeat(len - s.length)
}

function getConfigPath(): string {
  return path.join(os.homedir(), '.dbvs', 'config.json')
}

function getRootPath(opts: any): string {
  if (opts.root) return opts.root
  const configPath = getConfigPath()
  if (fs.pathExistsSync(configPath)) {
    return fs.readJsonSync(configPath).rootPath
  }
  throw new Error('根仓库未配置。使用 dbvs set-root <path> 设置。')
}

// ==================== 根仓库管理 ====================

program.command('set-root <rootPath>')
  .description('设置根仓库路径')
  .action(async (rootPath: string) => {
    const fmt = program.opts().format
    try {
      rootPath = path.resolve(rootPath)
      await fs.ensureDir(rootPath)
      await fs.ensureDir(path.join(rootPath, 'projects'))
      await fs.ensureDir(path.join(rootPath, 'config'))
      const configPath = getConfigPath()
      await fs.ensureDir(path.dirname(configPath))
      await fs.writeJson(configPath, { rootPath, savedAt: new Date().toISOString() })
      out({ success: true, rootPath, message: `根仓库已设置: ${rootPath}` }, fmt)
    } catch (error) {
      out({ success: false, message: String(error) }, fmt)
      process.exit(1)
    }
  })

program.command('get-root')
  .description('获取根仓库路径')
  .action(() => {
    const fmt = program.opts().format
    try {
      out({ success: true, rootPath: getRootPath(program.opts()) }, fmt)
    } catch (error) {
      out({ success: false, message: String(error) }, fmt)
      process.exit(1)
    }
  })

// ==================== 项目管理（与 GUI 统一：使用 projects.json + repositories/）====================

/** 读取 projects.json 注册表 */
async function readProjectRegistry(rootPath: string): Promise<any[]> {
  const registryPath = path.join(rootPath, 'projects.json')
  if (!(await fs.pathExists(registryPath))) return []
  try { return await fs.readJson(registryPath) } catch { return [] }
}

/** 写入 projects.json 注册表 */
async function writeProjectRegistry(rootPath: string, registry: any[]): Promise<void> {
  await fs.writeJson(path.join(rootPath, 'projects.json'), registry, { spaces: 2 })
}

program.command('list-projects')
  .description('列出所有项目')
  .action(async () => {
    const fmt = program.opts().format
    try {
      const rootPath = getRootPath(program.opts())
      const registry = await readProjectRegistry(rootPath)
      const projects = []
      for (const entry of registry) {
        for (const wc of entry.workingCopies) {
          const exists = await fs.pathExists(wc.path)
          let lastUpdate = ''
          try { lastUpdate = (await fs.stat(wc.path)).mtime.toISOString() } catch { /* ok */ }
          projects.push({
            name: entry.name,
            path: wc.path,
            repoPath: entry.repoPath,
            status: exists ? '正常' : '路径不存在',
            lastUpdate,
          })
        }
      }
      out({ success: true, projects }, fmt)
    } catch (error) {
      out({ success: false, message: String(error) }, fmt)
      process.exit(1)
    }
  })

program.command('create-project <name>')
  .description('创建新项目')
  .option('-p, --path <customPath>', '自定义工作副本路径（默认在根仓库/projects/<name>下）')
  .action(async (name: string, opts: any) => {
    const fmt = program.opts().format
    try {
      const rootPath = getRootPath(program.opts())
      const repoPath = path.resolve(path.join(rootPath, 'repositories', name))
      await fs.ensureDir(path.join(rootPath, 'repositories'))

      if (await fs.pathExists(path.join(repoPath, 'config.json'))) {
        out({ success: false, message: `仓库 "${name}" 已存在` }, fmt)
        process.exit(1)
        return
      }

      // 创建集中仓库
      await repo.createRepository(repoPath, name)

      // 工作副本
      const workingCopyPath = opts.path ? path.resolve(opts.path) : path.resolve(path.join(rootPath, 'projects', name))
      await fs.ensureDir(workingCopyPath)
      await repo.initWorkingCopy(repoPath, workingCopyPath)

      // 写 README
      const readmePath = path.join(workingCopyPath, 'README.md')
      if (!(await fs.pathExists(readmePath))) {
        await fs.writeFile(readmePath, `# ${name}\n\n这是一个新的DBVS项目。\n`)
      }

      // 注册到 projects.json
      const registry = await readProjectRegistry(rootPath)
      if (!registry.find((e: any) => path.resolve(e.repoPath) === repoPath)) {
        registry.push({
          name, repoPath,
          workingCopies: [{ path: workingCopyPath }],
          created: new Date().toISOString()
        })
        await writeProjectRegistry(rootPath, registry)
      }

      out({ success: true, message: `项目 "${name}" 已创建`, repoPath, workingCopyPath }, fmt)
    } catch (error) {
      out({ success: false, message: String(error) }, fmt)
      process.exit(1)
    }
  })

program.command('import-project <src>')
  .description('导入外部文件夹为项目')
  .action(async (src: string) => {
    const fmt = program.opts().format
    try {
      const rootPath = getRootPath(program.opts())
      const name = path.basename(path.resolve(src))
      const normalizedPath = path.resolve(src)
      const repoPath = path.resolve(path.join(rootPath, 'repositories', name))
      await fs.ensureDir(path.join(rootPath, 'repositories'))

      // 创建集中仓库
      if (!(await fs.pathExists(path.join(repoPath, 'config.json')))) {
        await repo.createRepository(repoPath, name)
      }

      // 链接工作副本
      await repo.initWorkingCopy(repoPath, normalizedPath)

      // 初始提交
      const treeResult = await repo.getFileTree(normalizedPath)
      if (treeResult.success && treeResult.files && treeResult.files.length > 0) {
        const filePaths = treeResult.files.map((f: any) => f.path)
        await repo.commit(repoPath, normalizedPath, '初始导入', filePaths)
      }

      // 注册到 projects.json
      const registry = await readProjectRegistry(rootPath)
      const existing = registry.find((e: any) => path.resolve(e.repoPath) === repoPath)
      if (existing) {
        if (!existing.workingCopies.some((wc: any) => path.resolve(wc.path) === normalizedPath)) {
          existing.workingCopies.push({ path: normalizedPath })
        }
      } else {
        registry.push({ name, repoPath, workingCopies: [{ path: normalizedPath }], created: new Date().toISOString() })
      }
      await writeProjectRegistry(rootPath, registry)

      out({ success: true, message: `项目 "${name}" 已导入`, repoPath, workingCopyPath: normalizedPath }, fmt)
    } catch (error) {
      out({ success: false, message: String(error) }, fmt)
      process.exit(1)
    }
  })

program.command('delete-project <name>')
  .description('删除项目（包括所有文件和版本历史）')
  .option('--keep-files', '保留工作副本文件，仅删除集中仓库和注册信息')
  .action(async (name: string, opts: any) => {
    const fmt = program.opts().format
    try {
      const rootPath = getRootPath(program.opts())
      const registry = await readProjectRegistry(rootPath)
      const entry = registry.find((e: any) => e.name === name)
      if (!entry) {
        out({ success: false, message: `项目 "${name}" 不存在` }, fmt)
        process.exit(1)
        return
      }

      // 删除集中仓库
      if (await fs.pathExists(entry.repoPath)) {
        await fs.remove(entry.repoPath)
      }

      // 可选删除工作副本
      const removedPaths: string[] = []
      if (!opts.keepFiles) {
        for (const wc of entry.workingCopies) {
          if (await fs.pathExists(wc.path)) {
            await fs.remove(wc.path)
            removedPaths.push(wc.path)
          }
        }
      }

      // 从注册表移除
      const idx = registry.indexOf(entry)
      registry.splice(idx, 1)
      await writeProjectRegistry(rootPath, registry)

      out({
        success: true,
        message: `项目 "${name}" 已删除${opts.keepFiles ? '（工作副本保留）' : ''}`,
        removedPaths: removedPaths.length > 0 ? removedPaths : undefined,
      }, fmt)
    } catch (error) {
      out({ success: false, message: String(error) }, fmt)
      process.exit(1)
    }
  })

// ==================== 版本控制操作（SVN 风格）====================

/** 解析路径：自动区分仓库路径和工作副本路径 */
async function resolveRepoPaths(inputPath: string): Promise<{ repoPath: string; workingCopyPath: string }> {
  const resolved = await repo.resolvePaths(inputPath)
  if (!resolved) {
    // fallback：假设 inputPath 既是 repo 又是 working copy（兼容旧用法）
    return { repoPath: inputPath, workingCopyPath: inputPath }
  }
  return resolved
}

program.command('status [projectPath]')
  .description('查看工作区状态')
  .action(async (projectPath?: string) => {
    const fmt = program.opts().format
    try {
      const p = projectPath ? path.resolve(projectPath) : getRootPath(program.opts())
      const { repoPath, workingCopyPath } = await resolveRepoPaths(p)
      const result = await repo.getStatus(repoPath, workingCopyPath)
      if (fmt === 'table' && result.status) {
        out({ ...result, status: result.status }, fmt)
      } else {
        out(result, fmt)
      }
    } catch (error) {
      out({ success: false, message: String(error) }, fmt)
      process.exit(1)
    }
  })

program.command('commit <projectPath>')
  .description('提交变更')
  .requiredOption('-m, --message <msg>', '提交信息')
  .option('-f, --files <files>', '指定文件（逗号分隔），不指定则提交所有变更')
  .option('--dry-run', '仅显示将要提交的文件，不实际提交')
  .option('--ai <tool>', 'AI 工具标识（claude-code / cursor / copilot / manual）', 'manual')
  .option('--session <id>', 'AI 会话 ID，用于追溯同一次会话的所有提交')
  .option('--summary <text>', '本次变更的自然语言摘要')
  .action(async (projectPath: string, opts: any) => {
    const fmt = program.opts().format
    try {
      projectPath = path.resolve(projectPath)
      const { repoPath, workingCopyPath } = await resolveRepoPaths(projectPath)
      let files: string[] = opts.files ? opts.files.split(',').map((f: string) => f.trim()) : []
      if (!files.length) {
        const s = await repo.getStatus(repoPath, workingCopyPath)
        if (s.success && s.status) {
          files = s.status.filter((l: string) => l.startsWith('A ') || l.startsWith('M ') || l.startsWith('D ')).map((l: string) => l.slice(2).trim())
        }
      }
      if (!files.length) { out({ success: false, message: '没有需要提交的文件' }, fmt); return }
      if (opts.dryRun) {
        out({ success: true, dryRun: true, message: `将提交 ${files.length} 个文件`, files }, fmt)
        return
      }
      const options: any = {}
      if (opts.ai && opts.ai !== 'manual') options.author = opts.ai
      if (opts.session) options.sessionId = opts.session
      if (opts.summary) options.summary = opts.summary
      out(await repo.commit(repoPath, workingCopyPath, opts.message, files, options), fmt)
    } catch (error) {
      out({ success: false, message: String(error) }, fmt)
      process.exit(1)
    }
  })

program.command('history <projectPath>')
  .description('查看提交历史')
  .action(async (projectPath: string) => {
    const fmt = program.opts().format
    try {
      projectPath = path.resolve(projectPath)
      const { repoPath } = await resolveRepoPaths(projectPath)
      if (fmt === 'table') {
        const result = await repo.getHistoryStructured(repoPath)
        out(result, fmt)
      } else if (fmt === 'text') {
        out(await repo.getHistory(repoPath), fmt)
      } else {
        out(await repo.getHistoryStructured(repoPath), fmt)
      }
    } catch (error) {
      out({ success: false, message: String(error) }, fmt)
      process.exit(1)
    }
  })

program.command('rollback <projectPath>')
  .description('回滚到指定版本（自动创建回滚前快照）')
  .requiredOption('-v, --version <version>', '目标版本号')
  .action(async (projectPath: string, opts: any) => {
    const fmt = program.opts().format
    try {
      projectPath = path.resolve(projectPath)
      const { repoPath, workingCopyPath } = await resolveRepoPaths(projectPath)
      out(await repo.rollback(repoPath, workingCopyPath, opts.version), fmt)
    } catch (error) {
      out({ success: false, message: String(error) }, fmt)
      process.exit(1)
    }
  })

program.command('rollback-file <projectPath>')
  .description('恢复单个文件到指定版本')
  .requiredOption('-v, --version <version>', '目标版本号')
  .requiredOption('-f, --file <filePath>', '要恢复的文件路径（相对路径）')
  .action(async (projectPath: string, opts: any) => {
    const fmt = program.opts().format
    try {
      projectPath = path.resolve(projectPath)
      const { repoPath, workingCopyPath } = await resolveRepoPaths(projectPath)
      out(await repo.rollbackFile(repoPath, workingCopyPath, opts.version, opts.file), fmt)
    } catch (error) {
      out({ success: false, message: String(error) }, fmt)
      process.exit(1)
    }
  })

program.command('undo-rollback <projectPath>')
  .description('撤销上次回滚，恢复到回滚前自动快照')
  .action(async (projectPath: string) => {
    const fmt = program.opts().format
    try {
      projectPath = path.resolve(projectPath)
      const { repoPath, workingCopyPath } = await resolveRepoPaths(projectPath)
      out(await repo.undoRollback(repoPath, workingCopyPath), fmt)
    } catch (error) {
      out({ success: false, message: String(error) }, fmt)
      process.exit(1)
    }
  })

program.command('rollback-ai <projectPath>')
  .description('按 AI 会话 ID 回滚，恢复到该会话最早提交之前的版本')
  .requiredOption('-s, --session <sessionId>', 'AI 会话 ID')
  .action(async (projectPath: string, opts: any) => {
    const fmt = program.opts().format
    try {
      projectPath = path.resolve(projectPath)
      const { repoPath, workingCopyPath } = await resolveRepoPaths(projectPath)
      out(await repo.rollbackBySession(repoPath, workingCopyPath, opts.session), fmt)
    } catch (error) {
      out({ success: false, message: String(error) }, fmt)
      process.exit(1)
    }
  })

program.command('auto-snapshot <projectPath>')
  .description('定时自动提交（前台运行，Ctrl+C 停止）')
  .option('-i, --interval <minutes>', '间隔分钟数', '15')
  .option('--only-if-changed', '仅在有变更时提交', false)
  .action(async (projectPath: string, opts: any) => {
    const fmt = program.opts().format
    try {
      projectPath = path.resolve(projectPath)
      const { repoPath, workingCopyPath } = await resolveRepoPaths(projectPath)
      const intervalMs = Math.max(1, parseInt(opts.interval, 10)) * 60 * 1000

      console.log(`[auto-snapshot] 启动自动快照，间隔 ${opts.interval} 分钟，项目: ${projectPath}`)
      console.log('[auto-snapshot] 按 Ctrl+C 停止')

      const tick = async () => {
        try {
          const statusResult = await repo.getStatus(repoPath, workingCopyPath)
          if (!statusResult.success) return

          const changedFiles = (statusResult.status || []).filter((s: string) =>
            s.startsWith('[新增]') || s.startsWith('[修改]') || s.startsWith('[删除]')
          )
          if (opts.onlyIfChanged && changedFiles.length === 0) {
            console.log(`[${new Date().toLocaleTimeString()}] 无变更，跳过`)
            return
          }

          // 获取所有文件用于全量快照提交
          const allStatus = await repo.getStatus(repoPath, workingCopyPath)
          let filesToCommit: string[] = []
          if (allStatus.success && allStatus.status) {
            // 从状态行提取文件路径（取所有状态）
            filesToCommit = allStatus.status.map((l: string) => {
              const idx = l.indexOf('] ')
              return idx >= 0 ? l.slice(idx + 2).trim() : l.trim()
            })
          }

          if (filesToCommit.length === 0) {
            console.log(`[${new Date().toLocaleTimeString()}] 无文件可提交`)
            return
          }

          const result = await repo.commit(repoPath, workingCopyPath, '[auto] 自动快照', filesToCommit)
          if (fmt === 'json') {
            console.log(JSON.stringify(result))
          } else {
            if (result.success) {
              console.log(`[${new Date().toLocaleTimeString()}] 快照成功: ${result.message}`)
            } else {
              console.error(`[${new Date().toLocaleTimeString()}] 快照失败: ${result.message}`)
            }
          }
        } catch (e) {
          console.error(`[${new Date().toLocaleTimeString()}] 错误:`, e)
        }
      }

      // 首次立即执行一次
      await tick()
      // 定时执行
      const timer = setInterval(tick, intervalMs)
      process.on('SIGINT', () => {
        clearInterval(timer)
        console.log('\n[auto-snapshot] 已停止')
        process.exit(0)
      })
    } catch (error) {
      out({ success: false, message: String(error) }, fmt)
      process.exit(1)
    }
  })

program.command('update <projectPath>')
  .description('更新到最新版本（丢弃工作区修改）')
  .action(async (projectPath: string) => {
    const fmt = program.opts().format
    try {
      projectPath = path.resolve(projectPath)
      const { repoPath, workingCopyPath } = await resolveRepoPaths(projectPath)
      out(await repo.update(repoPath, workingCopyPath), fmt)
    } catch (error) {
      out({ success: false, message: String(error) }, fmt)
      process.exit(1)
    }
  })

program.command('diff <projectPath>')
  .description('查看文件差异（不指定 -f 则显示全局变更统计）')
  .option('-f, --file <filePath>', '指定文件路径（相对路径）')
  .option('-a, --version-a <version>', '旧版本')
  .option('-b, --version-b <version>', '新版本')
  .action(async (projectPath: string, opts: any) => {
    const fmt = program.opts().format
    try {
      projectPath = path.resolve(projectPath)
      const { repoPath, workingCopyPath } = await resolveRepoPaths(projectPath)
      if (opts.file) {
        out(await repo.getDiff(repoPath, workingCopyPath, opts.file, opts.versionA, opts.versionB), fmt)
      } else {
        // 全局变更统计
        const summary = await repo.getDiffSummary(repoPath, workingCopyPath)
        if (fmt === 'json') {
          console.log(JSON.stringify(summary, null, 2))
        } else {
          if (!summary.success) { console.error(summary.message); process.exit(1) }
          const files = summary.files || []
          if (files.length === 0) {
            console.log('没有变更')
          } else {
            console.log(`变更文件: ${files.length} 个`)
            console.log(`总计: +${summary.totalAdded} 行  -${summary.totalRemoved} 行`)
            console.log('')
            for (const f of files) {
              const icon = f.status === 'added' ? '+' : f.status === 'deleted' ? '-' : '~'
              console.log(`  [${icon}] ${f.path}${f.status === 'modified' ? `  (+${f.added} -${f.removed})` : ''}`)
            }
          }
        }
      }
    } catch (error) {
      out({ success: false, message: String(error) }, fmt)
      process.exit(1)
    }
  })

program.command('info <projectPath>')
  .description('查看仓库信息')
  .action(async (projectPath: string) => {
    const fmt = program.opts().format
    try {
      projectPath = path.resolve(projectPath)
      const { repoPath } = await resolveRepoPaths(projectPath)
      out(await repo.getRepositoryInfo(repoPath), fmt)
    } catch (error) {
      out({ success: false, message: String(error) }, fmt)
      process.exit(1)
    }
  })

program.command('init <projectPath>')
  .description('在指定目录初始化 DBVS 仓库')
  .action(async (projectPath: string) => {
    const fmt = program.opts().format
    try {
      projectPath = path.resolve(projectPath)
      out(await repo.createRepository(projectPath, path.basename(projectPath)), fmt)
    } catch (error) {
      out({ success: false, message: String(error) }, fmt)
      process.exit(1)
    }
  })

program.command('verify <projectPath>')
  .description('验证仓库完整性')
  .action(async (projectPath: string) => {
    const fmt = program.opts().format
    try {
      projectPath = path.resolve(projectPath)
      const { repoPath } = await resolveRepoPaths(projectPath)
      out(await repo.verify(repoPath), fmt)
    } catch (error) {
      out({ success: false, message: String(error) }, fmt)
      process.exit(1)
    }
  })

program.command('file-tree <projectPath>')
  .description('列出项目文件树')
  .action(async (projectPath: string) => {
    const fmt = program.opts().format
    try {
      projectPath = path.resolve(projectPath)
      const result = await repo.getFileTree(projectPath)
      if (fmt === 'table' && result.files) {
        console.log('\n文件列表:')
        console.log('─'.repeat(60))
        for (const f of result.files) {
          console.log(`  ${f.path}`)
        }
        console.log('─'.repeat(60))
        console.log(`共 ${result.files.length} 个文件`)
      } else {
        out(result, fmt)
      }
    } catch (error) {
      out({ success: false, message: String(error) }, fmt)
      process.exit(1)
    }
  })

program.command('pull <repoPath> <targetDir>')
  .description('从仓库拉取项目到目标目录')
  .option('-n, --name <folderName>', '目标文件夹名称（默认使用仓库名称）')
  .action(async (repoPath: string, targetDir: string, opts: any) => {
    const fmt = program.opts().format
    try {
      repoPath = path.resolve(repoPath)
      targetDir = path.resolve(targetDir)
      const folderName = opts.name || path.basename(repoPath)
      const destPath = path.join(targetDir, folderName)
      if (await fs.pathExists(destPath)) {
        const files = await fs.readdir(destPath).catch(() => [])
        if (files.filter(f => !f.startsWith('.')).length > 0) {
          out({ success: false, message: `目标路径 "${destPath}" 已存在且不为空` }, fmt)
          process.exit(1)
        }
      }
      const checkoutResult = await repo.checkout(repoPath, destPath)
      if (!checkoutResult.success) { out(checkoutResult, fmt); process.exit(1); return }
      out({ ...checkoutResult, message: `拉取成功: ${destPath}`, path: destPath }, fmt)
    } catch (error) {
      out({ success: false, message: String(error) }, fmt)
      process.exit(1)
    }
  })

program.command('log [projectPath]')
  .description('查看提交日志（含文件详情）')
  .option('-n, --limit <count>', '显示最近 N 条记录', '10')
  .action(async (projectPath?: string, opts?: any) => {
    const fmt = program.opts().format
    try {
      const p = projectPath ? path.resolve(projectPath) : getRootPath(program.opts())
      const { repoPath } = await resolveRepoPaths(p)
      const result = await repo.getHistoryStructured(repoPath)
      if (!result.success) { out(result, fmt); return }
      const commits = (result.commits || []).slice(0, parseInt(opts?.limit || '10', 10))
      if (fmt === 'table') {
        console.log('\n提交日志:')
        console.log('─'.repeat(80))
        for (const c of commits) {
          const sizeStr = c.totalSize > 1024 ? `${(c.totalSize / 1024).toFixed(1)}KB` : `${c.totalSize}B`
          console.log(`  版本: ${c.id}`)
          console.log(`  时间: ${new Date(c.timestamp).toLocaleString()}`)
          console.log(`  说明: ${c.message}`)
          console.log(`  文件: ${c.fileCount} 个, 共 ${sizeStr}`)
          console.log('─'.repeat(80))
        }
        console.log(`共 ${commits.length} 条记录`)
      } else {
        out({ success: true, commits }, fmt)
      }
    } catch (error) {
      out({ success: false, message: String(error) }, fmt)
      process.exit(1)
    }
  })

program.command('version [projectPath]')
  .description('查看当前版本信息')
  .action(async (projectPath?: string) => {
    const fmt = program.opts().format
    try {
      const p = projectPath ? path.resolve(projectPath) : getRootPath(program.opts())
      const { repoPath, workingCopyPath } = await resolveRepoPaths(p)
      const infoResult = await repo.getRepositoryInfo(repoPath)
      const link = await repo.readWorkingCopyLink(workingCopyPath)
      const historyResult = await repo.getHistoryStructured(repoPath)
      const latestCommit = historyResult.commits?.[0]
      out({
        success: true,
        currentVersion: link?.checkedOutVersion || '无',
        latestVersion: latestCommit?.id || '无',
        latestMessage: latestCommit?.message || '',
        latestTime: latestCommit?.timestamp || '',
        totalCommits: historyResult.commits?.length || 0,
        repoInfo: infoResult.info || '',
      }, fmt)
    } catch (error) {
      out({ success: false, message: String(error) }, fmt)
      process.exit(1)
    }
  })

program.command('list-repos')
  .description('列出所有仓库')
  .action(async () => {
    const fmt = program.opts().format
    try {
      const rootPath = getRootPath(program.opts())
      const reposDir = path.join(rootPath, 'repositories')
      if (!(await fs.pathExists(reposDir))) { out({ success: true, repos: [] }, fmt); return }
      const entries = await fs.readdir(reposDir, { withFileTypes: true })
      const repos = []
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const repoPath = path.join(reposDir, entry.name)
        const historyResult = await repo.getHistoryStructured(repoPath)
        const headPath = path.join(repoPath, 'HEAD.json')
        let currentVersion = null
        if (await fs.pathExists(headPath)) {
          const head = await fs.readJson(headPath)
          currentVersion = head.currentVersion
        }
        repos.push({
          name: entry.name,
          path: repoPath,
          currentVersion,
          totalCommits: historyResult.commits?.length || 0,
        })
      }
      out({ success: true, repos }, fmt)
    } catch (error) {
      out({ success: false, message: String(error) }, fmt)
      process.exit(1)
    }
  })

// ==================== 远程仓库管理 ====================

program.command('git-connect <projectPath> <remoteUrl>')
  .description('连接远程 Git 仓库')
  .option('-b, --branch <branch>', '分支名称', 'main')
  .option('-u, --username <username>', '用户名', 'anonymous')
  .option('-t, --token <token>', 'Personal Access Token')
  .action(async (projectPath: string, remoteUrl: string, opts: any) => {
    const fmt = program.opts().format
    try {
      projectPath = path.resolve(projectPath)
      const branch = opts.branch || 'main'
      const auth = { username: opts.username || 'anonymous', password: opts.token || '' }
      const onAuth = () => auth

      // Init git repo if needed
      const gitDir = path.join(projectPath, '.git')
      if (!(await fs.pathExists(gitDir))) {
        await git.init({ fs, dir: projectPath, defaultBranch: branch })
      }
      // Set remote
      const remotes = await git.listRemotes({ fs, dir: projectPath })
      if (remotes.find((r: any) => r.remote === 'origin')) {
        await git.deleteRemote({ fs, dir: projectPath, remote: 'origin' })
      }
      await git.addRemote({ fs, dir: projectPath, remote: 'origin', url: remoteUrl })

      // Fetch + checkout
      try {
        await git.fetch({ fs, http, dir: projectPath, remote: 'origin', ref: branch, onAuth, depth: 1 })
        try {
          await git.checkout({ fs, dir: projectPath, ref: branch, force: true })
        } catch {
          await git.branch({ fs, dir: projectPath, ref: branch, checkout: true })
          await git.checkout({ fs, dir: projectPath, ref: branch, force: true })
        }
      } catch (fetchError: any) {
        const msg = String(fetchError)
        if (!msg.includes('404') && !msg.includes('empty')) {
          out({ success: false, message: `连接失败: ${msg}` }, fmt)
          process.exit(1)
          return
        }
      }
      out({ success: true, message: `已连接 ${remoteUrl} (${branch})` }, fmt)
    } catch (error) {
      out({ success: false, message: String(error) }, fmt)
      process.exit(1)
    }
  })

program.command('git-pull <projectPath>')
  .description('从远程仓库拉取更新')
  .option('-u, --username <username>', '用户名', 'anonymous')
  .option('-t, --token <token>', 'Personal Access Token')
  .action(async (projectPath: string, opts: any) => {
    const fmt = program.opts().format
    try {
      projectPath = path.resolve(projectPath)
      const auth = { username: opts.username || 'anonymous', password: opts.token || '' }
      const onAuth = () => auth
      let branch = 'main'
      try { branch = (await git.currentBranch({ fs, dir: projectPath })) || 'main' } catch { /* use default */ }

      await git.fetch({ fs, http, dir: projectPath, remote: 'origin', ref: branch, onAuth })
      try {
        await git.merge({ fs, dir: projectPath, ours: branch, theirs: `origin/${branch}`, author: { name: 'DBVS', email: 'dbvs@local' } })
        out({ success: true, message: '拉取成功' }, fmt)
      } catch (mergeError: any) {
        const msg = String(mergeError)
        if (msg.includes('conflict') || msg.includes('MergeConflict')) {
          out({ success: false, message: '合并冲突，请手动解决后重试' }, fmt)
        } else {
          throw mergeError
        }
      }
    } catch (error) {
      out({ success: false, message: String(error) }, fmt)
      process.exit(1)
    }
  })

program.command('git-push <projectPath>')
  .description('推送到远程仓库')
  .requiredOption('-m, --message <msg>', '提交信息')
  .option('-u, --username <username>', '用户名', 'anonymous')
  .option('-t, --token <token>', 'Personal Access Token')
  .option('--author-name <name>', '作者名称', 'DBVS')
  .option('--author-email <email>', '作者邮箱', 'dbvs@local')
  .action(async (projectPath: string, opts: any) => {
    const fmt = program.opts().format
    try {
      projectPath = path.resolve(projectPath)
      const auth = { username: opts.username || 'anonymous', password: opts.token || '' }
      const onAuth = () => auth
      let branch = 'main'
      try { branch = (await git.currentBranch({ fs, dir: projectPath })) || 'main' } catch { /* use default */ }

      // Stage all
      const matrix = await git.statusMatrix({ fs, dir: projectPath })
      for (const [filepath, headStatus, workdirStatus] of matrix) {
        if (headStatus !== workdirStatus) {
          await git.add({ fs, dir: projectPath, filepath: filepath as string })
        }
      }

      // Commit if needed
      const stagedMatrix = await git.statusMatrix({ fs, dir: projectPath })
      const hasStaged = stagedMatrix.some((row: any[]) => row[1] !== 1 || row[2] !== 1)
      if (hasStaged) {
        await git.commit({
          fs, dir: projectPath, message: opts.message,
          author: { name: opts.authorName, email: opts.authorEmail },
        })
      }

      // Push
      await git.push({ fs, http, dir: projectPath, remote: 'origin', ref: branch, onAuth })
      out({ success: true, message: '推送成功' }, fmt)
    } catch (error) {
      out({ success: false, message: String(error) }, fmt)
      process.exit(1)
    }
  })

// ==================== 项目注册管理 ====================

program.command('unregister <projectPath>')
  .description('从项目列表移除（不删文件）')
  .option('--delete-files', '同时删除项目文件')
  .action(async (projectPath: string, opts: any) => {
    const fmt = program.opts().format
    try {
      const rootPath = getRootPath(program.opts())
      const normalized = path.resolve(projectPath)
      const registryPath = path.join(rootPath, 'projects.json')

      if (!(await fs.pathExists(registryPath))) {
        out({ success: false, message: '项目注册表不存在' }, fmt)
        process.exit(1)
        return
      }

      const registry = await fs.readJson(registryPath)
      let found = false
      for (let i = registry.length - 1; i >= 0; i--) {
        const entry = registry[i]
        const hadWC = entry.workingCopies.some((wc: any) => path.resolve(wc.path) === normalized)
        if (hadWC) found = true
        entry.workingCopies = entry.workingCopies.filter((wc: any) => path.resolve(wc.path) !== normalized)
        if (entry.workingCopies.length === 0) {
          registry.splice(i, 1)
        }
      }

      if (!found) {
        out({ success: false, message: '该路径未在项目列表中' }, fmt)
        return
      }

      await fs.writeJson(registryPath, registry, { spaces: 2 })

      if (opts.deleteFiles && (await fs.pathExists(normalized))) {
        await fs.remove(normalized)
        out({ success: true, message: `已移除并删除: ${normalized}` }, fmt)
      } else {
        out({ success: true, message: `已从列表移除: ${normalized}（文件保留）` }, fmt)
      }
    } catch (error) {
      out({ success: false, message: String(error) }, fmt)
      process.exit(1)
    }
  })

// ==================== 解析 ====================

program.parse(process.argv)
