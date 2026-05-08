import express, { type Request, type Response, type NextFunction } from 'express'
import { type Server } from 'http'
import path from 'path'
import fs from 'fs'
import { DBHTRepository } from './dbvs-repository'

export interface ExternalApiConfig {
  enabled: boolean
  port: number
  token: string
}

const CONFIG_FILENAME = 'external-api.json'

let server: Server | null = null
let currentConfig: ExternalApiConfig = { enabled: false, port: 3281, token: '' }

export function getExternalApiConfig(): ExternalApiConfig {
  return { ...currentConfig }
}

export function loadExternalApiConfig(rootPath: string): ExternalApiConfig {
  try {
    const configPath = path.join(rootPath, 'config', CONFIG_FILENAME)
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8')
      currentConfig = { ...currentConfig, ...JSON.parse(data) }
    }
  } catch { /* use defaults */ }
  return { ...currentConfig }
}

export function saveExternalApiConfig(rootPath: string, config: ExternalApiConfig): void {
  const configDir = path.join(rootPath, 'config')
  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true })
  fs.writeFileSync(path.join(configDir, CONFIG_FILENAME), JSON.stringify(config, null, 2), 'utf-8')
  currentConfig = { ...config }
}

function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!currentConfig.token) {
    next()
    return
  }
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ') || auth.slice(7) !== currentConfig.token) {
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid or missing Bearer token' })
    return
  }
  next()
}

interface ProjectRegistryEntry {
  name: string
  path?: string
  repoPath: string
  workingCopies: Array<{ path: string }>
  gitConfig?: { remoteUrl: string; branch: string; connected: boolean }
  created?: string
}

function readRegistry(rootPath: string): ProjectRegistryEntry[] {
  try {
    const registryPath = path.join(rootPath, 'config', 'projects.json')
    if (fs.existsSync(registryPath)) {
      const raw = JSON.parse(fs.readFileSync(registryPath, 'utf-8'))
      return raw.map((entry: any) => {
        if (entry.repoPath) return entry as ProjectRegistryEntry
        // compat with old format
        return {
          name: entry.name,
          repoPath: entry.path,
          workingCopies: [{ path: entry.path }],
          created: entry.created,
        } as ProjectRegistryEntry
      })
    }
  } catch { /* fall through */ }

  // Fallback: scan repositories/ directory
  const reposDir = path.join(rootPath, 'repositories')
  const entries: ProjectRegistryEntry[] = []
  if (fs.existsSync(reposDir)) {
    try {
      const dirs = fs.readdirSync(reposDir)
      for (const dir of dirs) {
        const repoPath = path.join(reposDir, dir)
        const stat = fs.statSync(repoPath)
        if (stat.isDirectory() && fs.existsSync(path.join(repoPath, 'config.json'))) {
          entries.push({
            name: dir, repoPath, workingCopies: [],
            created: stat.mtime.toISOString(),
          })
        }
      }
    } catch { /* ignore */ }
  }
  return entries
}

