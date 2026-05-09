import { BrowserWindow, ipcMain } from 'electron'
import * as path from 'path'
import * as fs from 'fs-extra'
import { DBHTRepository } from '../dbvs-repository'
import { getRootPath } from '../project-registry'
import { parseProject } from '../ast-analyzer'
import { buildGraph } from '../graph-builder'
import { saveGraph, loadGraph } from '../graph-store'
import { analyzeImpact } from '../impact-analyzer'
import { generateAICommitMessage } from '../commit-msg-generator'

let autoSnapshotTimer: ReturnType<typeof setInterval> | null = null

export function registerVcsHandlers(
  ipcMain: Electron.IpcMain,
  mainWindow: BrowserWindow,
  dbvsRepo: DBHTRepository,
): void {

// 检查是否是DBHT仓库
ipcMain.handle('dbgvs:is-repository', async (_, inputPath: string) => {
  if (await fs.pathExists(path.join(inputPath, 'config.json')) &&
      await fs.pathExists(path.join(inputPath, 'HEAD.json'))) {
    return true
  }
  if (await fs.pathExists(path.join(inputPath, '.dbvs-link.json'))) {
    return true
  }
  return fs.pathExists(path.join(inputPath, '.dbvs'))
})

// 初始化已有项目
ipcMain.handle('dbgvs:init-repository', async (_, repoPath: string) => {
  return await dbvsRepo.initExistingProject(repoPath)
})

// 获取工作副本状态
ipcMain.handle('dbgvs:get-status', async (_, repoPath: string, workingCopyPath: string) => {
  return await dbvsRepo.getStatus(repoPath, workingCopyPath)
})

// 获取文件树
ipcMain.handle('dbgvs:get-file-tree', async (_, workingCopyPath: string) => {
  return await dbvsRepo.getFileTree(workingCopyPath)
})

// 提交变更
ipcMain.handle('dbgvs:commit', async (_, repoPath: string, workingCopyPath: string, message: string, selectedFiles: string[], options?: { summary?: string; author?: string; sessionId?: string }) => {
  const result = await dbvsRepo.commit(repoPath, workingCopyPath, message, selectedFiles, options)
  if (result.success && result.version) {
    setImmediate(async () => {
      try {
        const rootPath = await getRootPath()
        if (!rootPath) return
        const projectName = path.basename(workingCopyPath)
        const parseResult = await parseProject(workingCopyPath, repoPath)
        if (parseResult.success && parseResult.files.length > 0) {
          const graph = buildGraph(parseResult, {
            projectName,
            commitId: result.version!,
            timestamp: new Date().toISOString(),
          })
          await saveGraph(rootPath, graph)
        }
      } catch {
        // 图谱构建失败不影响提交流程
      }
    })
  }
  return result
})

// 获取版本历史
ipcMain.handle('dbgvs:get-history', async (_, repoPath: string) => {
  return await dbvsRepo.getHistory(repoPath)
})

// 回滚到指定版本
ipcMain.handle('dbgvs:rollback', async (_, repoPath: string, workingCopyPath: string, version: string) => {
  return await dbvsRepo.rollback(repoPath, workingCopyPath, version)
})

// 文件级回滚
ipcMain.handle('dbgvs:rollback-file', async (_, repoPath: string, workingCopyPath: string, version: string, filePath: string) => {
  return await dbvsRepo.rollbackFile(repoPath, workingCopyPath, version, filePath)
})

// 撤销回滚
ipcMain.handle('dbgvs:undo-rollback', async (_, repoPath: string, workingCopyPath: string) => {
  return await dbvsRepo.undoRollback(repoPath, workingCopyPath)
})

// 按 AI 会话回滚
ipcMain.handle('dbgvs:rollback-ai', async (_, repoPath: string, workingCopyPath: string, sessionId: string) => {
  return await dbvsRepo.rollbackBySession(repoPath, workingCopyPath, sessionId)
})

// 还原工作副本文件到 HEAD 版本
ipcMain.handle('dbgvs:revert-files', async (_, repoPath: string, workingCopyPath: string, filePaths: string[]) => {
  return await dbvsRepo.revertFiles(repoPath, workingCopyPath, filePaths)
})

// 自动快照
ipcMain.handle('dbgvs:auto-snapshot-start', async (_, repoPath: string, workingCopyPath: string, intervalMinutes: number) => {
  if (autoSnapshotTimer) {
    clearInterval(autoSnapshotTimer)
  }
  const intervalMs = Math.max(1, intervalMinutes) * 60 * 1000

  const tick = async () => {
    try {
      const statusResult = await dbvsRepo.getStatus(repoPath, workingCopyPath)
      if (!statusResult.success || !statusResult.status) return

      const changed = statusResult.status.filter((s: string) =>
        s.startsWith('[新增]') || s.startsWith('[修改]') || s.startsWith('[删除]')
      )
      if (changed.length === 0) return

      const files = statusResult.status.map((l: string) => {
        const idx = l.indexOf('] ')
        return idx >= 0 ? l.slice(idx + 2).trim() : l.trim()
      })

      if (files.length > 0) {
        const result = await dbvsRepo.commit(repoPath, workingCopyPath, '[auto] 自动快照', files)
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('auto-snapshot:result', result)
        }
      }
    } catch (e) {
      console.error('[auto-snapshot] error:', e)
    }
  }

  autoSnapshotTimer = setInterval(tick, intervalMs)
  return { success: true, message: `自动快照已启动，间隔 ${intervalMinutes} 分钟` }
})

