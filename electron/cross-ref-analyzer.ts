import * as fs from 'fs-extra'
import * as path from 'path'
import type { ArchitectureGraph } from './graph-types'

export interface CrossProjectRef {
  sourceProject: string
  targetProject: string
  sourceFile: string
  targetFile: string
  refType: 'import' | 'require' | 'config' | 'naming'
  confidence: 'high' | 'medium' | 'low'
}

export interface CrossRefReport {
  timestamp: string
  projects: string[]
  crossRefs: CrossProjectRef[]
  projectDeps: Record<string, string[]>  // project → projects it depends on
  projectDependents: Record<string, string[]> // project → projects that depend on it
  summary: string
}

// Common import/require patterns
const IMPORT_PATTERNS = [
  /import\s+.*\s+from\s+['"]([^'"]+)['"]/g,
  /import\s+['"]([^'"]+)['"]/g,
  /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /from\s+['"]([^'"]+)['"]/g,
]

function extractImports(filePath: string): string[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const imports: string[] = []
    for (const pattern of IMPORT_PATTERNS) {
      let match
      while ((match = pattern.exec(content)) !== null) {
        imports.push(match[1])
      }
    }
    return [...new Set(imports)]
  } catch {
    return []
  }
}

function getAllFiles(graph: ArchitectureGraph): string[] {
  const files: string[] = []
  function walk(node: any): void {
    if (node.path && (!node.children || node.children.length === 0)) {
      files.push(node.path.replace(/\\/g, '/'))
    }
    if (node.children) {
      for (const child of node.children) walk(child)
    }
  }
  walk(graph.rootNode)
  return files
}

function matchImportToProject(
  importPath: string,
  sourceFile: string,
  projects: Array<{ name: string; files: string[]; workingCopyPath: string }>,
): Array<{ project: string; file: string; confidence: 'high' | 'medium' | 'low' }> {
  const results: Array<{ project: string; file: string; confidence: 'high' | 'medium' | 'low' }> = []

  // Relative imports from source file
  if (importPath.startsWith('.')) {
    const sourceDir = path.dirname(sourceFile)
    const resolved = path.resolve(sourceDir, importPath).replace(/\\/g, '/')
    for (const proj of projects) {
      for (const f of proj.files) {
        if (f === resolved || f === resolved + '.ts' || f === resolved + '.tsx' ||
            f === resolved + '.js' || f === resolved + '.jsx' || f === resolved + '/index.ts') {
          results.push({ project: proj.name, file: f, confidence: 'high' })
        }
      }
    }
  }

  // Package/module name matching
  const pkgName = importPath.split('/')[0]
  if (pkgName && !pkgName.startsWith('@') && !pkgName.startsWith('.')) {
    for (const proj of projects) {
      for (const f of proj.files) {
        const fileName = path.basename(f, path.extname(f))
        const dirName = path.basename(path.dirname(f))
        if (fileName === pkgName || dirName === pkgName) {
          results.push({ project: proj.name, file: f, confidence: 'medium' })
        }
      }
    }
  }

  // Common file naming (low confidence)
  const baseName = path.basename(importPath).replace(/\.(ts|tsx|js|jsx)$/, '')
  if (baseName.length > 2 && results.length === 0) {
    for (const proj of projects) {
      for (const f of proj.files) {
        const fb = path.basename(f, path.extname(f))
        if (fb === baseName && f !== sourceFile) {
          results.push({ project: proj.name, file: f, confidence: 'low' })
        }
      }
    }
  }

  return results
}

