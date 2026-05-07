import { useState, useRef, useEffect } from 'react'
import { useAppState } from '../../context/AppContext'
import { useI18n } from '../../i18n'
import Overview from './Overview'
import FileExplorer from './FileExplorer'
import History from './History'
import Settings from './Settings'
import About from './About'
import { ArchitectureMap } from './ArchitectureMap/ArchitectureMap'
import SimpleView from './SimpleView'
import HealthDashboard from './HealthDashboard'

type TabKey = 'overview' | 'files' | 'graph' | 'health' | 'history' | 'settings' | 'about'

export default function Dashboard() {
  const [state, dispatch] = useAppState()
  const { t } = useI18n()
  const [helpTab, setHelpTab] = useState<TabKey | null>(null)
  const helpRef = useRef<HTMLDivElement>(null)

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'overview', label: t.tabs.overview },
    { key: 'files', label: t.tabs.files },
    { key: 'graph', label: t.tabs.graph },
    { key: 'health', label: t.tabs.health },
    { key: 'history', label: t.tabs.history },
    { key: 'settings', label: t.tabs.settings },
    { key: 'about', label: t.tabs.about },
  ]

  const goBack = () => {
    dispatch({ type: 'SET_CURRENT_VIEW', payload: 'repositories' })
  }

  // Close help popover on outside click
  useEffect(() => {
    if (!helpTab) return
    const handleClick = (e: MouseEvent) => {
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) {
        setHelpTab(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [helpTab])

  const getHelpInfo = (key: TabKey) => {
    const th = (t as any).tabHelp
    if (!th) return { title: '', desc: '', tech: '' }
    const info = th[key]
    if (!info) return { title: '', desc: '', tech: '' }
    return { title: String(info.title || ''), desc: String(info.desc || ''), tech: String(info.tech || '') }
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header draggable-header">
        <div className="header-left">
          <button className="back-button" onClick={goBack}>{t.dashboard.back}</button>
          <h1>{state.currentProject ?? t.dashboard.defaultTitle}</h1>
          <div className="project-info">
            <span className="project-path">{state.projectPath}</span>
            <span className={`repo-status ${state.repoStatus === true ? 'active' : 'inactive'}`}>
              {state.repoStatus === true ? t.dashboard.repoActive : t.dashboard.repoInactive}
            </span>
          </div>
        </div>
      </header>

      <nav className="dashboard-nav">
        {tabs.map(tab => (
          <div key={tab.key} className="nav-tab-wrapper">
            <button
              className={`nav-tab ${state.activeTab === tab.key ? 'active' : ''}`}
              onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: tab.key })}
            >
              {tab.label}
            </button>
            <button
              className={`nav-tab-help ${helpTab === tab.key ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); setHelpTab(helpTab === tab.key ? null : tab.key) }}
              title={String((t as any).tabHelp?.[tab.key]?.title || '')}
            >
              ?
            </button>
            {helpTab === tab.key && (() => {
              const info = getHelpInfo(tab.key)
              return (
                <div className="nav-tab-help-popover" ref={helpRef}>
                  <div className="nav-help-header">
                    <strong>{info.title || tab.label}</strong>
                    <button className="nav-help-close" onClick={() => setHelpTab(null)}>×</button>
                  </div>
                  <p className="nav-help-desc">{info.desc}</p>
                  <div className="nav-help-tech">
                    <span className="nav-help-tech-label">Tech Stack</span>
                    <span className="nav-help-tech-text">{info.tech}</span>
                  </div>
                </div>
              )
            })()}
          </div>
        ))}
      </nav>

      <main className="dashboard-content">
        {state.activeTab === 'overview' && <Overview />}
        {state.activeTab === 'files' && <FileExplorer />}
        {state.activeTab === 'graph' && (
          <>
            <div className="graph-view-toggle">
              <button
                className={`graph-toggle-btn ${!state.simpleView ? 'active' : ''}`}
                onClick={() => dispatch({ type: 'SET_SIMPLE_VIEW', payload: false })}
              >
                {t.graph.devView || 'Dev View'}
              </button>
              <button
                className={`graph-toggle-btn ${state.simpleView ? 'active' : ''}`}
                onClick={() => dispatch({ type: 'SET_SIMPLE_VIEW', payload: true })}
              >
                {t.graph.simpleView || 'Simple View'}
              </button>
            </div>
            {state.simpleView ? <SimpleView /> : <ArchitectureMap />}
          </>
        )}
        {state.activeTab === 'health' && <HealthDashboard />}
        {state.activeTab === 'history' && <History />}
        {state.activeTab === 'settings' && <Settings />}
        {state.activeTab === 'about' && <About />}
      </main>

      <footer className="dashboard-footer">
        <div className="status-message">{state.message}</div>
        <div className="loading-indicator">
          {state.isLoading && <span>{t.dashboard.processing}</span>}
        </div>
      </footer>
    </div>
  )
}
