import { BrowserWindow, ipcMain } from 'electron'
import * as path from 'path'
import { GitBridge } from '../git-bridge'
import { getRootPath, readProjectRegistry, writeProjectRegistry } from '../project-registry'

export function registerGitHandlers(
  ipcMain: Electron.IpcMain,
  mainWindow: BrowserWindow,
  gitBridge: GitBridge,
): void {

// Git: 连接远程仓库
ipcMain.handle('git:connect', async (_, workingCopyPath: string, remoteUrl: string, branch: string, username: string, token: string) => {
  const result = await gitBridge.connectRepo(workingCopyPath, remoteUrl, branch, { username, token }, (msg) => {
    mainWindow?.webContents.send('git:progress', msg)
  })
  if (result.success) {
    try {
      const rootPath = await getRootPath()
      if (rootPath) {
        const registry = await readProjectRegistry(rootPath)
        const normalized = path.resolve(workingCopyPath)
        for (const entry of registry) {
          const wc = entry.workingCopies.find(wc => path.resolve(wc.path) === normalized)
          if (wc) {
            entry.gitConfig = { remoteUrl, branch, connected: true }
            await writeProjectRegistry(rootPath, registry)
            break
          }
        }
      }
    } catch { /* ignore registry update failure */ }
  }
  return result
})

// Git: 断开远程仓库
ipcMain.handle('git:disconnect', async (_, workingCopyPath: string) => {
  const result = await gitBridge.disconnectRepo(workingCopyPath)
  if (result.success) {
    try {
      const rootPath = await getRootPath()
      if (rootPath) {
        const registry = await readProjectRegistry(rootPath)
        const normalized = path.resolve(workingCopyPath)
        for (const entry of registry) {
          if (entry.workingCopies.some(wc => path.resolve(wc.path) === normalized)) {
            delete entry.gitConfig
            await writeProjectRegistry(rootPath, registry)
            break
          }
        }
      }
    } catch { /* ignore */ }
  }
  return result
})

// Git: 获取同步状态
ipcMain.handle('git:sync-status', async (_, workingCopyPath: string) => {
  return await gitBridge.getSyncStatus(workingCopyPath)
})

// Git: 拉取
ipcMain.handle('git:pull', async (_, workingCopyPath: string, username: string, token: string) => {
  const result = await gitBridge.pull(workingCopyPath, { username, token }, (msg) => {
    mainWindow?.webContents.send('git:progress', msg)
  })
  if (result.success) {
    try {
      const rootPath = await getRootPath()
      if (rootPath) {
        const registry = await readProjectRegistry(rootPath)
        const normalized = path.resolve(workingCopyPath)
        for (const entry of registry) {
          if (entry.workingCopies.some(wc => path.resolve(wc.path) === normalized) && entry.gitConfig) {
            entry.gitConfig.lastSync = new Date().toISOString()
            await writeProjectRegistry(rootPath, registry)
            break
          }
        }
      }
    } catch { /* ignore */ }
  }
  return result
})

// Git: 推送
ipcMain.handle('git:push', async (_, workingCopyPath: string, commitMessage: string, authorName: string, authorEmail: string, username: string, token: string) => {
  const result = await gitBridge.push(workingCopyPath, commitMessage, authorName, authorEmail, { username, token }, (msg) => {
    mainWindow?.webContents.send('git:progress', msg)
  })
  if (result.success) {
    try {
      const rootPath = await getRootPath()
      if (rootPath) {
        const registry = await readProjectRegistry(rootPath)
        const normalized = path.resolve(workingCopyPath)
        for (const entry of registry) {
          if (entry.workingCopies.some(wc => path.resolve(wc.path) === normalized) && entry.gitConfig) {
            entry.gitConfig.lastSync = new Date().toISOString()
            await writeProjectRegistry(rootPath, registry)
            break
          }
        }
      }
    } catch { /* ignore */ }
  }
  return result
})

// Git: 解决冲突
ipcMain.handle('git:resolve-conflict', async (_, workingCopyPath: string, filePath: string, resolution: 'ours' | 'theirs') => {
  return await gitBridge.resolveConflict(workingCopyPath, filePath, resolution)
})

// Git: 提交合并解决
ipcMain.handle('git:commit-merge', async (_, workingCopyPath: string, authorName: string, authorEmail: string) => {
  return await gitBridge.commitMergeResolution(workingCopyPath, authorName, authorEmail)
})

// Git: 凭证管理
ipcMain.handle('git:get-credentials', async () => {
  return await gitBridge.getAuthStore()
})

ipcMain.handle('git:save-credential', async (_, host: string, username: string, token: string) => {
  return await gitBridge.saveAuthEntry(host, username, token)
})

ipcMain.handle('git:delete-credential', async (_, host: string) => {
  return await gitBridge.deleteAuthEntry(host)
})

} // end registerGitHandlers