ipcMain.handle('dbgvs:auto-snapshot-stop', async () => {
  if (autoSnapshotTimer) {
    clearInterval(autoSnapshotTimer)
    autoSnapshotTimer = null
    return { success: true, message: '自动快照已停止' }
  }
  return { success: true, message: '自动快照未在运行' }
})

// 更新到最新版本
ipcMain.handle('dbgvs:update', async (_, repoPath: string, workingCopyPath: string) => {
  return await dbvsRepo.update(repoPath, workingCopyPath)
})

// 文件差异比对
ipcMain.handle('dbgvs:get-diff', async (_, repoPath: string, workingCopyPath: string, filePath: string, versionA?: string, versionB?: string) => {
  return await dbvsRepo.getDiff(repoPath, workingCopyPath, filePath, versionA, versionB)
})

// 全局 Diff 统计
ipcMain.handle('dbgvs:get-diff-summary', async (_, repoPath: string, workingCopyPath: string) => {
  return await dbvsRepo.getDiffSummary(repoPath, workingCopyPath)
})

// 获取文件的两个版本内容
ipcMain.handle('dbgvs:get-diff-content', async (_, repoPath: string, workingCopyPath: string, filePath: string, versionA?: string, versionB?: string) => {
  return await dbvsRepo.getDiffContent(repoPath, workingCopyPath, filePath, versionA, versionB)
})

// 变更影响分析
ipcMain.handle('dbgvs:diff-impact', async (_, repoPath: string, workingCopyPath: string, commitId: string) => {
  try {
    const rootPath = await getRootPath()
    if (!rootPath) return { success: false, message: '根仓库未配置' }

    const graph = await loadGraph(rootPath, commitId)
    if (!graph) return { success: false, message: '未找到图谱数据，请先构建图谱' }

    const diffResult = await dbvsRepo.getDiffSummary(repoPath, workingCopyPath)
    if (!diffResult.success || !diffResult.files) {
      return { success: false, message: diffResult.message || '无法获取变更信息' }
    }

    const report = analyzeImpact(graph, diffResult.files)
    return { success: true, report }
  } catch (error) {
    return { success: false, message: String(error) }
  }
})

// 获取仓库信息
// 获取仓库信息
ipcMain.handle('dbgvs:get-repository-info', async (_, repoPath: string) => {
  return await dbvsRepo.getRepositoryInfo(repoPath)
})

// 验证仓库完整性
ipcMain.handle('dbgvs:verify', async (_, repoPath: string) => {
  return await dbvsRepo.verify(repoPath)
})

