import { BrowserWindow, ipcMain } from 'electron'
import * as path from 'path'
import { DBHTRepository } from '../dbvs-repository'
import { getRootPath } from '../project-registry'
import { parseProject } from '../ast-analyzer'
import type { GraphNode } from '../graph-types'
import { buildGraph } from '../graph-builder'
import { saveGraph, loadGraph, listGraphs, compareGraphs } from '../graph-store'
import { switchToVersionReadonly, releaseVersionReadonly, getVersionFileList, getVersionFileContent } from '../version-switch'
import { generateHealthReport } from '../health-scorer'

export function registerGraphHandlers(
  ipcMain: Electron.IpcMain,
  _mainWindow: BrowserWindow,
  _dbvsRepo: DBHTRepository,
): void {

// 解析项目源码
ipcMain.handle('ast:parse-project', async (_, repoPath: string, workingCopyPath: string) => {
  try {
    const result = await parseProject(workingCopyPath, repoPath)
    return result
  } catch (error) {
    return { success: false, files: [], errors: [String(error)], totalFiles: 0, cachedFiles: 0, skippedDirs: 0, skippedDirNames: [], foundExtensions: [], scannedPath: workingCopyPath }
  }
})

// 构建架构图谱
ipcMain.handle('graph:build', async (event, repoPath: string, workingCopyPath: string, commitId: string, projectName: string) => {
  const send = (msg: string) => {
    if (!event.sender.isDestroyed()) {
      event.sender.send('graph:progress', msg)
    }
  }
  try {
    send('Scanning project directory...')
    const parseResult = await parseProject(workingCopyPath, repoPath, (msg) => send(msg))
    if (!parseResult.success || parseResult.files.length === 0) {
      let detail = `No source files found\nPath: ${parseResult.scannedPath || workingCopyPath}`
      if (parseResult.errors.length > 0) {
        detail += `\nErrors: ${parseResult.errors.slice(0, 5).join('; ')}`
      }
      if (parseResult.skippedDirs > 0) {
        const names = parseResult.skippedDirNames?.length
          ? parseResult.skippedDirNames.join(', ')
          : 'unknown'
        detail += `\nSkipped ${parseResult.skippedDirs} directories: ${names}`
      }
      if (parseResult.totalFiles > 0) {
        detail += `\nScanned ${parseResult.totalFiles} files but none matched source types (.ts/.tsx/.js/.jsx)`
      } else if (parseResult.foundExtensions?.length) {
        detail += `\nFound only: ${parseResult.foundExtensions.join(', ')} — no supported source types (.ts/.tsx/.js/.jsx)`
      }
      detail += `\nTip: Ensure the project directory contains TypeScript/JavaScript source files and nested folders are not in the skip list.`
      return { success: false, message: detail }
    }

    send(`Parsed ${parseResult.files.length} files. Building graph...`)
    const graph = buildGraph(parseResult, {
      projectName,
      commitId,
      timestamp: new Date().toISOString(),
    })

    send(`Graph built: ${graph.metrics?.nodeCount ?? '?'} nodes, ${graph.edges?.length ?? 0} edges. Saving...`)

    const rootPath = await getRootPath()
    if (!rootPath) return { success: false, message: 'Root path not configured' }

    await saveGraph(rootPath, graph)
    send('Graph saved. Done.')
    return { success: true, graph }
  } catch (error) {
    return { success: false, message: String(error) }
  }
})

// 获取特定版本的图谱
ipcMain.handle('graph:get', async (_, commitId: string) => {
  try {
    const rootPath = await getRootPath()
    if (!rootPath) return { success: false, message: 'Root path not configured' }

    const graph = await loadGraph(rootPath, commitId)
    if (!graph) return { success: false, message: 'Graph not found for this version' }

    return { success: true, graph }
  } catch (error) {
    return { success: false, message: String(error) }
  }
})

// 列出所有已存储图谱的版本
ipcMain.handle('graph:list-versions', async () => {
  try {
    const rootPath = await getRootPath()
    if (!rootPath) return { success: false, versions: [] }

    const versions = await listGraphs(rootPath)
    return { success: true, versions }
  } catch (error) {
    return { success: false, versions: [], message: String(error) }
  }
})

// 对比两个版本的图谱
ipcMain.handle('graph:compare', async (_, versionA: string, versionB: string) => {
  try {
    const rootPath = await getRootPath()
    if (!rootPath) return { success: false, message: 'Root path not configured' }

    const graphA = await loadGraph(rootPath, versionA)
    const graphB = await loadGraph(rootPath, versionB)

    const diff = compareGraphs(graphA, graphB)
    return { success: true, diff }
  } catch (error) {
    return { success: false, message: String(error) }
  }
})

// Generate RAG-friendly context from architecture graph
ipcMain.handle('graph:to-rag-context', async (_, commitId: string) => {
  try {
    const rootPath = await getRootPath()
    if (!rootPath) return { success: false, message: 'Root path not configured' }

    const graph = await loadGraph(rootPath, commitId)
    if (!graph) return { success: false, message: 'Graph not found' }

    const allNodes: Record<string, unknown>[] = []

    function collectNodes(node: GraphNode, parentId: string | null, depth: number): void {
      allNodes.push({
        id: node.id,
        label: node.label,
        type: node.type,
        path: node.path,
        fileCount: node.fileCount,
        lineCount: node.lineCount,
        exportsCount: node.exportsCount,
        parentId,
        depth,
        childCount: node.children?.length ?? 0,
      })
      if (node.children) {
        for (const child of node.children) {
          collectNodes(child, node.id, depth + 1)
        }
      }
    }
    collectNodes(graph.rootNode, null, 1)

    const edgeSummary = { pipeline: 0, hierarchy: 0, flow: 0, circular: 0 }
    for (const e of graph.edges) {
      if (e.type in edgeSummary) edgeSummary[e.type as keyof typeof edgeSummary]++
    }

    const buildings = allNodes.filter(n => n.type === 'building')
    const floors = allNodes.filter(n => n.type === 'floor')
    const rooms = allNodes.filter(n => n.type === 'room')

    const summary = [
      `Project "${graph.projectName}" at commit ${commitId.slice(0, 14)}.`,
      `Structure: ${buildings.length} buildings (modules), ${floors.length} floors (subdirectories), ${rooms.length} rooms (source files).`,
      `Total: ${graph.metrics.totalLines.toLocaleString()} lines of code across ${graph.metrics.totalFiles} files.`,
      `Dependencies: ${edgeSummary.pipeline} imports, ${edgeSummary.hierarchy} inheritances, ${edgeSummary.flow} calls, ${edgeSummary.circular} circular.`,
      `Circular dependencies detected: ${graph.metrics.circularDepCount}. Orphan modules: ${graph.metrics.orphanCount}.`,
    ].join('\n')

    const keyRelationships: string[] = []
    for (const e of graph.edges.slice(0, 50)) {
      const src = allNodes.find(n => n.id === e.source)
      const tgt = allNodes.find(n => n.id === e.target)
      if (src && tgt) {
        keyRelationships.push(`[${e.type}] ${String(src.label)} -> ${String(tgt.label)}${e.label ? ` (${e.label})` : ""}`)
      }
    }

    return {
      success: true,
      context: {
        projectName: graph.projectName,
        commitId,
        timestamp: graph.timestamp,
        naturalLanguageSummary: summary,
        buildingCount: buildings.length,
        floorCount: floors.length,
        roomCount: rooms.length,
        edgeSummary,
        nodes: allNodes,
        edges: graph.edges,
        metrics: graph.metrics,
        keyRelationships,
      },
    }
  } catch (error) {
    return { success: false, message: String(error) }
  }
})

// Read-only version switching
ipcMain.handle('version:switch-readonly', async (_, repoPath: string, version: string) => {
  try {
    const rootPath = await getRootPath()
    if (!rootPath) return { success: false, message: 'Root path not configured' }
    return await switchToVersionReadonly(rootPath, repoPath, version)
  } catch (error) {
    return { success: false, message: String(error) }
  }
})

ipcMain.handle('version:release-readonly', async (_, version: string) => {
  try {
    const rootPath = await getRootPath()
    if (!rootPath) return { success: false, message: 'Root path not configured' }
    return await releaseVersionReadonly(rootPath, version)
  } catch (error) {
    return { success: false, message: String(error) }
  }
})

ipcMain.handle('version:get-file-list', async (_, repoPath: string, version: string) => {
  return await getVersionFileList(repoPath, version)
})

ipcMain.handle('version:get-file-content', async (_, repoPath: string, version: string, filePath: string) => {
  return await getVersionFileContent(repoPath, version, filePath)
})

// Quality & health analysis
ipcMain.handle('quality:analyze', async (_, commitId: string, repoPath: string, workingCopyPath: string, projectName: string) => {
  try {
    const rootPath = await getRootPath()
    if (!rootPath) return { success: false, message: 'Root path not configured' }

    let graph = await loadGraph(rootPath, commitId)

    if (!graph && repoPath && workingCopyPath) {
      const parseResult = await parseProject(workingCopyPath, repoPath)
      if (parseResult.success && parseResult.files.length > 0) {
        graph = buildGraph(parseResult, {
          projectName: projectName || path.basename(workingCopyPath),
          commitId,
          timestamp: new Date().toISOString(),
        })
        await saveGraph(rootPath, graph)
      }
    }

    if (!graph) return { success: false, message: 'No architecture graph found. Build the project from the Graph tab first.' }
    const report = generateHealthReport(graph)
    return { success: true, report }
  } catch (error) {
    return { success: false, message: String(error) }
  }
})

} // end registerGraphHandlers