export async function analyzeCrossReferences(
  rootPath: string,
  focusProjectName: string,
  registry: Array<{ name: string; repoPath: string; workingCopies: Array<{ path: string }> }>,
): Promise<CrossRefReport> {
  const projects = registry.filter(e => e.workingCopies?.length > 0)

  // Load graphs for all projects
  const projectData: Array<{
    name: string
    files: string[]
    workingCopyPath: string
    repoPath: string
    graph: ArchitectureGraph | null
  }> = []

  for (const entry of projects) {
    const wcPath = entry.workingCopies[0].path
    // Try to load the latest graph
    const headPath = path.join(entry.repoPath, 'HEAD.json')
    let graph: ArchitectureGraph | null = null
    try {
      if (await fs.pathExists(headPath)) {
        const head = await fs.readJson(headPath)
        if (head.currentVersion) {
          const graphPath = path.join(rootPath, 'graphs', `${head.currentVersion}.json`)
          if (await fs.pathExists(graphPath)) {
            graph = await fs.readJson(graphPath)
          }
        }
      }
    } catch { /* ignore */ }

    let files: string[] = []
    if (graph) {
      files = getAllFiles(graph)
    } else {
      // Fallback: list files from working copy
      try {
        const treeResult = await getFileTreeSimple(wcPath)
        files = treeResult.map(f => f.replace(/\\/g, '/'))
      } catch { /* ignore */ }
    }

    projectData.push({
      name: entry.name, files, workingCopyPath: wcPath,
      repoPath: entry.repoPath, graph,
    })
  }

  const focusProject = projectData.find(p => p.name === focusProjectName)
  const otherProjects = projectData.filter(p => p.name !== focusProjectName)

  const crossRefs: CrossProjectRef[] = []

  if (focusProject) {
    // Analyze focus project's imports against other projects
    for (const file of focusProject.files.slice(0, 200)) { // Limit to 200 files for perf
      const fullPath = path.join(focusProject.workingCopyPath, file)
      const imports = extractImports(fullPath)
      for (const imp of imports) {
        const matches = matchImportToProject(imp, file, otherProjects)
        for (const m of matches) {
          // Avoid duplicates
          if (!crossRefs.some(r =>
            r.sourceProject === focusProjectName &&
            r.targetProject === m.project &&
            r.sourceFile === file &&
            r.targetFile === m.file
          )) {
            crossRefs.push({
              sourceProject: focusProjectName,
              targetProject: m.project,
              sourceFile: file,
              targetFile: m.file,
              refType: imp.startsWith('.') ? 'import' : 'naming',
              confidence: m.confidence,
            })
          }
        }
      }
    }
  }

  // Build dependency maps
  const projectDeps: Record<string, string[]> = {}
  const projectDependents: Record<string, string[]> = {}

  for (const ref of crossRefs) {
    if (!projectDeps[ref.sourceProject]) projectDeps[ref.sourceProject] = []
    if (!projectDeps[ref.sourceProject].includes(ref.targetProject)) {
      projectDeps[ref.sourceProject].push(ref.targetProject)
    }
    if (!projectDependents[ref.targetProject]) projectDependents[ref.targetProject] = []
    if (!projectDependents[ref.targetProject].includes(ref.sourceProject)) {
      projectDependents[ref.targetProject].push(ref.sourceProject)
    }
  }

  const highConf = crossRefs.filter(r => r.confidence === 'high').length
  const medConf = crossRefs.filter(r => r.confidence === 'medium').length

  let summary: string
  if (crossRefs.length === 0) {
    summary = `未发现 ${focusProjectName} 与其他项目的跨项目引用`
  } else {
    const deps = projectDeps[focusProjectName] || []
    summary = `${focusProjectName} 引用 ${deps.length} 个项目，共 ${crossRefs.length} 处跨项目关联（高置信 ${highConf}，中置信 ${medConf}）`
  }

  return {
    timestamp: new Date().toISOString(),
    projects: projectData.map(p => p.name),
    crossRefs,
    projectDeps,
    projectDependents,
    summary,
  }
}

async function getFileTreeSimple(dir: string): Promise<string[]> {
  const files: string[] = []
  async function walk(d: string): Promise<void> {
    try {
      const entries = await fs.readdir(d)
      for (const entry of entries) {
        if (entry.startsWith('.') || entry === 'node_modules') continue
        const full = path.join(d, entry)
        const stat = await fs.stat(full).catch(() => null)
        if (!stat) continue
        if (stat.isDirectory()) {
          await walk(full)
        } else {
          files.push(full)
        }
      }
    } catch { /* ignore */ }
  }
  await walk(dir)
  return files
}
