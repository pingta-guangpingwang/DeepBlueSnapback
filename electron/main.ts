import { app, BrowserWindow, ipcMain, dialog, Menu, shell } from 'electron'
import * as path from 'path'
import * as fs from 'fs-extra'
import * as os from 'os'
import * as net from 'net'
import { DBHTRepository } from './dbvs-repository'
import { GitBridge } from './git-bridge'
import { LANServer } from './lan-server'
import { parseCommandLine, registerContextMenu, unregisterContextMenu, isContextMenuRegistered } from './context-menu'
import { getRootPath, readProjectRegistry, getProjectsList } from './project-registry'
import { getToolsManifest, DBHT_OPENCLAW_TOOLS } from './openclaw-tools'
import { analyzeCrossReferences } from './cross-ref-analyzer'
import { analyzeImpact } from './impact-analyzer'
import { loadGraph } from './graph-store'
import { generateHealthReport } from './health-scorer'
import { searchVectors } from './vector-engine'
import { registerProjectHandlers } from './ipc-handlers/dbgvs-project'
import { registerVcsHandlers } from './ipc-handlers/dbgvs-vcs'
import { registerGraphHandlers } from './ipc-handlers/graph'
import { registerGitHandlers } from './ipc-handlers/git'
import { registerVectorHandlers } from './ipc-handlers/vector'

let mainWindow: BrowserWindow | null = null
const dbvsRepo = new DBHTRepository()
const gitBridge = new GitBridge()
const lanServer = new LANServer()
const cliCommand = parseCommandLine(process.argv)

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    frame: false,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 15, y: 15 },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#ffffff',
    show: false
  })

  if (process.env.NODE_ENV !== 'development') {
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:"
          ]
        }
      })
    })
  }

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3005')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    if (cliCommand) {
      mainWindow?.webContents.send('cli:action', cliCommand)
    }
  })

  const menuTemplate: Electron.MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: [
        { label: '新建项目', accelerator: 'CmdOrCtrl+N', click: () => mainWindow?.webContents.send('menu:new-project') },
        { label: '打开项目', accelerator: 'CmdOrCtrl+O', click: () => mainWindow?.webContents.send('menu:open-project') },
        { type: 'separator' },
        { label: '退出', accelerator: 'CmdOrCtrl+Q', role: 'quit' }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: '重做', accelerator: 'CmdOrCtrl+Shift+Z', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { label: '重新加载', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: '强制重新加载', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { type: 'separator' },
        { label: '实际大小', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: '放大', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: '缩小', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: '全屏', accelerator: 'F11', role: 'togglefullscreen' },
        { label: '开发者工具', accelerator: 'F12', role: 'toggleDevTools' }
      ]
    },
  ]

  const menu = Menu.buildFromTemplate(menuTemplate)
  Menu.setApplicationMenu(menu)
}

// ==================== IPC Handler Registration ====================