// 获取结构化历史
ipcMain.handle('dbgvs:get-history-structured', async (_, repoPath: string) => {
  return await dbvsRepo.getHistoryStructured(repoPath)
})

// 获取单个提交详情
ipcMain.handle('dbgvs:get-commit-detail', async (_, repoPath: string, commitId: string) => {
  return await dbvsRepo.getCommitDetail(repoPath, commitId)
})

// 获取 Blob 内容
ipcMain.handle('dbgvs:get-blob-content', async (_, repoPath: string, hash: string) => {
  const content = await dbvsRepo.getBlobContent(repoPath, hash)
  return { success: content !== null, content }
})

// 解析路径
ipcMain.handle('dbgvs:resolve-paths', async (_, inputPath: string) => {
  return await dbvsRepo.resolvePaths(inputPath)
})

// 列出根仓库下所有集中仓库的详细信息
ipcMain.handle('dbgvs:list-repositories', async (_, rootPath: string) => {
  try {
    const reposDir = path.join(rootPath, 'repositories')
    if (!(await fs.pathExists(reposDir))) return { success: true, repos: [] }

    const dirs = await fs.readdir(reposDir)
    const repos: Array<{
      name: string
      path: string
      created: string
      currentVersion: string | null
      totalCommits: number
      totalSize: number
      blobCount: number
      workingCopies: string[]
    }> = []

    const { readProjectRegistry } = await import('../project-registry')
    const registry = await readProjectRegistry(rootPath)

    for (const dir of dirs) {
      const repoPath = path.join(reposDir, dir)
      const stat = await fs.stat(repoPath).catch(() => null)
      if (!stat?.isDirectory()) continue

      const configPath = path.join(repoPath, 'config.json')
      if (!(await fs.pathExists(configPath))) continue

      let created = ''
      let currentVersion: string | null = null
      let totalCommits = 0
      let totalSize = 0
      let blobCount = 0

      try {
        const config = await fs.readJson(configPath)
        created = config.created || stat.mtime.toISOString()
      } catch { created = stat.mtime.toISOString() }

      try {
        const head: any = await fs.readJson(path.join(repoPath, 'HEAD.json'))
        currentVersion = head.currentVersion
        totalCommits = head.totalCommits || 0
        totalSize = head.totalSize || 0
      } catch { /* ignore */ }

      try {
        const objectsDir = path.join(repoPath, 'objects')
        if (await fs.pathExists(objectsDir)) {
          const blobs = await fs.readdir(objectsDir)
          blobCount = blobs.filter(f => f.endsWith('.blob')).length
        }
      } catch { /* ignore */ }

      const entry = registry.find(e => path.resolve(e.repoPath) === path.resolve(repoPath))
      const workingCopies = entry ? entry.workingCopies.map(wc => wc.path) : []

      repos.push({ name: dir, path: repoPath, created, currentVersion, totalCommits, totalSize, blobCount, workingCopies })
    }

    return { success: true, repos }
  } catch (error) {
    return { success: true, repos: [] }
  }
})

// 生成 AI 提交信息
ipcMain.handle('dbgvs:generate-commit-message', async (_, repoPath: string, workingCopyPath: string) => {
  try {
    const diffResult = await dbvsRepo.getDiffSummary(repoPath, workingCopyPath)
    if (!diffResult.success || !diffResult.files || diffResult.files.length === 0) {
      return { success: true, message: '无变更文件', summary: '', suggestedLabels: [], source: 'heuristic' as const }
    }

    const changes = diffResult.files.map(f => ({
      path: f.path,
      status: f.status === 'A' ? 'added' : f.status === 'D' ? 'deleted' : 'modified',
      added: f.added,
      removed: f.removed,
    }))

    const result = await generateAICommitMessage(changes, 'heuristic')
    return { success: true, ...result }
  } catch (error) {
    return { success: false, message: String(error), summary: '', suggestedLabels: [], source: 'heuristic' as const }
  }
})

} // end registerVcsHandlers