export async function startExternalApi(rootPath: string): Promise<{
  success: boolean; message: string; port?: number; address?: string
}> {
  if (server) {
    return { success: false, message: `API server is already running on port ${currentConfig.port}` }
  }

  const dbvs = new DBHTRepository()

  const app = express()
  app.use(express.json())
  app.use(authMiddleware)

  // GET /api/v1/status
  app.get('/api/v1/status', async (_req: Request, res: Response) => {
    try {
      const registry = readRegistry(rootPath)
      res.json({
        status: 'running',
        rootPath,
        projects: registry.length,
        timestamp: new Date().toISOString(),
      })
    } catch (e) {
      res.status(500).json({ error: 'Internal error', message: String(e) })
    }
  })

  // GET /api/v1/projects
  app.get('/api/v1/projects', async (_req: Request, res: Response) => {
    try {
      const registry = readRegistry(rootPath)
      res.json(registry.map(e => ({
        name: e.name,
        path: e.repoPath,
        workingCopies: e.workingCopies.map(w => w.path),
        gitConfig: e.gitConfig,
      })))
    } catch (e) {
      res.status(500).json({ error: String(e) })
    }
  })

  // GET /api/v1/projects/:name/graph-versions
  app.get('/api/v1/projects/:name/graph-versions', async (_req: Request, res: Response) => {
    try {
      const graphsDir = path.join(rootPath, 'graphs')
      if (!fs.existsSync(graphsDir)) { res.json({ graphs: [] }); return }
      const files = fs.readdirSync(graphsDir).filter(f => f.endsWith('.json'))
      res.json({ graphs: files.map(f => f.replace('.json', '')) })
    } catch (e) {
      res.status(500).json({ error: String(e) })
    }
  })

  // GET /api/v1/projects/:name/health
  app.get('/api/v1/projects/:name/health', async (req: Request, res: Response) => {
    try {
      const registry = readRegistry(rootPath)
      const proj = registry.find(e => e.name === req.params.name)
      if (!proj) { res.status(404).json({ error: 'Project not found' }); return }

      const history = await dbvs.getHistoryStructured(proj.repoPath)
      if (!history.success || !history.commits?.length) {
        res.status(404).json({ error: 'No commits found' }); return
      }

      const { loadGraph } = await import('./graph-store')
      const { generateHealthReport } = await import('./health-scorer')

      const graph = await loadGraph(rootPath, history.commits[0].id)
      if (!graph) { res.status(404).json({ error: 'No graph found — run AST analysis first' }); return }

      const report = generateHealthReport(graph)
      res.json(report)
    } catch (e) {
      res.status(500).json({ error: String(e) })
    }
  })

  // GET /api/v1/projects/:name/rag?q=...
  // Returns RAG-friendly knowledge graph context, optionally filtered by query
  app.get('/api/v1/projects/:name/rag', async (req: Request, res: Response) => {
    try {
      const registry = readRegistry(rootPath)
      const proj = registry.find(e => e.name === req.params.name)
      if (!proj) { res.status(404).json({ error: 'Project not found' }); return }

      const history = await dbvs.getHistoryStructured(proj.repoPath)
      if (!history.success || !history.commits?.length) {
        res.status(404).json({ error: 'No commits found' }); return
      }

      const { loadGraph } = await import('./graph-store')
      const graph = await loadGraph(rootPath, history.commits[0].id)
      if (!graph) { res.status(404).json({ error: 'No graph found — run AST analysis first' }); return }

      const query = typeof req.query.q === 'string' ? req.query.q.toLowerCase() : ''

      // Collect all nodes
      const allNodes: Record<string, unknown>[] = []
      function collectNodes(node: any, parentId: string | null, depth: number): void {
        allNodes.push({
          id: node.id, label: node.label, type: node.type, path: node.path,
          fileCount: node.fileCount, lineCount: node.lineCount, exportsCount: node.exportsCount,
          parentId, depth, childCount: node.children?.length ?? 0,
        })
        if (node.children) {
          for (const child of node.children) collectNodes(child, node.id, depth + 1)
        }
      }
      collectNodes(graph.rootNode, null, 1)

      // Key relationships
      const keyRelationships: string[] = []
      for (const e of graph.edges) {
        const src = allNodes.find(n => n.id === e.source)
        const tgt = allNodes.find(n => n.id === e.target)
        if (src && tgt) {
          keyRelationships.push(`[${e.type}] ${String(src.label)} -> ${String(tgt.label)}${e.label ? ` (${e.label})` : ''}`)
        }
      }

      // Filter by query if provided
      const filteredRels = query
        ? keyRelationships.filter(r => r.toLowerCase().includes(query)).slice(0, 50)
        : keyRelationships.slice(0, 50)

      const filteredNodes = query
        ? allNodes.filter(n => {
            const label = String(n.label).toLowerCase()
            const path = String(n.path).toLowerCase()
            const type = String(n.type).toLowerCase()
            return label.includes(query) || path.includes(query) || type.includes(query)
          }).slice(0, 100)
        : allNodes.slice(0, 100)

      // Build summary
      const buildings = allNodes.filter(n => n.type === 'building')
      const floors = allNodes.filter(n => n.type === 'floor')
      const rooms = allNodes.filter(n => n.type === 'room')

      const summary = [
        `Project "${graph.projectName}" at commit ${history.commits[0].id.slice(0, 14)}.`,
        `Structure: ${buildings.length} buildings (modules), ${floors.length} floors (subdirectories), ${rooms.length} rooms (source files).`,
        `Total: ${graph.metrics.totalLines.toLocaleString()} lines of code across ${graph.metrics.totalFiles} files.`,
        `Circular dependencies: ${graph.metrics.circularDepCount}. Orphan modules: ${graph.metrics.orphanCount}.`,
      ].join('\n')

      res.json({
        projectName: graph.projectName,
        commitId: history.commits[0].id,
        naturalLanguageSummary: summary,
        buildingCount: buildings.length,
        floorCount: floors.length,
        roomCount: rooms.length,
        totalRelationships: keyRelationships.length,
        keyRelationships: filteredRels,
        nodes: filteredNodes,
        metrics: graph.metrics,
        query: query || null,
      })
    } catch (e) {
      res.status(500).json({ error: String(e) })
    }
  })

  // POST /api/v1/tasks/complete
  app.post('/api/v1/tasks/complete', async (req: Request, res: Response) => {
    try {
      const { projectName, message, author } = req.body
      if (!projectName) { res.status(400).json({ error: 'projectName is required' }); return }

      const registry = readRegistry(rootPath)
      const proj = registry.find(e => e.name === projectName)
      if (!proj) { res.status(404).json({ error: 'Project not found' }); return }

      const wc = proj.workingCopies[0]
      if (!wc) { res.status(404).json({ error: 'No working copy for project' }); return }

      const status = await dbvs.getStatus(proj.repoPath, wc.path)
      const changedFiles = (status.status || []).filter((s: string) => !s.startsWith('?'))

      if (changedFiles.length === 0) {
        res.json({ success: true, message: 'No changes to commit', version: null })
        return
      }

      const result = await dbvs.commit(proj.repoPath, wc.path,
        message || '[External API] Task completed — auto snapshot',
        changedFiles,
        { author: author || 'external-api' })

      res.json({ success: result.success, message: result.message })
    } catch (e) {
      res.status(500).json({ error: String(e) })
    }
  })

  // POST /api/v1/projects/:name/commit
  app.post('/api/v1/projects/:name/commit', async (req: Request, res: Response) => {
    try {
      const { message: commitMsg, author, files: specifiedFiles } = req.body
      if (!commitMsg) { res.status(400).json({ error: 'message is required' }); return }

      const registry = readRegistry(rootPath)
      const proj = registry.find(e => e.name === req.params.name)
      if (!proj) { res.status(404).json({ error: 'Project not found' }); return }

      const wc = proj.workingCopies[0]
      if (!wc) { res.status(404).json({ error: 'No working copy' }); return }

      const status = await dbvs.getStatus(proj.repoPath, wc.path)
      let files = specifiedFiles
      if (!files || files.length === 0) {
        files = (status.status || []).filter((s: string) => !s.startsWith('?'))
      }

      if (files.length === 0) {
        res.json({ success: true, message: 'No files to commit' }); return
      }

      const result = await dbvs.commit(proj.repoPath, wc.path, commitMsg, files, {
        author: author || 'external-api',
      })

      res.json({ success: result.success, message: result.message })
    } catch (e) {
      res.status(500).json({ error: String(e) })
    }
  })

  // POST /api/v1/projects/:name/vector/index
  app.post('/api/v1/projects/:name/vector/index', async (req: Request, res: Response) => {
    try {
      const name = String(req.params.name)
      const registry = readRegistry(rootPath)
      const proj = registry.find(e => e.name === name)
      if (!proj) { res.status(404).json({ error: 'Project not found' }); return }

      const wc = proj.workingCopies[0]
      if (!wc) { res.status(404).json({ error: 'No working copy for project' }); return }

      const history = await dbvs.getHistoryStructured(proj.repoPath)
      const commitId = (history.success && history.commits?.length > 0)
        ? history.commits[0].id : 'unknown'

      const { buildVectorIndex } = await import('./vector-engine')
      const filePaths = req.body?.filePaths || undefined
      const result = await buildVectorIndex(rootPath, wc.path, commitId, name, filePaths)
      res.json(result)
    } catch (e) {
      res.status(500).json({ error: String(e) })
    }
  })

  // GET /api/v1/projects/:name/vector/status
  app.get('/api/v1/projects/:name/vector/status', async (req: Request, res: Response) => {
    try {
      const { getVectorStatus } = await import('./vector-engine')
      const result = await getVectorStatus(rootPath, String(req.params.name))
      res.json(result)
    } catch (e) {
      res.status(500).json({ error: String(e) })
    }
  })

  // POST /api/v1/projects/:name/vector/search
  app.post('/api/v1/projects/:name/vector/search', async (req: Request, res: Response) => {
    try {
      const { searchVectors } = await import('./vector-engine')
      const { text, topK, minSimilarity, fileTypes } = req.body || {}
      if (!text) { res.status(400).json({ error: 'text is required' }); return }
      const result = await searchVectors(rootPath, String(req.params.name), {
        text, topK, minSimilarity, fileTypes,
      })
      res.json(result)
    } catch (e) {
      res.status(500).json({ error: String(e) })
    }
  })

  // DELETE /api/v1/projects/:name/vector
  app.delete('/api/v1/projects/:name/vector', async (req: Request, res: Response) => {
    try {
      const { deleteVectorIndex } = await import('./vector-engine')
      const result = await deleteVectorIndex(rootPath, String(req.params.name))
      res.json(result)
    } catch (e) {
      res.status(500).json({ error: String(e) })
    }
  })

  return new Promise(resolve => {
    server = app.listen(currentConfig.port, () => {
      const addr = `http://localhost:${currentConfig.port}`
      resolve({ success: true, message: `API server started on ${addr}`, port: currentConfig.port, address: addr })
    })
    server!.on('error', (err: any) => {
      server = null
      resolve({ success: false, message: `Failed to start API server: ${err.message}` })
    })
  })
}

export function stopExternalApi(): { success: boolean; message: string } {
  if (!server) {
    return { success: false, message: 'API server is not running' }
  }
  server.close()
  server = null
  return { success: true, message: 'API server stopped' }
}

export function getExternalApiStatus(): { running: boolean; port: number } {
  return { running: server !== null, port: currentConfig.port }
}
