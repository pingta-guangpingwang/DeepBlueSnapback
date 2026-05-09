import { useCallback } from 'react'
import { useAppState } from '../context/AppContext'

export function useFiles() {
  const [state, dispatch] = useAppState()

  const loadManagedFiles = useCallback(async () => {
    if (!state.projectPath) {
      dispatch({ type: 'SET_MESSAGE', payload: '\u8BF7\u5148\u9009\u62E9\u9879\u76EE\u76EE\u5F55\u3002' })
      return
    }
    dispatch({ type: 'SET_IS_LOADING', payload: true })
    try {
      const result = await window.electronAPI.listFiles(state.projectPath)
      if (result?.success && result.files) {
        dispatch({ type: 'SET_MESSAGE', payload: '\u5DF2\u52A0\u8F7D\u6587\u4EF6\u5217\u8868\u3002' })
      } else {
        dispatch({ type: 'SET_MESSAGE', payload: '\u52A0\u8F7D\u6587\u4EF6\u5217\u8868\u5931\u8D25' })
      }
    } catch (error) {
      dispatch({ type: 'SET_MESSAGE', payload: '\u52A0\u8F7D\u6587\u4EF6\u5217\u8868\u5931\u8D25\uFF1A' + (error as Error).message })
    } finally {
      dispatch({ type: 'SET_IS_LOADING', payload: false })
    }
  }, [state.projectPath, dispatch])

  const createNewFile = useCallback(async (name: string) => {
    if (!state.projectPath) {
      dispatch({ type: 'SET_MESSAGE', payload: '\u8BF7\u5148\u9009\u62E9\u9879\u76EE\u76EE\u5F55\u3002' })
      return
    }
    if (!name.trim()) {
      dispatch({ type: 'SET_MESSAGE', payload: '\u8BF7\u8F93\u5165\u6587\u4EF6\u540D\u3002' })
      return
    }

    dispatch({ type: 'SET_IS_LOADING', payload: true })
    try {
      const pathResult = await window.electronAPI.pathJoin(state.projectPath, name.trim())
      const result = await window.electronAPI.createFile(pathResult.result)
      if (result?.success) {
        dispatch({ type: 'SET_NEW_FILE_NAME', payload: '' })
        await loadManagedFiles()
        dispatch({ type: 'SET_MESSAGE', payload: `\u6587\u4EF6 "${name}" \u521B\u5EFA\u6210\u529F\uFF01` })
      } else {
        dispatch({ type: 'SET_MESSAGE', payload: '\u521B\u5EFA\u6587\u4EF6\u5931\u8D25\uFF1A' + (result?.message || '\u672A\u77E5\u9519\u8BEF') })
      }
    } catch (error) {
      dispatch({ type: 'SET_MESSAGE', payload: '\u521B\u5EFA\u6587\u4EF6\u5931\u8D25\uFF1A' + (error as Error).message })
    } finally {
      dispatch({ type: 'SET_IS_LOADING', payload: false })
    }
  }, [state.projectPath, dispatch, loadManagedFiles])

  const startEditingFile = useCallback(async (fileName: string) => {
    if (!state.projectPath) return

    try {
      const pathResult = await window.electronAPI.pathJoin(state.projectPath, fileName)
      const result = await window.electronAPI.readFile(pathResult.result)
      if (result?.success) {
        dispatch({ type: 'SET_FILE_CONTENT', payload: result.content || '' })
        dispatch({ type: 'SET_EDITING_FILE', payload: fileName })
      } else {
        dispatch({ type: 'SET_MESSAGE', payload: '\u8BFB\u53D6\u6587\u4EF6\u5931\u8D25\uFF1A' + (result?.error || '\u672A\u77E5\u9519\u8BEF') })
      }
    } catch (error) {
      dispatch({ type: 'SET_MESSAGE', payload: '\u8BFB\u53D6\u6587\u4EF6\u5931\u8D25\uFF1A' + (error as Error).message })
    }
  }, [state.projectPath, dispatch])

  const saveFile = useCallback(async () => {
    if (!state.projectPath || !state.editingFile) return

    dispatch({ type: 'SET_IS_LOADING', payload: true })
    try {
      const pathResult = await window.electronAPI.pathJoin(state.projectPath, state.editingFile)
      const result = await window.electronAPI.writeFile(pathResult.result, state.fileContent)
      if (result?.success) {
        const savedName = state.editingFile
        dispatch({ type: 'SET_EDITING_FILE', payload: null })
        dispatch({ type: 'SET_FILE_CONTENT', payload: '' })
        await loadManagedFiles()
        dispatch({ type: 'SET_MESSAGE', payload: `\u6587\u4EF6 "${savedName}" \u4FDD\u5B58\u6210\u529F\uFF01` })
      } else {
        dispatch({ type: 'SET_MESSAGE', payload: '\u4FDD\u5B58\u6587\u4EF6\u5931\u8D25\uFF1A' + (result?.message || '\u672A\u77E5\u9519\u8BEF') })
      }
    } catch (error) {
      dispatch({ type: 'SET_MESSAGE', payload: '\u4FDD\u5B58\u6587\u4EF6\u5931\u8D25\uFF1A' + (error as Error).message })
    } finally {
      dispatch({ type: 'SET_IS_LOADING', payload: false })
    }
  }, [state.projectPath, state.editingFile, state.fileContent, dispatch, loadManagedFiles])

  const deleteFile = useCallback(async (fileName: string) => {
    if (!state.projectPath) return

    dispatch({ type: 'SET_IS_LOADING', payload: true })
    try {
      const pathResult = await window.electronAPI.pathJoin(state.projectPath, fileName)
      const result = await window.electronAPI.deleteFile(pathResult.result)
      if (result?.success) {
        await loadManagedFiles()
        dispatch({ type: 'SET_MESSAGE', payload: `\u6587\u4EF6 "${fileName}" \u5DF2\u5220\u9664\u3002` })
      } else {
        dispatch({ type: 'SET_MESSAGE', payload: '\u5220\u9664\u6587\u4EF6\u5931\u8D25\uFF1A' + (result?.message || '\u672A\u77E5\u9519\u8BEF') })
      }
    } catch (error) {
      dispatch({ type: 'SET_MESSAGE', payload: '\u5220\u9664\u6587\u4EF6\u5931\u8D25\uFF1A' + (error as Error).message })
    } finally {
      dispatch({ type: 'SET_IS_LOADING', payload: false })
    }
  }, [state.projectPath, dispatch, loadManagedFiles])

  return { loadManagedFiles, createNewFile, startEditingFile, saveFile, deleteFile }
}
