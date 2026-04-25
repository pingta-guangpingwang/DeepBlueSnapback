import * as fs from 'fs-extra'
import * as path from 'path'
import * as crypto from 'crypto'
import DiffMatchPatch from 'diff-match-patch'

const dmp = new DiffMatchPatch.diff_match_patch()

/** 忽略的目录/文件模式（内置） */
const IGNORE_PATTERNS = ['.dbvs', '.dbvs-link.json', 'node_modules', '.git', '.DS_Store', 'Thumbs.db', 'DBVS-GUIDE.md']

function shouldIgnoreBuiltin(name: string): boolean {
  return IGNORE_PATTERNS.includes(name) || name.startsWith('.')
}

/** 从 .dbvsignore 文件加载自定义忽略规则 */
async function loadCustomIgnorePatterns(rootDir: string): Promise<string[]> {
  try {
    const ignorePath = path.join(rootDir, '.dbvsignore')
    if (await fs.pathExists(ignorePath)) {
      const content = await fs.readFile(ignorePath, 'utf-8')
      return content.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))
    }
  } catch { /* ignore */ }
  return []
}

/** 匹配 glob 模式（支持 * 通配符） */
function matchPattern(pattern: string, testStr: string): boolean {
  if (pattern === testStr) return true
  // Convert simple glob to regex: * → .*
  const regexStr = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
  try {
    return new RegExp(`^${regexStr}$`).test(testStr)
  } catch {
    return false
  }
}

/** 判断是否应该忽略（综合内置 + 自定义规则） */
function shouldIgnoreWithCustom(name: string, relPath: string, customPatterns: string[]): boolean {
  if (shouldIgnoreBuiltin(name)) return true
  for (const pattern of customPatterns) {
    if (matchPattern(pattern, name) || matchPattern(pattern, relPath)) return true
    // 也匹配路径前缀，如 dist/ 应匹配 dist 下所有内容
    if (pattern.endsWith('/') && relPath.startsWith(pattern)) return true
    if (!pattern.includes('/') && relPath.includes('/')) {
      const parts = relPath.split('/')
      for (const part of parts) {
        if (matchPattern(pattern, part)) return true
      }
    }
  }
  return false
}

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.svg',
  '.zip', '.tar', '.gz', '.rar', '.7z',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.exe', '.dll', '.so', '.dylib',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.mp3', '.mp4', '.avi', '.mov', '.wav', '.flac',
  '.sqlite', '.db', '.bin', '.dat'
])

function isTextFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase()
  return !BINARY_EXTENSIONS.has(ext)
}

