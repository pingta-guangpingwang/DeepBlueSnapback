import { useAppState } from '../../context/AppContext'

export default function RootSetup() {
  const [state, dispatch] = useAppState()

  const chooseRootRepository = async () => {
    const folder = await window.electronAPI.selectFolder()
    if (folder) {
      dispatch({ type: 'SET_ROOT_REPOSITORY_PATH', payload: folder })
    }
  }

  const confirmRootRepository = async () => {
    if (!state.rootRepositoryPath) {
      dispatch({ type: 'SET_MESSAGE', payload: '请先选择根仓库目录' })
      return
    }

    try {
      dispatch({ type: 'SET_IS_LOADING', payload: true })
      dispatch({ type: 'SET_MESSAGE', payload: '正在创建根仓库...' })

      const result = await window.electronAPI.createRootRepository(state.rootRepositoryPath)

      if (result?.success) {
        await window.electronAPI.saveRootRepository(state.rootRepositoryPath)
        dispatch({ type: 'SET_IS_ROOT_REPO_CONFIGURED', payload: true })
        dispatch({ type: 'SET_CURRENT_VIEW', payload: 'repositories' })

        // 自动注册 CLI 全局命令
        try {
          const cliResult = await window.electronAPI.registerCLI()
          if (cliResult?.success) {
            dispatch({ type: 'SET_MESSAGE', payload: '根仓库设置成功！命令行工具已注册，可在任意位置使用 dbvs 命令。' })
          } else {
            dispatch({ type: 'SET_MESSAGE', payload: '根仓库设置成功！（命令行注册失败，可在设置中手动注册）' })
          }
        } catch {
          dispatch({ type: 'SET_MESSAGE', payload: '根仓库设置成功！（命令行注册失败，可在设置中手动注册）' })
        }
      } else {
        dispatch({ type: 'SET_MESSAGE', payload: '创建根仓库失败：' + (result?.message ?? '未知错误') })
      }
    } catch (error) {
      dispatch({ type: 'SET_MESSAGE', payload: '创建根仓库失败：' + (error as Error).message })
    } finally {
      dispatch({ type: 'SET_IS_LOADING', payload: false })
    }
  }

  return (
    <div className="setup-screen">
      <div className="setup-header draggable-header">
        <div className="header-spacer" />
      </div>
      <div className="setup-content">
        <div className="setup-logo">
          <h1>DBVS</h1>
          <p>DeepBlue Version System</p>
          <p className="setup-subtitle">SVN服务器 + 客户端一体化版本管理工具</p>
        </div>

        <div className="setup-card">
          <h2>设置根仓库位置</h2>
          <p>选择一个目录作为所有项目的根仓库位置，这里将存储所有项目的版本历史和配置。</p>

          <div className="setup-actions">
            <button className="primary-button" onClick={chooseRootRepository}>
              选择根仓库目录
            </button>

            {state.rootRepositoryPath && (
              <div className="path-display">
                <strong>已选择：</strong>
                <span>{state.rootRepositoryPath}</span>
                <button className="confirm-button" onClick={confirmRootRepository}>
                  确认并创建根仓库
                </button>
              </div>
            )}
          </div>
        </div>

        {state.isRootRepoConfigured && (
          <div className="setup-actions">
            <button
              className="secondary-button"
              onClick={() => dispatch({ type: 'SET_CURRENT_VIEW', payload: 'repositories' })}
            >
              进入仓库管理
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
