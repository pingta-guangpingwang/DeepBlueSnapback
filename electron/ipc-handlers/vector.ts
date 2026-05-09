import { BrowserWindow, dialog, ipcMain } from 'electron'
import { getRootPath } from '../project-registry'
import {
  buildVectorIndex,
  getVectorStatus,
  deleteVectorIndex,
  searchVectors,
  searchBatchVectors,
  enhanceRagContext,
  getIndexedFiles,
  getFileChunks,
  removeFilesFromIndex,
  exportVectorIndex,
  importVectorIndex,
  ingestFiles,
  getSupportedExtensions,
} from '../vector-engine'

export function registerVectorHandlers(
  ipcMain: Electron.IpcMain,
  mainWindow: BrowserWindow,
): void {

ipcMain.handle('vector:index', async (event, repoPath: string, workingCopyPath: string, commitId: string, projectName: string, filePaths?: string[]) => {
  const rootPath = await getRootPath()
  if (!rootPath) return { success: false, message: 'Root path not configured' }
  const send = (msg: string) => {
    if (!event.sender.isDestroyed()) {
      event.sender.send('vector:progress', msg)
    }
  }
  return await buildVectorIndex(rootPath, workingCopyPath, commitId, projectName, filePaths, send)
})

ipcMain.handle('vector:status', async (_, projectName: string) => {
  const rootPath = await getRootPath()
  if (!rootPath) return { success: false, message: 'Root path not configured' }
  return await getVectorStatus(rootPath, projectName)
})

ipcMain.handle('vector:delete', async (_, projectName: string) => {
  const rootPath = await getRootPath()
  if (!rootPath) return { success: false, message: 'Root path not configured' }
  return await deleteVectorIndex(rootPath, projectName)
})

ipcMain.handle('vector:search', async (_, projectName: string, query: { text: string; topK?: number; minSimilarity?: number; fileTypes?: string[] }) => {
  const rootPath = await getRootPath()
  if (!rootPath) return { success: false, results: [], message: 'Root path not configured' }
  return await searchVectors(rootPath, projectName, query)
})

ipcMain.handle('vector:search-batch', async (_, projectName: string, queries: { text: string; topK?: number; minSimilarity?: number; fileTypes?: string[] }[]) => {
  const rootPath = await getRootPath()
  if (!rootPath) return { success: false, results: [], message: 'Root path not configured' }
  return await searchBatchVectors(rootPath, projectName, queries)
})

ipcMain.handle('vector:enhance-rag', async (_, projectName: string, query: string, topK?: number) => {
  const rootPath = await getRootPath()
  if (!rootPath) return { success: false, vectorResults: [], message: 'Root path not configured' }
  return await enhanceRagContext(rootPath, projectName, query, topK ?? 5)
})

ipcMain.handle('vector:files', async (_, projectName: string) => {
  const rootPath = await getRootPath()
  if (!rootPath) return { success: false, files: [], message: 'Root path not configured' }
  return await getIndexedFiles(rootPath, projectName)
})

ipcMain.handle('vector:file-chunks', async (_, projectName: string, filePath: string) => {
  const rootPath = await getRootPath()
  if (!rootPath) return { success: false, chunks: [], message: 'Root path not configured' }
  return await getFileChunks(rootPath, projectName, filePath)
})

ipcMain.handle('vector:remove-files', async (event, workingCopyPath: string, commitId: string, projectName: string, filePaths: string[]) => {
  const rootPath = await getRootPath()
  if (!rootPath) return { success: false, message: 'Root path not configured' }
  const send = (msg: string) => {
    if (!event.sender.isDestroyed()) event.sender.send('vector:progress', msg)
  }
  return await removeFilesFromIndex(rootPath, workingCopyPath, commitId, projectName, filePaths, send)
})

ipcMain.handle('vector:export', async (_, projectName: string) => {
  const rootPath = await getRootPath()
  if (!rootPath) return { success: false, message: 'Root path not configured' }
  return await exportVectorIndex(rootPath, projectName)
})

ipcMain.handle('vector:import', async (_, projectName: string, data: string) => {
  const rootPath = await getRootPath()
  if (!rootPath) return { success: false, message: 'Root path not configured' }
  return await importVectorIndex(rootPath, projectName, data)
})

ipcMain.handle('vector:ingest-files', async (event, projectName: string, filePaths: string[], workingCopyPath: string, commitId: string) => {
  const rootPath = await getRootPath()
  if (!rootPath) return { success: false, message: 'Root path not configured' }
  const send = (msg: string) => {
    if (!event.sender.isDestroyed()) event.sender.send('vector:progress', msg)
  }
  return await ingestFiles(rootPath, filePaths, projectName, commitId, send)
})

ipcMain.handle('vector:open-files-dialog', async () => {
  if (!mainWindow) return { canceled: true, filePaths: [] }
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    title: 'Select files to add to Vector Knowledge Base',
    filters: [
      { name: 'All Supported', extensions: ['pdf','docx','txt','md','csv','json','xml','html','css','yaml','yml','ts','tsx','js','jsx','py','java','cs','go','rs','c','cpp','h','rb','php','kt','swift','dart','lua','sh','scss','sql','toml','ini','bat','ps1'] },
      { name: 'Documents', extensions: ['pdf','docx','txt','md'] },
      { name: 'Code', extensions: ['ts','tsx','js','jsx','py','java','cs','go','rs','cpp','c','h','rb','php','kt','swift','dart','lua','sh','sql'] },
      { name: 'Data', extensions: ['csv','json','xml','yaml','yml','toml','ini'] },
      { name: 'Web', extensions: ['html','htm','css','scss'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  })
  return { canceled: result.canceled, filePaths: result.filePaths }
})

ipcMain.handle('vector:open-folder-dialog', async () => {
  if (!mainWindow) return { canceled: true, filePaths: [] }
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select folder to scan for supported files',
  })
  if (result.canceled || result.filePaths.length === 0) return { canceled: true, filePaths: [] }
  const folderPath = result.filePaths[0]
  const { findSupportedFiles } = await import('../file-parser')
  const filePaths = findSupportedFiles(folderPath)
  return { canceled: false, filePaths }
})

ipcMain.handle('vector:get-supported-extensions', async () => {
  return getSupportedExtensions()
})

} // end registerVectorHandlers
