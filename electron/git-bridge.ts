import git from 'isomorphic-git'
import * as fs from 'fs-extra'
import * as path from 'path'
import http from 'isomorphic-git/http/node'
import { app } from 'electron'

export interface ConflictFile {
  path: string
  isBinary: boolean
}

export interface GitSyncStatus {
  connected: boolean
  remoteUrl?: string
  branch?: string
  ahead: number
  behind: number
  lastSync?: string
  hasChanges: boolean
}

interface GitAuthEntry {
  username: string
  token: string
}

const DBHT_GITIGNORE = `.dbvs-link.json
.dbvs/
`

export class GitBridge {
  private authPath: string

  constructor() {
    this.authPath = path.join(app.getPath('userData'), 'git-auth.json')
  }

  // ==================== Auth ====================

  async getAuthStore(): Promise<Record<string, GitAuthEntry>> {
    try {
      if (await fs.pathExists(this.authPath)) {
        return await fs.readJson(this.authPath)
      }
    } catch { /* ignore */ }
    return {}
  }

  async saveAuthEntry(host: string, username: string, token: string): Promise<{ success: boolean; message: string }> {
    try {
      const store = await this.getAuthStore()
      store[host] = { username, token }
      await fs.writeJson(this.authPath, store, { spaces: 2 })
      return { success: true, message: `凭证已保存 (${host})` }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  async deleteAuthEntry(host: string): Promise<{ success: boolean; message: string }> {
    try {
      const store = await this.getAuthStore()
      delete store[host]
      await fs.writeJson(this.authPath, store, { spaces: 2 })
      return { success: true, message: `凭证已删除 (${host})` }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  private async resolveAuth(remoteUrl: string): Promise<{ username: string; password: string } | undefined> {
    try {
      const host = new URL(remoteUrl).hostname
      const store = await this.getAuthStore()
      const entry = store[host]
      if (entry) {
        return { username: entry.username, password: entry.token }
      }
    } catch { /* ignore */ }
    return undefined
  }

  private buildOnAuth(auth: { username: string; token: string }) {
    return () => ({ username: auth.username, password: auth.token })
  }

  // ==================== Connection ====================

  async connectRepo(
    dir: string,
    remoteUrl: string,
    branch: string,
    auth: { username: string; token: string },
    onProgress?: (msg: string) => void
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Init git repo if needed
      const gitDir = path.join(dir, '.git')
      if (!(await fs.pathExists(gitDir))) {
        onProgress?.('初始化 Git 仓库...')
        await git.init({ fs, dir, defaultBranch: branch })
      }

      // Set remote origin
      onProgress?.('配置远程仓库地址...')
      const remotes = await git.listRemotes({ fs, dir })
      if (remotes.find(r => r.remote === 'origin')) {
        await git.deleteRemote({ fs, dir, remote: 'origin' })
      }
      await git.addRemote({ fs, dir, remote: 'origin', url: remoteUrl })

      // Write .gitignore for DBHT files
      const gitignorePath = path.join(dir, '.gitignore')
      if (!(await fs.pathExists(gitignorePath))) {
        await fs.writeFile(gitignorePath, DBHT_GITIGNORE)
      } else {
        const content = await fs.readFile(gitignorePath, 'utf-8')
        if (!content.includes('.dbvs-link.json')) {
          await fs.appendFile(gitignorePath, '\n' + DBHT_GITIGNORE)
        }
      }

      // Try initial fetch + checkout
      try {
        onProgress?.('正在从远程获取数据...')
        await git.fetch({
          fs, http, dir, remote: 'origin', ref: branch,
          onAuth: this.buildOnAuth(auth),
          onProgress: (evt: { phase: string }) => {
            onProgress?.(`获取: ${evt.phase}`)
          },
        })
        // Set branch to track remote
        onProgress?.('正在检出文件...')
        try {
          await git.checkout({ fs, dir, ref: branch, force: true })
        } catch {
          // If local branch doesn't exist, create it tracking remote
          await git.branch({ fs, dir, ref: branch, checkout: true })
          await git.checkout({ fs, dir, ref: branch, force: true })
        }
      } catch (fetchError) {
        // Remote might be empty — that's OK, we'll push later
        const msg = String(fetchError)
        if (!msg.includes('404') && !msg.includes('empty')) {
          // Real error
          return { success: false, message: `连接失败: ${msg}` }
        }
        onProgress?.('远程仓库为空，跳过获取步骤')
      }

      return { success: true, message: '远程仓库已连接' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  async disconnectRepo(dir: string): Promise<{ success: boolean; message: string }> {
    try {
      const gitDir = path.join(dir, '.git')
      if (await fs.pathExists(gitDir)) {
        await fs.remove(gitDir)
      }
      return { success: true, message: '已断开远程仓库' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  // ==================== Sync Status ====================

  async getSyncStatus(dir: string): Promise<GitSyncStatus> {
    try {
      const gitDir = path.join(dir, '.git')
      if (!(await fs.pathExists(gitDir))) {
        return { connected: false, ahead: 0, behind: 0, hasChanges: false }
      }

      const remotes = await git.listRemotes({ fs, dir })
      const origin = remotes.find(r => r.remote === 'origin')
      if (!origin) {
        return { connected: false, ahead: 0, behind: 0, hasChanges: false }
      }

      let branch = 'main'
      try { branch = (await git.currentBranch({ fs, dir })) || 'main' } catch { /* use default */ }

      // Count ahead/behind
      let ahead = 0
      let behind = 0
      try {
        const localOid = await git.resolveRef({ fs, dir, ref: branch })
        const remoteOid = await git.resolveRef({ fs, dir, ref: `refs/remotes/origin/${branch}` })
        if (localOid !== remoteOid) {
          // Count commits ahead/behind using log comparison
          try {
            const localLog = await git.log({ fs, dir, ref: branch, depth: 50 })
            const remoteLog = await git.log({ fs, dir, ref: `refs/remotes/origin/${branch}`, depth: 50 })
            const localOids = new Set(localLog.map(c => c.oid))
            const remoteOids = new Set(remoteLog.map(c => c.oid))
            ahead = localLog.filter(c => !remoteOids.has(c.oid)).length
            behind = remoteLog.filter(c => !localOids.has(c.oid)).length
          } catch { /* ignore */ }
        }
      } catch { /* no remote ref yet */ }

      // Check working tree changes
      let hasChanges = false
      try {
        const matrix = await git.statusMatrix({ fs, dir })
        hasChanges = matrix.some((row: any[]) => row[1] !== 1 || row[2] !== 1)
      } catch { /* ignore */ }

      return {
        connected: true,
        remoteUrl: origin.url,
        branch,
        ahead,
        behind,
        hasChanges,
      }
    } catch {
      return { connected: false, ahead: 0, behind: 0, hasChanges: false }
    }
  }

  // ==================== Pull ====================

  async pull(
    dir: string,
    auth: { username: string; token: string },
    onProgress?: (msg: string) => void
  ): Promise<{ success: boolean; message: string; conflicts?: ConflictFile[] }> {
    try {
      let branch = 'main'
      try { branch = (await git.currentBranch({ fs, dir })) || 'main' } catch { /* use default */ }

      onProgress?.('正在从远程获取更新...')
      await git.fetch({
        fs, http, dir, remote: 'origin', ref: branch,
        onAuth: this.buildOnAuth(auth),
        onProgress: (evt: { phase: string }) => {
          onProgress?.(`获取中: ${evt.phase}`)
        },
      })

      // Merge remote into local
      onProgress?.('正在合并...')
      try {
        await git.merge({
          fs, dir,
          ours: branch,
          theirs: `origin/${branch}`,
          author: { name: 'DBHT', email: 'dbht@local' },
        })
      } catch (mergeError: any) {
        const msg = String(mergeError)
        if (msg.includes('conflict') || msg.includes('MergeConflict') || msg.includes('CONFLICT')) {
          // Detect conflicted files
          const conflicts = await this.detectConflicts(dir)
          return { success: false, message: `合并冲突: ${conflicts.length} 个文件`, conflicts }
        }
        throw mergeError
      }

      return { success: true, message: '拉取成功' }
    } catch (error) {
      return { success: false, message: `拉取失败: ${String(error)}` }
    }
  }

  // ==================== Push ====================

  async push(
    dir: string,
    commitMessage: string,
    authorName: string,
    authorEmail: string,
    auth: { username: string; token: string },
    onProgress?: (msg: string) => void
  ): Promise<{ success: boolean; message: string }> {
    try {
      let branch = 'main'
      try { branch = (await git.currentBranch({ fs, dir })) || 'main' } catch { /* use default */ }

      // Stage all changes
      onProgress?.('正在暂存文件...')
      const matrix = await git.statusMatrix({ fs, dir })
      for (const [filepath, headStatus, workdirStatus] of matrix) {
        if (headStatus !== workdirStatus) {
          await git.add({ fs, dir, filepath: filepath as string })
        }
      }

      // Check if there's anything to commit
      const stagedMatrix = await git.statusMatrix({ fs, dir })
      const hasStaged = stagedMatrix.some((row: any[]) => row[1] !== 1 || row[2] !== 1)

      if (hasStaged) {
        onProgress?.('正在提交...')
        await git.commit({
          fs, dir,
          message: commitMessage,
          author: { name: authorName, email: authorEmail },
        })
      }

      // Push
      onProgress?.('正在推送到远程...')
      await git.push({
        fs, http, dir, remote: 'origin', ref: branch,
        onAuth: this.buildOnAuth(auth),
        onProgress: (evt: { phase: string }) => {
          onProgress?.(`推送中: ${evt.phase}`)
        },
      })

      return { success: true, message: '推送成功' }
    } catch (error) {
      return { success: false, message: `推送失败: ${String(error)}` }
    }
  }

  // ==================== Conflict Resolution ====================

  async resolveConflict(
    dir: string,
    filePath: string,
    resolution: 'ours' | 'theirs'
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (resolution === 'ours') {
        // Keep current working copy version — just stage it
        await git.add({ fs, dir, filepath: filePath })
      } else {
        // Use remote version: read from remote HEAD
        let branch = 'main'
        try { branch = (await git.currentBranch({ fs, dir })) || 'main' } catch { /* use default */ }

        try {
          const remoteOid = await git.resolveRef({ fs, dir, ref: `refs/remotes/origin/${branch}` })
          const blob = await git.readBlob({ fs, dir, oid: remoteOid, filepath: filePath })
          await fs.writeFile(path.join(dir, filePath), Buffer.from(blob.blob))
        } catch {
          // File might not exist on remote (was deleted there) — remove locally
          await fs.remove(path.join(dir, filePath)).catch(() => {})
        }
        await git.add({ fs, dir, filepath: filePath })
      }

      return { success: true, message: `已解决: ${filePath} (${resolution === 'ours' ? '保留本地' : '使用远程'})` }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  async commitMergeResolution(
    dir: string,
    authorName: string,
    authorEmail: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      await git.commit({
        fs, dir,
        message: '合并冲突已解决',
        author: { name: authorName, email: authorEmail },
      })
      return { success: true, message: '冲突已提交' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  // ==================== Internal ====================

  private async detectConflicts(dir: string): Promise<ConflictFile[]> {
    const conflicts: ConflictFile[] = []
    try {
      const matrix = await git.statusMatrix({ fs, dir })
      for (const row of matrix) {
        const filepath = row[0] as string
        // Status code: head=0 means conflict/unmerged in some cases
        // Also check for conflict markers in file content
        const fullPath = path.join(dir, filepath)
        if (await fs.pathExists(fullPath)) {
          const content = await fs.readFile(fullPath, 'utf-8').catch(() => '')
          if (content.includes('<<<<<<<') || content.includes('=======')) {
            const ext = path.extname(filepath).toLowerCase()
            const binaryExts = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.svg',
              '.zip', '.tar', '.gz', '.rar', '.7z', '.pdf', '.exe', '.dll', '.so', '.woff', '.woff2', '.ttf']
            conflicts.push({ path: filepath, isBinary: binaryExts.includes(ext) })
          }
        }
      }
    } catch { /* ignore */ }
    return conflicts
  }
}
