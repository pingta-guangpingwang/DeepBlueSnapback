import { useAppState } from '../../context/AppContext'
import Overview from './Overview'
import FileExplorer from './FileExplorer'
import History from './History'
import Settings from './Settings'
import About from './About'

const tabs: Array<{ key: 'overview' | 'files' | 'history' | 'settings' | 'about'; label: string }> = [
  { key: 'overview', label: '概览' },
  { key: 'files', label: '文件' },
  { key: 'history', label: '历史' },
  { key: 'settings', label: '设置' },
  { key: 'about', label: '关于' },
]

export default function Dashboard() {
  const [state, dispatch] = useAppState()

  const goBack = () => {
    dispatch({ type: 'SET_CURRENT_VIEW', payload: 'repositories' })
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header draggable-header">
        <div className="header-left">
          <button className="back-button" onClick={goBack}>← 返回</button>
          <h1>{state.currentProject ?? 'DBGODVS Dashboard'}</h1>
          <div className="project-info">
            <span className="project-path">{state.projectPath}</span>
            <span className={`repo-status ${state.repoStatus === true ? 'active' : 'inactive'}`}>
              {state.repoStatus === true ? '● DBGODVS 仓库' : '○ 非仓库目录'}
            </span>
          </div>
        </div>
      </header>

      <nav className="dashboard-nav">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`nav-tab ${state.activeTab === tab.key ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: tab.key })}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="dashboard-content">
        {state.activeTab === 'overview' && <Overview />}
        {state.activeTab === 'files' && <FileExplorer />}
        {state.activeTab === 'history' && <History />}
        {state.activeTab === 'settings' && <Settings />}
        {state.activeTab === 'about' && <About />}
      </main>

      <footer className="dashboard-footer">
        <div className="status-message">{state.message}</div>
        <div className="loading-indicator">
          {state.isLoading && <span>处理中...</span>}
        </div>
      </footer>
    </div>
  )
}