function generateCommitId(): string {
  const d = new Date()
  const pad = (n: number, len: number = 2) => n.toString().padStart(len, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}${pad(d.getMilliseconds(), 3)}`
}

function hashContent(content: string | Buffer): string {
  return crypto.createHash('sha256').update(content).digest('hex')
}

async function scanFiles(dir: string, baseDir: string = dir, customPatterns?: string[]): Promise<string[]> {
  // Load custom ignore patterns once at the root level
  if (!customPatterns) {
    customPatterns = await loadCustomIgnorePatterns(baseDir)
  }
  const results: string[] = []
  if (!(await fs.pathExists(dir))) return results
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/')
    if (shouldIgnoreWithCustom(entry.name, relPath, customPatterns)) continue
    if (entry.isDirectory()) {
      const subFiles = await scanFiles(fullPath, baseDir, customPatterns)
      results.push(...subFiles)
    } else {
      results.push(relPath)
    }
  }
  return results
}

export interface CommitFileEntry {
  path: string
  hash: string
  size: number
}

interface CommitData {
  id: string
  message: string
  summary?: string
  author?: string
  sessionId?: string
  changedFiles?: {
    added: string[]
    modified: string[]
    deleted: string[]
  }
  timestamp: string
  files: CommitFileEntry[]
  parentVersion: string | null
  totalSize: number
}

interface HEADData {
  currentVersion: string | null
  lastCommitTime: string | null
  totalCommits: number
  totalSize: number
  lastRollbackSnapshot?: string | null
}

/** 工作副本链接文件格式 */
interface WorkingCopyLink {
  repoPath: string
  checkedOutVersion: string | null
}

export class DBVSRepository {

  // ==================== 路径解析 ====================

  /**
   * 从工作副本目录读取链接文件，获取对应的仓库路径
   */
  async readWorkingCopyLink(workingCopyPath: string): Promise<WorkingCopyLink | null> {
    const linkPath = path.join(workingCopyPath, '.dbvs-link.json')
    if (!(await fs.pathExists(linkPath))) return null
    try {
      return await fs.readJson(linkPath)
    } catch {
      return null
    }
  }

  /**
   * 在工作副本目录创建链接文件
   */
  async initWorkingCopy(repoPath: string, workingCopyPath: string, version?: string): Promise<{ success: boolean; message: string }> {
    try {
      await fs.ensureDir(workingCopyPath)
      const linkPath = path.join(workingCopyPath, '.dbvs-link.json')
      const link: WorkingCopyLink = {
        repoPath: path.resolve(repoPath),
        checkedOutVersion: version || null
      }
      await fs.writeJson(linkPath, link, { spaces: 2 })
      return { success: true, message: '工作副本已初始化' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  /**
   * 给定任意路径，尝试解析出仓库路径和工作副本路径
   * 可能是直接传了 repoPath，也可能是传了工作副本路径
   */
  async resolvePaths(inputPath: string): Promise<{ repoPath: string; workingCopyPath: string } | null> {
    // 检查是否本身就是仓库路径（有 config.json + HEAD.json）
    if (await fs.pathExists(path.join(inputPath, 'config.json')) &&
        await fs.pathExists(path.join(inputPath, 'HEAD.json'))) {
      return { repoPath: inputPath, workingCopyPath: inputPath }
    }
    // 检查是否是工作副本（有 .dbvs-link.json）
    const link = await this.readWorkingCopyLink(inputPath)
    if (link) {
      return { repoPath: link.repoPath, workingCopyPath: inputPath }
    }
    return null
  }

  // ==================== 仓库初始化 ====================

  /**
   * 创建仓库（集中存储版本数据）
   * @param repoPath 仓库目录路径（如 <root>/repositories/<projectName>）
   * @param projectName 项目名称
   */
  async createRepository(repoPath: string, projectName: string): Promise<{ success: boolean; message: string }> {
    try {
      await fs.ensureDir(repoPath)
      if (await fs.pathExists(path.join(repoPath, 'config.json'))) {
        return { success: false, message: '该目录已经是 DBVS 仓库' }
      }
      await fs.writeJson(path.join(repoPath, 'config.json'), {
        name: projectName,
        version: '3.0.0',
        created: new Date().toISOString(),
        ignorePatterns: IGNORE_PATTERNS
      }, { spaces: 2 })
      await fs.ensureDir(path.join(repoPath, 'objects'))
      await fs.ensureDir(path.join(repoPath, 'commits'))
      await fs.writeJson(path.join(repoPath, 'HEAD.json'), {
        currentVersion: null,
        lastCommitTime: null,
        totalCommits: 0,
        totalSize: 0
      }, { spaces: 2 })
      return { success: true, message: `仓库创建成功: ${repoPath}` }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  async initExistingProject(repoPath: string): Promise<{ success: boolean; message: string }> {
    return this.createRepository(repoPath, path.basename(repoPath))
  }

  // ==================== 状态检测 ====================

  /**
   * 获取工作副本相对于仓库的状态
   * @param repoPath 仓库路径
   * @param workingCopyPath 工作副本路径
   */
  async getStatus(repoPath: string, workingCopyPath: string): Promise<{ success: boolean; status: string[]; message?: string }> {
    try {
      if (!(await fs.pathExists(path.join(repoPath, 'HEAD.json')))) {
        return { success: false, status: [], message: '不是 DBVS 仓库' }
      }

      // 从仓库读取 HEAD 获取上一版本文件列表
      const headPath = path.join(repoPath, 'HEAD.json')
      let headFiles: Map<string, CommitFileEntry> = new Map()

      if (await fs.pathExists(headPath)) {
        const head: HEADData = await fs.readJson(headPath)
        if (head.currentVersion) {
          const commitPath = path.join(repoPath, 'commits', `${head.currentVersion}.json`)
          if (await fs.pathExists(commitPath)) {
            const commit: CommitData = await fs.readJson(commitPath)
            for (const f of commit.files) {
              headFiles.set(f.path.replace(/\\/g, '/'), f)
            }
          }
        }
      }

      // 扫描工作副本目录
      const currentFiles = await scanFiles(workingCopyPath)
      const currentFileSet = new Set(currentFiles.map(f => f.replace(/\\/g, '/')))

      const status: string[] = []

      for (const relPath of currentFiles) {
        const normalizedPath = relPath.replace(/\\/g, '/')
        const fullPath = path.join(workingCopyPath, relPath)
        const content = await fs.readFile(fullPath)
        const currentHash = hashContent(content)
        const headEntry = headFiles.get(normalizedPath)

        if (!headEntry) {
          status.push(`A ${normalizedPath}`)
        } else if (headEntry.hash !== currentHash) {
          status.push(`M ${normalizedPath}`)
        }
      }

      for (const [headPath] of headFiles) {
        if (!currentFileSet.has(headPath)) {
          status.push(`D ${headPath}`)
        }
      }

      return { success: true, status }
    } catch (error) {
      return { success: false, status: [], message: String(error) }
    }
  }

  // ==================== 文件树 ====================

  async getFileTree(workingCopyPath: string): Promise<{ success: boolean; files: Array<{ name: string; path: string }>; message?: string }> {
    try {
      const files = await scanFiles(workingCopyPath)
      return {
        success: true,
        files: files.map(f => ({ name: path.basename(f), path: f.replace(/\\/g, '/') }))
      }
    } catch (error) {
      return { success: false, files: [], message: String(error) }
    }
  }

  // ==================== 提交 ====================

  /**
   * 提交变更：从工作副本读文件，blob 存到仓库
   * @param repoPath 仓库路径
   * @param workingCopyPath 工作副本路径
   */
  async commit(repoPath: string, workingCopyPath: string, message: string, selectedFiles: string[], options?: { summary?: string; author?: string; sessionId?: string }): Promise<{ success: boolean; message: string; version?: string }> {
    try {
      const objectsPath = path.join(repoPath, 'objects')
      const commitsPath = path.join(repoPath, 'commits')
      const headPath = path.join(repoPath, 'HEAD.json')

      await fs.ensureDir(objectsPath)
      await fs.ensureDir(commitsPath)

      let head: HEADData = { currentVersion: null, lastCommitTime: null, totalCommits: 0, totalSize: 0 }
      if (await fs.pathExists(headPath)) {
        head = await fs.readJson(headPath)
      }

      const headFilesMap = new Map<string, CommitFileEntry>()

      if (head.currentVersion) {
        const prevCommit: CommitData = await fs.readJson(path.join(commitsPath, `${head.currentVersion}.json`))
        for (const f of prevCommit.files) {
          headFilesMap.set(f.path.replace(/\\/g, '/'), f)
        }
      }

      for (const relPath of selectedFiles) {
        const normalizedPath = relPath.replace(/\\/g, '/')
        const fullPath = path.join(workingCopyPath, relPath)

        if (!(await fs.pathExists(fullPath))) {
          headFilesMap.delete(normalizedPath)
          continue
        }

        const content = await fs.readFile(fullPath)
        const fileHash = hashContent(content)
        const blobPath = path.join(objectsPath, `${fileHash}.blob`)

        if (!(await fs.pathExists(blobPath))) {
          await fs.writeFile(blobPath, content)
        }

        headFilesMap.set(normalizedPath, { path: normalizedPath, hash: fileHash, size: content.length })
      }

      const finalFiles = Array.from(headFilesMap.values())
      const totalSize = finalFiles.reduce((sum, f) => sum + f.size, 0)

      const commitId = generateCommitId()

      // 计算变更文件统计
      const prevFilesMap = new Map<string, string>()
      if (head.currentVersion) {
        try {
          const prevCommit: CommitData = await fs.readJson(path.join(commitsPath, `${head.currentVersion}.json`))
          for (const f of prevCommit.files) prevFilesMap.set(f.path, f.hash)
        } catch { /* ignore */ }
      }
      const addedFiles: string[] = []
      const modifiedFiles: string[] = []
      const deletedFiles: string[] = []
      for (const [p] of prevFilesMap) {
        if (!headFilesMap.has(p)) deletedFiles.push(p)
      }
      for (const [p, entry] of headFilesMap) {
        if (!prevFilesMap.has(p)) addedFiles.push(p)
        else if (prevFilesMap.get(p) !== (entry as CommitFileEntry).hash) modifiedFiles.push(p)
      }

      const commitData: CommitData = {
        id: commitId, message, timestamp: new Date().toISOString(),
        files: finalFiles, parentVersion: head.currentVersion, totalSize,
        ...(options?.summary ? { summary: options.summary } : {}),
        ...(options?.author ? { author: options.author } : {}),
        ...(options?.sessionId ? { sessionId: options.sessionId } : {}),
        changedFiles: { added: addedFiles, modified: modifiedFiles, deleted: deletedFiles },
      }

      await fs.writeJson(path.join(commitsPath, `${commitId}.json`), commitData, { spaces: 2 })

      const newHead: HEADData = {
        currentVersion: commitId, lastCommitTime: commitData.timestamp,
        totalCommits: head.totalCommits + 1, totalSize
      }
      await fs.writeJson(headPath, newHead, { spaces: 2 })

      // 更新工作副本 link 文件的版本
      await this.initWorkingCopy(repoPath, workingCopyPath, commitId)

      return { success: true, message: `提交成功，版本 ${commitId}`, version: commitId }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  // ==================== 历史记录 ====================

  async getHistory(repoPath: string): Promise<{ success: boolean; history: string; message?: string }> {
    try {
      const commitsPath = path.join(repoPath, 'commits')
      if (!(await fs.pathExists(commitsPath))) {
        return { success: true, history: '暂无提交记录' }
      }
      const files = await fs.readdir(commitsPath)
      const commits: CommitData[] = []
      for (const file of files) {
        if (file.endsWith('.json')) {
          commits.push(await fs.readJson(path.join(commitsPath, file)))
        }
      }
      commits.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      const history = commits.map(c => {
        const sizeStr = c.totalSize > 1024 ? `${(c.totalSize / 1024).toFixed(1)}KB` : `${c.totalSize}B`
        return `版本: ${c.id}\n时间: ${c.timestamp}\n说明: ${c.message}\n文件: ${c.files.length} 个, 共 ${sizeStr}\n---`
      }).join('\n')
      return { success: true, history }
    } catch (error) {
      return { success: false, history: '', message: String(error) }
    }
  }

  // ==================== 结构化历史 ====================

  async getHistoryStructured(repoPath: string): Promise<{ success: boolean; commits: Array<{ id: string; message: string; timestamp: string; fileCount: number; totalSize: number; summary?: string; author?: string; sessionId?: string; changedFiles?: { added: string[]; modified: string[]; deleted: string[] } }>; message?: string }> {
    try {
      const commitsPath = path.join(repoPath, 'commits')
      if (!(await fs.pathExists(commitsPath))) {
        return { success: true, commits: [] }
      }
      const files = await fs.readdir(commitsPath)
      const commits: CommitData[] = []
      for (const file of files) {
        if (file.endsWith('.json')) {
          commits.push(await fs.readJson(path.join(commitsPath, file)))
        }
      }
      commits.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      return {
        success: true,
        commits: commits.map(c => ({
          id: c.id, message: c.message, timestamp: c.timestamp,
          fileCount: c.files.length, totalSize: c.totalSize,
          ...(c.summary ? { summary: c.summary } : {}),
          ...(c.author ? { author: c.author } : {}),
          ...(c.sessionId ? { sessionId: c.sessionId } : {}),
          ...(c.changedFiles ? { changedFiles: c.changedFiles } : {}),
        }))
      }
    } catch (error) {
      return { success: false, commits: [], message: String(error) }
    }
  }

  // ==================== 获取 Commit 详情（给 History 用）====================

  async getCommitDetail(repoPath: string, commitId: string): Promise<CommitData | null> {
    try {
      const commitPath = path.join(repoPath, 'commits', `${commitId}.json`)
      if (!(await fs.pathExists(commitPath))) return null
      return await fs.readJson(commitPath)
    } catch {
      return null
    }
  }

  // ==================== 获取 Blob 内容（给 diff 用）====================

  async getBlobContent(repoPath: string, hash: string): Promise<string | null> {
    try {
      const blobPath = path.join(repoPath, 'objects', `${hash}.blob`)
      if (!(await fs.pathExists(blobPath))) return null
      return await fs.readFile(blobPath, 'utf-8')
    } catch {
      return null
    }
  }

  // ==================== 回滚 ====================

  /**
   * 回滚工作副本到指定版本（自动创建回滚前快照）
   * @param repoPath 仓库路径
   * @param workingCopyPath 工作副本路径
   */
  async rollback(repoPath: string, workingCopyPath: string, version: string): Promise<{ success: boolean; message: string }> {
    try {
      const commitPath = path.join(repoPath, 'commits', `${version}.json`)
      if (!(await fs.pathExists(commitPath))) {
        return { success: false, message: `版本 ${version} 不存在` }
      }

      // 回滚前自动创建快照（用于 undo-rollback）
      const headPath = path.join(repoPath, 'HEAD.json')
      let head: HEADData = { currentVersion: null, lastCommitTime: null, totalCommits: 0, totalSize: 0 }
      if (await fs.pathExists(headPath)) {
        head = await fs.readJson(headPath)
      }

      if (head.currentVersion && head.currentVersion !== version) {
        // 自动提交当前工作副本作为快照
        const currentFiles = await scanFiles(workingCopyPath, workingCopyPath)
        if (currentFiles.length > 0) {
          const snapshotResult = await this.commit(repoPath, workingCopyPath, '[auto] 回滚前自动快照', currentFiles)
          if (snapshotResult.success && snapshotResult.version) {
            // 更新 HEAD 记录快照版本
            head = await fs.readJson(headPath)
            head.lastRollbackSnapshot = snapshotResult.version
            await fs.writeJson(headPath, head, { spaces: 2 })
          }
        }
      }

      const targetCommit: CommitData = await fs.readJson(commitPath)
      const targetFiles = new Map<string, CommitFileEntry>()
      for (const f of targetCommit.files) {
        targetFiles.set(f.path, f)
      }

      // 从仓库 blob 恢复文件到工作副本
      for (const fileEntry of targetCommit.files) {
        const fullPath = path.join(workingCopyPath, fileEntry.path)
        const blobPath = path.join(repoPath, 'objects', `${fileEntry.hash}.blob`)
        await fs.ensureDir(path.dirname(fullPath))
        if (await fs.pathExists(blobPath)) {
          await fs.writeFile(fullPath, await fs.readFile(blobPath))
        } else {
          return { success: false, message: `文件快照丢失: ${fileEntry.path}` }
        }
      }

      // 删除不在目标版本中的文件
      const currentFiles = await scanFiles(workingCopyPath)
      for (const relPath of currentFiles) {
        const normalizedPath = relPath.replace(/\\/g, '/')
        if (!targetFiles.has(normalizedPath)) {
          await fs.remove(path.join(workingCopyPath, relPath))
        }
      }

      await this.cleanEmptyDirs(workingCopyPath)

      // 更新工作副本 link
      await this.initWorkingCopy(repoPath, workingCopyPath, version)

      return { success: true, message: `已回滚到版本 ${version}` }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  /**
   * 回滚单个文件到指定版本
   */
  async rollbackFile(repoPath: string, workingCopyPath: string, version: string, filePath: string): Promise<{ success: boolean; message: string }> {
    try {
      const commitPath = path.join(repoPath, 'commits', `${version}.json`)
      if (!(await fs.pathExists(commitPath))) {
        return { success: false, message: `版本 ${version} 不存在` }
      }

      const commit: CommitData = await fs.readJson(commitPath)
      const normalizedFilePath = filePath.replace(/\\/g, '/')
      const fileEntry = commit.files.find(f => f.path === normalizedFilePath)
      if (!fileEntry) {
        return { success: false, message: `版本 ${version} 中不存在文件 ${filePath}` }
      }

      const blobPath = path.join(repoPath, 'objects', `${fileEntry.hash}.blob`)
      if (!(await fs.pathExists(blobPath))) {
        return { success: false, message: `文件 blob 丢失: ${fileEntry.hash}` }
      }

      const fullPath = path.join(workingCopyPath, normalizedFilePath)
      await fs.ensureDir(path.dirname(fullPath))
      await fs.writeFile(fullPath, await fs.readFile(blobPath))

      return { success: true, message: `已恢复文件 ${filePath} 到版本 ${version}` }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  /**
   * 将工作副本中的指定文件还原到 HEAD（最新提交）版本
   * - 已修改的文件：从 blob 恢复
   * - 新增的文件：删除
   * - 已删除的文件：从 blob 恢复
   */
  async revertFiles(repoPath: string, workingCopyPath: string, filePaths: string[]): Promise<{ success: boolean; message: string; reverted: string[] }> {
    try {
      const headPath = path.join(repoPath, 'HEAD.json')
      if (!(await fs.pathExists(headPath))) {
        return { success: false, message: '没有提交记录，无法还原', reverted: [] }
      }
      const head: HEADData = await fs.readJson(headPath)
      if (!head.currentVersion) {
        return { success: false, message: '没有提交记录，无法还原', reverted: [] }
      }

      const headCommit: CommitData = await fs.readJson(path.join(repoPath, 'commits', `${head.currentVersion}.json`))
      const headFilesMap = new Map<string, CommitFileEntry>()
      for (const f of headCommit.files) headFilesMap.set(f.path, f)

      const reverted: string[] = []

      for (const filePath of filePaths) {
        const normalizedPath = filePath.replace(/\\/g, '/')
        const fullPath = path.join(workingCopyPath, normalizedPath)
        const inHead = headFilesMap.get(normalizedPath)

        if (inHead) {
          // 文件在 HEAD 中存在：从 blob 恢复（覆盖修改 or 恢复删除）
          const blobPath = path.join(repoPath, 'objects', `${inHead.hash}.blob`)
          if (await fs.pathExists(blobPath)) {
            await fs.ensureDir(path.dirname(fullPath))
            await fs.writeFile(fullPath, await fs.readFile(blobPath))
            reverted.push(normalizedPath)
          }
        } else {
          // 文件不在 HEAD 中：是新增文件，删除它
          if (await fs.pathExists(fullPath)) {
            await fs.remove(fullPath)
            reverted.push(normalizedPath)
          }
        }
      }

      // 清理空目录
      await this.cleanEmptyDirs(workingCopyPath)

      return { success: true, message: `已还原 ${reverted.length} 个文件`, reverted }
    } catch (error) {
      return { success: false, message: String(error), reverted: [] }
    }
  }

  /**
   * 撤销上次回滚（恢复到回滚前自动快照版本）
   */
  async undoRollback(repoPath: string, workingCopyPath: string): Promise<{ success: boolean; message: string }> {
    try {
      const headPath = path.join(repoPath, 'HEAD.json')
      if (!(await fs.pathExists(headPath))) {
        return { success: false, message: '没有 HEAD 记录，无法撤销回滚' }
      }

      const head: HEADData = await fs.readJson(headPath)
      if (!head.lastRollbackSnapshot) {
        return { success: false, message: '没有可撤销的回滚记录' }
      }

      const snapshotVersion = head.lastRollbackSnapshot
      // 清除快照标记，防止重复撤销
      head.lastRollbackSnapshot = null
      await fs.writeJson(headPath, head, { spaces: 2 })

      // 回滚到快照版本（使用内部恢复逻辑，避免再次创建快照）
      const commitPath = path.join(repoPath, 'commits', `${snapshotVersion}.json`)
      if (!(await fs.pathExists(commitPath))) {
        return { success: false, message: `快照版本 ${snapshotVersion} 不存在` }
      }

      const targetCommit: CommitData = await fs.readJson(commitPath)
      const targetFiles = new Map<string, CommitFileEntry>()
      for (const f of targetCommit.files) {
        targetFiles.set(f.path, f)
      }

      for (const fileEntry of targetCommit.files) {
        const fullPath = path.join(workingCopyPath, fileEntry.path)
        const blobPath = path.join(repoPath, 'objects', `${fileEntry.hash}.blob`)
        await fs.ensureDir(path.dirname(fullPath))
        if (await fs.pathExists(blobPath)) {
          await fs.writeFile(fullPath, await fs.readFile(blobPath))
        }
      }

      const currentFiles = await scanFiles(workingCopyPath)
      for (const relPath of currentFiles) {
        const normalizedPath = relPath.replace(/\\/g, '/')
        if (!targetFiles.has(normalizedPath)) {
          await fs.remove(path.join(workingCopyPath, relPath))
        }
      }

      await this.cleanEmptyDirs(workingCopyPath)
      await this.initWorkingCopy(repoPath, workingCopyPath, snapshotVersion)

      return { success: true, message: `已撤销回滚，恢复到快照版本 ${snapshotVersion}` }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  /**
   * 按 AI 会话 ID 回滚：找到指定 sessionId 的所有提交，回滚到该会话最早提交之前的版本
   */
  async rollbackBySession(repoPath: string, workingCopyPath: string, sessionId: string): Promise<{ success: boolean; message: string; targetVersion?: string }> {
    try {
      const commitsPath = path.join(repoPath, 'commits')
      if (!(await fs.pathExists(commitsPath))) {
        return { success: false, message: '没有提交记录' }
      }

      const files = await fs.readdir(commitsPath)
      const sessionCommits: CommitData[] = []

      for (const file of files) {
        if (file.endsWith('.json')) {
          const commit: CommitData = await fs.readJson(path.join(commitsPath, file))
          if (commit.sessionId === sessionId) {
            sessionCommits.push(commit)
          }
        }
      }

      if (sessionCommits.length === 0) {
        return { success: false, message: `没有找到会话 ${sessionId} 的提交` }
      }

      // 按时间排序，找到最早的提交
      sessionCommits.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      const earliestCommit = sessionCommits[0]

      // 回滚到该提交的父版本（即会话开始之前的状态）
      if (!earliestCommit.parentVersion) {
        return { success: false, message: `会话 ${sessionId} 的最早提交已经是初始版本，无法回滚到更早的状态` }
      }

      const result = await this.rollback(repoPath, workingCopyPath, earliestCommit.parentVersion)
      return { ...result, targetVersion: earliestCommit.parentVersion }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  // ==================== 更新到最新版本 ====================

  async update(repoPath: string, workingCopyPath: string): Promise<{ success: boolean; message: string }> {
    try {
      const headPath = path.join(repoPath, 'HEAD.json')
      if (!(await fs.pathExists(headPath))) {
        return { success: false, message: '没有提交记录，无法更新' }
      }
      const head: HEADData = await fs.readJson(headPath)
      if (!head.currentVersion) {
        return { success: false, message: '没有提交记录，无法更新' }
      }
      return this.rollback(repoPath, workingCopyPath, head.currentVersion)
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  // ==================== Checkout（创建工作副本）====================

  /**
   * 从仓库 checkout 到指定目录
   * @param repoPath 仓库路径
   * @param targetPath 目标目录
   */
  async checkout(repoPath: string, targetPath: string): Promise<{ success: boolean; message: string }> {
    try {
      const headPath = path.join(repoPath, 'HEAD.json')
      if (!(await fs.pathExists(headPath))) {
        return { success: false, message: '仓库没有提交记录' }
      }

      const head: HEADData = await fs.readJson(headPath)
      await fs.ensureDir(targetPath)

      if (head.currentVersion) {
        // 恢复最新版本文件
        await this.rollback(repoPath, targetPath, head.currentVersion)
      }

      // 写入 link 文件
      await this.initWorkingCopy(repoPath, targetPath, head.currentVersion ?? undefined)

      return { success: true, message: `Checkout 成功: ${targetPath}` }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  // ==================== 差异对比 ====================

  async getDiff(repoPath: string, workingCopyPath: string, filePath: string, versionA?: string, versionB?: string): Promise<{ success: boolean; diff: string; message?: string }> {
    try {
      if (!isTextFile(filePath)) {
        return { success: true, diff: `[二进制文件] ${path.basename(filePath)}\n（不支持文本差异对比）`, message: 'binary' }
      }

      const objectsPath = path.join(repoPath, 'objects')
      const commitsPath = path.join(repoPath, 'commits')
      const headPath = path.join(repoPath, 'HEAD.json')

      let oldContent = ''
      let newContent = ''

      const resolveVersionContent = async (version: string | undefined, fallbackToHead: boolean): Promise<string> => {
        let versionToUse = version
        if (!versionToUse && fallbackToHead && (await fs.pathExists(headPath))) {
          const head: HEADData = await fs.readJson(headPath)
          versionToUse = head.currentVersion || undefined
        }
        if (!versionToUse) return ''
        const commitPath = path.join(commitsPath, `${versionToUse}.json`)
        if (!(await fs.pathExists(commitPath))) return ''
        const commit: CommitData = await fs.readJson(commitPath)
        const normalizedFilePath = filePath.replace(/\\/g, '/')
        const fileEntry = commit.files.find(f => f.path === normalizedFilePath)
        if (!fileEntry) return ''
        const blobPath = path.join(objectsPath, `${fileEntry.hash}.blob`)
        if (!(await fs.pathExists(blobPath))) return ''
        return await fs.readFile(blobPath, 'utf-8')
      }

      oldContent = await resolveVersionContent(versionA, true)

      if (versionB) {
        newContent = await resolveVersionContent(versionB, false)
      } else {
        const fullPath = path.join(workingCopyPath, filePath)
        if (await fs.pathExists(fullPath)) {
          newContent = await fs.readFile(fullPath, 'utf-8')
        }
      }

      const diffs = dmp.diff_main(oldContent, newContent)
      dmp.diff_cleanupSemantic(diffs)
      const diffLines: string[] = []
      for (const [op, text] of diffs) {
        for (const line of text.split('\n')) {
          if (op === DiffMatchPatch.DIFF_INSERT) diffLines.push(`+ ${line}`)
          else if (op === DiffMatchPatch.DIFF_DELETE) diffLines.push(`- ${line}`)
          else diffLines.push(`  ${line}`)
        }
      }
      return { success: true, diff: diffLines.join('\n') }
    } catch (error) {
      return { success: false, diff: '', message: String(error) }
    }
  }

  // ==================== 全局 Diff 统计 ====================

  async getDiffSummary(repoPath: string, workingCopyPath: string): Promise<{
    success: boolean
    files?: Array<{ path: string; status: string; added: number; removed: number }>
    totalAdded?: number
    totalRemoved?: number
    message?: string
  }> {
    try {
      const headPath = path.join(repoPath, 'HEAD.json')
      if (!(await fs.pathExists(headPath))) {
        return { success: true, files: [], totalAdded: 0, totalRemoved: 0 }
      }
      const head: HEADData = await fs.readJson(headPath)
      if (!head.currentVersion) {
        return { success: true, files: [], totalAdded: 0, totalRemoved: 0 }
      }

      const prevCommit: CommitData = await fs.readJson(path.join(repoPath, 'commits', `${head.currentVersion}.json`))
      const prevFilesMap = new Map<string, { hash: string; size: number }>()
      for (const f of prevCommit.files) prevFilesMap.set(f.path, { hash: f.hash, size: f.size })

      const customPatterns = await loadCustomIgnorePatterns(workingCopyPath)
      const currentFiles = await scanFiles(workingCopyPath, workingCopyPath, customPatterns)
      const currentFilesMap = new Map<string, string>()
      const objectsPath = path.join(repoPath, 'objects')

      for (const relPath of currentFiles) {
        const normalizedPath = relPath.replace(/\\/g, '/')
        const fullPath = path.join(workingCopyPath, relPath)
        const content = await fs.readFile(fullPath)
        const hash = hashContent(content)
        currentFilesMap.set(normalizedPath, hash)
      }

      const files: Array<{ path: string; status: string; added: number; removed: number }> = []
      let totalAdded = 0
      let totalRemoved = 0

      // 所有涉及文件
      const allPaths = new Set([...prevFilesMap.keys(), ...currentFilesMap.keys()])

      for (const filePath of allPaths) {
        const inPrev = prevFilesMap.get(filePath)
        const inCurr = currentFilesMap.get(filePath)
        let status: string
        let added = 0
        let removed = 0

        if (!inPrev && inCurr) {
          status = 'added'
        } else if (inPrev && !inCurr) {
          status = 'deleted'
        } else if (inPrev && inCurr && inPrev.hash !== inCurr) {
          status = 'modified'
          // 计算行级差异
          const oldBlob = path.join(objectsPath, `${inPrev.hash}.blob`)
          const workingFile = path.join(workingCopyPath, filePath.replace(/\//g, path.sep))

          if (isTextFile(filePath)) {
            try {
              const oldContent = (await fs.pathExists(oldBlob)) ? await fs.readFile(oldBlob, 'utf-8') : ''
              const newContent = (await fs.pathExists(workingFile)) ? await fs.readFile(workingFile, 'utf-8') : ''
              const diffs = dmp.diff_main(oldContent, newContent)
              for (const d of diffs) {
                if (d[0] === 1) added += d[1].split('\n').length - 1
                else if (d[0] === -1) removed += d[1].split('\n').length - 1
              }
            } catch { /* binary or read error */ }
          }
        } else {
          continue // unchanged
        }

        files.push({ path: filePath, status, added, removed })
        totalAdded += added
        totalRemoved += removed
      }

      return { success: true, files, totalAdded, totalRemoved }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  // ==================== 获取 Diff 原始内容 ====================

  async getDiffContent(repoPath: string, workingCopyPath: string, filePath: string, versionA?: string, versionB?: string): Promise<{ success: boolean; oldContent?: string; newContent?: string; message?: string }> {
    try {
      if (!isTextFile(filePath)) {
        return { success: true, oldContent: `[二进制文件: ${path.basename(filePath)}]`, newContent: `[二进制文件: ${path.basename(filePath)}]`, message: 'plaintext' }
      }

      const objectsPath = path.join(repoPath, 'objects')
      const commitsPath = path.join(repoPath, 'commits')
      const headPath = path.join(repoPath, 'HEAD.json')

      const resolveVersionContent = async (version: string | undefined, fallbackToHead: boolean): Promise<string> => {
        let versionToUse = version
        if (!versionToUse && fallbackToHead && (await fs.pathExists(headPath))) {
          const head: HEADData = await fs.readJson(headPath)
          versionToUse = head.currentVersion || undefined
        }
        if (!versionToUse) return ''
        const commitPath = path.join(commitsPath, `${versionToUse}.json`)
        if (!(await fs.pathExists(commitPath))) return ''
        const commit: CommitData = await fs.readJson(commitPath)
        const normalizedFilePath = filePath.replace(/\\/g, '/')
        const fileEntry = commit.files.find(f => f.path === normalizedFilePath)
        if (!fileEntry) return ''
        const blobPath = path.join(objectsPath, `${fileEntry.hash}.blob`)
        if (!(await fs.pathExists(blobPath))) return ''
        return await fs.readFile(blobPath, 'utf-8')
      }

      const oldContent = await resolveVersionContent(versionA, true)

      let newContent = ''
      if (versionB) {
        newContent = await resolveVersionContent(versionB, false)
      } else {
        const fullPath = path.join(workingCopyPath, filePath)
        if (await fs.pathExists(fullPath)) {
          newContent = await fs.readFile(fullPath, 'utf-8')
        }
      }

      const ext = path.extname(filePath).toLowerCase()
      const languageMap: Record<string, string> = {
        '.ts': 'typescript', '.tsx': 'typescript', '.js': 'javascript', '.jsx': 'javascript',
        '.json': 'json', '.html': 'html', '.css': 'css', '.md': 'markdown', '.py': 'python',
        '.java': 'java', '.c': 'c', '.cpp': 'cpp', '.xml': 'xml', '.yaml': 'yaml', '.yml': 'yaml'
      }

      return { success: true, oldContent, newContent, message: languageMap[ext] || 'plaintext' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  // ==================== 仓库管理 ====================

  async deleteRepository(repoPath: string): Promise<{ success: boolean; message: string }> {
    try {
      await fs.remove(repoPath)
      return { success: true, message: '仓库已删除' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  async getRepositoryInfo(repoPath: string): Promise<{ success: boolean; info: string; message?: string }> {
    try {
      const config = await fs.readJson(path.join(repoPath, 'config.json'))
      const head: HEADData = await fs.readJson(path.join(repoPath, 'HEAD.json'))
      const sizeStr = head.totalSize > 1048576
        ? `${(head.totalSize / 1048576).toFixed(1)}MB`
        : head.totalSize > 1024 ? `${(head.totalSize / 1024).toFixed(1)}KB` : `${head.totalSize}B`
      const info = [
        `仓库名称: ${config.name}`,
        `版本: ${config.version}`,
        `创建时间: ${config.created}`,
        `当前版本: ${head.currentVersion || '无'}`,
        `提交次数: ${head.totalCommits}`,
        `数据大小: ${sizeStr}`
      ].join('\n')
      return { success: true, info }
    } catch (error) {
      return { success: false, info: '', message: String(error) }
    }
  }

  // ==================== 仓库验证 ====================

  async verify(repoPath: string): Promise<{ success: boolean; valid: boolean; errors: string[]; message?: string }> {
    try {
      const errors: string[] = []
      const requiredPaths = ['config.json', 'HEAD.json', 'objects', 'commits']
      for (const p of requiredPaths) {
        if (!(await fs.pathExists(path.join(repoPath, p)))) {
          errors.push(`缺少必要文件/目录: ${p}`)
        }
      }
      if (errors.length > 0) return { success: true, valid: false, errors }

      const commitsPath = path.join(repoPath, 'commits')
      const objectsPath = path.join(repoPath, 'objects')
      const commitFiles = await fs.readdir(commitsPath)

      for (const file of commitFiles) {
        if (!file.endsWith('.json')) continue
        const commit: CommitData = await fs.readJson(path.join(commitsPath, file))
        for (const f of commit.files) {
          if (!(await fs.pathExists(path.join(objectsPath, `${f.hash}.blob`)))) {
            errors.push(`版本 ${commit.id}: 文件 ${f.path} 的 blob 缺失 (${f.hash})`)
          }
        }
      }

      const head: HEADData = await fs.readJson(path.join(repoPath, 'HEAD.json'))
      if (head.currentVersion) {
        if (!(await fs.pathExists(path.join(commitsPath, `${head.currentVersion}.json`)))) {
          errors.push(`HEAD 指向的版本 ${head.currentVersion} 不存在`)
        }
      }

      return { success: true, valid: errors.length === 0, errors }
    } catch (error) {
      return { success: true, valid: false, errors: [String(error)] }
    }
  }

  // ==================== 工具方法 ====================

  private async cleanEmptyDirs(dir: string): Promise<void> {
    if (!(await fs.pathExists(dir))) return
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (shouldIgnoreBuiltin(entry.name)) continue
      if (entry.isDirectory()) {
        const subDir = path.join(dir, entry.name)
        await this.cleanEmptyDirs(subDir)
        const remaining = await fs.readdir(subDir)
        if (remaining.length === 0) await fs.rmdir(subDir)
      }
    }
  }
}
