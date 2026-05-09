import { app } from 'electron'
import * as fs from 'fs-extra'
import * as path from 'path'

export interface ProjectRegistryEntry {
  name: string
  repoPath: string                           // 集中仓库路径 repositories/<name>
  workingCopies: Array<{ path: string }>     // 工作副本路径列表
  created: string
  order?: number                              // 手动排序序号（0-based）
  rating?: number                             // 重要程度 1-6，默认 2
  gitConfig?: {
    remoteUrl: string
    branch: string
    connected: boolean
    lastSync?: string
  }
}

export async function getRootPath(): Promise<string | null> {
  try {
    const configPath = path.join(app.getPath('userData'), 'dbvs-root.json')
    if (await fs.pathExists(configPath)) {
      const config = await fs.readJson(configPath)
      return config.rootPath || null
    }
  } catch { /* ignore */ }
  return null
}

async function getRegistryPath(rootPath: string): Promise<string> {
  const configDir = path.join(rootPath, 'config')
  await fs.ensureDir(configDir)
  return path.join(configDir, 'projects.json')
}

async function getExcludedRepos(rootPath: string): Promise<Set<string>> {
  try {
    const excludedPath = path.join(rootPath, 'config', 'excluded-repos.json')
    if (await fs.pathExists(excludedPath)) {
      const list: string[] = await fs.readJson(excludedPath)
      return new Set(list.map(p => path.resolve(p)))
    }
  } catch { /* ignore */ }
  return new Set()
}

export async function addExcludedRepo(rootPath: string, repoPath: string): Promise<void> {
  const excludedPath = path.join(rootPath, 'config', 'excluded-repos.json')
  const excluded = await getExcludedRepos(rootPath)
  excluded.add(path.resolve(repoPath))
  await fs.ensureDir(path.dirname(excludedPath))
  await fs.writeJson(excludedPath, [...excluded], { spaces: 2 })
}

export async function removeExcludedRepo(rootPath: string, repoPath: string): Promise<void> {
  const excludedPath = path.join(rootPath, 'config', 'excluded-repos.json')
  const excluded = await getExcludedRepos(rootPath)
  excluded.delete(path.resolve(repoPath))
  if (excluded.size === 0) {
    await fs.remove(excludedPath).catch(() => {})
  } else {
    await fs.writeJson(excludedPath, [...excluded], { spaces: 2 })
  }
}

export async function readProjectRegistry(rootPath: string): Promise<ProjectRegistryEntry[]> {
  const registryPath = await getRegistryPath(rootPath)
  const reposDir = path.join(rootPath, 'repositories')
  const excludedRepos = await getExcludedRepos(rootPath)

  let entries: ProjectRegistryEntry[] = []

  // 1. 从注册表文件读取已有条目
  if (await fs.pathExists(registryPath)) {
    try {
      const raw: any[] = await fs.readJson(registryPath)
      entries = raw.map((entry: any) => {
        if (entry.repoPath) return entry as ProjectRegistryEntry
        return {
          name: entry.name,
          repoPath: entry.path,
          workingCopies: [{ path: entry.path }],
          created: entry.created
        }
      })
    } catch { /* ignore corrupt file */ }
  }

  // 2. 扫描 repositories/ 目录，补齐注册表中缺失的仓库（外部 AI 初始化）
  if (await fs.pathExists(reposDir)) {
    try {
      const dirs = await fs.readdir(reposDir)
      for (const dir of dirs) {
        const repoPath = path.join(reposDir, dir)
        const normalizedRepo = path.resolve(repoPath)
        if (excludedRepos.has(normalizedRepo)) continue
        const configPath = path.join(repoPath, 'config.json')
        if (!(await fs.pathExists(configPath))) continue
        if (entries.find(e => path.resolve(e.repoPath) === normalizedRepo)) continue
        const stat = await fs.stat(configPath).catch(() => null)
        entries.push({
          name: dir, repoPath,
          workingCopies: [],
          created: stat?.mtime.toISOString() || new Date().toISOString()
        })
      }
    } catch { /* ignore */ }
  }

  // 3. 扫描 projects/ 目录，自动发现旧格式项目（有 .dbvs 子目录）
  const projectsDir = path.join(rootPath, 'projects')
  if (await fs.pathExists(projectsDir)) {
    try {
      const projectDirs = await fs.readdir(projectsDir)
      for (const dir of projectDirs) {
        const projPath = path.join(projectsDir, dir)
        const normalizedProj = path.resolve(projPath)
        const stat = await fs.stat(projPath).catch(() => null)
        if (!stat?.isDirectory()) continue
        if (entries.find(e => e.workingCopies.some(wc => path.resolve(wc.path) === normalizedProj))) continue
        const oldDbvs = path.join(projPath, '.dbvs')
        if (await fs.pathExists(oldDbvs)) {
          const newRepoPath = path.join(reposDir, dir)
          if (!(await fs.pathExists(newRepoPath))) {
            await fs.copy(oldDbvs, newRepoPath)
          }
          entries.push({
            name: dir, repoPath: newRepoPath,
            workingCopies: [{ path: projPath }],
            created: stat.mtime.toISOString()
          })
        }
      }
    } catch { /* ignore */ }
  }

  // 持久化补齐后的条目
  if (entries.length > 0) {
    await fs.ensureDir(path.dirname(registryPath))
    await fs.writeJson(registryPath, entries, { spaces: 2 })
  }
  return entries
}

export async function writeProjectRegistry(rootPath: string, entries: ProjectRegistryEntry[]): Promise<void> {
  const registryPath = await getRegistryPath(rootPath)
  await fs.writeJson(registryPath, entries, { spaces: 2 })
}

export async function getProjectsList(rootPath: string) {
  const registry = await readProjectRegistry(rootPath)
  const projects = []
  for (const entry of registry) {
    const repoExists = await fs.pathExists(path.join(entry.repoPath, 'config.json'))
    if (!repoExists) continue
    const primaryCopy = entry.workingCopies.length > 0 ? entry.workingCopies[0] : null
    projects.push({
      name: entry.name,
      path: primaryCopy?.path || '',
      repoPath: entry.repoPath,
      status: '已同步',
      lastUpdate: '',
      hasChanges: false,
      order: entry.order ?? 0,
      rating: entry.rating ?? 2,
    })
  }
  return { success: true, projects }
}
