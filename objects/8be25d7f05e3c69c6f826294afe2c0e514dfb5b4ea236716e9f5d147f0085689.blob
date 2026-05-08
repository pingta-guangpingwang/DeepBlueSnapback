import { useAppState } from '../../context/AppContext'
import { useI18n } from '../../i18n'

export default function RootSetup() {
  const [state, dispatch] = useAppState()
  const { t } = useI18n()

  const chooseRootRepository = async () => {
    const folder = await window.electronAPI.selectFolder()
    if (folder) {
      dispatch({ type: 'SET_ROOT_REPOSITORY_PATH', payload: folder })
    }
  }

  const confirmRootRepository = async () => {
    if (!state.rootRepositoryPath) {
      dispatch({ type: 'SET_MESSAGE', payload: t.setup.selectFirst })
      return
    }

    try {
      dispatch({ type: 'SET_IS_LOADING', payload: true })
      dispatch({ type: 'SET_MESSAGE', payload: t.setup.creating })

      const result = await window.electronAPI.createRootRepository(state.rootRepositoryPath)

      if (result?.success) {
        await window.electronAPI.saveRootRepository(state.rootRepositoryPath)
        dispatch({ type: 'SET_IS_ROOT_REPO_CONFIGURED', payload: true })
        dispatch({ type: 'SET_CURRENT_VIEW', payload: 'repositories' })

        // 自动注册 CLI 全局命令
        try {
          const cliResult = await window.electronAPI.registerCLI()
          if (cliResult?.success) {
            dispatch({ type: 'SET_MESSAGE', payload: t.setup.success })
          } else {
            dispatch({ type: 'SET_MESSAGE', payload: t.setup.successCliFail })
          }
        } catch {
          dispatch({ type: 'SET_MESSAGE', payload: t.setup.successCliFail })
        }
      } else {
        dispatch({ type: 'SET_MESSAGE', payload: t.setup.failPrefix + (result?.message ?? '') })
      }
    } catch (error) {
      dispatch({ type: 'SET_MESSAGE', payload: t.setup.failPrefix + (error as Error).message })
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
          <h1>{t.brand.name}</h1>
          <p>{t.brand.chineseName}</p>
          <p className="setup-subtitle">{t.brand.description}</p>
        </div>

        <div className="setup-card">
          <h2>{t.setup.title}</h2>
          <p>{t.setup.subtitle}</p>

          <div className="setup-actions">
            <button className="primary-button" onClick={chooseRootRepository}>
              {t.setup.selectFolder}
            </button>

            {state.rootRepositoryPath && (
              <div className="path-display">
                <strong>{t.setup.selected}</strong>
                <span>{state.rootRepositoryPath}</span>
                <button className="confirm-button" onClick={confirmRootRepository}>
                  {t.setup.confirm}
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
              {t.setup.enterRepo}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