function registerIPCHandlers() {
  // Window controls
  ipcMain.handle('window:minimize', () => mainWindow?.minimize())
  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })
  ipcMain.handle('window:close', () => mainWindow?.close())
  ipcMain.handle('window:is-maximized', () => mainWindow?.isMaximized())

  // 文件夹选择
  ipcMain.handle('dialog:select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory', 'createDirectory'],
      title: '选择项目文件夹'
    })
    return result.canceled ? null : result.filePaths[0]
  })

  // 打开本地文件夹
  ipcMain.handle('shell:open-folder', async (_, folderPath: string) => {
    shell.openPath(folderPath)
  })

  // 读取文件内容
  ipcMain.handle('fs:read-file', async (_, filePath: string) => {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      return { success: true, content }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 创建空文件
  ipcMain.handle('fs:create-file', async (_, filePath: string) => {
    try {
      await fs.ensureDir(path.dirname(filePath))
      if (!(await fs.pathExists(filePath))) {
        await fs.writeFile(filePath, '')
      }
      return { success: true }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  })

  // 写入文件内容
  ipcMain.handle('fs:write-file', async (_, filePath: string, content: string) => {
    try {
      await fs.ensureDir(path.dirname(filePath))
      await fs.writeFile(filePath, content, 'utf-8')
      return { success: true }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  })

  // 删除文件
  ipcMain.handle('fs:delete-file', async (_, filePath: string) => {
    try {
      await fs.remove(filePath)
      return { success: true }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  })

  // 递归列出目录文件
  ipcMain.handle('fs:list-files', async (_, dirPath: string) => {
    const results: Array<{ name: string; path: string; isDirectory: boolean }> = []
    const errors: string[] = []

    async function walk(dir: string, base: string, depth: number) {
      if (depth > 20) return
      if (!(await fs.pathExists(dir))) return
      let entries: fs.Dirent[]
      try {
        entries = await fs.readdir(dir, { withFileTypes: true })
      } catch (err) {
        errors.push(`${dir}: ${String(err)}`)
        return
      }
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
        const fullPath = path.join(dir, entry.name)
        const relPath = path.relative(base, fullPath).replace(/\\/g, '/')
        try {
          if (entry.isDirectory()) {
            results.push({ name: entry.name, path: relPath, isDirectory: true })
            await walk(fullPath, base, depth + 1)
          } else {
            results.push({ name: entry.name, path: relPath, isDirectory: false })
          }
        } catch (err) {
          errors.push(`${relPath}: ${String(err)}`)
        }
      }
    }

    try {
      await walk(dirPath, dirPath, 0)
      return { success: true, files: results, errors: errors.length > 0 ? errors : undefined }
    } catch (error) {
      return { success: false, files: results, message: String(error), errors }
    }
  })

  // 路径拼接
  ipcMain.handle('fs:path-join', async (_, ...paths: string[]) => {
    return { result: path.join(...paths) }
  })

  // 获取路径基础名
  ipcMain.handle('fs:path-basename', async (_, filePath: string) => {
    return { result: path.basename(filePath) }
  })

  // 右键菜单
  ipcMain.handle('context-menu:register', async () => {
    return await registerContextMenu()
  })
  ipcMain.handle('context-menu:unregister', async () => {
    return await unregisterContextMenu()
  })
  ipcMain.handle('context-menu:is-registered', async () => {
    return await isContextMenuRegistered()
  })

  // ---- Delegated handler modules ----
  registerProjectHandlers(ipcMain, mainWindow!, dbvsRepo)
  registerVcsHandlers(ipcMain, mainWindow!, dbvsRepo)
  registerGraphHandlers(ipcMain, mainWindow!, dbvsRepo)
  registerGitHandlers(ipcMain, mainWindow!, gitBridge)
  registerVectorHandlers(ipcMain, mainWindow!)

  // ---- External API ----
  let externalApi: typeof import('./external-api') | null = null

  ipcMain.handle('external-api:start', async () => {
    const rootPath = await getRootPath()
    if (!rootPath) return { success: false, message: 'Root path not configured' }
    if (!externalApi) externalApi = await import('./external-api')
    return externalApi.startExternalApi(rootPath)
  })

  ipcMain.handle('external-api:stop', async () => {
    if (!externalApi) externalApi = await import('./external-api')
    return externalApi.stopExternalApi()
  })

  ipcMain.handle('external-api:status', async () => {
    if (!externalApi) externalApi = await import('./external-api')
    return externalApi.getExternalApiStatus()
  })

  ipcMain.handle('external-api:get-config', async () => {
    const rootPath = await getRootPath()
    if (!rootPath) return { enabled: false, port: 3281, token: '' }
    if (!externalApi) externalApi = await import('./external-api')
    return externalApi.loadExternalApiConfig(rootPath)
  })

  ipcMain.handle('external-api:save-config', async (_, config: { enabled: boolean; port: number; token: string }) => {
    const rootPath = await getRootPath()
    if (!rootPath) return { success: false, message: 'Root path not configured' }
    if (!externalApi) externalApi = await import('./external-api')
    externalApi.saveExternalApiConfig(rootPath, config)
    return { success: true, message: 'Config saved' }
  })

  // ---- LAN Server ----
  ipcMain.handle('lan:start', async (_, rootPath: string, port?: number) => {
    return await lanServer.start(rootPath, port || 3280)
  })

  ipcMain.handle('lan:stop', async () => {
    lanServer.stop()
    return { success: true, message: 'LAN 服务器已停止' }
  })

  ipcMain.handle('lan:status', async () => {
    return lanServer.getStatus()
  })

  // ---- OpenClaw Agent Tools ----
  ipcMain.handle('tools:get-manifest', async () => {
    return getToolsManifest()
  })

  ipcMain.handle('tools:invoke', async (_, toolName: string, params: Record<string, unknown>) => {
    const tool = DBHT_OPENCLAW_TOOLS.find(t => t.name === toolName)
    if (!tool) return { success: false, message: `Unknown tool: ${toolName}` }

    const rootPath = await getRootPath()
    if (!rootPath) return { success: false, message: 'Root path not configured' }

    const resolveProject = async (projectPath?: string) => {
      if (!projectPath) return null
      return await dbvsRepo.resolvePaths(projectPath)
    }

    try {
      switch (toolName) {
        case 'dbht_commit': {
          const resolved = await resolveProject(params.projectPath as string)
          if (!resolved) return { success: false, message: 'Cannot resolve project path' }
          const status = await dbvsRepo.getStatus(resolved.repoPath, resolved.workingCopyPath)
          const files = params.files
            ? (params.files as string).split(',').map(f => f.trim())
            : (status.status || []).filter((s: string) => !s.startsWith('?'))
          if (files.length === 0) return { success: true, message: 'No files to commit' }
          return await dbvsRepo.commit(
            resolved.repoPath, resolved.workingCopyPath,
            (params.message as string) || 'AI auto commit', files,
            { sessionId: params.sessionId as string }
          )
        }
        case 'dbht_history': {
          const resolved = await resolveProject(params.projectPath as string)
          if (!resolved) return { success: false, message: 'Cannot resolve project path' }
          return await dbvsRepo.getHistoryStructured(resolved.repoPath)
        }
        case 'dbht_search': {
          return await searchVectors(rootPath,
            (params.projectName as string) || '',
            {
              text: params.query as string,
              topK: (params.topK as number) || 10,
              searchMode: (params.searchMode as 'hybrid' | 'vector' | 'bm25') || 'hybrid',
            }
          )
        }
        case 'dbht_cross_ref': {
          const registry = await readProjectRegistry(rootPath)
          const projectName = params.projectPath
            ? path.basename(params.projectPath as string)
            : ''
          return await analyzeCrossReferences(rootPath, projectName, registry)
        }
        case 'dbht_rollback': {
          const resolved = await resolveProject(params.projectPath as string)
          if (!resolved) return { success: false, message: 'Cannot resolve project path' }
          return await dbvsRepo.rollback(resolved.repoPath, resolved.workingCopyPath, params.version as string)
        }
        case 'dbht_diff': {
          const resolved = await resolveProject(params.projectPath as string)
          if (!resolved) return { success: false, message: 'Cannot resolve project path' }
          if (params.impact) {
            const history = await dbvsRepo.getHistoryStructured(resolved.repoPath)
            if (!history.success || !history.commits?.length) {
              return { success: false, message: 'No commits found for impact analysis' }
            }
            const graph = await loadGraph(rootPath, history.commits[0].id)
            if (!graph) return { success: false, message: 'No graph found — run AST analysis first' }
            const diffSummary = await dbvsRepo.getDiffSummary(resolved.repoPath, resolved.workingCopyPath)
            if (!diffSummary.success || !diffSummary.files) {
              return { success: false, message: diffSummary.message || 'Cannot get diff summary' }
            }
            return { success: true, report: analyzeImpact(graph, diffSummary.files) }
          }
          return await dbvsRepo.getDiff(resolved.repoPath, resolved.workingCopyPath, (params.file as string) || '')
        }
        case 'dbht_health': {
          const projectPath = params.projectPath as string
          let resolved: { repoPath: string; workingCopyPath: string } | null = null
          if (projectPath) {
            resolved = await resolveProject(projectPath)
          } else {
            const registry = await readProjectRegistry(rootPath)
            const entry = registry[0]
            if (!entry) return { success: false, message: 'No projects found' }
            const wc = entry.workingCopies[0]
            if (!wc) return { success: false, message: 'No working copy found' }
            resolved = { repoPath: entry.repoPath, workingCopyPath: wc.path }
          }
          if (!resolved) return { success: false, message: 'Cannot resolve project path' }
          const history = await dbvsRepo.getHistoryStructured(resolved.repoPath)
          if (!history.success || !history.commits?.length) {
            return { success: false, message: 'No commits found — commit something first' }
          }
          const graph = await loadGraph(rootPath, history.commits[0].id)
          if (!graph) return { success: false, message: 'No graph found — run AST analysis first' }
          return { success: true, report: generateHealthReport(graph) }
        }
        case 'dbht_status': {
          const resolved = await resolveProject(params.projectPath as string)
          if (!resolved) return { success: false, message: 'Cannot resolve project path' }
          return await dbvsRepo.getStatus(resolved.repoPath, resolved.workingCopyPath)
        }
        case 'dbht_file_tree': {
          const resolved = await resolveProject(params.projectPath as string)
          if (!resolved) return { success: false, message: 'Cannot resolve project path' }
          return await dbvsRepo.getFileTree(resolved.workingCopyPath)
        }
        default:
          return { success: false, message: `Tool ${toolName} not implemented` }
      }
    } catch (e) {
      return { success: false, message: `Tool error: ${String(e)}` }
    }
  })

} // end registerIPCHandlers

// Re-export for CLI / LAN consumers
export { getProjectsList }

// ==================== 启动 ====================

registerIPCHandlers()
app.whenReady().then(createWindow)

// ==================== 本地 IPC Server（接收启动器命令）====================

const IPC_PORT_FILE = path.join(
  process.env.APPDATA || process.env.LOCALAPPDATA || path.join(require('os').homedir(), '.config'),
  'DBHT',
  'ipc-port'
)

let ipcServer: net.Server | null = null

function startIpcServer() {
  ipcServer = net.createServer((socket) => {
    let data = ''
    socket.on('data', (chunk) => {
      data += chunk.toString()
    })
    socket.on('end', () => {
      try {
        const cmd = JSON.parse(data)
        if (cmd.action && cmd.path) {
          console.log(`[IPC] Received command: ${cmd.action} ${cmd.path}`)
          if (mainWindow) {
            mainWindow.webContents.send('cli:action', cmd)
            if (mainWindow.isMinimized()) mainWindow.restore()
            mainWindow.focus()
          }
          socket.write('OK')
        }
      } catch (e) {
        console.error('[IPC] Invalid command:', e)
        socket.write('ERROR')
      }
      socket.end()
    })
    socket.on('error', () => { /* ignore */ })
  })

  ipcServer.listen(0, '127.0.0.1', () => {
    const addr = ipcServer!.address() as net.AddressInfo
    const port = addr.port
    console.log(`[IPC] Listening on 127.0.0.1:${port}`)
    fs.ensureDirSync(path.dirname(IPC_PORT_FILE))
    fs.writeFileSync(IPC_PORT_FILE, String(port))
  })

  ipcServer.on('error', (err) => {
    console.error('[IPC] Server error:', err)
  })
}

function cleanupIpcServer() {
  try {
    if (fs.existsSync(IPC_PORT_FILE)) {
      fs.unlinkSync(IPC_PORT_FILE)
    }
  } catch { /* ignore */ }
  if (ipcServer) {
    ipcServer.close()
  }
}

app.on('ready', () => {
  startIpcServer()
})

app.on('before-quit', () => {
  cleanupIpcServer()
})

app.on('window-all-closed', () => {
  cleanupIpcServer()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
