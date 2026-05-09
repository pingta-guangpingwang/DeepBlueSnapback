import express from 'express'
import { type Request, type Response, type NextFunction } from 'express'
import { createServer } from 'http'
import * as fs from 'fs-extra'
import * as path from 'path'
import { randomUUID } from 'crypto'
import { DBHTRepository } from './dbvs-repository'

const repo = new DBHTRepository()

export class LANServer {
  private app: express.Application
  private server: ReturnType<typeof createServer> | null = null
  private rootPath: string = ''
  private token: string = ''

  constructor() {
    this.app = express()
    this.app.use(express.json())

    // Auth middleware — protects all routes except /api/info
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path === '/api/info' || req.method === 'OPTIONS') {
        next()
        return
      }
      if (!this.token) {
        next()
        return
      }
      const auth = req.headers.authorization
      if (!auth || !auth.startsWith('Bearer ') || auth.slice(7) !== this.token) {
        res.status(401).json({ error: 'Unauthorized', message: 'Invalid or missing Bearer token' })
        return
      }
      next()
    })

    this.setupRoutes()
  }

  private setupRoutes() {
    // Get server info (no auth required)
    this.app.get('/api/info', (_req, res) => {
      res.json({
        name: 'DBHT LAN Server',
        version: '2.0.0',
        rootPath: this.rootPath,
        authRequired: !!this.token,
      })
    })

    // List projects
    this.app.get('/api/projects', async (_req, res) => {
      try {
        const projectsDir = path.join(this.rootPath, 'projects')
        if (!(await fs.pathExists(projectsDir))) { res.json({ success: true, projects: [] }); return }
        const entries = await fs.readdir(projectsDir, { withFileTypes: true })
        const projects = []
        for (const entry of entries) {
          if (!entry.isDirectory()) continue
          const projPath = path.join(projectsDir, entry.name)
          const stat = await fs.stat(projPath)
          projects.push({
            name: entry.name,
            path: entry.name, // relative
            lastUpdate: stat.mtime.toISOString()
          })
        }
        res.json({ success: true, projects })
      } catch (error) {
        res.status(500).json({ success: false, message: String(error) })
      }
    })

    // Get project file tree
    this.app.get('/api/projects/:name/files', async (req, res) => {
      try {
        const projectDir = path.join(this.rootPath, 'projects', req.params.name)
        if (!(await fs.pathExists(projectDir))) {
          res.status(404).json({ success: false, message: '项目不存在' })
          return
        }
        const result = await repo.getFileTree(projectDir)
        res.json(result)
      } catch (error) {
        res.status(500).json({ success: false, message: String(error) })
      }
    })

    // Get file content
    this.app.get('/api/projects/:name/files/{*filePath}', async (req, res) => {
      try {
        const parts = req.params.filePath
        const subPath = Array.isArray(parts) ? parts.join('/') : (parts || '')
        const filePath = path.join(this.rootPath, 'projects', req.params.name, subPath)
        if (!(await fs.pathExists(filePath))) {
          res.status(404).json({ success: false, message: '文件不存在' })
          return
        }
        const content = await fs.readFile(filePath, 'utf-8')
        res.json({ success: true, content })
      } catch (error) {
        res.status(500).json({ success: false, message: String(error) })
      }
    })

    // Get project status
    this.app.get('/api/projects/:name/status', async (req, res) => {
      try {
        const repoPath = path.join(this.rootPath, 'repositories', req.params.name)
        const projectDir = path.join(this.rootPath, 'projects', req.params.name)
        const result = await repo.getStatus(repoPath, projectDir)
        res.json(result)
      } catch (error) {
        res.status(500).json({ success: false, message: String(error) })
      }
    })

    // Get project history
    this.app.get('/api/projects/:name/history', async (req, res) => {
      try {
        const repoPath = path.join(this.rootPath, 'repositories', req.params.name)
        const result = await repo.getHistory(repoPath)
        res.json(result)
      } catch (error) {
        res.status(500).json({ success: false, message: String(error) })
      }
    })

    // Commit changes
    this.app.post('/api/projects/:name/commit', async (req, res) => {
      try {
        const { message, files } = req.body
        const repoPath = path.join(this.rootPath, 'repositories', req.params.name)
        const projectDir = path.join(this.rootPath, 'projects', req.params.name)
        const result = await repo.commit(repoPath, projectDir, message, files)
        res.json(result)
      } catch (error) {
        res.status(500).json({ success: false, message: String(error) })
      }
    })

    // Rollback to version
    this.app.post('/api/projects/:name/rollback', async (req, res) => {
      try {
        const { version } = req.body
        if (!version) {
          res.status(400).json({ success: false, message: '缺少版本号' })
          return
        }
        const repoPath = path.join(this.rootPath, 'repositories', req.params.name)
        const projectDir = path.join(this.rootPath, 'projects', req.params.name)
        const result = await repo.rollback(repoPath, projectDir, version)
        res.json(result)
      } catch (error) {
        res.status(500).json({ success: false, message: String(error) })
      }
    })

    // Update to latest version
    this.app.post('/api/projects/:name/update', async (req, res) => {
      try {
        const repoPath = path.join(this.rootPath, 'repositories', req.params.name)
        const projectDir = path.join(this.rootPath, 'projects', req.params.name)
        const result = await repo.update(repoPath, projectDir)
        res.json(result)
      } catch (error) {
        res.status(500).json({ success: false, message: String(error) })
      }
    })

    // Get file diff
    this.app.get('/api/projects/:name/diff', async (req, res) => {
      try {
        const { file, versionA, versionB } = req.query
        if (!file) {
          res.status(400).json({ success: false, message: '缺少文件路径' })
          return
        }
        const repoPath = path.join(this.rootPath, 'repositories', req.params.name)
        const projectDir = path.join(this.rootPath, 'projects', req.params.name)
        const result = await repo.getDiff(repoPath, projectDir, String(file), versionA as string | undefined, versionB as string | undefined)
        res.json(result)
      } catch (error) {
        res.status(500).json({ success: false, message: String(error) })
      }
    })

    // Get repository info
    this.app.get('/api/projects/:name/info', async (req, res) => {
      try {
        const repoPath = path.join(this.rootPath, 'repositories', req.params.name)
        const result = await repo.getRepositoryInfo(repoPath)
        res.json(result)
      } catch (error) {
        res.status(500).json({ success: false, message: String(error) })
      }
    })

    // Verify repository integrity
    this.app.get('/api/projects/:name/verify', async (req, res) => {
      try {
        const projectDir = path.join(this.rootPath, 'projects', req.params.name)
        const result = await repo.verify(projectDir)
        res.json(result)
      } catch (error) {
        res.status(500).json({ success: false, message: String(error) })
      }
    })

    // Download project as zip (for client sync)
    this.app.get('/api/projects/:name/download', async (req, res) => {
      try {
        const projectDir = path.join(this.rootPath, 'projects', req.params.name)
        if (!(await fs.pathExists(projectDir))) {
          res.status(404).json({ success: false, message: '项目不存在' })
          return
        }
        // Simple: tar the directory
        // For now, return file list and let client fetch individually
        const result = await repo.getFileTree(projectDir)
        res.json(result)
      } catch (error) {
        res.status(500).json({ success: false, message: String(error) })
      }
    })
  }

  /**
   * Start the LAN server. Auto-generates a Bearer token if none exists.
   */
  async start(rootPath: string, port: number = 3280): Promise<{ success: boolean; address: string; token: string; message: string }> {
    this.rootPath = rootPath
    if (!this.token) {
      this.token = randomUUID()
    }
    return new Promise((resolve) => {
      this.server = this.app.listen(port, '0.0.0.0', () => {
        const address = `http://localhost:${port}`
        resolve({ success: true, address, token: this.token, message: `LAN 服务器已启动: ${address}` })
      })
    })
  }

  /**
   * Stop the server
   */
  stop() {
    if (this.server) {
      this.server.close()
      this.server = null
    }
  }

  /**
   * Get server status
   */
  getStatus() {
    return {
      running: this.server !== null,
      rootPath: this.rootPath
    }
  }
}
